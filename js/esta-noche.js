// CineMood · Esta noche
// (Parte de index.html; se carga como script clásico: todo comparte el mismo ámbito global.)

    // ══ ESTA NOCHE: lo que más te va a gustar de lo que tienes en tus plataformas, a la medida de tu tiempo ══
    function _nocheOpts(){
      let o = null; try{ o = JSON.parse(localStorage.getItem('cm:noche')||'null'); }catch(e){}
      o = o || {}; const prov = _descPlataforma();
      return {min: [0,90,120,150].includes(o.min) ? o.min : 0, tipo: ['movie','tv','todo'].includes(o.tipo) ? o.tipo : 'todo', plats: Array.isArray(o.plats) ? o.plats : (prov ? [prov] : [])};
    }
    function _nocheMomento(){ const h = new Date().getHours(); return h<6 ? 'Esta noche' : h<14 ? 'Hoy' : h<20 ? 'Esta tarde' : 'Esta noche'; }
    const _nocheHora = min => { const d = new Date(Date.now()+min*60e3); return d.toLocaleTimeString('es-ES', {hour:'2-digit', minute:'2-digit'}); };
    async function _nocheMazo(forzar){
      const o = _nocheOpts(), uid = sesionActual?.user.id; if(!uid) return null;
      const clave = `cm:nocheMazo:${uid}:${JSON.stringify(o)}`;
      if(!forzar){
        if(window._noche && window._noche.clave===clave && Date.now()-window._noche.t < 30*60e3) return window._noche;
        try{ const c = JSON.parse(sessionStorage.getItem(clave)||'null'); if(c && Date.now()-c.t < 30*60e3){ window._noche = c; return c; } }catch(e){}
      }
      const m = await _modeloNotaObtener().catch(()=>null);
      if(!m || !m.fit) return {clave, t:Date.now(), mazo:[], sinModelo:true, notas: m ? m.muestras.length : 0}; // (con menos de 8 notas)
      const plats = o.plats.length ? o.plats : DESC_PLATAFORMAS.map(x=>x[0]).filter(Boolean);
      const pq = `&watch_region=ES&with_watch_providers=${plats.join('|')}&with_watch_monetization_types=flatrate`;
      const tipos = o.tipo==='todo' ? ['movie','tv'] : [o.tipo], rutas = [];
      tipos.forEach(t=>{
        const rt = t==='movie' ? `&with_runtime.gte=65${o.min ? `&with_runtime.lte=${o.min}` : ''}` : '';
        const sin = t==='movie' ? '99,10770' : '10763,10764,10767,99';
        [1,2,3].forEach(pg=>rutas.push([t, `/discover/${t}&language=es-ES${pq}${rt}&without_genres=${sin}&sort_by=popularity.desc&vote_count.gte=${t==='movie'?150:80}&page=${pg}`]));
        [1,2].forEach(pg=>rutas.push([t, `/discover/${t}&language=es-ES${pq}${rt}&without_genres=${sin}&sort_by=vote_average.desc&vote_count.gte=${t==='movie'?600:250}&page=${pg}`]));
      });
      const listas = await Promise.all(rutas.map(([t,r])=>_tmdbJson(r).then(d=>(d.results||[]).map(x=>({...x, _tipo:t, title:x.title||x.name, release_date:x.release_date||x.first_air_date}))).catch(()=>[])));
      let pend = [];
      try{ const r = await sb.from('mi_biblioteca').select('tmdb_id,tipo,titulo,poster_path,anio,visto,pendiente').eq('user_id', uid).eq('pendiente', true); pend = (r.data||[]).filter(x=>!x.visto && tipos.includes(x.tipo)); }catch(e){}
      const vistos = window.idsVistosSet || new Set(), ya = new Set(), cands = [];
      const meter = x => { const k = `${x.id}-${x._tipo}`; if(ya.has(k) || vistos.has(k) || esOculta(x.id, x._tipo) || (x._tipo==='tv' && esAbandonada(x.id))) return; ya.add(k); cands.push(x); };
      pend.forEach(x=>meter({id:x.tmdb_id, _tipo:x.tipo, title:x.titulo, poster_path:x.poster_path, release_date:x.anio ? x.anio+'-01-01' : '', _pend:true}));
      listas.flat().filter(x=>x.backdrop_path || x.poster_path).forEach(meter);
      const rapida = x => { const v = _notaRapida(x); return (v==null ? m.fit.media : v) + (x._pend ? 0.35 : 0); };
      const top = cands.map(x=>({x, v:rapida(x)})).sort((a,b)=>b.v-a.v).slice(0,16).map(o=>o.x);
      const nombresPlat = {}; DESC_PLATAFORMAS.forEach(([id,n])=>{ if(id) nombresPlat[id] = n; });
      const mazo = (await _fetchEnLotes(top, async x=>{
        try{
          const [pak, prov] = await Promise.all([_fetchDetalleYCreditos(x._tipo, x.id), _tmdbJson(`/${x._tipo}/${x.id}/watch/providers`).catch(()=>({}))]);
          const d = pak && pak.detalle; if(!d || !d.id) return null;
          const enES = ((prov.results||{}).ES||{}).flatrate || [];
          const donde = enES.filter(pv=>plats.includes(String(pv.provider_id)));
          if(!donde.length) return null;
          const dur = x._tipo==='movie' ? (d.runtime||0) : ((d.episode_run_time||[])[0] || d.last_episode_to_air?.runtime || 0);
          if(x._tipo==='movie' && o.min && dur > o.min) return null;
          const info = _infoDesdePak(x._tipo, pak); _piGuardar(x._tipo, x.id, info);
          const pr = _notaPredecir(m.fit, x._tipo, info); if(!pr) return null;
          window._prevCache.set(`${x.id}-${x._tipo}`, {t:m.t, v:pr.nota});
          const fuertes = pr.partes.filter(q=>q.a>=0.15).sort((a,b)=>b.a-a.a).slice(0,2);
          const dirs = {}; if(info.d?.id) dirs[info.d.id] = info.d.n;
          const porque = await Promise.all(fuertes.map(q=>_notaNombreRasgo(q.k, dirs)));
          return {id:x.id, _tipo:x._tipo, title:d.title||d.name||x.title, poster_path:d.poster_path||x.poster_path, backdrop_path:d.backdrop_path||x.backdrop_path, release_date:d.release_date||d.first_air_date||'',
            vote_average:d.vote_average, nota:pr.nota, score:pr.nota+(x._pend?0.35:0), pend:!!x._pend, dur, temps:d.number_of_seasons||0,
            generos:(d.genres||[]).slice(0,2).map(g=>g.name), donde: donde.slice(0,2).map(pv=>({n: nombresPlat[String(pv.provider_id)] || pv.provider_name, logo: pv.logo_path})), porque};
        }catch(e){ return null; }
      }, 5)).filter(Boolean).sort((a,b)=>b.score-a.score);
      const res = {clave, t:Date.now(), mazo, i:0};
      window._noche = res; try{ sessionStorage.setItem(clave, JSON.stringify(res)); }catch(e){}
      return res;
    }
    function _nocheTarjeta(x, enInicio){
      const fin = x._tipo==='movie' && x.dur ? `Dura ${formatDuracion(x.dur)} · si empiezas ya, acabas a las ${_nocheHora(x.dur)}` : x._tipo==='tv' ? `Serie${x.temps ? ` de ${x.temps} ${x.temps===1?'temporada':'temporadas'}` : ''}${x.dur ? ` · episodios de ${x.dur} min` : ''}` : '';
      const donde = x.donde.map(d=>`${d.logo ? `<img src="https://image.tmdb.org/t/p/w92${d.logo}" alt="">` : ''}${_escHtml(d.n)}`).join(' · ');
      const img = x.backdrop_path ? `https://image.tmdb.org/t/p/w1280${x.backdrop_path}` : `https://image.tmdb.org/t/p/w780${x.poster_path}`;
      const porque = x.porque.length ? `Porque te suele gustar ${x.porque.map(_escHtml).join(' y ')}` : '';
      return `<div class="noche-hero" style="background-image:url('${img}')" onclick="nocheFicha()">
        <div class="noche-in">
          <div class="noche-k">🌙 ${_nocheMomento()}${enInicio ? ', te propongo' : ''}${x.pend ? ' · 🔖 de tu lista' : ''}</div>
          <div class="noche-t">${_escHtml(x.title)}</div>
          <span class="noche-nota">🔮 Le pondrías un <b>${_notaFmt(x.nota)}</b></span>
          <div class="noche-m">${donde ? `En ${donde}` : ''}${fin ? `<br>${_escHtml(fin)}` : ''}${x.generos.length ? `<br>${_escHtml([(x.release_date||'').slice(0,4), ...x.generos].filter(Boolean).join(' · '))}` : ''}</div>
          ${porque ? `<div class="noche-porque">${porque}</div>` : ''}
          <div class="noche-b">
            <button type="button" class="noche-btn principal" onclick="event.stopPropagation();nocheFicha()">▶ ¡Esta!</button>
            <button type="button" class="noche-btn" onclick="event.stopPropagation();${enInicio ? 'abrirEstaNoche()' : 'nocheOtra()'}">${enInicio ? 'Más ideas ›' : 'Otra ›'}</button>
            ${enInicio ? '' : `<button type="button" class="noche-btn" onclick="event.stopPropagation();nocheNoMeInteresa()">🙅 No me interesa</button>`}
          </div>
        </div></div>`;
    }
    function _nocheVacia(r){
      if(r && r.sinModelo) return `<div class="noche-vacia" onclick="abrirPuntuar()" role="button"><b>🌙 ${_nocheMomento()}, ¿qué ves?</b><span>Puntúa al menos 8 títulos que hayas visto (llevas ${r.notas||0}) y aquí te diré qué te va a gustar más de tus plataformas. Toca para puntuar rápido ›</span></div>`;
      return `<div class="noche-vacia"><b>No he encontrado nada que encaje</b><span>Prueba con más tiempo, otro tipo o más plataformas.</span></div>`;
    }
    async function cargarNocheInicio(){
      const box = document.getElementById('inicio-noche'); if(!box) return;
      if(!sesionActual){ box.innerHTML = ''; return; }
      if(!box.innerHTML) box.innerHTML = '<div class="noche-hero skeleton" style="align-items:center;justify-content:center"><span style="color:rgba(255,255,255,.75);font-size:14px">Preparando tus recomendaciones…</span></div>';
      try{
        const r = await _nocheMazo(false);
        if(!r) { box.innerHTML = ''; return; }
        window._nocheActual = r.mazo[0] || null;
        box.innerHTML = r.mazo.length ? _nocheTarjeta(r.mazo[0], true) : _nocheVacia(r);
      }catch(e){ box.innerHTML = ''; }
    }
    function _nochePintarOpts(){
      const o = _nocheOpts();
      const chip = (act, txt, fn) => `<button type="button" class="noche-chip${act?' activo':''}" onclick="${fn}" aria-pressed="${act}">${txt}</button>`;
      document.getElementById('noche-titulo').textContent = _nocheMomento();
      document.getElementById('noche-opts').innerHTML = `
        <div class="section-label">¿Cuánto tiempo tienes?</div><div class="noche-chips">${[[90,'1 h 30'],[120,'2 h'],[150,'2 h 30'],[0,'Sin prisa']].map(([v,t])=>chip(o.min===v, t, `nocheOpt('min',${v})`)).join('')}</div>
        <div class="section-label">¿Qué te apetece?</div><div class="noche-chips">${[['movie','Película'],['tv','Serie'],['todo','Lo que sea']].map(([v,t])=>chip(o.tipo===v, t, `nocheOpt('tipo','${v}')`)).join('')}</div>
        <div class="section-label">¿Dónde? <span style="text-transform:none;letter-spacing:0;font-weight:500">(sin marcar: en cualquiera)</span></div><div class="noche-chips">${DESC_PLATAFORMAS.filter(([id])=>id).map(([id,n])=>chip(o.plats.includes(id), _escHtml(n), `nocheOpt('plat','${id}')`)).join('')}</div>`;
    }
    function nocheOpt(k, v){
      const o = _nocheOpts();
      if(k==='plat') o.plats = o.plats.includes(v) ? o.plats.filter(x=>x!==v) : [...o.plats, v]; else o[k] = v;
      try{ localStorage.setItem('cm:noche', JSON.stringify(o)); }catch(e){}
      _nochePintarOpts(); _nocheCargarMesa(false);
      document.getElementById('inicio-noche') && (document.getElementById('inicio-noche').innerHTML = '');
    }
    async function abrirEstaNoche(){
      if(!sesionActual){ mostrarCuenta(); return; }
      irA('p-noche'); _nochePintarOpts();
      await _nocheCargarMesa(false);
    }
    async function _nocheCargarMesa(forzar){
      const mesa = document.getElementById('noche-mesa'), turno = (window._nocheTurno = (window._nocheTurno||0)+1);
      mesa.innerHTML = '<div class="noche-hero skeleton"></div><p class="rk-ayuda" style="text-align:center">Mirando qué hay en tus plataformas y qué te va a gustar más…</p>';
      const r = await _nocheMazo(forzar).catch(()=>null);
      if(turno!==window._nocheTurno) return;
      if(!r || !r.mazo.length){ mesa.innerHTML = _nocheVacia(r); window._nocheActual = null; return; }
      r.i = r.i || 0; _nochePintarMesa();
    }
    function _nochePintarMesa(){
      const r = window._noche, mesa = document.getElementById('noche-mesa'); if(!r || !mesa) return;
      if(r.i >= r.mazo.length){ mesa.innerHTML = `<div class="noche-vacia"><b>Ya no me quedan ideas buenas</b><span>Prueba con más tiempo u otras plataformas, o <a href="#" style="color:inherit" onclick="event.preventDefault();window._noche.i=0;_nochePintarMesa()">vuelve a empezar</a>.</span></div>`; return; }
      const x = window._nocheActual = r.mazo[r.i];
      mesa.innerHTML = `<div class="noche-cont">${r.i+1} de ${r.mazo.length} · ordenadas por la nota que le pondrías</div>` + _nocheTarjeta(x, false);
    }
    function nocheOtra(){ const r = window._noche; if(!r) return; r.i++; _nochePintarMesa(); }
    function nocheFicha(){ const x = window._nocheActual; if(x) abrirDetalle({id:x.id, _tipo:x._tipo, title:x.title, poster_path:x.poster_path, release_date:x.release_date, vote_average:x.vote_average}); }
    function nocheNoMeInteresa(){
      const x = window._nocheActual, r = window._noche; if(!x || !r) return;
      ocultarTitulo({id:x.id, tipo:x._tipo, t:x.title, poster:x.poster_path, f:x.release_date});
      r.mazo.splice(r.i, 1); try{ sessionStorage.setItem(r.clave, JSON.stringify(r)); }catch(e){}
      _nochePintarMesa();
    }
    function alternarMasFiltros(){
      const box = document.getElementById('inicio-mas-filtros'), b = document.getElementById('inicio-mas-filtros-btn');
      box.hidden = !box.hidden; b.setAttribute('aria-expanded', String(!box.hidden));
      b.textContent = box.hidden ? 'Más filtros: tono, género, nota, año ▾' : 'Menos filtros ▴';
    }
