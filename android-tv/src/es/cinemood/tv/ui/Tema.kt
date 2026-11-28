@file:OptIn(ExperimentalTvMaterial3Api::class)

package es.cinemood.tv.ui

import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.MaterialTheme
import androidx.tv.material3.darkColorScheme
import es.cinemood.tv.R

// CineMood TV · Tema: los mismos colores y letras que el modo oscuro de la web
// (fondo #121413, superficies verdosas, acento rojo #b52c29, Satoshi para el texto y Cabinet Grotesk para los títulos).

object C {
    val fondo = Color(0xFF121413)
    val superficie = Color(0xFF1C1F1D)
    val superficie2 = Color(0xFF262927)
    val superficie3 = Color(0xFF2E322F)
    val linea = Color(0xFF333734)
    val tinta = Color(0xFFECEBE6)
    val suave = Color(0xFFAEB1AA)
    val tenue = Color(0xFF8E918A)
    val acento = Color(0xFFB52C29)
    val acentoClaro = Color(0xFFE4675F)
    val acentoTexto = Color(0xFFF08A82)
    val acentoSuave = Color(0xFF3A1F1C)
    val verde = Color(0xFF8CC7A3)
    val verdeSuave = Color(0xFF1E2A22)
    val ambar = Color(0xFFE8B04B)
}

val Satoshi = FontFamily(
    Font(R.font.satoshi_regular, FontWeight.Normal),
    Font(R.font.satoshi_medium, FontWeight.Medium),
    Font(R.font.satoshi_bold, FontWeight.Bold),
    Font(R.font.satoshi_black, FontWeight.Black),
)
val Cabinet = FontFamily(
    Font(R.font.cabinet_bold, FontWeight.Bold),
    Font(R.font.cabinet_extrabold, FontWeight.ExtraBold),
)

@Composable
fun TemaCineMood(contenido: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = darkColorScheme(
            primary = C.acento, onPrimary = Color.White,
            background = C.fondo, onBackground = C.tinta,
            surface = C.superficie, onSurface = C.tinta,
            surfaceVariant = C.superficie2, onSurfaceVariant = C.suave,
            border = C.linea,
        ),
        content = contenido,
    )
}
