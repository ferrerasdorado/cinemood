// CineMood · «No me interesa», biblioteca y logros
// (Parte de index.html; se carga como script clásico: todo comparte el mismo ámbito global.)

    // ══ «NO ME INTERESA»: títulos que no quieres que te vuelvan a recomendar. Se guardan en tu cuenta ══
    const OCULTAS_LS = 'cm:ocultas', OCULTAS_INFO_LS = 'cm:ocultasInfo';
    let _ocultasT = null;
    function ocultasLeer(){ try{ const a = JSON.parse(localStorage.getItem(OCULTAS_LS)||'[]'); return Array.isArray(a) ? a.filter(x=>typeof x==='string') : []; }catch(e){ return []; } }
    function _ocultasInfo(){ try{ return JSON.parse(localStorage.getItem(OCULTAS_INFO_LS)||'{}') || {}; }catch(e){ return {}; } }
    function ocultasGuardar(a){
      try{ localStorage.setItem(OCULTAS_LS, JSON.stringify(a)); }catch(e){}
      window._ocultasSet = new Set(a);
      if(!sesionActual) return;
      clearTimeout(_ocultasT);
      _ocultasT = setTimeout(async ()=>{ try{ await sb.auth.updateUser({ data: { cm_ocultas: a } }); }catch(e){} }, 600);
    }
    function ocultasDesdeCuenta(){
      const r = sesionActual && sesionActual.user && sesionActual.user.user_metadata && sesionActual.user.user_metadata.cm_ocultas;
      if(Array.isArray(r)){ try{ localStorage.setItem(OCULTAS_LS, JSON.stringify(r)); }catch(e){} }
      else if(sesionActual){ const a = ocultasLeer(); if(a.length) ocultasGuardar(a); }
      window._ocultasSet = new Set(ocultasLeer());
    }
    function esOculta(id, tipo){ if(!window._ocultasSet) window._ocultasSet = new Set(ocultasLeer()); return window._ocultasSet.has(`${tipo}:${id}`); }
    function _verPosters(id, tipo, visible){
      document.querySelectorAll('[data-lp]').forEach(el=>{
        if(el.closest('#p-detalle') || el.closest('.lp-menu')) return;
        try{ const x = JSON.parse(decodeURIComponent(el.getAttribute('data-lp'))); if(x.id==id && x.tipo===tipo) el.style.display = visible ? '' : 'none'; }catch(e){}
      });
    }
    // o: {id, tipo, t, poster, f, g}
    function ocultarTitulo(o){
      if(!sesionActual){ mostrarCuenta(); return false; }
      const k = `${o.tipo}:${o.id}`, a = ocultasLeer();
      if(!a.includes(k)) a.push(k);
      ocultasGuardar(a);
      const info = _ocultasInfo(); info[k] = {t:o.t||'', poster:o.poster||'', f:o.f||'', g:o.g||[]};
      try{ localStorage.setItem(OCULTAS_INFO_LS, JSON.stringify(info)); }catch(e){}
      // los géneros sirven para que «Para ti» aprenda qué no te atrae
      if(!(o.g||[]).length) _obtenerGenerosCached(o.tipo, o.id).then(d=>{ if(!d) return; const i = _ocultasInfo(); if(i[k]){ i[k].g = d.genre_ids||[]; try{ localStorage.setItem(OCULTAS_INFO_LS, JSON.stringify(i)); }catch(e){} } }).catch(()=>{});
      _verPosters(o.id, o.tipo, false);
      _avisoDeshacer(`🚫 «${o.t||'Este título'}» ya no te saldrá`, async ()=>{ mostrarTitulo(o.id, o.tipo); });
      if(peliculaActual && peliculaActual.id==o.id && peliculaActual._tipo===o.tipo) _pintarBotonOcultar();
      return true;
    }
    function mostrarTitulo(id, tipo){
      const k = `${tipo}:${id}`;
      ocultasGuardar(ocultasLeer().filter(x=>x!==k));
      _verPosters(id, tipo, true);
      if(peliculaActual && peliculaActual.id==id && peliculaActual._tipo===tipo) _pintarBotonOcultar();
    }
    // Géneros que se repiten en lo que has descartado: «Para ti» les da menos prioridad
    function _generosRechazados(){
      const info = _ocultasInfo(), c = {};
      ocultasLeer().forEach(k=>(info[k]?.g||[]).forEach(g=>{ c[g] = (c[g]||0)+1; }));
      const total = ocultasLeer().length;
      return new Set(Object.entries(c).filter(([,n])=>n>=3 && n>=total*0.3).map(([g])=>Number(g)));
    }
    function _pintarBotonOcultar(visto){
      const b = document.getElementById('btn-ocultar'), p = peliculaActual; if(!b || !p) return;
      if(visto!==undefined) b.dataset.visto = visto ? '1' : '';
      if(b.dataset.visto){ b.style.display = 'none'; return; }
      const oc = esOculta(p.id, p._tipo);
      b.textContent = oc ? '↩️ No me interesa · volver a recomendármela' : '🙅 No me interesa';
      b.classList.toggle('activo', oc);
      b.style.display = 'block';
    }
    function alternarOcultaFicha(){
      const p = peliculaActual; if(!p) return;
      if(esOculta(p.id, p._tipo)){ mostrarTitulo(p.id, p._tipo); return; }
      ocultarTitulo({id:p.id, tipo:p._tipo, t:p.title, poster:p.poster_path, f:p.release_date, g:p.genre_ids || (p.genres||[]).map(x=>x.id)});
    }
    // Pantalla para recuperar lo que descartaste
    async function abrirOcultas(){
      if(!sesionActual){ mostrarCuenta(); return; }
      irA('p-ocultas');
      const cont = document.getElementById('ocultas-cont'), lista = ocultasLeer().slice().reverse(), info = _ocultasInfo();
      if(!lista.length){ cont.innerHTML = '<p class="rk-ayuda">No has descartado nada. Con un toque largo sobre cualquier póster, o desde la ficha, puedes decir «No me interesa» y no te volverá a salir en recomendaciones, búsquedas por ánimo ni tráilers.</p>'; return; }
      cont.innerHTML = '<p class="rk-ayuda">Cargando…</p>';
      const faltan = lista.filter(k=>!info[k] || !info[k].t);
      await _fetchEnLotes(faltan, async k=>{ const [t,id] = k.split(':'); try{ const d = await _tmdbJson(`/${t}/${id}&language=es-ES`); info[k] = {t:d.title||d.name||'', poster:d.poster_path||'', f:d.release_date||d.first_air_date||'', g:(d.genres||[]).map(x=>x.id)}; }catch(e){} }, 6);
      try{ localStorage.setItem(OCULTAS_INFO_LS, JSON.stringify(info)); }catch(e){}
      window._ocultasLista = lista;
      cont.innerHTML = `<p class="rk-ayuda">${lista.length} ${lista.length===1?'título que no te saldrá':'títulos que no te saldrán'} en Para ti, la búsqueda por ánimo, Sorpréndeme ni los tráilers. En la búsqueda por título siguen apareciendo.</p>` + lista.map((k,i)=>{
        const x = info[k]||{}, [t] = k.split(':');
        return `<div class="est-mejor" id="oc-${i}">
          ${x.poster ? `<img loading="lazy" src="https://image.tmdb.org/t/p/w92${x.poster}" alt="">` : '<span class="est-mejor-sin"></span>'}
          <div class="est-mejor-info"><div class="est-mejor-t">${_escHtml(x.t||'Título')}</div><div class="est-mejor-m">${t==='tv'?'Serie':'Película'}${x.f?' · '+String(x.f).slice(0,4):''}</div></div>
          <button type="button" class="ml-secundario" onclick="ocRecuperar(${i})">Volver a mostrar</button></div>`;
      }).join('');
    }
    function ocRecuperar(i){
      const k = (window._ocultasLista||[])[i]; if(!k) return;
      const [t,id] = k.split(':'); mostrarTitulo(id, t);
      const el = document.getElementById('oc-'+i); if(el) el.remove();
    }
    function _pintarBotonAbandonada(){
      const b = document.getElementById('btn-abandonada'); if(!b) return;
      const p = peliculaActual, tv = !!(p && p._tipo==='tv');
      b.style.display = tv ? 'block' : 'none';
      if(!tv) return;
      const ab = esAbandonada(p.id);
      b.textContent = ab ? '↩️ La dejé · volver a seguirla' : '🚫 La dejé';
      b.classList.toggle('activo', ab);
    }
    function alternarAbandonada(){
      const p = peliculaActual; if(!p || p._tipo!=='tv') return;
      if(!sesionActual){ mostrarCuenta(); return; }
      const a = abandonadasLeer(), i = a.indexOf(Number(p.id));
      if(i>=0) a.splice(i,1); else a.push(Number(p.id));
      abandonadasGuardar(a);
      _pintarBotonAbandonada();
      cargarContinuarViendo();
    }
    // ── HOY EN EL CINE: qué se estrenó tal día como hoy hace 1, 5, 10… 70 años (se calcula una vez al día) ──
    async function cargarHoyEnCine(){
      const box = document.getElementById('hoy-cine'); if(!box || !sesionActual) return;
      const hoy = new Date(), dia = hoy.toISOString().slice(0,10), md = dia.slice(5);
      const clave = 'cm:hoyCine:'+dia;
      let lista = null;
      try{ lista = JSON.parse(localStorage.getItem(clave)||'null'); }catch(e){}
      if(!Array.isArray(lista)){
        const anos = [1]; for(let n=5;n<=70;n+=5) anos.push(n);
        const res = await Promise.all(anos.map(n=>{
          const a = hoy.getFullYear()-n;
          return _tmdbJson(`/discover/movie&language=es-ES&primary_release_date.gte=${a}-${md}&primary_release_date.lte=${a}-${md}&sort_by=vote_count.desc&vote_count.gte=300&page=1`)
            .then(d=>(d.results||[]).slice(0,3)).catch(()=>null);
        }));
        if(res.every(r=>r===null)) return; // sin conexión con TMDB: se intentará la próxima vez
        lista = res.filter(Boolean).flat().filter(r=>r.poster_path || r.backdrop_path)
          .map(r=>({id:r.id, t:r.title, f:r.release_date, poster:r.poster_path, fondo:r.backdrop_path, votos:r.vote_count||0, nota:r.vote_average||0}));
        try{
          Object.keys(localStorage).filter(k=>k.startsWith('cm:hoyCine:') && k!==clave).forEach(k=>localStorage.removeItem(k));
          localStorage.setItem(clave, JSON.stringify(lista));
        }catch(e){}
      }
      if(!lista.length){ box.style.display = 'none'; return; }
      const vistos = window.idsVistosSet || new Set(), visto = x=>vistos.has(`${x.id}-movie`);
      // arriba, la más famosa (más votos en TMDB); debajo, el resto por año, de la más antigua a la más reciente
      const [prin, ...otras] = lista.slice().sort((a,b)=>b.votos-a.votos);
      const resto = otras.sort((a,b)=>a.f.localeCompare(b.f));
      lista = [prin, ...resto];
      window._hoyCine = lista;
      const n = hoy.getFullYear() - Number(prin.f.slice(0,4));
      const fecha = new Date(prin.f+'T12:00:00').toLocaleDateString('es-ES', {day:'numeric', month:'long', year:'numeric'});
      box.innerHTML = `<div class="hoy-cine-card" onclick="abrirHoyCine(0)" style="background-image:linear-gradient(180deg,rgba(0,0,0,0.1),rgba(0,0,0,0.85)),url(https://image.tmdb.org/t/p/w780${prin.fondo||prin.poster})">
          <div class="hoy-cine-k">🎂 Tal día como hoy · hace ${n} ${n===1?'año':'años'}</div>
          <div class="hoy-cine-t">${_escHtml(prin.t)}</div>
          <div class="hoy-cine-s">Se estrenó el ${fecha}${visto(prin)?' · ✓ La has visto':''}</div>
        </div>
        ${resto.length ? `<div class="hoy-cine-mas">También un ${hoy.toLocaleDateString('es-ES',{day:'numeric', month:'long'})}</div>
          <div class="hoy-cine-fila">${resto.slice(0,8).filter(x=>x.poster).map(x=>`<button type="button" class="hoy-cine-mini" onclick="abrirHoyCine(${lista.indexOf(x)})" ${_lp({id:x.id,tipo:'movie',t:x.t,poster:x.poster,f:x.f})}>
            <img loading="lazy" src="https://image.tmdb.org/t/p/w154${x.poster}" alt="${_escHtml(x.t)}">
            <span class="hoy-cine-mini-t">${_escHtml(x.t)}</span><span class="hoy-cine-mini-a">${x.f.slice(0,4)} (hace ${hoy.getFullYear()-Number(x.f.slice(0,4))} ${hoy.getFullYear()-Number(x.f.slice(0,4))===1?'año':'años'})${visto(x)?' · ✓':''}</span></button>`).join('')}</div>` : ''}`;
      box.style.display = 'block';
      const fila = box.querySelector('.hoy-cine-fila'); if(fila) requestAnimationFrame(()=>{ fila.scrollLeft = 0; }); // la fila empieza por la más antigua
    }
    function abrirHoyCine(i){
      const x = (window._hoyCine||[])[i];
      if(x) abrirDetalle({id:x.id, _tipo:'movie', title:x.t, poster_path:x.poster, release_date:x.f, vote_average:x.nota});
    }
    // ── MI RANKING POR NIVELES (S, A, B, C, D) con lo que has visto. Se guarda en tu cuenta ──
    const RK_NIVELES = [['S','#d64545'],['A','#e8833a'],['B','#e3b341'],['C','#5aa469'],['D','#4a7fc1']];
    const RANKING_LS = 'cm:ranking';
    let _rankingT = null, _rk = {vistos:[], tipo:'todo', sel:null};
    function rankingLeer(){
      try{ const o = JSON.parse(localStorage.getItem(RANKING_LS)||'{}'); return (o && typeof o==='object') ? o : {}; }catch(e){ return {}; }
    }
    function rankingGuardar(o){
      try{ localStorage.setItem(RANKING_LS, JSON.stringify(o)); }catch(e){}
      if(!sesionActual) return;
      clearTimeout(_rankingT);
      _rankingT = setTimeout(async ()=>{ try{ await sb.auth.updateUser({ data: { cm_ranking: o } }); }catch(e){} }, 800);
    }
    function rankingDesdeCuenta(){
      const r = sesionActual && sesionActual.user && sesionActual.user.user_metadata && sesionActual.user.user_metadata.cm_ranking;
      if(r && typeof r==='object'){ try{ localStorage.setItem(RANKING_LS, JSON.stringify(r)); }catch(e){} }
      else if(sesionActual){ const o = rankingLeer(); if(Object.keys(o).length) rankingGuardar(o); }
    }
    async function abrirRanking(){
      if(!sesionActual){ mostrarCuenta(); return; }
      irA('p-ranking');
      document.getElementById('rk-niveles').innerHTML = '<p class="rk-ayuda">Cargando lo que has visto…</p>';
      document.getElementById('rk-pool').innerHTML = '';
      const { data, error } = await sb.from('mi_biblioteca').select('tmdb_id,tipo,titulo,poster_path,anio,puntuacion').eq('user_id', sesionActual.user.id).eq('visto', true);
      if(error){ document.getElementById('rk-niveles').innerHTML = '<p class="rk-ayuda">No se pudo cargar tu lista. Inténtalo de nuevo.</p>'; return; }
      _rk.vistos = (data||[]).filter(x=>x.poster_path).map(x=>({...x, k:`${x.tipo}:${x.tmdb_id}`}));
      _rk.sel = null;
      rkPintar();
    }
    function rkTipo(t){
      _rk.tipo = t; _rk.sel = null;
      document.querySelectorAll('#rk-tipo .punt-chip').forEach(c=>c.classList.toggle('active', c.dataset.tipo===t));
      rkPintar();
    }
    function rkPintar(){
      const o = rankingLeer(), porK = new Map(_rk.vistos.map(x=>[x.k, x]));
      const visible = x => x && (_rk.tipo==='todo' || x.tipo===_rk.tipo);
      const colocados = new Set();
      const poster = (x, i) => `<button type="button" class="rk-poster${_rk.sel===x.k?' sel':''}" onclick="event.stopPropagation();rkElegir('${x.k}')" title="${_escHtml(x.titulo)}"><img loading="lazy" src="https://image.tmdb.org/t/p/w92${x.poster_path}" alt="${_escHtml(x.titulo)}"></button>`;
      document.getElementById('rk-niveles').innerHTML = RK_NIVELES.map(([n,c])=>{
        const lista = (o[n]||[]).map(k=>porK.get(k)).filter(visible);
        (o[n]||[]).forEach(k=>colocados.add(k));
        return `<div class="rk-fila" onclick="rkSoltar('${n}')"><div class="rk-etq" style="background:${c}">${n}</div><div class="rk-posters">${lista.map(poster).join('')}</div></div>`;
      }).join('');
      const pool = _rk.vistos.filter(x=>visible(x) && !colocados.has(x.k)).sort((a,b)=>(b.puntuacion||0)-(a.puntuacion||0) || String(a.titulo).localeCompare(String(b.titulo),'es'));
      document.getElementById('rk-pool').innerHTML = pool.length ? pool.map(poster).join('') : '<span class="rk-vacio">¡Todo colocado!</span>';
      document.getElementById('rk-n').textContent = pool.length;
    }
    // Coloca solo lo que está «Sin colocar» (lo que ya pusiste a mano no se toca; S queda para ti):
    // con tu nota → 10: A · 8-9: B · 7: C · ≤6: D. Sin nota → nota media de TMDB: ≥8: B · 7-7,9: C · <7: D
    async function rkAutoColocar(){
      const btn = document.getElementById('rk-auto'), original = btn.textContent;
      const o = rankingLeer(), colocados = new Set(RK_NIVELES.flatMap(([n])=>o[n]||[]));
      const pendientes = _rk.vistos.filter(x=>!colocados.has(x.k));
      if(!pendientes.length){ _aviso('Ya está todo colocado.'); return; }
      btn.disabled = true; btn.textContent = `⏳ Colocando ${pendientes.length} títulos…`;
      try{
        window._detalleIdCache = window._detalleIdCache || {};
        const notaTmdb = await _fetchEnLotes(pendientes, async x=>{
          if(x.puntuacion!=null) return null;
          const k = `${x.tipo}:${x.tmdb_id}`;
          try{ const d = window._detalleIdCache[k] || await _tmdbJson(`/${x.tipo}/${x.tmdb_id}&language=es-ES`); if(d && d.id) window._detalleIdCache[k] = d; return d && d.vote_average; }catch(e){ return null; }
        }, 8);
        const nivelDe = (x, i) => {
          if(x.puntuacion!=null){ const n = Number(x.puntuacion); return n>=10 ? 'A' : n>=8 ? 'B' : n>=7 ? 'C' : 'D'; }
          const t = notaTmdb[i]; if(t==null) return null; // sin datos: se queda sin colocar
          return t>=8 ? 'B' : t>=7 ? 'C' : 'D';
        };
        // dentro de cada nivel, de mejor a peor nota
        const asignados = pendientes.map((x,i)=>({x, n:nivelDe(x,i), orden:x.puntuacion!=null ? Number(x.puntuacion) : (notaTmdb[i]||0)/1.0001}))
          .filter(a=>a.n).sort((a,b)=>b.orden-a.orden);
        const nuevo = rankingLeer();
        asignados.forEach(a=>{ (nuevo[a.n] = nuevo[a.n] || []).push(a.x.k); });
        rankingGuardar(nuevo);
        rkPintar();
        const sinDatos = pendientes.length - asignados.length;
        btn.textContent = `✓ ${asignados.length} colocados${sinDatos ? ` · ${sinDatos} sin datos` : ''}`;
        setTimeout(()=>{ btn.textContent = original; btn.disabled = false; }, 2500);
      }catch(e){ btn.textContent = original; btn.disabled = false; _aviso('No se pudo completar. Inténtalo de nuevo.', true); }
    }
    function rkElegir(k){ _rk.sel = _rk.sel===k ? null : k; rkPintar(); }
    function rkSoltar(nivel){
      const k = _rk.sel; if(!k) return;
      const o = rankingLeer();
      RK_NIVELES.forEach(([n])=>{ if(o[n]) o[n] = o[n].filter(x=>x!==k); });
      if(nivel!=='pool') (o[nivel] = o[nivel] || []).push(k);
      rankingGuardar(o);
      _rk.sel = null;
      rkPintar();
    }
    // Imagen para compartir: una fila por nivel con sus pósters
    async function compartirRanking(){
      const btn = document.getElementById('rk-compartir'), original = btn.textContent;
      const o = rankingLeer(), porK = new Map(_rk.vistos.map(x=>[x.k, x]));
      const filas = RK_NIVELES.map(([n,c])=>({n, c, lista:(o[n]||[]).map(k=>porK.get(k)).filter(x=>x && (_rk.tipo==='todo' || x.tipo===_rk.tipo))}));
      if(!filas.some(f=>f.lista.length)){ _aviso('Coloca algún título en un nivel para poder compartir tu ranking.'); return; }
      btn.textContent = '⏳ Generando…';
      try{
        const W = 1080, PW = 100, PH = 150, GAP = 8, ETQ = 120, M = 40, porFila = Math.floor((W - M*2 - ETQ - GAP) / (PW + GAP));
        const alto = f => Math.max(1, Math.ceil(f.lista.length / porFila)) * (PH + GAP) + GAP;
        const H = 170 + filas.reduce((t,f)=>t + alto(f) + 10, 0) + 70;
        const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
        const ctx = cv.getContext('2d');
        ctx.fillStyle = '#121413'; ctx.fillRect(0,0,W,H);
        ctx.fillStyle = '#f5f3ef'; ctx.font = '800 54px sans-serif'; ctx.textAlign = 'left';
        ctx.fillText('Mi ranking', M, 90);
        ctx.fillStyle = '#9a9d96'; ctx.font = '400 26px sans-serif';
        ctx.fillText(_rk.tipo==='movie' ? 'Películas' : _rk.tipo==='tv' ? 'Series' : 'Películas y series', M, 132);
        const cargar = src => new Promise(res=>{ const im = new Image(); im.crossOrigin = 'anonymous'; im.onload = ()=>res(im); im.onerror = ()=>res(null); im.src = src; });
        let y = 170;
        for(const f of filas){
          const h = alto(f);
          ctx.fillStyle = f.c; roundRect(ctx, M, y, ETQ, h, 10); ctx.fill();
          ctx.fillStyle = '#ffffff'; ctx.font = '800 64px sans-serif'; ctx.textAlign = 'center';
          ctx.fillText(f.n, M + ETQ/2, y + h/2 + 22); ctx.textAlign = 'left';
          ctx.fillStyle = '#1c1f1d'; roundRect(ctx, M + ETQ + GAP, y, W - M*2 - ETQ - GAP, h, 10); ctx.fill();
          const imgs = await Promise.all(f.lista.map(x=>cargar(`https://image.tmdb.org/t/p/w185${x.poster_path}`)));
          imgs.forEach((im, i)=>{
            const px = M + ETQ + GAP*2 + (i % porFila) * (PW + GAP), py = y + GAP + Math.floor(i / porFila) * (PH + GAP);
            if(im) ctx.drawImage(im, px, py, PW, PH); else { ctx.fillStyle = '#2a2d2b'; ctx.fillRect(px, py, PW, PH); }
          });
          y += h + 10;
        }
        ctx.fillStyle = '#6b6e68'; ctx.font = '400 24px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('CineMood · ferrerasdorado.github.io/cinemood', W/2, H - 30);
        const blob = await new Promise(res=>cv.toBlob(res, 'image/png'));
        const archivo = new File([blob], 'mi-ranking-cinemood.png', {type:'image/png'});
        let hecho = false;
        if(navigator.canShare && navigator.canShare({files:[archivo]})){
          try{ await navigator.share({files:[archivo], title:'Mi ranking · CineMood'}); }catch(e){}
          hecho = true;
        }
        if(!hecho){ const u = URL.createObjectURL(blob), a = document.createElement('a'); a.href = u; a.download = archivo.name; a.click(); setTimeout(()=>URL.revokeObjectURL(u), 3000); }
      }catch(e){ _aviso('No se pudo generar la imagen. Inténtalo de nuevo.', true); }
      finally{ btn.textContent = original; }
    }
    // ══ LOGROS ══════════════════════════════════════════════════════════════
    // Más de 100 logros por categorías (géneros, épocas, países, autores, rutas, curiosidades…), con bronce, plata y oro,
    // logros ocultos, un nivel de cinéfilo y aviso al desbloquear. Cada logro propone un título concreto para avanzar.
    // Se calculan con datos de tus vistos guardados en el dispositivo (año, país, idioma, géneros, votos, director, duración).
    // ── Logros desactivados por ahora: no se ven ni se calculan. Para recuperarlos, poner true ──
    // (los datos de cada título, cm:li2, se siguen usando en estadísticas, filtros de Mi lista y Tu año)
    var LOGROS_VISIBLES = false;
    const LI_PREFIJO = 'cm:li2:';
    function _guardarInfoLogro(tipo, id, pak){
      const info = _infoDesdePak(tipo, pak); if(!info) return null;
      try{ localStorage.setItem(`${LI_PREFIJO}${tipo}:${id}`, JSON.stringify(info)); }catch(e){}
      return info;
    }
    function _infoDesdePak(tipo, pak){
      if(!pak || !pak.detalle || !pak.detalle.id) return null;
      const d = pak.detalle, cr = pak.creditos || {};
      const fecha = d.release_date || d.first_air_date || '';
      const dir = tipo==='movie' ? (cr.crew||[]).find(c=>c.job==='Director') : (d.created_by||[])[0];
      const info = {y: fecha ? Number(fecha.slice(0,4)) : null, l: d.original_language || null,
        p: [...new Set([...(d.origin_country||[]), ...(d.production_countries||[]).map(c=>c.iso_3166_1)])].slice(0,3),
        g: (d.genres||[]).map(x=>x.id), vc: d.vote_count||0, va: d.vote_average||0,
        r: d.runtime || 0, ns: d.number_of_seasons || 0,
        d: dir ? {id: dir.id, n: dir.name} : null};
      return info;
    }
    function _leerInfoLogro(tipo, id){ try{ return JSON.parse(localStorage.getItem(`${LI_PREFIJO}${tipo}:${id}`)||'null'); }catch(e){ return null; } } // versión anterior
    async function _vistosConInfo(completar, progreso){
      const { data, error } = await sb.from('mi_biblioteca').select('tmdb_id,tipo,titulo,puntuacion').eq('user_id', sesionActual.user.id).eq('visto', true);
      if(error) throw error;
      const vistos = (data||[]).map(v=>({...v, info:_leerInfoLogro(v.tipo, v.tmdb_id)}));
      const faltan = vistos.filter(v=>!v.info);
      if(completar && faltan.length){
        let hechos = 0;
        await _fetchEnLotes(faltan, async v=>{
          v.info = _guardarInfoLogro(v.tipo, v.tmdb_id, await _fetchDetalleYCreditos(v.tipo, v.tmdb_id));
          if(progreso) progreso(++hechos, faltan.length);
        }, 6);
      }
      return vistos;
    }
    const _idioma = c => { try{ return _NOMBRE_IDIOMA ? _NOMBRE_IDIOMA.of(c) : c; }catch(e){ return c; } };
    const _logrosEvitar = new Set(); // lo ya sugerido en esta pantalla, para no repetir
    async function _sugerirDiscover(ruta, vistosSet, tipo='movie'){
      for(const pag of [1,2,3]){
        try{
          const r = (await _tmdbJson(`/discover/${tipo}&language=es-ES&sort_by=vote_count.desc&${ruta}&page=${pag}`)).results||[];
          const x = r.find(y=>y.poster_path && !vistosSet.has(`${y.id}-${tipo}`) && !_logrosEvitar.has(`${y.id}-${tipo}`));
          if(x) return {id:x.id, _tipo:tipo, title:x.title||x.name, poster_path:x.poster_path, release_date:x.release_date||x.first_air_date, vote_average:x.vote_average};
        }catch(e){}
      }
      return null;
    }
    const LG_GENEROS = {28:['💥','acción','Adrenalina'],12:['🧭','aventura','Aventurero'],16:['🎨','animación','Animado'],35:['😂','comedia','Risa fácil'],80:['🕵️','crimen','Bajos fondos'],99:['🎥','documental','Documentalista'],18:['🎭','drama','Dramático'],10751:['👨‍👩‍👧','familiar','En familia'],14:['🧙','fantasía','Mundos fantásticos'],36:['📜','historia','Historiador'],27:['👻','terror','Sin miedo'],10402:['🎵','música','Melómano'],9648:['🔎','misterio','Detective'],10749:['💕','romance','Romántico empedernido'],878:['🚀','ciencia ficción','Explorador espacial'],53:['😰','thriller','Al borde del asiento'],10752:['🪖','bélico','Veterano'],37:['🤠','western','Pistolero']};
    const LG_PAISES = [['JP','🇯🇵','Japón'],['KR','🇰🇷','Corea del Sur'],['FR','🇫🇷','Francia'],['IT','🇮🇹','Italia'],['GB','🇬🇧','Reino Unido'],['ES','🇪🇸','España'],['MX','🇲🇽','México'],['DE','🇩🇪','Alemania'],['AR','🇦🇷','Argentina'],['DK','🇩🇰','Dinamarca'],['SE','🇸🇪','Suecia'],['IN','🇮🇳','India'],['CN','🇨🇳','China'],['AU','🇦🇺','Australia'],['CA','🇨🇦','Canadá'],['IE','🇮🇪','Irlanda']];
    const LG_CATEGORIAS = [['constancia','Constancia'],['generos','Géneros'],['epocas','Épocas'],['mundo','Por el mundo'],['autores','Autores'],['rutas','Rutas y sagas'],['curiosidades','Curiosidades'],['ranking','Tu ranking']];
    function _calcularLogros(vistos){
      const conInfo = vistos.filter(v=>v.info), pelis = conInfo.filter(v=>v.tipo==='movie'), series = vistos.filter(v=>v.tipo==='tv');
      const vistosSet = new Set(vistos.map(v=>`${v.tmdb_id}-${v.tipo}`));
      const anioHoy = new Date().getFullYear();
      const lista = [];
      // niveles: [bronce, plata, oro] o [n] para logros de una sola medalla (valen como oro)
      const L = (cat, id, emoji, nombre, desc, valor, niveles, sugerir, extra={}) => {
        const nivel = niveles.length===1 ? (valor>=niveles[0] ? 3 : 0) : niveles.filter(n=>valor>=n).length;
        const meta = niveles.length===1 ? niveles[0] : niveles[Math.min(nivel,2)];
        const base = niveles.length===1 || nivel===0 ? 0 : niveles[nivel-1];
        lista.push({cat, id, emoji, nombre, desc, valor, niveles, nivel, meta, faltan: nivel>=3 ? 0 : Math.max(0, meta-valor),
          progreso: nivel>=3 ? 1 : Math.max(0, Math.min(1, (valor-base)/Math.max(1, meta-base))), sugerir, unico: niveles.length===1, ...extra});
      };
      const disc = (ruta, tipo='movie') => async()=>{ const x = await _sugerirDiscover(ruta, vistosSet, tipo); return x && {x, texto:'Prueba con'}; };
      // ── Constancia
      const horas = Math.round(pelis.reduce((t,v)=>t+(v.info.r||0),0)/60);
      const puntuados = vistos.filter(v=>v.puntuacion!=null);
      L('constancia','pelis','🎬','Cinéfilo','Películas vistas.', vistos.filter(v=>v.tipo==='movie').length, [25,100,250], disc('vote_average.gte=8'));
      L('constancia','series','📺','Seriéfilo','Series vistas.', series.length, [5,15,30], disc('vote_average.gte=8.2&vote_count.gte=1500&without_genres=16,10762,10764,10767','tv'));
      L('constancia','horas','⏱️','Horas de butaca','Horas de películas vistas.', horas, [50,150,400], disc('with_runtime.gte=150&vote_average.gte=7.8'));
      L('constancia','critico','⭐','Crítico','Títulos vistos con nota.', puntuados.length, [25,75,150], async()=>{
        const v = vistos.find(v=>v.puntuacion==null); return v && {x:{id:v.tmdb_id, _tipo:v.tipo, title:v.titulo}, texto:'Ponle nota a'}; });
      L('constancia','dieces','💯','Generoso','Títulos a los que has puesto un 10.', puntuados.filter(v=>Number(v.puntuacion)>=10).length, [5,10,20]);
      // ── Géneros
      Object.entries(LG_GENEROS).forEach(([g,[emo,nom,titulo]])=>{
        L('generos','g'+g, emo, titulo, `Películas de ${nom}.`, pelis.filter(v=>(v.info.g||[]).includes(Number(g))).length, [5,15,30], disc(`with_genres=${g}&vote_average.gte=7.3`));
      });
      const generos = new Set(pelis.flatMap(v=>v.info.g||[]));
      L('generos','todoterreno','🎭','Todoterreno','Géneros distintos.', generos.size, [8,12,16], async()=>{
        const g = Object.keys(LG_GENEROS).map(Number).find(x=>!generos.has(x)); if(!g) return null;
        const x = await _sugerirDiscover(`with_genres=${g}&vote_average.gte=7.3`, vistosSet); return x && {x, texto:`Te falta ${LG_GENEROS[g][1]}:`}; });
      // ── Épocas
      for(let d=1930; d<=2020; d+=10){
        const n = conInfo.filter(v=>v.info.y && Math.floor(v.info.y/10)*10===d).length;
        L('epocas','d'+d, d<1970 ? '🎞️' : d<2000 ? '📼' : '💿', `Los años ${String(d).slice(2)}`, `Títulos de los años ${String(d).slice(2)} (${d}–${d+9}).`, n, d<1970 ? [1,5,10] : [3,10,25],
          disc(`primary_release_date.gte=${d}-01-01&primary_release_date.lte=${d+9}-12-31&vote_average.gte=7.5`));
      }
      const decadas = new Set(conInfo.map(v=>v.info.y && Math.floor(v.info.y/10)*10).filter(Boolean));
      L('epocas','decadas','🕰️','Viaje por las décadas','Décadas distintas.', decadas.size, [4,6,8]);
      L('epocas','clasicos','🏛️','Clásicos','Películas anteriores a 1970.', pelis.filter(v=>v.info.y && v.info.y<1970).length, [3,10,25], disc('primary_release_date.lte=1969-12-31&vote_average.gte=7.8'));
      L('epocas','estreno','🍿','Recién salido del horno',`Películas de ${anioHoy}.`, pelis.filter(v=>v.info.y===anioHoy).length, [1,5,10], disc(`primary_release_year=${anioHoy}&vote_average.gte=6.8`));
      // ── Por el mundo
      const paises = new Set(conInfo.flatMap(v=>v.info.p||[]));
      LG_PAISES.forEach(([c,flag,nom])=>{
        L('mundo','p'+c, flag, nom, `Títulos de ${nom}.`, conInfo.filter(v=>(v.info.p||[]).includes(c)).length, [1,5,10], disc(`with_origin_country=${c}&vote_average.gte=7.3`));
      });
      L('mundo','paises','🌍','Vuelta al mundo','Países distintos.', paises.size, [5,10,20]);
      const idiomas = new Set(conInfo.map(v=>v.info.l).filter(Boolean));
      L('mundo','idiomas','🗣️','Políglota','Idiomas originales distintos.', idiomas.size, [3,6,10], async()=>{
        const l = ['ja','ko','fr','it','de','da','sv','fa','hi','pt','zh'].find(x=>!idiomas.has(x)); if(!l) return null;
        const x = await _sugerirDiscover(`with_original_language=${l}&vote_average.gte=7.5`, vistosSet); return x && {x, texto:`Algo en ${_idioma(l)}:`}; });
      // ── Autores
      const porDirector = {};
      pelis.forEach(v=>{ const d = v.info.d; if(d){ (porDirector[d.id] = porDirector[d.id] || {n:d.n, vistos:0}).vistos++; } });
      const sugDirector = id => async()=>{
        try{
          const c = ((await _tmdbJson(`/person/${id}/movie_credits&language=es-ES`)).crew||[])
            .filter(m=>m.job==='Director' && m.poster_path && (m.vote_count||0)>=150 && !vistosSet.has(`${m.id}-movie`) && !_logrosEvitar.has(`${m.id}-movie`)).sort((a,b)=>(b.vote_count||0)-(a.vote_count||0))[0];
          return c && {x:{id:c.id, _tipo:'movie', title:c.title, poster_path:c.poster_path, release_date:c.release_date, vote_average:c.vote_average}, texto:'Siguiente:'};
        }catch(e){ return null; }
      };
      L('autores','autores','🎬','Cine de autor','Directores con al menos 3 películas vistas.', Object.values(porDirector).filter(x=>x.vistos>=3).length, [2,5,10]);
      Object.entries(porDirector).filter(([,x])=>x.vistos>=2).sort((a,b)=>b[1].vistos-a[1].vistos).forEach(([id,x])=>{
        L('autores','dir'+id,'🎥',x.n,`Películas de ${x.n} que has visto.`, x.vistos, [3,5,8], sugDirector(id));
      });
      // ── Rutas y sagas (los Especiales)
      let completas = 0;
      ESPECIALES.filter(e=>!e.dinamico && e.items.length).forEach(e=>{
        const total = e.items.length, n = e.items.filter(it=>it.tmdb_id && vistosSet.has(`${it.tmdb_id}-${it.tipo}`)).length;
        if(n===total) completas++;
        L('rutas','e-'+e.id, e.emoji, e.titulo, `Títulos vistos de este especial (${total}).`, n, [Math.ceil(total*0.25), Math.ceil(total*0.5), total], async()=>{
          const it = e.items.find(it=>it.tmdb_id && !vistosSet.has(`${it.tmdb_id}-${it.tipo}`)); if(!it) return null;
          return {x:{id:it.tmdb_id, _tipo:it.tipo, title:it.t, release_date:it.f||''}, texto:'Siguiente de la lista:'};
        }, {especial:e.id});
      });
      L('rutas','rutas','🗺️','Rutas completadas','Especiales vistos de principio a fin.', completas, [1,3,6]);
      // ── Curiosidades (algunas ocultas hasta conseguirlas)
      L('curiosidades','joyas','💎','Buscador de joyas','Películas muy bien valoradas pero poco conocidas.', pelis.filter(v=>v.info.va>=7.3 && v.info.vc>=100 && v.info.vc<1500).length, [3,8,15], disc('vote_average.gte=7.6&vote_count.gte=300&vote_count.lte=1500&with_runtime.gte=70'));
      L('curiosidades','taquillazos','🎟️','Taquillazos','Películas que ha visto medio mundo (más de 20.000 votos en TMDB).', pelis.filter(v=>v.info.vc>=20000).length, [10,25,50], disc('vote_count.gte=20000'));
      L('curiosidades','arqueologo','🏺','Arqueólogo','Una película anterior a 1940.', pelis.filter(v=>v.info.y && v.info.y<1940).length, [1], disc('primary_release_date.lte=1939-12-31&vote_average.gte=7.8'), {oculto:true, pista:'Algo muy, muy antiguo…'});
      L('curiosidades','maraton','🛋️','Culo de hierro','Una película de más de 3 horas.', pelis.filter(v=>v.info.r>=180).length, [1], disc('with_runtime.gte=180&vote_average.gte=7.5'), {oculto:true, pista:'Prepara palomitas para rato…'});
      L('curiosidades','corta','⚡','Exprés','Tres películas de menos de 90 minutos.', pelis.filter(v=>v.info.r>0 && v.info.r<90).length, [3], disc('with_runtime.lte=89&with_runtime.gte=70&vote_average.gte=7.5'), {oculto:true, pista:'Cuando hay poco tiempo…'});
      L('curiosidades','contracorriente','🙃','A contracorriente','Suspendiste (5 o menos) algo que el público adora (8 o más).', puntuados.filter(v=>Number(v.puntuacion)<=5 && v.info && v.info.va>=8).length, [1], null, {oculto:true, pista:'No siempre opinas como la mayoría…'});
      L('curiosidades','placer','🫣','Placer culpable','Un 10 para algo que el público suspende (menos de 6,5).', puntuados.filter(v=>Number(v.puntuacion)>=10 && v.info && v.info.va>0 && v.info.va<6.5).length, [1], null, {oculto:true, pista:'Hay películas que solo tú entiendes…'});
      L('curiosidades','sagaslargas','📚','Series largas','Series de 5 temporadas o más.', conInfo.filter(v=>v.tipo==='tv' && v.info.ns>=5).length, [1,3,6], disc('vote_average.gte=8&vote_count.gte=1000&without_genres=16,10762,10764,10767','tv'));
      // ── Tu ranking
      const rk = rankingLeer(), colocados = new Set(RK_NIVELES.flatMap(([n])=>rk[n]||[]));
      L('ranking','enS','🏆','Lo mejor de lo mejor','Títulos en el nivel S de tu ranking.', (rk.S||[]).length, [5,10,20]);
      L('ranking','rkcompleto','🧩','Todo en su sitio','Todo lo que has visto, colocado en tu ranking.', vistos.length && vistos.every(v=>colocados.has(`${v.tipo}:${v.tmdb_id}`)) ? 1 : 0, [1]);
      return lista;
    }
    // Nivel de cinéfilo: bronce 1, plata 2, oro 3 puntos (los de una medalla valen 3)
    // Nivel de cinéfilo: bronce 1, plata 2, oro 3 puntos (los de una medalla valen 3).
    // Cada nivel cuesta un poco más que el anterior: 10, 15, 20, 25… puntos.
    const LG_TITULOS = ['Espectador','Aficionado','Asiduo','Cinéfilo','Cinéfilo de culto','Crítico','Programador de filmoteca','Director de festival','Académico','Leyenda del cine','Filmoteca andante','Maestro del séptimo arte'];
    function _nivelCinefilo(logros){
      const xp = logros.reduce((t,l)=>t+l.nivel, 0);
      let nivel = 1, desde = 0, coste = 10;
      while(xp >= desde+coste && nivel < LG_TITULOS.length){ desde += coste; nivel++; coste += 5; }
      const max = nivel>=LG_TITULOS.length;
      return {xp, nivel, titulo:LG_TITULOS[nivel-1], progreso: max ? 1 : (xp-desde)/coste, falta: max ? 0 : desde+coste-xp};
    }
    const _MEDALLA = ['','🥉','🥈','🥇'];
    let _lgFiltro = 'progreso';
    async function abrirLogros(){
      if(!LOGROS_VISIBLES) return;
      if(!sesionActual){ mostrarCuenta(); return; }
      irA('p-logros');
      const est = document.getElementById('lg-estado');
      est.textContent = 'Analizando lo que has visto…'; document.getElementById('lg-lista').innerHTML = ''; document.getElementById('lg-cabecera').innerHTML = '';
      let vistos;
      try{ vistos = await _vistosConInfo(true, (h,t)=>{ est.textContent = `Analizando lo que has visto… ${h} de ${t}`; }); }
      catch(e){ est.textContent = 'No se pudo cargar tu lista. Inténtalo de nuevo.'; return; }
      window._logrosActuales = _calcularLogros(vistos);
      _guardarLogrosConseguidos(window._logrosActuales);
      est.textContent = '';
      _pintarLogros();
    }
    function lgFiltrar(f){ _lgFiltro = f; _pintarLogros(); }
    function _pintarLogros(){
      const logros = window._logrosActuales || []; if(!logros.length) return;
      const nv = _nivelCinefilo(logros), conseguidos = logros.filter(l=>l.nivel>0).length, ocultos = logros.filter(l=>l.oculto);
      document.getElementById('lg-cabecera').innerHTML = `
        <div class="lg-nivel"><div class="lg-nivel-n">Nivel ${nv.nivel}</div><div class="lg-nivel-t">${nv.titulo}</div>
          <div class="lg-barra"><div style="width:${Math.round(nv.progreso*100)}%"></div></div>
          <div class="lg-meta">${nv.xp} puntos · ${nv.falta ? `${nv.falta} para el nivel ${nv.nivel+1}` : 'nivel máximo'} · ${conseguidos} de ${logros.length} logros con medalla</div></div>
        <div class="punt-row lg-filtros">${[['progreso','En progreso'],['conseguidos','Conseguidos'],['todos','Todos'],['ocultos',`Ocultos · ${ocultos.filter(l=>l.nivel>0).length}/${ocultos.length}`]].map(([k,t])=>`<div class="punt-chip${_lgFiltro===k?' active':''}" onclick="lgFiltrar('${k}')">${t}</div>`).join('')}</div>`;
      const pasa = l => _lgFiltro==='todos' ? true : _lgFiltro==='conseguidos' ? l.nivel>0 : _lgFiltro==='ocultos' ? l.oculto : (l.nivel<3 && (!l.oculto || l.nivel>0) && (l.valor>0 || l.cat!=='rutas'));
      const idx = new Map(logros.map((l,i)=>[l,i]));
      document.getElementById('lg-lista').innerHTML = LG_CATEGORIAS.map(([cat,titulo])=>{
        let ls = logros.filter(l=>l.cat===cat && pasa(l));
        if(_lgFiltro==='progreso') ls = ls.sort((a,b)=>b.progreso-a.progreso);
        if(!ls.length) return '';
        return `<div class="section-label lg-sec">${titulo} · ${ls.length}</div>` + ls.map(l=>{
          const i = idx.get(l), secreto = l.oculto && l.nivel===0;
          return `<div class="lg-card${l.nivel>=3?' oro':''}${secreto?' secreto':''}" onclick="lgAbrir(${i}, this)">
            <div class="lg-cab"><span class="lg-emoji">${secreto ? '❔' : l.emoji}</span>
              <div class="lg-tit"><div class="lg-nombre">${secreto ? '???' : _escHtml(l.nombre)} ${l.unico && l.nivel ? '🏅' : _MEDALLA[l.nivel]}</div>
                <div class="lg-desc">${secreto ? _escHtml(l.pista||'Logro oculto') : _escHtml(l.desc)}</div></div>
              ${secreto ? '' : `<div class="lg-valor">${l.valor}${l.nivel<3?`<span>/${l.meta}</span>`:''}</div>`}</div>
            ${secreto ? '' : `<div class="lg-barra"><div style="width:${Math.round(l.progreso*100)}%"></div></div>`}
            <div class="lg-sug" id="lg-sug-${i}" hidden></div>
          </div>`;
        }).join('');
      }).join('') || '<p class="rk-ayuda">Nada por aquí con este filtro.</p>';
    }
    // Al tocar un logro: detalle y una sugerencia concreta para avanzar
    async function lgAbrir(i, el){
      const l = (window._logrosActuales||[])[i], box = document.getElementById(`lg-sug-${i}`); if(!l || !box) return;
      if(!box.hidden){ box.hidden = true; return; }
      box.hidden = false;
      if(l.oculto && l.nivel===0){ box.innerHTML = '<span class="lg-cargando">Es un logro oculto: descubre qué es consiguiéndolo.</span>'; return; }
      const meta = l.nivel>=3 ? (l.unico ? '¡Conseguido!' : '¡Oro conseguido!') : l.unico ? `${l.faltan} más para conseguirlo` : `${l.faltan} más para ${['el bronce','la plata','el oro'][l.nivel]} · niveles ${l.niveles.join(' / ')}`;
      if(l.nivel>=3 || !l.sugerir){ box.innerHTML = `<span class="lg-cargando">${meta}</span>`; return; }
      box.innerHTML = `<span class="lg-cargando">${meta} · buscando una sugerencia…</span>`;
      let s = null; try{ s = await l.sugerir(); }catch(e){}
      if(!s){ box.innerHTML = `<span class="lg-cargando">${meta}</span>`; return; }
      _logrosEvitar.add(`${s.x.id}-${s.x._tipo}`);
      window._logrosSug[i] = s.x;
      box.innerHTML = `<span class="lg-cargando">${meta}</span><button type="button" onclick="event.stopPropagation();abrirDetalle(_logrosSug[${i}])"><span class="lg-pista">${_escHtml(s.texto)}</span> <b>${_escHtml(s.x.title)}</b>${s.x.release_date?` (${String(s.x.release_date).slice(0,4)})`:''} →</button>`;
    }
    // ── Logros conseguidos: se recuerdan para avisar cuando se desbloquea uno nuevo
    const LG_CONSEGUIDOS_LS = 'cm:logrosConseguidos';
    function _guardarLogrosConseguidos(logros){
      const m = {}; logros.forEach(l=>{ if(l.nivel) m[l.id] = l.nivel; });
      try{ localStorage.setItem(LG_CONSEGUIDOS_LS, JSON.stringify(m)); }catch(e){}
    }
    async function _comprobarLogrosNuevos(p){
      if(!LOGROS_VISIBLES) return;
      if(!sesionActual || !p) return;
      let antes; try{ antes = JSON.parse(localStorage.getItem(LG_CONSEGUIDOS_LS)||'null'); }catch(e){ antes = null; }
      try{
        if(!_leerInfoLogro(p._tipo, p.id)) _guardarInfoLogro(p._tipo, p.id, await _fetchDetalleYCreditos(p._tipo, p.id));
        const vistos = await _vistosConInfo(false);
        if(vistos.filter(v=>v.info).length < vistos.length*0.85) return; // aún sin datos suficientes
        const logros = _calcularLogros(vistos);
        _guardarLogrosConseguidos(logros);
        if(!antes) return; // primera vez: solo se toma nota
        const nuevos = logros.filter(l=>l.nivel > (antes[l.id]||0));
        if(nuevos.length) _avisoLogro(nuevos);
      }catch(e){}
    }
    function _avisoLogro(nuevos){
      const l = nuevos[0], medalla = l.unico ? '🏅' : _MEDALLA[l.nivel], nombreNivel = l.unico ? '' : ` · ${['','bronce','plata','oro'][l.nivel]}`;
      let t = document.getElementById('lg-aviso');
      if(!t){ t = document.createElement('div'); t.id = 'lg-aviso'; t.className = 'lg-aviso'; t.onclick = ()=>{ t.classList.remove('on'); abrirLogros(); }; document.body.appendChild(t); }
      t.innerHTML = `<span class="lg-emoji">${l.emoji}</span><div><div class="lg-aviso-k">${medalla} ¡Logro desbloqueado!${nuevos.length>1?` (+${nuevos.length-1})`:''}</div><div class="lg-aviso-t">${_escHtml(l.nombre)}${nombreNivel}</div></div>`;
      t.classList.add('on');
      clearTimeout(t._tm); t._tm = setTimeout(()=>t.classList.remove('on'), 5000);
    }
    // En Inicio: el logro más cerca de su siguiente medalla, con su sugerencia (solo con datos ya guardados)
    async function cargarLogroDestacado(){
      const box = document.getElementById('logro-destacado'); if(!box || !sesionActual) return;
      if(!LOGROS_VISIBLES){ box.style.display = 'none'; return; }
      try{
        const vistos = await _vistosConInfo(false);
        if(!vistos.length || vistos.filter(v=>v.info).length < vistos.length*0.85){ box.style.display='none'; return; }
        const candidatos = _calcularLogros(vistos).filter(l=>l.nivel<3 && !l.oculto && l.sugerir && l.id!=='critico' && l.valor>0).sort((a,b)=>b.progreso-a.progreso || a.faltan-b.faltan);
        for(const l of candidatos.slice(0,4)){
          const s = await l.sugerir(); if(!s) continue;
          window._logroDestacado = s.x;
          const para = l.unico ? 'para conseguir' : `para ${['el bronce','la plata','el oro'][l.nivel]} en`;
          box.innerHTML = `<div class="logro-dest" onclick="abrirDetalle(_logroDestacado)">
            <span class="lg-emoji">${l.emoji}</span>
            <div><div class="logro-dest-k">${l.faltan===1 ? 'Te falta 1' : `Te faltan ${l.faltan}`} ${para} «${_escHtml(l.nombre)}»</div>
            <div class="logro-dest-t">${_escHtml(s.texto)} <b>${_escHtml(s.x.title)}</b></div></div>
            <span class="logro-dest-ir">›</span></div>`;
          box.style.display = 'block';
          return;
        }
        box.style.display = 'none';
      }catch(e){ box.style.display='none'; }
    }
