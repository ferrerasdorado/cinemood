package es.cinemood.tv.datos

import org.json.JSONArray
import org.json.JSONObject

// CineMood TV · Fuentes: tus addons (los mismos que tienes en la web, guardados en tu cuenta)
// y lo que devuelven para cada película o capítulo. Las etiquetas siguen las mismas reglas que la web:
// «⚡ Al instante», calidad, HDR, packs de temporada o serie, idioma, semillas…

data class Recurso(val nombre: String, val tipos: List<String>, val prefijos: List<String>)
data class Addon(val url: String, val nombre: String, val recursos: List<Recurso>) {
    fun maneja(recurso: String, tipo: String, id: String) = recursos.any { r ->
        r.nombre == recurso && tipo in r.tipos && (r.prefijos.isEmpty() || r.prefijos.any { id.startsWith(it) })
    }
    fun urlDe(recurso: String, tipo: String, id: String) =
        url.removeSuffix("/manifest.json") + "/$recurso/${Red.cod(tipo)}/${Red.cod(id)}.json"
}

/** Qué es un torrent de una serie: un capítulo, una temporada entera o la serie entera */
data class TipoTorrent(val clase: String, val temporada: Int? = null)

data class Meta(
    val calidad: Int, val hdr: Boolean, val dv: Boolean, val tamano: Long, val semillas: Long,
    val cast: Boolean, val lat: Boolean, val es: Boolean, val en: Boolean, val multi: Boolean,
    val subEs: Boolean, val alInstante: Boolean,
) {
    val idioma get() = when { cast -> "Castellano"; lat -> "Latino"; es -> "Español"; multi -> "Multi"; en -> "Inglés"; else -> "" }
}

data class Fuente(
    val addon: Addon,
    val nombreAddon: String,      // línea «name» del addon (p. ej. «[AD+] Torrentio 4k»)
    val torrent: String,          // nombre del torrent
    val archivo: String,          // archivo concreto dentro de un pack
    val origen: String,           // addon · sitio
    val url: String?,             // enlace directo (se puede ver)
    val hash: String?,            // hash del torrent (se puede mandar al NAS)
    val subtitulos: List<Subtitulo>,
    val meta: Meta,
    val tipoT: TipoTorrent,
) {
    val sePuedeVer get() = url != null
    val clave get() = (url ?: hash ?: torrent) + "|" + addon.url
}

data class Subtitulo(val url: String, val idioma: String, val etiqueta: String)

object Fuentes {
    @Volatile private var cacheAddons: Pair<Long, List<Addon>>? = null
    fun olvidar() { cacheAddons = null }   // al cerrar sesión (los addons llevan claves en la dirección)

    suspend fun addons(forzar: Boolean = false): List<Addon> {
        cacheAddons?.let { (t, l) -> if (!forzar && System.currentTimeMillis() - t < 5 * 60_000) return l }
        val filas = Bd.select("mis_addons", "select=transport_url,manifest&user_id=eq.${Sesion.uid}")
        val lista = (0 until filas.length()).mapNotNull { i ->
            val f = filas.getJSONObject(i)
            val url = f.optString("transport_url")
            val m = f.optJSONObject("manifest") ?: return@mapNotNull null
            if (!url.startsWith("https://") && !url.startsWith("http://")) return@mapNotNull null
            val nombre = m.optString("nombre").ifEmpty { m.optString("name") }.ifEmpty { "Addon" }
            Addon(url, nombre.take(120), recursos(m.optJSONArray("resources"), m.optJSONArray("types")))
        }
        cacheAddons = System.currentTimeMillis() to lista
        return lista
    }

    private fun recursos(a: JSONArray?, tiposGlobales: JSONArray?): List<Recurso> {
        if (a == null) return emptyList()
        val tg = tiposGlobales?.let { t -> List(t.length()) { t.optString(it) } } ?: emptyList()
        return (0 until a.length()).mapNotNull { i ->
            when (val r = a.opt(i)) {
                is String -> Recurso(r, tg, emptyList())
                is JSONObject -> Recurso(r.optString("name"),
                    r.optJSONArray("types")?.let { t -> List(t.length()) { t.optString(it) } } ?: tg,
                    r.optJSONArray("idPrefixes")?.let { t -> List(t.length()) { t.optString(it) } } ?: emptyList())
                else -> null
            }
        }
    }

    /** Id que esperan los addons: «tt0133093» para películas y «tt0903747:1:2» para capítulos */
    fun idStremio(imdb: String, temporada: Int?, episodio: Int?) =
        if (temporada != null && episodio != null) "$imdb:$temporada:$episodio" else imdb

    suspend fun deAddon(a: Addon, tipo: String, id: String): List<Fuente> {
        val tipoS = if (tipo == "tv") "series" else "movie"
        val txt = Red.get(a.urlDe("stream", tipoS, id), c = Red.clienteAddons)
        return kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.Default) {
            val arr = JSONObject(txt).optJSONArray("streams") ?: return@withContext emptyList()
            (0 until minOf(arr.length(), 300)).mapNotNull { arr.optJSONObject(it) }.mapNotNull { leer(it, a, tipo) }
        }
    }

    suspend fun subtitulos(tipo: String, id: String): List<Subtitulo> {
        val tipoS = if (tipo == "tv") "series" else "movie"
        val todos = mutableListOf<Subtitulo>()
        for (a in addons().filter { it.maneja("subtitles", tipoS, id) }) {
            try {
                val arr = JSONObject(Red.get(a.urlDe("subtitles", tipoS, id), c = Red.clienteAddons)).optJSONArray("subtitles") ?: continue
                for (i in 0 until minOf(arr.length(), 80)) {
                    val s = arr.optJSONObject(i) ?: continue
                    val u = s.optString("url")
                    if (u.startsWith("http")) todos += Subtitulo(u, s.optString("lang"), (s.optString("lang") + " · " + a.nombre).take(80))
                }
            } catch (e: Exception) { }
        }
        // primero en español, luego en inglés
        return todos.sortedBy { if (RE_SUB_ES.matches(it.idioma)) 0 else if (RE_SUB_EN.matches(it.idioma)) 1 else 2 }
            .distinctBy { it.url }   // el mismo subtítulo de dos addons iguales no se repite
            .take(40)
    }

    // ── Lectura de cada resultado (las mismas reglas que js/fuentes.js) ──
    private val META_LINEA = Regex("^(?:👤|💾|⚙️|⚙|🌱|📦|🔗|🇦|🇧|🇨|🇩|🇪|🇫|🇬|🇮|🇯|🇰|🇱|🇲|🇳|🇵|🇷|🇸|🇹|🇺|Multi|Dual)")
    private val RE_EP = Regex("\\bS\\d{1,2}[ ._-]?E\\d{1,3}\\b|\\b\\d{1,2}x\\d{2}\\b", RegexOption.IGNORE_CASE)
    private val RE_RANGO_EP = Regex("\\bS?\\d{0,2}[ ._-]?E\\d{1,3}[ ._]?[-–][ ._]?E?\\d{1,3}\\b", RegexOption.IGNORE_CASE)
    private val RE_VARIAS_TEMP = Regex("\\bS\\d{1,2}[ ._]?[-–][ ._]?S?\\d{1,2}\\b|\\bS\\d{1,2}(?:[ ._-]S\\d{1,2})+\\b|\\bseasons?[ ._]?\\d{1,2}[ ._]?[-–][ ._]?\\d{1,2}\\b|\\btemporadas?[ ._]?\\d{1,2}[ ._]?(?:[-–]|a|al)[ ._]?\\d{1,2}\\b|\\bseason[ ._]1[ ._]2[ ._]3|\\bcomplete[ ._]series\\b|\\bserie[ ._]completa\\b|\\btodas[ ._]las[ ._]temporadas\\b|\\[S\\d{2}[-–]\\d{2}]|\\bseasons\\b|\\btemporadas\\b|\\bint[eé]grale\\b|\\d{1,2}ª[ ._]*(?:a|al|-|y)?[ ._]*\\d{1,2}ª", RegexOption.IGNORE_CASE)
    private val RE_UNA_TEMP = Regex("\\bS(\\d{1,2})\\b(?![ ._-]?E\\d)|\\bseason[ ._]?(\\d{1,2})\\b|\\btemporada[ ._]?(\\d{1,2})\\b|\\b(\\d{1,2})ª[ ._]temporada|сезон:?\\s?(\\d{1,2})", RegexOption.IGNORE_CASE)
    private val RE_HASH = Regex("^(?:[a-f0-9]{40}|[a-z2-7]{32})$", RegexOption.IGNORE_CASE)

    // Expresiones ya preparadas una sola vez (antes se rehacían para cada fuente y frenaban el panel)
    private val R1 = Regex("\\.(mkv|mp4|m4v|avi|ts|webm)$|S\\d{1,2}[ ._-]?E\\d{1,3}", RegexOption.IGNORE_CASE)
    private val R2 = Regex("⚙️?\\s*([^\\n👤💾]+)")
    private val R3 = Regex("btih:([a-f0-9]{40}|[a-z2-7]{32})(?![a-z0-9])", RegexOption.IGNORE_CASE)
    private val R4 = Regex("/([a-f0-9]{40})(?=[/?#]|$)", RegexOption.IGNORE_CASE)
    private val R5 = Regex("sub(?:title|t[ií]tulo)?s?\\b|subbed|subtitulado|💬", RegexOption.IGNORE_CASE)
    private val R6 = Regex("castellano|🇪🇸|\\bes-es\\b", RegexOption.IGNORE_CASE)
    private val R7 = Regex("latino|latam|🇲🇽|🇦🇷|\\bes-419\\b", RegexOption.IGNORE_CASE)
    private val R8 = Regex("espa[ñn]ol|spanish|\\b(?:esp|spa|es)\\b", RegexOption.IGNORE_CASE)
    private val R9 = Regex("english|ingl[eé]s|🇬🇧|🇺🇸|\\b(?:eng|en)\\b", RegexOption.IGNORE_CASE)
    private val R10 = Regex("\\bmulti(?:audio|lang)?\\b|dual[ ._-]?audio", RegexOption.IGNORE_CASE)
    private val R11 = Regex("\\b(2160|1440|1080|720|576|480|360)p?\\b", RegexOption.IGNORE_CASE)
    private val R12 = Regex("\\b4k\\b", RegexOption.IGNORE_CASE)
    private val R13 = Regex("(?:👤|👥|🌱|\\bseeders?\\b|\\bseeds\\b)\\s*[:=]?\\s*([\\d.,]+\\s*[kKmM]?)", RegexOption.IGNORE_CASE)
    private val R14 = Regex("[.,\\s]")
    private val R15 = Regex("💾\\s*([\\d.,]+)\\s*(TB|GB|MB|KB)", RegexOption.IGNORE_CASE)
    private val R16 = Regex("\\b(\\d+(?:[.,]\\d+)?)\\s?(TiB|GiB|MiB|TB|GB|MB)\\b", RegexOption.IGNORE_CASE)
    private val R17 = Regex("espa[ñn]ol|spanish|castellano|🇪🇸|\\b(?:es|spa|esp|es-es)\\b", RegexOption.IGNORE_CASE)
    private val R18 = Regex("\\b(?:DV|DoVi)\\b|dolby[ ._]?vision", RegexOption.IGNORE_CASE)
    private val R19 = Regex("\\bHDR(?:10\\+?)?\\b", RegexOption.IGNORE_CASE)
    private val R20 = Regex("(?:^|[\\s\\[(])(?:AD|RD|PM|TB|DL|OC|ED|EN)\\+|⚡")
    private val RE_SUB_ES = Regex("^(spa|es|esp|es-es|es-419)$", RegexOption.IGNORE_CASE)
    private val RE_SUB_EN = Regex("^(eng|en)$", RegexOption.IGNORE_CASE)

    private fun leer(s: JSONObject, a: Addon, tipo: String): Fuente? {
        val url = s.optString("url").takeIf { it.startsWith("https://") || it.startsWith("http://") }
        val hash = hashDe(s)
        if (url == null && hash == null) return null          // ni se puede ver ni descargar (p. ej. enlaces externos)
        val name = s.optString("name")
        val desc = s.optString("description").ifEmpty { s.optString("title") }
        val hints = s.optJSONObject("behaviorHints")
        val lineas = desc.split('\n').map { it.trim() }.filter { it.isNotEmpty() }
        val sinMeta = lineas.filter { !META_LINEA.containsMatchIn(it) }
        val torrent = sinMeta.firstOrNull() ?: hints?.optString("filename")?.ifEmpty { null } ?: name.replace('\n', ' ')
        val arch = sinMeta.getOrNull(1)?.takeIf { R1.containsMatchIn(it) && it != sinMeta[0] }
            ?.substringAfterLast('/') ?: ""
        val sitio = R2.find(desc)?.groupValues?.get(1)?.trim()
        val subs = s.optJSONArray("subtitles")?.let { arr -> (0 until arr.length()).mapNotNull { arr.optJSONObject(it) }
            .filter { it.optString("url").startsWith("http") }
            .map { Subtitulo(it.optString("url"), it.optString("lang"), it.optString("lang")) } } ?: emptyList()
        val meta = meta(name, desc, hints?.optString("filename").orEmpty(), s, subs)
        val tipoT = if (tipo == "tv") tipoTorrent(torrent) else TipoTorrent("pelicula")
        return Fuente(a, name, torrent.take(300), arch.take(200), listOfNotNull(a.nombre, sitio).joinToString(" · "), url, hash, subs, meta, tipoT)
    }

    fun hashDe(s: JSONObject): String? {
        val h = s.optString("infoHash").trim()
        if (RE_HASH.matches(h)) return h.lowercase()
        val u = s.optString("url")
        R3.find(u)?.let { return it.groupValues[1].lowercase() }
        return R4.find(u)?.groupValues?.get(1)?.lowercase()
    }

    fun tipoTorrent(n: String): TipoTorrent {
        if (RE_VARIAS_TEMP.containsMatchIn(n)) return TipoTorrent("serie")
        val m = RE_UNA_TEMP.find(n)
        val temp = m?.groupValues?.drop(1)?.firstOrNull { it.isNotEmpty() }?.toIntOrNull()
        if (RE_RANGO_EP.containsMatchIn(n)) return TipoTorrent("temporada", temp)
        if (RE_EP.containsMatchIn(n)) return TipoTorrent("episodio")
        if (m != null) return TipoTorrent("temporada", temp)
        return TipoTorrent("episodio")
    }

    private fun meta(name: String, desc: String, archivo: String, s: JSONObject, subs: List<Subtitulo>): Meta {
        val texto = listOf(name, desc, archivo).filter { it.isNotEmpty() }.joinToString(" ")
        val lineas = texto.split('\n', '\r')
        val reSub = R5
        val subLineas = lineas.filter { reSub.containsMatchIn(it) }
        val audio = lineas.filter { it !in subLineas }.joinToString(" ")
        val cast = R6.containsMatchIn(audio)
        val lat = R7.containsMatchIn(audio)
        val es = cast || lat || R8.containsMatchIn(audio)
        val en = R9.containsMatchIn(audio)
        val multi = R10.containsMatchIn(audio)
        val q = R11.find(texto)
        val calidad = q?.groupValues?.get(1)?.toInt() ?: if (R12.containsMatchIn(texto)) 2160 else 0
        var semillas = -1L
        if (s.has("seeders")) semillas = s.optLong("seeders", -1)
        else R13.find(texto)?.let { m ->
            val v = m.groupValues[1].trim(); val u = v.lastOrNull()?.lowercaseChar()
            semillas = if (u == 'k' || u == 'm') ((v.dropLast(1).replace(',', '.').toDoubleOrNull() ?: 0.0) * if (u == 'm') 1_000_000 else 1000).toLong()
            else v.replace(R14, "").toLongOrNull() ?: -1
        }
        val tm = R15.find(texto) ?: R16.find(texto)
        val tamano = tm?.let {
            val n = it.groupValues[1].replace(',', '.').toDoubleOrNull() ?: 0.0
            val k = when (it.groupValues[2].lowercase()) { "kb" -> 1024.0; "mb", "mib" -> 1024.0 * 1024; "gb", "gib" -> 1024.0 * 1024 * 1024; "tb", "tib" -> 1024.0 * 1024 * 1024 * 1024; else -> 0.0 }
            (n * k).toLong()
        } ?: 0L
        val lenguas = subs.joinToString(" ") { it.idioma }
        val subEs = R17.containsMatchIn(subLineas.joinToString(" ") + " " + lenguas)
        val dv = R18.containsMatchIn(texto)
        val hdr = dv || R19.containsMatchIn(texto)
        // «AD+», «RD+»… en el nombre: el servicio de debrid ya lo tiene y se ve al momento
        val alInstante = R20.containsMatchIn(name)
        return Meta(calidad, hdr, dv, tamano, semillas, cast, lat, es, en, multi, subEs, alInstante)
    }

    /** Orden recomendado: lo que se ve al instante, en español y con más calidad, primero */
    fun ordenar(l: List<Fuente>): List<Fuente> = l.sortedWith(
        compareByDescending<Fuente> { it.sePuedeVer && it.meta.alInstante }
            .thenByDescending { it.sePuedeVer }
            .thenByDescending { if (it.meta.cast) 3 else if (it.meta.es) 2 else if (it.meta.multi) 1 else 0 }
            .thenByDescending { minOf(it.meta.calidad, 2160) }
            .thenByDescending { it.meta.semillas }
    )

    /**
     * Orden para «Reproducir» (elige solo): al instante y en español primero, y luego lo que mejor va en una tele normal:
     * 1080p, después 4K si el archivo es ligero, 720p, y al final los 4K enormes (remux de 50 GB, que piden 70 Mb/s).
     */
    fun ordenarParaReproducir(l: List<Fuente>): List<Fuente> {
        val gb = 1L shl 30
        fun calidad(f: Fuente): Int {
            val m = f.meta
            val remux = Regex("remux", RegexOption.IGNORE_CASE).containsMatchIn(f.torrent)
            return when {
                m.calidad == 1080 && m.tamano < 25 * gb -> 5
                m.calidad >= 2160 && m.tamano in 1..20 * gb && !remux -> 4
                m.calidad == 1080 -> 3
                m.calidad == 720 -> 2
                m.calidad >= 2160 -> 1
                else -> 0
            }
        }
        return l.sortedWith(
            compareByDescending<Fuente> { it.meta.alInstante }
                .thenByDescending { if (it.meta.cast) 3 else if (it.meta.es) 2 else if (it.meta.multi) 1 else 0 }
                .thenByDescending { calidad(it) }
                .thenByDescending { it.meta.semillas }
        )
    }

    fun bytes(n: Long): String = when {
        n >= 1L shl 40 -> String.format("%.1f TB", n / (1L shl 40).toDouble())
        n >= 1L shl 30 -> String.format("%.1f GB", n / (1L shl 30).toDouble())
        n >= 1L shl 20 -> String.format("%.0f MB", n / (1L shl 20).toDouble())
        else -> String.format("%.0f KB", n / 1024.0)
    }.replace('.', ',')
}
