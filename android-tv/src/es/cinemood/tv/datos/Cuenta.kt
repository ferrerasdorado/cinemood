package es.cinemood.tv.datos

import android.content.Context
import kotlinx.coroutines.launch
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

    // Si la ficha aún no ha cargado (nombre vacío), no se pisan el título ni el cartel que ya tenga en la web
    private fun base(t: Titulo) = JSONObject().put("user_id", Sesion.uid).put("tmdb_id", t.id).put("tipo", t.tipo).also { o ->
        if (t.nombre.isNotBlank()) o.put("titulo", t.nombre)
        if (t.poster != null) o.put("poster_path", t.poster)
        if (t.anio.isNotBlank()) o.put("anio", t.anio)
    }

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
    /** Tu nota del 1 al 10 (la misma que en la web). Puntuar la marca como vista */
    suspend fun puntuar(t: Titulo, nota: Int?) = Bd.upsert("mi_biblioteca",
        base(t).put("puntuacion", nota ?: JSONObject.NULL).also { if (nota != null) it.put("visto", true) }, "user_id,tmdb_id,tipo")

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
        // También cuenta lo que ya cubre algo más grande en cola: la serie entera cubre todo, una temporada sus capítulos
        val serieEnCola = clave(tipo, t.id, null, null) in activas
        val nuevas = partes.filter { p ->
            val k = clave(tipo, t.id, p.temporada, p.episodio)
            val cubierta = serieEnCola || (p.episodio != null && clave(tipo, t.id, p.temporada, null) in activas)
            k !in activas && !cubierta && vistas.add(k)
        }
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
    // «Seguir viendo» compartido con el móvil y la web (tabla mi_progreso de supabase/progreso.sql).
    // Si la tabla aún no existe, todo sigue funcionando solo en esta tele.
    private val ambito = kotlinx.coroutines.CoroutineScope(kotlinx.coroutines.SupervisorJob() + kotlinx.coroutines.Dispatchers.IO)
    @Volatile private var sinTabla = false

    private fun subir(ctx: Context, clave: String, o: JSONObject) {
        if (sinTabla || !Sesion.iniciada) return
        val app = ctx.applicationContext
        ambito.launch {
            try {
                val t = o.optInt("temporada", -1); val e = o.optInt("episodio", -1)
                Bd.upsert("mi_progreso", JSONObject().put("user_id", Sesion.uid).put("clave", clave).put("tmdb_id", o.optInt("id")).put("tipo", o.optString("tipo"))
                    .put("temporada", if (t >= 0) t else JSONObject.NULL).put("episodio", if (e >= 1) e else JSONObject.NULL)
                    .put("titulo", o.optString("nombre").take(300)).put("poster", o.optString("poster").take(200)).put("fondo", o.optString("fondo").take(200))
                    .put("pos_seg", o.optLong("pos")).put("dur_seg", o.optLong("dur")).put("actualizado", java.time.Instant.ofEpochMilli(o.optLong("cuando")).toString()), "user_id,clave")
                val p = app.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                p.getString(clave, null)?.let { runCatching { JSONObject(it) }.getOrNull() }?.let { p.edit().putString(clave, it.put("sinc", true).toString()).apply() }
            } catch (x: ErrorHttp) { if (x.codigo == 404 || "mi_progreso" in x.cuerpo) sinTabla = true } catch (x: Exception) { }
        }
    }

    private fun borrarRemoto(filtro: String) {
        if (sinTabla || !Sesion.iniciada) return
        ambito.launch { try { Bd.borrar("mi_progreso", "user_id=eq.${Sesion.uid}&$filtro") } catch (x: Exception) { } }
    }

    /** Trae lo que hayas visto en otros aparatos (lo más reciente gana) y quita lo que allí ya terminaste */
    suspend fun sincronizar(ctx: Context) {
        if (sinTabla || !Sesion.iniciada) return
        val filas = try { Bd.select("mi_progreso", "select=*&user_id=eq.${Sesion.uid}&order=actualizado.desc&limit=60") }
            catch (x: ErrorHttp) { if (x.codigo == 404 || "mi_progreso" in x.cuerpo) sinTabla = true; return } catch (x: Exception) { return }
        val p = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val ed = p.edit()
        val remotas = HashSet<String>()
        for (i in 0 until filas.length()) {
            val r = filas.getJSONObject(i); val k = r.optString("clave"); remotas += k
            val cuando = runCatching { java.time.Instant.parse(r.optString("actualizado").replace(" ", "T").let { if (it.endsWith("Z") || it.contains('+')) it else it + "Z" }).toEpochMilli() }.getOrDefault(0L)
            val local = p.getString(k, null)?.let { runCatching { JSONObject(it) }.getOrNull() }
            if (local == null || local.optLong("cuando") < cuando) {
                ed.putString(k, JSONObject().put("id", r.optInt("tmdb_id")).put("tipo", r.optString("tipo")).put("nombre", r.optString("titulo"))
                    .put("poster", r.optString("poster")).put("fondo", r.optString("fondo")).put("anio", local?.optString("anio") ?: "")
                    .put("temporada", if (r.isNull("temporada")) -1 else r.optInt("temporada")).put("episodio", if (r.isNull("episodio")) -1 else r.optInt("episodio"))
                    .put("pos", r.optLong("pos_seg")).put("dur", r.optLong("dur_seg")).put("cuando", cuando).put("sinc", true).toString())
            }
        }
        // Lo que ya estaba en tu cuenta y ha desaparecido de allí, lo terminaste en otro aparato
        p.all.forEach { (k, v) -> if (k !in remotas && runCatching { JSONObject(v as String).optBoolean("sinc") }.getOrDefault(false)) ed.remove(k) }
        ed.apply()
    }

    fun clave(t: Titulo, temporada: Int?, episodio: Int?) =
        if (t.esSerie && temporada != null && episodio != null) "tv-${t.id}-$temporada-$episodio" else "${t.tipo}-${t.id}"

    /** Lo llama el reproductor (Java) al salir */
    @JvmStatic
    fun guardar(ctx: Context, clave: String?, posSeg: Long, durSeg: Long) {
        if (clave.isNullOrEmpty()) return
        val p = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val o = p.getString(clave, null)?.let { runCatching { JSONObject(it) }.getOrNull() } ?: return
        if (durSeg > 30 && posSeg >= durSeg * 0.92) {
            p.edit().remove(clave).apply()
            olvidarAnteriores(ctx, o)
            if (o.optString("tipo") == "tv") { val t = o.optInt("temporada"); val e = o.optInt("episodio")
                borrarRemoto("tmdb_id=eq.${o.optInt("id")}&tipo=eq.tv&or=(temporada.lt.$t,and(temporada.eq.$t,episodio.lte.$e))") }
            else borrarRemoto("clave=eq.${Red.cod(clave)}")
            if (o.optString("tipo") == "movie") CanalTv.quitar(ctx, "movie", o.optInt("id"))   // en series sigue el siguiente capítulo
            return
        }
        if (posSeg < 5) return
        o.put("pos", posSeg).put("dur", durSeg).put("cuando", System.currentTimeMillis())
        p.edit().putString(clave, o.toString()).apply()
        CanalTv.publicar(ctx, o, posSeg, durSeg)
        subir(ctx, clave, o)
    }

    /** Visto un capítulo, los que se dejaron a medias antes ya no son «por dónde vas» */
    private fun olvidarAnteriores(ctx: Context, o: JSONObject) {
        if (o.optString("tipo") != "tv") return
        val id = o.optInt("id"); val t = o.optInt("temporada"); val e = o.optInt("episodio")
        val p = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val borrar = p.all.keys.filter { k ->
            val partes = k.split('-')
            partes.size == 4 && partes[0] == "tv" && partes[1] == id.toString() &&
                (partes[2].toIntOrNull() ?: 0).let { s -> s < t || (s == t && (partes[3].toIntOrNull() ?: 0) < e) }
        }
        if (borrar.isNotEmpty()) p.edit().apply { borrar.forEach { remove(it) } }.apply()
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
        CanalTv.quitar(ctx, pr.t.tipo, pr.t.id)
        borrarRemoto("tmdb_id=eq.${pr.t.id}&tipo=eq.${pr.t.tipo}")
    }
}
