@file:OptIn(ExperimentalTvMaterial3Api::class)

package es.cinemood.tv

import android.graphics.Bitmap
import android.media.MediaMetadataRetriever
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.focusGroup
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.nativeKeyCode
import androidx.compose.ui.input.key.onPreviewKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.lifecycleScope
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.MimeTypes
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.common.TrackSelectionOverride
import androidx.media3.common.Tracks
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.DefaultDataSource
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.exoplayer.DefaultLoadControl
import androidx.media3.exoplayer.DefaultRenderersFactory
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.exoplayer.trackselection.DefaultTrackSelector
import androidx.media3.ui.AspectRatioFrameLayout
import androidx.media3.ui.PlayerView
import androidx.tv.material3.Border
import androidx.tv.material3.ClickableSurfaceDefaults
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.Surface
import es.cinemood.tv.datos.Catalogo
import es.cinemood.tv.datos.Fuente
import es.cinemood.tv.datos.Fuentes
import es.cinemood.tv.datos.MiLista
import es.cinemood.tv.datos.Progreso
import es.cinemood.tv.datos.Subtitulo
import es.cinemood.tv.datos.Tmdb
import es.cinemood.tv.ui.App
import es.cinemood.tv.ui.Boton
import es.cinemood.tv.ui.C as Col
import es.cinemood.tv.ui.Contexto
import es.cinemood.tv.ui.Etiqueta
import es.cinemood.tv.ui.Imagen
import es.cinemood.tv.ui.TemaCineMood
import es.cinemood.tv.ui.Texto
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.nio.charset.Charset

// CineMood TV · Reproductor (Media3 / ExoPlayer) con controles propios.
//  · Si no se elige fuente, busca en tus addons y empieza por la mejor (al instante, en español, más calidad).
//  · Si una fuente no arranca, pasa sola a la siguiente; si se corta a mitad, reintenta en el mismo punto.
//  · Audio con FFmpeg cuando el decodificador de la tele no puede (MP3, AC-3, DTS, TrueHD…).
//  · Panel de audio y subtítulos (los del archivo y los de tus addons), y miniaturas al avanzar o retroceder.
//  · En series, «Siguiente capítulo» en los créditos sin salir del reproductor; lo visto se marca en tu cuenta.

/** Lo que se va a ver: lo deja preparado la app antes de abrir el reproductor */
object Reproduccion {
    var ctx: Contexto? = null
    var elegida: Fuente? = null
    var alternativas: List<Fuente> = emptyList()

    fun abrir(c: android.content.Context, ctx: Contexto, elegida: Fuente? = null, alternativas: List<Fuente> = emptyList()) {
        this.ctx = ctx; this.elegida = elegida; this.alternativas = alternativas
        c.startActivity(android.content.Intent(c, PlayerActivity::class.java))
    }
}

private enum class Fase { BUSCANDO, CARGANDO, VIENDO, ERROR }

@androidx.annotation.OptIn(markerClass = [UnstableApi::class])
class PlayerActivity : ComponentActivity() {
    private lateinit var player: ExoPlayer
    private var ctx by mutableStateOf<Contexto?>(null)
    private var fase by mutableStateOf(Fase.BUSCANDO)
    private var mensaje by mutableStateOf("")
    private var aviso by mutableStateOf("")
    private var candidatos = mutableListOf<Fuente>()
    private var indice by mutableIntStateOf(0)
    private val actual get() = candidatos.getOrNull(indice)
    private var arrancada = false          // esta fuente ya ha llegado a reproducirse
    private var reintentada = false        // ya se reintentó en el mismo punto
    private var vigilante: Job? = null

    // Controles
    private var controles by mutableStateOf(false)
    private var ultimaTecla = 0L
    private var posicion by mutableLongStateOf(0L)
    private var duracion by mutableLongStateOf(0L)
    private var reproduciendo by mutableStateOf(false)
    private var panelPistas by mutableStateOf(false)
    private var versionPistas by mutableIntStateOf(0)

    // Avanzar / retroceder con miniaturas
    private var objetivo by mutableStateOf<Long?>(null)
    private var pulsaciones = 0
    private var ultimaPulsacionSalto = 0L
    private var miniatura by mutableStateOf<Bitmap?>(null)
    private var extractor: MediaMetadataRetriever? = null
    private var extractorUrl = ""

    // Subtítulos de los addons
    private var subsAddons by mutableStateOf<List<Subtitulo>>(emptyList())
    private var subActivo: Subtitulo? = null
    private var subArchivo: Uri? = null
    private var subsAutoHecho = false

    // Siguiente capítulo
    private var siguiente by mutableStateOf<Contexto?>(null)
    private var cuentaAtras by mutableStateOf<Int?>(null)
    private var siguienteDescartado = false
    private var vistoMarcado = false

    override fun onCreate(estado: Bundle?) {
        super.onCreate(estado)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        val c = Reproduccion.ctx ?: run { finish(); return }
        crearReproductor()
        setContent { TemaCineMood { Pantalla() } }
        empezar(c, Reproduccion.elegida, Reproduccion.alternativas)
        // Posición, duración y créditos: se mira dos veces por segundo
        lifecycleScope.launch {
            while (true) {
                delay(500)
                if (fase == Fase.VIENDO) {
                    posicion = player.currentPosition.coerceAtLeast(0)
                    duracion = player.duration.takeIf { it != C.TIME_UNSET && it > 0 } ?: 0
                    revisarCreditos()
                }
                if (controles && objetivo == null && !panelPistas && reproduciendo && System.currentTimeMillis() - ultimaTecla > 5000) controles = false
            }
        }
    }

    private fun crearReproductor() {
        val http = DefaultHttpDataSource.Factory().setUserAgent("CineMoodTV/3.0 (AndroidTV; Media3)")
            .setAllowCrossProtocolRedirects(true).setConnectTimeoutMs(20000).setReadTimeoutMs(25000)
        val renderers = DefaultRenderersFactory(this)
            .setExtensionRendererMode(DefaultRenderersFactory.EXTENSION_RENDERER_MODE_PREFER)   // audio con FFmpeg
            .setEnableDecoderFallback(true)
        val selector = DefaultTrackSelector(this).apply {
            setParameters(buildUponParameters().setPreferredAudioLanguage("es").setPreferredTextLanguage("es"))
        }
        player = ExoPlayer.Builder(this, renderers)
            .setMediaSourceFactory(DefaultMediaSourceFactory(DefaultDataSource.Factory(this, http)))
            .setTrackSelector(selector)
            .setLoadControl(DefaultLoadControl.Builder().setBufferDurationsMs(15000, 60000, 2000, 4500).build())
            .setAudioAttributes(AudioAttributes.Builder().setUsage(C.USAGE_MEDIA).setContentType(C.AUDIO_CONTENT_TYPE_MOVIE).build(), true)
            .setHandleAudioBecomingNoisy(true)
            .build()
        player.addListener(object : Player.Listener {
            override fun onPlaybackStateChanged(s: Int) {
                if (s == Player.STATE_READY && fase == Fase.CARGANDO) { fase = Fase.VIENDO; vigilante?.cancel() }
                if (s == Player.STATE_READY) arrancada = true
                if (s == Player.STATE_ENDED) alTerminar()
            }
            override fun onIsPlayingChanged(p: Boolean) { reproduciendo = p }
            override fun onTracksChanged(t: Tracks) { versionPistas++; quizasSubtituloAutomatico() }
            override fun onPlayerError(e: PlaybackException) { alFallar(e) }
        })
    }

    // ── Elegir y abrir fuentes ──────────────────────────────────────────
    private fun empezar(c: Contexto, elegida: Fuente?, alternativas: List<Fuente>) {
        ctx = c; siguiente = null; cuentaAtras = null; siguienteDescartado = false; vistoMarcado = false
        subsAddons = emptyList(); subActivo = null; subArchivo = null; subsAutoHecho = false
        controles = false; objetivo = null
        lifecycleScope.launch { calcularSiguiente(c) }
        lifecycleScope.launch { cargarSubtitulos(c) }
        if (elegida != null) {
            candidatos = (listOf(elegida) + alternativas.filter { it.sePuedeVer && it.clave != elegida.clave }).toMutableList()
            indice = 0; abrirActual(Progreso.preparar(this, c.t, c.temporada, c.episodio) * 1000)
            return
        }
        fase = Fase.BUSCANDO; mensaje = "Buscando la mejor fuente en tus addons…"
        lifecycleScope.launch {
            val lista = try { buscar(c) } catch (e: Exception) { mensaje = e.message ?: "No se pudo buscar."; fase = Fase.ERROR; return@launch }
            if (lista.isEmpty()) { mensaje = "Ninguno de tus addons tiene ahora una fuente que se pueda ver aquí. Prueba con «Fuentes» o envíalo al NAS."; fase = Fase.ERROR; return@launch }
            candidatos = lista.toMutableList(); indice = 0
            abrirActual(Progreso.preparar(this@PlayerActivity, c.t, c.temporada, c.episodio) * 1000)
        }
    }

    /** Pregunta a todos tus addons a la vez. Empieza en cuanto hay buenas opciones (o a los 7 s con lo que haya) */
    private suspend fun buscar(c: Contexto): List<Fuente> {
        val tipoS = if (c.t.esSerie) "series" else "movie"
        val id = Fuentes.idStremio(Catalogo.imdbDe(c.t.tipo, c.t.id), c.temporada, c.episodio)
        val addons = Fuentes.addons().filter { it.maneja("stream", tipoS, id) }
        if (addons.isEmpty()) throw Exception("No tienes addons de fuentes en tu cuenta. Añádelos en la web (Tú → Mis addons).")
        val todas = java.util.Collections.synchronizedList(mutableListOf<Fuente>())
        var hechos = 0
        val inicio = System.currentTimeMillis()
        withTimeoutOrNull(7_000) {
            coroutineScope {
                val tareas = addons.map { a -> async { try { todas.addAll(Fuentes.deAddon(a, c.t.tipo, id)) } catch (e: Exception) { }; hechos++; mensaje = "Buscando en tus addons… ($hechos de ${addons.size})" } }
                // Sale antes si ya hay varias que se ven al instante
                while (tareas.any { it.isActive }) {
                    delay(250)
                    val buenas = synchronized(todas) { todas.count { it.sePuedeVer && it.meta.alInstante } }
                    if (buenas >= 3 && System.currentTimeMillis() - inicio > 2500) { tareas.forEach { it.cancel() }; break }
                }
            }
        }
        return Fuentes.ordenar(synchronized(todas) { todas.toList() }.filter { it.sePuedeVer }.distinctBy { it.url }).take(12)
    }

    private fun abrirActual(posMs: Long) {
        val f = actual ?: return
        fase = Fase.CARGANDO
        mensaje = if (indice == 0) "Cargando…" else "Probando otra fuente (${indice + 1} de ${candidatos.size})…"
        arrancada = false; reintentada = false
        player.setMediaItem(mediaItem(f), posMs.coerceAtLeast(0))
        player.prepare(); player.playWhenReady = true
        // Si en 30 s no ha empezado, se da por mala
        vigilante?.cancel()
        vigilante = lifecycleScope.launch { delay(30_000); if (fase == Fase.CARGANDO) siguienteFuente(posMs, "tarda demasiado") }
    }

    private fun mediaItem(f: Fuente): MediaItem {
        val url = f.url!!
        val b = MediaItem.Builder().setUri(url)
        val l = url.lowercase()
        if (".m3u8" in l || "format=hls" in l) b.setMimeType(MimeTypes.APPLICATION_M3U8) else if (".mpd" in l) b.setMimeType(MimeTypes.APPLICATION_MPD)
        subArchivo?.let { u ->
            b.setSubtitleConfigurations(listOf(MediaItem.SubtitleConfiguration.Builder(u).setMimeType(MimeTypes.TEXT_VTT)
                .setLanguage(subActivo?.idioma ?: "es").setLabel(subActivo?.etiqueta ?: "Subtítulo").setSelectionFlags(C.SELECTION_FLAG_DEFAULT).build()))
        }
        return b.build()
    }

    private fun alFallar(e: PlaybackException) {
        val pos = player.currentPosition.coerceAtLeast(0)
        if (arrancada && !reintentada) {
            // Se ha cortado a mitad: se reintenta en el mismo punto
            reintentada = true; aviso = "Se ha cortado. Reintentando…"
            lifecycleScope.launch { delay(800); player.setMediaItem(mediaItem(actual!!), pos); player.prepare(); player.playWhenReady = true; delay(2500); aviso = "" }
            return
        }
        siguienteFuente(pos, e.errorCodeName)
    }

    private fun siguienteFuente(pos: Long, motivo: String) {
        if (indice + 1 < candidatos.size) {
            indice++
            aviso = "Esa fuente no funciona aquí ($motivo). Probando otra…"
            lifecycleScope.launch { delay(3500); aviso = "" }
            abrirActual(pos)
        } else {
            fase = Fase.ERROR
            mensaje = "Ninguna fuente ha funcionado en el reproductor de la tele (último error: $motivo). Puedes abrir la última en VLC o elegir otra en «Fuentes»."
        }
    }

    // ── Siguiente capítulo y vistos ─────────────────────────────────────
    private suspend fun calcularSiguiente(c: Contexto) {
        if (!c.t.esSerie || c.temporada == null || c.episodio == null) return
        try {
            val d = Catalogo.detalle(c.t.tipo, c.t.id)
            val temp = d.temporadas.firstOrNull { it.numero == c.temporada }
            val sig = if (temp != null && c.episodio < temp.episodios) Contexto(c.t, c.temporada, c.episodio + 1)
                else d.temporadas.firstOrNull { it.numero > c.temporada }?.let { Contexto(c.t, it.numero, 1) } ?: return
            val nombre = try { Catalogo.episodios(c.t.id, sig.temporada!!).firstOrNull { it.numero == sig.episodio }?.nombre.orEmpty() } catch (e: Exception) { "" }
            if (ctx == c) siguiente = sig.copy(nombreEpisodio = nombre)
        } catch (e: Exception) { }
    }

    /** En los créditos (últimos 45 s) aparece «Siguiente capítulo» con cuenta atrás */
    private fun revisarCreditos() {
        if (duracion <= 0) return
        val queda = duracion - posicion
        if (!vistoMarcado && posicion >= duracion * 0.92) marcarVisto()
        val sig = siguiente ?: return
        if (siguienteDescartado || cuentaAtras != null) return
        if (queda in 1..45_000 && duracion > 10 * 60_000) {
            cuentaAtras = 15
            lifecycleScope.launch {
                while ((cuentaAtras ?: 0) > 0) { delay(1000); if (cuentaAtras == null) return@launch; cuentaAtras = cuentaAtras!! - 1 }
                if (cuentaAtras == 0) irASiguiente(sig)
            }
        }
    }

    private fun marcarVisto() {
        val c = ctx ?: return
        vistoMarcado = true
        App.ambito.launch {
            try {
                if (c.t.esSerie && c.temporada != null && c.episodio != null) {
                    val tot = try { Catalogo.detalle("tv", c.t.id).temporadas.associate { it.numero to it.episodios } } catch (e: Exception) { emptyMap() }
                    MiLista.marcarEpisodios(c.t, c.temporada, listOf(c.episodio), true, tot)
                } else MiLista.ponerVisto(c.t, true)
                App.versionLista++
            } catch (e: Exception) { }
        }
    }

    private fun alTerminar() {
        guardarProgreso()
        if (!vistoMarcado) marcarVisto()
        val sig = siguiente
        if (sig != null && !siguienteDescartado) irASiguiente(sig) else finish()
    }

    private fun irASiguiente(sig: Contexto) {
        guardarProgreso()
        cuentaAtras = null
        player.stop()
        empezar(sig, null, emptyList())
    }

    // ── Subtítulos ──────────────────────────────────────────────────────
    private suspend fun cargarSubtitulos(c: Contexto) {
        val l = withTimeoutOrNull(15_000) {
            try { Fuentes.subtitulos(c.t.tipo, Fuentes.idStremio(Catalogo.imdbDe(c.t.tipo, c.t.id), c.temporada, c.episodio)) } catch (e: Exception) { emptyList() }
        } ?: emptyList()
        if (ctx == c) { subsAddons = l; quizasSubtituloAutomatico() }
    }

    private fun esEspanol(l: String?) = l != null && Regex("^(es|spa|esp|es-.*)$|spanish|español|castellano", RegexOption.IGNORE_CASE).containsMatchIn(l)

    /** Audio que no está en español: si el archivo no trae subtítulos en español, se pone el primero de tus addons */
    private fun quizasSubtituloAutomatico() {
        val f = actual ?: return
        if (subsAutoHecho || subActivo != null || f.meta.es || f.meta.multi || fase != Fase.VIENDO) return
        if (player.currentTracks.groups.any { it.type == C.TRACK_TYPE_TEXT && it.length > 0 && esEspanol(it.getTrackFormat(0).language) }) { subsAutoHecho = true; return }
        val s = subsAddons.firstOrNull { esEspanol(it.idioma) } ?: return
        subsAutoHecho = true
        ponerSubtitulo(s, "Subtítulos en español activados")
    }

    private fun ponerSubtitulo(s: Subtitulo, avisoOk: String = "Subtítulo activado") {
        aviso = "Cargando subtítulo…"
        lifecycleScope.launch {
            val archivo = withContext(Dispatchers.IO) {
                try {
                    val con = (URL(s.url).openConnection() as HttpURLConnection).apply { connectTimeout = 15000; readTimeout = 15000; setRequestProperty("User-Agent", "CineMoodTV/3.0") }
                    val bytes = con.inputStream.use { it.readBytes() }.also { con.disconnect() }
                    if (bytes.size > 5_000_000) throw Exception("demasiado grande")
                    var txt = String(bytes, Charsets.UTF_8)
                    if ('�' in txt) txt = String(bytes, Charset.forName("windows-1252"))
                    txt = txt.replace("﻿", "").replace("\r\n", "\n").replace("\r", "\n").trim()
                    if (!txt.startsWith("WEBVTT")) txt = "WEBVTT\n\n" + txt.replace(Regex("(?m)^\\d+\\s*\\n(?=\\d{1,2}:)"), "").replace(Regex("(\\d{1,2}:\\d{2}:\\d{2}),(\\d{3})"), "$1.$2")
                    File(cacheDir, "cm_sub_${System.currentTimeMillis()}.vtt").apply { writeText(txt) }
                } catch (e: Exception) { null }
            }
            if (archivo == null) { aviso = "No se ha podido cargar ese subtítulo. Prueba otro."; delay(3000); aviso = ""; return@launch }
            subActivo = s; subArchivo = Uri.fromFile(archivo)
            val pos = player.currentPosition; val jugando = player.playWhenReady
            player.trackSelectionParameters = player.trackSelectionParameters.buildUpon().setTrackTypeDisabled(C.TRACK_TYPE_TEXT, false).setPreferredTextLanguage(s.idioma).build()
            player.setMediaItem(mediaItem(actual!!), pos); player.prepare(); player.playWhenReady = jugando
            aviso = avisoOk; delay(2500); aviso = ""
        }
    }

    private fun quitarSubtitulos() {
        player.trackSelectionParameters = player.trackSelectionParameters.buildUpon().setTrackTypeDisabled(C.TRACK_TYPE_TEXT, true).build()
        if (subArchivo != null) {
            subActivo = null; subArchivo = null
            val pos = player.currentPosition; val jugando = player.playWhenReady
            player.setMediaItem(mediaItem(actual!!), pos); player.prepare(); player.playWhenReady = jugando
        }
    }

    private fun elegirPista(g: Tracks.Group) {
        val b = player.trackSelectionParameters.buildUpon().setOverrideForType(TrackSelectionOverride(g.mediaTrackGroup, 0))
        if (g.type == C.TRACK_TYPE_TEXT) {
            b.setTrackTypeDisabled(C.TRACK_TYPE_TEXT, false)
            if (subArchivo != null) { subActivo = null; subArchivo = null; val pos = player.currentPosition; player.trackSelectionParameters = b.build(); player.setMediaItem(mediaItem(actual!!), pos); player.prepare(); return }
        }
        player.trackSelectionParameters = b.build()
    }

    // ── Avanzar / retroceder con miniaturas ─────────────────────────────
    private fun saltar(adelante: Boolean) {
        val ahora = System.currentTimeMillis()
        pulsaciones = if (ahora - ultimaPulsacionSalto < 700) pulsaciones + 1 else 0
        ultimaPulsacionSalto = ahora
        val paso = when { pulsaciones > 12 -> 120_000L; pulsaciones > 6 -> 60_000L; pulsaciones > 2 -> 30_000L; else -> 10_000L }
        val base = objetivo ?: player.currentPosition
        val tope = if (duracion > 0) duracion - 1000 else Long.MAX_VALUE
        objetivo = (base + if (adelante) paso else -paso).coerceIn(0, tope)
        if (player.isPlaying) player.pause()
        controles = true
    }

    private fun confirmarSalto() {
        objetivo?.let { player.seekTo(it) }
        objetivo = null; miniatura = null; player.play()
    }

    private suspend fun cargarMiniatura(ms: Long) {
        val url = actual?.url ?: return
        val bmp = withContext(Dispatchers.IO) {
            try {
                if (extractorUrl != url) { extractor?.release(); extractor = MediaMetadataRetriever().apply { setDataSource(url, HashMap()) }; extractorUrl = url }
                val r = extractor!!
                if (Build.VERSION.SDK_INT >= 27) r.getScaledFrameAtTime(ms * 1000, MediaMetadataRetriever.OPTION_CLOSEST_SYNC, 384, 216)
                else r.getFrameAtTime(ms * 1000, MediaMetadataRetriever.OPTION_CLOSEST_SYNC)
            } catch (e: Exception) { null }
        }
        if (objetivo == ms) miniatura = bmp
    }

    // ── Teclas del mando ────────────────────────────────────────────────
    private fun tecla(k: Key, abajo: Boolean, code: Int): Boolean {
        ultimaTecla = System.currentTimeMillis()
        if (!abajo) return k == Key.Back
        if (k == Key.Back) return false   // se gestiona al soltar
        if (fase != Fase.VIENDO || panelPistas) return false
        if (cuentaAtras != null) return false
        when (code) {
            android.view.KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE -> { if (player.isPlaying) player.pause() else player.play(); controles = true; return true }
            android.view.KeyEvent.KEYCODE_MEDIA_FAST_FORWARD -> { saltar(true); return true }
            android.view.KeyEvent.KEYCODE_MEDIA_REWIND -> { saltar(false); return true }
        }
        if (objetivo != null) {
            when (k) {
                Key.DirectionRight -> { saltar(true); return true }
                Key.DirectionLeft -> { saltar(false); return true }
                Key.DirectionCenter, Key.Enter -> { confirmarSalto(); return true }
                else -> return true
            }
        }
        if (!controles) {
            when (k) {
                Key.DirectionCenter, Key.Enter -> { if (player.isPlaying) player.pause() else player.play(); controles = true; return true }
                Key.DirectionLeft -> { saltar(false); return true }
                Key.DirectionRight -> { saltar(true); return true }
                Key.DirectionUp, Key.DirectionDown -> { controles = true; return true }
                else -> {}
            }
        }
        return false
    }

    private fun atras() {
        when {
            panelPistas -> panelPistas = false
            objetivo != null -> { objetivo = null; miniatura = null; player.play() }
            cuentaAtras != null -> { cuentaAtras = null; siguienteDescartado = true }
            controles && fase == Fase.VIENDO -> controles = false
            else -> { guardarProgreso(); finish() }
        }
    }

    // ── Pantalla ────────────────────────────────────────────────────────
    private val frRaiz = FocusRequester()

    @Composable
    private fun Pantalla() {
        // La pantalla entera recibe el foco: si no, las teclas del mando se las queda la tele (sale el volumen)
        LaunchedEffect(controles, panelPistas, cuentaAtras, fase) {
            if (!controles && !panelPistas && cuentaAtras == null && fase != Fase.ERROR) { delay(50); runCatching { frRaiz.requestFocus() } }
        }
        Box(
            Modifier.fillMaxSize().background(Color.Black).focusRequester(frRaiz).focusable().onPreviewKeyEvent { e ->
                val abajo = e.type == KeyEventType.KeyDown
                if (e.key == Key.Back) { if (e.type == KeyEventType.KeyUp) atras(); true }
                else tecla(e.key, abajo, e.key.nativeKeyCode)
            },
        ) {
            AndroidView(factory = { c ->
                PlayerView(c).apply {
                    useController = false
                    resizeMode = AspectRatioFrameLayout.RESIZE_MODE_FIT
                    setShowBuffering(PlayerView.SHOW_BUFFERING_NEVER)
                    player = this@PlayerActivity.player
                }
            }, modifier = Modifier.fillMaxSize())

            val c = ctx
            if (fase != Fase.VIENDO && c != null) {
                // Fondo de la ficha mientras se busca o carga
                Box(Modifier.fillMaxSize()) {
                    Imagen(Tmdb.img(c.t.fondo, "w1280"), Modifier.fillMaxSize())
                    Box(Modifier.fillMaxSize().background(Color.Black.copy(alpha = 0.72f)))
                    Column(Modifier.align(Alignment.CenterStart).padding(start = 80.dp).fillMaxWidth(0.6f)) {
                        Texto(c.t.nombre, tam = 40, peso = FontWeight.ExtraBold, titulo = true, color = Col.tinta, lineas = 2)
                        if (c.etiqueta.isNotEmpty()) Texto(c.etiqueta + if (c.nombreEpisodio.isNotEmpty()) " · ${c.nombreEpisodio}" else "", tam = 20, color = Col.suave)
                        Spacer(Modifier.height(24.dp))
                        Texto(mensaje, tam = 18, color = if (fase == Fase.ERROR) Col.acentoTexto else Col.tinta, lineas = 4)
                        if (fase == Fase.ERROR) {
                            Spacer(Modifier.height(22.dp))
                            val fr = remember { FocusRequester() }
                            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                Boton("Volver", { finish() }, Modifier.focusRequester(fr), principal = true)
                                actual?.url?.let { u -> Boton("Abrir en VLC", { Externo.abrirEnVLC(this@PlayerActivity, u, c.t.nombre); finish() }) }
                            }
                            LaunchedEffect(Unit) { delay(80); runCatching { fr.requestFocus() } }
                        }
                    }
                }
            }

            AnimatedVisibility(controles && fase == Fase.VIENDO, enter = fadeIn(), exit = fadeOut()) { Controles() }
            objetivo?.let { ms -> Salto(ms) }
            if (panelPistas) PanelPistas()
            cuentaAtras?.let { n -> siguiente?.let { s -> TarjetaSiguiente(s, n) } }
            if (aviso.isNotEmpty()) Texto(aviso, Modifier.align(Alignment.TopCenter).padding(top = 30.dp)
                .background(Col.superficie3.copy(alpha = 0.95f), RoundedCornerShape(10.dp)).padding(horizontal = 22.dp, vertical = 12.dp), tam = 16, color = Col.tinta)
            if (fase == Fase.CARGANDO || fase == Fase.BUSCANDO) Spinner(Modifier.align(Alignment.BottomEnd).padding(40.dp))
        }
    }

    @Composable
    private fun Spinner(modifier: Modifier) {
        var paso by remember { mutableIntStateOf(0) }
        LaunchedEffect(Unit) { while (true) { delay(350); paso = (paso + 1) % 4 } }
        Texto("●".repeat(paso + 1).padEnd(4, '○'), modifier, tam = 18, color = Col.acentoTexto)
    }

    private fun tiempo(ms: Long): String {
        val s = ms / 1000; val h = s / 3600; val m = s % 3600 / 60; val ss = s % 60
        return if (h > 0) String.format("%d:%02d:%02d", h, m, ss) else String.format("%d:%02d", m, ss)
    }

    @Composable
    private fun Controles() {
        val c = ctx ?: return
        val f = actual
        val frPrimero = remember { FocusRequester() }
        Box(Modifier.fillMaxSize()) {
            Box(Modifier.fillMaxWidth().height(160.dp).background(Brush.verticalGradient(listOf(Color.Black.copy(alpha = 0.8f), Color.Transparent))))
            Column(Modifier.padding(start = 48.dp, top = 30.dp)) {
                Texto(c.t.nombre + if (c.etiqueta.isNotEmpty()) " · ${c.etiqueta}" else "", tam = 24, peso = FontWeight.ExtraBold, titulo = true, color = Col.tinta, lineas = 1)
                Texto(listOf(c.nombreEpisodio, f?.meta?.idioma.orEmpty(), f?.let { if (it.meta.calidad >= 2160) "4K" else if (it.meta.calidad > 0) "${it.meta.calidad}p" else "" }.orEmpty(), f?.origen.orEmpty())
                    .filter { it.isNotEmpty() }.joinToString("  ·  "), tam = 15, color = Col.suave, lineas = 1)
            }
            Column(Modifier.align(Alignment.BottomCenter).fillMaxWidth().background(Brush.verticalGradient(listOf(Color.Transparent, Color.Black.copy(alpha = 0.85f)))).padding(horizontal = 48.dp, vertical = 28.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Texto(if (reproduciendo) "▶" else "❚❚", tam = 20, color = Col.tinta)
                    Spacer(Modifier.width(16.dp))
                    Texto(tiempo(posicion), tam = 16, color = Col.tinta)
                    Spacer(Modifier.width(14.dp))
                    Box(Modifier.weight(1f).height(6.dp).background(Color.White.copy(alpha = 0.25f), RoundedCornerShape(3.dp))) {
                        Box(Modifier.fillMaxWidth(if (duracion > 0) (posicion.toFloat() / duracion).coerceIn(0f, 1f) else 0f).fillMaxHeight().background(Col.acento, RoundedCornerShape(3.dp)))
                    }
                    Spacer(Modifier.width(14.dp))
                    Texto(tiempo(duracion), tam = 16, color = Col.tinta)
                }
                Spacer(Modifier.height(18.dp))
                Row(Modifier.focusGroup(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Boton(if (reproduciendo) "Pausa" else "Seguir", { if (player.isPlaying) player.pause() else player.play() }, Modifier.focusRequester(frPrimero), icono = if (reproduciendo) "❚❚" else "▶", pequeno = true)
                    Boton("Audio y subtítulos", { panelPistas = true }, icono = "💬", pequeno = true)
                    if (candidatos.size > 1) Boton("Otra fuente", { siguienteFuente(player.currentPosition, "cambio a mano") }, icono = "⇄", pequeno = true)
                    siguiente?.let { s -> Boton("Siguiente capítulo", { irASiguiente(s) }, icono = "⏭", pequeno = true) }
                    f?.url?.let { u -> Boton("VLC", { guardarProgreso(); player.pause(); Externo.abrirEnVLC(this@PlayerActivity, u, c.t.nombre) }, icono = "🟠", pequeno = true) }
                }
                Spacer(Modifier.height(10.dp))
                Texto("◀ ▶ avanzar o retroceder viendo la imagen · OK pausa", tam = 13, color = Col.tenue)
            }
        }
        LaunchedEffect(Unit) { delay(60); runCatching { frPrimero.requestFocus() } }
    }

    @Composable
    private fun Salto(ms: Long) {
        LaunchedEffect(ms) { delay(220); cargarMiniatura(ms) }
        LaunchedEffect(ms) { delay(4000); if (objetivo == ms) confirmarSalto() }   // si no se pulsa nada, salta solo
        Box(Modifier.fillMaxSize()) {
            Column(Modifier.align(Alignment.BottomCenter).padding(bottom = 150.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                Box(Modifier.size(384.dp, 216.dp).background(Col.superficie, RoundedCornerShape(10.dp)).border(2.dp, Col.tinta, RoundedCornerShape(10.dp)), contentAlignment = Alignment.Center) {
                    val b = miniatura
                    if (b != null) Image(b.asImageBitmap(), null, Modifier.fillMaxSize())
                    else Texto("…", tam = 30, color = Col.suave)
                }
                Spacer(Modifier.height(12.dp))
                val dif = (ms - player.currentPosition) / 1000
                Texto(tiempo(ms) + "   (" + (if (dif >= 0) "+" else "−") + tiempo(kotlin.math.abs(dif) * 1000) + ")", Modifier.background(Color.Black.copy(alpha = 0.7f), RoundedCornerShape(6.dp)).padding(horizontal = 14.dp, vertical = 6.dp), tam = 20, peso = FontWeight.Bold, color = Col.tinta)
                Spacer(Modifier.height(6.dp))
                Texto("OK para saltar aquí · Atrás para cancelar", tam = 14, color = Col.suave)
            }
        }
    }

    @Composable
    private fun PanelPistas() {
        val v = versionPistas   // se repinta cuando cambian las pistas
        val grupos = remember(v) { player.currentTracks.groups.toList() }
        val audio = grupos.filter { it.type == C.TRACK_TYPE_AUDIO && it.length > 0 }
        val texto = grupos.filter { it.type == C.TRACK_TYPE_TEXT && it.length > 0 }
        val subsOff = player.trackSelectionParameters.disabledTrackTypes.contains(C.TRACK_TYPE_TEXT) || (texto.none { it.isSelected } && subActivo == null)
        val fr = remember { FocusRequester() }
        Box(Modifier.fillMaxSize().background(Color.Black.copy(alpha = 0.5f))) {
            LazyColumn(
                Modifier.align(Alignment.CenterEnd).fillMaxHeight().width(520.dp).background(Col.superficie).padding(horizontal = 26.dp),
                contentPadding = PaddingValues(vertical = 30.dp), verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                item { Texto("Audio", tam = 22, peso = FontWeight.ExtraBold, titulo = true, color = Col.tinta) }
                if (audio.isEmpty()) item { Texto("Este archivo solo tiene una pista de audio.", tam = 14, color = Col.suave) }
                items(audio.size) { i ->
                    val g = audio[i]; val fmt = g.getTrackFormat(0)
                    val nombre = listOfNotNull(idioma(fmt.language), fmt.label, canales(fmt.channelCount), fmt.sampleMimeType?.substringAfter('/')?.uppercase()).distinct().joinToString(" · ")
                    OpcionPista(nombre.ifEmpty { "Pista ${i + 1}" }, g.isSelected, if (i == 0) Modifier.focusRequester(fr) else Modifier) { elegirPista(g) }
                }
                item { Spacer(Modifier.height(12.dp)); Texto("Subtítulos", tam = 22, peso = FontWeight.ExtraBold, titulo = true, color = Col.tinta) }
                item { OpcionPista("Sin subtítulos", subsOff, if (audio.isEmpty()) Modifier.focusRequester(fr) else Modifier) { quitarSubtitulos() } }
                items(texto.size) { i ->
                    val g = texto[i]; val fmt = g.getTrackFormat(0)
                    OpcionPista(listOfNotNull(idioma(fmt.language), fmt.label).distinct().joinToString(" · ").ifEmpty { "Subtítulo ${i + 1}" } + "  (del archivo)", g.isSelected && subActivo == null) { elegirPista(g) }
                }
                if (subsAddons.isNotEmpty()) item { Spacer(Modifier.height(6.dp)); Texto("De tus addons", tam = 15, peso = FontWeight.Bold, color = Col.suave) }
                items(subsAddons, key = { it.url }) { s -> OpcionPista(idioma(s.idioma) + " · " + s.etiqueta.substringAfter(" · ", ""), subActivo?.url == s.url) { ponerSubtitulo(s) } }
            }
        }
        LaunchedEffect(Unit) { delay(80); runCatching { fr.requestFocus() } }
    }

    @Composable
    private fun OpcionPista(texto: String, elegida: Boolean, modifier: Modifier = Modifier, alPulsar: () -> Unit) {
        val forma = RoundedCornerShape(8.dp)
        Surface(onClick = alPulsar, modifier = modifier.fillMaxWidth(), shape = ClickableSurfaceDefaults.shape(forma),
            colors = ClickableSurfaceDefaults.colors(containerColor = if (elegida) Col.verdeSuave else Col.superficie2, contentColor = if (elegida) Col.verde else Col.tinta, focusedContainerColor = Col.tinta, focusedContentColor = Col.fondo),
            border = ClickableSurfaceDefaults.border(focusedBorder = Border(BorderStroke(2.dp, Color.White), shape = forma)),
            scale = ClickableSurfaceDefaults.scale(focusedScale = 1.02f)) {
            Row(Modifier.padding(horizontal = 16.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                Texto(if (elegida) "✓" else " ", tam = 16, peso = FontWeight.Bold); Spacer(Modifier.width(12.dp))
                Texto(texto, tam = 16, peso = FontWeight.Medium, lineas = 1)
            }
        }
    }

    private fun idioma(c: String?): String {
        if (c.isNullOrBlank() || c == "und") return "Desconocido"
        val m = mapOf("spa" to "es", "eng" to "en", "fre" to "fr", "fra" to "fr", "ger" to "de", "deu" to "de", "ita" to "it", "por" to "pt", "pob" to "pt", "jpn" to "ja")
        return try { java.util.Locale.forLanguageTag(m[c] ?: c).getDisplayLanguage(java.util.Locale("es")).replaceFirstChar { it.uppercase() }.ifEmpty { c } } catch (e: Exception) { c }
    }
    private fun canales(n: Int) = when (n) { 1 -> "Mono"; 2 -> "Estéreo"; 6 -> "5.1"; 8 -> "7.1"; else -> if (n > 0) "$n canales" else null }

    @Composable
    private fun TarjetaSiguiente(s: Contexto, n: Int) {
        val fr = remember { FocusRequester() }
        Box(Modifier.fillMaxSize()) {
            Column(Modifier.align(Alignment.BottomEnd).padding(48.dp).width(420.dp).background(Col.superficie.copy(alpha = 0.96f), RoundedCornerShape(12.dp))
                .border(1.dp, Col.linea, RoundedCornerShape(12.dp)).padding(22.dp)) {
                Texto("Siguiente capítulo en $n s", tam = 14, color = Col.acentoTexto, peso = FontWeight.Bold)
                Texto(s.etiqueta + if (s.nombreEpisodio.isNotEmpty()) " · ${s.nombreEpisodio}" else "", tam = 18, peso = FontWeight.Bold, color = Col.tinta, lineas = 2)
                Spacer(Modifier.height(14.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Boton("Ver ahora", { irASiguiente(s) }, Modifier.focusRequester(fr), icono = "⏭", principal = true, pequeno = true)
                    Boton("Seguir viendo los créditos", { cuentaAtras = null; siguienteDescartado = true }, pequeno = true)
                }
            }
        }
        LaunchedEffect(Unit) { delay(60); runCatching { fr.requestFocus() } }
    }

    // ── Progreso ────────────────────────────────────────────────────────
    private fun guardarProgreso() {
        val c = ctx ?: return
        if (fase != Fase.VIENDO) return
        val dur = player.duration.takeIf { it != C.TIME_UNSET && it > 0 } ?: 0
        Progreso.guardar(this, Progreso.clave(c.t, c.temporada, c.episodio), player.currentPosition / 1000, dur / 1000)
        App.versionLista++
    }

    override fun onStop() {
        guardarProgreso()
        if (::player.isInitialized) player.pause()
        super.onStop()
    }

    override fun onDestroy() {
        vigilante?.cancel()
        try { extractor?.release() } catch (e: Exception) { }
        if (::player.isInitialized) player.release()
        cacheDir.listFiles { f -> f.name.startsWith("cm_sub_") }?.forEach { it.delete() }
        super.onDestroy()
    }
}
