package es.cinemood.tv.datos

import android.content.Context
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.Semaphore
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.sync.withPermit
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import kotlin.math.max
import kotlin.math.min

// CineMood TV · «Para ti»: la nota que le pondrías a cada título.
// Es el mismo modelo que la web (js/prediccion.js), para que la tele y el móvil digan lo mismo:
// parte de tu media, corregida por la nota del público (cuánto te dejas llevar por ella), y le suma
// lo que te desvías según géneros, director o creador, época, idioma, país, tipo y duración, con
// contracción hacia cero (con pocos títulos un rasgo apenas cuenta). Todo se calcula en la tele.

/** Lo que el modelo necesita de un título (mismos campos que la web) */
data class InfoNota(
    val anio: Int?, val idioma: String?, val paises: List<String>, val generos: List<Int>,
    val votos: Int, val media: Double, val minutos: Int, val director: Int?, val nombreDirector: String = "",
) {
    fun json() = JSONObject().put("y", anio ?: JSONObject.NULL).put("l", idioma ?: JSONObject.NULL).put("p", JSONArray(paises))
        .put("g", JSONArray(generos)).put("vc", votos).put("va", media).put("r", minutos).put("d", director ?: JSONObject.NULL).put("dn", nombreDirector)
    companion object {
        fun deJson(o: JSONObject) = InfoNota(o.optInt("y").takeIf { it > 0 }, o.optString("l").takeIf { it.isNotEmpty() && it != "null" },
            o.optJSONArray("p")?.let { a -> List(a.length()) { a.optString(it) } } ?: emptyList(),
            o.optJSONArray("g")?.let { a -> List(a.length()) { a.optInt(it) } } ?: emptyList(),
            o.optInt("vc"), o.optDouble("va", 0.0), o.optInt("r"), o.optInt("d").takeIf { it > 0 }, o.optString("dn"))

        /** Desde la ficha completa de TMDB (con créditos) */
        fun deDetalle(tipo: String, d: JSONObject): InfoNota {
            val fecha = d.optString(if (tipo == "tv") "first_air_date" else "release_date")
            val dir = if (tipo == "movie") d.optJSONObject("credits")?.optJSONArray("crew")?.let { a -> (0 until a.length()).map { a.getJSONObject(it) }.firstOrNull { it.optString("job") == "Director" } }
                else d.optJSONArray("created_by")?.optJSONObject(0)
            val paises = LinkedHashSet<String>()
            d.optJSONArray("origin_country")?.let { a -> for (i in 0 until a.length()) paises.add(a.optString(i)) }
            d.optJSONArray("production_countries")?.let { a -> for (i in 0 until a.length()) paises.add(a.optJSONObject(i)?.optString("iso_3166_1").orEmpty()) }
            return InfoNota(fecha.take(4).toIntOrNull(), d.optString("original_language").ifEmpty { null }, paises.filter { it.isNotEmpty() }.take(3),
                d.optJSONArray("genres")?.let { a -> (0 until a.length()).map { a.getJSONObject(it).optInt("id") } } ?: emptyList(),
                d.optInt("vote_count"), d.optDouble("vote_average", 0.0), d.optInt("runtime"), dir?.optInt("id")?.takeIf { it > 0 }, dir?.optString("name").orEmpty())
        }

        /** Aproximada, desde una fila de resultados (sin director ni duración): solo para ordenar */
        fun deLista(tipo: String, o: JSONObject) = InfoNota(
            o.optString(if (tipo == "tv") "first_air_date" else "release_date").take(4).toIntOrNull(), o.optString("original_language").ifEmpty { null },
            o.optJSONArray("origin_country")?.let { a -> List(a.length()) { a.optString(it) } }?.take(2) ?: emptyList(),
            o.optJSONArray("genre_ids")?.let { a -> List(a.length()) { a.optInt(it) } } ?: emptyList(),
            o.optInt("vote_count"), o.optDouble("vote_average", 0.0), 0, null)
    }
}

data class Prevision(val nota: Double, val motivos: List<String>)

object Gusto {
    private val K = mapOf("g" to 4.0, "d" to 1.5, "e" to 4.0, "l" to 3.0, "p" to 4.0, "t" to 3.0, "r" to 5.0)
    private val W = mapOf("g" to 1.0, "d" to 1.0, "e" to 0.7, "l" to 0.6, "p" to 0.5, "t" to 0.8, "r" to 0.5)

    private class Modelo(val media: Double, val mva: Double, val s: Double, val ef: Map<String, Double>, val cuenta: Map<String, Int>, val n: Int)
    private class Muestra(val tipo: String, val nota: Double, val info: InfoNota)

    @Volatile private var modelo: Modelo? = null
    @Volatile private var hecho = 0L
    private val candado = Mutex()
    /** Títulos ya vistos (para no recomendarlos) */
    @Volatile var vistos: Set<String> = emptySet(); private set
    private lateinit var archivo: File
    private val infos = HashMap<String, InfoNota>()

    fun iniciar(ctx: Context) {
        archivo = File(ctx.filesDir, "info-nota.json")
        try { val o = JSONObject(archivo.readText()); o.keys().forEach { k -> infos[k] = InfoNota.deJson(o.getJSONObject(k)) } } catch (e: Exception) { }
    }

    private fun rasgos(tipo: String, i: InfoNota): Map<String, List<String>> = mapOf(
        "g" to i.generos.take(3).map { "g$it" },
        "d" to listOfNotNull(i.director?.let { "d$it" }),
        "e" to listOfNotNull(i.anio?.let { "e${it / 10 * 10}" }),
        "l" to listOfNotNull(i.idioma?.let { "l$it" }),
        "p" to i.paises.take(2).map { "p$it" },
        "t" to listOf("t$tipo"),
        "r" to if (tipo == "movie" && i.minutos > 0) listOf(if (i.minutos < 95) "rcorta" else if (i.minutos > 140) "rlarga" else "rmedia") else emptyList(),
    )
    private fun conPublico(i: InfoNota) = i.media > 0 && i.votos >= 20

    private fun entrenar(m: List<Muestra>): Modelo? {
        val n = m.size; if (n < 8) return null
        val media = m.sumOf { it.nota } / n
        val cv = m.filter { conPublico(it.info) }
        var mva = 7.0; var s = 0.8
        if (cv.size >= 8) {
            mva = cv.sumOf { it.info.media } / cv.size
            val mr = cv.sumOf { it.nota } / cv.size
            var cov = 0.0; var vr = 0.0
            cv.forEach { cov += (it.info.media - mva) * (it.nota - mr); vr += (it.info.media - mva) * (it.info.media - mva) }
            val bruta = if (vr > 0) max(0.2, min(1.5, cov / vr)) else 0.8
            s = (bruta * cv.size + 0.8 * 10) / (cv.size + 10)
        }
        fun base(i: InfoNota) = media + if (conPublico(i)) s * (i.media - mva) else 0.0
        val rs = m.map { rasgos(it.tipo, it.info) }; val bases = m.map { base(it.info) }
        val ef = HashMap<String, Double>()
        fun aporte(f: Map<String, List<String>>, g: String) = f[g]!!.let { l -> if (l.isEmpty()) 0.0 else W[g]!! * l.sumOf { ef[it] ?: 0.0 } / l.size }
        repeat(3) {
            K.keys.forEach { g ->
                val suma = HashMap<String, Double>(); val cnt = HashMap<String, Int>()
                m.forEachIndexed { i, x ->
                    val f = rs[i]; if (f[g]!!.isEmpty()) return@forEachIndexed
                    val resto = x.nota - bases[i] - K.keys.filter { it != g }.sumOf { aporte(f, it) }
                    f[g]!!.forEach { k -> suma[k] = (suma[k] ?: 0.0) + resto; cnt[k] = (cnt[k] ?: 0) + 1 }
                }
                suma.forEach { (k, v) -> ef[k] = v / (cnt[k]!! + K[g]!!) / W[g]!! }
            }
        }
        val cuenta = HashMap<String, Int>(); rs.forEach { f -> f.values.flatten().forEach { cuenta[it] = (cuenta[it] ?: 0) + 1 } }
        return Modelo(media, mva, s, ef, cuenta, n)
    }

    /** Tu nota prevista para un título (null si aún no has puntuado al menos 8) */
    fun prever(tipo: String, i: InfoNota): Prevision? {
        val m = modelo ?: return null
        var v = m.media + if (conPublico(i)) m.s * (i.media - m.mva) else 0.0
        val partes = ArrayList<Pair<String, Double>>()
        rasgos(tipo, i).forEach { (g, l) -> l.forEach { k -> val a = W[g]!! * (m.ef[k] ?: 0.0) / l.size; v += a; if ((m.cuenta[k] ?: 0) >= 2) partes += k to a } }
        val motivos = partes.filter { it.second > 0.15 }.sortedByDescending { it.second }.take(2).mapNotNull { (k, _) -> nombreRasgo(k, i) }
        return Prevision(max(1.0, min(10.0, v)), motivos)
    }

    private fun nombreRasgo(k: String, i: InfoNota): String? {
        val v = k.drop(1)
        return when (k[0]) {
            'g' -> (Catalogo.GENEROS_PELI[v.toIntOrNull()] ?: Catalogo.GENEROS_SERIE[v.toIntOrNull()])?.lowercase()?.let { "te gusta el género $it" }
            'd' -> i.nombreDirector.takeIf { it.isNotEmpty() }?.let { "te gusta lo de $it" }
            'e' -> "te gusta el cine de los ${v.takeLast(2)}"
            'l' -> try { java.util.Locale(v).getDisplayLanguage(java.util.Locale("es")).let { "te gusta lo rodado en $it" } } catch (e: Exception) { null }
            'p' -> try { java.util.Locale("", v).getDisplayCountry(java.util.Locale("es")).let { "te gusta lo de $it" } } catch (e: Exception) { null }
            't' -> if (v == "tv") "te enganchan las series" else "prefieres películas"
            else -> null
        }
    }

    /** Prepara el modelo con tus notas (las mismas de la web). Las fichas que falten se piden una vez y se guardan */
    suspend fun preparar(forzar: Boolean = false) = candado.withLock {
        if (!forzar && modelo != null && System.currentTimeMillis() - hecho < 30 * 60_000) return@withLock
        val a = Bd.select("mi_biblioteca", "select=tmdb_id,tipo,puntuacion,visto&user_id=eq.${Sesion.uid}&visto=eq.true&limit=3000")
        val filas = (0 until a.length()).map { a.getJSONObject(it) }
        vistos = filas.map { "${it.optString("tipo")}-${it.optInt("tmdb_id")}" }.toSet()
        val puntuadas = filas.filter { !it.isNull("puntuacion") }
        val faltan = puntuadas.filter { infos["${it.optString("tipo")}-${it.optInt("tmdb_id")}"] == null }
        if (faltan.isNotEmpty()) {
            val lim = Semaphore(4)
            coroutineScope {
                faltan.map { f -> async { lim.withPermit {
                    val tipo = f.optString("tipo"); val id = f.optInt("tmdb_id")
                    try { val d = Tmdb.json("/$tipo/$id", "append_to_response=credits"); synchronized(infos) { infos["$tipo-$id"] = InfoNota.deDetalle(tipo, d) } } catch (e: Exception) { }
                } } }.awaitAll()
            }
            guardar()
        }
        val muestras = puntuadas.mapNotNull { f ->
            val tipo = f.optString("tipo"); val i = infos["$tipo-${f.optInt("tmdb_id")}"] ?: return@mapNotNull null
            Muestra(tipo, f.optDouble("puntuacion"), i)
        }
        modelo = withContext(Dispatchers.Default) { entrenar(muestras) }
        hecho = System.currentTimeMillis()
    }

    val listo get() = modelo != null
    fun olvidar() { modelo = null; vistos = emptySet(); hecho = 0 }
    val nPuntuadas get() = modelo?.n ?: 0

    private fun guardar() {
        try {
            val o = JSONObject(); synchronized(infos) { infos.forEach { (k, v) -> o.put(k, v.json()) } }
            archivo.writeText(o.toString())
        } catch (e: Exception) { }
    }

    /**
     * «Te va a encantar»: lo que mejor encaja contigo entre lo popular, lo mejor valorado y lo que es tendencia,
     * quitando lo que ya has visto. Ordenado por tu nota prevista.
     */
    suspend fun teVaAEncantar(filtros: String = "", tipos: List<String> = listOf("movie", "tv"), cuantos: Int = 20, minimo: Double = 7.0): List<Pair<Titulo, Double>> = coroutineScope {
        preparar()
        if (modelo == null) return@coroutineScope emptyList()
        val fuentes = tipos.flatMap { t ->
            val base = if (filtros.isEmpty()) listOf("/discover/$t" to "sort_by=popularity.desc&vote_count.gte=300", "/discover/$t" to "sort_by=vote_average.desc&vote_count.gte=1500", "/trending/$t/week" to "")
                else listOf("/discover/$t" to "sort_by=popularity.desc&vote_count.gte=150&$filtros", "/discover/$t" to "sort_by=vote_average.desc&vote_count.gte=400&$filtros")
            base.flatMap { (r, p) -> (1..2).map { pag -> Triple(t, r, (if (p.isEmpty()) "" else "$p&") + "page=$pag&include_adult=false") } }
        }
        val crudos = fuentes.map { (t, r, p) -> async { try { val a = Tmdb.json(r, p).optJSONArray("results"); (0 until (a?.length() ?: 0)).map { t to a!!.getJSONObject(it) } } catch (e: Exception) { emptyList() } } }.awaitAll().flatten()
        // Primero una nota aproximada (con los datos de la lista) para escoger candidatos…
        val aprox = withContext(Dispatchers.Default) {
            crudos.mapNotNull { (t, o) ->
                val ti = Catalogo.titulo(o, t) ?: return@mapNotNull null
                if (ti.poster == null || ti.clave in vistos) return@mapNotNull null
                val pr = prever(t, InfoNota.deLista(t, o)) ?: return@mapNotNull null
                ti to pr.nota
            }.distinctBy { it.first.clave }.sortedByDescending { it.second }.take(cuantos + 10)
        }
        // …y luego la exacta (director, duración, país), la misma que enseña la ficha
        val lim = Semaphore(4)
        aprox.map { (ti, n) -> async { lim.withPermit {
            val exacta = try { Catalogo.detalle(ti.tipo, ti.id).info?.let { prever(ti.tipo, it)?.nota } } catch (e: Exception) { null }
            ti to (exacta ?: n)
        } } }.awaitAll().filter { it.second >= minimo }.sortedByDescending { it.second }.take(cuantos)
    }

    fun fmt(v: Double) = String.format("%.1f", v).replace('.', ',')
}
