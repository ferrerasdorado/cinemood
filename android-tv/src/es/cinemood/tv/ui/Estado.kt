package es.cinemood.tv.ui

import android.content.Context
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import es.cinemood.tv.datos.Catalogo
import es.cinemood.tv.datos.Fuente
import es.cinemood.tv.datos.Titulo
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

// CineMood TV · Navegación y estado común.
// Las pestañas de arriba son pantallas raíz; la ficha, las categorías y el resto se apilan encima
// y el botón Atrás del mando las va quitando.

enum class Pestana(val texto: String) { BUSCAR("Buscar"), INICIO("Inicio"), DESCUBRE("Descubre"), SERIES("Series"), PELICULAS("Películas"), MI_LISTA("Mi lista"), TU("Tú") }

sealed class Pantalla(val clave: String) {
    class Raiz(val p: Pestana) : Pantalla("raiz-${p.name}")
    class Ficha(val t: Titulo) : Pantalla("ficha-${t.clave}")
    /** Rejilla de títulos: un género, un estado de ánimo, una plataforma… */
    class Categoria(val titulo: String, val tipos: List<String>, val cargar: suspend (tipo: String, pagina: Int) -> List<Titulo>) : Pantalla("cat-$titulo-${tipos.joinToString("")}")
    class Descargas : Pantalla("descargas")
}

/** Contexto de lo que se quiere ver o descargar (película, o capítulo de una serie) */
data class Contexto(val t: Titulo, val temporada: Int? = null, val episodio: Int? = null, val nombreEpisodio: String = "", val desdeCero: Boolean = false) {
    val etiqueta get() = if (temporada != null && episodio != null) "T$temporada · E$episodio" else ""
}

/** Panel de fuentes abierto: en modo «ver» o en modo «NAS» (solo torrents que se pueden descargar) */
data class PanelFuentes(val ctx: Contexto, val nas: Boolean, val vistaNas: String = "")   // vistaNas: "temporada" o "serie" al buscar packs

data class OpcionMenu(val texto: String, val icono: String = "", val peligro: Boolean = false, val accion: () -> Unit)
data class Menu(val titulo: String, val texto: String = "", val opciones: List<OpcionMenu>)

object App {
    val ambito = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    val pila = mutableStateListOf<Pantalla>(Pantalla.Raiz(Pestana.INICIO))
    var pestana by mutableStateOf(Pestana.INICIO)
    var fuentes by mutableStateOf<PanelFuentes?>(null)
    var menu by mutableStateOf<Menu?>(null)
    var aviso by mutableStateOf<Pair<String, Boolean>?>(null)
    private var turnoAviso = 0
    /** Qué elemento tenía el foco en cada pantalla, para devolverlo al volver atrás */
    val focoGuardado = HashMap<String, String>()
    /** Se incrementa cuando cambia la lista (para refrescar Inicio y Mi lista) */
    var versionLista by mutableStateOf(0)
    var ultimaBusqueda = ""
    var versionBusqueda by mutableStateOf(0)   // sube cuando la búsqueda llega desde fuera (enlace)
    var cacheLista: List<es.cinemood.tv.datos.EnLista>? = null

    /** Al cerrar sesión o caducar: nada de la cuenta anterior se queda en memoria */
    fun limpiarCuenta() {
        cacheLista = null; ultimaBusqueda = ""; menu = null; fuentes = null
        focoGuardado.clear()
        es.cinemood.tv.datos.Fuentes.olvidar()
        irA(Pestana.INICIO)
    }

    fun irA(p: Pestana) {
        pestana = p
        pila.clear(); pila.add(Pantalla.Raiz(p))
    }
    fun abrir(p: Pantalla) { pila.add(p) }
    fun ficha(t: Titulo) = abrir(Pantalla.Ficha(t))

    private var precarga: kotlinx.coroutines.Job? = null
    /** Si el foco se queda un momento sobre un cartel, su ficha se pide ya: al pulsar OK aparece al instante */
    fun precargar(t: Titulo) {
        precarga?.cancel()
        if (Catalogo.fichas.get(t.clave) != null) return
        precarga = ambito.launch { delay(350); try { Catalogo.detalle(t.tipo, t.id) } catch (e: Exception) { } }
    }
    /** Momento en que se entró en la pantalla actual (el foco automático del principio no cuenta como «último foco») */
    var entradaPantalla = 0L
    /** Si en esta pantalla ya se ha pulsado alguna tecla del mando (el foco automático de la tele no cuenta) */
    var huboTecla = false

    /** Atrás: cierra lo que esté abierto encima; devuelve false si ya no hay a dónde volver */
    fun atras(): Boolean {
        if (menu != null) { menu = null; return true }
        if (fuentes != null) { fuentes = null; return true }
        if (pila.size > 1) { pila.removeAt(pila.lastIndex); return true }
        if (pestana != Pestana.INICIO) { irA(Pestana.INICIO); return true }
        return false
    }

    fun avisar(texto: String, error: Boolean = false) {
        aviso = texto to error
        val mio = ++turnoAviso
        ambito.launch { delay(if (error) 7000 else 4500); if (mio == turnoAviso) aviso = null }
    }

    fun error(e: Throwable) = avisar(e.message ?: "Algo ha fallado.", true)

    /** Abre el reproductor con una fuente concreta; si falla, sigue con las demás de la lista */
    fun reproducir(c: Context, f: Fuente, ctx: Contexto, alternativas: List<Fuente> = emptyList()) =
        es.cinemood.tv.Reproduccion.abrir(c, ctx, f, alternativas)

    /** «Reproducir»: el reproductor busca solo la mejor fuente en tus addons */
    fun reproducirAuto(c: Context, ctx: Contexto) = es.cinemood.tv.Reproduccion.abrir(c, ctx)
}
