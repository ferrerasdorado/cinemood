package es.cinemood.tv.ui

import android.annotation.SuppressLint
import android.graphics.Color as ColorAndroid
import android.view.View
import android.webkit.RenderProcessGoneDetail
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.viewinterop.AndroidView
import kotlinx.coroutines.delay

// CineMood TV · Tráiler mudo en la portada de Inicio.
// Para que la app siga fluida, el reproductor (un WebView con el vídeo de YouTube) solo existe mientras
// la portada tiene el foco y tras 2,5 s quieto en ella; al moverse se destruye y no deja nada en memoria.
// Mientras carga se sigue viendo la imagen fija; el vídeo aparece con un fundido cuando ya se está reproduciendo.

object TiemposTrailer {
    const val ESPERA_MS = 2_500L     // quieto en la portada antes de arrancar
    const val MAXIMO_MS = 45_000L    // después vuelve la imagen y la portada sigue rotando
}

/** El tráiler que toca ahora (o null): solo con la portada enfocada, quieta 2,5 s y durante 45 s como mucho */
@Composable
fun trailerActivo(clave: String?, enfocada: Boolean): String? {
    var activo by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(clave, enfocada) {
        activo = null
        if (clave.isNullOrBlank() || !enfocada) return@LaunchedEffect
        delay(TiemposTrailer.ESPERA_MS)
        activo = clave
        delay(TiemposTrailer.MAXIMO_MS)
        activo = null
    }
    return activo
}

@Composable
fun TrailerPortada(clave: String, alTerminar: () -> Unit = {}) {
    var sonando by remember(clave) { mutableStateOf(false) }
    var roto by remember(clave) { mutableStateOf(false) }
    val alfa by animateFloatAsState(if (sonando) 1f else 0f, tween(700), label = "trailer")
    if (roto) return
    BoxWithConstraints(Modifier.fillMaxSize().clipToBounds()) {
        // Caja 16:9 que cubre todo el hueco (recorta lo que sobra, como la imagen de fondo)
        val ancho = if (maxWidth / maxHeight >= 16f / 9f) maxWidth else maxHeight * (16f / 9f)
        val alto = ancho * (9f / 16f)
        AndroidView(
            modifier = Modifier.size(ancho, alto).align(Alignment.Center).graphicsLayer { alpha = alfa; clip = true },
            factory = { ctx -> crearReproductorTrailer(ctx, clave, alSonar = { sonando = true }, alRomperse = { roto = true; alTerminar() }) },
            onRelease = { v -> ((v as? android.view.ViewGroup)?.getChildAt(0) as? WebView)?.let { w -> w.stopLoading(); w.loadUrl("about:blank"); w.removeAllViews(); w.destroy() } },
        )
    }
}

/** Quita todo lo de YouTube (título, botones, logo, «Más vídeos»…) y hace que el vídeo cubra la portada */
private const val LIMPIAR_YOUTUBE = "(function(){if(document.getElementById('cm-limpio'))return;var s=document.createElement('style');s.id='cm-limpio';" +
    "s.textContent='.ytp-chrome-top,.ytp-chrome-bottom,.ytp-gradient-top,.ytp-gradient-bottom,.ytp-pause-overlay,.ytp-watermark,.ytp-youtube-button,.ytp-title,.ytp-large-play-button,.ytp-spinner,.ytp-ce-element,.ytp-cards-teaser,.ytp-paid-content-overlay,.ytp-impression-link,.ytp-show-cards-title,.ytp-cued-thumbnail-overlay,.ytp-contextmenu,.ytp-endscreen-content,.ytp-caption-window-container,.caption-window,.ytp-overlay,.ytp-tooltip,.branding-img{display:none!important}" +
    "html,body,#player,.html5-video-player,.html5-video-container{width:100%!important;height:100%!important;background:#000!important;overflow:hidden!important}" +
    "video{object-fit:cover!important;width:100%!important;height:100%!important;left:0!important;top:0!important}';" +
    "(document.head||document.documentElement).appendChild(s);})();"

@SuppressLint("SetJavaScriptEnabled")
private fun crearReproductorTrailer(ctx: android.content.Context, clave: String, alSonar: () -> Unit, alRomperse: () -> Unit): View {
    val web = WebView(ctx)
    web.setBackgroundColor(ColorAndroid.BLACK)
    web.isFocusable = false; web.isFocusableInTouchMode = false   // el mando sigue en la portada
    web.isVerticalScrollBarEnabled = false; web.isHorizontalScrollBarEnabled = false
    web.settings.apply {
        javaScriptEnabled = true
        domStorageEnabled = true
        mediaPlaybackRequiresUserGesture = false
        loadWithOverviewMode = true; useWideViewPort = true
    }
    web.webViewClient = object : WebViewClient() {
        // Aparatos con poca memoria: si el motor del navegador se cae, se retira y queda la imagen (la app sigue)
        override fun onRenderProcessGone(view: WebView, detail: RenderProcessGoneDetail): Boolean { alRomperse(); return true }
        override fun onPageFinished(view: WebView, url: String) {
            // Se comprueba que el vídeo corre de verdad (silenciado) antes de mostrarlo
            var intentos = 0
            fun sondear() {
                if (intentos++ > 20) return
                view.evaluateJavascript(LIMPIAR_YOUTUBE + "(function(){var v=document.querySelector('video');if(!v)return 'no';v.muted=true;v.volume=0;if(v.paused)v.play();return (v.paused||v.ended||v.currentTime<0.2)?'no':'si';})()") { r ->
                    if (r?.contains("si") == true) alSonar() else view.postDelayed({ sondear() }, 400)
                }
            }
            sondear()
        }
    }
    web.webChromeClient = object : android.webkit.WebChromeClient() {
        override fun onConsoleMessage(m: android.webkit.ConsoleMessage): Boolean { android.util.Log.i("CineMoodTrailer", "consola: ${m.message().take(200)}"); return true }
    }
    // YouTube exige saber desde qué web se inserta el vídeo (si no, «Error 153»)
    // Contenedor que impide que el navegador interno coja el foco (si no, la portada lo pierde y el tráiler se apaga)
    val caja = android.widget.FrameLayout(ctx).apply {
        descendantFocusability = android.view.ViewGroup.FOCUS_BLOCK_DESCENDANTS
        isFocusable = false
        addView(web, android.widget.FrameLayout.LayoutParams(-1, -1))
    }
    web.loadUrl("https://www.youtube-nocookie.com/embed/$clave?autoplay=1&mute=1&controls=0&disablekb=1&fs=0&iv_load_policy=3&modestbranding=1&playsinline=1&rel=0&cc_load_policy=0&loop=1&playlist=$clave&origin=https://ferrerasdorado.github.io", mapOf("Referer" to "https://ferrerasdorado.github.io/"))
    return caja
}
