package es.cinemood.tv.datos

import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import org.json.JSONArray
import org.json.JSONObject

// CineMood TV · Catálogo: lo que se pinta en Inicio, Descubre, Buscar y la ficha.

data class Titulo(
    val id: Int,
    val tipo: String,              // "movie" o "tv"
    val nombre: String,
    val poster: String?,
    val fondo: String?,
    val anio: String,
    val nota: Double,
    val sinopsis: String,
    val generos: List<Int> = emptyList(),
) {
    val clave get() = "$tipo-$id"
    val esSerie get() = tipo == "tv"
}

data class Persona(val id: Int, val nombre: String, val papel: String, val foto: String?)
data class Temporada(val numero: Int, val nombre: String, val episodios: Int, val anio: String)
data class Episodio(val numero: Int, val nombre: String, val sinopsis: String, val imagen: String?, val fecha: String, val minutos: Int)

data class Detalle(
    val t: Titulo,
    val logo: String?,
    val minutos: Int,
    val generos: List<String>,
    val edad: String,
    val lema: String,
    val imdb: String?,
    val trailer: String?,          // clave de YouTube
    val reparto: List<Persona>,
    val direccion: String,
    val temporadas: List<Temporada>,
    val similares: List<Titulo>,
    val estado: String,
    val saga: Pair<String, List<Titulo>>? = null,   // la colección a la que pertenece una película
)

object Catalogo {
    /** Fichas ya cargadas (o precargadas al pasar el foco por un cartel) */
    val fichas = android.util.LruCache<String, Detalle>(60)

    val GENEROS_PELI = linkedMapOf(28 to "Acción", 12 to "Aventura", 16 to "Animación", 35 to "Comedia", 80 to "Crimen",
        99 to "Documental", 18 to "Drama", 10751 to "Familia", 14 to "Fantasía", 36 to "Historia", 27 to "Terror",
        10402 to "Música", 9648 to "Misterio", 10749 to "Romance", 878 to "Ciencia ficción", 53 to "Suspense", 10752 to "Bélica", 37 to "Western")
    val GENEROS_SERIE = linkedMapOf(10759 to "Acción y aventura", 16 to "Animación", 35 to "Comedia", 80 to "Crimen",
        99 to "Documental", 18 to "Drama", 10751 to "Familia", 9648 to "Misterio", 10765 to "Ciencia ficción y fantasía",
        10768 to "Bélica y política", 37 to "Western", 10764 to "Reality")

    fun titulo(o: JSONObject, tipoPorDefecto: String? = null): Titulo? {
        val tipo = o.optString("media_type").ifEmpty { tipoPorDefecto ?: if (o.has("first_air_date") || o.has("name") && !o.has("title")) "tv" else "movie" }
        if (tipo != "movie" && tipo != "tv") return null
        val gen = o.optJSONArray("genre_ids")?.let { a -> List(a.length()) { a.optInt(it) } }
            ?: o.optJSONArray("genres")?.let { a -> List(a.length()) { a.optJSONObject(it)?.optInt("id") ?: 0 } } ?: emptyList()
        return Titulo(
            id = o.optInt("id"), tipo = tipo,
            nombre = o.optString(if (tipo == "tv") "name" else "title").ifEmpty { o.optString("title").ifEmpty { o.optString("name") } },
            poster = o.optString("poster_path").takeIf { it.startsWith("/") },
            fondo = o.optString("backdrop_path").takeIf { it.startsWith("/") },
            anio = o.optString(if (tipo == "tv") "first_air_date" else "release_date").take(4),
            nota = o.optDouble("vote_average", 0.0).let { if (it.isNaN()) 0.0 else it },
            sinopsis = o.optString("overview"),
            generos = gen,
        )
    }

    fun lista(o: JSONObject, tipo: String? = null): List<Titulo> {
        val a = o.optJSONArray("results") ?: return emptyList()
        return (0 until a.length()).mapNotNull { a.optJSONObject(it)?.let { x -> titulo(x, tipo) } }
            .filter { it.poster != null && it.nombre.isNotBlank() }
            .distinctBy { it.clave }
    }

    suspend fun topHoy() = lista(Tmdb.json("/trending/all/day")).take(10)
    suspend fun tendencias(tipo: String = "all", pagina: Int = 1) = lista(Tmdb.json("/trending/$tipo/week", "page=$pagina"), tipo.takeIf { it != "all" })
    suspend fun populares(tipo: String) = lista(Tmdb.json("/$tipo/popular", "region=ES"), tipo)
    suspend fun mejorValoradas(tipo: String) = lista(Tmdb.json("/$tipo/top_rated", "region=ES"), tipo)
    suspend fun estrenos() = lista(Tmdb.json("/movie/now_playing", "region=ES"), "movie")
    suspend fun enEmision() = lista(Tmdb.json("/tv/on_the_air", ""), "tv")

    suspend fun descubrir(tipo: String, filtros: String, pagina: Int = 1) =
        lista(Tmdb.json("/discover/$tipo", (if ("sort_by=" in filtros) "" else "sort_by=popularity.desc&") + "include_adult=false&page=$pagina&$filtros"), tipo)

    suspend fun genero(tipo: String, id: Int, pagina: Int = 1) = descubrir(tipo, "with_genres=$id&vote_count.gte=150", pagina)

    suspend fun plataforma(tipo: String, proveedor: Int, pagina: Int = 1) =
        descubrir(tipo, "watch_region=ES&with_watch_providers=$proveedor&with_watch_monetization_types=flatrate", pagina)

    /** Películas y series en las que sale una persona, de más a menos popular */
    suspend fun dePersona(id: Int, tipo: String, pagina: Int) =
        if (tipo == "tv") if (pagina > 1) emptyList() else lista(JSONObject().put("results", Tmdb.json("/person/$id/tv_credits").optJSONArray("cast") ?: JSONArray()), "tv")
        else descubrir("movie", "with_cast=$id", pagina)

    suspend fun buscar(texto: String): List<Titulo> {
        if (texto.isBlank()) return emptyList()
        return lista(Tmdb.json("/search/multi", "query=${Red.cod(texto.trim())}&include_adult=false"))
    }

    /** Estados de ánimo: los mismos criterios que la web (géneros que valen y géneros que no) */
    data class Animo(val clave: String, val emoji: String, val nombre: String, val pelis: String, val series: String)
    val ANIMOS = listOf(
        Animo("aburrido", "😴", "Aburrido", "with_genres=28|12|878|53&without_genres=99,10749,10402", "with_genres=10759|10765|80|9648&without_genres=99"),
        Animo("triste", "😢", "Triste", "with_genres=35|16|10751|10402&without_genres=27,10752,53", "with_genres=35|16|10751&without_genres=10768,80"),
        Animo("contento", "😄", "Contento", "with_genres=35|12|14|10402&without_genres=27,10752", "with_genres=35|10759|10765|16&without_genres=10768,80"),
        Animo("estresado", "😤", "Estresado", "with_genres=35|16|10751|12&without_genres=27,53,80,10752", "with_genres=35|16|10751&without_genres=80,9648,10768"),
        Animo("romantico", "🥰", "Romántico", "with_genres=10749&without_genres=27,10752", "with_genres=18|35&without_genres=80,10768&vote_average.gte=7"),
        Animo("pensativo", "🤔", "Pensativo", "with_genres=18|878|9648|36|99&without_genres=28,12,16,10751,35&vote_average.gte=7", "with_genres=18|10765|9648|99&without_genres=35,16,10751,10759&vote_average.gte=7.5"),
    )
    suspend fun animo(a: Animo, tipo: String, pagina: Int = 1) =
        descubrir(tipo, (if (tipo == "tv") a.series else a.pelis) + "&vote_count.gte=300&sort_by=vote_average.desc", pagina)

    /** Logo oficial (en español si lo hay, si no en inglés o sin idioma) */
    fun mejorLogo(imgs: JSONObject?): String? {
        val a = imgs?.optJSONArray("logos") ?: return null
        val logos = (0 until a.length()).mapNotNull { a.optJSONObject(it) }.filter { !it.optString("file_path").endsWith(".svg") }   // los SVG no se pueden dibujar sin un decodificador extra
        val orden = listOf("es", "en", "")
        return orden.firstNotNullOfOrNull { idioma -> logos.firstOrNull { (it.optString("iso_639_1").takeIf { s -> s != "null" } ?: "") == idioma } }
            ?.optString("file_path")
    }

    suspend fun logo(t: Titulo): String? = try {
        mejorLogo(Tmdb.json("/${t.tipo}/${t.id}/images", "include_image_language=es,en,null"))
    } catch (e: Exception) { null }

    suspend fun detalle(tipo: String, id: Int): Detalle = fichas.get("$tipo-$id") ?: detalleRed(tipo, id).also { fichas.put("$tipo-$id", it) }

    private suspend fun detalleRed(tipo: String, id: Int): Detalle {
        val extra = if (tipo == "tv") "external_ids,images,videos,credits,recommendations,content_ratings"
        else "external_ids,images,videos,credits,recommendations,release_dates"
        val o = Tmdb.json("/$tipo/$id", "append_to_response=$extra&include_image_language=es,en,null&include_video_language=es,en")
        val t = titulo(o, tipo) ?: throw ErrorCineMood("No se encontró este título.")
        val generos = o.optJSONArray("genres")?.let { a -> (0 until a.length()).map { a.getJSONObject(it).let { g -> Tmdb.traducirGenero(g.optInt("id"), g.optString("name")) } } } ?: emptyList()
        val minutos = if (tipo == "tv") o.optJSONArray("episode_run_time")?.optInt(0) ?: 0 else o.optInt("runtime")
        val creditos = o.optJSONObject("credits")
        val reparto = creditos?.optJSONArray("cast")?.let { a -> (0 until minOf(a.length(), 15)).map { a.getJSONObject(it).let { p -> Persona(p.optInt("id"), p.optString("name"), p.optString("character"), p.optString("profile_path").takeIf { s -> s.startsWith("/") }) } } } ?: emptyList()
        val direccion = if (tipo == "tv") o.optJSONArray("created_by")?.let { a -> (0 until a.length()).joinToString(", ") { a.getJSONObject(it).optString("name") } }.orEmpty()
        else creditos?.optJSONArray("crew")?.let { a -> (0 until a.length()).map { a.getJSONObject(it) }.filter { it.optString("job") == "Director" }.joinToString(", ") { it.optString("name") } }.orEmpty()
        val temporadas = o.optJSONArray("seasons")?.let { a -> (0 until a.length()).map { a.getJSONObject(it) }
            .filter { it.optInt("season_number") > 0 && it.optInt("episode_count") > 0 }
            .map { Temporada(it.optInt("season_number"), it.optString("name"), it.optInt("episode_count"), it.optString("air_date").take(4)) } } ?: emptyList()
        val videos = o.optJSONObject("videos")?.optJSONArray("results")?.let { a -> (0 until a.length()).map { a.getJSONObject(it) } } ?: emptyList()
        val trailer = (videos.firstOrNull { it.optString("site") == "YouTube" && it.optString("type") == "Trailer" && it.optString("iso_639_1") == "es" }
            ?: videos.firstOrNull { it.optString("site") == "YouTube" && it.optString("type") == "Trailer" }
            ?: videos.firstOrNull { it.optString("site") == "YouTube" })?.optString("key")
        return Detalle(
            t = t, logo = mejorLogo(o.optJSONObject("images")), minutos = minutos, generos = generos,
            edad = edad(o, tipo), lema = o.optString("tagline"),
            imdb = o.optJSONObject("external_ids")?.optString("imdb_id")?.takeIf { it.startsWith("tt") } ?: o.optString("imdb_id").takeIf { it.startsWith("tt") },
            trailer = trailer, reparto = reparto, direccion = direccion, temporadas = temporadas,
            similares = o.optJSONObject("recommendations")?.let { lista(it) }?.take(20) ?: emptyList(),
            estado = o.optString("status"),
            saga = o.optJSONObject("belongs_to_collection")?.optInt("id")?.takeIf { it > 0 }?.let { idc ->
                try {
                    val col = Tmdb.json("/collection/$idc")
                    val partes = col.optJSONArray("parts")?.let { a -> (0 until a.length()).mapNotNull { titulo(a.getJSONObject(it), "movie") } }
                        ?.filter { it.poster != null }?.sortedBy { it.anio.ifEmpty { "9999" } } ?: emptyList()
                    if (partes.size > 1) col.optString("name") to partes else null
                } catch (e: Exception) { null }
            },
        )
    }

    private fun edad(o: JSONObject, tipo: String): String {
        fun buscar(a: JSONArray?, campo: (JSONObject) -> String): String {
            if (a == null) return ""
            val todos = (0 until a.length()).map { a.getJSONObject(it) }
            val es = todos.firstOrNull { it.optString("iso_3166_1") == "ES" } ?: return ""
            return campo(es)
        }
        val e = if (tipo == "tv") buscar(o.optJSONObject("content_ratings")?.optJSONArray("results")) { it.optString("rating") }
        else buscar(o.optJSONObject("release_dates")?.optJSONArray("results")) { r ->
            r.optJSONArray("release_dates")?.let { d -> (0 until d.length()).map { d.getJSONObject(it).optString("certification") }.firstOrNull { it.isNotBlank() } }.orEmpty()
        }
        return when (e.uppercase()) { "", "NR" -> ""; "TP", "A", "APTA", "ALL" -> "TP"; else -> e.filter { it.isDigit() }.ifEmpty { e } }
    }

    suspend fun episodios(id: Int, temporada: Int): List<Episodio> {
        val o = Tmdb.json("/tv/$id/season/$temporada")
        val a = o.optJSONArray("episodes") ?: return emptyList()
        return (0 until a.length()).map { a.getJSONObject(it) }.map {
            Episodio(it.optInt("episode_number"), it.optString("name"), it.optString("overview"),
                it.optString("still_path").takeIf { s -> s.startsWith("/") }, it.optString("air_date"), it.optInt("runtime"))
        }
    }

    suspend fun imdbDe(tipo: String, id: Int): String {
        fichas.get("$tipo-$id")?.imdb?.let { return it }
        val o = Tmdb.json("/$tipo/$id/external_ids")
        return o.optString("imdb_id").takeIf { it.startsWith("tt") } ?: throw ErrorCineMood("TMDB no tiene el id de IMDb de este título, y los addons lo necesitan.")
    }

    /** Portada de Inicio: tendencias con imagen de fondo y su logo */
    suspend fun portada(): List<Pair<Titulo, String?>> = coroutineScope {
        val t = tendencias("all").filter { it.fondo != null }.take(6)
        t.map { x -> async { x to logo(x) } }.map { it.await() }
    }
}
