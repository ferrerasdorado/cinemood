# CineMood

Qué ver según tu estado de ánimo: recomendaciones, tu lista, especiales y tráilers. Además, permite ver
fuentes de vídeo de tus addons y mandar descargas a un NAS que las deja listas en Plex.

Web: https://ferrerasdorado.github.io/cinemood/

Es una aplicación web (PWA) sin paso de compilación: HTML, CSS y JavaScript que el navegador carga tal cual.
Funciona en el móvil (se puede instalar en la pantalla de inicio) y en el ordenador.

## Estructura

```
index.html            Pantallas de la app (solo HTML) y dos scripts mínimos de arranque (tema y modo TV,
                      en línea para que no se vea un parpadeo de colores al abrir)
css/                  Estilos, en el orden en que se aplican
  app.css             Base de toda la app
  editorial.css       Rediseño editorial, cabecera fija, menú inferior y modo oscuro
  fuentes-nas.css     Hoja «Ver», NAS, «Mis descargas», addons y vídeos
  acceso.css          Pantalla de entrada
  componentes.css     Avisos, diálogos, foco con teclado y ajustes comunes (ficha, Mi lista, Tú, Acerca de)
js/                   Lógica, un archivo por apartado (nucleo, dialogos, accesibilidad, navegacion,
                      descubre, ficha, fuentes, reproductor, subtitulos, hosters, nas, cuenta…). Se cargan
                      como scripts clásicos y comparten el ámbito global.
  app.js              Lo único que se ejecuta al cargar, en orden. Se carga después de los demás,
                      así todas las funciones ya existen cuando arranca.
sw.js                 Service worker: abre la app al instante y avisa cuando hay versión nueva
supabase/             SQL de las tablas (ejecutar en el SQL Editor de Supabase)
  nas.sql             Cola de descargas del NAS, permisos y seguridad por usuario
nas/                  Servicio que corre en el NAS (Python)
pruebas/e2e.js        Prueba automática de «Ver», «NAS» y «Mis descargas» en móvil y escritorio
herramientas/         versionar.py: actualiza el ?v= de css/ y js/ en index.html
```

Después de cambiar cualquier archivo de `css/` o `js/`, ejecuta `python3 herramientas/versionar.py`
antes de subirlo. Así los móviles descargan la versión nueva en lugar de usar la guardada.

## Ver, descargar y NAS

En la ficha de una película o serie:

- **▶ Ver** pregunta a tus addons (Torrentio, StremThru, etc.) por fuentes de ese título:
  - Filtros rápidos de **idioma** y **calidad**, búsqueda por nombre, orden (**Recomendado**: primero lo que
    el debrid tiene listo, luego en español —castellano antes que latino— y buena calidad) y «Más filtros».
  - Se muestran **20 resultados** y «Mostrar más». Cada tarjeta lleva etiquetas (⚡ Al instante, 1080p, HDR,
    tamaño, semillas, idioma, «Temporada completa»…), el nombre del torrent y **un botón principal**:
    **Reproducir** (reproductor integrado, con hls.js y mpegts.js) o **Enviar al NAS** si es un torrent.
  - El resto de acciones va en **«⋯»**: Abrir en VLC, Copiar enlace, Descargar y Enviar al NAS.
  - **¿Se ve aquí?** Un navegador no reproduce cualquier archivo (Safari no abre MKV; ninguno descodifica audio
    DTS ni TrueHD; HEVC y AC-3 dependen del equipo). Del nombre del archivo se sacan contenedor y códecs y se
    pregunta al navegador (`canPlayType`): las compatibles llevan «▶ Se ve aquí» y van primero; las demás,
    «Mejor en VLC», con VLC como botón principal. Hay un chip para ver solo las que se ven aquí.
  - Si una fuente no arranca en 12 s, o se ve sin sonido, el reproductor lo dice y ofrece **«Probar otra que se
    ve aquí»**, «Abrir en VLC» o seguir esperando.
  - Al final, plegado, **«Buscar también en webs de descargas»** (Cinecalidad + AllDebrid): solo busca al abrirlo.
- **NAS**:
  - En una **película**, la misma lista con solo torrents, o «Que elija el NAS».
  - En una **serie**, arriba se elige **«Toda la serie»** o una **temporada** (T1, T2…), y dentro de cada
    temporada hay dos pestañas:
    - **Temporada completa**: los **packs** con la temporada entera, o «Que elija el NAS» (busca el mejor pack).
    - **Capítulos**: la lista de capítulos con su nombre. Se marcan varios y el NAS busca un torrent **de cada
      capítulo** (nunca un pack), o «Elegir torrent» en uno para escogerlo; ahí los packs están ocultos salvo
      que se pidan.
    - **Toda la serie**: packs con todas las temporadas, o «Que elija el NAS» (un pack por temporada).
  - Si en «Ver» de un capítulo eliges un torrent que es un pack, el botón lo dice («Enviar al NAS la
    temporada 5») y se apunta como temporada completa.
- No se repite lo que ya está en la cola. Los avisos salen dentro de la app, no en ventanas del navegador.

El reproductor integrado tiene **Subtítulos** (de tus addons de subtítulos, primero en español) y
**Abrir en VLC** debajo del vídeo.

### Cómo se distingue un capítulo de un pack

Los addons ponen el nombre del torrent en la primera línea y, si es un pack, el archivo del capítulo en la
segunda. Con eso se clasifica cada torrent (`_fteTipoTorrent` en `js/fuentes.js` y `tipo_torrent` en
`nas/cinemood_nas.py`, con las mismas reglas):

| Nombre del torrent | Tipo |
|---|---|
| `Breaking.Bad.S01E01.Pilot.1080p…`, `…1x01…` | un capítulo |
| `Breaking.Bad.S01.1080p…`, `Season 1`, `1ª Temporada Completa`, `S01E01-07` | temporada entera |
| `Breaking Bad Complete S01-S05…`, `Seasons 1-5`, `1ª a 5ª Temporada` | serie entera |

**Tú → 📥 Mis descargas del NAS** muestra todo lo enviado, agrupado por título y con su estado
(en cola, buscando torrent, descargando, completada, error, sin fuentes o cancelada). Se actualiza sola
cada 15 segundos mientras haya algo en marcha. Lo que se está descargando lleva su barra con porcentaje, tamaño, velocidad y tiempo
restante, que el NAS copia desde RDT-Client. Desde ahí se puede:

- **Cancelar descarga**: el NAS borra el torrent de RDT-Client (sin borrar lo ya descargado).
- **Reintentar** lo que falló o **volver a pedir** lo cancelado.
- **Quitar de la lista** lo que ya no está en marcha.

Si un torrent desaparece de RDT-Client (que suele quitarlo al terminar), la solicitud pasa a «completada»
si ya iba por el 95 % o más, y a «cancelada» si se borró a medias.

- **Atascada**: si una descarga lleva `ATASCO_MIN` minutos (15 por defecto) sin avanzar, sale marcada y con
  **«Probar con otro torrent»**: se cancela y se vuelve a pedir; el NAS descarta los torrents que ya fallaron.
- **Aviso al móvil al terminar** («📥 Descarga terminada»), desactivable en Tú → Ajustes → Avisos. Lo manda el
  NAS a través de la función `supabase/functions/cinemood-avisos` (hay que publicarla, ver abajo).

### Cómo funciona por dentro

```
App ──insert──▶ Supabase (solicitudes_descarga) ◀──lee y actualiza── nas/cinemood_nas.py
                                                                        │ magnet (hash + trackers)
                                                                        ▼
                                                     RDT-Client ──▶ AllDebrid / Real-Debrid
                                                                        │
                                                                        ▼
                                                     Carpetas Peliculas / Series ──▶ Plex
```

- La app solo escribe lo que pide el usuario (`tmdb_id`, `tipo`, `titulo`, `temporada`, `episodio` y,
  si eliges el torrent, `info_hash` y `fuente`). El estado solo lo cambia el NAS, con la clave de servicio.
- Con seguridad a nivel de fila, cada usuario solo ve y borra sus propias solicitudes (ver `supabase/nas.sql`).
- Del torrent elegido se guarda solo el hash, nunca el enlace: el enlace de un addon con debrid lleva
  dentro la clave privada de esa cuenta.

Para entrar en RDT-Client desde fuera de casa, lo recomendable es una VPN como Tailscale en el NAS
y en el móvil, en lugar de abrir su puerto en el router.

### Accesibilidad y detalles de interfaz

- Se puede hacer zoom; en iPhone los campos de texto van a 16 px para que Safari no amplíe solo.
- Todo lo que se pulsa funciona con teclado y lector de pantalla (`js/accesibilidad.js`); foco visible.
- Sin ventanas del navegador: avisos, confirmaciones y campos propios de la app (`js/dialogos.js`).
- Géneros de series que TMDB no traduce («Action & Adventure»…) se traducen al recibirlos (`js/app.js`).
- Contraste mínimo de 4,5 en textos, en modo claro y oscuro.

### Puesta en marcha del NAS

1. Ejecuta `supabase/nas.sql` en el SQL Editor de Supabase (se puede volver a ejecutar entero cuando cambie).
1. Para el aviso al terminar una descarga: en Supabase → Edge Functions → `cinemood-avisos`, pega el contenido
   de `supabase/functions/cinemood-avisos/index.ts` y pulsa Deploy.
2. En el NAS: `pip install -r nas/requirements.txt`, copia `nas/.env.example` como `.env`, rellénalo
   y arranca `python3 nas/cinemood_nas.py`.

## App para Android TV (`android-tv/`)

La versión de la tele es una **app nativa** (Kotlin + Jetpack Compose para TV + Media3), no la web metida en un navegador.
La anterior cargaba la web entera (más de 1 MB de JavaScript) en un navegador interno e iba lenta en descodificadores modestos;
ahora cada pantalla se dibuja de forma nativa y solo se descargan los datos. Usa **la misma cuenta, Mi lista, addons y NAS**
que la web y el móvil (Supabase), así que lo que se hace en un sitio aparece en los demás.

- **Pantallas:** Inicio (portada que cambia sola, «Seguir viendo», Mi lista, estados de ánimo, tendencias…), Descubre
  (por plataforma, joyas poco vistas, clásicos…), Series, Películas, Buscar, Mi lista y Tú (addons y Mis descargas).
- **Ficha** a pantalla completa con logo, datos, temporadas y capítulos, reparto y recomendaciones. Botones: Ver, Mi lista,
  Marcar vista, NAS y Tráiler.
- **Elegir fuente:** panel lateral con tus addons y las mismas etiquetas que la web (⚡ Al instante, 4K, HDR, Castellano,
  packs…). Se reproduce en el reproductor nativo (Media3), con subtítulos de tus addons y VLC como alternativa.
- **NAS:** película, temporada, todas las temporadas, un capítulo (manteniendo OK) o eligiendo el torrent.
- **Rápida en teles modestas:** perfil de arranque (*baseline profile*) para que Android la precompile, R8, imágenes en
  RGB565, copia en disco de Inicio para abrir al instante y precarga de la ficha al pasar el foco por un cartel.

Código: `android-tv/src/es/cinemood/tv/` (`datos/` = Supabase, TMDB, addons, lista y NAS; `ui/` = pantallas).
Compilar: `android-tv/compilar.sh` · instalar en la tele por ADB y precompilar: `android-tv/instalar.sh [IP:PUERTO]`.

## Pruebas

```
npm install --no-save playwright && npx playwright install chromium
node pruebas/e2e.js                      # como un iPhone 13
DISP="Desktop Chrome" node pruebas/e2e.js
```

Recorre el flujo completo sin tocar ninguna cuenta real: la sesión y la base de datos se simulan
dentro del navegador con las mismas reglas que `supabase/nas.sql`.

## Mejoras futuras

- Elegir el archivo exacto dentro de un torrent con la temporada entera, para descargar solo un capítulo.
- Pasar los archivos de `js/` a módulos ES con `import`/`export` para que cada uno declare lo que usa.
