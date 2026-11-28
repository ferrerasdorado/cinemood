# CineMood TV · reglas de R8
# El reproductor (Java) llama a estas funciones de Kotlin por su nombre
-keep class es.cinemood.tv.datos.Progreso { *; }
-keep class es.cinemood.tv.Externo { *; }
-dontwarn org.conscrypt.**
-dontwarn org.bouncycastle.**
-dontwarn org.openjsse.**
# El reproductor carga el decodificador FFmpeg por su nombre (reflexión) y usa código nativo
-keep class androidx.media3.decoder.ffmpeg.** { *; }
