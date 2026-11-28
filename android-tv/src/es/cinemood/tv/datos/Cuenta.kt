package es.cinemood.tv.datos

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

// CineMood TV · Lo tuyo: Mi lista, el NAS y por dónde vas en cada vídeo.

data class EnLista(val t: Titulo, val visto: Boolean, val pendiente: Boolean, val puntuacion: Int?)

object MiLista {
    suspend fun cargar(): List<EnLista> {
        val a = Bd.select("mi_biblioteca", "select=tmdb_id,tipo,titulo,poster_path,anio,visto,pendiente,puntuacion&user_id=eq.${Sesion.uid}&order=id.desc&limit=2000")
        return (0 until a.length()).map { a.getJSONObject(it) }.filter { it.optBoolean("visto") || it.optBoolean("pendiente") }.map {
            EnLista(Titulo(it.optInt("tmdb_id"), it.optString("tipo"), it.optString("titulo"), it.optString("poster_path").takeIf { p -> p.startsWith("/") },
                null, it.optString("anio"), 0.0, ""), it.optBoolean("visto"), it.optBoolean("pendiente"),
                it.optInt("puntuacion", -1).takeIf { n -> n >= 0 && !it.isNull("puntuacion") })
        }
    }

    suspend fun estado(t: Titulo): EnLista? {
        val a = Bd.select("mi_biblioteca", "select=visto,pendiente,puntuacion&user_id=eq.${Sesion.uid}&tmdb_id=eq.${t.id}&tipo=eq.${t.tipo}")
        val o = a.optJSONObject(0) ?: return null
        return EnLista(t, o.optBoolean("visto"), o.optBoolean("pendiente"), if (o.isNull("puntuacion")) null else o.optInt("puntuacion"))
    }

    private fun base(t: Titulo) = JSONObject().put("user_id", Sesion.uid).put("tmdb_id", t.id).put("tipo", t.tipo)
        .put("titulo", t.nombre).put("poster_path", t.poster ?: JSONObject.NULL).put("anio", t.anio)

    /** Capítulos vistos de una serie, por temporada (el mismo formato que la web: {"1":[1,2,3]}) */
    suspend fun episodiosVistos(t: Titulo): Map<Int, Set<Int>> {
        val a = Bd.select("mi_biblioteca", "select=episodios_vistos&user_id=eq.${Sesion.uid}&tmdb_id=eq.${t.id}&tipo=eq.tv")
        val o = a.optJSONObject(0)?.optJSONObject("episodios_vistos") ?: return emptyMap()
        val r = HashMap<Int, Set<Int>>()
        for (k in o.keys()) {
            val n = k.toIntOrNull() ?: continue
            val e = o.optJSONArray(k) ?: continue
            r[n] = (0 until e.length()).map { e.optInt(it) }.toSet()
        }
        return r
    }

    /** Marca (o desmarca) capítulos como vistos. Si con eso están todos, la serie queda como «Vista», como en la web */
    suspend fun marcarEpisodios(t: Titulo, temporada: Int, eps: Collection<Int>, visto: Boolean, totalPorTemporada: Map<Int, Int> = emptyMap()): Map<Int, Set<Int>> {
        val actual = episodiosVistos(t).toMutableMap()
        val conj = (actual[temporada] ?: emptySet()).toMutableSet()
        if (visto) conj.addAll(eps) else conj.removeAll(eps.toSet())
        actual[temporada] = conj
        val o = JSONObject()
        actual.forEach { (k, v) -> if (v.isNotEmpty()) o.put(k.toString(), org.json.JSONArray(v.sorted())) }
        val fila = base(t).put("episodios_vistos", o)
        val total = totalPorTemporada.values.sum()
        if (visto && total > 0 && actual.values.sumOf { it.size } >= total) fila.put("visto", true)
        Bd.upsert("mi_biblioteca", fila, "user_id,tmdb_id,tipo")
        return actual
    }

    suspend fun ponerPendiente(t: Titulo, si: Boolean) = Bd.upsert("mi_biblioteca", base(t).put("pendiente", si), "user_id,tmdb_id,tipo")
    suspend fun ponerVisto(t: Titulo, si: Boolean) = Bd.upsert("mi_biblioteca", base(t).put("visto", si), "user_id,tmdb_id,tipo")
}

// ── NAS ──
data class ParteNas(val temporada: Int? = null, val episodio: Int? = null, val hash: String? = null, val fuente: String? = null)

data class Descarga(
    val id: String, val titulo: String, val tipo: String, val temporada: Int?, val episodio: Int?,
    val estado: String, val error: String, val fuente: String, val progreso: Double?, val velocidad: Long, val eta: Long, val tamano: Long,
) {
    val enMarcha get() = estado in Nas.ACTIVOS
    val que get() = when {
        tipo == "movie" -> ""
        temporada == null -> "Serie completa"
        episodio == null -> "Temporada $temporada completa"
        else -> "T$temporada · E$episodio"
    }
    val estadoTexto get() = when (estado) {
        "pendiente" -> "En cola"; "procesando" -> "Buscando torrent"; "descargando" -> "Descargando"
        "completada" -> "Completada"; "error" -> "Error"; "sin_fuentes" -> "Sin fuentes"; "cancelada" -> "Cancelada"; else -> estado
    }
}

object Nas {
    val ACTIVOS = listOf("pendiente", "procesando", "descargando")
    private fun clave(tipo: String, id: Int, t: Int?, e: Int?) = "$tipo:$id:${t ?: "x"}:${e ?: "x"}"

    /** Envía al NAS. Lo que ya está en la cola para ese título no se vuelve a pedir. Devuelve el texto del aviso. */
    suspend fun enviar(t: Titulo, partes: List<ParteNas>): String {
        val tipo = if (t.esSerie) "tv" else "movie"
        val activas = try {
            val a = Bd.select("solicitudes_descarga", "select=temporada,episodio&user_id=eq.${Sesion.uid}&tmdb_id=eq.${t.id}&tipo=eq.$tipo&estado=in.(${ACTIVOS.joinToString(",")})")
            (0 until a.length()).map { a.getJSONObject(it) }.map { clave(tipo, t.id, if (it.isNull("temporada")) null else it.optInt("temporada"), if (it.isNull("episodio")) null else it.optInt("episodio")) }.toSet()
        } catch (e: Exception) { emptySet() }
        val vistas = HashSet<String>()
        val nuevas = partes.filter { p -> val k = clave(tipo, t.id, p.temporada, p.episodio); k !in activas && vistas.add(k) }
        val repetidas = partes.size - nuevas.size
        if (nuevas.isEmpty()) return if (partes.size > 1) "Eso ya está en la cola del NAS." else "Ya está en la cola del NAS. Puedes seguirlo en «Mis descargas»."
        val filas = JSONArray()
        nuevas.forEach { p ->
            val o = JSONObject().put("tmdb_id", t.id).put("tipo", tipo).put("titulo", t.nombre.take(500))
                .put("temporada", p.temporada ?: JSONObject.NULL).put("episodio", p.episodio ?: JSONObject.NULL)
            if (p.hash != null) { o.put("info_hash", p.hash); o.put("fuente", p.fuente?.take(300) ?: JSONObject.NULL) }
            filas.put(o)
        }
        try { Bd.insertar("solicitudes_descarga", filas) }
        catch (e: ErrorHttp) { throw ErrorCineMood("El NAS no ha aceptado la petición: " + e.mensajeServidor.ifEmpty { "error ${e.codigo}" }) }
        val una = nuevas.first()
        val que = when {
            tipo == "movie" -> t.nombre
            nuevas.size == 1 -> t.nombre + " · " + (if (una.temporada == null) "serie completa" else if (una.episodio == null) "temporada ${una.temporada} completa" else "T${una.temporada} · E${una.episodio}")
            nuevas.all { it.episodio == null } -> "${nuevas.size} temporadas de ${t.nombre}"
            else -> "${nuevas.size} capítulos de ${t.nombre}"
        }
        return "Enviado al NAS: $que" + (if (repetidas > 0) " ($repetidas ya estaban en la cola)" else "") + ". Síguelo en «Mis descargas»."
    }

    suspend fun misDescargas(): List<Descarga> {
        val cols = "id,tmdb_id,tipo,titulo,temporada,episodio,estado,fuente,error_mensaje,creada_en"
        val a = try { Bd.select("solicitudes_descarga", "select=$cols,progreso,velocidad,eta,tamano&user_id=eq.${Sesion.uid}&order=creada_en.desc&limit=200") }
        catch (e: ErrorHttp) { Bd.select("solicitudes_descarga", "select=$cols&user_id=eq.${Sesion.uid}&order=creada_en.desc&limit=200") }
        return (0 until a.length()).map { a.getJSONObject(it) }.map {
            Descarga(it.optString("id"), it.optString("titulo"), it.optString("tipo"),
                if (it.isNull("temporada")) null else it.optInt("temporada"), if (it.isNull("episodio")) null else it.optInt("episodio"),
                it.optString("estado"), if (it.isNull("error_mensaje")) "" else it.optString("error_mensaje"), if (it.isNull("fuente")) "" else it.optString("fuente"),
                if (it.isNull("progreso") || !it.has("progreso")) null else it.optDouble("progreso"),
                it.optLong("velocidad"), it.optLong("eta"), it.optLong("tamano"))
        }
    }

    suspend fun cancelar(d: Descarga) = Bd.actualizar("solicitudes_descarga", "id=eq.${d.id}&user_id=eq.${Sesion.uid}", JSONObject().put("cancelar", true))
    suspend fun quitar(d: Descarga) = Bd.borrar("solicitudes_descarga", "id=eq.${d.id}&user_id=eq.${Sesion.uid}")
}

// ── Seguir viendo: por dónde vas en cada película o capítulo (en esta tele) ──
data class Progresion(val t: Titulo, val temporada: Int?, val episodio: Int?, val posSeg: Long, val durSeg: Long, val cuando: Long) {
    val fraccion get() = if (durSeg > 0) (posSeg.toFloat() / durSeg).coerceIn(0f, 1f) else 0f
}

object Progreso {
    private const val PREFS = "progreso"

    fun clave(t: Titulo, temporada: Int?, episodio: Int?) =
        if (t.esSerie && temporada != null && episodio != null) "tv-${t.id}-$temporada-$episodio" else "${t.tipo}-${t.id}"

    /** Lo llama el reproductor (Java) al salir */
    @JvmStatic
    fun guardar(ctx: Context, clave: String?, posSeg: Long, durSeg: Long) {
        if (clave.isNullOrEmpty()) return
        val p = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val o = p.getString(clave, null)?.let { runCatching { JSONObject(it) }.getOrNull() } ?: return
        if (durSeg > 30 && posSeg >= durSeg * 0.92) { p.edit().remove(clave).apply(); return }
        if (posSeg < 5) return
        o.put("pos", posSeg).put("dur", durSeg).put("cuando", System.currentTimeMillis())
        p.edit().putString(clave, o.toString()).apply()
    }

    /** Antes de abrir el reproductor se apunta qué se va a ver, para poder listarlo en «Seguir viendo» */
    fun preparar(ctx: Context, t: Titulo, temporada: Int?, episodio: Int?): Long {
        val p = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val k = clave(t, temporada, episodio)
        val previo = p.getString(k, null)?.let { runCatching { JSONObject(it) }.getOrNull() }
        val o = JSONObject().put("id", t.id).put("tipo", t.tipo).put("nombre", t.nombre).put("poster", t.poster ?: "").put("fondo", t.fondo ?: "")
            .put("anio", t.anio).put("temporada", temporada ?: -1).put("episodio", episodio ?: -1)
            .put("pos", previo?.optLong("pos") ?: 0L).put("dur", previo?.optLong("dur") ?: 0L).put("cuando", System.currentTimeMillis())
        p.edit().putString(k, o.toString()).apply()
        return previo?.optLong("pos") ?: 0L
    }

    /** Todos los capítulos con progreso de un título (para las barras de los capítulos) */
    fun deTitulo(ctx: Context, t: Titulo): Map<Pair<Int?, Int?>, Progresion> =
        todos(ctx).filter { it.t.clave == t.clave }.associateBy { it.temporada to it.episodio }

    fun lista(ctx: Context): List<Progresion> = todos(ctx).distinctBy { it.t.clave }.take(20)   // de una serie, solo el último capítulo

    private fun todos(ctx: Context): List<Progresion> {
        val p = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        return p.all.values.mapNotNull { v -> runCatching { JSONObject(v as String) }.getOrNull() }
            .filter { it.optLong("pos") >= 5 }
            .map { o ->
                Progresion(Titulo(o.optInt("id"), o.optString("tipo"), o.optString("nombre"), o.optString("poster").ifEmpty { null },
                    o.optString("fondo").ifEmpty { null }, o.optString("anio"), 0.0, ""),
                    o.optInt("temporada").takeIf { it >= 0 }, o.optInt("episodio").takeIf { it >= 0 },
                    o.optLong("pos"), o.optLong("dur"), o.optLong("cuando"))
            }
            .sortedByDescending { it.cuando }
    }

    fun quitar(ctx: Context, pr: Progresion) {
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().remove(clave(pr.t, pr.temporada, pr.episodio)).apply()
    }
}
