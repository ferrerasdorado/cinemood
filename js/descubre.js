// CineMood · Descubre, imprescindibles, «¿Qué vemos?» y calendario de estrenos
// (Parte de index.html; se carga como script clásico: todo comparte el mismo ámbito global.)

    // ══ DESCUBRE: lo popular, lo que es tendencia, lo que hay en cines y en cada plataforma (datos de TMDB) ══
    const DESC_PLATAFORMAS = [['','Todo'],['8','Netflix'],['119','Prime Video'],['337','Disney+'],['1899','Max'],['149','Movistar+'],['350','Apple TV+'],['76','SkyShowtime'],['63','Filmin']];
    function _descPlataforma(){ try{ return localStorage.getItem('cm:descPlataforma') || ''; }catch(e){ return ''; } }
    // Cada fila: título, tipo y la ruta de TMDB para una página concreta
    function _descFilas(prov){
      const hoy = new Date().toISOString().slice(0,10);
      if(!prov) return [
        {k:'tend-m', t:'🔥 Tendencia esta semana · Películas', tipo:'movie', r:pg=>`/trending/movie/week&language=es-ES&page=${pg}`},
        {k:'tend-s', t:'🔥 Tendencia esta semana · Series', tipo:'tv', r:pg=>`/trending/tv/week&language=es-ES&page=${pg}`},
        {k:'pop-m', t:'Populares · Películas', tipo:'movie', r:pg=>`/movie/popular&language=es-ES&region=ES&page=${pg}`},
        {k:'pop-s', t:'Populares · Series', tipo:'tv', r:pg=>`/tv/popular&language=es-ES&page=${pg}`},
        {k:'cines', t:'🍿 En cines', tipo:'movie', r:pg=>`/movie/now_playing&language=es-ES&region=ES&page=${pg}`},
        {k:'prox', t:'📅 Próximamente en cines', tipo:'movie', calendario:true, custom:pg=>_descProximos(pg)},
        {k:'emision', t:'📺 Series en emisión', tipo:'tv', r:pg=>`/tv/on_the_air&language=es-ES&page=${pg}`},
        {k:'top-m', t:'⭐ Las mejor valoradas · Películas', tipo:'movie', r:pg=>`/movie/top_rated&language=es-ES&page=${pg}`},
        {k:'top-s', t:'⭐ Las mejor valoradas · Series', tipo:'tv', r:pg=>`/tv/top_rated&language=es-ES&page=${pg}`},
        ..._descEncantariaFilas(''),
        ..._descJoyas(''),
        {k:'publico-critica', t:'🍿 Al público le encantó y la crítica no', tipo:'movie', custom:pg=>_descPublicoVsCritica(pg)},
      ].reduce((acc,f,i)=>{ acc.push(f); if(i===1) acc.push(..._descMezclasFilas('')); return acc; }, []);
      const n = (DESC_PLATAFORMAS.find(([id])=>id===prov)||[])[1] || 'la plataforma';
      const base = t => `/discover/${t}&language=es-ES&watch_region=ES&with_watch_providers=${prov}&with_watch_monetization_types=flatrate`;
      const fecha = t => t==='movie' ? 'primary_release_date' : 'first_air_date';
      const paraTi = sesionActual && _cargarPerfilGustoCache()?.generosPeso ? [{k:`p${prov}-parati`, t:`✨ Para ti en ${n}`, tipo:'mix', custom:pg=>_descParaTi(prov, pg)}] : [];
      return [...paraTi,
        {k:`p${prov}-pop-m`, t:`Lo más visto en ${n} · Películas`, tipo:'movie', r:pg=>`${base('movie')}&sort_by=popularity.desc&page=${pg}`},
        {k:`p${prov}-pop-s`, t:`Lo más visto en ${n} · Series`, tipo:'tv', r:pg=>`${base('tv')}&sort_by=popularity.desc&page=${pg}`},
        {k:`p${prov}-new-m`, t:`🆕 Estrenos recientes en ${n} · Películas`, tipo:'movie', r:pg=>`${base('movie')}&sort_by=${fecha('movie')}.desc&${fecha('movie')}.lte=${hoy}&vote_count.gte=10&page=${pg}`},
        {k:`p${prov}-new-s`, t:`🆕 Estrenos recientes en ${n} · Series`, tipo:'tv', r:pg=>`${base('tv')}&sort_by=${fecha('tv')}.desc&${fecha('tv')}.lte=${hoy}&vote_count.gte=10&page=${pg}`},
        {k:`p${prov}-top-m`, t:`⭐ Las mejor valoradas en ${n} · Películas`, tipo:'movie', r:pg=>`${base('movie')}&sort_by=vote_average.desc&vote_count.gte=500&page=${pg}`},
        {k:`p${prov}-top-s`, t:`⭐ Las mejor valoradas en ${n} · Series`, tipo:'tv', r:pg=>`${base('tv')}&sort_by=vote_average.desc&vote_count.gte=300&page=${pg}`},
        ..._descEncantariaFilas(prov),
        ..._descJoyas(prov),
      ].reduce((acc,f,i)=>{ acc.push(f); if(i===1) acc.push(..._descMezclasFilas(prov)); return acc; }, []);
    }
    // Joyas ocultas: nota muy alta pero pocos votos (lo que no sale en ninguna lista de populares)
    function _descEncantariaFilas(prov){
      if(!sesionActual) return [];
      const n = prov ? (DESC_PLATAFORMAS.find(([id])=>id===prov)||[])[1] : '';
      return [['movie','Películas'],['tv','Series']].map(([t,l])=>({k:`encanta-${t}-${prov}`, t:`🔮 Te encantaría y casi nadie la ha visto${n ? ' · '+n : ''} · ${l}`, tipo:t, custom:pg=>_descEncantaria(prov, t, pg)}));
    }
    function _descJoyas(prov){
      const hoy = new Date().toISOString().slice(0,10), n = prov ? (DESC_PLATAFORMAS.find(([id])=>id===prov)||[])[1] : '';
      const pq = prov ? `&watch_region=ES&with_watch_providers=${prov}&with_watch_monetization_types=flatrate` : '';
      return [
        {k:`joyas-m-${prov}`, t:`💎 Joyas ocultas${n ? ' en '+n : ''} · Películas`, tipo:'movie', r:pg=>`/discover/movie&language=es-ES${pq}&sort_by=vote_average.desc&vote_average.gte=7.4&vote_count.gte=${prov?60:150}&vote_count.lte=1800&primary_release_date.lte=${hoy}&without_genres=99,10770&with_runtime.gte=70&page=${pg}`},
        {k:`joyas-s-${prov}`, t:`💎 Joyas ocultas${n ? ' en '+n : ''} · Series`, tipo:'tv', r:pg=>`/discover/tv&language=es-ES${pq}&sort_by=vote_average.desc&vote_average.gte=7.6&vote_count.gte=${prov?40:80}&vote_count.lte=900&first_air_date.lte=${hoy}&without_genres=10763,10764,10767,99,16&page=${pg}`},
      ];
    }
    async function _descDatos(fila, pg){
      if(fila.custom){
        const ck = `custom:${fila.k}:${pg}`, cc = window._descCache[ck];
        if(cc && Date.now()-cc.t < 30*60e3) return cc.d;
        const res = await fila.custom(pg); window._descCache[ck] = {t:Date.now(), d:res}; return res;
      }
      const ruta = fila.r(pg), c = window._descCache[ruta];
      if(c && Date.now()-c.t < 30*60e3) return c.d;
      const d = await _tmdbJson(ruta);
      const lista = (d.results||[]).filter(x=>x.poster_path && !esOculta(x.id, fila.tipo) && !(fila.tipo==='tv' && (x.genre_ids||[]).some(g=>GENEROS_NO_FICCION_TV.has(g))))
        .map(x=>({...x, _tipo:fila.tipo, title:x.title||x.name, release_date:x.release_date||x.first_air_date}));
      const res = {lista, paginas:d.total_pages||1};
      window._descCache[ruta] = {t:Date.now(), d:res};
      return res;
    }
    // «Para ti en Netflix»: lo de esa plataforma que encaja con tus géneros favoritos, ordenado por tu gusto (sin lo que ya has visto)
    const _GEN_A_TV = {28:10759, 12:10759, 878:10765, 14:10765, 10752:10768, 27:9648, 53:80};
    async function _descParaTi(prov, pg){
      const perfil = _cargarPerfilGustoCache(); if(!perfil?.generosPeso) return {lista:[], paginas:1};
      const top = Object.entries(perfil.generosPeso).sort((a,b)=>b[1]-a[1]).slice(0,4).map(([g])=>Number(g));
      const gTv = [...new Set(top.map(g=>_GEN_A_TV[g]||g))];
      const q = (t,g) => `/discover/${t}&language=es-ES&watch_region=ES&with_watch_providers=${prov}&with_watch_monetization_types=flatrate&with_genres=${g.join('|')}&sort_by=popularity.desc&vote_average.gte=6.5&vote_count.gte=100&page=${pg}`;
      const [m, t] = await Promise.all([_tmdbJson(q('movie',top)).catch(()=>({})), _tmdbJson(q('tv',gTv)).catch(()=>({}))]);
      const vistos = window.idsVistosSet || new Set();
      const lista = [...(m.results||[]).map(x=>({...x,_tipo:'movie'})), ...(t.results||[]).map(x=>({...x,_tipo:'tv'}))]
        .filter(x=>x.poster_path && !vistos.has(`${x.id}-${x._tipo}`) && !esOculta(x.id, x._tipo))
        .map(x=>({...x, title:x.title||x.name, release_date:x.release_date||x.first_air_date, _g:_puntuarPorGustoEstable({genre_ids:x.genre_ids, release_date:x.release_date||x.first_air_date, vote_average:x.vote_average}, perfil)}))
        .sort((a,b)=>b._g-a._g);
      return {lista, paginas:Math.min(m.total_pages||1, t.total_pages||1)};
    }
    // Explorar por género: tarjetas que abren una rejilla con orden y tipo (y la plataforma elegida, si hay)
    const DESC_GENEROS = [
      {k:'accion', n:'Acción', e:'💥', c:'#b52c29', movie:'with_genres=28', tv:'with_genres=10759'},
      {k:'comedia', n:'Comedia', e:'😂', c:'#d4861c', movie:'with_genres=35&without_genres=16', tv:'with_genres=35&without_genres=16'},
      {k:'drama', n:'Drama', e:'🎭', c:'#6b4fa0', movie:'with_genres=18', tv:'with_genres=18'},
      {k:'terror', n:'Terror', e:'👻', c:'#3a3d3b', movie:'with_genres=27'},
      {k:'thriller', n:'Thriller', e:'🔪', c:'#3c4a5c', movie:'with_genres=53', tv:'with_genres=80|9648'},
      {k:'scifi', n:'Ciencia ficción', e:'🚀', c:'#1f5f8b', movie:'with_genres=878', tv:'with_genres=10765'},
      {k:'fantasia', n:'Fantasía', e:'🐉', c:'#3d6651', movie:'with_genres=14', tv:'with_genres=10765'},
      {k:'crimen', n:'Crimen', e:'🕵️', c:'#6a4330', movie:'with_genres=80', tv:'with_genres=80'},
      {k:'romance', n:'Romance', e:'💕', c:'#c2456b', movie:'with_genres=10749'},
      {k:'animacion', n:'Animación', e:'🎨', c:'#e0703a', movie:'with_genres=16', tv:'with_genres=16'},
      {k:'anime', n:'Anime', e:'🍥', c:'#d4497f', movie:'with_genres=16&with_original_language=ja', tv:'with_genres=16&with_original_language=ja'},
      {k:'docu', n:'Documentales', e:'🌍', c:'#4f7a3a', movie:'with_genres=99', tv:'with_genres=99'},
      {k:'familia', n:'En familia', e:'👨‍👩‍👧', c:'#3a8fb7', movie:'with_genres=10751', tv:'with_genres=10751'},
      {k:'belicas', n:'Bélicas', e:'🎖️', c:'#5c5a3a', movie:'with_genres=10752', tv:'with_genres=10768'},
      {k:'western', n:'Western', e:'🤠', c:'#9a6a34', movie:'with_genres=37', tv:'with_genres=37'},
      {k:'espanol', n:'Cine español', e:'🇪🇸', c:'#c4302b', movie:'with_origin_country=ES&with_original_language=es', tv:'with_origin_country=ES&with_original_language=es'},
      {k:'corea', n:'Coreanas', e:'🇰🇷', c:'#2f4f8f', movie:'with_original_language=ko', tv:'with_original_language=ko&with_genres=18'},
      {k:'clasicos', n:'Clásicos', e:'🎞️', c:'#6b5b4a', movie:'primary_release_date.lte=1979-12-31', clasico:true},
    ];
    function _descPintarGeneros(prov){
      const n = prov ? (DESC_PLATAFORMAS.find(([id])=>id===prov)||[])[1] : '';
      document.getElementById('desc-generos').innerHTML = `<div class="desc-fila-cab"><h3>Explora por género${n ? `<span class="desc-tipo">En ${_escHtml(n)}</span>` : ''}</h3></div>
        <div class="desc-gen-scroll">${DESC_GENEROS.map(g=>`<button type="button" class="desc-gen" data-g="${g.k}" style="--c:${g.c}" onclick="descAbrirGenero('${g.k}')"><span class="desc-gen-n">${g.n}</span></button>`).join('')}</div>`;
    }
    // Fondo de cada tarjeta de género: la imagen del título más popular de ese género (y de la plataforma elegida)
    async function _descImagenesGeneros(prov){
      const provQ = prov ? `&watch_region=ES&with_watch_providers=${prov}&with_watch_monetization_types=flatrate` : '';
      const turno = (window._genTurno = (window._genTurno||0)+1), usadas = new Set();
      await _fetchEnLotes(DESC_GENEROS, async g=>{
        const tipo = g.movie ? 'movie' : 'tv';
        try{
          const r = await _descDatos({k:`genimg-${g.k}-${prov}`, tipo, r:()=>`/discover/${tipo}&language=es-ES${provQ}&${g[tipo]}&sort_by=popularity.desc&vote_count.gte=${g.clasico?1000:200}&page=1`}, 1);
          if(turno!==window._genTurno) return;
          const x = r.lista.find(y=>y.backdrop_path && !usadas.has(y.id)) || r.lista.find(y=>y.backdrop_path); if(!x) return;
          usadas.add(x.id);
          const b = document.querySelector(`.desc-gen[data-g="${g.k}"]`); if(b){ b.style.setProperty('--img', `url('https://image.tmdb.org/t/p/w300${x.backdrop_path}')`); b.classList.add('con-img'); }
        }catch(e){}
      }, 6);
    }
    // Época y nota mínima de las rejillas (se reinician al abrir otra)
    const DESC_EPOCAS = [['','Cualquier época'],['a80','Antes de 1980',null,'1979-12-31'],['80','1980 – 1999','1980-01-01','1999-12-31'],['00','2000 – 2014','2000-01-01','2014-12-31'],['15','De 2015 a hoy','2015-01-01',null]];
    function _descPasaFiltro(p){
      const e = DESC_EPOCAS.find(x=>x[0]===window._descF.ep), f = p.release_date || '';
      if(e && e[0]){ if(!f) return false; if(e[2] && f<e[2]) return false; if(e[3] && f>e[3]) return false; }
      if(window._descF.nota && !((p.vote_average||0) >= Number(window._descF.nota))) return false;
      return true;
    }
    function _descPintarFiltros(){
      const el = document.getElementById('desc-todo-filtros'); if(!el) return;
      const F = window._descF;
      el.innerHTML = `<select onchange="descCambiarFiltro('ep',this.value)" aria-label="Época">${DESC_EPOCAS.map(([v,l])=>`<option value="${v}"${v===F.ep?' selected':''}>${l}</option>`).join('')}</select>
        <select onchange="descCambiarFiltro('nota',this.value)" aria-label="Nota mínima">${[['','Cualquier nota'],['6','★ 6 o más'],['7','★ 7 o más'],['8','★ 8 o más']].map(([v,l])=>`<option value="${v}"${v===F.nota?' selected':''}>${l}</option>`).join('')}</select>
        <button type="button" class="desc-dado" onclick="descDado()" title="Elegir uno al azar" aria-label="Elegir uno al azar">🎲</button>`;
    }
    function descCambiarFiltro(campo, v){
      window._descF[campo] = v;
      const a = window._descTodoArgs; if(!a) return;
      if(a.f.genero) descAbrirGenero(a.f.genero.k, a.f.genero.tipo, a.f.genero.orden);
      else _descTodoIniciar(a.f, a.titulo, a.ctl);
    }
    // 🎲: la ruleta de Sorpréndeme, pero con lo que estás viendo en la rejilla (ya filtrado)
    async function descDado(){
      const d = window._descTodo; if(!d) return;
      if(d.lista.length<10 && d.pg<Math.min(d.paginas,20)) await _descTodoMas();
      const pool = (d.lista||[]).filter(p=>p.poster_path);
      if(pool.length<2){ _avisoDeshacer('No hay suficientes títulos para elegir al azar', null); return; }
      lanzarRuleta(pool);
    }
    function descAbrirGenero(k, tipo, orden){
      const g = DESC_GENEROS.find(x=>x.k===k) || (window._descExtra||{})[k]; if(!g) return;
      if(window._descFKey!==k){ window._descF = {ep:'', nota:''}; window._descFKey = k; }
      tipo = tipo && g[tipo] ? tipo : (g.movie ? 'movie' : 'tv');
      orden = orden || (g.clasico ? 'nota' : 'pop');
      const prov = _descPlataforma(), hoy = new Date().toISOString().slice(0,10), fecha = tipo==='movie' ? 'primary_release_date' : 'first_air_date';
      const provQ = prov ? `&watch_region=ES&with_watch_providers=${prov}&with_watch_monetization_types=flatrate` : '';
      const sort = {pop:'popularity.desc', nota:'vote_average.desc', nuevas:`${fecha}.desc`}[orden];
      const F = window._descF, ep = DESC_EPOCAS.find(x=>x[0]===F.ep) || DESC_EPOCAS[0];
      const votos = Math.max(F.nota ? 100 : 0, orden==='nota' ? (g.clasico ? 1000 : 300) : g.clasico ? 300 : orden==='nuevas' ? 20 : 50); // en clásicos, solo títulos conocidos
      // un mismo filtro dos veces hace que TMDB rechace la petición: la fecha límite se calcula una sola vez
      const tope = g[tipo].includes(`${fecha}.lte`) ? '' : (ep[3] && ep[3]<hoy ? ep[3] : hoy);
      const extra = `${tope ? `&${fecha}.lte=${tope}` : ''}${ep[2] ? `&${fecha}.gte=${ep[2]}` : ''}${F.nota ? `&vote_average.gte=${F.nota}` : ''}`;
      const f = {k:`gen-${k}-${tipo}-${orden}-${prov}-${F.ep}-${F.nota}`, tipo, t:g.n, genero:{k, tipo, orden}, r:pg=>`/discover/${tipo}&language=es-ES${provQ}&${g[tipo]}&sort_by=${sort}&vote_count.gte=${votos}${extra}&page=${pg}`};
      const n = prov ? (DESC_PLATAFORMAS.find(([id])=>id===prov)||[])[1] : '';
      const ctl = `${g.movie && g.tv ? `<div class="fm-tipos">${[['movie','Películas'],['tv','Series']].map(([t,l])=>`<button type="button" class="fm-tipo${t===tipo?' activo':''}" onclick="descAbrirGenero('${k}','${t}','${orden}')">${l}</button>`).join('')}</div>` : '<span></span>'}
        <select onchange="descAbrirGenero('${k}','${tipo}',this.value)" aria-label="Ordenar">${[['pop','Más populares'],['nota','Mejor valoradas'],['nuevas','Más nuevas']].map(([o,l])=>`<option value="${o}"${o===orden?' selected':''}>${l}</option>`).join('')}</select>`;
      _descTodoIniciar(f, `${g.n}${n ? ` en ${n}` : ''}`, ctl);
    }
    // ══ LAS 100 IMPRESCINDIBLES: lo mejor valorado de la historia (TMDB) y cuántas te faltan ══
    async function abrirImprescindibles(tipo){
      irA('p-imprescindibles');
      window._imp = window._imp || {tipo:'movie', falta:false, orden:'rank'};
      if(tipo) window._imp.tipo = tipo;
      const t = window._imp.tipo;
      document.getElementById('imp-tipos').innerHTML = [['movie','Películas'],['tv','Series']].map(([k,l])=>`<button type="button" class="fm-tipo${k===t?' activo':''}" onclick="abrirImprescindibles('${k}')">${l}</button>`).join('');
      document.getElementById('imp-lista').innerHTML = '<p class="rk-ayuda">Cargando…</p>';
      window._impCache = window._impCache || {};
      if(!window._impCache[t]){
        const pags = await Promise.all([1,2,3,4,5,6].map(n=>_tmdbJson(`/${t}/top_rated&language=es-ES&page=${n}`).catch(()=>({}))));
        const ya = new Set();
        // fuera animación japonesa repetida, documentales y especiales de TV: la lista es de cine y series «de toda la vida»
        window._impCache[t] = pags.flatMap(d=>d.results||[]).filter(x=>x.poster_path && (x.vote_count||0)>=(t==='movie'?3000:800) && !(x.genre_ids||[]).some(g=>[99,10767,10764,10763].includes(g)) && !ya.has(x.id) && ya.add(x.id))
          .slice(0,100).map((x,i)=>({...x, _tipo:t, title:x.title||x.name, release_date:x.release_date||x.first_air_date, _rank:i+1}));
      }
      if(window._imp.tipo!==t) return;
      if(sesionActual && !(window.idsVistosSet && window.idsVistosSet.size)){ try{ await refrescarIdsVistos(); }catch(e){} }
      await _descCargarPendientes();
      _impPintar();
    }
    function impCambiar(k, v){ window._imp[k] = v; _impPintar(); }
    function _impPintar(){
      const t = window._imp.tipo, todos = (window._impCache||{})[t] || [], vistos = window.idsVistosSet || new Set();
      const visto = x => vistos.has(`${x.id}-${t}`), nV = todos.filter(visto).length, total = todos.length;
      const pct = total ? Math.round(nV/total*100) : 0;
      const sub = document.getElementById('imp-entrada-sub'); if(sub && t==='movie' && sesionActual) sub.textContent = `Has visto ${nV} de las ${total} mejores películas`;
      document.getElementById('imp-progreso').innerHTML = `<div class="saga-progreso"><div class="saga-prog-t"><b>Has visto ${nV} de ${total}</b> · ${nV===total ? '¡todas! 🏆' : `te faltan ${total-nV}`}</div><div class="lg-barra"><div style="width:${pct}%"></div></div>
        <div class="saga-prog-m">${pct>=80 ? '🏆 Nivel leyenda' : pct>=50 ? '🎬 Cinéfilo de verdad' : pct>=25 ? '🍿 Vas por buen camino' : '🌱 Te queda mucho por disfrutar'} · las ${total} ${t==='tv'?'series':'películas'} mejor valoradas en TMDB con muchos votos</div></div>`;
      document.getElementById('imp-ctl').innerHTML = `<div class="fm-tipos">${[[false,'Todas'],[true,'Solo las que me faltan']].map(([v,l])=>`<button type="button" class="fm-tipo${window._imp.falta===v?' activo':''}" onclick="impCambiar('falta',${v})">${l}</button>`).join('')}</div>
        <select onchange="impCambiar('orden',this.value)" aria-label="Ordenar"><option value="rank"${window._imp.orden==='rank'?' selected':''}>Por puesto</option><option value="gusto"${window._imp.orden==='gusto'?' selected':''}>Según mi gusto</option><option value="anio"${window._imp.orden==='anio'?' selected':''}>Por año</option></select>`;
      let l = todos.filter(x=>!window._imp.falta || !visto(x));
      const perfil = _cargarPerfilGustoCache();
      if(window._imp.orden==='gusto' && perfil) l = l.slice().sort((a,b)=>_puntuarPorGustoEstable(b,perfil)-_puntuarPorGustoEstable(a,perfil));
      else if(window._imp.orden==='anio') l = l.slice().sort((a,b)=>(a.release_date||'').localeCompare(b.release_date||''));
      window._impLista = l;
      document.getElementById('imp-lista').innerHTML = l.length ? l.map((x,i)=>`<div class="saga-fila${visto(x)?' visto':''}" onclick="abrirDetalle(_impLista[${i}])" ${_lp({id:x.id,tipo:t,t:x.title,poster:x.poster_path,f:x.release_date})}>
          <span class="saga-n">${x._rank}</span><img loading="lazy" src="https://image.tmdb.org/t/p/w154${x.poster_path}" alt="">
          <div class="fm-info"><div class="fm-t">${_escHtml(x.title)}</div><div class="fm-m">${(x.release_date||'').slice(0,4)} · ★ ${(x.vote_average||0).toFixed(1)}</div></div>
          ${visto(x) ? '<span class="saga-e v">✓ Vista</span>' : `<button type="button" class="imp-marcar" onclick="event.stopPropagation();impMarcar(${i},this)" aria-label="Marcar como vista">✓</button>`}</div>`).join('') : '<div class="pq-fin"><div class="pq-fin-e">🏆</div><div class="pq-fin-t">¡Las has visto todas!</div></div>';
    }
    async function impMarcar(i, btn){
      const x = (window._impLista||[])[i]; if(!x) return;
      btn.disabled = true;
      if(await _lpGuardar({id:x.id, tipo:x._tipo, t:x.title, poster:x.poster_path, f:x.release_date}, {visto:true}, `✓ «${x.title}» marcada como vista`)) _impPintar();
      else btn.disabled = false;
    }
    // ══ ¿QUÉ VEMOS?: baraja de recomendaciones; → «Para ver», ← «No me interesa», ↑ ficha ══
    async function abrirQueVemos(){
      if(!sesionActual){ mostrarCuenta(); return; }
      irA('p-quevemos');
      window._qv = window._qv || {tipo:'todo', mazo:[], vistos:new Set(), anadidas:0, cargando:null};
      _qvPintarTipos();
      if(window._qv.mazo.length<3) await _qvCargar();
      _qvPintar();
    }
    function _qvPintarTipos(){
      const t = window._qv.tipo, prov = _descPlataforma(), n = prov ? (DESC_PLATAFORMAS.find(([id])=>id===prov)||[])[1] : '';
      document.getElementById('qv-tipos').innerHTML = [['todo','Todo'],['movie','Películas'],['tv','Series']].map(([k,l])=>`<button type="button" class="fm-tipo${k===t?' activo':''}" onclick="qvTipo('${k}')">${l}</button>`).join('') + (n ? `<span class="qv-prov">en ${_escHtml(n)}</span>` : '');
      document.getElementById('qv-cont').textContent = window._qv.anadidas ? `＋ ${window._qv.anadidas} para ver` : '';
    }
    async function qvTipo(t){ window._qv.tipo = t; window._qv.mazo = []; _qvPintarTipos(); document.getElementById('qv-mesa').innerHTML = '<p class="rk-ayuda">Barajando…</p>'; await _qvCargar(); _qvPintar(); }
    // Recomendaciones según lo que te gustó; si en Descubre tienes una plataforma elegida, solo de esa plataforma
    function _qvCargar(){
      const q = window._qv; if(q.cargando) return q.cargando;
      q.cargando = (async ()=>{
        const prov = _descPlataforma(), tipos = q.tipo==='todo' ? ['movie','tv'] : [q.tipo];
        await _descCargarPendientes();
        let cands = [];
        if(prov){
          q.pag = (q.pag||0)+1;
          try{ cands = (await _descParaTi(prov, q.pag)).lista.map(x=>({...x, _motivo:'✨ Encaja con tu gusto'})); }catch(e){}
          if(!cands.length){ // sin perfil de gusto todavía: lo más visto en esa plataforma
            const n = (DESC_PLATAFORMAS.find(([id])=>id===prov)||[])[1] || '';
            const res = await Promise.all(tipos.map(t=>_tmdbJson(`/discover/${t}&language=es-ES&watch_region=ES&with_watch_providers=${prov}&with_watch_monetization_types=flatrate&sort_by=popularity.desc&page=${q.pag}`).then(d=>(d.results||[]).map(x=>({...x, _tipo:t, title:x.title||x.name, release_date:x.release_date||x.first_air_date, _motivo:`Popular en ${n}`}))).catch(()=>[])));
            cands = res.flat();
          }
        } else {
          const res = await Promise.all(tipos.map(t=>_candidatosParaTi(t, {nSemillas:6, maxPorSemilla:4, conHistorial:false}).catch(()=>[])));
          cands = res.flat().map(x=>({...x, _motivo:x._porque ? `♥ Porque te gustó ${x._porque}` : ''}));
          if(cands.length<8){ try{ const d = await _tmdbJson(`/trending/${q.tipo==='todo'?'all':q.tipo}/week&language=es-ES&page=${Math.ceil(Math.random()*3)}`); cands.push(...(d.results||[]).filter(x=>['movie','tv'].includes(x.media_type||q.tipo)).map(x=>({...x, _tipo:x.media_type||q.tipo, title:x.title||x.name, release_date:x.release_date||x.first_air_date, _motivo:'🔥 Tendencia esta semana'}))); }catch(e){} }
        }
        const vistos = window.idsVistosSet || new Set(), pend = window._descPend || new Set();
        const nuevas = barajar(cands).filter(x=>x.poster_path && tipos.includes(x._tipo) && !vistos.has(`${x.id}-${x._tipo}`) && !pend.has(`${x.id}-${x._tipo}`) && !esOculta(x.id, x._tipo) && !q.vistos.has(`${x.id}-${x._tipo}`) && !q.mazo.some(y=>y.id===x.id));
        q.mazo.push(...nuevas);
        q.cargando = null;
      })();
      return q.cargando;
    }
    function _qvTarjeta(x, arriba){
      return `<div class="qv-carta${arriba?' arriba':''}" ${arriba?'id="qv-arriba"':''}>
        <img src="https://image.tmdb.org/t/p/w500${x.poster_path}" alt="" draggable="false">
        <span class="qv-sello si">PARA VER</span><span class="qv-sello no">NO</span>
        <div class="qv-info"><div class="qv-t">${_escHtml(x.title)}</div><div class="qv-m">${_descFecha(x)} · ${x._tipo==='tv'?'Serie':'Película'}${x.vote_average ? ` · ★ ${x.vote_average.toFixed(1)}` : ''}</div>${x._motivo ? `<div class="qv-motivo">${_escHtml(x._motivo)}</div>` : ''}</div></div>`;
    }
    function _qvPintar(){
      const q = window._qv, mesa = document.getElementById('qv-mesa');
      if(!q.mazo.length){ mesa.innerHTML = '<div class="pq-fin"><div class="pq-fin-e">🍿</div><div class="pq-fin-t">No quedan más por ahora</div><p class="rk-ayuda">Vuelve más tarde o cambia de tipo o de plataforma en Descubre.</p></div>'; return; }
      mesa.innerHTML = (q.mazo[1] ? _qvTarjeta(q.mazo[1], false) : '') + _qvTarjeta(q.mazo[0], true);
      const sig = q.mazo[2]; if(sig){ const im = new Image(); im.src = `https://image.tmdb.org/t/p/w500${sig.poster_path}`; }
      _qvArrastre(document.getElementById('qv-arriba'));
      if(q.mazo.length<6) _qvCargar();
    }
    function _qvArrastre(c){
      if(!c) return;
      let x0=0, y0=0, dx=0, dy=0, activo=false;
      c.addEventListener('pointerdown', e=>{ activo = true; x0 = e.clientX; y0 = e.clientY; c.setPointerCapture(e.pointerId); c.style.transition = 'none'; });
      c.addEventListener('pointermove', e=>{ if(!activo) return; dx = e.clientX-x0; dy = e.clientY-y0; c.style.transform = `translate(${dx}px,${dy}px) rotate(${dx/18}deg)`; c.classList.toggle('a-si', dx>40); c.classList.toggle('a-no', dx<-40); });
      const fin = ()=>{ if(!activo) return; activo = false; c.style.transition = '';
        if(dx>110) qvAccion('si'); else if(dx<-110) qvAccion('no'); else if(dy<-120 && Math.abs(dx)<80){ c.style.transform = ''; qvAccion('ficha'); }
        else{ c.style.transform = ''; c.classList.remove('a-si','a-no'); }
        dx = dy = 0; };
      c.addEventListener('pointerup', fin); c.addEventListener('pointercancel', fin);
    }
    async function qvAccion(a){
      const q = window._qv, x = q && q.mazo[0]; if(!x) return;
      if(a==='ficha'){ abrirDetalle({...x}); return; }
      const c = document.getElementById('qv-arriba');
      if(c){ c.style.transition = 'transform 0.3s ease, opacity 0.3s ease'; c.style.transform = `translate(${a==='si'?'':'-'}140%, -20px) rotate(${a==='si'?'':'-'}24deg)`; c.style.opacity = '0'; }
      q.mazo.shift(); q.vistos.add(`${x.id}-${x._tipo}`);
      setTimeout(_qvPintar, 260);
      if(a==='no'){ ocultarTitulo({id:x.id, tipo:x._tipo, t:x.title, poster:x.poster_path, f:x.release_date, g:x.genre_ids||[]}); return; }
      if(await _lpGuardar({id:x.id, tipo:x._tipo, t:x.title, poster:x.poster_path, f:x.release_date}, {pendiente:true}, `＋ «${x.title}» a «Para ver»`)){
        q.anadidas++; (window._descPend = window._descPend || new Set()).add(`${x.id}-${x._tipo}`); _qvPintarTipos();
      }
    }
    // ══ CALENDARIO DE ESTRENOS EN CINES (España), mes a mes ══
    const CAL_MODOS = [['cines','🍿 Cines'],['casa','🏠 En casa'],['series','📺 Series']];
    async function abrirCalendario(modo){
      irA('p-calendario');
      const h = new Date(); window._cal = window._cal || {y:h.getFullYear(), m:h.getMonth(), sel:null, modo:'cines'};
      if(modo) window._cal.modo = modo;
      _calPintarModos(); _calPintar();
    }
    function _calPintarModos(){
      const m = window._cal.modo;
      document.getElementById('cal-modos').innerHTML = CAL_MODOS.map(([k,l])=>`<button type="button" class="fm-tipo${k===m?' activo':''}" onclick="calModo('${k}')">${l}</button>`).join('');
    }
    function calModo(k){ window._cal.modo = k; window._cal.sel = null; _calPintarModos(); _calPintar(); }
    function calMover(n){ const c = window._cal; c.m += n; if(c.m<0){ c.m = 11; c.y--; } if(c.m>11){ c.m = 0; c.y++; } c.sel = null; _calPintar(); }
    async function _calPintar(){
      const c = window._cal, turno = (window._calTurno = (window._calTurno||0)+1);
      const ini = new Date(c.y, c.m, 1), dias = new Date(c.y, c.m+1, 0).getDate();
      const iso = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      document.getElementById('cal-mes').textContent = ini.toLocaleDateString('es-ES',{month:'long', year:'numeric'}).replace(/^./, x=>x.toUpperCase());
      const rej = document.getElementById('cal-rejilla'), hoy = iso(new Date());
      const pintar = (porDia) => {
        const hueco = (ini.getDay()+6)%7;
        let html = Array(hueco).fill('<div class="cal-c vacio"></div>').join('');
        for(let d=1; d<=dias; d++){
          const f = iso(new Date(c.y, c.m, d)), l = porDia ? (porDia[f]||[]) : null;
          html += `<button type="button" class="cal-c${f===hoy?' hoy':''}${f<hoy?' pasado':''}${c.sel===f?' sel':''}${l&&l.length?' con':''}" onclick="calElegir('${f}')">
            <span class="cal-n">${d}</span>${l && l.length ? `<span class="cal-pos">${l.slice(0,2).map(x=>`<img src="https://image.tmdb.org/t/p/w92${x.poster_path}" alt="" loading="lazy">`).join('')}</span>${l.length>2 ? `<span class="cal-mas">+${l.length-2}</span>` : ''}` : ''}</button>`;
        }
        rej.innerHTML = html;
      };
      pintar(null);
      document.getElementById('cal-dia').innerHTML = '<p class="rk-ayuda">Cargando estrenos…</p>';
      const modo = c.modo || 'cines', clave = `${c.y}-${c.m}`, ck = `${modo}:${clave}`;
      window._calCache = window._calCache || {};
      let lista = window._calCache[ck];
      if(!lista){
        const d1 = iso(ini), d2 = iso(new Date(c.y, c.m, dias));
        // cines: estreno en salas · en casa: alquiler o compra digital en España · series: series nuevas que empiezan ese día
        const base = modo==='series'
          ? `/discover/tv&language=es-ES&first_air_date.gte=${d1}&first_air_date.lte=${d2}&sort_by=popularity.desc&without_genres=10763,10764,10767&with_original_language=en|es|ko|ja|fr|de|it|sv|da|no|pt`
          : `/discover/movie&language=es-ES&region=ES&with_release_type=${modo==='casa' ? '4' : '2|3'}&release_date.gte=${d1}&release_date.lte=${d2}&sort_by=popularity.desc`;
        const pags = await Promise.all([1,2,3].map(n=>_tmdbJson(`${base}&page=${n}`).catch(()=>({}))));
        const tipo = modo==='series' ? 'tv' : 'movie', ya = new Set();
        lista = pags.flatMap(d=>d.results||[]).map(x=>({...x, _tipo:tipo, title:x.title||x.name, release_date:x.release_date||x.first_air_date}))
          .filter(x=>x.poster_path && x.release_date && x.release_date>=d1 && x.release_date<=d2 && !esOculta(x.id,tipo) && !ya.has(x.id) && ya.add(x.id));
        window._calCache[ck] = lista;
      }
      if(turno!==window._calTurno) return;
      const porDia = {}; lista.forEach(x=>{ (porDia[x.release_date] = porDia[x.release_date] || []).push(x); });
      Object.values(porDia).forEach(l=>l.sort((a,b)=>(b.popularity||0)-(a.popularity||0)));
      window._calPorDia = porDia;
      if(!c.sel){ const dHoy = Object.keys(porDia).sort().find(f=>f>=hoy); c.sel = (hoy.slice(0,7)===clave.replace(/-(\d+)$/, (m,mm)=>'-'+String(+mm+1).padStart(2,'0')) && dHoy) || Object.keys(porDia).sort()[0] || null; }
      pintar(porDia);
      _calPintarDia();
    }
    function calElegir(f){ window._cal.sel = f; document.querySelectorAll('#cal-rejilla .cal-c').forEach(b=>b.classList.toggle('sel', b.getAttribute('onclick')===`calElegir('${f}')`)); _calPintarDia(); }
    function _calPintarDia(){
      const el = document.getElementById('cal-dia'), f = window._cal.sel, l = (window._calPorDia||{})[f] || [];
      if(!f){ el.innerHTML = '<p class="rk-ayuda">No hay estrenos destacados este mes.</p>'; return; }
      const modo = window._cal.modo || 'cines';
      window._calLista = l;
      const d = new Date(f+'T12:00:00');
      el.innerHTML = `<div class="fm-k">${d.toLocaleDateString('es-ES',{weekday:'long', day:'numeric', month:'long'}).replace(/^./, x=>x.toUpperCase())} · ${l.length ? `${l.length} ${l.length===1?'estreno':'estrenos'}` : 'sin estrenos'}</div>
        ${l.map((x,i)=>`<div class="saga-fila" onclick="abrirDetalle(_calLista[${i}])" ${_lp({id:x.id,tipo:x._tipo,t:x.title,poster:x.poster_path,f:x.release_date})}>
          <img loading="lazy" src="https://image.tmdb.org/t/p/w154${x.poster_path}" alt="">
          <div class="fm-info"><div class="fm-t">${_escHtml(x.title)}</div><div class="fm-m">${modo==='casa' ? '🏠 Para alquilar o comprar' : modo==='series' ? '📺 Serie nueva' : '🍿 En cines'} · ${_escHtml(_descFecha(x, true).replace(/^Estreno: /,''))}</div>${x.overview ? `<div class="cal-sin">${_escHtml(x.overview)}</div>` : ''}</div>${_descMarca(x) ? `<span class="saga-e p">${(window.idsVistosSet||new Set()).has(`${x.id}-${x._tipo}`) ? '✓ Vista' : '🔖 Para ver'}</span>` : ''}</div>`).join('')}`;
    }
    // Próximos estrenos en cines de España: las más populares de los próximos 4 meses, ordenadas por fecha
    async function _descProximos(pg){
      const hoy = new Date(), iso = d => d.toISOString().slice(0,10), fin = new Date(hoy.getTime()+120*864e5);
      const base = `/discover/movie&language=es-ES&region=ES&with_release_type=2|3&primary_release_date.gte=${iso(hoy)}&primary_release_date.lte=${iso(fin)}&sort_by=popularity.desc`;
      const pags = await Promise.all([pg*3-2, pg*3-1, pg*3].map(n=>_tmdbJson(`${base}&page=${n}`).catch(()=>({}))));
      const ya = new Set(), lista = pags.flatMap(d=>d.results||[]).filter(x=>x.poster_path && x.release_date && !esOculta(x.id,'movie') && !ya.has(x.id) && ya.add(x.id))
        .map(x=>({...x, _tipo:'movie', title:x.title||x.name})).sort((a,b)=>a.release_date.localeCompare(b.release_date) || (b.popularity||0)-(a.popularity||0));
      return {lista, paginas:Math.ceil(Math.min(pags[0]?.total_pages||1, 15)/3)};
    }
    // Fecha de estreno para lo que aún no ha salido («30 oct · en 3 días»); si ya salió, el año
    function _descFecha(p, larga){
      const f = p.release_date || ''; if(!f) return 'Próximamente';
      const hoy = new Date().toISOString().slice(0,10);
      if(f<hoy) return f.slice(0,4);
      if(f===hoy) return larga ? 'Se estrena hoy' : '¡Hoy en cines!';
      const d = new Date(f+'T12:00:00'), dias = Math.round((d - new Date(hoy+'T12:00:00'))/864e5);
      const txt = d.toLocaleDateString('es-ES', {day:'numeric', month:'short', ...(f.slice(0,4)!==hoy.slice(0,4) ? {year:'numeric'} : {})}).replace('.','');
      return larga ? `Estreno: ${txt} · ${dias===1 ? 'mañana' : `en ${dias} días`}` : `${txt}${dias<=31 ? ` · en ${dias} d` : ''}`;
    }
    function _descBadgeFecha(p){
      const f = p.release_date || '', hoy = new Date().toISOString().slice(0,10);
      if(!f || f<hoy) return '';
      if(f===hoy) return '<span class="desc-fecha hoy"><b>HOY</b></span>';
      const d = new Date(f+'T12:00:00');
      return `<span class="desc-fecha"><b>${d.getDate()}</b>${d.toLocaleDateString('es-ES',{month:'short'}).replace('.','')}</span>`;
    }
    async function _descCargarPendientes(){
      if(!sesionActual){ window._descPend = new Set(); return; }
      try{ const { data } = await sb.from('mi_biblioteca').select('tmdb_id,tipo').eq('user_id', sesionActual.user.id).eq('pendiente', true).eq('visto', false); window._descPend = new Set((data||[]).map(x=>`${x.tmdb_id}-${x.tipo}`)); }catch(e){ window._descPend = window._descPend || new Set(); }
    }
    function _descMarca(p){
      const k = `${p.id}-${p._tipo}`;
      if((window.idsVistosSet||new Set()).has(k)) return '<span class="desc-marca visto" title="Vista">✓</span>';
      if((window._descPend||new Set()).has(k)) return '<span class="desc-marca pend" title="En «Para ver»">🔖</span>';
      return '';
    }
    // Al volver a Descubre solo se actualizan ✓ y 🔖 (por si has marcado algo mientras tanto)
    async function _descRefrescarMarcas(){
      await _descCargarPendientes();
      document.querySelectorAll('#p-descubre .desc-card[data-k], #p-descubre-todo .desc-card[data-k], #p-descubre-todo .desc-rk[data-k]').forEach(c=>{
        const [id,tipo] = c.dataset.k.split('-'), pos = c.classList.contains('desc-rk') ? c : c.querySelector('.desc-poster'); if(!pos) return;
        pos.querySelector('.desc-marca')?.remove();
        const m = _descMarca({id, _tipo:tipo}); if(m) pos.insertAdjacentHTML('beforeend', m);
      });
    }
    function _descTarjeta(p, arr, i){
      return `<div class="desc-card" data-k="${p.id}-${p._tipo}" onclick="abrirDetalle(${arr}[${i}])" ${_lp({id:p.id,tipo:p._tipo,t:p.title,poster:p.poster_path,f:p.release_date})}>
        <div class="desc-poster"><img loading="lazy" src="https://image.tmdb.org/t/p/w342${p.poster_path}" alt="">${_descBadgeFecha(p)}${_descMarca(p)}${_prevBadge(p)}</div>
        <div class="desc-t">${_escHtml(p.title)}</div>
        <div class="desc-m">${_descFecha(p)}${p._g!==undefined && p._tipo==='tv' ? ' · Serie' : ''}${p.vote_average ? ` · ★ ${p.vote_average.toFixed(1)}` : ''}</div></div>`;
    }
    async function abrirDescubre(){
      irA('p-descubre', true);
      const prov = _descPlataforma();
      // ya cargada con la misma plataforma y hace menos de 30 minutos: se deja tal cual (misma portada, mismo sitio)
      const ya = window._descPintado;
      if(ya && ya.prov===prov && Date.now()-ya.t < 30*60e3 && document.querySelector('#desc-filas .desc-card[data-k]')){ _descRefrescarMarcas(); _descHeroVideo(); return; }
      document.getElementById('desc-plataformas').innerHTML = DESC_PLATAFORMAS.map(([id,n])=>`<button type="button" class="desc-plat${id===prov?' activo':''}" onclick="descElegirPlataforma('${id}')">${n}</button>`).join('');
      await _descPintar(prov);
    }
    const _descOrdenParaMi = () => { try{ return !!sesionActual && localStorage.getItem('cm:descOrden')==='parami'; }catch(e){ return false; } };
    const _descSoloBueno = () => { try{ return !!sesionActual && localStorage.getItem('cm:descBueno')==='1'; }catch(e){ return false; } };
    async function descAlternarBueno(){
      try{ localStorage.setItem('cm:descBueno', _descSoloBueno() ? '' : '1'); }catch(e){}
      _descPintarOrden(); window._descPintado = null;
      await _descPintar(_descPlataforma());
    }
    function _descPintarOrden(){
      const bb = document.getElementById('desc-bueno');
      if(bb){ const on = _descSoloBueno(); bb.style.display = sesionActual ? '' : 'none'; bb.classList.toggle('activo', on); bb.setAttribute('aria-pressed', String(on)); bb.textContent = on ? '✨ Lo bueno ✓' : '✨ Lo bueno'; }
      const b = document.getElementById('desc-orden'); if(!b) return;
      b.style.display = sesionActual ? '' : 'none';
      const on = _descOrdenParaMi(); b.classList.toggle('activo', on); b.setAttribute('aria-pressed', String(on));
      b.textContent = on ? '🔮 Para mí ✓' : '🔮 Para mí';
    }
    async function descAlternarOrden(){
      try{ localStorage.setItem('cm:descOrden', _descOrdenParaMi() ? '' : 'parami'); }catch(e){}
      _descPintarOrden(); window._descPintado = null;
      await _descPintar(_descPlataforma());
    }
    // «Te encantaría y casi nadie la ha visto»: títulos con pocos votos que tu nota prevista pone muy arriba
    async function _descEncantaria(prov, tipo, pg){
      const m = await _modeloNotaObtener().catch(()=>null); if(!m || !m.fit) return {lista:[], paginas:1};
      const hoy = new Date().toISOString().slice(0,10), pq = prov ? `&watch_region=ES&with_watch_providers=${prov}&with_watch_monetization_types=flatrate` : '';
      const fecha = tipo==='movie' ? 'primary_release_date' : 'first_air_date', sin = tipo==='movie' ? '99,10770' : '10763,10764,10767,99';
      const q = n => `/discover/${tipo}&language=es-ES${pq}&sort_by=vote_average.desc&vote_average.gte=6.6&vote_count.gte=${prov?30:60}&vote_count.lte=2500&${fecha}.lte=${hoy}&without_genres=${sin}&page=${n}`;
      const paginas = await Promise.all([1,2,3,4].map(n=>_tmdbJson(q((pg-1)*4+n)).catch(()=>({}))));
      const vistos = window.idsVistosSet || new Set();
      const lista = paginas.flatMap(d=>d.results||[]).filter(x=>x.poster_path && !vistos.has(`${x.id}-${tipo}`) && !esOculta(x.id, tipo))
        .map(x=>({...x, _tipo:tipo, title:x.title||x.name, release_date:x.release_date||x.first_air_date}))
        .map(x=>({x, v:_notaRapida(x)})).filter(o=>o.v!=null && o.v>=m.fit.media+0.6).sort((a,b)=>b.v-a.v).map(o=>o.x);
      return {lista, paginas: Math.max(1, Math.min(5, Math.ceil((paginas[0].total_pages||1)/4)))};
    }
    function descElegirPlataforma(id){
      try{ localStorage.setItem('cm:descPlataforma', id); }catch(e){}
      document.querySelectorAll('#desc-plataformas .desc-plat').forEach((b,i)=>b.classList.toggle('activo', DESC_PLATAFORMAS[i][0]===id));
      _descPintar(id);
    }
    async function _descPintar(prov){
      const turno = (window._descTurno = (window._descTurno||0)+1);
      window._descPintado = {prov, t:Date.now()};
      document.getElementById('desc-hero').innerHTML = '';
      _descPintarOrden();
      const ordenMi = _descOrdenParaMi(), soloBueno = _descSoloBueno();
      if(sesionActual) await _modeloNotaObtener().catch(()=>null); // así los pósters salen ya con tu nota
      if(turno!==window._descTurno) return;
      const filas = _descFilas(prov), cont = document.getElementById('desc-filas'), hero = document.getElementById('desc-hero');
      window._descFilasAct = filas; window._descListas = {};
      _descPintarGeneros(prov);
      _descImagenesGeneros(prov);
      _descPintarTop10(prov);
      _descPintarEstudios();
      cont.innerHTML = filas.map((f,fi)=>`<section class="desc-fila"><div class="desc-fila-cab"><h3>${_escHtml(f.t.replace(/ · (Películas|Series)$/,''))}${/ · (Películas|Series)$/.test(f.t) ? `<span class="desc-tipo">${f.tipo==='tv'?'Series':'Películas'}</span>` : ''}</h3>${f.calendario ? `<button type="button" class="desc-todo desc-cal-btn" onclick="abrirCalendario()">📅 Calendario</button>` : ''}<button type="button" class="desc-todo" onclick="descVerTodo(${fi})">Ver todo ›</button></div>
        <div class="desc-scroll" id="desc-f-${fi}">${Array(5).fill('<div class="desc-card"><div class="desc-poster skeleton"></div></div>').join('')}</div></section>`).join('');
      if(!hero.innerHTML) hero.innerHTML = '<div class="desc-hero skeleton"></div>';
      _descCargarPendientes();
      await _fetchEnLotes(filas.map((f,fi)=>({f,fi})), async ({f,fi})=>{
        let lista = [];
        try{ lista = (await _descDatos(f,1)).lista.slice(0,20); }catch(e){}
        if(turno!==window._descTurno) return;
        if(ordenMi && !f.calendario) lista = lista.map((x,i)=>({x, i, v:_notaRapida(x)})).sort((a,b)=>((b.v??-1)-(a.v??-1)) || a.i-b.i).map(o=>o.x);
        // «Solo lo bueno»: fuera lo que le pondrías menos de un 7 (lo que aún no se puede calcular, se queda)
        if(soloBueno && !f.calendario) lista = lista.filter(x=>{ const v = _notaRapida(x); return v==null || v >= 7; });
        window._descListas[fi] = lista;
        const el = document.getElementById(`desc-f-${fi}`); if(!el) return;
        if(!lista.length){ el.closest('.desc-fila').remove(); return; }
        el.innerHTML = lista.map((p,i)=>_descTarjeta(p, `_descListas[${fi}]`, i)).join('');
        if(fi===0) _descPintarHero(lista, prov, f);
      }, 3);
    }
    // Portada: una de las 5 primeras de la primera fila, con su imagen de fondo
    function _descPintarHero(lista, prov, fila){
      const cands = lista.slice(0,5).filter(x=>x.backdrop_path);
      const hero = document.getElementById('desc-hero');
      if(!cands.length){ hero.innerHTML = ''; return; }
      const p = window._descHero = cands[Math.floor(Math.random()*cands.length)];
      const n = prov ? (DESC_PLATAFORMAS.find(([id])=>id===prov)||[])[1] : '';
      hero.innerHTML = `<div class="desc-hero" style="background-image:url('https://image.tmdb.org/t/p/w1280${p.backdrop_path}')" onclick="abrirDetalle(_descHero)">
        <div class="desc-hero-velo"></div>
        <div class="desc-hero-info">
          <div class="desc-hero-k">${fila && fila.custom ? `✨ Para ti en ${_escHtml(n)}` : n ? `Lo más visto en ${_escHtml(n)}` : '🔥 Lo más visto esta semana'}</div>
          <div class="desc-hero-t">${_escHtml(p.title)}</div>
          <div class="desc-hero-m">${p.release_date ? p.release_date.slice(0,4) : ''} · ${p._tipo==='tv' ? 'Serie' : 'Película'}${p.vote_average ? ` · ★ ${p.vote_average.toFixed(1)}` : ''}</div>
          ${p.overview ? `<div class="desc-hero-s">${_escHtml(p.overview)}</div>` : ''}
          <div class="desc-hero-b"><button type="button" class="desc-hero-btn principal" onclick="event.stopPropagation();descHeroPendiente(this)">＋ Para ver</button><button type="button" class="desc-hero-btn desc-hero-sonido" id="desc-hero-sonido" hidden onclick="event.stopPropagation();descHeroSonido()" aria-label="Activar sonido">🔇</button><button type="button" class="desc-hero-btn" onclick="event.stopPropagation();abrirDetalle(_descHero)">Ver ficha</button></div>
        </div></div>`;
      _descHeroVideo();
    }
    // A los 2 s la portada pasa a ser el tráiler, sin sonido y en bucle (como en Netflix). Se para al salir de Descubre
    async function _descHeroVideo(){
      clearTimeout(window._heroT); _descHeroParar();
      const p = window._descHero; if(!p || !/^https?:$/.test(location.protocol)) return;
      if(document.documentElement.classList.contains('modo-tv') || navigator.connection?.saveData || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
      let t = null; try{ t = await _elegirTrailer(p._tipo, p.id); }catch(e){}
      if(!t || window._descHero!==p) return;
      window._heroT = setTimeout(()=>{
        const h = document.querySelector('#desc-hero .desc-hero'); if(!h || window._descHero!==p || !document.getElementById('p-descubre').classList.contains('activa')) return;
        const cw = h.clientWidth, ch = h.clientHeight, w = Math.max(cw, ch*16/9) * 1.45, alto = w*9/16; // bastante más grande: se recortan la barra de título y el logo de YouTube
        const q = new URLSearchParams({autoplay:'1', mute:'1', loop:'1', playlist:t.key, controls:'0', playsinline:'1', modestbranding:'1', rel:'0', iv_load_policy:'3', disablekb:'1', enablejsapi:'1'});
        if(location.origin.startsWith('http')) q.set('origin', location.origin);
        const d = document.createElement('div'); d.className = 'desc-hero-video';
        d.innerHTML = `<iframe data-yt="${_escHtml(t.key)}" onload="_ytEscuchar(this)" src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(t.key)}?${q}" allow="autoplay; encrypted-media" referrerpolicy="strict-origin-when-cross-origin" tabindex="-1" style="width:${w}px;height:${alto}px"></iframe>`;
        h.insertBefore(d, h.querySelector('.desc-hero-velo'));
        setTimeout(()=>{ d.classList.add('on'); const b = document.getElementById('desc-hero-sonido'); if(b) b.hidden = false; }, 4000); // se deja la foto hasta que YouTube quita sus rótulos del principio
      }, 2000);
    }
    function _descHeroParar(){ clearTimeout(window._heroT); document.querySelectorAll('.desc-hero-video').forEach(v=>v.remove()); window._heroSonido = false; const b = document.getElementById('desc-hero-sonido'); if(b){ b.hidden = true; b.textContent = '🔇'; } }
    function descHeroSonido(){
      const f = document.querySelector('.desc-hero-video iframe'); if(!f) return;
      window._heroSonido = !window._heroSonido;
      try{ f.contentWindow.postMessage(JSON.stringify({event:'command', func: window._heroSonido ? 'unMute' : 'mute', args:[]}), '*'); }catch(e){}
      document.getElementById('desc-hero-sonido').textContent = window._heroSonido ? '🔊' : '🔇';
    }
    async function descHeroPendiente(btn){
      const p = window._descHero; if(!p) return;
      btn.disabled = true;
      if(await _lpGuardar({id:p.id, tipo:p._tipo, t:p.title, poster:p.poster_path, f:p.release_date}, {pendiente:true}, `＋ «${p.title}» añadida a «Para ver»`)){ btn.textContent = '✓ En tu lista'; (window._descPend = window._descPend || new Set()).add(`${p.id}-${p._tipo}`); }
      else btn.disabled = false;
    }
    // «Ver todo»: rejilla con todas las páginas, se cargan más al bajar
    async function descVerTodo(fi){
      const f = (window._descFilasAct||[])[fi]; if(!f) return;
      window._descF = {ep:'', nota:''}; window._descFKey = null;
      _descTodoIniciar(f, f.t.replace(/^[^\wÀ-ÿ¡¿]+/,''), '');
    }
    async function _descTodoIniciar(f, titulo, ctl){
      window._descTodo = {f, pg:0, paginas:1, lista:[], cargando:false};
      window._descTodoArgs = {f, titulo, ctl};
      _descPintarFiltros();
      document.getElementById('desc-todo-titulo').textContent = titulo;
      const c = document.getElementById('desc-todo-ctl'); c.innerHTML = (ctl || '<span></span>') + _descVistaBotones(); c.style.display = 'flex';
      const cont = document.getElementById('desc-todo'); cont.innerHTML = ''; cont.className = _descVista()==='ranking' ? 'desc-ranking' : 'desc-rejilla';
      if(!document.getElementById('p-descubre-todo').classList.contains('activa')) irA('p-descubre-todo'); else window.scrollTo(0,0);
      await _descTodoMas();
      if(!window._descObs){
        window._descObs = new IntersectionObserver(es=>{ if(es.some(e=>e.isIntersecting) && document.getElementById('p-descubre-todo').classList.contains('activa')) _descTodoMas(); }, {rootMargin:'600px'});
        window._descObs.observe(document.getElementById('desc-todo-mas'));
      }
    }
    // Dos formas de ver «Ver todo»: carteles en rejilla o clasificación (puesto, imagen panorámica y sinopsis)
    function _descVista(){ try{ return localStorage.getItem('cm:descVista') || 'rejilla'; }catch(e){ return 'rejilla'; } }
    function _descVistaBotones(){
      const v = _descVista();
      return `<div class="desc-vista" role="group" aria-label="Vista">
        <button type="button" class="${v==='rejilla'?'activo':''}" onclick="descCambiarVista('rejilla')" aria-label="Carteles" title="Carteles"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5"/></svg></button>
        <button type="button" class="${v==='ranking'?'activo':''}" onclick="descCambiarVista('ranking')" aria-label="Clasificación" title="Clasificación"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="7" rx="1.5"/><rect x="3" y="13" width="18" height="7" rx="1.5"/></svg></button></div>`;
    }
    function descCambiarVista(v){
      try{ localStorage.setItem('cm:descVista', v); }catch(e){}
      document.querySelectorAll('.desc-vista button').forEach((b,i)=>b.classList.toggle('activo', (i===0)===(v==='rejilla')));
      const d = window._descTodo, cont = document.getElementById('desc-todo');
      cont.className = v==='ranking' ? 'desc-ranking' : 'desc-rejilla';
      if(d) cont.innerHTML = d.lista.map((p,i)=>_descTarjetaVista(p, i)).join('');
      document.querySelectorAll('.res-lista').forEach(_pintarResLista);
    }
    // Resultados de la búsqueda por ánimo y de Buscar, con el mismo diseño que Descubre (sin puesto: no es una clasificación)
    function _pintarResLista(el){
      const arr = el.dataset.arr, items = window[arr] || [], v = _descVista();
      el.className = `res-lista ${v==='ranking' ? 'desc-ranking' : 'desc-rejilla'}`;
      el.innerHTML = items.map((p,i)=>v==='ranking' ? _descTarjetaRanking(p, i, arr, true) : _descTarjeta(p, arr, i)).join('');
    }
    function _descTarjetaVista(p, i){ return _descVista()==='ranking' ? _descTarjetaRanking(p, i) : _descTarjeta(p, '_descTodo.lista', i); }
    function _descTarjetaRanking(p, i, arr, sinNumero){
      arr = arr || '_descTodo.lista';
      const img = p.backdrop_path ? `https://image.tmdb.org/t/p/w780${p.backdrop_path}` : `https://image.tmdb.org/t/p/w500${p.poster_path}`;
      return `<div class="desc-rk${i<3&&!sinNumero?' podio':''}${sinNumero?' sin-n':''}" data-k="${p.id}-${p._tipo}" onclick="abrirDetalle(${arr}[${i}])" ${_lp({id:p.id,tipo:p._tipo,t:p.title,poster:p.poster_path,f:p.release_date})}>
        <div class="desc-rk-img${p.backdrop_path?'':' sin'}" style="background-image:url('${img}')"></div>
        <div class="desc-rk-velo"></div>
        ${sinNumero ? '' : `<span class="desc-rk-n"${i>=99 ? ' style="font-size:28px"' : i>=9 ? ' style="font-size:42px"' : ''}>${i+1}</span>`}
        ${_descMarca(p)}${_prevBadge(p)}
        <div class="desc-rk-info">
          <div class="desc-rk-t">${_escHtml(p.title)}</div>
          <div class="desc-rk-m">${_descFecha(p, true)} · ${p._tipo==='tv' ? 'Serie' : 'Película'}${p.vote_average ? ` · <b>★ ${p.vote_average.toFixed(1)}</b>` : ''}</div>
        </div></div>`;
    }
    async function _descTodoMas(){
      const d = window._descTodo; if(!d || d.cargando || d.pg>=Math.min(d.paginas, 20)) return;
      d.cargando = true;
      const mas = document.getElementById('desc-todo-mas'); mas.textContent = 'Cargando…';
      try{
        const r = await _descDatos(d.f, d.pg+1);
        if(window._descTodo!==d) return;
        d.pg++; d.paginas = r.paginas;
        // en las filas fijas (tendencias, cines…) la época y la nota se filtran aquí; en géneros y estudios ya lo hace TMDB
        const ya = new Set(d.lista.map(x=>x.id)), nuevos = r.lista.filter(x=>!ya.has(x.id) && (d.f.genero || _descPasaFiltro(x)));
        const desde = d.lista.length; d.lista.push(...nuevos);
        document.getElementById('desc-todo').insertAdjacentHTML('beforeend', nuevos.map((p,i)=>_descTarjetaVista(p, desde+i)).join(''));
        mas.textContent = !d.lista.length ? 'No hay títulos con estos filtros.' : d.pg>=Math.min(d.paginas,20) ? '' : 'Desliza para ver más';
        if(!d.f.genero && nuevos.length<6 && d.pg<Math.min(d.paginas,20)){ d.cargando = false; await _descTodoMas(); return; } // con filtros, se buscan más páginas
      }catch(e){ mas.textContent = 'No se pudo cargar. Vuelve a intentarlo.'; }
      finally{ d.cargando = false; }
    }
