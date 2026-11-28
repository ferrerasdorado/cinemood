@file:OptIn(ExperimentalTvMaterial3Api::class, ExperimentalComposeUiApi::class)

package es.cinemood.tv.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyListScope
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.ExperimentalComposeUiApi
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusProperties
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.tv.material3.Border
import androidx.tv.material3.ClickableSurfaceDefaults
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.Surface
import androidx.tv.material3.Text
import coil.compose.AsyncImage
import coil.request.ImageRequest
import es.cinemood.tv.R
import es.cinemood.tv.datos.Tmdb
import es.cinemood.tv.datos.Titulo
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.first
import androidx.compose.runtime.snapshotFlow

// CineMood TV · Piezas comunes: botones, chips, tarjetas, filas, campo de texto y barra superior.
// Todo se maneja con las flechas del mando: lo que tiene el foco crece un poco y se marca con un borde claro.

const val MARGEN = 48     // margen lateral (zona segura de la tele)
val LocalPantalla = compositionLocalOf { "" }

/** Recuerda qué tenía el foco en esta pantalla y se lo devuelve al volver con Atrás */
@Composable
fun Modifier.focoRecordado(clave: String, pedirSiNada: Boolean = false): Modifier {
    val pantalla = LocalPantalla.current
    val fr = remember { FocusRequester() }
    val ventana = androidx.compose.ui.platform.LocalWindowInfo.current
    LaunchedEffect(pantalla, clave) {
        val guardado = App.focoGuardado[pantalla]
        if (guardado == clave || (guardado == null && pedirSiNada)) {
            // La tele pone el foco por su cuenta en lo primero que encuentra (la lupa) justo al abrir:
            // se vuelve a pedir un poco después para que gane el elemento que toca
            delay(40); runCatching { fr.requestFocus() }
            // Se espera a que la ventana tenga el foco (en teles lentas tarda más de medio segundo) y se repite
            snapshotFlow { ventana.isWindowFocused }.first { it }
            delay(120); if (App.focoGuardado[pantalla] == null || App.focoGuardado[pantalla] == clave) runCatching { fr.requestFocus() }
        }
    }
    return this.focusRequester(fr).onFocusChanged { if (it.isFocused && App.huboTecla) App.focoGuardado[pantalla] = clave }
}

@Composable
fun Texto(
    texto: String, modifier: Modifier = Modifier, tam: Int = 15, peso: FontWeight = FontWeight.Normal,
    color: Color = Color.Unspecified, lineas: Int = Int.MAX_VALUE, titulo: Boolean = false, alto: Int = 0, centrado: Boolean = false,
) = Text(
    texto, modifier = modifier, fontSize = tam.sp, fontWeight = peso, color = color, maxLines = lineas,
    overflow = TextOverflow.Ellipsis, fontFamily = if (titulo) Cabinet else Satoshi,
    lineHeight = if (alto > 0) alto.sp else androidx.compose.ui.unit.TextUnit.Unspecified,
    textAlign = if (centrado) androidx.compose.ui.text.style.TextAlign.Center else null,
)

@Composable
fun Boton(
    texto: String, onClick: () -> Unit, modifier: Modifier = Modifier, icono: String = "",
    principal: Boolean = false, activo: Boolean = false, onLongClick: (() -> Unit)? = null, pequeno: Boolean = false,
) {
    val forma = RoundedCornerShape(6.dp)
    Surface(
        onClick = onClick, onLongClick = onLongClick, modifier = modifier,
        shape = ClickableSurfaceDefaults.shape(forma),
        colors = ClickableSurfaceDefaults.colors(
            containerColor = if (principal) C.acento else if (activo) C.verdeSuave else C.superficie2.copy(alpha = 0.92f),
            contentColor = if (activo) C.verde else Color.White,
            focusedContainerColor = if (principal) C.acentoClaro else C.tinta,
            focusedContentColor = if (principal) Color.White else C.fondo,
            pressedContainerColor = C.suave,
        ),
        scale = ClickableSurfaceDefaults.scale(focusedScale = 1.05f),
        border = ClickableSurfaceDefaults.border(focusedBorder = Border(BorderStroke(2.dp, Color.White), shape = forma)),
    ) {
        Row(Modifier.padding(horizontal = if (pequeno) 14.dp else 20.dp, vertical = if (pequeno) 8.dp else 11.dp), verticalAlignment = Alignment.CenterVertically) {
            if (icono.isNotEmpty()) { Texto(icono, tam = if (pequeno) 14 else 16); if (texto.isNotEmpty()) Spacer(Modifier.width(8.dp)) }
            if (texto.isNotEmpty()) Texto(texto, tam = if (pequeno) 14 else 16, peso = FontWeight.Bold, lineas = 1)
        }
    }
}

@Composable
fun Chip(texto: String, seleccionado: Boolean, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val forma = RoundedCornerShape(50)
    Surface(
        onClick = onClick, modifier = modifier,
        shape = ClickableSurfaceDefaults.shape(forma),
        colors = ClickableSurfaceDefaults.colors(
            containerColor = if (seleccionado) C.acento else C.superficie2,
            contentColor = if (seleccionado) Color.White else C.suave,
            focusedContainerColor = C.tinta, focusedContentColor = C.fondo,
        ),
        scale = ClickableSurfaceDefaults.scale(focusedScale = 1.06f),
    ) {
        Texto(texto, Modifier.padding(horizontal = 16.dp, vertical = 8.dp), tam = 14, peso = FontWeight.Bold, lineas = 1)
    }
}

@Composable
fun Imagen(url: String?, modifier: Modifier = Modifier, ajuste: ContentScale = ContentScale.Crop, descripcion: String? = null, alineacion: Alignment = Alignment.Center, fundido: Boolean = false) {
    if (url == null) return
    AsyncImage(
        model = ImageRequest.Builder(LocalContext.current).data(url).crossfade(if (fundido) 250 else 0).build(),
        contentDescription = descripcion, contentScale = ajuste, modifier = modifier, alignment = alineacion,
    )
}

/** Tarjeta de cartel (2:3). La clave sirve para recuperar el foco al volver */
@Composable
fun TarjetaPoster(
    t: Titulo, claveFoco: String, onClick: () -> Unit, modifier: Modifier = Modifier, ancho: Dp = 128.dp,
    progreso: Float? = null, etiqueta: String = "", onLongClick: (() -> Unit)? = null, pedirSiNada: Boolean = false,
    conTitulo: Boolean = false,
    cintaSerie: Boolean = true,   // en la pestaña Series sobra   // título y año debajo (buscador y rejillas, donde muchos carteles se parecen)
) {
    val forma = RoundedCornerShape(6.dp)
    Column(modifier.width(ancho)) {
        Surface(
            onClick = onClick, onLongClick = onLongClick,
            modifier = Modifier.fillMaxWidth().aspectRatio(2f / 3f).focoRecordado(claveFoco, pedirSiNada).onFocusChanged { if (it.isFocused) App.precargar(t) },
            shape = ClickableSurfaceDefaults.shape(forma),
            colors = ClickableSurfaceDefaults.colors(containerColor = C.superficie2, focusedContainerColor = C.superficie2),
            scale = ClickableSurfaceDefaults.scale(focusedScale = 1.08f),
            border = ClickableSurfaceDefaults.border(focusedBorder = Border(BorderStroke(3.dp, C.tinta), shape = forma)),
        ) {
            Box(Modifier.fillMaxSize()) {
                if (t.poster == null) Texto(t.nombre, Modifier.align(Alignment.Center).padding(10.dp), tam = 14, peso = FontWeight.Bold, color = C.suave)
                Imagen(Tmdb.img(t.poster, "w342"), Modifier.fillMaxSize(), descripcion = t.nombre)
                // Las series llevan una cinta roja discreta en la esquina; las películas, nada
                if (cintaSerie && t.esSerie && etiqueta.isEmpty()) androidx.tv.material3.Text("SERIE", Modifier.align(Alignment.TopStart).padding(6.dp)
                    .background(C.acento, RoundedCornerShape(3.dp)).padding(horizontal = 5.dp, vertical = 1.dp),
                    fontSize = 10.sp, fontWeight = FontWeight.Black, letterSpacing = 1.5.sp, color = Color.White, fontFamily = Satoshi)
                if (etiqueta.isNotEmpty()) Texto(etiqueta, Modifier.align(Alignment.TopStart).padding(6.dp).background(C.fondo.copy(alpha = 0.85f), RoundedCornerShape(4.dp)).padding(horizontal = 6.dp, vertical = 2.dp), tam = 11, peso = FontWeight.Bold, color = C.tinta)
                if (progreso != null) BarraProgreso(progreso, Modifier.align(Alignment.BottomCenter).padding(8.dp))
            }
        }
        if (conTitulo) {
            Spacer(Modifier.height(8.dp))
            Texto(t.nombre, tam = 14, peso = FontWeight.Bold, lineas = 2, color = C.tinta, alto = 18)
            if (t.anio.isNotEmpty()) Texto(t.anio, tam = 12, lineas = 1, color = C.suave)
        }
    }
}

@Composable
fun BarraProgreso(f: Float, modifier: Modifier = Modifier) {
    Box(modifier.fillMaxWidth().height(4.dp).clip(RoundedCornerShape(2.dp)).background(Color.White.copy(alpha = 0.3f))) {
        Box(Modifier.fillMaxWidth(f.coerceIn(0.02f, 1f)).fillMaxHeight().background(C.acento))
    }
}

/** Tarjeta apaisada (16:9) con imagen y texto debajo: capítulos, «Seguir viendo»… */
@Composable
fun TarjetaApaisada(
    imagen: String?, titulo: String, sub: String, claveFoco: String, onClick: () -> Unit, modifier: Modifier = Modifier,
    ancho: Dp = 250.dp, progreso: Float? = null, onLongClick: (() -> Unit)? = null, etiqueta: String = "", pedirSiNada: Boolean = false,
) {
    val forma = RoundedCornerShape(6.dp)
    Column(modifier.width(ancho)) {
        Surface(
            onClick = onClick, onLongClick = onLongClick,
            modifier = Modifier.fillMaxWidth().aspectRatio(16f / 9f).focoRecordado(claveFoco, pedirSiNada),
            shape = ClickableSurfaceDefaults.shape(forma),
            colors = ClickableSurfaceDefaults.colors(containerColor = C.superficie2, focusedContainerColor = C.superficie2),
            scale = ClickableSurfaceDefaults.scale(focusedScale = 1.06f),
            border = ClickableSurfaceDefaults.border(focusedBorder = Border(BorderStroke(3.dp, C.tinta), shape = forma)),
        ) {
            Box(Modifier.fillMaxSize()) {
                Imagen(imagen, Modifier.fillMaxSize(), descripcion = titulo)
                if (etiqueta.isNotEmpty()) Texto(etiqueta, Modifier.align(Alignment.TopStart).padding(8.dp).background(C.fondo.copy(alpha = 0.85f), RoundedCornerShape(4.dp)).padding(horizontal = 7.dp, vertical = 2.dp), tam = 12, peso = FontWeight.Bold, color = C.tinta)
                if (progreso != null) BarraProgreso(progreso, Modifier.align(Alignment.BottomCenter).padding(10.dp))
            }
        }
        Spacer(Modifier.height(8.dp))
        Texto(titulo, tam = 15, peso = FontWeight.Bold, lineas = 1, color = C.tinta)
        if (sub.isNotEmpty()) Texto(sub, tam = 13, lineas = 2, color = C.suave)
    }
}

/** Fila con título y desplazamiento horizontal. Al volver a ella, el foco vuelve a la última tarjeta */
fun <T> LazyListScope.fila(
    clave: String, titulo: String, elementos: List<T>, claveDe: (T) -> Any,
    alto: Dp? = null, contenido: @Composable (T) -> Unit,
) {
    if (elementos.isEmpty()) return
    item(key = "fila-$clave") {
        Column(Modifier.padding(top = 22.dp)) {
            Texto(titulo, Modifier.padding(start = MARGEN.dp, bottom = 10.dp), tam = 20, peso = FontWeight.ExtraBold, titulo = true, color = C.tinta)
            LazyRow(
                modifier = Modifier.fillMaxWidth().let { if (alto != null) it.height(alto) else it },
                contentPadding = PaddingValues(horizontal = MARGEN.dp, vertical = 6.dp),
                horizontalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                items(elementos, key = claveDe) { contenido(it) }
            }
        }
    }
}

@Composable
fun Cargando(texto: String = "Cargando…", modifier: Modifier = Modifier) {
    Box(modifier.fillMaxWidth().padding(40.dp), contentAlignment = Alignment.Center) {
        Texto(texto, tam = 16, color = C.suave)
    }
}

@Composable
fun Logo(modifier: Modifier = Modifier, tam: Int = 22) {
    Row(modifier, verticalAlignment = Alignment.CenterVertically) {
        Image(painterResource(R.mipmap.ic_launcher), null, Modifier.size((tam * 1.5).dp).clip(RoundedCornerShape(8.dp)))
        Spacer(Modifier.width(10.dp))
        Text("Cine", fontFamily = Cabinet, fontWeight = FontWeight.ExtraBold, fontSize = tam.sp, color = C.tinta)
        Text("Mood", fontFamily = Cabinet, fontWeight = FontWeight.ExtraBold, fontSize = tam.sp, color = C.acentoTexto)
    }
}

/** Barra superior: logo, pestañas y «Tú». Va dentro de la lista de cada pestaña y sube con ella */
@Composable
fun BarraSuperior(actual: Pestana, conMargen: Boolean = true) {
    Row(
        Modifier.fillMaxWidth().padding(start = if (conMargen) MARGEN.dp else 0.dp, end = if (conMargen) MARGEN.dp else 0.dp, top = 22.dp, bottom = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Logo()
        Spacer(Modifier.weight(1f))
        listOf(Pestana.BUSCAR, Pestana.INICIO, Pestana.DESCUBRE, Pestana.SERIES, Pestana.PELICULAS, Pestana.MI_LISTA).forEach { p ->
            PestanaBoton(p, p == actual)
            Spacer(Modifier.width(6.dp))
        }
        Spacer(Modifier.weight(1f))
        val forma = CircleShape
        Surface(
            onClick = { App.irA(Pestana.TU) }, modifier = Modifier.size(40.dp).focoRecordado("tab-TU"),
            shape = ClickableSurfaceDefaults.shape(forma),
            colors = ClickableSurfaceDefaults.colors(containerColor = if (actual == Pestana.TU) C.acentoClaro else C.acento, focusedContainerColor = C.acentoClaro, contentColor = Color.White, focusedContentColor = Color.White),
            border = ClickableSurfaceDefaults.border(focusedBorder = Border(BorderStroke(2.dp, Color.White), shape = forma)),
            scale = ClickableSurfaceDefaults.scale(focusedScale = 1.1f),
        ) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Texto(es.cinemood.tv.datos.Sesion.email.take(1).uppercase().ifEmpty { "T" }, tam = 17, peso = FontWeight.Black)
            }
        }
    }
}

@Composable
private fun PestanaBoton(p: Pestana, seleccionada: Boolean) {
    val forma = RoundedCornerShape(50)
    Surface(
        onClick = { if (!seleccionada) App.irA(p) },
        modifier = Modifier.focoRecordado("tab-${p.name}"),
        shape = ClickableSurfaceDefaults.shape(forma),
        colors = ClickableSurfaceDefaults.colors(
            containerColor = if (seleccionada) C.superficie3 else Color.Transparent,
            contentColor = if (seleccionada) C.tinta else C.suave,
            focusedContainerColor = C.tinta, focusedContentColor = C.fondo,
        ),
        scale = ClickableSurfaceDefaults.scale(focusedScale = 1.06f),
    ) {
        Texto(if (p == Pestana.BUSCAR) "🔍" else p.texto, Modifier.padding(horizontal = 16.dp, vertical = 8.dp), tam = 16, peso = FontWeight.Bold, lineas = 1)
    }
}

/**
 * Campo de texto para el mando: primero se enfoca como un botón; al pulsar OK se abre el teclado de la tele.
 * Así el teclado no salta solo cada vez que el foco pasa por encima.
 */
@Composable
fun CampoTexto(
    valor: String, onCambio: (String) -> Unit, pista: String, modifier: Modifier = Modifier,
    contrasena: Boolean = false, email: Boolean = false, buscar: Boolean = false, onListo: () -> Unit = {},
    frExterno: FocusRequester? = null,
) {
    var editando by remember { mutableStateOf(false) }
    val frCampo = remember { FocusRequester() }
    val frCaja = frExterno ?: remember { FocusRequester() }
    val teclado = LocalSoftwareKeyboardController.current
    val forma = RoundedCornerShape(6.dp)
    Surface(
        onClick = { editando = true },
        modifier = modifier.focusRequester(frCaja),
        shape = ClickableSurfaceDefaults.shape(forma),
        colors = ClickableSurfaceDefaults.colors(containerColor = C.superficie2, focusedContainerColor = C.superficie3, contentColor = C.tinta, focusedContentColor = C.tinta),
        border = ClickableSurfaceDefaults.border(
            border = Border(BorderStroke(1.dp, if (editando) C.acentoTexto else C.linea), shape = forma),
            focusedBorder = Border(BorderStroke(2.dp, C.tinta), shape = forma)),
        scale = ClickableSurfaceDefaults.scale(focusedScale = 1.02f),
    ) {
        Box(Modifier.padding(horizontal = 18.dp, vertical = 14.dp)) {
            if (valor.isEmpty()) Texto(pista, tam = 17, color = C.tenue, lineas = 1)
            BasicTextField(
                value = valor, onValueChange = onCambio, singleLine = true,
                modifier = Modifier.fillMaxWidth().focusRequester(frCampo).focusProperties { canFocus = editando }
                    .onFocusChanged { if (!it.isFocused && editando) editando = false },
                textStyle = TextStyle(color = C.tinta, fontSize = 17.sp, fontFamily = Satoshi, fontWeight = FontWeight.Medium),
                cursorBrush = SolidColor(C.acentoTexto),
                visualTransformation = if (contrasena) PasswordVisualTransformation() else VisualTransformation.None,
                keyboardOptions = KeyboardOptions(
                    keyboardType = if (contrasena) KeyboardType.Password else if (email) KeyboardType.Email else KeyboardType.Text,
                    imeAction = if (buscar) ImeAction.Search else ImeAction.Done, autoCorrectEnabled = false),
                keyboardActions = KeyboardActions(onDone = { editando = false; teclado?.hide(); runCatching { frCaja.requestFocus() }; onListo() },
                    onSearch = { editando = false; teclado?.hide(); runCatching { frCaja.requestFocus() }; onListo() }),
            )
        }
    }
    LaunchedEffect(editando) {
        if (editando) { delay(30); runCatching { frCampo.requestFocus() }; teclado?.show() }
    }
}

/** Degradado del fondo para que el texto se lea sobre las imágenes */
fun Modifier.velo(): Modifier = this.background(Brush.horizontalGradient(0f to C.fondo, 0.45f to C.fondo.copy(alpha = 0.85f), 0.75f to C.fondo.copy(alpha = 0.2f), 1f to Color.Transparent))
fun Modifier.veloAbajo(): Modifier = this.background(Brush.verticalGradient(0.55f to Color.Transparent, 1f to C.fondo))

@Composable
fun Etiqueta(texto: String, color: Color = C.suave, fondo: Color = C.superficie2, borde: Color? = null) {
    Texto(texto, Modifier.background(fondo, RoundedCornerShape(4.dp)).let { if (borde != null) it.border(1.dp, borde, RoundedCornerShape(4.dp)) else it }
        .padding(horizontal = 8.dp, vertical = 3.dp), tam = 13, peso = FontWeight.Bold, color = color, lineas = 1)
}

@Composable
fun CajaCentrada(modifier: Modifier = Modifier, contenido: @Composable BoxScope.() -> Unit) =
    Box(modifier.fillMaxSize(), contentAlignment = Alignment.Center, content = contenido)
