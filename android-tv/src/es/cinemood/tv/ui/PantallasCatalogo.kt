@file:OptIn(ExperimentalTvMaterial3Api::class, ExperimentalComposeUiApi::class)

package es.cinemood.tv.ui

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
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
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyListScope
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.itemsIndexed
import androidx.compose.foundation.lazy.grid.rememberLazyGridState
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.ExperimentalComposeUiApi
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onPreviewKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.tv.material3.Border
import androidx.tv.material3.ClickableSurfaceDefaults
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.Surface
import es.cinemood.tv.datos.Catalogo
import es.cinemood.tv.datos.EnLista
import es.cinemood.tv.datos.MiLista
import es.cinemood.tv.datos.Progreso
import es.cinemood.tv.datos.Tmdb
import es.cinemood.tv.datos.Titulo
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.collect
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.filter
import kotlinx.coroutines.launch

// CineMood TV · Inicio, Series, Películas, Descubre, categorías, Buscar y Mi lista.

private val refrescado = HashMap<String, Long>()

/** Carga varias filas a la vez; si alguna falla, se queda fuera sin estropear las demás */
private suspend fun filas(vararg def: Triple<String, String, suspend () -> List<Titulo>>): List<FilaDatos> = coroutineScope {
    def.map { (k, t, f) -> async { try { FilaDatos(k, t, f().take(20)) } catch (e: Exception) { null } } }.awaitAll().filterNotNull().filter { it.items.isNotEmpty() }
}

private fun mezclar(a: List<Titulo>, b: List<Titulo>) = (0 until maxOf(a.size, b.size)).flatMap { listOfNotNull(a.getOrNull(it), b.getOrNull(it)) }

private suspend fun portadaDe(lista: List<Titulo>) = coroutineScope {
    lista.filter { it.fondo != null }.take(6).map { t -> async { t to Catalogo.logo(t) } }.awaitAll()
}

private val GENEROS_PELI_INICIO = listOf(28, 35, 27, 878, 53, 18, 16, 10749)
private val GENEROS_SERIE_INICIO = listOf(10759, 80, 35, 10765, 18, 16, 9648)

suspend fun cargarPestana(p: Pestana): DatosPestana = when (p) {
    Pestana.SERIES -> DatosPestana(portadaDe(Catalogo.tendencias("tv")), filas(
        Triple("tend", "Tendencias en series", { Catalogo.tendencias("tv") }),
        Triple("pop", "Series populares", { Catalogo.populares("tv") }),
        Triple("emision", "En emisión", { Catalogo.enEmision() }),
        Triple("top", "Las mejor valoradas", { Catalogo.mejorValoradas("tv") }),
        *GENEROS_SERIE_INICIO.map { g -> Triple<String, String, suspend () -> List<Titulo>>("g$g", Catalogo.GENEROS_SERIE[g] ?: "", { Catalogo.genero("tv", g) }) }.toTypedArray()))
    Pestana.PELICULAS -> DatosPestana(portadaDe(Catalogo.tendencias("movie")), filas(
        Triple("tend", "Tendencias en películas", { Catalogo.tendencias("movie") }),
        Triple("cine", "En cines", { Catalogo.estrenos() }),
        Triple("pop", "Películas populares", { Catalogo.populares("movie") }),
        Triple("top", "Las mejor valoradas", { Catalogo.mejorValoradas("movie") }),
        *GENEROS_PELI_INICIO.map { g -> Triple<String, String, suspend () -> List<Titulo>>("g$g", Catalogo.GENEROS_PELI[g] ?: "", { Catalogo.genero("movie", g) }) }.toTypedArray()))
    Pestana.DESCUBRE -> DatosPestana(emptyList(), filas(
        *PLATAFORMAS.map { (id, n) -> Triple<String, String, suspend () -> List<Titulo>>("p$id", "Lo más visto en $n", { mezclar(Catalogo.plataforma("movie", id), Catalogo.plataforma("tv", id)) }) }.toTypedArray(),
        Triple("joyas", "Joyas poco vistas", { mezclar(Catalogo.descubrir("movie", "vote_average.gte=7.4&vote_count.gte=200&vote_count.lte=1500&sort_by=vote_average.desc"),
            Catalogo.descubrir("tv", "vote_average.gte=7.8&vote_count.gte=150&vote_count.lte=1200&sort_by=vote_average.desc")) }),
        Triple("clasicos", "Clásicos imprescindibles", { Catalogo.descubrir("movie", "primary_release_date.lte=1995-12-31&vote_count.gte=3000&sort_by=vote_average.desc") }),
        Triple("es", "Cine español", { Catalogo.descubrir("movie", "with_origin_country=ES&vote_count.gte=100") }),
        Triple("anime", "Anime", { Catalogo.descubrir("tv", "with_genres=16&with_original_language=ja&vote_count.gte=200") })))
    else -> DatosPestana(Catalogo.portada(), filas(
        Triple("tend", "Tendencias de la semana", { Catalogo.tendencias("all") }),
        Triple("cine", "En cines", { Catalogo.estrenos() }),
        Triple("pelis", "Películas populares", { Catalogo.populares("movie") }),
        Triple("series", "Series populares", { Catalogo.populares("tv") }),
        Triple("emision", "Series en emisión", { Catalogo.enEmision() }),
        Triple("top", "Las mejor valoradas", { mezclar(Catalogo.mejorValoradas("movie"), Catalogo.mejorValoradas("tv")) })))
}

val PLATAFORMAS = listOf(8 to "Netflix", 119 to "Prime Video", 337 to "Disney+", 1899 to "Max", 350 to "Apple TV+", 149 to "Movistar Plus+", 63 to "Filmin", 1773 to "SkyShowtime")

/** Menú al mantener OK sobre un cartel */
fun menuTitulo(t: Titulo) {
    App.menu = Menu(t.nombre, opciones = listOf(
        OpcionMenu("Abrir la ficha", "ℹ️") { App.ficha(t) },
        OpcionMenu("Añadir a Mi lista", "＋") { App.ambito.launch { try { MiLista.ponerPendiente(t, true); App.versionLista++; App.avisar("«${t.nombre}» está en Mi lista.") } catch (e: Exception) { App.error(e) } } },
        OpcionMenu("Marcar como vista", "✓") { App.ambito.launch { try { MiLista.ponerVisto(t, true); App.versionLista++; App.avisar("Marcada como vista.") } catch (e: Exception) { App.error(e) } } },
    ))
}

@Composable
fun PantallaPestana(p: Pestana) {
    val clave = "pestana-${p.name}"
    var datos by remember { mutableStateOf(CacheDisco.leer(clave)) }
    var error by remember { mutableStateOf<String?>(null) }
    val ctx = LocalContext.current
    LaunchedEffect(p) {
        if (datos != null && System.currentTimeMillis() - (refrescado[clave] ?: 0) < 10 * 60_000) return@LaunchedEffect
        try { val d = cargarPestana(p); datos = d; CacheDisco.guardar(clave, d); refrescado[clave] = System.currentTimeMillis(); error = null }
        catch (e: Exception) { if (datos == null) error = e.message }
    }
    // Lo personal no se guarda en disco: Seguir viendo (de esta tele) y Mi lista
    val seguir = remember(App.versionLista) { if (p == Pestana.INICIO) Progreso.lista(ctx) else emptyList() }
    var pendientes by remember { mutableStateOf<List<Titulo>>(emptyList()) }
    LaunchedEffect(p, App.versionLista) {
        if (p == Pestana.INICIO) pendientes = try { MiLista.cargar().filter { it.pendiente && !it.visto }.map { it.t }.take(30) } catch (e: Exception) { emptyList() }
    }
    val estadoLista = rememberLazyListState()
    LazyColumn(Modifier.fillMaxSize(), state = estadoLista, contentPadding = PaddingValues(bottom = 60.dp)) {
        item(key = "barra") { BarraSuperior(p) }
        val d = datos
        if (d == null) {
            item(key = "cargando") { if (error != null) Cargando(error!!) else Cargando() }
            return@LazyColumn
        }
        if (d.portada.isNotEmpty()) item(key = "portada") { Portada(d.portada) }
        if (p == Pestana.DESCUBRE) item(key = "plataformas") { FilaPlataformas() }
        if (p == Pestana.INICIO) {
            fila("seguir", "Seguir viendo", seguir, { it.t.clave }) { pr ->
                TarjetaApaisada(Tmdb.img(pr.t.fondo, "w780") ?: Tmdb.img(pr.t.poster, "w500"), pr.t.nombre,
                    if (pr.temporada != null) "T${pr.temporada} · E${pr.episodio}" else "Película", "seguir-${pr.t.clave}",
                    onClick = { App.ficha(pr.t) }, ancho = 240.dp, progreso = pr.fraccion,
                    onLongClick = { App.menu = Menu(pr.t.nombre, opciones = listOf(OpcionMenu("Quitar de «Seguir viendo»", "✕") { Progreso.quitar(ctx, pr); App.versionLista++ })) })
            }
            fila("milista", "Mi lista", pendientes, { it.clave }) { t ->
                TarjetaPoster(t, "milista-${t.clave}", { App.ficha(t) }, onLongClick = { menuTitulo(t) })
            }
            item(key = "animos") { FilaAnimos() }
        }
        d.filas.forEach { f ->
            fila(f.clave, f.titulo, f.items, { it.clave }) { t ->
                TarjetaPoster(t, "${f.clave}-${t.clave}", { App.ficha(t) }, onLongClick = { menuTitulo(t) },
                    pedirSiNada = d.portada.isEmpty() && p != Pestana.DESCUBRE && f == d.filas.first() && t == f.items.first())
            }
        }
        if (p == Pestana.SERIES || p == Pestana.PELICULAS) item(key = "generos") { FilaGeneros(if (p == Pestana.SERIES) "tv" else "movie") }
        if (p == Pestana.INICIO) item(key = "tmdb") { Texto("Datos de películas y series: TMDB", Modifier.padding(start = MARGEN.dp, top = 30.dp), tam = 12, color = C.tenue) }
    }
}

/** Portada grande de arriba: va cambiando sola; con ← y → se pasa a mano; OK abre la ficha */
@Composable
fun Portada(lista: List<Pair<Titulo, String?>>) {
    var i by remember { mutableIntStateOf(0) }
    var enfocada by remember { mutableStateOf(false) }
    LaunchedEffect(i, lista.size) { delay(9000); if (lista.isNotEmpty()) i = (i + 1) % lista.size }
    val (t, logo) = lista[i.coerceIn(0, lista.lastIndex)]
    val forma = RoundedCornerShape(10.dp)
    Surface(
        onClick = { App.ficha(t) },
        modifier = Modifier.padding(horizontal = MARGEN.dp).padding(top = 6.dp).fillMaxWidth().height(310.dp)
            .focoRecordado("portada", pedirSiNada = true)
            .onFocusChanged { enfocada = it.isFocused }
            .onPreviewKeyEvent { e ->
                if (e.type != KeyEventType.KeyDown) return@onPreviewKeyEvent false
                when (e.key) {
                    Key.DirectionRight -> { i = (i + 1) % lista.size; true }
                    Key.DirectionLeft -> { i = (i - 1 + lista.size) % lista.size; true }
                    else -> false
                }
            },
        shape = ClickableSurfaceDefaults.shape(forma),
        colors = ClickableSurfaceDefaults.colors(containerColor = C.superficie, focusedContainerColor = C.superficie),
        scale = ClickableSurfaceDefaults.scale(focusedScale = 1.01f),
        border = ClickableSurfaceDefaults.border(focusedBorder = Border(BorderStroke(3.dp, C.tinta), shape = forma)),
    ) {
        AnimatedContent(targetState = t to logo, transitionSpec = { fadeIn(tween(500)) togetherWith fadeOut(tween(500)) }, label = "portada") { (x, lg) ->
            Box(Modifier.fillMaxSize()) {
                Imagen(Tmdb.img(x.fondo, "w1280"), Modifier.fillMaxSize(), descripcion = x.nombre, alineacion = Alignment.TopCenter, fundido = true)
                Box(Modifier.fillMaxSize().velo())
                Column(Modifier.align(Alignment.BottomStart).padding(28.dp).fillMaxWidth(0.55f)) {
                    if (lg != null) Imagen(Tmdb.img(lg, "w500"), Modifier.heightIn(max = 90.dp).fillMaxWidth(0.8f), ajuste = ContentScale.Fit, descripcion = x.nombre, alineacion = Alignment.BottomStart)
                    else Texto(x.nombre, tam = 34, peso = FontWeight.ExtraBold, titulo = true, color = C.tinta, lineas = 2)
                    Spacer(Modifier.height(12.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        val gen = x.generos.firstNotNullOfOrNull { (if (x.esSerie) Catalogo.GENEROS_SERIE else Catalogo.GENEROS_PELI)[it] }
                        Texto(listOfNotNull(if (x.esSerie) "Serie" else "Película", gen, x.anio.ifEmpty { null }).joinToString("  ·  "), tam = 15, peso = FontWeight.Bold, color = C.tinta)
                        if (x.nota > 0) { Spacer(Modifier.width(12.dp)); Texto("★ " + String.format("%.1f", x.nota).replace('.', ','), tam = 15, peso = FontWeight.Bold, color = C.ambar) }
                    }
                    if (x.sinopsis.isNotEmpty()) { Spacer(Modifier.height(8.dp)); Texto(x.sinopsis, tam = 14, color = C.suave, lineas = 2, alto = 20) }
                }
                Row(Modifier.align(Alignment.BottomEnd).padding(24.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    lista.indices.forEach { k -> Box(Modifier.size(if (k == i) 18.dp else 7.dp, 7.dp).background(if (k == i) C.tinta else C.tinta.copy(alpha = 0.4f), CircleShape)) }
                }
                if (enfocada) Texto("◀ ▶ para cambiar", Modifier.align(Alignment.TopEnd).padding(16.dp), tam = 12, color = C.tinta.copy(alpha = 0.7f))
            }
        }
    }
}

@Composable
private fun FilaChips(titulo: String, contenido: LazyListScope.() -> Unit) {
    Column(Modifier.padding(top = 22.dp)) {
        Texto(titulo, Modifier.padding(start = MARGEN.dp, bottom = 10.dp), tam = 20, peso = FontWeight.ExtraBold, titulo = true, color = C.tinta)
        LazyRow(Modifier.fillMaxWidth(), contentPadding = PaddingValues(horizontal = MARGEN.dp, vertical = 6.dp), horizontalArrangement = Arrangement.spacedBy(10.dp), content = contenido)
    }
}

@Composable
fun FilaAnimos() = FilaChips("¿Cómo te sientes hoy?") {
    items(Catalogo.ANIMOS, key = { it.clave }) { a ->
        Boton("${a.nombre}", icono = a.emoji, modifier = Modifier.focoRecordado("animo-${a.clave}"), onClick = {
            App.abrir(Pantalla.Categoria("Para cuando estás ${a.nombre.lowercase()}", listOf("movie", "tv")) { tipo, pag -> Catalogo.animo(a, tipo, pag) })
        })
    }
}

@Composable
fun FilaGeneros(tipo: String) = FilaChips("Todos los géneros") {
    val g = if (tipo == "tv") Catalogo.GENEROS_SERIE else Catalogo.GENEROS_PELI
    items(g.entries.toList(), key = { it.key }) { (id, n) ->
        Boton(n, modifier = Modifier.focoRecordado("gen-$id"), onClick = {
            App.abrir(Pantalla.Categoria(n, listOf(tipo)) { tp, pag -> Catalogo.genero(tp, id, pag) })
        })
    }
}

@Composable
fun FilaPlataformas() = FilaChips("Por plataforma") {
    items(PLATAFORMAS, key = { it.first }) { (id, n) ->
        Boton(n, modifier = Modifier.focoRecordado("plat-$id", pedirSiNada = id == PLATAFORMAS.first().first), onClick = {
            App.abrir(Pantalla.Categoria("En $n", listOf("movie", "tv")) { tp, pag -> Catalogo.plataforma(tp, id, pag) })
        })
    }
    item(key = "animos") { Spacer(Modifier.width(20.dp)) }
    items(Catalogo.ANIMOS, key = { "a" + it.clave }) { a ->
        Boton(a.nombre, icono = a.emoji, modifier = Modifier.focoRecordado("danimo-${a.clave}"), onClick = {
            App.abrir(Pantalla.Categoria("Para cuando estás ${a.nombre.lowercase()}", listOf("movie", "tv")) { tipo, pag -> Catalogo.animo(a, tipo, pag) })
        })
    }
}

/** Rejilla de carteles con carga por páginas al llegar al final */
@Composable
fun Rejilla(
    items: List<Titulo>, prefijo: String, modifier: Modifier = Modifier, alFinal: (() -> Unit)? = null,
    cabecera: (@Composable () -> Unit)? = null, etiqueta: (Titulo) -> String = { "" }, pedirPrimero: Boolean = true,
) {
    val estado = rememberLazyGridState()
    if (alFinal != null) LaunchedEffect(estado, items.size) {
        snapshotFlow { estado.layoutInfo.visibleItemsInfo.lastOrNull()?.index ?: 0 }
            .distinctUntilChanged().filter { it >= items.size - 8 }.collect { alFinal() }
    }
    LazyVerticalGrid(
        columns = GridCells.Adaptive(132.dp), state = estado, modifier = modifier.fillMaxSize(),
        contentPadding = PaddingValues(start = MARGEN.dp, end = MARGEN.dp, bottom = 50.dp, top = 6.dp),
        horizontalArrangement = Arrangement.spacedBy(18.dp), verticalArrangement = Arrangement.spacedBy(20.dp),
    ) {
        if (cabecera != null) item(span = { androidx.compose.foundation.lazy.grid.GridItemSpan(maxLineSpan) }, key = "cab") { cabecera() }
        itemsIndexed(items, key = { _, t -> t.clave }) { idx, t ->
            TarjetaPoster(t, "$prefijo-${t.clave}", { App.ficha(t) }, ancho = 132.dp, onLongClick = { menuTitulo(t) }, etiqueta = etiqueta(t), pedirSiNada = pedirPrimero && idx == 0)
        }
    }
}

@Composable
fun PantallaCategoria(c: Pantalla.Categoria) {
    var tipo by remember { mutableStateOf(c.tipos.first()) }
    val items = remember(tipo) { mutableStateListOf<Titulo>() }
    var pagina by remember(tipo) { mutableIntStateOf(0) }
    var cargando by remember(tipo) { mutableStateOf(false) }
    var fin by remember(tipo) { mutableStateOf(false) }
    val ambito = androidx.compose.runtime.rememberCoroutineScope()
    fun mas() {
        if (cargando || fin || pagina >= 15) return
        cargando = true
        ambito.launch {
            try { val n = c.cargar(tipo, pagina + 1); pagina++; val vistos = items.map { it.clave }.toSet(); items.addAll(n.filter { it.clave !in vistos }); if (n.isEmpty()) fin = true }
            catch (e: Exception) { App.error(e); fin = true }
            cargando = false
        }
    }
    LaunchedEffect(tipo) { mas() }
    Column(Modifier.fillMaxSize()) {
        Row(Modifier.padding(start = MARGEN.dp, end = MARGEN.dp, top = 28.dp, bottom = 14.dp), verticalAlignment = Alignment.CenterVertically) {
            Texto(c.titulo, tam = 28, peso = FontWeight.ExtraBold, titulo = true, color = C.tinta)
            Spacer(Modifier.weight(1f))
            if (c.tipos.size > 1) c.tipos.forEach { tp ->
                Chip(if (tp == "tv") "Series" else "Películas", tipo == tp, { tipo = tp }, Modifier.padding(start = 8.dp).focoRecordado("tipo-$tp"))
            }
        }
        if (items.isEmpty()) Cargando(if (fin) "No hay nada por aquí." else "Cargando…")
        else Rejilla(items, "cat-$tipo", alFinal = { mas() })
    }
}

@Composable
fun PantallaBuscar() {
    var texto by remember { mutableStateOf(App.ultimaBusqueda) }
    var resultados by remember { mutableStateOf<List<Titulo>>(emptyList()) }
    var sugerencias by remember { mutableStateOf<List<Titulo>>(emptyList()) }
    var buscando by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { sugerencias = try { Catalogo.tendencias("all") } catch (e: Exception) { emptyList() } }
    LaunchedEffect(texto) {
        App.ultimaBusqueda = texto
        if (texto.isBlank()) { resultados = emptyList(); return@LaunchedEffect }
        delay(450)
        buscando = true
        resultados = try { Catalogo.buscar(texto) } catch (e: Exception) { App.error(e); emptyList() }
        buscando = false
    }
    val lista = if (texto.isBlank()) sugerencias else resultados
    Rejilla(lista, "buscar", pedirPrimero = false, cabecera = {
        Column {
            BarraSuperior(Pestana.BUSCAR, conMargen = false)
            CampoTexto(texto, { texto = it }, "Busca una película, una serie…", Modifier.fillMaxWidth().padding(top = 14.dp).focoRecordado("campo", pedirSiNada = true), buscar = true)
            Texto(when {
                texto.isBlank() -> "Tendencias de la semana"
                buscando -> "Buscando…"
                resultados.isEmpty() -> "Sin resultados para «$texto»."
                else -> "${resultados.size} resultados"
            }, Modifier.padding(top = 18.dp, bottom = 4.dp), tam = 18, peso = FontWeight.ExtraBold, titulo = true, color = C.tinta)
        }
    })
}

@Composable
fun PantallaMiLista() {
    var todo by remember { mutableStateOf<List<EnLista>?>(App.cacheLista) }
    var filtro by remember { mutableStateOf("pendientes") }
    LaunchedEffect(App.versionLista) {
        try { todo = MiLista.cargar(); App.cacheLista = todo } catch (e: Exception) { App.error(e); if (todo == null) todo = emptyList() }
    }
    val l = todo
    val visibles = when (filtro) {
        "pendientes" -> l?.filter { it.pendiente && !it.visto }
        "vistas" -> l?.filter { it.visto }
        "series" -> l?.filter { it.t.esSerie }
        else -> l
    }?.map { it.t } ?: emptyList()
    Rejilla(visibles, "lista-$filtro", pedirPrimero = false, etiqueta = { t -> l?.firstOrNull { it.t.clave == t.clave }?.puntuacion?.let { "★ $it" } ?: "" }, cabecera = {
        Column {
            BarraSuperior(Pestana.MI_LISTA, conMargen = false)
            Row(Modifier.padding(top = 14.dp, bottom = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                Texto("Mi lista", tam = 28, peso = FontWeight.ExtraBold, titulo = true, color = C.tinta)
                Spacer(Modifier.width(24.dp))
                listOf("pendientes" to "Pendientes", "vistas" to "Vistas", "series" to "Series", "todo" to "Todo").forEach { (k, n) ->
                    Chip(n, filtro == k, { filtro = k }, Modifier.padding(end = 8.dp).focoRecordado("filtro-$k", pedirSiNada = k == "pendientes"))
                }
            }
            Texto(when {
                l == null -> "Cargando…"
                visibles.isEmpty() -> "Aquí no hay nada todavía. Añade títulos desde su ficha con «＋ Mi lista»."
                else -> "${visibles.size} títulos · sincronizada con la web y el móvil"
            }, Modifier.padding(bottom = 6.dp), tam = 14, color = C.suave)
        }
    })
}
