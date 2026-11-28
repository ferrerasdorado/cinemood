package es.cinemood.tv

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.Toast

// CineMood TV · Abrir cosas fuera de la app: VLC y los tráileres de YouTube.
object Externo {
    @JvmStatic
    fun abrirEnVLC(ctx: Context, url: String?, titulo: String?) {
        if (url.isNullOrEmpty()) return
        try {
            ctx.startActivity(Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(Uri.parse(url), "video/*")
                setPackage("org.videolan.vlc")
                if (!titulo.isNullOrEmpty()) putExtra("title", titulo)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            })
        } catch (sinVlc: Exception) {
            try {
                ctx.startActivity(Intent(Intent.ACTION_VIEW).apply {
                    setDataAndType(Uri.parse(url), "video/*"); addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                })
            } catch (sinReproductor: Exception) {
                Toast.makeText(ctx, "No hay VLC ni otro reproductor instalado en la tele.", Toast.LENGTH_LONG).show()
            }
        }
    }

    fun abrirTrailer(ctx: Context, clave: String) {
        val web = Uri.parse("https://www.youtube.com/watch?v=$clave")
        try {
            ctx.startActivity(Intent(Intent.ACTION_VIEW, web).setPackage("com.google.android.youtube.tv").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        } catch (e: Exception) {
            try { ctx.startActivity(Intent(Intent.ACTION_VIEW, web).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) }
            catch (e2: Exception) { Toast.makeText(ctx, "No se ha podido abrir YouTube en la tele.", Toast.LENGTH_LONG).show() }
        }
    }
}
