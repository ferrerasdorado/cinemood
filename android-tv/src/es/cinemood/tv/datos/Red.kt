package es.cinemood.tv.datos

import android.content.Context
import android.content.SharedPreferences
import android.util.LruCache
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import okhttp3.Cache
import okhttp3.ConnectionPool
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.IOException
import java.net.URLEncoder
import java.util.concurrent.TimeUnit

// CineMood TV · Red: tu cuenta de Supabase y el catálogo de TMDB.
// Son los mismos servicios que usa la web (misma cuenta, misma lista, mismos addons y mismo NAS).

const val SUPABASE_URL = "https://qdkoksbclukpdvhgrucg.supabase.co"
// Clave pública del proyecto (la misma que lleva la web; no da acceso a nada sin iniciar sesión)
const val SUPABASE_KEY = "sb_publishable_mEC3C3ZxRmSk8EKSm0HTSw_73a4bOMt"
const val TMDB_PROXY = "$SUPABASE_URL/functions/v1/tmdb-proxy"

class ErrorCineMood(mensaje: String) : Exception(mensaje)

object Red {
    lateinit var cliente: OkHttpClient
        private set
    /** Cliente con tiempos cortos para los addons: si uno tarda, no frena a los demás */
    lateinit var clienteAddons: OkHttpClient
        private set
    private val JSON = "application/json; charset=utf-8".toMediaType()

    fun iniciar(ctx: Context) {
        if (::cliente.isInitialized) return
        cliente = OkHttpClient.Builder()
            .connectTimeout(10, TimeUnit.SECONDS)
            .readTimeout(20, TimeUnit.SECONDS)
            .connectionPool(ConnectionPool(8, 5, TimeUnit.MINUTES))
            .cache(Cache(File(ctx.cacheDir, "http"), 30L * 1024 * 1024))
            .build()
        clienteAddons = cliente.newBuilder()
            .connectTimeout(8, TimeUnit.SECONDS)
            .readTimeout(15, TimeUnit.SECONDS)
            .build()
        Sesion.iniciar(ctx)
    }

    fun cod(s: String): String = URLEncoder.encode(s, "UTF-8")

    suspend fun get(url: String, cabeceras: Map<String, String> = emptyMap(), c: OkHttpClient = cliente): String =
        withContext(Dispatchers.IO) {
            val rb = Request.Builder().url(url)
            cabeceras.forEach { (k, v) -> rb.header(k, v) }
            c.newCall(rb.build()).execute().use { r ->
                val cuerpo = r.body?.string().orEmpty()
                if (!r.isSuccessful) throw ErrorHttp(r.code, cuerpo)
                cuerpo
            }
        }

    suspend fun enviar(metodo: String, url: String, cuerpo: String?, cabeceras: Map<String, String>): String =
        withContext(Dispatchers.IO) {
            val rb = Request.Builder().url(url).method(metodo, cuerpo?.toRequestBody(JSON))
            cabeceras.forEach { (k, v) -> rb.header(k, v) }
            cliente.newCall(rb.build()).execute().use { r ->
                val texto = r.body?.string().orEmpty()
                if (!r.isSuccessful) throw ErrorHttp(r.code, texto)
                texto
            }
        }
}

class ErrorHttp(val codigo: Int, val cuerpo: String) : IOException("HTTP $codigo") {
    /** El texto del error que devuelve Supabase, si lo hay */
    val mensajeServidor: String
        get() = try {
            val o = JSONObject(cuerpo)
            o.optString("msg").ifEmpty { o.optString("message").ifEmpty { o.optString("error_description").ifEmpty { o.optString("error") } } }
        } catch (e: Exception) { "" }
}

// ── Sesión ──────────────────────────────────────────────────────────────
// Se inicia una vez con el email y la contraseña de CineMood; después la app renueva sola el acceso.
object Sesion {
    private lateinit var prefs: SharedPreferences
    private val candado = Mutex()
    var uid: String = ""; private set
    var email: String = ""; private set
    private var acceso = ""
    private var renovar = ""
    private var caduca = 0L

    val iniciada get() = renovar.isNotEmpty() && uid.isNotEmpty()
    /** La pantalla principal se entera de que la sesión ha caducado y vuelve a «Iniciar sesión» */
    var alCaducar: (() -> Unit)? = null

    fun iniciar(ctx: Context) {
        prefs = ctx.getSharedPreferences("sesion", Context.MODE_PRIVATE)
        uid = prefs.getString("uid", "").orEmpty()
        email = prefs.getString("email", "").orEmpty()
        acceso = prefs.getString("acceso", "").orEmpty()
        renovar = prefs.getString("renovar", "").orEmpty()
        caduca = prefs.getLong("caduca", 0L)
    }

    private fun guardar(o: JSONObject) {
        acceso = o.getString("access_token")
        renovar = o.optString("refresh_token", renovar)
        caduca = System.currentTimeMillis() + o.optLong("expires_in", 3600) * 1000L
        o.optJSONObject("user")?.let { u -> uid = u.optString("id", uid); email = u.optString("email", email) }
        prefs.edit().putString("uid", uid).putString("email", email).putString("acceso", acceso)
            .putString("renovar", renovar).putLong("caduca", caduca).apply()
    }

    suspend fun entrar(correo: String, clave: String) {
        val cuerpo = JSONObject().put("email", correo.trim()).put("password", clave).toString()
        try {
            guardar(JSONObject(Red.enviar("POST", "$SUPABASE_URL/auth/v1/token?grant_type=password", cuerpo, mapOf("apikey" to SUPABASE_KEY))))
        } catch (e: ErrorHttp) {
            throw ErrorCineMood(if (e.codigo == 400) "Email o contraseña incorrectos." else "No se pudo iniciar sesión (${e.codigo}).")
        } catch (e: IOException) {
            throw ErrorCineMood("Sin conexión. Comprueba la red de la tele.")
        }
    }

    fun salir() {
        uid = ""; email = ""; acceso = ""; renovar = ""; caduca = 0L
        prefs.edit().clear().apply()
    }

    /** Token de acceso válido (lo renueva si está a punto de caducar) */
    suspend fun token(): String = candado.withLock {
        if (!iniciada) throw ErrorCineMood("Inicia sesión para continuar.")
        if (acceso.isNotEmpty() && System.currentTimeMillis() < caduca - 60_000) return acceso
        val cuerpo = JSONObject().put("refresh_token", renovar).toString()
        try {
            guardar(JSONObject(Red.enviar("POST", "$SUPABASE_URL/auth/v1/token?grant_type=refresh_token", cuerpo, mapOf("apikey" to SUPABASE_KEY))))
        } catch (e: ErrorHttp) {
            if (e.codigo in 400..401) { salir(); alCaducar?.invoke(); throw ErrorCineMood("La sesión ha caducado. Vuelve a iniciar sesión.") }
            throw e
        }
        acceso
    }

    suspend fun cabeceras(): Map<String, String> = mapOf("apikey" to SUPABASE_KEY, "Authorization" to "Bearer ${token()}")
}

// ── Base de datos de Supabase (API REST) ────────────────────────────────
object Bd {
    private const val REST = "$SUPABASE_URL/rest/v1"

    suspend fun select(tabla: String, consulta: String): JSONArray =
        JSONArray(Red.get("$REST/$tabla?$consulta", Sesion.cabeceras()))

    suspend fun insertar(tabla: String, filas: JSONArray) {
        Red.enviar("POST", "$REST/$tabla", filas.toString(), Sesion.cabeceras() + ("Prefer" to "return=minimal"))
    }

    suspend fun upsert(tabla: String, fila: JSONObject, conflicto: String) {
        Red.enviar("POST", "$REST/$tabla?on_conflict=$conflicto", fila.toString(),
            Sesion.cabeceras() + ("Prefer" to "resolution=merge-duplicates,return=minimal"))
    }

    suspend fun actualizar(tabla: String, filtro: String, cambios: JSONObject) {
        Red.enviar("PATCH", "$REST/$tabla?$filtro", cambios.toString(), Sesion.cabeceras() + ("Prefer" to "return=minimal"))
    }

    suspend fun borrar(tabla: String, filtro: String) {
        Red.enviar("DELETE", "$REST/$tabla?$filtro", null, Sesion.cabeceras() + ("Prefer" to "return=minimal"))
    }
}

// ── Catálogo de TMDB (a través del proxy de CineMood, que exige sesión) ──
object Tmdb {
    private val cache = LruCache<String, Pair<Long, String>>(300)
    private const val VIGENCIA = 15 * 60_000L
    // TMDB no traduce algunos géneros de series: los mismos nombres que en la web
    private val GENEROS_ES = mapOf(10759 to "Acción y aventura", 10762 to "Infantil", 10763 to "Noticias", 10764 to "Reality",
        10765 to "Ciencia ficción y fantasía", 10766 to "Telenovela", 10767 to "Entrevistas", 10768 to "Bélica y política")
    private val RE_GENEROS = Regex("\"id\":(1076[2-8]|10759),\"name\":\"[^\"]*\"")

    fun traducirGenero(id: Int, nombre: String) = GENEROS_ES[id] ?: nombre

    suspend fun json(ruta: String, params: String = ""): JSONObject {
        val p = if (Regex("(^|&)language=").containsMatchIn(params) || ruta.contains("/images")) params else (if (params.isEmpty()) "" else "$params&") + "language=es-ES"
        val url = "$TMDB_PROXY?path=${Red.cod(ruta)}" + (if (p.isEmpty()) "" else "&$p")
        cache.get(url)?.let { (t, txt) -> if (System.currentTimeMillis() - t < VIGENCIA) return JSONObject(txt) }
        var intento = 0
        while (true) {
            try {
                val t0 = System.currentTimeMillis()
                val txt = Red.get(url, Sesion.cabeceras()).replace(RE_GENEROS) { m ->
                    val id = m.groupValues[1].toInt(); "\"id\":$id,\"name\":\"${GENEROS_ES[id]}\""
                }
                android.util.Log.i("CineMoodRed", "TMDB ${System.currentTimeMillis() - t0} ms $ruta")
                cache.put(url, System.currentTimeMillis() to txt)
                return JSONObject(txt)
            } catch (e: ErrorHttp) {
                android.util.Log.w("CineMoodRed", "TMDB error ${e.codigo} $ruta ?$p → ${e.cuerpo.take(300)}")
                if (e.codigo == 403) throw ErrorCineMood("Esta cuenta no tiene acceso a CineMood.")
                if (e.codigo == 401) throw ErrorCineMood("La sesión no es válida. Vuelve a iniciar sesión.")
                if ((e.codigo == 429 || e.codigo >= 500) && intento < 3) { delay(600L shl intento); intento++; continue }
                throw ErrorCineMood("El catálogo no responde (${e.codigo}).")
            } catch (e: IOException) {
                if (intento < 2) { delay(600L shl intento); intento++; continue }
                throw ErrorCineMood("Sin conexión con el catálogo.")
            }
        }
    }

    fun img(ruta: String?, tam: String): String? = if (ruta.isNullOrEmpty()) null else "https://image.tmdb.org/t/p/$tam$ruta"
}
