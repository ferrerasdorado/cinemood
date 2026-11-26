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
js/                   Lógica, un archivo por apartado (nucleo, navegacion, descubre, ficha, fuentes,
                      reproductor, nas, cuenta…). Se cargan como scripts clásicos y comparten el ámbito global.
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

- **▶ Ver** pregunta a tus addons (Torrentio, StremThru, etc.) por fuentes de ese título y las lista con
  filtros de idioma, resolución, subtítulos, proveedor y orden. Cada fuente puede tener:
  - **Reproducir**: reproductor integrado en la app (HTML5, con hls.js para `.m3u8` y mpegts.js para `.ts`).
  - **Abrir en VLC**: en Android e iPhone abre la app de VLC; en el ordenador descarga una lista `.m3u`.
  - **Copiar enlace** y **Descargar**, si es un archivo directo.
  - **Enviar al NAS**: si la fuente es un torrent (con o sin AllDebrid). En una serie, manda el capítulo elegido.
- **NAS**:
  - En una película, abre la misma lista en «modo NAS»: solo torrents, para elegir proveedor y torrent,
    o «Que elija el NAS automáticamente».
  - En una serie, un pop-up: **serie completa**, **temporada completa** o **capítulos sueltos**.
    La serie o la temporada se envían como una solicitud por capítulo (solo los ya emitidos).
- No se repite lo que ya está en la cola. Los avisos salen dentro de la app, no en ventanas del navegador.

**Tú → 📥 Mis descargas del NAS** muestra todo lo enviado, agrupado por título y con su estado
(en cola, buscando torrent, descargando, completada, error, sin fuentes o cancelada). Se actualiza sola
cada 20 segundos. Lo que se está descargando lleva su barra con porcentaje, tamaño, velocidad y tiempo
restante, que el NAS copia desde RDT-Client. Desde ahí se puede:

- **Cancelar descarga**: el NAS borra el torrent de RDT-Client (sin borrar lo ya descargado).
- **Reintentar** lo que falló o **volver a pedir** lo cancelado.
- **Quitar de la lista** lo que ya no está en marcha.

Si un torrent desaparece de RDT-Client (que suele quitarlo al terminar), la solicitud pasa a «completada»
si ya iba por el 95 % o más, y a «cancelada» si se borró a medias.

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

### Puesta en marcha del NAS

1. Ejecuta `supabase/nas.sql` en el SQL Editor de Supabase (se puede volver a ejecutar entero cuando cambie).
2. En el NAS: `pip install -r nas/requirements.txt`, copia `nas/.env.example` como `.env`, rellénalo
   y arranca `python3 nas/cinemood_nas.py`.

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
