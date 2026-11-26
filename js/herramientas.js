// CineMood · Herramientas: crítica vs público, mezclas, explorador, escáner, mundial y seis grados
// (Parte de index.html; se carga como script clásico: todo comparte el mismo ámbito global.)

    // ══ DESCUBRE: «Al público le encantó y la crítica no» (TMDB alta, Metacritic baja; se guarda una semana) ══
    async function _descPublicoVsCritica(pg){
      if(pg>1 || !OMDB_KEY) return {lista:[], paginas:1};
      const sem = Math.floor(Date.now()/(7*864e5)), clave = `cm:publicoCritica:${sem}`;
      let ids = null; try{ ids = JSON.parse(localStorage.getItem(clave)||'null'); }catch(e){}
      let base = [];
      if(!ids){
        const pags = await Promise.all([1,2,3].map(n=>_tmdbJson(`/discover/movie&language=es-ES&sort_by=vote_average.desc&vote_count.gte=2500&vote_average.gte=7.2&without_genres=99,10770,16&page=${n}`).catch(()=>({}))));
        base = pags.flatMap(d=>d.results||[]).filter(x=>x.poster_path);
        const marcadas = (await _fetchEnLotes(base, async x=>{
          try{ const imdb = await _imdbIdDe('movie', x.id); const d = window._omdbCache[imdb] || await _omdbDatos(imdb); if(d && d.Response==='True'){ window._omdbCache[imdb] = d; const ms = Number(d.Metascore); if(ms && ms <= 55) return {x, ms}; } }catch(e){}
          return null;
        }, 5)).filter(Boolean).sort((a,b)=>a.ms-b.ms);
        ids = marcadas.map(o=>[o.x.id, o.ms]);
        try{ Object.keys(localStorage).filter(k=>k.startsWith('cm:publicoCritica:')).forEach(k=>localStorage.removeItem(k)); localStorage.setItem(clave, JSON.stringify(ids)); }catch(e){}
        window._pcBase = Object.fromEntries(base.map(x=>[x.id, x]));
      }
      const vistos = window.idsVistosSet || new Set();
      const lista = (await _fetchEnLotes(ids, async ([id, ms])=>{ const x = (window._pcBase||{})[id] || await _tmdbJson(`/movie/${id}&language=es-ES`).catch(()=>null); return x && x.poster_path ? {...x, _tipo:'movie', title:x.title, release_date:x.release_date, _ms:ms} : null; }, 5))
        .filter(x=>x && !vistos.has(`${x.id}-movie`) && !esOculta(x.id, 'movie'));
      return {lista, paginas:1};
    }
    // ══ MEZCLAS PARA TI: filas temáticas que salen de tu ADN (lo que más te tira: género, país, época, director) ══
    const _bandera = c => String(c||'').toUpperCase().replace(/./g, ch=>String.fromCodePoint(127397 + ch.charCodeAt(0)));
    const _GEN_EMOJI = {28:'💥',12:'🧭',16:'🎨',35:'😂',80:'🕵️',18:'🎭',10751:'👨‍👩‍👧',14:'🧙',36:'📜',27:'👻',9648:'🔎',10749:'💕',878:'🚀',53:'😰',10752:'🪖',37:'🤠',99:'🎥'};
    function _mezclasDefs(){
      const m = window._modeloNota; if(!m || !m.fit) return [];
      const f = m.fit, ef = Object.entries(f.ef).map(([k,v])=>({k, a:v*_NOTA_W[k[0]], n:f.cuenta[k]||0}));
      const mejores = t => ef.filter(x=>x.k[0]===t && x.a>=0.2 && x.n>=(t==='d'?2:3)).sort((a,b)=>b.a-a.a);
      const gens = mejores('g').filter(x=>_NOTA_GEN[x.k.slice(1)] && [28,12,16,35,80,18,14,36,27,9648,10749,878,53,10752,37].includes(Number(x.k.slice(1))));
      const paises = mejores('p').filter(x=>!['pUS','pGB'].includes(x.k)), decadas = mejores('e'), dirs = mejores('d');
      const nomDir = {}; m.muestras.forEach(x=>{ if(x.info?.d?.id) nomDir[x.info.d.id] = x.info.d.n; });
      const out = [];
      if(gens[0]){ const g = gens[0].k.slice(1); out.push({k:`mez-g${g}`, t:`${_GEN_EMOJI[g]||'🎬'} ${_NOTA_GEN[g].charAt(0).toUpperCase()+_NOTA_GEN[g].slice(1)}: lo que te falta`, q:`with_genres=${g}&sort_by=vote_average.desc&vote_count.gte=400`}); }
      // país o, si pesa más, idioma original (el cine coreano puede salir por cualquiera de los dos)
      const idiomas = mejores('l').filter(x=>x.k!=='len'), BAND_IDIOMA = {ko:'KR', ja:'JP', fr:'FR', es:'ES', it:'IT', de:'DE', da:'DK', sv:'SE', hi:'IN', pt:'PT', zh:'CN', cn:'CN', no:'NO', fa:'IR'};
      if(paises[0] && (!idiomas[0] || paises[0].a >= idiomas[0].a)){ const c = paises[0].k.slice(1); let n = c; try{ n = new Intl.DisplayNames(['es'],{type:'region'}).of(c); }catch(e){} out.push({k:`mez-p${c}`, t:`${_bandera(c)} Cine de ${n} para ti`, q:`with_origin_country=${c}&sort_by=vote_count.desc&vote_count.gte=80`}); }
      else if(idiomas[0]){ const l = idiomas[0].k.slice(1); out.push({k:`mez-l${l}`, t:`${BAND_IDIOMA[l] ? _bandera(BAND_IDIOMA[l]) : '🌍'} Cine en ${_idioma(l)} para ti`, q:`with_original_language=${l}&sort_by=vote_count.desc&vote_count.gte=80`}); }
      const gd = gens[1] || gens[0];
      if(gd && decadas[0]){ const g = gd.k.slice(1), d = Number(decadas[0].k.slice(1)); out.push({k:`mez-g${g}-e${d}`, t:`📼 ${_NOTA_GEN[g].charAt(0).toUpperCase()+_NOTA_GEN[g].slice(1)} de los ${d<2000 ? String(d).slice(2) : d}`, q:`with_genres=${g}&primary_release_date.gte=${d}-01-01&primary_release_date.lte=${d+9}-12-31&sort_by=vote_count.desc&vote_count.gte=100`}); }
      if(dirs[0] && nomDir[dirs[0].k.slice(1)]){ const id = dirs[0].k.slice(1); out.push({k:`mez-d${id}`, t:`🎬 Más de ${nomDir[id]}`, q:`with_crew=${id}&sort_by=popularity.desc`}); }
      return out.slice(0, 4);
    }
    async function _descMezcla(def, prov, pg){
      const pq = prov ? `&watch_region=ES&with_watch_providers=${prov}&with_watch_monetization_types=flatrate` : '';
      const pags = await Promise.all([1,2].map(n=>_tmdbJson(`/discover/movie&language=es-ES&${def.q}${pq}&without_genres=99,10770&page=${(pg-1)*2+n}`).catch(()=>({}))));
      const vistos = window.idsVistosSet || new Set();
      const lista = pags.flatMap(d=>d.results||[]).filter(x=>x.poster_path && !vistos.has(`${x.id}-movie`) && !esOculta(x.id, 'movie'))
        .map(x=>({...x, _tipo:'movie', title:x.title, release_date:x.release_date}))
        .map((x,i)=>({x, i, v:_notaRapida(x)})).sort((a,b)=>((b.v??-1)-(a.v??-1)) || a.i-b.i).map(o=>o.x);
      return {lista, paginas: Math.max(1, Math.ceil(((pags[0]||{}).total_pages||1)/2))};
    }
    function _descMezclasFilas(prov){
      if(!sesionActual) return [];
      return _mezclasDefs().map(d=>({k:`${d.k}-${prov}`, t:d.t, tipo:'movie', custom:pg=>_descMezcla(d, prov, pg)}));
    }

    // ══ ALGO ENTRE ESTAS DOS: cruza las recomendaciones de dos títulos ══
    async function abrirMezcla(a){
      if(!sesionActual){ mostrarCuenta(); return; }
      if(!a) return;
      window._mezA = {id:a.id, _tipo:a._tipo, title:a.title, poster_path:a.poster_path, release_date:a.release_date};
      irA('p-mezcla');
      const cont = document.getElementById('mez-cont'), A = window._mezA;
      // propuestas para la segunda: lo que mejor has puntuado
      let favs = [];
      try{ const m = await _modeloNotaObtener(); favs = (m?.muestras||[]).filter(x=>Number(x.puntuacion)>=8 && !(x.tmdb_id===A.id && x.tipo===A._tipo)).sort((a,b)=>Number(b.puntuacion)-Number(a.puntuacion)).slice(0,12); }catch(e){}
      const { data } = favs.length ? await sb.from('mi_biblioteca').select('tmdb_id,tipo,titulo,poster_path,anio').eq('user_id', sesionActual.user.id).eq('visto', true).then(r=>r, ()=>({data:[]})) : {data:[]};
      const fila = {}; (data||[]).forEach(x=>{ fila[`${x.tipo}:${x.tmdb_id}`] = x; });
      window._mezOpciones = favs.map(x=>fila[`${x.tipo}:${x.tmdb_id}`]).filter(x=>x && x.poster_path).slice(0,8).map(x=>({id:x.tmdb_id, _tipo:x.tipo, title:x.titulo, poster_path:x.poster_path, release_date:x.anio ? x.anio+'-01-01' : ''}));
      cont.innerHTML = `<div class="mez-par"><img src="https://image.tmdb.org/t/p/w154${A.poster_path}" alt=""><span class="mas">+</span><div style="flex:1"><b>${_escHtml(A.title)}</b><span class="rk-ayuda">¿Con cuál la mezclas?</span></div></div>
        <form class="buscar-form" onsubmit="event.preventDefault();mezBuscar()"><input type="search" id="mez-buscar" placeholder="Busca la segunda película o serie…" autocomplete="off"><button type="submit">Buscar</button></form>
        <div id="mez-busq"></div>
        ${window._mezOpciones.length ? `<div class="section-label" style="margin-top:12px">O una de tus favoritas</div><div class="mez-elegir">${window._mezOpciones.map((x,i)=>`<button type="button" onclick="mezclarCon(_mezOpciones[${i}])"><img src="https://image.tmdb.org/t/p/w154${x.poster_path}" alt="">${_escHtml(x.title)}</button>`).join('')}</div>` : ''}
        <div id="mez-res"></div>`;
    }
    async function mezBuscar(){
      const q = document.getElementById('mez-buscar').value.trim(), box = document.getElementById('mez-busq'); if(!q) return;
      box.innerHTML = '<p class="rk-ayuda">Buscando…</p>';
      try{
        const r = (await _tmdbJson(`/search/multi&language=es-ES&include_adult=false&query=${encodeURIComponent(q)}`)).results || [];
        window._mezBusq = r.filter(x=>(x.media_type==='movie'||x.media_type==='tv') && x.poster_path).slice(0,8).map(x=>({id:x.id, _tipo:x.media_type, title:x.title||x.name, poster_path:x.poster_path, release_date:x.release_date||x.first_air_date||''}));
        box.innerHTML = window._mezBusq.length ? `<div class="mez-elegir">${window._mezBusq.map((x,i)=>`<button type="button" onclick="mezclarCon(_mezBusq[${i}])"><img src="https://image.tmdb.org/t/p/w154${x.poster_path}" alt="">${_escHtml(x.title)}</button>`).join('')}</div>` : '<p class="rk-ayuda">No he encontrado nada con ese nombre.</p>';
      }catch(e){ box.innerHTML = '<p class="rk-ayuda">No se pudo buscar.</p>'; }
    }
    async function mezclarCon(B){
      const A = window._mezA, cont = document.getElementById('mez-cont'); if(!A || !B) return;
      cont.innerHTML = `<div class="mez-par"><img src="https://image.tmdb.org/t/p/w154${A.poster_path}" alt=""><span class="mas">+</span><img src="https://image.tmdb.org/t/p/w154${B.poster_path}" alt=""><div style="flex:1"><b>${_escHtml(A.title)}</b><b style="margin-top:4px">${_escHtml(B.title)}</b><button type="button" class="d-saga-link" onclick="abrirMezcla(window._mezA)">Cambiar ›</button></div></div><div id="mez-res"><p class="rk-ayuda">Buscando lo que tienen en común…</p></div>`;
      try{
        const de = async x=>{ const ps = await Promise.all([`/${x._tipo}/${x.id}/recommendations&language=es-ES&page=1`, `/${x._tipo}/${x.id}/recommendations&language=es-ES&page=2`, `/${x._tipo}/${x.id}/similar&language=es-ES&page=1`].map(r=>_tmdbJson(r).catch(()=>({})))); return ps.flatMap(d=>d.results||[]).map(r=>({...r, _tipo:r.media_type || x._tipo})); };
        const [la, lb] = await Promise.all([de(A), de(B)]);
        const vistos = window.idsVistosSet || new Set(), fuera = new Set([`${A.id}-${A._tipo}`, `${B.id}-${B._tipo}`]);
        const mapa = new Map();
        const meter = (lista, lado) => lista.forEach((r, i)=>{ const k = `${r.id}-${r._tipo}`; if(!r.poster_path || fuera.has(k) || vistos.has(k) || esOculta(r.id, r._tipo)) return; const o = mapa.get(k) || {x:{...r, title:r.title||r.name, release_date:r.release_date||r.first_air_date}, a:0, b:0}; o[lado] = Math.max(o[lado], 1 - i/80); mapa.set(k, o); });
        meter(la, 'a'); meter(lb, 'b');
        await _modeloNotaObtener().catch(()=>null);
        // primero las que salen en las dos; luego las que más pesan en ambas; la nota que les pondrías desempata
        const lista = [...mapa.values()].map(o=>({...o, ambas: o.a>0 && o.b>0, s: (o.a>0 && o.b>0 ? 2 : 0) + Math.min(o.a, o.b) + (o.a+o.b)/4 + ((_notaRapida(o.x)||6)-6)/4}))
          .sort((p,q)=>q.s-p.s).slice(0, 18);
        window._mezLista = lista.map(o=>o.x);
        const n = lista.filter(o=>o.ambas).length;
        document.getElementById('mez-res').innerHTML = lista.length ? `<p class="rk-ayuda" style="margin:2px 0 10px">${n ? `${n} salen al recomendar las dos; el resto, al recomendar una u otra.` : 'No comparten recomendaciones directas: estas son las más cercanas a ambas.'}</p><div class="desc-rejilla">${window._mezLista.map((x,i)=>_descTarjeta(x, '_mezLista', i)).join('')}</div>` : '<p class="rk-ayuda">No he encontrado nada en común. Prueba con otra pareja.</p>';
        _prevRefrescar();
      }catch(e){ document.getElementById('mez-res').innerHTML = '<p class="rk-ayuda">No se pudo calcular. Inténtalo de nuevo.</p>'; }
    }

    // ══ EXPLORADOR: todos los filtros juntos (plataformas, género, época, duración, idioma, nota) y orden «para ti» ══
    const EXP_GEN = {movie:[28,12,16,35,80,99,18,10751,14,36,27,10402,9648,10749,878,53,10752,37], tv:[10759,16,35,80,99,18,10751,9648,10765,10768,37]};
    const EXP_IDIOMAS = [['','Cualquier idioma'],['es','Español'],['en','Inglés'],['ko','Coreano'],['ja','Japonés'],['fr','Francés'],['it','Italiano'],['de','Alemán'],['da','Danés'],['sv','Sueco'],['hi','Hindi'],['pt','Portugués']];
    function _expEstado(){ let o = null; try{ o = JSON.parse(localStorage.getItem('cm:explorar')||'null'); }catch(e){} return Object.assign({tipo:'movie', plats:[], gens:[], dec:'', dur:'', idioma:'', nota:'', orden:'parati'}, o||{}); }
    function _expGuardar(o){ try{ localStorage.setItem('cm:explorar', JSON.stringify(o)); }catch(e){} }
    function abrirExplorador(){ irA('p-explorar'); _expPintarFiltros(); explorar(); }
    function _expPintarFiltros(){
      const o = _expEstado(), chip = (on, txt, fn) => `<button type="button" class="noche-chip${on?' activo':''}" onclick="${fn}" aria-pressed="${on}">${txt}</button>`;
      const decadas = [['','Cualquier época'],['2020','Años 2020'],['2010','Años 2010'],['2000','Años 2000'],['1990','Años 90'],['1980','Años 80'],['1970','Años 70'],['1960','Años 60'],['1950','Antes de 1960']];
      const sel = (id, ops, val, k) => `<select aria-label="${id}" onchange="expCambiar('${k}', this.value)">${ops.map(([v,t])=>`<option value="${v}"${String(val)===String(v)?' selected':''}>${t}</option>`).join('')}</select>`;
      document.getElementById('exp-filtros').innerHTML = `
        <div class="exp-grupo"><div class="exp-chips">${chip(o.tipo==='movie','🎬 Películas',"expCambiar('tipo','movie')")}${chip(o.tipo==='tv','📺 Series',"expCambiar('tipo','tv')")}</div></div>
        <div class="exp-grupo"><div class="section-label">Plataformas</div><div class="exp-chips">${chip(o.plats.includes('gratis'),'🆓 Gratis',"expPlat('gratis')")}${DESC_PLATAFORMAS.filter(([id])=>id).map(([id,n])=>chip(o.plats.includes(id), _escHtml(n), `expPlat('${id}')`)).join('')}</div></div>
        <div class="exp-grupo"><div class="section-label">Géneros</div><div class="exp-chips">${EXP_GEN[o.tipo].map(g=>chip(o.gens.includes(g), `${_GEN_EMOJI[g]||''} ${_escHtml((_NOTA_GEN[g]||'').replace(/^./,c=>c.toUpperCase()))}`, `expGen(${g})`)).join('')}</div></div>
        <div class="exp-selects">
          ${sel('Época', decadas, o.dec, 'dec')}
          ${o.tipo==='movie' ? sel('Duración', [['','Cualquier duración'],['90','Menos de 1 h 30'],['120','De 1 h 30 a 2 h'],['999','Más de 2 h']], o.dur, 'dur') : sel('Duración', [['','Cualquier duración']], '', 'dur')}
          ${sel('Idioma', EXP_IDIOMAS, o.idioma, 'idioma')}
          ${sel('Nota', [['','Cualquier nota'],['6','Nota 6 o más'],['7','Nota 7 o más'],['8','Nota 8 o más']], o.nota, 'nota')}
        </div>
        <div class="exp-grupo"><div class="section-label">Ordenar por</div><div class="exp-chips">${[['parati','🔮 Lo que más te gustará'],['pop','🔥 Populares'],['nota','⭐ Mejor valoradas'],['nuevo','🆕 Más recientes']].map(([k,t])=>chip(o.orden===k, t, `expCambiar('orden','${k}')`)).join('')}</div></div>`;
    }
    function expCambiar(k, v){ const o = _expEstado(); o[k] = v; if(k==='tipo'){ o.gens = []; o.dur = ''; } _expGuardar(o); _expPintarFiltros(); explorar(); }
    function expPlat(id){ const o = _expEstado(); o.plats = o.plats.includes(id) ? o.plats.filter(x=>x!==id) : [...o.plats, id]; _expGuardar(o); _expPintarFiltros(); explorar(); }
    function expGen(g){ const o = _expEstado(); o.gens = o.gens.includes(g) ? o.gens.filter(x=>x!==g) : [...o.gens, g]; _expGuardar(o); _expPintarFiltros(); explorar(); }
    function _expRuta(o, pg){
      const t = o.tipo, fecha = t==='movie' ? 'primary_release_date' : 'first_air_date', hoy = new Date().toISOString().slice(0,10), p = [];
      const pagadas = o.plats.filter(x=>x!=='gratis');
      if(o.plats.includes('gratis') && !pagadas.length) p.push('watch_region=ES&with_watch_monetization_types=free|ads');
      else if(pagadas.length) p.push(`watch_region=ES&with_watch_providers=${pagadas.join('|')}&with_watch_monetization_types=${o.plats.includes('gratis') ? 'flatrate|free|ads' : 'flatrate'}`);
      // varios géneros = que tenga todos (acción Y aventura); la animación solo si la eliges
      if(o.gens.length) p.push(`with_genres=${o.gens.join(',')}`);
      const sinAnim = !o.gens.includes(16);
      if(o.dec){ const d = Number(o.dec); p.push(d===1950 ? `${fecha}.lte=1959-12-31` : `${fecha}.gte=${d}-01-01&${fecha}.lte=${d+9}-12-31`); }
      if(t==='movie' && o.dur){ p.push(o.dur==='90' ? 'with_runtime.lte=89' : o.dur==='120' ? 'with_runtime.gte=90&with_runtime.lte=120' : 'with_runtime.gte=121'); }
      if(o.idioma) p.push(`with_original_language=${o.idioma}`);
      if(o.nota) p.push(`vote_average.gte=${o.nota}&vote_count.gte=${t==='movie'?150:60}`);
      const orden = o.orden==='nota' ? `sort_by=vote_average.desc&vote_count.gte=${t==='movie'?300:120}` : o.orden==='nuevo' ? `sort_by=${fecha}.desc&${fecha}.lte=${hoy}&vote_count.gte=10` : 'sort_by=popularity.desc';
      p.push(orden, t==='movie' ? `without_genres=10770${sinAnim ? ',16' : ''}` : `without_genres=10763,10764,10767${sinAnim ? ',16' : ''}`);
      return `/discover/${t}&language=es-ES&${p.join('&')}&page=${pg}`;
    }
    async function explorar(mas){
      const o = _expEstado(), res = document.getElementById('exp-res'), est = document.getElementById('exp-estado'), btn = document.getElementById('exp-mas');
      const turno = mas ? window._expTurno : (window._expTurno = (window._expTurno||0)+1);
      if(!mas){ window._expLista = []; window._expPg = 0; res.innerHTML = ''; est.textContent = 'Buscando…'; }
      btn.style.display = 'none';
      try{
        if(o.orden==='parati') await _modeloNotaObtener().catch(()=>null);
        // «para ti»: se miran 3 páginas de las más populares y se ordenan por tu nota
        const n = o.orden==='parati' ? 3 : 1, desde = window._expPg;
        const pags = await Promise.all(Array.from({length:n}, (_,i)=>_tmdbJson(_expRuta(o, desde+i+1)).catch(()=>({}))));
        if(turno!==window._expTurno) return;
        window._expPg = desde + n;
        const vistos = window.idsVistosSet || new Set(), ya = new Set(window._expLista.map(x=>`${x.id}-${x._tipo}`));
        let nuevos = pags.flatMap(d=>d.results||[]).filter(x=>x.poster_path && !esOculta(x.id, o.tipo) && !ya.has(`${x.id}-${o.tipo}`)).map(x=>({...x, _tipo:o.tipo, title:x.title||x.name, release_date:x.release_date||x.first_air_date}));
        if(o.orden==='parati') nuevos = nuevos.filter(x=>!vistos.has(`${x.id}-${o.tipo}`)).map((x,i)=>({x, i, v:_notaRapida(x)})).sort((a,b)=>((b.v??-1)-(a.v??-1)) || a.i-b.i).map(q=>q.x);
        window._expLista = window._expLista.concat(nuevos);
        const total = (pags[0]||{}).total_results || 0;
        est.textContent = window._expLista.length ? `${total.toLocaleString('es-ES')} títulos con estos filtros${o.orden==='parati' ? ' · los que ya has visto no salen' : ''}` : 'No hay nada con estos filtros. Prueba a quitar alguno.';
        res.insertAdjacentHTML('beforeend', nuevos.map((x,i)=>_descTarjeta(x, '_expLista', window._expLista.length - nuevos.length + i)).join(''));
        btn.style.display = window._expPg < ((pags[0]||{}).total_pages||0) ? '' : 'none';
        _prevRefrescar();
      }catch(e){ if(turno===window._expTurno) est.textContent = 'No se pudo buscar. Comprueba tu conexión.'; }
    }
    function explorarMas(){ explorar(true); }
    // ══ ESCÁNER «¿CUÁL DE ESTAS?»: lee los títulos de una captura (en el propio móvil) y los ordena por tu nota prevista ══
    function abrirEscaner(){
      if(!sesionActual){ mostrarCuenta(); return; }
      irA('p-escaner');
      if(!document.getElementById('esc-res').innerHTML) document.getElementById('esc-estado').innerHTML = '';
    }
    const _escNorm = t => String(t||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/&/g,' y ').replace(/[^a-z0-9ñ]+/g,' ').trim();
    function _escLev(a, b){
      if(a===b) return 0; const m = a.length, n = b.length; if(!m || !n) return Math.max(m,n);
      let prev = Array.from({length:n+1}, (_,j)=>j);
      for(let i=1;i<=m;i++){ const cur=[i]; for(let j=1;j<=n;j++) cur[j]=Math.min(prev[j]+1, cur[j-1]+1, prev[j-1]+(a[i-1]===b[j-1]?0:1)); prev=cur; }
      return prev[n];
    }
    function _escParecido(cand, titulo){
      const c = _escNorm(cand), t = _escNorm(titulo); if(!c || !t) return 0;
      if(c===t) return 1;
      const sim = 1 - _escLev(c,t)/Math.max(c.length,t.length);
      const contiene = (t.length>=5 && c.includes(t) && t.length/c.length>=0.55) || (c.length>=5 && t.includes(c) && c.length/t.length>=0.7);
      return Math.max(sim, contiene ? 0.86 : 0);
    }
    const _ESC_RUIDO = new Set(['netflix','prime video','disney','max','hbo','filmin','movistar','apple tv','inicio','series','peliculas','películas','mi lista','novedades','top 10','ver ahora','reproducir','mas informacion','más información','temporada','temporadas','episodio','episodios','nuevo','nuevos','categorias','categorías','buscar','descargas','mi netflix','juegos','para ti','tendencias','populares','en cartelera','comprar entradas','entradas','horarios','hoy','mañana','manana','trailer','tráiler','ver todo','continuar viendo','recomendado','reciente','cines','cine','sesiones','version original','vose','3d']);
    function _escCandidatos(texto){
      const out = [], ya = new Set();
      texto.split(/\n+/).forEach(linea=>{
        // una línea puede llevar varios títulos separados por mucho espacio, barras o puntos
        linea.split(/\s{3,}|\s[|·•]\s|\t/).forEach(tr=>{
          let t = tr.replace(/^[\s\d.\-–—•*#)(:]+/, '').replace(/[\s|•·*]+$/,'').replace(/\s+\(?\d{4}\)?$/,'').trim();
          const n = _escNorm(t);
          if(n.length<2 || n.length>60 || !/[a-zñ]{2}/.test(n) || _ESC_RUIDO.has(n) || /^\d+\s*(min|h|%|€|eur)/.test(n) || /^(t|s)\d+|^\d+ (temporadas?|episodios?)|^(temporada|episodio|capitulo|season|episode)s? ?\d*$/.test(n)) return;
          if((t.match(/[A-Za-zÀ-ÿ]/g)||[]).length < t.replace(/\s/g,'').length*0.6) return; // demasiados símbolos: ruido del OCR
          if(!ya.has(n)){ ya.add(n); out.push(t); }
        });
      });
      return out.slice(0, 30);
    }
    // preparar la imagen: más grande, en grises, con más contraste y en negativo si el fondo es oscuro (Netflix, cines…)
    async function _escPreparar(archivo){
      const img = await new Promise((res, rej)=>{ const u = URL.createObjectURL(archivo), im = new Image(); im.onload = ()=>res(im); im.onerror = rej; im.src = u; });
      const esc = Math.min(2.2, 2000/Math.max(img.width, img.height)) || 1, W = Math.round(img.width*esc), H = Math.round(img.height*esc);
      const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const ctx = cv.getContext('2d'); ctx.drawImage(img, 0, 0, W, H);
      const d = ctx.getImageData(0,0,W,H), px = d.data; let suma = 0;
      for(let i=0;i<px.length;i+=4){ const g = 0.299*px[i]+0.587*px[i+1]+0.114*px[i+2]; px[i]=px[i+1]=px[i+2]=g; suma += g; }
      const oscuro = suma/(px.length/4) < 110;
      for(let i=0;i<px.length;i+=4){ let g = px[i]; if(oscuro) g = 255-g; g = Math.max(0, Math.min(255, (g-128)*1.5+128)); px[i]=px[i+1]=px[i+2]=g; }
      ctx.putImageData(d,0,0);
      return {cv, url: img.src};
    }
    async function escanearImagen(archivo){
      if(!archivo) return;
      const est = document.getElementById('esc-estado'), res = document.getElementById('esc-res'), turno = (window._escTurno = (window._escTurno||0)+1);
      res.innerHTML = '';
      const paso = (t, pct) => { if(turno===window._escTurno) est.innerHTML = `${_escHtml(t)}${pct!=null ? `<div class="esc-barra"><i style="width:${Math.round(pct*100)}%"></i></div>` : ''}`; };
      try{
        paso('Preparando la imagen…', 0.03);
        const {cv, url} = await _escPreparar(archivo);
        res.innerHTML = `<img class="esc-img" src="${url}" alt="">`;
        paso('Cargando el lector de texto (la primera vez tarda un poco)…', 0.06);
        await _cargarScript('https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js');
        if(!window._escWorker) window._escWorker = await Tesseract.createWorker(['spa','eng'], 1, {logger: m=>{ if(m.status==='recognizing text') paso('Leyendo los títulos…', 0.1 + m.progress*0.5); }});
        paso('Leyendo los títulos…', 0.1);
        const {data} = await window._escWorker.recognize(cv);
        if(turno!==window._escTurno) return;
        const cands = _escCandidatos(data.text||'');
        if(!cands.length){ paso('No he podido leer títulos en esta imagen. Prueba con una captura más nítida o con la lista en texto.'); return; }
        paso(`He leído ${cands.length} posibles títulos. Buscándolos…`, 0.62);
        let hechos = 0; const encontrados = new Map(), sin = [];
        await _fetchEnLotes(cands, async c=>{
          try{
            const r = (await _tmdbJson(`/search/multi&language=es-ES&include_adult=false&query=${encodeURIComponent(c)}`)).results || [];
            const ops = r.filter(x=>(x.media_type==='movie'||x.media_type==='tv') && x.poster_path)
              .map(x=>({x, s:Math.max(_escParecido(c, x.title||x.name), _escParecido(c, x.original_title||x.original_name))}))
              .filter(o=>o.s>=0.8).sort((a,b)=>(b.s-a.s) || ((b.x.vote_count||0)-(a.x.vote_count||0)));
            const m = ops[0];
            if(m){ const k = `${m.x.id}-${m.x.media_type}`; if(!encontrados.has(k)) encontrados.set(k, {...m.x, _tipo:m.x.media_type, title:m.x.title||m.x.name, release_date:m.x.release_date||m.x.first_air_date, _leido:c}); }
            else sin.push(c);
          }catch(e){ sin.push(c); }
          paso(`Buscando los títulos… ${++hechos} de ${cands.length}`, 0.62 + 0.2*hechos/cands.length);
        }, 4);
        if(turno!==window._escTurno) return;
        const lista = [...encontrados.values()].slice(0, 20);
        if(!lista.length){ paso('He leído texto, pero no he encontrado películas ni series con esos nombres. Prueba con otra captura.'); return; }
        const m = await _modeloNotaObtener().catch(()=>null);
        hechos = 0;
        await _fetchEnLotes(lista, async x=>{
          if(!_infoCompleta(x._tipo, x.id)){ try{ _piGuardar(x._tipo, x.id, _infoDesdePak(x._tipo, await _fetchDetalleYCreditos(x._tipo, x.id))); }catch(e){} }
          paso(`Calculando tu nota… ${++hechos} de ${lista.length}`, 0.82 + 0.18*hechos/lista.length);
        }, 5);
        if(turno!==window._escTurno) return;
        const vistos = window.idsVistosSet || new Set();
        lista.forEach(x=>{ x._nota = _notaExacta(x); x._visto = vistos.has(`${x.id}-${x._tipo}`); });
        lista.sort((a,b)=>(a._visto-b._visto) || ((b._nota??-1)-(a._nota??-1)));
        window._escLista = lista;
        est.innerHTML = '';
        _escPintar(lista, sin, !!(m && m.fit));
      }catch(e){ paso('No se ha podido leer la imagen. Comprueba tu conexión e inténtalo de nuevo.'); }
    }
    function _escPintar(lista, sin, conModelo){
      const res = document.getElementById('esc-res'), img = res.querySelector('.esc-img')?.outerHTML || '';
      const g = lista.find(x=>!x._visto && x._nota!=null), mala = [...lista].reverse().find(x=>!x._visto && x._nota!=null && x._nota < (window._modeloNota?.fit?.media ?? 6) - 0.5);
      const fila = (x,i) => `<div class="esc-fila" onclick="abrirDetalle(_escLista[${i}])"><img loading="lazy" src="https://image.tmdb.org/t/p/w154${x.poster_path}" alt=""><div class="i"><b>${_escHtml(x.title)}</b><small>${[(x.release_date||'').slice(0,4), x._tipo==='tv'?'Serie':'Película', x._visto?'✓ Ya la viste':''].filter(Boolean).join(' · ')}</small></div>${x._nota!=null && !x._visto ? `<span class="esc-nota${x._nota < (window._modeloNota?.fit?.media ?? 6) ? ' baja' : ''}">🔮 ${_notaFmt(x._nota)}</span>` : ''}</div>`;
      res.innerHTML = img + (g ? `<div class="esc-gana" onclick="abrirDetalle(_escLista[${lista.indexOf(g)}])"><img src="https://image.tmdb.org/t/p/w185${g.poster_path}" alt=""><div><div class="k">De estas ${lista.length}, la que más te va a gustar</div><div class="t">${_escHtml(g.title)}</div><span class="noche-nota">🔮 Le pondrías un <b>${_notaFmt(g._nota)}</b></span></div></div>` : '')
        + (mala && mala!==g ? `<p class="esc-pie" style="margin:0 0 10px">👎 La que menos: <b>${_escHtml(mala.title)}</b> (${_notaFmt(mala._nota)}).</p>` : '')
        + lista.map(fila).join('')
        + `<p class="esc-pie">${conModelo ? '' : 'Puntúa al menos 8 títulos para ver tu nota en cada uno. '}${sin.length ? `No he reconocido: ${sin.slice(0,8).map(_escHtml).join(' · ')}${sin.length>8?'…':''}. ` : ''}La lectura se hace en tu móvil; si falta alguna, búscala en Buscar.</p>`;
    }

    // ── Modo en directo (tipo Lens): lee lo que ve la cámara cada segundo y va añadiendo lo que reconoce, con tu nota ──
    function _escPrepararDesde(fuente, w, h){
      const esc = Math.min(2, 1600/Math.max(w, h)) || 1, W = Math.round(w*esc), H = Math.round(h*esc);
      const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const ctx = cv.getContext('2d'); ctx.drawImage(fuente, 0, 0, W, H);
      const d = ctx.getImageData(0,0,W,H), px = d.data; let suma = 0;
      for(let i=0;i<px.length;i+=4){ const g = 0.299*px[i]+0.587*px[i+1]+0.114*px[i+2]; px[i]=px[i+1]=px[i+2]=g; suma += g; }
      const oscuro = suma/(px.length/4) < 110;
      for(let i=0;i<px.length;i+=4){ let g = px[i]; if(oscuro) g = 255-g; g = Math.max(0, Math.min(255, (g-128)*1.5+128)); px[i]=px[i+1]=px[i+2]=g; }
      ctx.putImageData(d,0,0); return cv;
    }
    async function _escWorkerListo(){
      await _cargarScript('https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js');
      if(!window._escWorker) window._escWorker = await Tesseract.createWorker(['spa','eng'], 1);
      return window._escWorker;
    }
    // busca un texto leído en TMDB (con caché: el mismo título no se busca dos veces)
    async function _escBuscarUno(c){
      const n = _escNorm(c); window._escBuscados = window._escBuscados || new Map();
      if(window._escBuscados.has(n)) return window._escBuscados.get(n);
      const p = (async()=>{
        try{
          const r = (await _tmdbJson(`/search/multi&language=es-ES&include_adult=false&query=${encodeURIComponent(c)}`)).results || [];
          const m = r.filter(x=>(x.media_type==='movie'||x.media_type==='tv') && x.poster_path)
            .map(x=>({x, s:Math.max(_escParecido(c, x.title||x.name), _escParecido(c, x.original_title||x.original_name))}))
            .filter(o=>o.s>=0.8).sort((a,b)=>(b.s-a.s) || ((b.x.vote_count||0)-(a.x.vote_count||0)))[0];
          if(!m) return null;
          const x = {...m.x, _tipo:m.x.media_type, title:m.x.title||m.x.name, release_date:m.x.release_date||m.x.first_air_date};
          if(!_infoCompleta(x._tipo, x.id)){ try{ _piGuardar(x._tipo, x.id, _infoDesdePak(x._tipo, await _fetchDetalleYCreditos(x._tipo, x.id))); }catch(e){} }
          x._nota = _notaExacta(x); x._visto = (window.idsVistosSet||new Set()).has(`${x.id}-${x._tipo}`);
          return x;
        }catch(e){ return null; }
      })();
      window._escBuscados.set(n, p); return p;
    }
    async function escanerVivo(){
      if(!sesionActual){ mostrarCuenta(); return; }
      if(!navigator.mediaDevices?.getUserMedia){ alert('Este navegador no deja usar la cámara. Usa una captura o foto.'); return; }
      const caja = document.getElementById('esc-vivo'), video = document.getElementById('esc-video'), est = document.getElementById('esc-vivo-estado');
      document.getElementById('esc-res').innerHTML = ''; document.getElementById('esc-estado').innerHTML = '';
      try{
        window._escStream = await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}, width:{ideal:1920}, height:{ideal:1440}}, audio:false});
      }catch(e){ alert('No se ha podido abrir la cámara. Revisa el permiso de cámara para CineMood (o Safari) en Ajustes del iPhone.'); return; }
      video.srcObject = window._escStream; caja.hidden = false; document.getElementById('esc-btn-camara').style.display = 'none';
      caja.querySelector('.esc-chips')?.remove(); document.getElementById('esc-vivo-res').innerHTML = '';
      try{ await video.play(); }catch(e){}
      window._escVivo = {encontrados: new Map(), activo: true};
      est.textContent = 'Preparando el lector…';
      try{ await _escWorkerListo(); }catch(e){ est.textContent = 'No se pudo cargar el lector de texto. Revisa tu conexión.'; return; }
      await _modeloNotaObtener().catch(()=>null);
      est.textContent = 'Apunta a los títulos…';
      const V = window._escVivo;
      while(V.activo && window._escVivo===V){
        if(!document.getElementById('p-escaner').classList.contains('activa') || document.hidden){ pararEscanerVivo(); break; }
        if(video.videoWidth){
          // solo el recuadro central (lo que hay dentro de la mira)
          const vw = video.videoWidth, vh = video.videoHeight, cx = Math.round(vw*0.08), cy = Math.round(vh*0.14);
          const rec = document.createElement('canvas'); rec.width = vw-2*cx; rec.height = vh-2*cy;
          rec.getContext('2d').drawImage(video, cx, cy, rec.width, rec.height, 0, 0, rec.width, rec.height);
          try{
            const {data} = await window._escWorker.recognize(_escPrepararDesde(rec, rec.width, rec.height));
            const cands = _escCandidatos(data.text||'').slice(0, 12);
            if(cands.length && !V.encontrados.size) est.textContent = `Leyendo: «${cands[0].slice(0,28)}»…`;
            cands.forEach(c=>_escBuscarUno(c).then(x=>{
              if(!x || !V.activo || V.encontrados.has(`${x.id}-${x._tipo}`)) return;
              V.encontrados.set(`${x.id}-${x._tipo}`, x); _escPintarVivo(); if(navigator.vibrate) navigator.vibrate(30);
            }));
          }catch(e){}
        }
        await new Promise(r=>setTimeout(r, 500));
      }
    }
    function _escPintarVivo(){
      const V = window._escVivo; if(!V) return;
      const media = window._modeloNota?.fit?.media ?? 6;
      const l = [...V.encontrados.values()].sort((a,b)=>(a._visto-b._visto) || ((b._nota??-1)-(a._nota??-1)));
      window._escLista = l;
      const mejor = l.find(x=>!x._visto && x._nota!=null);
      document.getElementById('esc-vivo-estado').textContent = mejor ? `👉 La que más te va a gustar: ${mejor.title}` : `${l.length} reconocida${l.length===1?'':'s'}`;
      let chips = document.querySelector('#esc-vivo .esc-chips'); if(!chips){ chips = document.createElement('div'); chips.className = 'esc-chips'; document.getElementById('esc-vivo').appendChild(chips); }
      chips.innerHTML = l.slice(0,4).map((x,i)=>`<button type="button" class="esc-chip${x===mejor?' mejor':''}" onclick="abrirDetalle(_escLista[${i}])"><img src="https://image.tmdb.org/t/p/w92${x.poster_path}" alt=""><span>${_escHtml(x.title)}</span>${x._visto ? '<b>✓ vista</b>' : x._nota!=null ? `<b>🔮 ${_notaFmt(x._nota)}</b>` : ''}</button>`).join('');
      const fila = (x,i) => `<div class="esc-fila" onclick="abrirDetalle(_escLista[${i}])"><img loading="lazy" src="https://image.tmdb.org/t/p/w154${x.poster_path}" alt=""><div class="i"><b>${_escHtml(x.title)}</b><small>${[(x.release_date||'').slice(0,4), x._tipo==='tv'?'Serie':'Película', x._visto?'✓ Ya la viste':''].filter(Boolean).join(' · ')}</small></div>${x._nota!=null && !x._visto ? `<span class="esc-nota${x._nota < media ? ' baja' : ''}">🔮 ${_notaFmt(x._nota)}</span>` : ''}</div>`;
      document.getElementById('esc-vivo-res').innerHTML = l.length>4 ? `<div class="section-label" style="margin-top:4px">Todas las que he visto (${l.length})</div>${l.map(fila).join('')}` : '';
    }
    function pararEscanerVivo(){
      if(window._escVivo) window._escVivo.activo = false;
      try{ (window._escStream?.getTracks()||[]).forEach(t=>t.stop()); }catch(e){}
      window._escStream = null;
      const caja = document.getElementById('esc-vivo'); if(caja) caja.hidden = true;
      const b = document.getElementById('esc-btn-camara'); if(b) b.style.display = '';
      // lo encontrado se queda abajo como lista
      const V = window._escVivo;
      if(V && V.encontrados.size){ document.getElementById('esc-vivo-res').innerHTML = ''; _escPintar(window._escLista||[], [], !!window._modeloNota?.fit); }
    }
    // ══ EL MUNDIAL DE TU LISTA: eliminatorias entre tus pendientes hasta quedarte con una ══
    async function abrirMundial(){
      if(!sesionActual){ mostrarCuenta(); return; }
      irA('p-mundial');
      const cont = document.getElementById('mun-cont');
      if(window._mun && window._mun.uid===sesionActual.user.id && !window._mun.fin){ _munPintar(); return; }
      cont.innerHTML = '<p class="rk-ayuda">Mirando tu lista…</p>';
      try{
        const {data} = await sb.from('mi_biblioteca').select('tmdb_id,tipo,titulo,poster_path,anio,visto,pendiente').eq('user_id', sesionActual.user.id).eq('pendiente', true);
        const pend = (data||[]).filter(x=>!x.visto && x.poster_path);
        window._munPend = pend;
        let ultima = null; try{ ultima = JSON.parse(localStorage.getItem('cm:mundial')||'null'); }catch(e){}
        const conLista = pend.length>=4, sel = "this.parentNode.querySelectorAll('button').forEach(b=>b.classList.toggle('activo', b===this))";
        const fuentes = [['recom','✨ Recomendadas para ti'], ...(conLista ? [['lista',`🔖 Tu lista (${pend.length})`], ['mezcla','🔀 Mezcla']] : [])];
        cont.innerHTML = `<div class="mun-campeona"><div class="copa">🏆</div><h3>El Mundial</h3><p class="esc-intro" style="text-align:center">Se enfrentan de dos en dos y tú eliges cuál te apetece más, hasta que quede una campeona.</p></div>
          <div class="section-label">¿De dónde salen?</div>
          <div class="mun-elegir" style="justify-content:flex-start">${fuentes.map(([k,t],i)=>`<button type="button" class="noche-chip${i===(conLista?2:0)?' activo':''}" data-fuente="${k}" onclick="${sel}">${t}</button>`).join('')}</div>
          ${conLista ? '' : `<p class="esc-pie" style="margin:-6px 0 8px">Tu lista «Para ver» tiene ${pend.length}; con 4 o más también podrás usarla.</p>`}
          <div class="section-label">¿Qué entra?</div>
          <div class="mun-elegir" style="justify-content:flex-start">${[['todo','Todo'],['movie','Películas'],['tv','Series']].map(([k,t],i)=>`<button type="button" class="noche-chip${i===0?' activo':''}" data-tipo="${k}" onclick="${sel}">${t}</button>`).join('')}</div>
          <div class="section-label">¿Cuántas compiten?</div>
          <div class="mun-elegir" style="justify-content:flex-start">${[4,8,16,32].map(n=>`<button type="button" class="noche-chip${n===16?' activo':''}" data-n="${n}" onclick="${sel}">${n}</button>`).join('')}</div>
          <button type="button" class="cta-btn" style="margin-top:16px" onclick="empezarMundial()">¡Que empiece el Mundial!</button>
          ${ultima ? `<p class="esc-pie" style="text-align:center">Última campeona: <b>${_escHtml(ultima.t)}</b> (${new Date(ultima.f).toLocaleDateString('es-ES',{day:'numeric',month:'long'})})</p>` : ''}`;
      }catch(e){ cont.innerHTML = '<p class="rk-ayuda">No se pudo cargar tu lista. Inténtalo de nuevo.</p>'; }
    }
    // Recomendadas: lo que TMDB recomienda a partir de lo que mejor has puntuado + lo mejor valorado, ordenado por tu nota prevista
    async function _munRecomendadas(tipo, cuantas){
      const m = await _modeloNotaObtener().catch(()=>null); if(!m || !m.fit) return [];
      const tipos = tipo==='todo' ? ['movie','tv'] : [tipo], vistos = window.idsVistosSet || new Set();
      const favs = m.muestras.filter(x=>tipos.includes(x.tipo) && Number(x.puntuacion)>=8).sort((a,b)=>Number(b.puntuacion)-Number(a.puntuacion)).slice(0, 10);
      const rutas = [...favs.map(x=>[x.tipo, `/${x.tipo}/${x.tmdb_id}/recommendations&language=es-ES&page=1`]),
        ...tipos.flatMap(t=>[1,2].map(pg=>[t, `/discover/${t}&language=es-ES&sort_by=vote_average.desc&vote_count.gte=${t==='movie'?800:300}&without_genres=${t==='movie'?'99,10770':'10763,10764,10767,99'}&page=${pg}`]))];
      const listas = await Promise.all(rutas.map(([t,r])=>_tmdbJson(r).then(d=>(d.results||[]).map(x=>({...x, _tipo:t}))).catch(()=>[])));
      const ya = new Set(), cands = [];
      listas.flat().forEach(x=>{ const k = `${x.id}-${x._tipo}`; if(!x.poster_path || ya.has(k) || vistos.has(k) || esOculta(x.id, x._tipo)) return; ya.add(k); cands.push({id:x.id, _tipo:x._tipo, title:x.title||x.name, poster_path:x.poster_path, release_date:x.release_date||x.first_air_date||'', genre_ids:x.genre_ids, original_language:x.original_language, origin_country:x.origin_country, vote_average:x.vote_average, vote_count:x.vote_count}); });
      const top = cands.map(x=>({x, v:_notaRapida(x)??0})).sort((a,b)=>b.v-a.v).slice(0, Math.max(cuantas+8, Math.round(cuantas*1.5))).map(o=>o.x);
      await _fetchEnLotes(top, async x=>{ if(!_infoCompleta(x._tipo, x.id)){ try{ _piGuardar(x._tipo, x.id, _infoDesdePak(x._tipo, await _fetchDetalleYCreditos(x._tipo, x.id))); }catch(e){} } }, 5);
      return top.map(x=>({...x, _nota:_notaExacta(x), _recom:true})).sort((a,b)=>(b._nota??0)-(a._nota??0)).slice(0, cuantas);
    }
    async function empezarMundial(){
      const cont = document.getElementById('mun-cont');
      const tipo = cont.querySelector('[data-tipo].activo')?.dataset.tipo || 'todo', fuente = cont.querySelector('[data-fuente].activo')?.dataset.fuente || 'recom';
      let n = Number(cont.querySelector('[data-n].activo')?.dataset.n) || 16;
      const deLista = (window._munPend||[]).filter(x=>tipo==='todo' || x.tipo===tipo).map(x=>({id:x.tmdb_id, _tipo:x.tipo, title:x.titulo, poster_path:x.poster_path, release_date:x.anio ? x.anio+'-01-01' : ''}));
      cont.innerHTML = `<p class="rk-ayuda" style="text-align:center">${fuente==='lista' ? 'Haciendo el sorteo…' : 'Buscando lo que más te va a gustar y haciendo el sorteo…'}</p>`;
      let pool = fuente==='lista' ? deLista : [];
      if(fuente!=='lista'){
        const recom = await _munRecomendadas(tipo, fuente==='mezcla' ? Math.ceil(n/2)+4 : n);
        if(fuente==='mezcla'){ const mitad = n/2, lista = deLista.sort(()=>Math.random()-0.5).slice(0, mitad), ids = new Set(lista.map(x=>`${x.id}-${x._tipo}`)); pool = [...lista, ...recom.filter(x=>!ids.has(`${x.id}-${x._tipo}`))]; }
        else pool = recom;
      }
      if(pool.length<4){ cont.innerHTML = `<div class="noche-vacia"><b>No hay bastantes candidatas</b><span>${fuente==='lista' ? 'Con ese filtro tu lista tiene menos de 4.' : 'Para las recomendadas hace falta que hayas puntuado al menos 8 títulos.'}</span></div><button type="button" class="ml-secundario" style="margin-top:12px;width:100%" onclick="window._mun=null;abrirMundial()">Volver</button>`; return; }
      while(n>pool.length) n/=2;
      await _modeloNotaObtener().catch(()=>null);
      // cabezas de serie: las que más te van a gustar; el resto entra al azar
      await _fetchEnLotes(pool, async x=>{ if(!_infoCompleta(x._tipo, x.id)){ try{ _piGuardar(x._tipo, x.id, _infoDesdePak(x._tipo, await _fetchDetalleYCreditos(x._tipo, x.id))); }catch(e){} } }, 5);
      pool.forEach(x=>{ x._nota = _notaExacta(x); x._r = Math.random(); });
      const cabezas = pool.filter(x=>x._nota!=null).sort((a,b)=>b._nota-a._nota).slice(0, n/2);
      const resto = pool.filter(x=>!cabezas.includes(x)).sort((a,b)=>a._r-b._r);
      const elegidas = [...cabezas, ...resto].slice(0, n);
      const fuertes = elegidas.slice(0, n/2), debiles = elegidas.slice(n/2).sort(()=>Math.random()-0.5);
      const ronda = []; fuertes.forEach((x,i)=>ronda.push(x, debiles[i]));
      window._mun = {uid: sesionActual.user.id, rondas: [ronda], gan: [], hist: [], fin: false, n};
      _munPintar();
    }
    const _munNombreRonda = n => ({2:'La final', 4:'Semifinales', 8:'Cuartos de final', 16:'Octavos de final', 32:'Dieciseisavos'})[n] || `Ronda de ${n}`;
    function _munPintar(){
      const M = window._mun, cont = document.getElementById('mun-cont'); if(!M) return;
      if(M.fin) return _munFinal();
      const ronda = M.rondas[M.rondas.length-1], i = M.gan.length, a = ronda[2*i], b = ronda[2*i+1];
      const op = (x, lado) => `<button type="button" class="mun-op" onclick="munElegir(${lado})"><img src="https://image.tmdb.org/t/p/w342${x.poster_path}" alt=""><b>${_escHtml(x.title)}</b><small>${[(x.release_date||'').slice(0,4), x._tipo==='tv'?'Serie':'Película'].filter(Boolean).join(' · ')}</small>${x._nota!=null ? `<b class="prev-txt">🔮 ${_notaFmt(x._nota)}</b>` : ''}${x._recom ? '' : '<small style="margin-top:3px">🔖 De tu lista</small>'}</button>`;
      cont.innerHTML = `<div class="mun-ronda"><b>${_munNombreRonda(ronda.length)}</b><span>${ronda.length>2 ? `Partido ${i+1} de ${ronda.length/2} · ` : ''}¿Cuál te apetece más ver?</span></div>
        <div class="mun-duelo">${op(a,0)}<span class="mun-vs">VS</span>${op(b,1)}</div>
        <div class="mun-acc"><button type="button" onclick="munDeshacer()" ${M.hist.length?'':'disabled style="opacity:.35"'}>‹ Deshacer</button><button type="button" onclick="munFicha()">Ver las fichas ›</button></div>`;
    }
    function munElegir(lado){
      const M = window._mun; if(!M || M.fin) return;
      const ronda = M.rondas[M.rondas.length-1], i = M.gan.length;
      M.hist.push({rondas: M.rondas.length, gan: [...M.gan]});
      M.gan.push(ronda[2*i+lado]);
      if(M.gan.length === ronda.length/2){
        if(M.gan.length===1){ M.fin = true; M.campeona = M.gan[0]; }
        else { M.rondas.push(M.gan); M.gan = []; }
      }
      _munPintar();
    }
    function munDeshacer(){
      const M = window._mun, h = M && M.hist.pop(); if(!h) return;
      M.rondas = M.rondas.slice(0, h.rondas); M.gan = h.gan; M.fin = false; _munPintar();
    }
    function munFicha(){
      const M = window._mun, ronda = M.rondas[M.rondas.length-1], i = M.gan.length;
      window._munDuelo = [ronda[2*i], ronda[2*i+1]];
      const cont = document.getElementById('mun-cont');
      cont.querySelector('.mun-acc').insertAdjacentHTML('afterend', `<div class="mun-elegir"><button type="button" class="noche-chip" onclick="abrirDetalle(_munDuelo[0])">${_escHtml(window._munDuelo[0].title)}</button><button type="button" class="noche-chip" onclick="abrirDetalle(_munDuelo[1])">${_escHtml(window._munDuelo[1].title)}</button></div>`);
      cont.querySelector('.mun-acc button:last-child').remove();
    }
    async function munAnadir(btn){
      const c = window._mun?.campeona; if(!c) return; btn.disabled = true;
      if(await _lpGuardar({id:c.id, tipo:c._tipo, t:c.title, poster:c.poster_path, f:c.release_date}, {pendiente:true}, `＋ «${c.title}» añadida a «Para ver»`)) btn.textContent = '✓ En tu lista'; else btn.disabled = false;
    }
    function _munFinal(){
      const M = window._mun, c = M.campeona, cont = document.getElementById('mun-cont');
      const fin = M.rondas[M.rondas.length-1], semis = M.rondas.length>1 ? M.rondas[M.rondas.length-2].filter(x=>!fin.includes(x)) : [];
      const finalista = fin.find(x=>x!==c);
      try{ localStorage.setItem('cm:mundial', JSON.stringify({t:c.title, id:c.id, tipo:c._tipo, f:Date.now()})); }catch(e){}
      window._munPodio = [c, finalista, ...semis].filter(Boolean);
      cont.innerHTML = `<div class="mun-campeona"><div class="copa">🏆</div><div class="noche-k" style="color:var(--k-767973)">Tu campeona</div>
        <img src="https://image.tmdb.org/t/p/w342${c.poster_path}" alt=""><h3>${_escHtml(c.title)}</h3>${c._nota!=null ? `<span class="noche-nota" style="color:#fff">🔮 Le pondrías un <b>${_notaFmt(c._nota)}</b></span>` : ''}
        <div class="mun-elegir"><button type="button" class="cta-btn" style="width:auto;padding:12px 22px" onclick="abrirDetalle(_munPodio[0])">▶ ¡A por ella!</button>${c._recom ? `<button type="button" class="ml-secundario" onclick="munAnadir(this)">＋ A «Para ver»</button>` : ''}<button type="button" class="ml-secundario" onclick="window._mun=null;abrirMundial()">Otro Mundial</button></div></div>
        <div class="mun-podio">${window._munPodio.map((x,i)=>`<div onclick="abrirDetalle(_munPodio[${i}])"><span>${i===0?'🥇':i===1?'🥈':'🥉'}</span>${_escHtml(x.title)}${i>1?' <small style="color:var(--k-767973)">· semifinal</small>':''}</div>`).join('')}</div>`;
    }
    const _sgFoto = (p, t) => p ? `<img loading="lazy" src="https://image.tmdb.org/t/p/${t||'w185'}${p}" alt="">` : '<div class="sg-sinfoto">👤</div>';
    const _sgPoster = p => p ? `<img loading="lazy" src="https://image.tmdb.org/t/p/w154${p}" alt="">` : '<div class="sg-sinfoto">🎬</div>';
    const _sgAnio = f => (f.release_date||'').slice(0,4);
    const _SG_FUERA = /\b(himself|herself|themselves|self|narrator|uncredited|archive|archival)\b|archivo|^(él mismo|ella misma)$/i;
    async function _sgPelis(pid){
      if(_sgCred.has(pid)) return _sgCred.get(pid);
      const pr = _tmdbJson(`/person/${pid}/movie_credits&language=es-ES`).then(d=>{
        const vistas = new Map();
        (d.cast||[]).forEach(c=>{
          if(!c.release_date || vistas.has(c.id) || (c.genre_ids||[]).includes(99) || _SG_FUERA.test(c.character||'')) return;
          vistas.set(c.id, {id:c.id, title:c.title, poster_path:c.poster_path, release_date:c.release_date, popularity:c.popularity||0, vote_count:c.vote_count||0, _tipo:'movie'});
        });
        return [...vistas.values()];
      }).catch(()=>{ _sgCred.delete(pid); return []; });
      _sgCred.set(pid, pr); return pr;
    }
    async function _sgReparto(mid){
      if(_sgRep.has(mid)) return _sgRep.get(mid);
      const pr = _tmdbJson(`/movie/${mid}/credits&language=es-ES`).then(d=>(d.cast||[]).filter(c=>c.order < 30 && !_SG_FUERA.test(c.character||'')).map(c=>({id:c.id, name:c.name, profile_path:c.profile_path, popularity:c.popularity||0, character:c.character||''})))
        .catch(()=>{ _sgRep.delete(mid); return []; });
      _sgRep.set(mid, pr); return pr;
    }
    const _sgFamosas = (pelis, n) => pelis.filter(f=>f.vote_count>=25).sort((a,b)=>b.vote_count-a.vote_count).slice(0, n);
    // Devuelve {grados, caminos:[[actor, peli, actor, peli, …, actor]]} o null
    async function _sgBuscar(A, B, avance){
      avance = avance || (()=>{});
      let nPelis = 0, nActores = 0;
      const [FA, FB] = await Promise.all([_sgPelis(A.id), _sgPelis(B.id)]);
      if(!FA.length || !FB.length) return {sinPelis: !FA.length ? A : B};
      // 1 grado: han salido juntos
      const idsB = new Set(FB.map(f=>f.id));
      const juntos = FA.filter(f=>idsB.has(f.id));
      if(juntos.length) return {grados:1, caminos: juntos.map(f=>[A, f, B])};
      // 2 grados: alguien que ha trabajado con los dos
      const vecinos = async (pelis, excluir, mapa) => {
        await _fetchEnLotes(pelis, async f=>{ const rep = await _sgReparto(f.id); nPelis++; rep.forEach(p=>{ if(p.id!==excluir && !mapa.has(p.id)){ mapa.set(p.id, {p, f}); nActores++; } }); avance(nPelis, nActores); }, 10);
      };
      const LA = new Map(), LB = new Map();
      await Promise.all([vecinos(_sgFamosas(FA, 45), A.id, LA), vecinos(_sgFamosas(FB, 45), B.id, LB)]);
      const dos = [...LA.keys()].filter(k=>LB.has(k) && k!==A.id && k!==B.id).map(k=>[A, LA.get(k).f, LA.get(k).p, LB.get(k).f, B]);
      if(dos.length) return {grados:2, caminos: dos};
      // 3 grados: un compañero de A y uno de B que coincidieron en otra película
      const topes = [[0, 30], [30, 80]];
      const porPeliA = new Map(), porPeliB = new Map();
      const masPopulares = L => [...L.values()].sort((a,b)=>b.p.popularity-a.p.popularity);
      const ordA = masPopulares(LA), ordB = masPopulares(LB);
      for(const [desde, hasta] of topes){
        const cargar = async (lista, mapa) => {
          await _fetchEnLotes(lista.slice(desde, hasta), async x=>{ const pelis = await _sgPelis(x.p.id); nActores++; avance(nPelis, nActores); pelis.forEach(f=>{ if(!mapa.has(f.id)) mapa.set(f.id, []); mapa.get(f.id).push(x); }); }, 10);
        };
        await Promise.all([cargar(ordA, porPeliA), cargar(ordB, porPeliB)]);
        const tres = [];
        porPeliA.forEach((xs, fid)=>{
          const ys = porPeliB.get(fid); if(!ys) return;
          xs.forEach(x=>ys.forEach(y=>{
            if(x.p.id===y.p.id || x.f.id===fid || y.f.id===fid) return;
            tres.push({x, y, fid});
          }));
        });
        if(tres.length){
          const caminos = [];
          for(const t of tres.slice(0, 60)){
            const pelisX = await _sgPelis(t.x.p.id), F = pelisX.find(f=>f.id===t.fid);
            if(F) caminos.push([A, t.x.f, t.x.p, F, t.y.p, t.y.f, B]);
          }
          if(caminos.length) return {grados:3, caminos};
        }
      }
      return null;
    }
    // Primero los caminos con películas que has visto; luego, los de películas más conocidas
    function _sgOrdenar(caminos){
      const vistos = window.idsVistosSet || new Set();
      const nota = c => { let v = 0, fama = 0; for(let i=1;i<c.length;i+=2){ if(vistos.has(`${c[i].id}-movie`)) v++; fama += Math.log10(1 + (c[i].vote_count||0)); } return v*10 + fama; };
      const vistosK = new Set();
      return caminos.filter(c=>{ const k = c.map(x=>x.id).join('-'); if(vistosK.has(k)) return false; vistosK.add(k); return true; }).sort((a,b)=>nota(b)-nota(a));
    }

    // ── pantalla
    let _sg = {A:null, B:null, eligiendo:null, caminos:[], idx:0, grados:0, juego:null};
    function abrirSeisGrados(actor){
      _sg = {A: actor && actor.id ? {id:actor.id, name:actor.name, profile_path:actor.profile_path||''} : null, B:null, eligiendo:null, caminos:[], idx:0, grados:0, juego:null};
      irA('p-seis');
      _sgPintarInicio();
      if(_sg.A) _sgElegir('B');
    }
    function _sgSlot(cual){
      const a = _sg[cual];
      return `<button type="button" class="sg-slot${a?' lleno':''}" onclick="_sgElegir('${cual}')">${a ? _sgFoto(a.profile_path) + _escHtml(a.name) + '<small>Cambiar</small>' : '<div class="sg-sinfoto">＋</div>Elige actor<small>o actriz</small>'}</button>`;
    }
    function _sgPintarInicio(){
      const c = document.getElementById('sg-cont'); if(!c) return;
      c.innerHTML = `<p class="rk-ayuda">Dicen que entre dos actores cualesquiera hay como mucho seis pasos: películas que comparten con otros actores. Elige dos y te enseño el camino más corto.</p>
        <div class="sg-par">${_sgSlot('A')}<span class="sg-y">↔</span>${_sgSlot('B')}</div>
        <div id="sg-elegir"></div>
        <div class="sg-botones">
          <button type="button" class="adm-btn prim" onclick="sgConectar()" ${_sg.A && _sg.B ? '' : 'disabled'}>🔗 Conectar</button>
          <button type="button" class="adm-btn" onclick="sgJugar()" ${_sg.A && _sg.B ? '' : 'disabled'}>🎮 Encontrarlo yo</button>
        </div>
        <button type="button" class="adm-btn" style="width:100%;margin-bottom:18px" onclick="sgAleatorio(this)">🎲 Reto aleatorio: dos actores al azar</button>
        <div id="sg-res"></div>`;
    }
    function _sgElegir(cual){
      _sg.eligiendo = cual;
      const box = document.getElementById('sg-elegir'); if(!box) return;
      box.innerHTML = `<div class="sg-buscador"><input class="auth-input" id="sg-q" type="search" placeholder="${cual==='A'?'Primer':'Segundo'} actor o actriz…" autocomplete="off" oninput="_sgBuscarPersona(this.value)"></div><div class="sg-resultados" id="sg-personas"></div>`;
      const i = document.getElementById('sg-q'); if(i && !document.documentElement.classList.contains('modo-tv')) i.focus();
    }
    let _sgQT = null;
    function _sgBuscarPersona(q){
      clearTimeout(_sgQT);
      const box = document.getElementById('sg-personas'); if(!box) return;
      if(q.trim().length < 2){ box.innerHTML = ''; return; }
      _sgQT = setTimeout(async ()=>{
        try{
          const r = ((await _tmdbJson(`/search/person&language=es-ES&include_adult=false&query=${encodeURIComponent(q.trim())}`)).results||[])
            .filter(p=>!p.adult).sort((a,b)=>(b.known_for_department==='Acting') - (a.known_for_department==='Acting') || b.popularity-a.popularity).slice(0,8);
          if(document.getElementById('sg-q')?.value.trim() !== q.trim()) return;
          window._sgOpc = r;
          box.innerHTML = r.length ? r.map((p,i)=>`<button type="button" class="sg-persona" onclick="_sgPoner(${i})">${_sgFoto(p.profile_path)}<span><b>${_escHtml(p.name)}</b><small>${_escHtml((p.known_for||[]).map(k=>k.title||k.name).filter(Boolean).slice(0,2).join(' · '))}</small></span></button>`).join('') : '<p class="rk-ayuda">No encuentro a nadie con ese nombre.</p>';
        }catch(e){ box.innerHTML = '<p class="rk-ayuda">No se ha podido buscar. Prueba otra vez.</p>'; }
      }, 280);
    }
    function _sgPoner(i){
      const p = (window._sgOpc||[])[i]; if(!p) return;
      const cual = _sg.eligiendo || (_sg.A ? 'B' : 'A');
      _sg[cual] = {id:p.id, name:p.name, profile_path:p.profile_path||''};
      _sg.eligiendo = null;
      _sgPintarInicio();
      if(!_sg.A) _sgElegir('A'); else if(!_sg.B) _sgElegir('B');
    }
    async function sgAleatorio(btn){
      if(btn){ btn.disabled = true; btn.textContent = '🎲 Eligiendo…'; }
      try{
        const pags = [1,2,3,4,5].sort(()=>Math.random()-.5).slice(0,2);
        const r = (await Promise.all(pags.map(n=>_tmdbJson(`/person/popular&language=es-ES&page=${n}`).catch(()=>({}))))).flatMap(d=>d.results||[])
          .filter(p=>p.known_for_department==='Acting' && !p.adult && p.profile_path && (p.known_for||[]).some(k=>k.media_type==='movie'));
        if(r.length < 2) throw 0;
        const a = r.splice(Math.floor(Math.random()*r.length), 1)[0], b = r[Math.floor(Math.random()*r.length)];
        _sg.A = {id:a.id, name:a.name, profile_path:a.profile_path}; _sg.B = {id:b.id, name:b.name, profile_path:b.profile_path};
        _sgPintarInicio();
        sgConectar();
      }catch(e){ if(btn){ btn.disabled = false; btn.textContent = '🎲 Reto aleatorio: dos actores al azar'; } }
    }
    async function sgConectar(){
      const {A, B} = _sg; if(!A || !B) return;
      const res = document.getElementById('sg-res'); if(!res) return;
      if(A.id===B.id){ res.innerHTML = '<p class="sg-sub">Es la misma persona: 0 grados 😄</p>'; return; }
      res.innerHTML = `<div class="sg-cargando"><span class="sg-pulso">🔗</span><div id="sg-avance">Buscando el camino…</div></div>`;
      res.scrollIntoView({block:'start', behavior:'smooth'});
      const par = `${A.id}-${B.id}`;
      const r = await _sgBuscar(A, B, (p, a)=>{ const e = document.getElementById('sg-avance'); if(e) e.textContent = `Revisadas ${p} películas y ${a.toLocaleString('es-ES')} actores…`; }).catch(()=>null);
      if(`${_sg.A?.id}-${_sg.B?.id}` !== par) return;
      if(r && r.sinPelis){ res.innerHTML = `<p class="sg-sub">${_escHtml(r.sinPelis.name)} no aparece como actor o actriz en ninguna película. Prueba con otra persona.</p>`; return; }
      if(!r){ res.innerHTML = `<div class="sg-titular">¡Están lejísimos! 🌌</div><p class="sg-sub">No he encontrado un camino de 3 pasos o menos entre ${_escHtml(A.name)} y ${_escHtml(B.name)}. Rarísimo: casi todos los actores conocidos están a 3 o menos.</p>`; return; }
      _sg.caminos = _sgOrdenar(r.caminos); _sg.idx = 0; _sg.grados = r.grados;
      _sgPintarCamino();
    }
    function _sgPintarCamino(){
      const res = document.getElementById('sg-res'), c = _sg.caminos[_sg.idx]; if(!res || !c) return;
      const vistos = window.idsVistosSet || new Set(), g = _sg.grados;
      window._sgActual = c;
      let html = '', d = 0;
      c.forEach((x, i)=>{
        if(i>0) html += `<div class="sg-linea" style="animation-delay:${d - .15}s"></div>`;
        if(i%2===0) html += `<div class="sg-nodo sg-actor${i===0||i===c.length-1?' extremo':''}" style="animation-delay:${d}s" onclick="_sgAbrir(${i})">${_sgFoto(x.profile_path)}<b>${_escHtml(x.name)}</b></div>`;
        else html += `<div class="sg-nodo sg-peli" style="animation-delay:${d}s" onclick="_sgAbrir(${i})">${_sgPoster(x.poster_path)}<div><b>${_escHtml(x.title)}</b><small>${_sgAnio(x)}</small>${vistos.has(`${x.id}-movie`) ? '<br><span class="sg-vista">✓ La has visto</span>' : ''}</div></div>`;
        d += .32;
      });
      const nVistas = c.filter((x,i)=>i%2===1 && vistos.has(`${x.id}-movie`)).length;
      res.innerHTML = `<div class="sg-titular">${_escHtml(_sg.A.name)} y ${_escHtml(_sg.B.name)}<br>están a <em>${g} ${g===1?'grado':'grados'}</em></div>
        <div class="sg-sub">${_sg.caminos.length > 1 ? `Hay ${_sg.caminos.length} caminos así de cortos${_sg.caminos.length>1 ? ` · este es el ${_sg.idx+1}` : ''}` : 'Solo hay un camino así de corto'}${nVistas ? ` · pasa por ${nVistas} ${nVistas===1?'película que has visto':'películas que has visto'}` : ''}</div>
        <div class="sg-cadena">${html}</div>
        <div class="sg-botones">
          ${_sg.caminos.length > 1 ? `<button type="button" class="adm-btn" onclick="_sg.idx=(_sg.idx+1)%_sg.caminos.length;_sgPintarCamino()">↻ Otro camino</button>` : ''}
          <button type="button" class="adm-btn" onclick="sgCompartir()">📤 Compartir</button>
          <button type="button" class="adm-btn" onclick="sgJugar()">🎮 Jugar con este par</button>
        </div>`;
    }
    function _sgAbrir(i){
      const x = (window._sgActual||[])[i]; if(!x) return;
      if(i%2===1) abrirDetalle({...x, _tipo:'movie'});
      else mostrarFilmografia(x.id, x.name, x.profile_path||'', 'Actor');
    }
    async function sgCompartir(){
      const c = window._sgActual; if(!c) return;
      const txt = `${c[0].name} y ${c[c.length-1].name} están a ${_sg.grados} ${_sg.grados===1?'grado':'grados'}:\n` + c.map((x,i)=>i%2 ? `   🎬 ${x.title} (${_sgAnio(x)})` : `👤 ${x.name}`).join('\n') + `\n\nDescubierto con CineMood 🔗`;
      try{ if(navigator.share){ await navigator.share({text: txt}); return; } }catch(e){ return; }
      try{ await navigator.clipboard.writeText(txt); alert('Copiado: pégalo donde quieras.'); }catch(e){ prompt('Copia el camino:', txt); }
    }

    // ── el juego: llega tú de A a B saltando de película en película
    async function sgJugar(){
      const {A, B} = _sg; if(!A || !B) return;
      _sg.juego = {pasos:[A], mejor:null, actual:A, peli:null};
      _sgBuscar(A, B).then(r=>{ if(_sg.juego && r && r.grados){ _sg.juego.mejor = r.grados; if(!_sg.caminos.length || _sg.grados!==r.grados){ _sg.caminos = _sgOrdenar(r.caminos); _sg.idx = 0; _sg.grados = r.grados; } } }).catch(()=>{});
      _sgPintarJuego();
    }
    async function _sgPintarJuego(){
      const j = _sg.juego, res = document.getElementById('sg-res'); if(!j || !res) return;
      const saltos = (j.pasos.length - 1);
      const miga = j.pasos.map((x,i)=>i%2 ? `🎬 ${_escHtml(x.title)}` : `<b>${_escHtml(x.name)}</b>`).join(' → ');
      const cab = `<div class="sg-juego-cab">${_sgFoto(_sg.B.profile_path)}<div class="i">Tienes que llegar a<b>${_escHtml(_sg.B.name)}</b></div><div class="sg-pasos">${Math.floor(saltos/2)}<small>grados</small></div></div>
        <div class="sg-miga">${miga}</div>
        <div class="sg-botones">${j.pasos.length > 1 ? '<button type="button" class="adm-btn" onclick="_sgDeshacer()">↩ Deshacer</button>' : ''}<button type="button" class="adm-btn" onclick="_sgRendirse()">🏳️ Ver la solución</button></div>`;
      res.scrollIntoView({block:'start', behavior:'smooth'});
      if(!j.peli){
        res.innerHTML = cab + `<p class="rk-ayuda">Elige una película de <b>${_escHtml(j.actual.name)}</b>:</p><input class="auth-input" type="search" placeholder="Filtrar por título…" oninput="_sgFiltrarRejilla(this.value)" style="margin-bottom:10px"><div class="sg-rejilla" id="sg-rej"><div class="sg-cargando">Cargando…</div></div>`;
        const pelis = (await _sgPelis(j.actual.id)).slice().sort((a,b)=>b.vote_count-a.vote_count).slice(0, 80);
        if(_sg.juego!==j || j.peli) return;
        window._sgOpcJ = pelis;
        document.getElementById('sg-rej').innerHTML = pelis.map((f,i)=>`<button type="button" data-t="${_escHtml((f.title||'').toLowerCase())}" onclick="_sgElegirPeli(${i})">${_sgPoster(f.poster_path)}${_escHtml(f.title)}<small>${_sgAnio(f)}</small></button>`).join('') || '<p class="rk-ayuda">No hay películas.</p>';
      }else{
        res.innerHTML = cab + `<p class="rk-ayuda">¿Con quién de <b>${_escHtml(j.peli.title)}</b> sigues?</p><div class="sg-rejilla caras" id="sg-rej"><div class="sg-cargando">Cargando…</div></div>`;
        const rep = (await _sgReparto(j.peli.id)).filter(p=>p.id!==j.actual.id);
        if(_sg.juego!==j || !j.peli) return;
        window._sgOpcJ = rep;
        document.getElementById('sg-rej').innerHTML = rep.map((p,i)=>`<button type="button" onclick="_sgElegirActor(${i})">${_sgFoto(p.profile_path)}${_escHtml(p.name)}<small>${_escHtml(p.character)}</small></button>`).join('');
      }
    }
    function _sgFiltrarRejilla(q){ q = q.trim().toLowerCase(); document.querySelectorAll('#sg-rej button').forEach(b=>{ b.style.display = !q || (b.dataset.t||'').includes(q) ? '' : 'none'; }); }
    function _sgElegirPeli(i){ const j = _sg.juego, f = (window._sgOpcJ||[])[i]; if(!j || !f) return; j.peli = f; j.pasos.push(f); _sgPintarJuego(); }
    function _sgElegirActor(i){
      const j = _sg.juego, p = (window._sgOpcJ||[])[i]; if(!j || !p) return;
      j.pasos.push(p); j.actual = p; j.peli = null;
      if(p.id === _sg.B.id) return _sgGanar();
      _sgPintarJuego();
    }
    function _sgDeshacer(){
      const j = _sg.juego; if(!j || j.pasos.length < 2) return;
      j.pasos.pop();
      const ult = j.pasos[j.pasos.length-1];
      if(j.pasos.length % 2 === 0){ j.peli = ult; j.actual = j.pasos[j.pasos.length-2]; } else { j.peli = null; j.actual = ult; }
      _sgPintarJuego();
    }
    function _sgGanar(){
      const j = _sg.juego, res = document.getElementById('sg-res'); if(!j || !res) return;
      const g = Math.floor((j.pasos.length-1)/2), mejor = j.mejor;
      const veredicto = mejor == null ? '' : g <= mejor ? `🏆 ¡Perfecto! Es el camino más corto posible.` : `El más corto era de ${mejor} ${mejor===1?'grado':'grados'}. ¿Lo intentas otra vez?`;
      _sg.caminos = [j.pasos.slice(), ...(_sg.caminos||[])]; _sg.idx = 0;
      window._sgActual = j.pasos.slice();
      res.innerHTML = `<div class="sg-gana"><span class="sg-big">${mejor!=null && g<=mejor ? '🏆' : '🎉'}</span><div class="sg-titular">¡Llegaste en <em>${g} ${g===1?'grado':'grados'}</em>!</div><div class="sg-sub">${veredicto}</div></div>
        <div class="sg-cadena">${j.pasos.map((x,i)=>(i?`<div class="sg-linea" style="animation-delay:${i*.25-.1}s"></div>`:'') + (i%2 ? `<div class="sg-nodo sg-peli" style="animation-delay:${i*.25}s" onclick="_sgAbrir(${i})">${_sgPoster(x.poster_path)}<div><b>${_escHtml(x.title)}</b><small>${_sgAnio(x)}</small></div></div>` : `<div class="sg-nodo sg-actor${i===0||i===j.pasos.length-1?' extremo':''}" style="animation-delay:${i*.25}s" onclick="_sgAbrir(${i})">${_sgFoto(x.profile_path)}<b>${_escHtml(x.name)}</b></div>`)).join('')}</div>
        <div class="sg-botones"><button type="button" class="adm-btn" onclick="_sg.grados=${g};sgCompartir()">📤 Compartir</button>${mejor!=null && g>mejor ? '<button type="button" class="adm-btn" onclick="_sgRendirse()">Ver el más corto</button>' : ''}<button type="button" class="adm-btn prim" onclick="sgAleatorio()">🎲 Otro reto</button></div>`;
      _sg.juego = null;
    }
    async function _sgRendirse(){
      _sg.juego = null;
      const res = document.getElementById('sg-res');
      if(_sg.caminos.length && _sg.grados){ _sg.caminos = _sg.caminos.filter(c=>(c.length-1)/2===_sg.grados); _sg.idx = 0; _sgPintarCamino(); }
      else sgConectar();
    }
