@file:OptIn(ExperimentalTvMaterial3Api::class, ExperimentalComposeUiApi::class)

package es.cinemood.tv.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
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
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
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
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.tv.material3.Border
import androidx.tv.material3.ClickableSurfaceDefaults
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.Surface
import es.cinemood.tv.datos.Addon
import es.cinemood.tv.datos.Descarga
import es.cinemood.tv.datos.Fuentes
import es.cinemood.tv.datos.Nas
import es.cinemood.tv.datos.Sesion
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

// CineMood TV · «Tú»: tu cuenta, tus addons, Mis descargas del NAS e iniciar sesión.

@Composable
fun PantallaTu(alSalir: () -> Unit) {
    var addons by remember { mutableStateOf<List<Addon>?>(null) }
    var descargas by remember { mutableStateOf<List<Descarga>?>(null) }
    LaunchedEffect(Unit) {
        addons = try { Fuentes.addons(forzar = true) } catch (e: Exception) { emptyList() }
        descargas = try { Nas.misDescargas() } catch (e: Exception) { emptyList() }
    }
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(bottom = 60.dp)) {
        item { BarraSuperior(Pestana.TU) }
        item {
            Column(Modifier.padding(horizontal = MARGEN.dp, vertical = 10.dp)) {
                Texto("Tú", tam = 30, peso = FontWeight.ExtraBold, titulo = true, color = C.tinta)
                Texto("Sesión iniciada como ${Sesion.email}", tam = 15, color = C.suave)
                Spacer(Modifier.height(18.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    val enCurso = descargas?.count { it.enMarcha } ?: 0
                    Boton("Mis descargas" + if (enCurso > 0) " ($enCurso en curso)" else "", { App.abrir(Pantalla.Descargas()) }, Modifier.focoRecordado("descargas", pedirSiNada = true), icono = "⬇", principal = true)
                    Boton("Cerrar sesión", {
                        App.menu = Menu("¿Cerrar sesión?", "Tendrás que volver a escribir tu email y contraseña en la tele.", listOf(OpcionMenu("Cerrar sesión", "↩", peligro = true) { alSalir() }))
                    }, Modifier.focoRecordado("salir"), icono = "↩")
                }
            }
        }
        item {
            Seccion("Mis addons") {
                val l = addons
                when {
                    l == null -> Texto("Cargando…", tam = 15, color = C.suave)
                    l.isEmpty() -> Texto("No tienes addons guardados en tu cuenta. Añádelos en la web (Tú → Mis addons) y aparecerán aquí solos.", tam = 15, color = C.suave)
                    else -> {
                        Texto("Los mismos de la web y el móvil, sincronizados con tu cuenta.", tam = 14, color = C.suave)
                        Spacer(Modifier.height(10.dp))
                        l.forEach { a ->
                            val res = a.recursos.map { it.nombre }.distinct().joinToString(", ") { when (it) { "stream" -> "fuentes"; "subtitles" -> "subtítulos"; "catalog" -> "catálogo"; else -> it } }
                            Row(Modifier.padding(vertical = 5.dp), verticalAlignment = Alignment.CenterVertically) {
                                Texto("●", tam = 12, color = C.verde); Spacer(Modifier.width(10.dp))
                                Texto(a.nombre, tam = 16, peso = FontWeight.Bold, color = C.tinta); Spacer(Modifier.width(10.dp))
                                Texto(res, tam = 14, color = C.suave)
                            }
                        }
                    }
                }
            }
        }
        item {
            Seccion("Acerca de CineMood TV") {
                Texto("Versión 3.0 · app nativa para Android TV (Kotlin, Jetpack Compose y Media3).", tam = 14, color = C.suave)
                Texto("Usa tu misma cuenta, lista, addons y NAS que la web y el móvil.", tam = 14, color = C.suave)
                Texto("Datos de películas y series: TMDB. Este producto usa la API de TMDB, pero no está respaldado ni certificado por TMDB.", tam = 13, color = C.tenue)
            }
        }
    }
}

@Composable
private fun Seccion(titulo: String, contenido: @Composable () -> Unit) {
    Column(Modifier.padding(horizontal = MARGEN.dp, vertical = 12.dp).fillMaxWidth().background(C.superficie, RoundedCornerShape(10.dp)).border(1.dp, C.linea, RoundedCornerShape(10.dp)).padding(22.dp)) {
        Texto(titulo, tam = 20, peso = FontWeight.ExtraBold, titulo = true, color = C.tinta)
        Spacer(Modifier.height(10.dp))
        contenido()
    }
}

@Composable
fun PantallaDescargas() {
    var lista by remember { mutableStateOf<List<Descarga>?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var version by remember { mutableStateOf(0) }
    val ambito = rememberCoroutineScope()
    // Se actualiza sola cada 15 s mientras haya algo en marcha
    LaunchedEffect(version) {
        while (isActive) {
            try { lista = Nas.misDescargas(); error = null } catch (e: Exception) { error = e.message; if (lista == null) lista = emptyList() }
            if (lista?.any { it.enMarcha } != true) break
            delay(15_000)
        }
    }
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(start = MARGEN.dp, end = MARGEN.dp, top = 30.dp, bottom = 60.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        item {
            Column(Modifier.padding(bottom = 8.dp)) {
                Texto("Mis descargas", tam = 30, peso = FontWeight.ExtraBold, titulo = true, color = C.tinta)
                val l = lista
                Texto(when {
                    error != null -> error!!
                    l == null -> "Cargando…"
                    l.isEmpty() -> "Todavía no has enviado nada al NAS. En una ficha, pulsa «NAS»."
                    else -> "${l.count { it.enMarcha }} en curso · ${l.count { it.estado == "completada" }} completadas · se actualiza sola"
                }, tam = 15, color = if (error != null) C.acentoTexto else C.suave)
            }
        }
        items(lista ?: emptyList(), key = { it.id }) { d ->
            val forma = RoundedCornerShape(8.dp)
            Surface(
                onClick = {
                    App.menu = Menu(d.titulo + if (d.que.isNotEmpty()) " · ${d.que}" else "", listOfNotNull(d.estadoTexto, d.fuente.ifEmpty { null }, d.error.ifEmpty { null }).joinToString("\n"), listOfNotNull(
                        if (d.enMarcha) OpcionMenu("Cancelar la descarga", "✕", peligro = true) { ambito.launch { try { Nas.cancelar(d); App.avisar("Cancelando… el NAS la parará en unos segundos."); version++ } catch (e: Exception) { App.error(e) } } } else null,
                        if (!d.enMarcha) OpcionMenu("Quitar de la lista", "🗑") { ambito.launch { try { Nas.quitar(d); App.avisar("Quitada de la lista. Lo descargado sigue en el NAS."); version++ } catch (e: Exception) { App.error(e) } } } else null,
                    ))
                },
                modifier = Modifier.fillMaxWidth().focoRecordado("d-${d.id}", pedirSiNada = d == lista?.firstOrNull()),
                shape = ClickableSurfaceDefaults.shape(forma),
                colors = ClickableSurfaceDefaults.colors(containerColor = C.superficie, focusedContainerColor = C.superficie3, contentColor = C.tinta, focusedContentColor = C.tinta),
                border = ClickableSurfaceDefaults.border(border = Border(BorderStroke(1.dp, C.linea), shape = forma), focusedBorder = Border(BorderStroke(2.dp, C.tinta), shape = forma)),
                scale = ClickableSurfaceDefaults.scale(focusedScale = 1.01f),
            ) {
                Column(Modifier.padding(horizontal = 20.dp, vertical = 14.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Texto(d.titulo, tam = 17, peso = FontWeight.Bold, color = C.tinta, lineas = 1)
                        if (d.que.isNotEmpty()) { Spacer(Modifier.width(10.dp)); Texto(d.que, tam = 15, color = C.suave) }
                        Spacer(Modifier.weight(1f))
                        val (col, fon) = when (d.estado) { "completada" -> C.verde to C.verdeSuave; "error", "sin_fuentes", "cancelada" -> C.acentoTexto to C.acentoSuave; else -> C.ambar to C.superficie3 }
                        Etiqueta(d.estadoTexto, col, fon)
                    }
                    if (d.estado == "descargando" && d.progreso != null) {
                        Spacer(Modifier.height(10.dp))
                        val pct = d.progreso.coerceIn(0.0, 100.0)
                        BarraProgreso((pct / 100).toFloat())
                        Spacer(Modifier.height(6.dp))
                        Texto(listOfNotNull(String.format("%.1f %%", pct).replace('.', ','),
                            if (d.tamano > 0) Fuentes.bytes((d.tamano * pct / 100).toLong()) + " de " + Fuentes.bytes(d.tamano) else null,
                            if (d.velocidad > 0) Fuentes.bytes(d.velocidad) + "/s" else "esperando velocidad",
                            if (d.eta in 1..8_640_000) "quedan " + (if (d.eta >= 3600) "${d.eta / 3600} h ${d.eta % 3600 / 60} min" else "${(d.eta / 60).coerceAtLeast(1)} min") else null).joinToString(" · "), tam = 13, color = C.suave)
                    }
                    if (d.error.isNotEmpty() && !d.enMarcha) { Spacer(Modifier.height(6.dp)); Texto(d.error, tam = 13, color = C.acentoTexto, lineas = 2) }
                }
            }
        }
    }
}

@Composable
fun PantallaEntrar(alEntrar: () -> Unit) {
    var email by remember { mutableStateOf("") }
    var clave by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    var entrando by remember { mutableStateOf(false) }
    val ambito = rememberCoroutineScope()
    val frClave = remember { FocusRequester() }
    val frBoton = remember { FocusRequester() }
    fun entrar() {
        if (entrando) return
        if (email.isBlank() || clave.isEmpty()) { error = "Escribe tu email y tu contraseña."; return }
        entrando = true; error = null
        ambito.launch {
            try { Sesion.entrar(email, clave); alEntrar() } catch (e: Exception) { error = e.message }
            entrando = false
        }
    }
    CajaCentrada(Modifier.background(C.fondo)) {
        Column(Modifier.widthIn(max = 520.dp).fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
            Logo(tam = 34)
            Spacer(Modifier.height(14.dp))
            Texto("Qué ver según tu estado de ánimo", tam = 17, color = C.suave)
            Spacer(Modifier.height(30.dp))
            Texto("Inicia sesión con tu cuenta de CineMood", tam = 18, peso = FontWeight.Bold, color = C.tinta)
            Spacer(Modifier.height(14.dp))
            CampoTexto(email, { email = it }, "Email", Modifier.fillMaxWidth().focoRecordado("email", pedirSiNada = true), email = true, onListo = { runCatching { frClave.requestFocus() } })
            Spacer(Modifier.height(12.dp))
            CampoTexto(clave, { clave = it }, "Contraseña", Modifier.fillMaxWidth(), contrasena = true, frExterno = frClave, onListo = { runCatching { frBoton.requestFocus() } })
            Spacer(Modifier.height(18.dp))
            Boton(if (entrando) "Entrando…" else "Entrar", { entrar() }, Modifier.fillMaxWidth().focusRequester(frBoton), principal = true)
            if (error != null) { Spacer(Modifier.height(14.dp)); Texto(error!!, tam = 15, color = C.acentoTexto) }
            Spacer(Modifier.height(24.dp))
            Texto("Solo la primera vez: después la tele recuerda la sesión.", tam = 13, color = C.tenue)
        }
    }
}
