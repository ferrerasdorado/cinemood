package es.cinemood.tv.datos

import android.annotation.SuppressLint
import android.content.ContentUris
import android.content.Context
import android.net.Uri
import android.os.Build
import androidx.tvprovider.media.tv.TvContractCompat
import androidx.tvprovider.media.tv.WatchNextProgram
import org.json.JSONObject

// CineMood TV · «Seguir viendo» en la pantalla de inicio de Android TV (fila «A continuación» / Play Next).
// Cada película o serie a medias aparece allí; al pulsarla se abre CineMood en su ficha.
// Algunos lanzadores de fabricante no muestran esta fila: entonces simplemente no se ve, sin fallar.
object CanalTv {
    private const val PREFS = "canal-tv"

    @SuppressLint("RestrictedApi")
    fun publicar(ctx: Context, o: JSONObject, posSeg: Long, durSeg: Long) {
        if (Build.VERSION.SDK_INT < 26) return
        Thread {
            try {
                val tipo = o.optString("tipo"); val id = o.optInt("id")
                val clave = "$tipo-$id"
                val serie = tipo == "tv"
                val temp = o.optInt("temporada", -1); val ep = o.optInt("episodio", -1)
                val imagen = Tmdb.img(o.optString("fondo").ifEmpty { null }, "w780") ?: Tmdb.img(o.optString("poster").ifEmpty { null }, "w500")
                val b = WatchNextProgram.Builder()
                    .setType(if (serie) TvContractCompat.WatchNextPrograms.TYPE_TV_EPISODE else TvContractCompat.WatchNextPrograms.TYPE_MOVIE)
                    .setWatchNextType(TvContractCompat.WatchNextPrograms.WATCH_NEXT_TYPE_CONTINUE)
                    .setLastEngagementTimeUtcMillis(System.currentTimeMillis())
                    .setTitle(o.optString("nombre"))
                    .setDescription(if (serie && temp > 0) "T$temp · E$ep" else "Película")
                    .setLastPlaybackPositionMillis((posSeg * 1000).toInt())
                    .setDurationMillis((durSeg * 1000).toInt())
                    .setIntentUri(Uri.parse("cinemood://ficha/$tipo/$id"))
                    .setInternalProviderId(clave)
                if (imagen != null) b.setPosterArtUri(Uri.parse(imagen)).setPosterArtAspectRatio(TvContractCompat.PreviewPrograms.ASPECT_RATIO_16_9)
                if (serie && temp > 0) b.setSeasonNumber(temp).setEpisodeNumber(ep)
                val valores = b.build().toContentValues()
                val prefs = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                val previo = prefs.getLong(clave, -1L)
                val actualizado = previo > 0 && ctx.contentResolver.update(TvContractCompat.buildWatchNextProgramUri(previo), valores, null, null) > 0
                if (!actualizado) {
                    val uri = ctx.contentResolver.insert(TvContractCompat.WatchNextPrograms.CONTENT_URI, valores) ?: return@Thread
                    prefs.edit().putLong(clave, ContentUris.parseId(uri)).apply()
                }
            } catch (e: Exception) { android.util.Log.w("CineMoodCanal", "No se pudo publicar en «A continuación»: $e") }   // lanzadores que no admiten la fila: no pasa nada
        }.start()
    }

    fun quitar(ctx: Context, tipo: String, id: Int) {
        if (Build.VERSION.SDK_INT < 26) return
        Thread {
            try {
                val prefs = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                val previo = prefs.getLong("$tipo-$id", -1L)
                if (previo > 0) ctx.contentResolver.delete(TvContractCompat.buildWatchNextProgramUri(previo), null, null)
                prefs.edit().remove("$tipo-$id").apply()
            } catch (e: Exception) { }
        }.start()
    }
}
