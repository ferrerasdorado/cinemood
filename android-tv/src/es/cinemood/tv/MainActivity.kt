package es.cinemood.tv

import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveableStateHolder
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.input.key.onPreviewKeyEvent
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.type
import androidx.compose.ui.platform.LocalContext
import coil.Coil
import kotlinx.coroutines.launch
import coil.ImageLoader
import coil.disk.DiskCache
import coil.memory.MemoryCache
import es.cinemood.tv.datos.Red
import es.cinemood.tv.datos.Sesion
import es.cinemood.tv.ui.App
import es.cinemood.tv.ui.AvisoUI
import es.cinemood.tv.ui.C
import es.cinemood.tv.ui.CacheDisco
import es.cinemood.tv.ui.LocalPantalla
import es.cinemood.tv.ui.MenuUI
import es.cinemood.tv.ui.PanelFuentesUI
import es.cinemood.tv.ui.Pantalla
import es.cinemood.tv.ui.PantallaBuscar
import es.cinemood.tv.ui.PantallaCategoria
import es.cinemood.tv.ui.PantallaDescargas
import es.cinemood.tv.ui.PantallaEntrar
import es.cinemood.tv.ui.PantallaFicha
import es.cinemood.tv.ui.PantallaMiLista
import es.cinemood.tv.ui.PantallaPestana
import es.cinemood.tv.ui.PantallaTu
import es.cinemood.tv.ui.Pestana
import es.cinemood.tv.ui.TemaCineMood

// CineMood para Android TV · app nativa.
// Antes la tele cargaba la web entera en un navegador interno (lento en aparatos modestos);
// ahora cada pantalla es nativa y solo se descargan los datos.
class MainActivity : ComponentActivity() {
    override fun onCreate(estado: Bundle?) {
        super.onCreate(estado)
        Red.iniciar(applicationContext)
        CacheDisco.iniciar(applicationContext)
        // Imágenes: caché en memoria y en disco, con la misma conexión que el resto de la app
        Coil.setImageLoader(
            ImageLoader.Builder(applicationContext)
                .okHttpClient(Red.cliente)
                .memoryCache { MemoryCache.Builder(applicationContext).maxSizePercent(0.25).build() }
                .diskCache { DiskCache.Builder().directory(cacheDir.resolve("imagenes")).maxSizeBytes(250L * 1024 * 1024).build() }
                .respectCacheHeaders(false)
                .allowRgb565(true)       // la mitad de memoria por imagen: va mejor en teles con poca RAM
                .crossfade(false)
                .build()
        )
        setContent { TemaCineMood { Raiz() } }
    }
}

@Composable
private fun Raiz() {
    var conSesion by remember { mutableStateOf(Sesion.iniciada) }
    val ctx = LocalContext.current
    var ultimoAtras by remember { mutableStateOf(0L) }
    remember { Sesion.alCaducar = { App.ambito.launch { conSesion = false; App.fuentes = null; App.menu = null } }; 0 }
    fun atras() {
        if (App.atras()) return
        val ahora = System.currentTimeMillis()
        if (ahora - ultimoAtras < 2200) (ctx as? ComponentActivity)?.finish()
        else { ultimoAtras = ahora; Toast.makeText(ctx, "Pulsa Atrás otra vez para salir de CineMood", Toast.LENGTH_SHORT).show() }
    }
    // Atrás lo gestiona siempre la app (si no, en la tele Compose lo usa antes para mover el foco y los menús no se cierran)
    Box(Modifier.fillMaxSize().background(C.fondo).onPreviewKeyEvent { e ->
        App.huboTecla = true
        if (e.key == Key.Back && conSesion) { if (e.type == KeyEventType.KeyUp) atras(); true } else false
    }) {
        if (!conSesion) {
            PantallaEntrar { App.irA(Pestana.INICIO); conSesion = true }
        } else {
            val guardado = rememberSaveableStateHolder()
            val actual = App.pila.last()
            androidx.compose.runtime.LaunchedEffect(actual) { App.entradaPantalla = System.currentTimeMillis(); App.huboTecla = false }
            // Tus addons se piden al abrir la app: el panel «Ver» ya los tiene al pulsar
            androidx.compose.runtime.LaunchedEffect(Unit) { try { es.cinemood.tv.datos.Fuentes.addons() } catch (e: Exception) { } }
            // Cada pantalla conserva su posición (scroll) aunque se salga y se vuelva a ella
            guardado.SaveableStateProvider(actual.clave) {
                CompositionLocalProvider(LocalPantalla provides actual.clave) {
                    when (actual) {
                        is Pantalla.Raiz -> when (actual.p) {
                            Pestana.BUSCAR -> PantallaBuscar()
                            Pestana.MI_LISTA -> PantallaMiLista()
                            Pestana.TU -> PantallaTu { Sesion.salir(); CacheDisco.borrarTodo(); App.focoGuardado.clear(); conSesion = false }
                            else -> PantallaPestana(actual.p)
                        }
                        is Pantalla.Ficha -> PantallaFicha(actual.t)
                        is Pantalla.Categoria -> PantallaCategoria(actual)
                        is Pantalla.Descargas -> PantallaDescargas()
                    }
                }
            }
            App.fuentes?.let { PanelFuentesUI(it) }
        }
        App.menu?.let { MenuUI(it) }
        AvisoUI(Modifier.align(Alignment.BottomCenter))
    }
    BackHandler { atras() }
}
