// CineMood · prueba de extremo a extremo de «Ver», «NAS» y «Mis descargas»
//
// Abre la app en un Chrome automático (como un iPhone o como un ordenador) y recorre lo que haría una persona:
// instalar un addon, elegir un torrent y enviarlo al NAS, pedir una temporada o capítulos sueltos,
// revisar «Mis descargas» y reproducir un vídeo en el reproductor integrado.
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
        st.filas.forEach(r => t.push({ id: 'id' + (sig++), user_id: sesionActual.user.id, estado: 'pendiente', error_mensaje: null, info_hash: null, fuente: null, creada_en: ahora, actualizada_en: ahora, ...r }));
        return { data: null, error: null };
      }
      if (st.op === 'delete') {
        const borrar = t.filter(r => coincide(r) && ['pendiente', 'completada', 'error', 'sin_fuentes'].includes(r.estado));
        db.solicitudes_descarga = t.filter(r => !borrar.includes(r));
        return { data: null, error: null };
      }
      const data = t.filter(coincide).sort((a, b) => b.creada_en.localeCompare(a.creada_en));
      return { data: st.uno ? (data[0] || null) : data, error: null };
    };
    const api = new Proxy({}, { get(_, k) {
      if (k === 'then') return (res, rej) => Promise.resolve().then(run).then(res, rej);
      if (k === 'insert' || k === 'upsert') return filas => { st.op = k === 'insert' ? 'insert' : 'upsert'; st.filas = Array.isArray(filas) ? filas : [filas]; return api; };
      if (k === 'delete' || k === 'update') return () => { st.op = k; return api; };
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
  const errores = [];
  page.on('pageerror', e => errores.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|supabase|ERR_/.test(m.text())) errores.push('console: ' + m.text().slice(0, 200)); });
  // TMDB simulado (el proxy real exige sesión): Matrix y Breaking Bad (5 temporadas, 62 capítulos)
  const EPS = {1:7, 2:13, 3:13, 4:13, 5:16};
  await page.route('**/functions/v1/tmdb-proxy**', route => {
    const u = new URL(route.request().url()), ruta = u.searchParams.get('path') || '';
    let d = {};
    if (/^\/movie\/603\/external_ids/.test(ruta)) d = { imdb_id: 'tt0133093' };
    else if (/^\/tv\/1396\/external_ids/.test(ruta)) d = { imdb_id: 'tt0903747' };
    else if (/^\/tv\/1396\/season\/(\d+)/.test(ruta)) { const n = +ruta.match(/season\/(\d+)/)[1]; d = { season_number: n, episodes: Array.from({ length: EPS[n] || 0 }, (_, i) => ({ episode_number: i + 1, name: 'Capítulo ' + (i + 1), air_date: '2010-01-0' + (1 + i % 9) })) }; }
    else if (/^\/tv\/1396(\?|$|&)/.test(ruta) || ruta === '/tv/1396') d = { id: 1396, name: 'Breaking Bad', number_of_seasons: 5, number_of_episodes: 62, genres: [], seasons: [{ season_number: 0, episode_count: 3 }, ...Object.entries(EPS).map(([n, c]) => ({ season_number: +n, episode_count: c, name: 'Temporada ' + n }))] };
    else if (/^\/movie\/603(\?|$|&)/.test(ruta) || ruta === '/movie/603') d = { id: 603, title: 'Matrix', release_date: '1999-03-30', runtime: 136, genres: [] };
    else d = { results: [], cast: [], crew: [], episodes: [] };
    route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(d) });
  });
  const foto = n => page.screenshot({ path: `${S}/e2e-${DISP.replace(/ /g, '_')}-${n}.png` });
  const db = () => page.evaluate(() => window.__db.solicitudes_descarga);
  const aviso = () => page.evaluate(() => { const t = document.getElementById('nas-aviso'); return t && t.classList.contains('on') ? t.textContent : ''; });
  const esperar = ms => page.waitForTimeout(ms);

  await page.goto(URL_APP, { waitUntil: 'load' });
  await esperar(3000);
  await page.evaluate(instalarDbFalsa);

  // 1) Addon público de Torrentio (sin debrid), instalado desde la pantalla «Mis addons»
  await page.evaluate(() => abrirAddons());
  await page.fill('#addon-url', 'https://torrentio.strem.fun/manifest.json');
  await page.click('#addon-btn');
  await page.waitForFunction(() => addonsLeer().length > 0, null, { timeout: 20000 }).catch(() => {});
  ok(await page.evaluate(() => addonsLeer().length > 0), 'Instalar el addon Torrentio desde «Mis addons»');

  // 2) Película: ficha → botón NAS → modo NAS (elegir torrent)
  await page.evaluate(() => abrirDetalle({ id: 603, _tipo: 'movie', title: 'Matrix', poster_path: '' }));
  await esperar(3500);
  ok(await page.isVisible('#btn-descargar-nas'), 'La ficha de la película muestra el botón NAS');
  await page.click('#btn-descargar-nas');
  await page.waitForSelector('#fuentes-modal.activo', { timeout: 5000 });
  ok((await page.textContent('#fte-titulo')).startsWith('Enviar al NAS'), 'NAS en película abre la hoja en modo NAS');
  await page.waitForFunction(() => /Búsqueda terminada/.test(document.getElementById('fte-body').textContent), null, { timeout: 30000 }).catch(() => {});
  const nTorrents = await page.locator('#fte-body button:has-text("Enviar al NAS")').count();
  ok(nTorrents > 0, `Modo NAS lista torrents con «Enviar al NAS» (${nTorrents})`);
  ok(await page.isVisible('text=Que elija el NAS automáticamente'), 'Modo NAS ofrece «Que elija el NAS automáticamente»');
  await foto('1-nas-pelicula');
  await page.locator('#fte-body button:has-text("Enviar al NAS")').first().click();
  await esperar(800);
  let filas = await db();
  ok(filas.length === 1 && filas[0].tipo === 'movie' && /^[a-f0-9]{40}$/.test(filas[0].info_hash) && filas[0].fuente && filas[0].temporada === null,
    'Enviar al NAS guarda la película con info_hash y fuente: ' + JSON.stringify(filas.map(f => ({ h: (f.info_hash || '').slice(0, 8), fuente: (f.fuente || '').slice(0, 40) }))));
  ok(!(await page.isVisible('#fuentes-modal.activo')), 'La hoja se cierra tras enviar');
  ok(/Enviado al NAS/.test(await aviso()), 'Aviso propio (no alert): «' + (await aviso()).slice(0, 80) + '»');
  await foto('2-aviso');
  // Repetir la misma película → no se duplica
  await page.click('#btn-descargar-nas');
  await page.waitForFunction(() => /Búsqueda terminada/.test(document.getElementById('fte-body').textContent), null, { timeout: 30000 }).catch(() => {});
  await page.locator('#fte-body button:has-text("Enviar al NAS")').first().click();
  await esperar(800);
  ok((await db()).length === 1 && /Ya está en la cola/.test(await aviso()), 'Pedir otra vez la misma película no la duplica: «' + (await aviso()).slice(0, 60) + '»');
  if (await page.isVisible('#fuentes-modal.activo')) await page.evaluate(() => cerrarFuentes());

  // 3) «Ver» de la película: Enviar al NAS junto al resto de acciones
  await page.evaluate(() => verFuentesFicha());
  await page.waitForFunction(() => /Búsqueda terminada/.test(document.getElementById('fte-body').textContent), null, { timeout: 30000 }).catch(() => {});
  const nVer = await page.locator('#fte-body button:has-text("Enviar al NAS")').count();
  ok(nVer > 0 && (await page.textContent('#fte-titulo')) === 'Matrix', `«Ver» muestra «Enviar al NAS» en los torrents (${nVer})`);
  await foto('3-ver-pelicula');
  await page.evaluate(() => cerrarFuentes());

  // 4) Serie: pop-up con las tres opciones
  await page.evaluate(() => abrirDetalle({ id: 1396, _tipo: 'tv', name: 'Breaking Bad', title: 'Breaking Bad', poster_path: '' }));
  await page.waitForFunction(() => (window.temporadasSeriesActual || []).length > 0, null, { timeout: 15000 }).catch(() => {});
  await page.click('#btn-descargar-nas');
  await page.waitForSelector('#nas-modal', { state: 'visible' });
  ok(await page.locator('#nas-body input[name=nas-modo]').count() === 3, 'El pop-up de series tiene las tres opciones');
  const txtSerie = await page.textContent('#nas-enviar');
  ok(/62 capítulos/.test(txtSerie), 'El botón dice cuántos capítulos se piden: «' + txtSerie + '»');
  await page.check('#nas-body input[value=temporada]');
  await page.selectOption('#nas-temp', '2');
  await foto('4-popup-temporada');
  await page.click('#nas-enviar');
  await page.waitForFunction(() => document.getElementById('nas-modal').style.display === 'none', null, { timeout: 15000 }).catch(() => {});
  filas = (await db()).filter(f => f.tipo === 'tv');
  ok(filas.length === 13 && filas.every(f => f.temporada === 2 && f.episodio >= 1), `Temporada completa (T2) → ${filas.length} capítulos, uno por fila`);
  // Capítulos sueltos
  await page.click('#btn-descargar-nas');
  await page.check('#nas-body input[value=sueltos]');
  await page.selectOption('#nas-temp', '1');
  await page.check('#nas-body .nas-ep input[value="1"]');
  await page.check('#nas-body .nas-ep input[value="3"]');
  ok((await page.textContent('#nas-enviar')) === 'Solicitar 2 capítulos de la T1', 'Capítulos sueltos: el botón cuenta los marcados');
  await foto('5-popup-sueltos');
  await page.click('#nas-enviar');
  await esperar(1000);
  filas = (await db()).filter(f => f.tipo === 'tv');
  ok(filas.length === 15 && filas.some(f => f.temporada === 1 && f.episodio === 3), 'Capítulos sueltos → 2 filas más (T1E1, T1E3)');
  // Serie completa: no repite lo que ya está en cola
  await page.click('#btn-descargar-nas');
  await page.check('#nas-body input[value=serie]');
  await page.click('#nas-enviar');
  await page.waitForFunction(() => document.getElementById('nas-modal').style.display === 'none', null, { timeout: 20000 }).catch(() => {});
  filas = (await db()).filter(f => f.tipo === 'tv');
  const av = await aviso();
  ok(filas.length === 62 && /47 capítulos/.test(av) && /15 ya estaban/.test(av), `Serie completa → ${filas.length} en total, sin duplicar: «${av.slice(0, 90)}»`);

  // 5) «Ver» en un capítulo: Enviar al NAS manda ese capítulo
  await page.evaluate(() => abrirFuentesEpisodio(5, 2));
  await page.waitForFunction(() => /Búsqueda terminada/.test(document.getElementById('fte-body').textContent), null, { timeout: 30000 }).catch(() => {});
  const nEp = await page.locator('#fte-body button:has-text("Enviar al NAS")').count();
  ok(nEp > 0, `«Ver» de un capítulo (T5E2) muestra «Enviar al NAS» (${nEp})`);
  await foto('6-ver-capitulo');
  if (nEp) {
    await page.locator('#fte-body button:has-text("Enviar al NAS")').first().click();
    await esperar(800);
    const t5e2 = (await db()).filter(f => f.temporada === 5 && f.episodio === 2);
    ok(t5e2.length === 1, 'T5E2 ya estaba (serie completa) y no se duplica: «' + (await aviso()).slice(0, 60) + '»');
    const est = await page.locator('#fte-body .fte-vlc-ayuda').first().textContent();
    ok(/En la cola del NAS \(T5 · E2\)/.test(est), 'La fila indica que está en la cola: «' + est.slice(0, 50) + '»');
  }
  await page.evaluate(() => cerrarFuentes());

  // 6) Mis descargas
  await page.evaluate(() => {
    const t = window.__db.solicitudes_descarga;
    t.find(f => f.tipo === 'movie').estado = 'completada';
    const e = t.find(f => f.temporada === 1 && f.episodio === 1); e.estado = 'error'; e.error_mensaje = 'RDT-Client respondió 500';
    t.find(f => f.temporada === 2 && f.episodio === 1).estado = 'descargando';
    t.find(f => f.temporada === 3 && f.episodio === 1).estado = 'sin_fuentes';
  });
  await page.evaluate(() => irA('p-cuenta'));
  await esperar(500);
  await page.click('text=Mis descargas del NAS');
  await page.waitForFunction(() => document.querySelectorAll('#nas-lista .nas-card').length > 0, null, { timeout: 5000 }).catch(() => {});
  ok(await page.locator('#nas-lista .nas-card').count() === 2, 'Mis descargas agrupa por título (película + serie)');
  const chips = (await page.locator('.nas-chip').allTextContents()).join(' | ');
  ok(/Todas 63/.test(chips) && /Completadas 1/.test(chips) && /Con problemas 2/.test(chips), 'Resumen por estado: ' + chips);
  await foto('7-mis-descargas');
  await page.click('.nas-det summary');
  await esperar(300);
  ok(await page.isVisible('text=Motivo: RDT-Client respondió 500'), 'Se ve el motivo del error');
  ok(await page.isVisible('text=no se puede quitar hasta que termine'), 'Lo que se está descargando no se puede quitar');
  await foto('8-mis-descargas-detalle');
  await page.click('button:has-text("Reintentar los 2 con problemas")');
  await esperar(1000);
  filas = await db();
  ok(filas.filter(f => f.estado === 'error' || f.estado === 'sin_fuentes').length === 0 && filas.length === 63, 'Reintentar vuelve a poner en cola los fallidos');
  await page.click('.nas-chip:has-text("Completadas")');
  await esperar(300);
  const quitar = await page.$('button:has-text("Quitar de la lista")');
  await quitar.click(); await esperar(200);
  ok((await quitar.textContent()).includes('¿Seguro?'), 'Quitar pide confirmación');
  await quitar.click(); await esperar(800);
  ok((await db()).length === 62, 'Quitar borra la fila tras confirmar');

  // 7) Reproductor embebido con un vídeo directo (webm de prueba)
  await page.evaluate(() => reproducirFuente({ url: location.origin + '/_prueba.webm', name: 'Prueba', description: '' }, { tipo: 'movie', tmdbId: 603, titulo: 'Prueba', fuente: 'Prueba' }));
  await esperar(5000);
  const rep = await page.evaluate(() => { const v = document.querySelector('#visor video'); return { activo: document.getElementById('visor').classList.contains('activo'), t: v ? v.currentTime : -1, err: v && v.error ? v.error.code : null }; });
  ok(rep.activo && !rep.err && rep.t > 0.5, 'Reproductor embebido abre el vídeo: ' + JSON.stringify(rep));
  await foto('9-reproductor');

  console.log(`\n=== ${DISP} ===\n` + resultados.join('\n'));
  console.log('Errores de JavaScript en la página:', errores.length ? '\n  ' + errores.join('\n  ') : 'ninguno');
  console.log(fallos ? `\n${fallos} fallos` : '\nTodo correcto');
  console.log('Capturas en:', S);
  await browser.close(); srv.close();
  process.exit(fallos ? 1 : 0);
})().catch(e => { console.log(resultados.join('\n')); console.error('PRUEBA ROTA:', e.message); process.exit(1); });
