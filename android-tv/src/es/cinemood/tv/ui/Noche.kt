@file:OptIn(ExperimentalTvMaterial3Api::class)

package es.cinemood.tv.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.tv.material3.Border
import androidx.tv.material3.ClickableSurfaceDefaults
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.Surface
import es.cinemood.tv.datos.Catalogo
import es.cinemood.tv.datos.Gusto
import es.cinemood.tv.datos.Tmdb
import es.cinemood.tv.datos.Titulo
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.launch

// CineMood TV · «¿Qué vemos esta noche?»: eliges cómo te sientes, con quién lo ves y cuánto tiempo tienes,
// y te propone tres títulos que encajan, ordenados por la nota que le pondrías tú, con el porqué de cada uno.

private data class Opcion(val clave: String, val emoji: String, val texto: String)

private val COMPANIA = listOf(Opcion("solo", "🙋", "Yo solo"), Opcion("pareja", "💑", "En pareja"), Opcion("familia", "👨‍👩‍👧", "En familia"), Opcion("amigos", "🍕", "Con amigos"))
private val TIEMPO = listOf(Opcion("corta", "⏱", "Algo cortito"), Opcion("normal", "🎬", "Una peli normal"), Opcion("larga", "🍿", "Lo que haga falta"), Opcion("caps", "📺", "Un par de capítulos"))

private data class Propuesta(val t: Titulo, val nota: Double?, val minutos: Int, val generos: List<String>, val motivo: String)

/** Junta varios filtros de TMDB: si dos traen without_genres (o with_genres), se combinan en vez de pisarse */
private fun unirFiltros(vararg partes: String): String {
    val m = LinkedHashMap<String, String>()
    partes.flatMap { it.split('&') }.filter { '=' in it }.forEach { p ->
        val (k, v) = p.split('=', limit = 2)
        m[k] = when {
            k == "without_genres" && m[k] != null -> (m[k]!!.split(',') + v.split(',')).distinct().joinToString(",")
            else -> v
        }
    }
    return m.entries.joinToString("&") { "${it.key}=${it.value}" }
}

private suspend fun proponer(animo: Catalogo.Animo, compania: String, tiempo: String): List<Propuesta> = coroutineScope {
    val tipo = if (tiempo == "caps") "tv" else "movie"
    val extraCompania = when (compania) {
        "familia" -> if (tipo == "movie") "without_genres=27,53,80,10752,10749" else "without_genres=80,10768,9648"
        "pareja" -> "without_genres=16,10751"
        "amigos" -> "without_genres=99,36"
        else -> ""
    }
    val extraTiempo = when (tiempo) { "corta" -> "with_runtime.lte=100&with_runtime.gte=60"; "normal" -> "with_runtime.lte=140&with_runtime.gte=75"; else -> "" }
    val filtros = unirFiltros(if (tipo == "tv") animo.series else animo.pelis, extraCompania, extraTiempo)
    // Con tu modelo de gustos: ordenadas por la nota que le pondrías. Sin él: por la del público.
    val candidatos: List<Pair<Titulo, Double?>> = Gusto.teVaAEncantar(filtros, listOf(tipo), cuantos = 30, minimo = 0.0).map { it.first to it.second as Double? }
        .ifEmpty {
            (1..2).map { pag -> async { try { Catalogo.descubrir(tipo, "$filtros&sort_by=vote_average.desc&vote_count.gte=400", pag) } catch (e: Exception) { emptyList() } } }
                .awaitAll().flatten().filter { it.clave !in Gusto.vistos }.distinctBy { it.clave }.map { it to null }
        }
    // Algo de variedad: se barajan un poco los mejores para que «Otras 3» no repita siempre lo mismo
    val orden = candidatos.take(18).chunked(6).flatMap { it.shuffled() } + candidatos.drop(18)
    val compTexto = when (compania) { "pareja" -> " y lo veis en pareja"; "familia" -> " y es para toda la familia"; "amigos" -> " y es para verla con amigos"; else -> "" }
    orden.take(12).map { (t, n) ->
        async {
            val d = try { Catalogo.detalle(t.tipo, t.id) } catch (e: Exception) { null }
            val nota = n ?: d?.info?.let { Gusto.prever(t.tipo, it)?.nota }
            val porque = if (nota != null) "Le pondrías un ${Gusto.fmt(nota)}" else "Al público le encanta (${Gusto.fmt(t.nota)})"
            Propuesta(d?.t ?: t, nota, d?.minutos ?: 0, d?.generos?.take(2) ?: emptyList(),
                "Para cuando estás ${animo.nombre.lowercase()}$compTexto. $porque.")
        }
    }.awaitAll()
}

@Composable
fun PantallaNoche() {
    var animo by remember { mutableStateOf<Catalogo.Animo?>(null) }
    var compania by remember { mutableStateOf("solo") }
    var tiempo by remember { mutableStateOf("normal") }
    var propuestas by remember { mutableStateOf<List<Propuesta>>(emptyList()) }
    var tanda by remember { mutableIntStateOf(0) }
    var buscando by remember { mutableStateOf(false) }
    val ambito = rememberCoroutineScope()
    fun lanzar() {
        val a = animo ?: run { App.avisar("Elige primero cómo te sientes."); return }
        buscando = true; propuestas = emptyList(); tanda = 0
        ambito.launch {
            propuestas = try { proponer(a, compania, tiempo) } catch (e: Exception) { App.error(e); emptyList() }
            if (propuestas.isEmpty()) App.avisar("No he encontrado nada con esa combinación. Prueba otra.")
            buscando = false
        }
    }
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(start = MARGEN.dp, end = MARGEN.dp, top = 30.dp, bottom = 60.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
        item {
            Texto("🌙 ¿Qué vemos esta noche?", tam = 30, peso = FontWeight.ExtraBold, titulo = true, color = C.tinta)
            Texto(if (Gusto.listo) "Tres propuestas pensadas para ti, según las ${Gusto.nPuntuadas} notas que has puesto." else "Tres propuestas según tu ánimo. Puntúa más títulos en la web y acertaré todavía más.", tam = 15, color = C.suave)
        }
        item { Pregunta("¿Cómo te sientes?") { items(Catalogo.ANIMOS, key = { it.clave }) { a -> Chip("${a.emoji}  ${a.nombre}", animo == a, { animo = a }, Modifier.focoRecordado("n-animo-${a.clave}", pedirSiNada = a == Catalogo.ANIMOS.first())) } } }
        item { Pregunta("¿Con quién lo ves?") { items(COMPANIA, key = { it.clave }) { o -> Chip("${o.emoji}  ${o.texto}", compania == o.clave, { compania = o.clave }, Modifier.focoRecordado("n-comp-${o.clave}")) } } }
        item { Pregunta("¿Cuánto tiempo tienes?") { items(TIEMPO, key = { it.clave }) { o -> Chip("${o.emoji}  ${o.texto}", tiempo == o.clave, { tiempo = o.clave }, Modifier.focoRecordado("n-tiempo-${o.clave}")) } } }
        item {
            Row(Modifier.padding(top = 14.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Boton(if (buscando) "Pensando…" else "Proponme 3", { if (!buscando) lanzar() }, Modifier.focoRecordado("n-ir"), icono = "✨", principal = true)
                if (propuestas.size > 3) Boton("Otras 3", { tanda = (tanda + 1) % ((propuestas.size + 2) / 3) }, Modifier.focoRecordado("n-otras"), icono = "🔄")
            }
        }
        val visibles = propuestas.drop(tanda * 3).take(3)
        if (visibles.isNotEmpty()) item {
            Row(Modifier.padding(top = 18.dp), horizontalArrangement = Arrangement.spacedBy(18.dp)) {
                visibles.forEachIndexed { i, p -> TarjetaPropuesta(p, i + 1, Modifier.weight(1f)) }
            }
        }
    }
}

@Composable
private fun Pregunta(titulo: String, contenido: androidx.compose.foundation.lazy.LazyListScope.() -> Unit) {
    Column(Modifier.padding(top = 14.dp)) {
        Texto(titulo, Modifier.padding(bottom = 8.dp), tam = 18, peso = FontWeight.ExtraBold, titulo = true, color = C.tinta)
        LazyRow(horizontalArrangement = Arrangement.spacedBy(10.dp), contentPadding = PaddingValues(vertical = 4.dp), content = contenido)
    }
}

@Composable
private fun TarjetaPropuesta(p: Propuesta, n: Int, modifier: Modifier) {
    val forma = RoundedCornerShape(10.dp)
    Surface(
        onClick = { App.ficha(p.t) }, modifier = modifier.height(300.dp).focoRecordado("n-prop-${p.t.clave}"),
        shape = ClickableSurfaceDefaults.shape(forma),
        colors = ClickableSurfaceDefaults.colors(containerColor = C.superficie, focusedContainerColor = C.superficie),
        border = ClickableSurfaceDefaults.border(focusedBorder = Border(BorderStroke(3.dp, C.tinta), shape = forma)),
        scale = ClickableSurfaceDefaults.scale(focusedScale = 1.04f),
    ) {
        Box(Modifier.fillMaxSize()) {
            Imagen(Tmdb.img(p.t.fondo ?: p.t.poster, "w780"), Modifier.fillMaxSize(), ajuste = ContentScale.Crop, descripcion = p.t.nombre)
            Box(Modifier.fillMaxSize().background(Brush.verticalGradient(0.25f to Color.Transparent, 1f to C.fondo.copy(alpha = 0.97f))))
            Texto("$n", Modifier.align(Alignment.TopStart).padding(12.dp).background(C.acento, RoundedCornerShape(50)).padding(horizontal = 11.dp, vertical = 3.dp), tam = 16, peso = FontWeight.Black, color = Color.White)
            Column(Modifier.align(Alignment.BottomStart).padding(16.dp)) {
                Texto(p.t.nombre, tam = 20, peso = FontWeight.ExtraBold, titulo = true, color = C.tinta, lineas = 2)
                Spacer(Modifier.height(4.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    if (p.nota != null) { Etiqueta("Para ti ${Gusto.fmt(p.nota)}", if (p.nota >= 7.5) C.verde else C.ambar, C.superficie3); Spacer(Modifier.width(8.dp)) }
                    Texto(listOfNotNull(p.t.anio.ifEmpty { null }, if (p.minutos > 0) (if (p.minutos >= 60) "${p.minutos / 60} h ${p.minutos % 60} min" else "${p.minutos} min") else null, p.generos.firstOrNull())
                        .joinToString(" · "), tam = 13, color = C.suave, lineas = 1)
                }
                Spacer(Modifier.height(6.dp))
                Texto(p.motivo, tam = 13, color = C.tinta.copy(alpha = 0.85f), lineas = 2, alto = 17)
            }
        }
    }
}
