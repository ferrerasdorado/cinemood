package es.cinemood.tv.ui

import android.content.Context
import es.cinemood.tv.datos.Titulo
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

// CineMood TV · Copia en disco de Inicio, Series, Películas y Descubre.
// Al abrir la app se pinta al momento lo de la última vez y, mientras, se actualiza por detrás.

data class FilaDatos(val clave: String, val titulo: String, val items: List<Titulo>)
data class DatosPestana(val portada: List<Pair<Titulo, String?>>, val filas: List<FilaDatos>)

object CacheDisco {
    private lateinit var dir: File
    private val memoria = HashMap<String, DatosPestana>()

    fun iniciar(ctx: Context) { dir = File(ctx.filesDir, "cache-pestanas").apply { mkdirs() } }

    fun leer(clave: String): DatosPestana? {
        memoria[clave]?.let { return it }
        return try {
            val o = JSONObject(File(dir, "$clave.json").readText())
            val portada = o.getJSONArray("portada").let { a -> (0 until a.length()).map { a.getJSONObject(it) }.map { tJson(it.getJSONObject("t")) to it.optString("logo").ifEmpty { null } } }
            val filas = o.getJSONArray("filas").let { a -> (0 until a.length()).map { a.getJSONObject(it) }.map { f ->
                FilaDatos(f.getString("clave"), f.getString("titulo"), f.getJSONArray("items").let { i -> (0 until i.length()).map { tJson(i.getJSONObject(it)) } })
            } }
            DatosPestana(portada, filas).also { memoria[clave] = it }
        } catch (e: Exception) { null }
    }

    fun guardar(clave: String, d: DatosPestana) {
        memoria[clave] = d
        try {
            val o = JSONObject()
                .put("portada", JSONArray().apply { d.portada.forEach { (t, l) -> put(JSONObject().put("t", jsonT(t)).put("logo", l ?: "")) } })
                .put("filas", JSONArray().apply { d.filas.forEach { f -> put(JSONObject().put("clave", f.clave).put("titulo", f.titulo).put("items", JSONArray().apply { f.items.forEach { put(jsonT(it)) } })) } })
            File(dir, "$clave.json").writeText(o.toString())
        } catch (e: Exception) { }
    }

    fun borrarTodo() { memoria.clear(); dir.listFiles()?.forEach { it.delete() } }

    private fun jsonT(t: Titulo) = JSONObject().put("id", t.id).put("tipo", t.tipo).put("n", t.nombre).put("p", t.poster ?: "").put("f", t.fondo ?: "")
        .put("a", t.anio).put("v", t.nota).put("s", t.sinopsis).put("g", JSONArray(t.generos)).put("fe", t.fecha)
    private fun tJson(o: JSONObject) = Titulo(o.getInt("id"), o.getString("tipo"), o.getString("n"), o.optString("p").ifEmpty { null }, o.optString("f").ifEmpty { null },
        o.optString("a"), o.optDouble("v", 0.0), o.optString("s"), o.optJSONArray("g")?.let { g -> List(g.length()) { g.getInt(it) } } ?: emptyList(), o.optString("fe"))
}
