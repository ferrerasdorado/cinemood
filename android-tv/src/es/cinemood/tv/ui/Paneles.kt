@file:OptIn(ExperimentalTvMaterial3Api::class, ExperimentalComposeUiApi::class)

package es.cinemood.tv.ui

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.ExperimentalComposeUiApi
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.foundation.focusGroup
import androidx.compose.ui.focus.focusProperties
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.input.key.type
import androidx.compose.ui.input.key.onPreviewKeyEvent
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.tv.material3.Border
import androidx.tv.material3.ClickableSurfaceDefaults
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.Surface
import es.cinemood.tv.Externo
import es.cinemood.tv.datos.Catalogo
import es.cinemood.tv.datos.Fuente
import es.cinemood.tv.datos.Fuentes
import es.cinemood.tv.datos.ParteNas
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

// CineMood TV · Panel «Elegir fuente» (ver o enviar al NAS), menús y avisos.

private data class EstadoAddon(val nombre: String, val estado: String)   // "buscando", "n resultados" o el error

/** Qué se pide al NAS con un torrent concreto (las mismas reglas que la web) */
private fun parteDe(f: Fuente, c: Contexto): Pair<ParteNas, String> {
    val base = ParteNas(hash = f.hash, fuente = "${f.addon.nombre} · ${f.torrent}".take(300))
    if (!c.t.esSerie) return base to "Enviar al NAS"
    return when (f.tipoT.clase) {
        "serie" -> base to "Enviar la serie completa"
        "temporada" -> { val n = f.tipoT.temporada ?: c.temporada; base.copy(temporada = n) to "Enviar la temporada $n" }
        else -> base.copy(temporada = c.temporada, episodio = c.episodio) to "Enviar el capítulo"
    }
}

private fun entraEnNas(f: Fuente, pf: PanelFuentes): Boolean {
    if (f.hash == null) return false
    return when (pf.vistaNas) {
        "temporada" -> (f.tipoT.clase == "temporada" && (f.tipoT.temporada == null || f.tipoT.temporada == pf.ctx.temporada)) || f.tipoT.clase == "serie"
        "serie" -> f.tipoT.clase == "serie"
        else -> true
    }
}

@Composable
fun PanelFuentesUI(pf: PanelFuentes) {
    val c = LocalContext.current
    val resultados = remember(pf) { mutableStateListOf<Fuente>() }
    val estados = remember(pf) { mutableStateMapOf<String, EstadoAddon>() }
    var error by remember(pf) { mutableStateOf<String?>(null) }
    var terminado by remember(pf) { mutableStateOf(false) }
    var filtro by remember(pf) { mutableStateOf("todas") }
    var cuantas by remember(pf) { mutableIntStateOf(40) }
    var subsEsAddons by remember(pf) { mutableStateOf(false) }   // tus addons de subtítulos tienen alguno en español
    val frPrimero = remember { FocusRequester() }
    val frFiltros = remember { FocusRequester() }   // el filtro elegido
    val frNas = remember { FocusRequester() }
    val estadoChips = androidx.compose.foundation.lazy.rememberLazyListState()
    val estadoLista = androidx.compose.foundation.lazy.rememberLazyListState()
    val ambitoPanel = androidx.compose.runtime.rememberCoroutineScope()

    LaunchedEffect(pf) {
        try {
            val tipoS = if (pf.ctx.t.esSerie) "series" else "movie"
            val imdb = Catalogo.imdbDe(pf.ctx.t.tipo, pf.ctx.t.id)
            val id = Fuentes.idStremio(imdb, pf.ctx.temporada, pf.ctx.episodio)
            val addons = Fuentes.addons().filter { it.maneja("stream", tipoS, id) }
            if (addons.isEmpty()) { error = "No tienes addons de fuentes en tu cuenta. Añádelos en la web (Tú → Mis addons) y aparecerán aquí."; terminado = true; return@LaunchedEffect }
            addons.forEach { estados[it.url] = EstadoAddon(it.nombre, "buscando…") }
            if (!pf.nas) launch {
                subsEsAddons = try { Fuentes.subtitulos(pf.ctx.t.tipo, id).any { Regex("^(spa|es|esp|es-es|es-419)$", RegexOption.IGNORE_CASE).matches(it.idioma) } } catch (e: Exception) { false }
            }
            coroutineScope {
                addons.map { a ->
                    async {
                        try {
                            val l = Fuentes.deAddon(a, pf.ctx.t.tipo, id)
                            val vistos = resultados.map { it.clave }.toHashSet()
                            resultados.addAll(l.distinctBy { it.clave }.filter { it.clave !in vistos })   // sin repetidos (ni entre addons ni dentro de uno)
                            estados[a.url] = EstadoAddon(a.nombre, "${l.size}")
                        } catch (e: Exception) {
                            estados[a.url] = EstadoAddon(a.nombre, if (e is java.net.SocketTimeoutException) "no responde" else "error")
                        }
                    }
                }.awaitAll()
            }
        } catch (e: Exception) { error = e.message }
        terminado = true
    }

    val nombresFiltro = mapOf("todas" to "Todas", "instante" to "⚡ Al instante", "4k" to "4K", "1080" to "1080p", "720" to "720p",
        "es" to "En español", "cast" to "Castellano", "lat" to "Latino", "ingles" to "Inglés + subtítulos ES", "packs" to "Packs")
    val opcionesActuales = listOfNotNull("todas", if (pf.nas) null else "instante", "4k", "1080", "720", "es", "cast", "lat",
        if (pf.nas) null else "ingles", if (pf.ctx.t.esSerie && pf.vistaNas.isEmpty()) "packs" else null)
    val n = resultados.size
    val base = remember(n, pf) { if (pf.nas) resultados.filter { entraEnNas(it, pf) } else resultados.toList() }
    val filtradas = remember(base, filtro, subsEsAddons) { Fuentes.ordenar(base.filter { f ->
        when (filtro) {
            "instante" -> f.sePuedeVer && f.meta.alInstante
            "4k" -> f.meta.calidad >= 2160
            "1080" -> f.meta.calidad == 1080
            "es" -> f.meta.es
            "ingles" -> f.meta.en && !f.meta.es && (f.meta.subEs || subsEsAddons)
            "cast" -> f.meta.cast
            "lat" -> f.meta.lat
            "720" -> f.meta.calidad == 720
            "packs" -> f.tipoT.clase == "temporada" || f.tipoT.clase == "serie"
            else -> true
        }
    }) }
    val alInstante = base.count { it.sePuedeVer && it.meta.alInstante }

    Box(Modifier.fillMaxSize().background(Color.Black.copy(alpha = 0.55f))) {
        Column(
            Modifier.align(Alignment.CenterEnd).fillMaxHeight().fillMaxWidth(0.6f).background(C.superficie)
                .border(BorderStroke(1.dp, C.linea)).padding(top = 30.dp, start = 30.dp, end = 30.dp)
                .focusGroup(),
        ) {
            Texto(if (pf.nas) (if (pf.vistaNas == "serie") "Elegir pack de la serie" else if (pf.vistaNas == "temporada") "Elegir pack · Temporada ${pf.ctx.temporada}" else "Elegir torrent para el NAS") else "Elegir fuente",
                tam = 26, peso = FontWeight.ExtraBold, titulo = true, color = C.tinta)
            Texto(pf.ctx.t.nombre + (if (pf.ctx.etiqueta.isNotEmpty() && pf.vistaNas.isEmpty()) " · ${pf.ctx.etiqueta}" else "") + (if (pf.ctx.nombreEpisodio.isNotEmpty() && pf.vistaNas.isEmpty()) " · ${pf.ctx.nombreEpisodio}" else ""),
                tam = 15, color = C.suave, lineas = 1)
            Spacer(Modifier.height(10.dp))
            val est = estados.values.toList()
            Texto(when {
                error != null -> error!!
                !terminado && base.isEmpty() -> "Buscando en ${est.size} addons…"
                else -> (if (pf.nas) "${base.size} torrents" else "${base.size} fuentes · $alInstante al instante ⚡") +
                    (if (!terminado) " · buscando…" else "") + "   (" + est.joinToString(" · ") { "${it.nombre}: ${it.estado}" } + ")"
            }, tam = 13, color = if (error != null) C.acentoTexto else C.tenue, lineas = 2)
            Spacer(Modifier.height(10.dp))
            LazyRow(Modifier.offset(x = (-8).dp), state = estadoChips, horizontalArrangement = Arrangement.spacedBy(8.dp), contentPadding = PaddingValues(horizontal = 8.dp, vertical = 6.dp)) {
                val opciones = opcionesActuales.map { k -> k to nombresFiltro.getValue(k) }
                items(opciones, key = { it.first }) { (k, n) ->
                    // ↓ baja a la primera fuente (llevándola a la vista si hace falta); ↑ y ← (en el primero) no salen del panel
                    Chip(n, filtro == k, { filtro = k; cuantas = 40 }, Modifier.let { if (filtro == k) it.focusRequester(frFiltros) else it }
                        .focusProperties { up = FocusRequester.Cancel; if (k == opciones.first().first) left = FocusRequester.Cancel }
                        .onPreviewKeyEvent { e ->
                            if (e.key != Key.DirectionDown || filtradas.isEmpty()) return@onPreviewKeyEvent false
                            if (e.type == KeyEventType.KeyDown) ambitoPanel.launch { estadoLista.scrollToItem(0); delay(30); runCatching { frPrimero.requestFocus() } }
                            true
                        })
                }
            }
            Spacer(Modifier.height(10.dp))
            if (pf.nas && pf.vistaNas.isEmpty() && !pf.ctx.t.esSerie) {
                Boton("Que elija el NAS (mejor en español)", { App.fuentes = null; enviarNas(pf.ctx.t, listOf(ParteNas())) }, Modifier.padding(bottom = 10.dp).focusRequester(frNas).focusProperties { left = FocusRequester.Cancel; right = FocusRequester.Cancel }, icono = "✨", pequeno = true)
            }
            if (terminado && filtradas.isEmpty() && error == null) {
                Texto(if (pf.nas && pf.vistaNas == "temporada") "Ningún addon tiene un pack con la temporada ${pf.ctx.temporada} entera. Puedes pedirla igualmente con «Que elija el NAS», o enviar los capítulos sueltos."
                else if (pf.nas && pf.vistaNas == "serie") "Ningún addon tiene un pack con la serie completa. Prueba por temporadas."
                else if (base.isEmpty()) "Ninguno de tus addons tiene fuentes para esto. Prueba otro capítulo o «Que elija el NAS»."
                else "No hay resultados con este filtro.", tam = 15, color = C.suave)
            }
            LazyColumn(Modifier.fillMaxSize(), state = estadoLista, verticalArrangement = Arrangement.spacedBy(10.dp), contentPadding = PaddingValues(bottom = 30.dp, top = 4.dp)) {
                items(filtradas.take(cuantas), key = { it.clave }) { f ->
                    // Las fuentes no dejan salir el foco por los lados; desde la primera, ↑ sube a los filtros
                    val primera = f == filtradas.first()
                    val conNas = pf.nas && pf.vistaNas.isEmpty() && !pf.ctx.t.esSerie
                    TarjetaFuente(f, pf, Modifier.let { if (primera) it.focusRequester(frPrimero) else it }
                        .focusProperties { left = FocusRequester.Cancel; right = FocusRequester.Cancel }
                        .onPreviewKeyEvent { e ->
                            // Desde la primera fuente, ↑ sube al filtro elegido (o al botón del NAS)
                            if (!primera || e.key != Key.DirectionUp) return@onPreviewKeyEvent false
                            if (e.type == KeyEventType.KeyDown) ambitoPanel.launch {
                                if (!conNas) { estadoChips.scrollToItem(opcionesActuales.indexOf(filtro).coerceAtLeast(0)); delay(30) }
                                try { (if (conNas) frNas else frFiltros).requestFocus() }
                                catch (x: Exception) { android.util.Log.w("CineMoodFoco", "subir: $x") }
                            }
                            true
                        }
                        , c, filtradas)
                }
                if (filtradas.size > cuantas) item(key = "mas") {
                    Boton("Ver ${minOf(40, filtradas.size - cuantas)} más (quedan ${filtradas.size - cuantas})", { cuantas += 40 }, Modifier.focusProperties { left = FocusRequester.Cancel; right = FocusRequester.Cancel }, pequeno = true)
                }
            }
        }
    }
    // El foco va a la primera fuente en cuanto llega; si al terminar no hay ninguna, al filtro elegido
    var enfocado by remember(pf) { mutableStateOf(false) }
    LaunchedEffect(filtradas.isNotEmpty(), terminado) {
        if (enfocado) return@LaunchedEffect
        if (filtradas.isNotEmpty()) { estadoLista.scrollToItem(0); delay(60); runCatching { frPrimero.requestFocus(); enfocado = true } }
        else if (terminado) { delay(60); runCatching { frFiltros.requestFocus(); enfocado = true } }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun TarjetaFuente(f: Fuente, pf: PanelFuentes, modifier: Modifier, c: android.content.Context, lista: List<Fuente>) {
    // Si la elegida falla, el reproductor sigue con las demás del panel (en el mismo orden)
    val resto = lista.filter { it.sePuedeVer && it.clave != f.clave }
    val forma = RoundedCornerShape(8.dp)
    val (parte, textoNas) = parteDe(f, pf.ctx)
    fun accion() {
        if (pf.nas) { App.fuentes = null; enviarNas(pf.ctx.t, listOf(parte)); return }
        if (f.sePuedeVer) App.reproducir(c, f, pf.ctx, resto)
        else App.menu = Menu("Es un torrent", "No se puede ver aquí sin un servicio como AllDebrid configurado en el addon, pero sí puedes descargarlo en tu NAS.", listOfNotNull(
            if (f.hash != null) OpcionMenu(textoNas, "⬇") { App.fuentes = null; enviarNas(pf.ctx.t, listOf(parte)) } else null))
    }
    Surface(
        onClick = { accion() },
        onLongClick = {
            App.menu = Menu(f.torrent, f.origen, listOfNotNull(
                if (f.sePuedeVer && !pf.nas) OpcionMenu("Ver aquí", "▶") { App.reproducir(c, f, pf.ctx, resto) } else null,
                if (f.sePuedeVer) OpcionMenu("Abrir en VLC", "🟠") { Externo.abrirEnVLC(c, f.url, pf.ctx.t.nombre) } else null,
                if (f.hash != null) OpcionMenu(textoNas, "⬇") { App.fuentes = null; enviarNas(pf.ctx.t, listOf(parte)) } else null,
            ))
        },
        modifier = modifier.fillMaxWidth(),
        shape = ClickableSurfaceDefaults.shape(forma),
        colors = ClickableSurfaceDefaults.colors(containerColor = C.superficie2, focusedContainerColor = C.superficie3, contentColor = C.tinta, focusedContentColor = C.tinta),
        border = ClickableSurfaceDefaults.border(focusedBorder = Border(BorderStroke(2.dp, C.tinta), shape = forma)),
        scale = ClickableSurfaceDefaults.scale(focusedScale = 1.015f),
    ) {
        Row(Modifier.padding(horizontal = 16.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) { Etiquetas(f, pf) }
                Spacer(Modifier.height(7.dp))
                Texto(f.torrent, tam = 15, peso = FontWeight.Bold, lineas = 2, color = C.tinta)
                if (f.archivo.isNotEmpty()) Texto("Archivo: " + f.archivo, tam = 13, lineas = 1, color = C.suave)
                Texto(f.origen, tam = 12, lineas = 1, color = C.tenue)
            }
            Spacer(Modifier.width(12.dp))
            Texto(if (pf.nas) "⬇" else if (f.sePuedeVer) "▶" else "⬇", tam = 20, color = if (f.sePuedeVer || pf.nas) C.tinta else C.tenue)
        }
    }
}

@Composable
private fun Etiquetas(f: Fuente, pf: PanelFuentes) {
    val m = f.meta
    if (!pf.nas && m.alInstante && f.sePuedeVer) Etiqueta("⚡ Al instante", C.verde, C.verdeSuave)
    if (!pf.nas && f.sePuedeVer && !m.alInstante) Etiqueta("▶ Se ve aquí", C.verde, C.verdeSuave)
    if (m.calidad > 0) Etiqueta(if (m.calidad >= 2160) "4K" else "${m.calidad}p", C.tinta, C.superficie3)
    if (m.dv) Etiqueta("Dolby Vision") else if (m.hdr) Etiqueta("HDR")
    if (f.tipoT.clase == "temporada") Etiqueta("Temporada" + (f.tipoT.temporada?.let { " $it" } ?: "") + " completa", C.ambar, C.superficie3)
    if (f.tipoT.clase == "serie") Etiqueta("Serie completa", C.ambar, C.superficie3)
    if (m.tamano > 0 && f.tipoT.clase != "temporada" && f.tipoT.clase != "serie") Etiqueta(Fuentes.bytes(m.tamano))
    if (m.semillas >= 0) Etiqueta("👤 " + String.format("%,d", m.semillas).replace(',', '.'))
    if (m.idioma.isNotEmpty()) Etiqueta(m.idioma, if (m.es) C.acentoTexto else C.suave, if (m.es) C.acentoSuave else C.superficie2)
    if (m.subEs) Etiqueta("Subs ES")
    if (!pf.nas && !f.sePuedeVer) Etiqueta("Torrent", C.suave, Color.Transparent, C.linea)
}

@Composable
fun MenuUI(m: Menu) {
    val fr = remember { FocusRequester() }
    Box(Modifier.fillMaxSize().background(Color.Black.copy(alpha = 0.6f)), contentAlignment = Alignment.Center) {
        Column(
            Modifier.widthIn(max = 560.dp).background(C.superficie, RoundedCornerShape(12.dp)).border(1.dp, C.linea, RoundedCornerShape(12.dp))
                .padding(28.dp).focusGroup().focusProperties { exit = { FocusRequester.Cancel } },
        ) {
            Texto(m.titulo, tam = 22, peso = FontWeight.ExtraBold, titulo = true, color = C.tinta, lineas = 2)
            if (m.texto.isNotEmpty()) { Spacer(Modifier.height(8.dp)); Texto(m.texto, tam = 15, color = C.suave, lineas = 4, alto = 21) }
            Spacer(Modifier.height(18.dp))
            m.opciones.forEachIndexed { i, o ->
                Boton(o.texto, { App.menu = null; o.accion() }, Modifier.fillMaxWidth().padding(bottom = 8.dp).let { if (i == 0) it.focusRequester(fr) else it }, icono = o.icono, principal = o.peligro)
            }
            Boton("Cancelar", { App.menu = null }, Modifier.fillMaxWidth().let { if (m.opciones.isEmpty()) it.focusRequester(fr) else it }, pequeno = true)
        }
    }
    LaunchedEffect(m) { delay(50); runCatching { fr.requestFocus() } }
}

@Composable
fun AvisoUI(modifier: Modifier = Modifier) {
    val a = App.aviso
    AnimatedVisibility(a != null, modifier, enter = fadeIn() + slideInVertically { it / 2 }, exit = fadeOut() + slideOutVertically { it / 2 }) {
        val (texto, err) = a ?: ("" to false)
        Box(Modifier.padding(bottom = 36.dp).widthIn(max = 760.dp)
            .background(if (err) C.acentoSuave else C.superficie3, RoundedCornerShape(10.dp))
            .border(1.dp, if (err) C.acento else C.linea, RoundedCornerShape(10.dp))
            .padding(horizontal = 24.dp, vertical = 14.dp)) {
            Texto(texto, tam = 16, peso = FontWeight.Medium, color = C.tinta, lineas = 3)
        }
    }
}
