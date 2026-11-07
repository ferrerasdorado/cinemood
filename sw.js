// CineMood · service worker
// 1) La app se guarda en el móvil y se abre al instante (aunque haya poca cobertura).
//    Cada vez que se abre, se descarga la versión nueva en segundo plano; si ha cambiado, la app ofrece «Actualizar».
// 2) Avisos (notificaciones push).
const CACHE = 'cinemood-v1';
const BASICOS = ['index.html', 'manifest.json', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'icon.svg'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(BASICOS)).catch(() => {}).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

async function avisarNuevaVersion() {
  const ventanas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  ventanas.forEach(v => v.postMessage({ tipo: 'nueva-version' }));
}
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return; // TMDB, Supabase, imágenes… van directas
  const esPagina = req.mode === 'navigate' || url.pathname.endsWith('/index.html') || url.pathname === new URL('./', self.registration.scope).pathname;
  const clave = esPagina ? new URL('index.html', self.registration.scope).href : req.url;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE), guardada = await cache.match(clave);
    const textoGuardado = esPagina && guardada ? guardada.clone().text() : null; // se lee antes de entregarla a la pantalla
    // (una petición de navegación no se puede reutilizar con opciones: se pide por su dirección)
    const red = fetch(req.url, { cache: 'no-store', credentials: 'same-origin' }).then(async r => {
      if (r && r.ok && r.type === 'basic') {
        if (esPagina && guardada) {
          const [nuevo, viejo] = await Promise.all([r.clone().text(), textoGuardado]);
          if (nuevo !== viejo) { await cache.put(clave, r.clone()); avisarNuevaVersion(); }
        } else await cache.put(clave, r.clone());
      }
      return r;
    }).catch(() => null);
    if (guardada) { e.waitUntil(red); return guardada; }
    return (await red) || new Response('Sin conexión', { status: 503 });
  })());
});

self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { title: 'CineMood', body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'CineMood', {
    body: d.body || '', icon: 'icon-192.png', badge: 'icon-192.png', tag: d.tag || undefined, data: { url: d.url || './' }
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || './', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(ventanas => {
    for (const v of ventanas) { if ('focus' in v) { if ('navigate' in v) v.navigate(url).catch(() => {}); return v.focus(); } }
    return self.clients.openWindow(url);
  }));
});
