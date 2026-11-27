// CineMood · prueba de extremo a extremo de «Ver», «NAS» y «Mis descargas»
//
// Abre la app en un Chrome automático (como un iPhone o como un ordenador) y recorre lo que haría una persona:
// instalar un addon; en «Ver», filtrar, ver más resultados, abrir el menú «⋯» y reproducir con subtítulos;
// enviar al NAS una película y, de una serie, una temporada (pack), capítulos sueltos, un capítulo concreto
// o la serie entera; y revisar «Mis descargas» (progreso, cancelar, reintentar, quitar).
//
// No toca ninguna cuenta real: la sesión y la base de datos se simulan dentro del navegador
// (con las mismas reglas que supabase/nas.sql) y TMDB devuelve datos fijos. Torrentio sí es el real.
//
// Uso (desde la carpeta del proyecto):
//   npm install --no-save playwright && npx playwright install chromium
//   node pruebas/e2e.js                 # como un iPhone 13
//   DISP="Desktop Chrome" node pruebas/e2e.js
const { chromium, devices } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const RAIZ = path.resolve(__dirname, '..'), DISP = process.env.DISP || 'iPhone 13';
const S = process.env.CAPTURAS || fs.mkdtempSync(path.join(os.tmpdir(), 'cinemood-'));
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
// Servidor local mínimo para servir la app
function servir() {
  return new Promise(ok => {
    const srv = http.createServer((req, res) => {
      const ruta = path.join(RAIZ, decodeURIComponent(new URL(req.url, 'http://x').pathname));
      if (!ruta.startsWith(RAIZ) || !fs.existsSync(ruta) || fs.statSync(ruta).isDirectory()) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'content-type': TIPOS[path.extname(ruta)] || 'application/octet-stream' });
      fs.createReadStream(ruta).pipe(res);
    }).listen(0, '127.0.0.1', () => ok(srv));
  });
}
// Vídeo webm de 4 segundos generado en el propio navegador (para probar el reproductor sin depender de internet)
async function videoDePrueba(browser) {
  const p = await browser.newPage();
  const datos = await p.evaluate(async () => {
    const c = document.createElement('canvas'); c.width = 320; c.height = 180; const x = c.getContext('2d');
    const rec = new MediaRecorder(c.captureStream(25), { mimeType: 'video/webm;codecs=vp8' }), partes = [];
    rec.ondataavailable = e => partes.push(e.data); rec.start(); let i = 0;
    const t = setInterval(() => { x.fillStyle = `hsl(${i * 7},70%,50%)`; x.fillRect(0, 0, 320, 180); x.fillStyle = '#fff'; x.font = '40px sans-serif'; x.fillText('CineMood ' + (i++), 40, 100); }, 40);
    await new Promise(r => setTimeout(r, 4000)); clearInterval(t); rec.stop(); await new Promise(r => rec.onstop = r);
    return Array.from(new Uint8Array(await new Blob(partes).arrayBuffer()));
  });
  await p.close(); return Buffer.from(datos);
}
const resultados = []; let fallos = 0;
const ok = (cond, txt) => { resultados.push((cond ? '✅ ' : '❌ ') + txt); if (!cond) fallos++; };

// Base de datos de mentira (se ejecuta dentro de la página): imita las reglas de supabase/nas.sql
function instalarDbFalsa() {
  const db = window.__db = { solicitudes_descarga: [], otras: [] };
  const COLS_INSERT = ['tmdb_id', 'tipo', 'titulo', 'temporada', 'episodio', 'info_hash', 'fuente'];
  const checkOk = r => (r.tipo === 'movie' && r.temporada == null && r.episodio == null) ||
    (r.tipo === 'tv' && ((r.temporada == null && r.episodio == null) || (r.temporada != null && r.temporada >= 0 && r.episodio == null) || (r.temporada != null && r.temporada >= 0 && r.episodio != null && r.episodio >= 1)));
  let sig = 1;
  sb.from = tabla => {
    const st = { op: 'select', filtros: [], filas: null, uno: false };
    const run = () => {
      if (tabla !== 'solicitudes_descarga') {
        if (st.op === 'select') return { data: st.uno ? null : [], error: null };
        db.otras.push({ tabla, op: st.op }); return { data: null, error: null };
      }
      const t = db.solicitudes_descarga, coincide = r => st.filtros.every(f => f(r));
      if (st.op === 'insert') {
        for (const r of st.filas) {
          const extra = Object.keys(r).filter(k => !COLS_INSERT.includes(k));
          if (extra.length) return { data: null, error: { code: '42501', message: 'permission denied for table solicitudes_descarga (' + extra + ')' } };
          if (!checkOk(r)) return { data: null, error: { code: '23514', message: 'violates check constraint "solicitudes_descarga_check"' } };
          if (r.info_hash != null && !/^([a-f0-9]{40}|[a-z2-7]{32})$/i.test(r.info_hash)) return { data: null, error: { code: '23514', message: 'info_hash check' } };
        }
        const ahora = new Date().toISOString();
        st.filas.forEach(r => t.push({ id: 'id' + (sig++), user_id: sesionActual.user.id, estado: 'pendiente', error_mensaje: null, info_hash: null, fuente: null,
          progreso: null, velocidad: null, eta: null, tamano: null, cancelar: false, creada_en: ahora, actualizada_en: ahora, ...r }));
        return { data: null, error: null };
      }
      if (st.op === 'update') {
        const extra = Object.keys(st.vals).filter(k => k !== 'cancelar');
        if (extra.length) return { data: null, error: { code: '42501', message: 'permission denied (' + extra + ')' } };
        t.filter(r => coincide(r) && ['pendiente', 'procesando', 'descargando'].includes(r.estado)).forEach(r => Object.assign(r, st.vals));
        return { data: null, error: null };
      }
      if (st.op === 'delete') {
        const borrar = t.filter(r => coincide(r) && ['pendiente', 'completada', 'error', 'sin_fuentes', 'cancelada'].includes(r.estado));
        db.solicitudes_descarga = t.filter(r => !borrar.includes(r));
        return { data: null, error: null };
      }
      const data = t.filter(coincide).sort((a, b) => b.creada_en.localeCompare(a.creada_en));
      return { data: st.uno ? (data[0] || null) : data, error: null };
    };
    const api = new Proxy({}, { get(_, k) {
      if (k === 'then') return (res, rej) => Promise.resolve().then(run).then(res, rej);
      if (k === 'insert' || k === 'upsert') return filas => { st.op = k === 'insert' ? 'insert' : 'upsert'; st.filas = Array.isArray(filas) ? filas : [filas]; return api; };
      if (k === 'delete') return () => { st.op = k; return api; };
      if (k === 'update') return v => { st.op = k; st.vals = v; return api; };
      if (k === 'eq') return (c, v) => { st.filtros.push(r => r[c] === v); return api; };
      if (k === 'in') return (c, vs) => { st.filtros.push(r => vs.includes(r[c])); return api; };
      if (k === 'maybeSingle' || k === 'single') return () => { st.uno = true; return api; };
      return () => api; // select, order, limit, range, neq…
    } });
    return api;
  };
  sesionActual = { user: { id: 'usuario-de-prueba', email: 'prueba@ejemplo.test' } };
  sb.auth.getSession = async () => ({ data: { session: { access_token: 'token-de-prueba', user: sesionActual.user } }, error: null });
  _cmPermitidoCache.set('usuario-de-prueba', true);
  document.body.classList.remove('sin-sesion');
  document.getElementById('gate').style.display = 'none';
}

(async () => {
  const srv = await servir(), URL_APP = `http://127.0.0.1:${srv.address().port}/index.html`;
  const browser = await chromium.launch();
  const video = await videoDePrueba(browser);
  const ctx = await browser.newContext({ ...devices[DISP], serviceWorkers: 'block' });
  const page = await ctx.newPage();
  await page.route('**/_prueba.webm', r => r.fulfill({ status: 200, contentType: 'video/webm', body: video }));
  const errores = [], dialogosNativos = [];
  page.on('pageerror', e => errores.push(e.message));
  page.on('dialog', d => { dialogosNativos.push(d.type() + ': ' + d.message()); d.dismiss().catch(() => {}); });
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|supabase|ERR_/.test(m.text())) errores.push('console: ' + m.text().slice(0, 200)); });
  // TMDB simulado (el proxy real exige sesión): Matrix y Breaking Bad (5 temporadas, 62 capítulos)
  const EPS = {1:7, 2:13, 3:13, 4:13, 5:16};
  await page.route('**/functions/v1/tmdb-proxy**', route => {
    const u = new URL(route.request().url()), ruta = u.searchParams.get('path') || '';
    let d = {};
    if (/^\/movie\/603\/external_ids/.test(ruta)) d = { imdb_id: 'tt0133093' };
    else if (/^\/tv\/1396\/external_ids/.test(ruta)) d = { imdb_id: 'tt0903747' };
    else if (/^\/tv\/1396\/season\/(\d+)/.test(ruta)) { const n = +ruta.match(/season\/(\d+)/)[1]; d = { season_number: n, episodes: Array.from({ length: EPS[n] || 0 }, (_, i) => ({ episode_number: i + 1, name: 'Capítulo ' + (i + 1), air_date: '2010-01-0' + (1 + i % 9) })) }; }
    else if (/^\/tv\/1396(\?|$|&)/.test(ruta) || ruta === '/tv/1396') d = { id: 1396, name: 'Breaking Bad', number_of_seasons: 5, number_of_episodes: 62, genres: [{ id: 10759, name: 'Action & Adventure' }, { id: 18, name: 'Drama' }], seasons: [{ season_number: 0, episode_count: 3 }, ...Object.entries(EPS).map(([n, c]) => ({ season_number: +n, episode_count: c, name: 'Temporada ' + n }))] };
    else if (/^\/movie\/603(\?|$|&)/.test(ruta) || ruta === '/movie/603') d = { id: 603, title: 'Matrix', release_date: '1999-03-30', runtime: 136, genres: [] };
    else d = { results: [], cast: [], crew: [], episodes: [] };
    route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(d) });
  });
  const foto = n => page.screenshot({ path: `${S}/e2e-${DISP.replace(/ /g, '_')}-${n}.png` });
  const db = () => page.evaluate(() => window.__db.solicitudes_descarga);
  const aviso = () => page.evaluate(() => { const t = document.getElementById('cm-aviso'); return t && t.classList.contains('on') ? t.textContent : ''; });
  const esperar = ms => page.waitForTimeout(ms);

  await page.goto(URL_APP, { waitUntil: 'load' });
  await esperar(3000);
  await page.evaluate(instalarDbFalsa);
  const a11y = await page.evaluate(() => ({
    zoom: !/user-scalable=no|maximum-scale/.test(document.querySelector('meta[name=viewport]').content),
    sinRol: [...document.querySelectorAll('[onclick]')].filter(e => !e.matches('button, a[href], input, select, textarea, label, summary, video, audio') && e.getAttribute('role') !== 'button').length,
    camposSinEtiqueta: [...document.querySelectorAll('input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=range])')].filter(i => !i.getAttribute('aria-label') && !(i.id && document.querySelector('label[for="' + i.id + '"]')) && !i.closest('label')).length,
  }));
  ok(a11y.zoom, 'Se puede hacer zoom (sin user-scalable=no)');
  ok(a11y.sinRol === 0, `Todo lo que se pulsa es un botón para el teclado y el lector de pantalla (${a11y.sinRol} sin rol)`);
  ok(a11y.camposSinEtiqueta === 0, `Todos los campos de texto tienen etiqueta (${a11y.camposSinEtiqueta} sin ella)`);
  const repetidos = await page.evaluate(() => { const v = {}; document.querySelectorAll('[id]').forEach(e => v[e.id] = (v[e.id] || 0) + 1); return Object.keys(v).filter(k => v[k] > 1); });
  ok(!repetidos.length, 'Sin id repetidos en la página' + (repetidos.length ? ': ' + repetidos.join(', ') : ''));
  ok(await page.$$eval('video', vs => vs.every(v => v.closest('#visor, .pantalla, #feed-overlay, #video-visor'))) && await page.$$eval('#visor video', vs => vs.length) === 1,
    'Ningún vídeo suelto fuera de su sitio y un único vídeo en el reproductor');

  // 1) Addon público de Torrentio (sin debrid), instalado desde la pantalla «Mis addons»
  await page.evaluate(() => abrirAddons());
  await page.fill('#addon-url', 'https://torrentio.strem.fun/manifest.json');
  await page.click('#addon-btn');
  await page.waitForFunction(() => addonsLeer().length > 0, null, { timeout: 20000 }).catch(() => {});
  ok(await page.evaluate(() => addonsLeer().length > 0), 'Instalar el addon Torrentio desde «Mis addons»');

  const hosters = []; page.on('request', r => { if (/cinemood-hosters/.test(r.url())) hosters.push(r.url()); });
  // Espera a que los addons hayan respondido (la hoja muestra su estado en verde o rojo)
  const esperarLista = () => page.waitForFunction(() => document.querySelector('#fte-body .fte-addon-est.ok, #fte-body .fte-addon-est.mal'), null, { timeout: 40000 }).catch(() => {});
  const tarjetas = () => page.locator('#fte-body .fte-card');
  const textosBotones = () => page.$$eval('#fte-body .fte-card .fte-btn-prim', bs => bs.map(b => b.textContent));

  // 1b) «Tú» ordenada por secciones y «Acerca de»
  await page.evaluate(() => { irA('p-cuenta'); document.getElementById('cuenta-logged-in').style.display = 'block'; document.getElementById('cuenta-logged-out').style.display = 'none'; }); await esperar(300);
  const secciones = await page.$$eval('#p-cuenta .tu-sec', xs => xs.map(x => x.textContent));
  ok(['Tu gusto', 'Puntúa y ordena', 'Ver y descargar', 'Ajustes', 'Tu cuenta'].every(x => secciones.includes(x)), 'Tú por secciones: ' + secciones.join(' · '));
  await foto('0-tu');
  await page.click('button:has-text("Acerca de CineMood")'); await esperar(300);
  ok(/no lo respalda ni lo certifica/.test(await page.textContent('#p-acerca')), '«Acerca de» con la mención obligatoria a TMDB');
  // Diálogo propio en lugar de confirm(): se prueba con el de la app
  const resp = page.evaluate(() => _confirmar('¿Seguro?', { aceptar: 'Borrar', peligro: true }));
  await page.waitForSelector('.cm-dlg'); ok(await page.isVisible('.cm-dlg-btn.prim.peligro'), 'Diálogo de confirmación propio de la app');
  await page.keyboard.press('Escape'); ok((await resp) === false && !(await page.$('.cm-dlg')), 'Escape cancela el diálogo');

  // 2) «Ver» de una película: resultados compactos, filtros, «Mostrar más» y menú «⋯»
  await page.evaluate(() => abrirDetalle({ id: 603, _tipo: 'movie', title: 'Matrix', poster_path: '' }));
  await esperar(3500);
  ok(await page.isVisible('#btn-descargar-nas'), 'La ficha de la película muestra el botón NAS');
  const ficha = await page.evaluate(() => { renderPuntuacionRow(true, 8); const ancho = innerWidth;
    return { cortados: [...document.querySelectorAll('#d-acciones .d-accion-btn span:last-child')].filter(s => s.scrollWidth > s.clientWidth + 1).map(s => s.textContent),
      notas: [...document.querySelectorAll('#d-puntuacion-row .d-punto')].filter(b => { const r = b.getBoundingClientRect(); return r.right <= ancho && r.left >= 0 && r.width > 20; }).length,
      tituloNota: (document.querySelector('.d-punt-tit') || {}).textContent, sinPoster: document.querySelector('.d-poster-wrap').classList.contains('sin-poster') }; });
  ok(!ficha.cortados.length, 'Ficha: ningún texto de las acciones sale cortado' + (ficha.cortados.length ? ' (' + ficha.cortados.join(', ') + ')' : ''));
  ok(ficha.notas === 10 && ficha.tituloNota === 'Tu nota', `Ficha: «Tu nota» con los 10 números a la vista (${ficha.notas})`);
  ok(ficha.sinPoster, 'Ficha sin póster: hueco limpio en lugar de imagen rota');
  await foto('1-ficha');
  await page.evaluate(() => verFuentesFicha());
  await esperarLista();
  const n0 = await tarjetas().count();
  ok(n0 === 20, `«Ver» muestra 20 resultados de entrada (${n0})`);
  const ver1 = await page.evaluate(() => ({ cuenta: document.querySelector('.fte-cuenta').textContent, addons: document.querySelector('.fte-addons').textContent, nulls: /\bnull\b/.test(document.getElementById('fte-body').textContent), diag: !!document.getElementById('cm-addon-diagnostic') }));
  ok(/\d+ resultados/.test(ver1.cuenta) && /Torrentio · \d+ resultados/.test(ver1.addons) && !ver1.nulls && !ver1.diag, `Resumen en una línea: «${ver1.cuenta}» · «${ver1.addons}», sin el bloque de diagnóstico`);
  ok(await page.isVisible('#fte-body .fte-plegable.hst') && !(await page.$('#fte-body .fte-plegable.hst[open]')) && hosters.length === 0, 'Cinecalidad está plegado al final y no busca hasta abrirlo');
  await foto('1-ver-pelicula');
  await page.click('.fte-mostrar-mas');
  ok(await tarjetas().count() === 40, '«Mostrar más» añade 20 resultados');
  await page.click('.fte-chip:has-text("Castellano")');
  const tagsCast = await page.$$eval('#fte-body .fte-card', cs => cs.map(c => c.querySelector('.fte-tags').textContent));
  ok(tagsCast.length > 0 && tagsCast.every(t => /Castellano/.test(t)), `Filtro «Castellano»: ${tagsCast.length} resultados, todos en castellano`);
  await page.click('.fte-resumen .fte-link:has-text("Quitar filtros")');
  ok(await page.$eval('.fte-chip.on', b => b.textContent) === 'Todos', '«Quitar filtros» vuelve a todos');
  // Resultado con enlace directo (como Torrentio con AllDebrid): «Reproducir» y el resto en «⋯»
  await page.evaluate(() => {
    const s = _fuenteLimpia({ url: location.origin + '/_prueba.webm', name: 'Torrentio\nAD+ 1080p', title: 'The.Matrix.1999.1080p.WEB.VP9.Opus-SPARKS\n👤 812 💾 9.8 GB ⚙️ RARBG\n🇬🇧 / 🇪🇸' });
    document.querySelector('#fte-body .fte-lista').prepend(_fteFila(s, { nombre: 'Torrentio' }, window._fte));
  });
  const prim = await page.$eval('#fte-body .fte-card .fte-btn-prim', b => b.textContent);
  await page.click('#fte-body .fte-card .fte-btn-mas');
  const menu = await page.$$eval('#fte-body .fte-card:first-child .fte-menu-item', xs => xs.map(x => x.textContent.trim()));
  ok(prim === '▶ Reproducir' && menu.some(t => /VLC/.test(t)) && menu.some(t => /Copiar enlace/.test(t)) && menu.some(t => /Descargar/.test(t)), `Con enlace directo: «${prim}» y en «⋯»: ${menu.join(', ')}`);
  ok(await page.$eval('#fte-body .fte-card:first-child .fte-tags', t => /Al instante/.test(t.textContent)), 'Los resultados que el debrid ya tiene llevan «⚡ Al instante»');
  await foto('2-ver-menu');
  // Reproductor integrado con subtítulos
  await page.click('#fte-body .fte-card .fte-btn-prim');
  await esperar(4000);
  const rep = await page.evaluate(() => { const v = document.querySelector('#visor video'); return { activo: document.getElementById('visor').classList.contains('activo'), t: v ? v.currentTime : -1, err: v && v.error ? v.error.code : null }; });
  ok(rep.activo && !rep.err && rep.t > 0.5, 'Reproductor integrado reproduce el vídeo: ' + JSON.stringify(rep));
  await page.click('#visor-subs-btn'); await esperar(800);
  const subs = await page.textContent('#visor-subs');
  ok(/addon de subtítulos/.test(subs), 'Botón «Subtítulos» del reproductor: «' + subs.slice(0, 70) + '…»');
  await foto('3-reproductor');
  await page.click('.visor-cerrar');
  ok(!(await page.isVisible('#visor')), 'El reproductor se cierra con «‹»');
  // ¿Se ve en este navegador? Se decide por el nombre del archivo y lo que admite el navegador
  const compat = await page.evaluate(() => {
    const prueba = n => { const s = _fuenteLimpia({ url: 'https://ejemplo.test/dl/' + n, name: 'Torrentio\nAD+', title: n }); return _fteCompat(s, _fteMetaLimpia(s)); };
    return { mp4: prueba('Peli.2010.1080p.WEB-DL.x264.AAC.mp4'), remux: prueba('Peli.2010.2160p.BluRay.REMUX.HEVC.TrueHD.Atmos.mkv'),
      dts: prueba('Peli.2010.1080p.BluRay.x264.DTS.mkv'), ddp: prueba('Peli.2010.1080p.WEB.H264.DDP5.1.mkv'), mkv: prueba('Peli.2010.1080p.BluRay.x264.mkv'), avi: prueba('Peli.avi') };
  });
  ok(compat.mp4.nivel === 'si' && compat.remux.nivel === 'no' && /TrueHD/.test(compat.remux.motivo) && compat.dts.nivel === 'no' && compat.avi.nivel === 'no',
    'Compatibilidad: MP4 H.264/AAC sí · Remux TrueHD no · DTS no · AVI no');
  ok(compat.mkv.nivel === 'quizas' || compat.mkv.nivel === 'si', 'MKV H.264 con audio sin identificar: ' + compat.mkv.nivel + ' (Chrome abre MKV)');
  console.log('   (DD+ en este navegador: ' + compat.ddp.nivel + (compat.ddp.motivo ? ' · ' + compat.ddp.motivo : '') + ')');
  await page.evaluate(() => {
    const lista = document.querySelector('#fte-body .fte-lista');
    const poner = (n, t) => lista.prepend(_fteFila(_fuenteLimpia({ url: 'https://ejemplo.test/dl/' + n, name: 'Torrentio\n' + t, title: n }), { nombre: 'Torrentio' }, window._fte));
    poner('Peli.2160p.BluRay.REMUX.HEVC.TrueHD.Atmos.mkv', 'AD+ 4k'); poner('Peli.1080p.WEB-DL.x264.AAC.mp4', 'AD+ 1080p');
  });
  const tarjetasCompat = await page.$$eval('#fte-body .fte-card', cs => cs.slice(0, 2).map(c => ({ tags: c.querySelector('.fte-tags').textContent, btn: c.querySelector('.fte-btn-prim').textContent })));
  ok(/Se ve aquí/.test(tarjetasCompat[0].tags) && tarjetasCompat[0].btn === '▶ Reproducir' && /Mejor en VLC/.test(tarjetasCompat[1].tags) && /Abrir en VLC/.test(tarjetasCompat[1].btn),
    `Tarjetas: «${tarjetasCompat[0].btn}» en la compatible y «${tarjetasCompat[1].btn}» en la 4K Remux`);
  await foto('2b-compatibilidad');
  // Si una fuente no arranca, el reproductor lo dice y ofrece otra que sí se vea
  await page.route('**/no-arranca.mkv', () => {});   // nunca responde
  await page.evaluate(() => { window._fteReproducibles = [{ s: { url: location.origin + '/no-arranca.mkv', name: 'Mala' }, a: { nombre: 'T' } }, { s: { url: location.origin + '/_prueba.webm', name: 'Buena' }, a: { nombre: 'T' } }];
    reproducirFuente(window._fteReproducibles[0].s, { ...window._fte, fuente: 'Mala' }); });
  await page.waitForSelector('#visor-error:not([hidden])', { timeout: 20000 }).catch(() => {});
  const aviso12 = await page.textContent('#visor-error');
  ok(/no arranca/.test(aviso12) && await page.isVisible('#visor-error button:has-text("Probar otra que se ve aquí")'), 'Si una fuente no arranca, aviso con «Probar otra que se ve aquí»');
  await foto('3a-no-arranca');
  await page.click('#visor-error button:has-text("Probar otra que se ve aquí")'); await esperar(3500);
  ok(await page.evaluate(() => document.querySelector('#visor video').currentTime > 0.5 && document.getElementById('visor-error').hidden), '«Probar otra» reproduce la siguiente compatible');
  await page.click('.visor-cerrar');

  await page.evaluate(() => cerrarFuentes());

  // 3) NAS de una película: solo torrents, «Que elija el NAS» y sin duplicados
  await page.click('#btn-descargar-nas');
  await page.waitForSelector('#fuentes-modal.activo', { timeout: 5000 });
  ok((await page.textContent('#fte-titulo')).startsWith('Enviar al NAS'), 'NAS en película abre la hoja en modo NAS');
  await esperarLista();
  const botonesNas = await textosBotones();
  ok(botonesNas.length === 20 && botonesNas.every(t => t === 'Enviar al NAS'), `Modo NAS: ${botonesNas.length} torrents con «Enviar al NAS»`);
  ok(await page.isVisible('text=Que elija el NAS') && !(await page.$('#fte-body .fte-plegable.hst')), 'Modo NAS: «Que elija el NAS» y sin Cinecalidad');
  await foto('4-nas-pelicula');
  await page.locator('#fte-body .fte-card .fte-btn-prim').first().click();
  await esperar(800);
  let filas = await db();
  ok(filas.length === 1 && filas[0].tipo === 'movie' && /^[a-f0-9]{40}$/.test(filas[0].info_hash) && filas[0].fuente && filas[0].temporada === null, 'Guarda la película con info_hash y fuente: ' + (filas[0] && filas[0].fuente || '').slice(0, 60));
  ok(!(await page.isVisible('#fuentes-modal.activo')) && /Enviado al NAS/.test(await aviso()), 'La hoja se cierra y sale el aviso: «' + (await aviso()).slice(0, 60) + '»');
  await page.click('#btn-descargar-nas'); await esperarLista();
  await page.locator('#fte-body .fte-card .fte-btn-prim').first().click(); await esperar(800);
  ok((await db()).length === 1 && /Ya está en la cola/.test(await aviso()), 'Pedirla otra vez no la duplica');
  if (await page.isVisible('#fuentes-modal.activo')) await page.evaluate(() => cerrarFuentes());

  // 4) NAS de una serie: temporada completa (packs), capítulos, un capítulo concreto y toda la serie
  await page.evaluate(() => abrirDetalle({ id: 1396, _tipo: 'tv', name: 'Breaking Bad', title: 'Breaking Bad', poster_path: '' }));
  await page.waitForFunction(() => (window.temporadasSeriesActual || []).length > 0, null, { timeout: 15000 }).catch(() => {});
  await page.click('#btn-descargar-nas');
  await esperarLista();
  const chipsSerie = await page.$$eval('#fte-sel .nas-temps .fte-chip', bs => bs.map(b => b.textContent));
  ok(chipsSerie.join(',') === 'Toda la serie,T1,T2,T3,T4,T5', 'Arriba: ' + chipsSerie.join(' · '));
  const generosFicha = await page.$$eval('#p-detalle .ficha-tag', xs => xs.map(x => x.textContent));
  ok(generosFicha.includes('Acción y aventura') && !generosFicha.some(g => /&/.test(g)), 'Géneros de series en español: ' + generosFicha.join(', '));
  const segs = await page.$$eval('#fte-sel .nas-seg-btn', bs => bs.map(b => b.textContent + (b.classList.contains('on') ? '*' : '')));
  ok(segs[0] === 'Temporada completa*' && /^Capítulos \(7\)$/.test(segs[1]), 'Pestañas: ' + segs.join(' · '));
  const packsT1 = await textosBotones();
  const tagsT1 = await page.$$eval('#fte-body .fte-card .fte-tags', ts => ts.map(t => t.textContent));
  ok(packsT1.length > 0 && packsT1.every(t => t === 'Enviar la temporada 1') && tagsT1.every(t => /Temporada( 1)? completa/.test(t)), `Temporada 1: ${packsT1.length} packs de la temporada entera, sin capítulos sueltos`);
  await foto('5-nas-serie-temporada');
  await page.locator('#fte-body .fte-card .fte-btn-prim').first().click(); await esperar(800);
  filas = (await db()).filter(f => f.tipo === 'tv');
  ok(filas.length === 1 && filas[0].temporada === 1 && filas[0].episodio === null && /^[a-f0-9]{40}$/.test(filas[0].info_hash), 'Pack elegido → «temporada 1 completa» con su torrent');
  // «Que elija el NAS» en la temporada 2
  await page.click('#btn-descargar-nas'); await esperarLista();
  await page.click('#fte-sel .fte-chip:has-text("T2")'); await esperarLista();
  ok((await textosBotones()).every(t => t === 'Enviar la temporada 2'), 'Cambiar a T2 muestra los packs de la temporada 2');
  await page.click('#fte-body .nas-intro button:has-text("Que elija el NAS")'); await esperar(800);
  filas = (await db()).filter(f => f.tipo === 'tv');
  ok(filas.some(f => f.temporada === 2 && f.episodio === null && !f.info_hash), '«Que elija el NAS» → una petición de la temporada 2 (el NAS busca el pack)');
  // Capítulos sueltos: marcar varios
  await page.click('#btn-descargar-nas'); await esperarLista();
  await page.click('#fte-sel .nas-seg-btn:has-text("Capítulos")');
  await page.waitForSelector('#fte-body .nas-cap');
  ok(await page.locator('#fte-body .nas-cap').count() === 7, 'Pestaña «Capítulos»: los 7 capítulos de la T1 con su nombre');
  await page.check('#fte-body .nas-cap input[value="2"]'); await page.check('#fte-body .nas-cap input[value="3"]');
  ok((await page.textContent('.nas-enviar-caps')) === 'Enviar 2 capítulos · el NAS elige', 'El botón cuenta los capítulos marcados');
  await foto('6-nas-serie-capitulos');
  await page.click('.nas-enviar-caps'); await esperar(800);
  filas = (await db()).filter(f => f.tipo === 'tv');
  ok(filas.some(f => f.temporada === 1 && f.episodio === 2 && !f.info_hash) && filas.some(f => f.temporada === 1 && f.episodio === 3), 'Capítulos marcados → T1E2 y T1E3 (el NAS elige un torrent de cada uno)');
  // Elegir el torrent de un capítulo concreto
  await page.click('#btn-descargar-nas'); await esperarLista();
  await page.click('#fte-sel .nas-seg-btn:has-text("Capítulos")');
  await page.waitForSelector('#fte-body .nas-cap');
  await page.locator('#fte-body .nas-cap').nth(3).locator('button:has-text("Elegir torrent")').click();
  await esperarLista();
  const botonesEp = await textosBotones();
  const sinPacks = await page.$$eval('#fte-body .fte-card .fte-tags', ts => ts.every(t => !/completa/.test(t.textContent)));
  ok(botonesEp.length > 0 && botonesEp.every(t => t === 'Enviar el capítulo') && sinPacks, `Capítulo 4: ${botonesEp.length} torrents del capítulo suelto, sin packs`);
  const nSin = await page.$eval('.fte-cuenta', e => parseInt(e.textContent));
  await page.check('#fte-body .nas-check input'); await esperarLista();
  const nCon = await page.$eval('.fte-cuenta', e => parseInt(e.textContent));
  ok(nCon > nSin, `«Mostrar también packs» añade los packs (${nSin} → ${nCon})`);
  await page.uncheck('#fte-body .nas-check input'); await esperarLista();
  await foto('7-nas-serie-episodio');
  await page.locator('#fte-body .fte-card .fte-btn-prim').first().click(); await esperar(800);
  filas = (await db()).filter(f => f.tipo === 'tv');
  ok(filas.some(f => f.temporada === 1 && f.episodio === 4 && /^[a-f0-9]{40}$/.test(f.info_hash)), 'Torrent elegido → T1E4 con su torrent');
  // Toda la serie
  await page.click('#btn-descargar-nas'); await esperarLista();
  await page.click('#fte-sel .fte-chip:has-text("Toda la serie")'); await esperarLista();
  const botonesSerie = await textosBotones();
  ok(botonesSerie.length > 0 && botonesSerie.every(t => t === 'Enviar la serie completa') && !(await page.$('#fte-sel .nas-seg')), `Toda la serie: ${botonesSerie.length} packs con todas las temporadas`);
  await foto('8-nas-serie-entera');
  await page.click('#fte-body .nas-intro button:has-text("Que elija el NAS")'); await esperar(800);
  filas = (await db()).filter(f => f.tipo === 'tv' && f.episodio === null);
  const av = await aviso();
  ok([1, 2, 3, 4, 5].every(n => filas.some(f => f.temporada === n)) && /3 temporadas/.test(av) && /2 ya estaban/.test(av), `«Que elija el NAS» en toda la serie → una petición por temporada sin repetir: «${av.slice(0, 80)}»`);

  // 5) «Ver» de un capítulo: un pack se envía como temporada entera, avisándolo
  await page.evaluate(() => abrirFuentesEpisodio(5, 2));
  await esperarLista();
  const verCap = await page.$$eval('#fte-body .fte-card', cs => cs.map(c => ({ tags: c.querySelector('.fte-tags').textContent, btn: (c.querySelector('.fte-btn-prim') || {}).textContent })));
  const unPack = verCap.find(c => /completa/.test(c.tags)), unEp = verCap.find(c => !/completa/.test(c.tags));
  ok(unPack && /^Enviar al NAS la (temporada 5|serie completa)$/.test(unPack.btn) && unEp && unEp.btn === 'Enviar al NAS', `En «Ver», un pack dice «${unPack && unPack.btn}» y un capítulo «${unEp && unEp.btn}»`);
  const idxEp = verCap.findIndex(c => !/completa/.test(c.tags));
  await page.locator('#fte-body .fte-card').nth(idxEp).locator('.fte-btn-prim').click(); await esperar(800);
  ok((await db()).some(f => f.temporada === 5 && f.episodio === 2 && f.info_hash), '«Enviar al NAS» de un capítulo en «Ver» → T5E2');
  ok(/En la cola del NAS \(T5 · E2\)/.test(await page.locator('#fte-body .fte-card').nth(idxEp).locator('.fte-estado').textContent()), 'La tarjeta confirma que está en la cola');
  await page.evaluate(() => cerrarFuentes());

  // 6) Mis descargas: progreso, cancelar, reintentar y quitar
  await page.evaluate(() => {
    const t = window.__db.solicitudes_descarga;
    t.find(f => f.tipo === 'movie').estado = 'completada';
    Object.assign(t.find(f => f.temporada === 1 && f.episodio === 2), { estado: 'error', error_mensaje: 'RDT-Client respondió 500' });
    Object.assign(t.find(f => f.temporada === 1 && f.episodio === 3), { estado: 'sin_fuentes', error_mensaje: 'Solo hay packs con la temporada entera' });
    Object.assign(t.find(f => f.temporada === 1 && f.episodio === null), { estado: 'descargando', progreso: 42.5, velocidad: 3355443, eta: 720, tamano: 2147483648 });
    Object.assign(t.find(f => f.temporada === 1 && f.episodio === 4), { estado: 'descargando', progreso: 12, velocidad: 0, eta: null, tamano: 1e9, error_mensaje: 'Atascada: no descarga nada desde las 14:46' });
  });
  let total = (await db()).length;
  await page.evaluate(() => irA('p-cuenta')); await esperar(400);
  await page.click('#p-cuenta .tu-btn:has-text("Mis descargas")');
  await page.waitForFunction(() => document.querySelectorAll('#nas-lista .nas-card').length > 0, null, { timeout: 5000 }).catch(() => {});
  ok(await page.locator('#nas-lista .nas-card').count() === 2, 'Mis descargas agrupa por título (película + serie)');
  const chips = (await page.locator('.nas-chip').allTextContents()).join(' | ');
  ok(new RegExp('Todas ' + total).test(chips) && /Completadas 1/.test(chips) && /Con problemas 2/.test(chips), 'Resumen por estado: ' + chips);
  ok(/\d+ de \d+ descarga/.test(await page.locator('.nas-barra-txt').first().textContent()), 'La barra dice qué mide: «' + await page.locator('.nas-barra-txt').first().textContent() + '»');
  await page.click('.nas-det summary'); await esperar(300);
  ok(await page.isVisible('text=Temporada 1 completa') && await page.isVisible('text=Motivo: RDT-Client respondió 500'), 'Se ven la temporada completa y el motivo de los errores');
  const prog = await page.locator('.nas-prog-txt').first().textContent();
  ok(/42,5 %/.test(prog) && /3,2 MB\/s/.test(prog) && /quedan 12 min/.test(prog), 'Progreso de la descarga: «' + prog + '»');
  await foto('9-mis-descargas');
  ok(await page.isVisible('.nas-etq-mal:has-text("Atascada")') && await page.isVisible('text=Atascada: no descarga nada'), 'Una descarga atascada sale marcada con su motivo');
  const otro = await page.$('button:has-text("Probar con otro torrent")');
  await otro.click(); await esperar(200); await otro.click(); await esperar(1000);
  const trasOtro = await db();
  ok(trasOtro.find(f => f.temporada === 1 && f.episodio === 4 && f.info_hash).cancelar === true && trasOtro.some(f => f.temporada === 1 && f.episodio === 4 && !f.info_hash && f.estado === 'pendiente'),
    '«Probar con otro torrent» cancela el atascado y pide de nuevo el capítulo');
  const cancelar = await page.$('button:has-text("Cancelar descarga")');
  await cancelar.click(); await esperar(200);
  ok((await cancelar.textContent()).includes('¿Seguro?'), 'Cancelar pide confirmación');
  await cancelar.click(); await esperar(800);
  ok((await db()).find(f => f.temporada === 1 && f.episodio === null).cancelar === true, 'Cancelar marca la solicitud para que el NAS la borre de RDT-Client');
  total = (await db()).length;
  await page.click('button:has-text("Reintentar los 2 con problemas")'); await esperar(1000);
  filas = await db();
  ok(filas.filter(f => f.estado === 'error' || f.estado === 'sin_fuentes').length === 0 && filas.length === total, 'Reintentar vuelve a poner en cola los fallidos');
  await page.click('.nas-chip:has-text("Completadas")'); await esperar(300);
  const quitar = await page.$('button:has-text("Quitar de la lista")');
  await quitar.click(); await esperar(200); await quitar.click(); await esperar(800);
  ok((await db()).length === total - 1, 'Quitar borra la fila tras confirmar');

  console.log(`\n=== ${DISP} ===\n` + resultados.join('\n'));
  ok(!dialogosNativos.length, 'Ninguna ventana alert/confirm/prompt del navegador' + (dialogosNativos.length ? ': ' + dialogosNativos.join(' | ') : ''));
  console.log('Errores de JavaScript en la página:', errores.length ? '\n  ' + errores.join('\n  ') : 'ninguno');
  console.log(fallos ? `\n${fallos} fallos` : '\nTodo correcto');
  console.log('Capturas en:', S);
  await browser.close(); srv.close();
  process.exit(fallos ? 1 : 0);
})().catch(e => { console.log(resultados.join('\n')); console.error('PRUEBA ROTA:', e.message); process.exit(1); });
