@file:OptIn(ExperimentalTvMaterial3Api::class, ExperimentalComposeUiApi::class, androidx.compose.foundation.ExperimentalFoundationApi::class)

package es.cinemood.tv.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.ExperimentalComposeUiApi
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.tv.material3.Border
import androidx.tv.material3.ClickableSurfaceDefaults
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.Surface
import es.cinemood.tv.Externo
import es.cinemood.tv.datos.Catalogo
import es.cinemood.tv.datos.Detalle
import es.cinemood.tv.datos.EnLista
import es.cinemood.tv.datos.Episodio
import es.cinemood.tv.datos.MiLista
import es.cinemood.tv.datos.Nas
import es.cinemood.tv.datos.ParteNas
import es.cinemood.tv.datos.Progreso
import es.cinemood.tv.datos.Tmdb
import es.cinemood.tv.datos.Titulo
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.focus.focusRequester
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

// CineMood TV · Ficha a pantalla completa: imagen de fondo, logo, datos, botones (Ver, Mi lista, Vista, NAS, Tráiler),
// temporadas y capítulos, reparto y recomendaciones.


@Composable
fun PantallaFicha(t0: Titulo) {
    val ctx = LocalContext.current
    var d by remember { mutableStateOf(Catalogo.fichas.get(t0.clave)) }
    var error by remember { mutableStateOf<String?>(null) }
    var enLista by remember { mutableStateOf<EnLista?>(null) }
    var temporada by remember { mutableStateOf<Int?>(null) }
    var episodios by remember { mutableStateOf<List<Episodio>?>(null) }
    val ambito = rememberCoroutineScope()
    LaunchedEffect(t0.clave) {
        if (d == null) try { d = Catalogo.detalle(t0.tipo, t0.id) } catch (e: Exception) { error = e.message }
    }
    LaunchedEffect(t0.clave, App.versionLista) { enLista = try { MiLista.estado(t0) } catch (e: Exception) { null } }
    val t = d?.t ?: t0
    var puntuando by remember { mutableStateOf(false) }
    var gustoListo by remember { mutableStateOf(es.cinemood.tv.datos.Gusto.listo) }
    LaunchedEffect(Unit) { if (!gustoListo) { try { es.cinemood.tv.datos.Gusto.preparar() } catch (e: Exception) { }; gustoListo = es.cinemood.tv.datos.Gusto.listo } }
    // Por dónde vas: en series, el último capítulo que viste en esta tele
    // Capítulos vistos (los mismos que en la web)
    var vistos by remember { mutableStateOf<Map<Int, Set<Int>>>(emptyMap()) }
    LaunchedEffect(t0.clave, App.versionLista) { if (t0.esSerie) vistos = try { MiLista.episodiosVistos(t0) } catch (e: Exception) { emptyMap() } }
    var versionProgreso by remember { mutableStateOf(0) }
    LaunchedEffect(t0.clave) { Progreso.sincronizar(ctx); versionProgreso++ }
    val progresos = remember(App.versionLista, App.pila.size, versionProgreso) { Progreso.deTitulo(ctx, t0) }
    // «Por dónde vas»: el capítulo a medias más reciente que no esté ya visto
    val seguir = remember(progresos, vistos) { progresos.values.filter { p -> p.temporada == null || p.episodio !in (vistos[p.temporada] ?: emptySet()) }.maxByOrNull { it.cuando } }
    LaunchedEffect(d) {
        val dd = d ?: return@LaunchedEffect
        if (dd.t.esSerie && temporada == null) temporada = seguir?.temporada ?: dd.temporadas.firstOrNull()?.numero
    }
    LaunchedEffect(temporada) {
        val n = temporada ?: return@LaunchedEffect
        episodios = null
        episodios = try { Catalogo.episodios(t.id, n) } catch (e: Exception) { emptyList() }
    }

    fun contextoVer(): Contexto = when {
        !t.esSerie -> Contexto(t)
        seguir?.temporada != null -> Contexto(t, seguir.temporada, seguir.episodio)
        else -> {
            // El siguiente al último capítulo visto (y si no, el primero sin ver)
            val temps = d?.temporadas ?: emptyList()
            val todos = temps.flatMap { s -> (1..s.episodios).map { s.numero to it } }
            val ultimo = todos.indexOfLast { (s, e) -> e in (vistos[s] ?: emptySet()) }
            val sig = todos.drop(ultimo + 1).firstOrNull { (s, e) -> e !in (vistos[s] ?: emptySet()) }
                ?: todos.firstOrNull { (s, e) -> e !in (vistos[s] ?: emptySet()) }
            val (n, e) = sig ?: ((temps.firstOrNull()?.numero ?: 1) to 1)
            Contexto(t, n, e, episodios?.firstOrNull { temporada == n && it.numero == e }?.nombre ?: "")
        }
    }
    fun marcarCapitulos(n: Int, eps: List<Int>, visto: Boolean) {
        ambito.launch {
            try {
                vistos = MiLista.marcarEpisodios(t, n, eps, visto, d?.temporadas?.associate { it.numero to it.episodios } ?: emptyMap())
                App.avisar(if (visto) (if (eps.size > 1) "Temporada $n marcada como vista." else "Marcado como visto.") else "Ya no está marcado como visto.")
                App.versionLista++
            } catch (e: Exception) { App.error(e) }
        }
    }
    fun puntuar(n: Int?) {
        puntuando = false
        ambito.launch {
            try {
                MiLista.puntuar(t, n)
                App.avisar(if (n != null) "Le has puesto un $n. Tus recomendaciones se actualizan." else "Nota quitada.")
                App.versionLista++; App.cacheParaTi = emptyList()
                es.cinemood.tv.datos.Gusto.preparar(forzar = true)
            } catch (e: Exception) { App.error(e) }
        }
    }
    fun cambiarLista(campo: String) {
        val actual = enLista
        ambito.launch {
            try {
                if (campo == "pendiente") { val si = !(actual?.pendiente ?: false); MiLista.ponerPendiente(t, si); App.avisar(if (si) "Añadida a Mi lista." else "Quitada de Mi lista.") }
                else { val si = !(actual?.visto ?: false); MiLista.ponerVisto(t, si); App.avisar(if (si) "Marcada como vista." else "Ya no está marcada como vista.") }
                App.versionLista++
            } catch (e: Exception) { App.error(e) }
        }
    }

    Box(Modifier.fillMaxSize().background(C.fondo)) {
        // Imagen de fondo, anclada arriba a la derecha y fundida con el fondo
        Box(Modifier.fillMaxWidth(0.78f).heightIn(max = 470.dp).fillMaxSize().align(Alignment.TopEnd)) {
            Imagen(Tmdb.img(t.fondo, "w1280"), Modifier.fillMaxSize(), descripcion = null, alineacion = Alignment.TopEnd, fundido = true)
            Box(Modifier.fillMaxSize().velo())
            Box(Modifier.fillMaxSize().veloAbajo())
        }
        val estado = rememberLazyListState()
        // En la tele, Compose desplaza la lista para dejar el elemento enfocado a un tercio de la pantalla:
        // en la ficha eso hacía bajar la cabecera y «temblar» al moverse entre botones. Aquí solo se mueve lo justo.
        androidx.compose.runtime.CompositionLocalProvider(androidx.compose.foundation.gestures.LocalBringIntoViewSpec provides SoloLoJusto) {
        LazyColumn(Modifier.fillMaxSize(), state = estado, contentPadding = PaddingValues(bottom = 60.dp)) {
            item(key = "cabecera") { Column {
                Column(Modifier.padding(start = MARGEN.dp, top = 44.dp, end = MARGEN.dp).fillMaxWidth(0.6f)) {
                    val logo = d?.logo
                    if (logo != null) Imagen(Tmdb.img(logo, "w500"), Modifier.heightIn(max = 100.dp).fillMaxWidth(0.75f), ajuste = ContentScale.Fit, descripcion = t.nombre, alineacion = Alignment.CenterStart)
                    else Texto(t.nombre, tam = 38, peso = FontWeight.ExtraBold, titulo = true, color = C.tinta, lineas = 2, alto = 42)
                    Spacer(Modifier.height(14.dp))
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                        if (t.nota > 0) Texto("★ " + String.format("%.1f", t.nota).replace('.', ','), tam = 16, peso = FontWeight.Bold, color = C.ambar)
                        if (t.anio.isNotEmpty()) Texto(t.anio, tam = 16, color = C.tinta)
                        val dd = d
                        if (dd != null) {
                            if (t.esSerie && dd.temporadas.isNotEmpty()) Texto(if (dd.temporadas.size == 1) "1 temporada" else "${dd.temporadas.size} temporadas", tam = 16, color = C.tinta)
                            else if (dd.minutos > 0) Texto(if (dd.minutos >= 60) "${dd.minutos / 60} h ${dd.minutos % 60} min" else "${dd.minutos} min", tam = 16, color = C.tinta)
                            if (dd.edad.isNotEmpty()) Etiqueta(if (dd.edad == "TP") "TP" else "${dd.edad}+", C.tinta, Color.Transparent, C.suave)
                            if (dd.estado == "Ended" && t.esSerie) Etiqueta("Finalizada")
                        }
                    }
                    d?.generos?.takeIf { it.isNotEmpty() }?.let { Spacer(Modifier.height(8.dp)); Texto(it.joinToString("  ·  "), tam = 15, color = C.suave) }
                    // «Para ti»: la nota que le pondrías (el mismo modelo que la web), con el porqué
                    val prev = remember(d, gustoListo) { d?.info?.let { es.cinemood.tv.datos.Gusto.prever(t.tipo, it) } }
                    if (enLista?.visto == true && enLista?.puntuacion != null) {
                        Spacer(Modifier.height(12.dp))
                        Texto("Tu nota  ${enLista!!.puntuacion}", Modifier.background(C.superficie3, RoundedCornerShape(6.dp)).border(1.dp, C.acentoTexto, RoundedCornerShape(6.dp)).padding(horizontal = 10.dp, vertical = 4.dp), tam = 16, peso = FontWeight.Black, color = C.acentoTexto)
                    } else if (prev != null && enLista?.visto != true) {
                        Spacer(Modifier.height(12.dp))
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            val color = if (prev.nota >= 7.5) C.verde else if (prev.nota >= 6) C.ambar else C.acentoTexto
                            Texto("Para ti  ${es.cinemood.tv.datos.Gusto.fmt(prev.nota)}", Modifier.background(C.superficie3, RoundedCornerShape(6.dp)).border(1.dp, color, RoundedCornerShape(6.dp)).padding(horizontal = 10.dp, vertical = 4.dp), tam = 16, peso = FontWeight.Black, color = color)
                            if (prev.motivos.isNotEmpty()) { Spacer(Modifier.width(12.dp)); Texto("Porque " + prev.motivos.joinToString(" y "), tam = 14, color = C.suave, lineas = 1) }
                        }
                    }
                    d?.lema?.takeIf { it.isNotBlank() }?.let { Spacer(Modifier.height(10.dp)); Texto("«$it»", tam = 15, peso = FontWeight.Medium, color = C.acentoTexto, lineas = 1) }
                    if (t.sinopsis.isNotEmpty()) { Spacer(Modifier.height(10.dp)); Texto(t.sinopsis, tam = 16, color = C.tinta.copy(alpha = 0.92f), lineas = 4, alto = 24) }
                    if (error != null && d == null) { Spacer(Modifier.height(10.dp)); Texto(error!!, tam = 15, color = C.acentoTexto) }
                    Spacer(Modifier.height(22.dp))
                }
                Column(Modifier.padding(start = MARGEN.dp, end = MARGEN.dp)) {
                    // Botones (a todo lo ancho, para que quepan todos)
                    // Con el foco en estos botones, la ficha se queda arriba del todo (logo y título siempre a la vista)
                    Row(Modifier.padding(vertical = 8.dp),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        run {
                            val c = contextoVer()
                            val texto = when {
                                t.esSerie && seguir != null -> "Seguir ${c.etiqueta}"
                                t.esSerie -> "Ver ${c.etiqueta}"
                                seguir != null -> "Reanudar"
                                else -> "Reproducir"
                            }
                            Boton(if (d == null) "Cargando…" else texto, { if (d != null) App.reproducirAuto(ctx, c) }, Modifier.focoRecordado("ver", pedirSiNada = true), icono = "▶", principal = true)
                        }
                        run { Boton("Fuentes", { if (d != null) App.fuentes = PanelFuentes(contextoVer(), nas = false) }, Modifier.focoRecordado("fuentes"), icono = "☰") }
                        run {
                            val si = enLista?.pendiente == true
                            Boton(if (si) "En Mi lista" else "Mi lista", { cambiarLista("pendiente") }, Modifier.focoRecordado("lista"), icono = if (si) "✓" else "＋", activo = si)
                        }
                        run {
                            val si = enLista?.visto == true
                            val nota = enLista?.puntuacion
                            // Vista: el botón pasa a ser tu nota y abre la fila para puntuar del 1 al 10
                            if (si) Boton(if (nota != null) "Tu nota $nota" else "Puntuar", { puntuando = !puntuando }, Modifier.focoRecordado("visto"), icono = "★", activo = true)
                            else Boton("Marcar vista", { cambiarLista("visto") }, Modifier.focoRecordado("visto"), icono = "👁")
                        }
                        if (seguir != null && d != null) run {
                            val c = contextoVer().copy(desdeCero = true)
                            Boton("Desde el principio", { App.reproducirAuto(ctx, c) }, Modifier.focoRecordado("inicio"), icono = "⟲")
                        }
                        d?.trailer?.let { k -> run { Boton("Tráiler", { Externo.abrirTrailer(ctx, k) }, Modifier.focoRecordado("trailer"), icono = "🎬") } }
                    }
                    if (puntuando) {
                        val fr = remember { androidx.compose.ui.focus.FocusRequester() }
                        Texto("¿Qué nota le pones?", Modifier.padding(top = 10.dp, bottom = 6.dp), tam = 15, peso = FontWeight.Bold, color = C.tinta)
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                            (1..10).forEach { n ->
                                Chip("$n", enLista?.puntuacion == n, { puntuar(n) }, Modifier.let { m -> if (n == (enLista?.puntuacion ?: 7)) m.focusRequester(fr) else m })
                            }
                            Spacer(Modifier.width(8.dp))
                            if (enLista?.puntuacion != null) Boton("Quitar nota", { puntuar(null) }, pequeno = true)
                            Boton("No la he visto", { puntuando = false; cambiarLista("visto") }, pequeno = true)
                        }
                        LaunchedEffect(Unit) { kotlinx.coroutines.delay(60); runCatching { fr.requestFocus() } }
                    }
                    if (seguir != null && seguir.fraccion > 0) {
                        Spacer(Modifier.height(14.dp))
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(Modifier.width(240.dp)) { BarraProgreso(seguir.fraccion) }
                            Spacer(Modifier.width(12.dp))
                            val queda = ((seguir.durSeg - seguir.posSeg) / 60).coerceAtLeast(1)
                            Texto((if (seguir.temporada != null) "T${seguir.temporada} · E${seguir.episodio} · " else "") + "quedan $queda min", tam = 14, color = C.suave)
                        }
                    }
                    d?.direccion?.takeIf { it.isNotEmpty() }?.let { Spacer(Modifier.height(14.dp)); Texto((if (t.esSerie) "Creada por: " else "Dirección: ") + it, tam = 14, color = C.suave, lineas = 1) }
                }
            } }
            val dd = d
            if (dd != null && t.esSerie && dd.temporadas.isNotEmpty()) {
                item(key = "temporadas") {
                    Column(Modifier.padding(top = 26.dp)) {
                        Texto("Temporadas", Modifier.padding(start = MARGEN.dp, bottom = 10.dp), tam = 20, peso = FontWeight.ExtraBold, titulo = true, color = C.tinta)
                        LazyRow(Modifier, contentPadding = PaddingValues(horizontal = MARGEN.dp, vertical = 6.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            items(dd.temporadas, key = { it.numero }) { s ->
                                Chip("Temporada ${s.numero}", temporada == s.numero, { temporada = s.numero }, Modifier.focoRecordado("temp-${s.numero}"))
                            }
                        }
                    }
                }
                val eps = episodios
                if (eps == null) item(key = "cargando-eps") { Cargando("Cargando capítulos…") }
                else fila("eps-$temporada", "Capítulos de la temporada $temporada" + ((vistos[temporada] ?: emptySet()).size.takeIf { it > 0 }?.let { "  ·  $it de ${eps.size} vistos" } ?: ""), eps, { it.numero }) { e ->
                    val n = temporada ?: 1
                    val pr = progresos[n to e.numero]
                    val visto = e.numero in (vistos[n] ?: emptySet())
                    val c = Contexto(t, n, e.numero, e.nombre)
                    TarjetaApaisada(Tmdb.img(e.imagen, "w300") ?: Tmdb.img(t.fondo, "w300"), "${e.numero}. ${e.nombre}",
                        listOfNotNull(fecha(e.fecha), if (e.minutos > 0) "${e.minutos} min" else null).joinToString(" · ").ifEmpty { e.sinopsis },
                        "ep-$n-${e.numero}", onClick = { App.reproducirAuto(ctx, c) }, ancho = 260.dp,
                        progreso = pr?.fraccion?.takeIf { it > 0 }, etiqueta = if (visto) "✓ Visto" else "",
                        onLongClick = {
                            App.menu = Menu("T$n · E${e.numero} · ${e.nombre}", opciones = listOf(
                                OpcionMenu("Reproducir", "▶") { App.reproducirAuto(ctx, c) },
                                OpcionMenu("Elegir la fuente…", "☰") { App.fuentes = PanelFuentes(c, nas = false) },
                                if (visto) OpcionMenu("Marcar como no visto", "↺") { marcarCapitulos(n, listOf(e.numero), false) }
                                else OpcionMenu("Marcar como visto", "✓") { marcarCapitulos(n, listOf(e.numero), true) },
                                OpcionMenu("Marcar la temporada $n entera como vista", "✓✓") { marcarCapitulos(n, (1..(dd.temporadas.firstOrNull { it.numero == n }?.episodios ?: eps.size)).toList(), true) },
                            ))
                        })
                }
            }
            if (dd != null) {
                fila("reparto", "Reparto", dd.reparto.distinctBy { it.id }, { it.id }) { p ->
                    Surface(
                        onClick = { App.abrir(Pantalla.Categoria("Con ${p.nombre}", listOf("movie", "tv")) { tp, pag -> Catalogo.dePersona(p.id, tp, pag) }) },
                        modifier = Modifier.width(120.dp).focoRecordado("persona-${p.id}"),
                        shape = ClickableSurfaceDefaults.shape(androidx.compose.foundation.shape.RoundedCornerShape(8.dp)),
                        colors = ClickableSurfaceDefaults.colors(containerColor = Color.Transparent, focusedContainerColor = C.superficie2),
                        scale = ClickableSurfaceDefaults.scale(focusedScale = 1.06f),
                    ) {
                        Column(Modifier.padding(8.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                            Box(Modifier.size(88.dp).background(C.superficie2, CircleShape), contentAlignment = Alignment.Center) {
                                if (p.foto == null) Texto(p.nombre.take(1), tam = 28, peso = FontWeight.Bold, color = C.suave)
                                Imagen(Tmdb.img(p.foto, "w185"), Modifier.size(88.dp).clip(CircleShape), descripcion = p.nombre)
                            }
                            Spacer(Modifier.height(8.dp))
                            Texto(p.nombre, tam = 13, peso = FontWeight.Bold, lineas = 2, color = C.tinta)
                            Texto(p.papel, tam = 12, lineas = 1, color = C.suave)
                        }
                    }
                }
                dd.saga?.let { (nombre, partes) ->
                    fila("saga", nombre, partes, { it.clave }) { s ->
                        TarjetaPoster(s, "saga-${s.clave}", { if (s.clave != t.clave) App.ficha(s) }, etiqueta = if (s.clave == t.clave) "Esta" else s.anio, onLongClick = { menuTitulo(s) })
                    }
                }
                fila("similares", "Si te gusta, te gustará", dd.similares, { it.clave }) { s ->
                    TarjetaPoster(s, "sim-${s.clave}", { App.ficha(s) }, onLongClick = { menuTitulo(s) })
                }
            }
        }
        }
    }
}

private fun fecha(f: String): String? {
    if (f.length < 10) return null
    val meses = listOf("ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic")
    val m = f.substring(5, 7).toIntOrNull() ?: return null
    return "${f.substring(8, 10).trimStart('0')} ${meses[m - 1]} ${f.substring(0, 4)}"
}

fun enviarNas(t: Titulo, partes: List<ParteNas>) {
    App.ambito.launch {
        try { App.avisar(Nas.enviar(t, partes)) } catch (e: Exception) { App.error(e) }
    }
}

/** Botón «NAS»: película → que elija el NAS o elegir torrent; serie → serie entera, temporada o capítulos */
fun menuNas(t: Titulo, d: Detalle?, temporada: Int?) {
    if (!t.esSerie) {
        App.menu = Menu("Enviar al NAS", "«${t.nombre}» se descargará en tu NAS. Puedes seguirla en Tú → Mis descargas.", listOf(
            OpcionMenu("Que elija el NAS (en español y buena calidad si lo hay)", "✨") { enviarNas(t, listOf(ParteNas())) },
            OpcionMenu("Elegir yo el torrent…", "☰") { App.fuentes = PanelFuentes(Contexto(t), nas = true) },
        ))
        return
    }
    val n = temporada ?: d?.temporadas?.firstOrNull()?.numero ?: 1
    val total = d?.temporadas?.size ?: 0
    App.menu = Menu("Enviar al NAS", "«${t.nombre}»: elige qué quieres descargar. Para un capítulo suelto, mantén OK sobre él.", listOfNotNull(
        OpcionMenu("Temporada $n completa · que elija el NAS", "✨") { enviarNas(t, listOf(ParteNas(n))) },
        OpcionMenu("Temporada $n · elegir yo el torrent…", "☰") { App.fuentes = PanelFuentes(Contexto(t, n, 1), nas = true, vistaNas = "temporada") },
        if (total > 1) OpcionMenu("Todas las temporadas ($total) · que elija el NAS", "📦") { enviarNas(t, d!!.temporadas.map { ParteNas(it.numero) }) } else null,
        OpcionMenu("Serie completa · elegir un pack…", "☰") { App.fuentes = PanelFuentes(Contexto(t, n, 1), nas = true, vistaNas = "serie") },
    ))
}


/** Desplazamiento mínimo: solo lo necesario para que el elemento enfocado se vea entero */
@OptIn(androidx.compose.foundation.ExperimentalFoundationApi::class)
private object SoloLoJusto : androidx.compose.foundation.gestures.BringIntoViewSpec {
    override fun calculateScrollDistance(offset: Float, size: Float, containerSize: Float): Float {
        val margen = 40f
        val fin = offset + size
        return when {
            offset >= margen && fin <= containerSize - margen -> 0f
            offset < margen -> offset - margen
            else -> minOf(fin - (containerSize - margen), offset - margen)
        }
    }
}
