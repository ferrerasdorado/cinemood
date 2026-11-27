// CineMood · Ficha de película o serie: reparto, mis series, sagas, top 10 y estudios
// (Parte de index.html; se carga como script clásico: todo comparte el mismo ámbito global.)

    // ══ REPARTO Y EQUIPO COMPLETOS (en series, de todas las temporadas, con episodios) ══
    const _DEPTOS = {Directing:'Dirección', Writing:'Guion', Production:'Producción', Sound:'Música y sonido', Camera:'Fotografía', Editing:'Montaje', Art:'Dirección artística', 'Costume & Make-Up':'Vestuario y maquillaje', 'Visual Effects':'Efectos visuales', Lighting:'Iluminación', Crew:'Equipo técnico', Creator:'Creación'};
    const _OFICIOS = {Director:'Dirección', Screenplay:'Guion', Writer:'Guion', Story:'Historia', Novel:'Novela', Characters:'Personajes', Producer:'Producción', 'Executive Producer':'Producción ejecutiva', 'Original Music Composer':'Música', 'Music Supervisor':'Supervisión musical', 'Director of Photography':'Dirección de fotografía', Editor:'Montaje', 'Production Design':'Diseño de producción', 'Art Direction':'Dirección artística', 'Costume Design':'Diseño de vestuario', 'Makeup Artist':'Maquillaje', Casting:'Casting', 'Visual Effects Supervisor':'Supervisión de efectos visuales', 'Sound Designer':'Diseño de sonido', 'Stunt Coordinator':'Coordinación de especialistas'};
    async function abrirRepartoCompleto(){
      const p = peliculaActual; if(!p) return;
      irA('p-reparto');
      document.getElementById('reparto-titulo').textContent = p.title || 'Reparto y equipo';
      const cont = document.getElementById('reparto-cont'), tabs = document.getElementById('reparto-tabs');
      cont.innerHTML = '<p class="rk-ayuda">Cargando…</p>'; tabs.innerHTML = '';
      try{
        const d = await _tmdbCacheado(p._tipo==='tv' ? `/tv/${p.id}/aggregate_credits&language=es-ES` : `/movie/${p.id}/credits&language=es-ES`);
        if(peliculaActual!==p) return;
        const reparto = (d.cast||[]).map(c=>({id:c.id, n:c.name, f:c.profile_path, r:c.character || (c.roles||[]).map(x=>x.character).filter(Boolean).slice(0,2).join(' / '), ep:c.total_episode_count || 0}));
        const porDepto = {};
        (d.crew||[]).forEach(c=>{
          const dep = _DEPTOS[c.department] || c.department || 'Equipo', oficios = c.job ? [c.job] : (c.jobs||[]).map(j=>j.job);
          const l = porDepto[dep] = porDepto[dep] || new Map(), x = l.get(c.id) || {id:c.id, n:c.name, f:c.profile_path, oficios:new Set(), ep:0};
          oficios.forEach(o=>x.oficios.add(_OFICIOS[o]||o)); x.ep += c.total_episode_count||0; l.set(c.id, x);
        });
        const orden = ['Dirección','Guion','Creación','Producción','Música y sonido','Fotografía','Montaje','Dirección artística','Vestuario y maquillaje','Efectos visuales','Iluminación','Equipo técnico'];
        const deptos = Object.keys(porDepto).sort((a,b)=>((orden.indexOf(a)+1)||99)-((orden.indexOf(b)+1)||99));
        window._repPersonas = [];
        const fila = (x, sub, rol) => { const i = window._repPersonas.push({id:x.id, n:x.n, f:x.f||'', r:rol}) - 1;
          return `<button type="button" class="rep-fila" onclick="abrirRepPersona(${i})"><span class="rep-img">${x.f ? `<img loading="lazy" src="https://image.tmdb.org/t/p/w92${x.f}" alt="">` : `<span>${_escHtml((x.n||'?').charAt(0))}</span>`}</span><span class="rep-t"><b>${_escHtml(x.n)}</b>${sub ? `<span>${sub}</span>` : ''}</span></button>`; };
        const pintarReparto = () => reparto.map(x=>fila(x, [x.r ? 'como '+_escHtml(x.r) : '', x.ep ? `${x.ep} ${x.ep===1?'episodio':'episodios'}` : ''].filter(Boolean).join(' · '), 'Actor')).join('') || '<p class="rk-ayuda">TMDB no tiene el reparto.</p>';
        const pintarEquipo = () => deptos.map(dep=>`<div class="fm-k">${_escHtml(dep)}</div>${[...porDepto[dep].values()].map(x=>fila(x, _escHtml([...x.oficios].join(', '))+(x.ep ? ` · ${x.ep} ep.` : ''), dep==='Dirección' ? 'Director' : dep==='Producción' ? 'Productor' : [...x.oficios][0]||'Equipo')).join('')}`).join('') || '<p class="rk-ayuda">TMDB no tiene el equipo.</p>';
        window._repVer = t => {
          tabs.querySelectorAll('.fm-tipo').forEach(b=>b.classList.toggle('activo', b.dataset.t===t));
          window._repPersonas = []; cont.innerHTML = t==='reparto' ? pintarReparto() : pintarEquipo();
        };
        const nEq = deptos.reduce((t,dp)=>t+porDepto[dp].size,0);
        tabs.innerHTML = `<button type="button" class="fm-tipo activo" data-t="reparto" onclick="_repVer('reparto')">Reparto ${reparto.length}</button><button type="button" class="fm-tipo" data-t="equipo" onclick="_repVer('equipo')">Equipo ${nEq}</button>`;
        window._repVer('reparto');
      }catch(e){ cont.innerHTML = '<p class="rk-ayuda">No se pudo cargar el reparto.</p>'; }
    }
    function abrirRepPersona(i){ const x = (window._repPersonas||[])[i]; if(x) mostrarFilmografia(x.id, x.n, x.f, x.r); }
    // ══ MIS SERIES: todas tus series con su progreso, agrupadas por cómo las llevas ══
    async function abrirMisSeries(){
      if(!sesionActual){ mostrarCuenta(); return; }
      irA('p-misseries');
      const cont = document.getElementById('misseries-cont'), turno = (window._msTurno = (window._msTurno||0)+1);
      cont.innerHTML = '<p class="rk-ayuda">Cargando tus series…</p>';
      try{
        const { data, error } = await sb.from('mi_biblioteca').select('tmdb_id,titulo,poster_path,visto,pendiente,episodios_vistos').eq('user_id', sesionActual.user.id).eq('tipo','tv');
        if(error) throw error;
        const filas = (data||[]).filter(x=>x.visto || x.pendiente || _episodiosVistos(x));
        let hechos = 0;
        const dets = await _fetchEnLotes(filas, async x=>{ const d = await _tmdbCacheado(`/tv/${x.tmdb_id}&language=es-ES`).catch(()=>null); if(turno===window._msTurno) cont.innerHTML = `<p class="rk-ayuda">Cargando tus series… ${++hechos} de ${filas.length}</p>`; return d; }, 5);
        if(turno!==window._msTurno) return;
        const hoy = new Date().toISOString().slice(0,10);
        const series = filas.map((x,i)=>{
          const d = dets[i]; if(!d) return null;
          const q = _loQueQueda(d, x.episodios_vistos||{}) || {eps:0, min:0, pendientes:0};
          const vistos = _episodiosVistos(x), emitidos = vistos + q.eps;
          const finalizada = d.status==='Ended' || d.status==='Canceled';
          let grupo;
          if(esAbandonada(x.tmdb_id)) grupo = 'dejadas';
          else if(x.visto || (emitidos>0 && q.eps===0 && finalizada)) grupo = 'terminadas';
          else if(vistos===0) grupo = 'empezar';
          else if(q.eps===0) grupo = 'aldia';
          else grupo = 'curso';
          return {...x, d, q, vistos, emitidos, grupo, prox:d.next_episode_to_air, poster:x.poster_path||d.poster_path, nombre:d.name||x.titulo};
        }).filter(Boolean);
        window._misSeries = series;
        const G = [['curso','▶️ Viendo ahora'],['aldia','✅ Al día'],['empezar','🔖 Sin empezar'],['terminadas','🏁 Terminadas'],['dejadas','🚫 Las dejé']];
        const fila = (x) => {
          const i = series.indexOf(x), pct = x.emitidos ? Math.round(x.vistos/x.emitidos*100) : (x.grupo==='terminadas' ? 100 : 0);
          let sub = '';
          if(x.grupo==='curso') sub = `Te ${x.q.eps===1?'queda':'quedan'} ${x.q.eps} ${x.q.eps===1?'episodio':'episodios'}${x.q.min ? ' · '+_duracionAprox(x.q.min) : ''}`;
          else if(x.grupo==='aldia') sub = x.prox?.air_date ? `Nuevo episodio el ${new Date(x.prox.air_date+'T12:00:00').toLocaleDateString('es-ES',{day:'numeric',month:'long'})}` : (x.d.status==='Returning Series' ? 'Renovada · esperando nueva temporada' : 'Al día');
          else if(x.grupo==='empezar') sub = `${x.d.number_of_seasons||'?'} temp. · ${x.d.number_of_episodes||'?'} episodios`;
          else if(x.grupo==='terminadas') sub = x.d.status==='Returning Series' ? 'Vista · tendrá más temporadas' : 'Vista entera';
          else sub = `La dejaste con ${x.vistos} de ${x.emitidos} episodios`;
          const estado = x.d.status==='Canceled' ? '❌ Cancelada' : x.d.status==='Ended' ? '🏁 Terminada' : (x.d.status==='Returning Series' && x.grupo!=='aldia' && x.grupo!=='terminadas') ? '✅ Renovada' : '';
          if(estado && x.grupo!=='terminadas') sub += ` · ${estado}`;
          return `<div class="ms-fila" onclick="abrirDetalle({id:_misSeries[${i}].tmdb_id,_tipo:'tv',title:_misSeries[${i}].nombre,poster_path:_misSeries[${i}].poster})">
            ${x.poster ? `<img loading="lazy" src="https://image.tmdb.org/t/p/w154${x.poster}" alt="">` : '<span class="est-mejor-sin"></span>'}
            <div class="fm-info"><div class="fm-t">${_escHtml(x.nombre)}</div><div class="fm-m">${_escHtml(sub)}</div>
              ${x.grupo==='terminadas' && !x.vistos ? `<div class="ms-barra"><div style="width:100%"></div></div><div class="ms-n">${x.d.number_of_episodes||'?'} episodios</div>` : x.grupo!=='empezar' ? `<div class="ms-barra"><div style="width:${pct}%"></div></div><div class="ms-n">${x.vistos} de ${x.emitidos||x.d.number_of_episodes||'?'} episodios${x.q.pendientes ? ` · ${x.q.pendientes} por emitir` : ''}</div>` : ''}</div></div>`;
        };
        const html = G.map(([g,t])=>{ const l = series.filter(x=>x.grupo===g); return l.length ? `<div class="ms-grupo"><div class="fm-k">${t} · ${l.length}</div>${l.map(fila).join('')}</div>` : ''; }).join('');
        const total = series.reduce((t,x)=>t+x.vistos,0);
        cont.innerHTML = series.length ? `<p class="rk-ayuda">${series.length} series · ${total} episodios vistos</p>${html}` : '<p class="rk-ayuda">Todavía no sigues ninguna serie. Márcalas como pendientes o ve marcando episodios desde su ficha.</p>';
      }catch(e){ if(turno===window._msTurno) cont.innerHTML = '<p class="rk-ayuda">No se pudieron cargar tus series. Comprueba tu conexión.</p>'; }
    }
    // ══ PÁGINA DE SAGA: todas las entregas en orden, tu progreso y lo que dura la maratón ══
    async function abrirSaga(colId){
      irA('p-saga');
      const cont = document.getElementById('saga-cont'), turno = (window._sagaTurno = (window._sagaTurno||0)+1);
      document.getElementById('saga-titulo').textContent = 'Saga';
      cont.innerHTML = '<div class="desc-hero skeleton"></div><p class="rk-ayuda">Cargando la saga…</p>';
      try{
        const col = await _tmdbCacheado(`/collection/${colId}&language=es-ES`);
        const partes = (col.parts||[]).filter(x=>x.poster_path).sort((a,b)=>(a.release_date||'9999').localeCompare(b.release_date||'9999'));
        const dets = await _fetchEnLotes(partes, x=>_tmdbCacheado(`/movie/${x.id}&language=es-ES`).catch(()=>null), 5);
        if(sesionActual && !(window.idsVistosSet && window.idsVistosSet.size)){ try{ await refrescarIdsVistos(); }catch(e){} }
        await _descCargarPendientes();
        if(turno!==window._sagaTurno) return;
        const hoy = new Date().toISOString().slice(0,10), vistos = window.idsVistosSet || new Set(), pend = window._descPend || new Set();
        const lista = partes.map((x,i)=>({...x, _tipo:'movie', title:x.title||x.name, _r:dets[i]?.runtime||0, _visto:vistos.has(`${x.id}-movie`), _pend:pend.has(`${x.id}-movie`), _fut:!x.release_date || x.release_date>hoy}));
        window._sagaLista = lista; window._sagaId = colId;
        const salidas = lista.filter(x=>!x._fut), vistas = salidas.filter(x=>x._visto), faltan = salidas.filter(x=>!x._visto);
        const min = l => l.reduce((t,x)=>t+(x._r||0),0);
        const nombre = String(col.name||'Saga').replace(/\s*[-–:]\s*Colecci[oó]n$/i,'').replace(/^Colecci[oó]n\s+(de\s+)?/i,'').trim();
        const anios = salidas.map(x=>x.release_date.slice(0,4));
        document.getElementById('saga-titulo').textContent = nombre;
        const porAnadir = faltan.filter(x=>!x._pend);
        cont.innerHTML = `
          <div class="saga-hero" style="background-image:url('https://image.tmdb.org/t/p/w1280${col.backdrop_path||partes[0]?.backdrop_path||''}')">
            <div class="desc-hero-velo"></div>
            <div class="saga-hero-info"><div class="desc-hero-k">Saga · ${lista.length} películas${anios.length ? ` · ${anios[0]}–${anios[anios.length-1]}` : ''}</div><div class="desc-hero-t">${_escHtml(nombre)}</div></div>
          </div>
          <div class="saga-progreso">
            <div class="saga-prog-t"><b>Has visto ${vistas.length} de ${salidas.length}</b>${faltan.length ? ` · te faltan ${faltan.length}${min(faltan) ? ` (${formatDuracion(min(faltan))})` : ''}` : ' · ¡saga completa! 🎉'}</div>
            <div class="lg-barra"><div style="width:${salidas.length ? Math.round(vistas.length/salidas.length*100) : 0}%"></div></div>
            ${min(salidas) ? `<div class="saga-prog-m">🍿 Maratón completa: <b>${formatDuracion(min(salidas))}</b>${lista.some(x=>x._fut) ? ' · y alguna más por estrenar' : ''}</div>` : ''}
            ${sesionActual && porAnadir.length ? `<button type="button" class="cta-btn saga-anadir" onclick="sagaAnadirFaltan(this)">＋ Añadir ${porAnadir.length===1 ? 'la que me falta' : `las ${porAnadir.length} que me faltan`} a «Para ver»</button>` : ''}
          </div>
          ${col.overview ? `<p class="saga-sinopsis">${_escHtml(col.overview)}</p>` : ''}
          <div class="saga-lista">${lista.map((x,i)=>`
            <div class="saga-fila${x._visto?' visto':''}" onclick="abrirDetalle(_sagaLista[${i}])" ${_lp({id:x.id,tipo:'movie',t:x.title,poster:x.poster_path,f:x.release_date})}>
              <span class="saga-n">${i+1}</span>
              <img loading="lazy" src="https://image.tmdb.org/t/p/w154${x.poster_path}" alt="">
              <div class="fm-info"><div class="fm-t">${_escHtml(x.title)}</div>
                <div class="fm-m">${x.release_date ? x.release_date.slice(0,4) : 'Sin fecha'}${x._r ? ' · '+formatDuracion(x._r) : ''}${x.vote_average ? ` · ★ ${x.vote_average.toFixed(1)}` : ''}</div></div>
              <span class="saga-e ${x._visto?'v':x._fut?'f':x._pend?'p':''}">${x._visto ? '✓ Vista' : x._fut ? (x.release_date ? new Date(x.release_date+'T12:00:00').toLocaleDateString('es-ES',{day:'numeric',month:'short',year:'numeric'}) : 'Próximamente') : x._pend ? '🔖 Para ver' : '○ Sin ver'}</span>
            </div>`).join('')}</div>`;
      }catch(e){ if(turno===window._sagaTurno) cont.innerHTML = '<p class="rk-ayuda">No se pudo cargar la saga. Comprueba tu conexión.</p>'; }
    }
    async function sagaAnadirFaltan(btn){
      if(!sesionActual){ mostrarCuenta(); return; }
      const faltan = (window._sagaLista||[]).filter(x=>!x._visto && !x._fut && !x._pend); if(!faltan.length) return;
      btn.disabled = true; btn.textContent = 'Añadiendo…';
      const uid = sesionActual.user.id;
      const { error } = await sb.from('mi_biblioteca').upsert(faltan.map(x=>({user_id:uid, tmdb_id:x.id, tipo:'movie', titulo:x.title, poster_path:x.poster_path||null, anio:(x.release_date||'').slice(0,4), pendiente:true})), { onConflict:'user_id,tmdb_id,tipo' });
      if(error){ btn.disabled = false; btn.textContent = 'No se pudo guardar. Reintentar'; return; }
      _avisoDeshacer(`＋ ${faltan.length} ${faltan.length===1?'película añadida':'películas añadidas'} a «Para ver»`, async ()=>{
        const { error:e2 } = await sb.from('mi_biblioteca').update({pendiente:false}).eq('user_id', uid).eq('tipo','movie').in('tmdb_id', faltan.map(x=>x.id));
        if(e2) throw e2; abrirSaga(window._sagaId);
      });
      abrirSaga(window._sagaId);
    }
    // ══ TOP 10 DE HOY: lo más visto del día en TMDB (películas y series), con el número gigante ══
    async function _descPintarTop10(prov){
      const el = document.getElementById('desc-top10'); if(!el) return;
      if(prov){ el.innerHTML = ''; return; }
      el.innerHTML = '';
      try{
        const r = await _descDatos({k:'top10', custom:async()=>{
          const d = await _tmdbJson('/trending/all/day&language=es-ES');
          return {lista:(d.results||[]).filter(x=>['movie','tv'].includes(x.media_type) && x.poster_path && !esOculta(x.id, x.media_type)).slice(0,10).map(x=>({...x, _tipo:x.media_type, title:x.title||x.name, release_date:x.release_date||x.first_air_date})), paginas:1};
        }}, 1);
        window._top10 = r.lista;
        if(r.lista.length<5) return;
        el.innerHTML = `<div class="desc-fila-cab"><h3>Top 10 de hoy<span class="desc-tipo">Lo más visto del día en TMDB</span></h3></div>
          <div class="desc-scroll top10">${r.lista.map((p,i)=>`<div class="top10-c" data-k="${p.id}-${p._tipo}" onclick="abrirDetalle(_top10[${i}])" ${_lp({id:p.id,tipo:p._tipo,t:p.title,poster:p.poster_path,f:p.release_date})}>
            <span class="top10-n">${i+1}</span>
            <div class="desc-poster"><img loading="lazy" src="https://image.tmdb.org/t/p/w342${p.poster_path}" alt="">${_descMarca(p)}</div></div>`).join('')}</div>`;
      }catch(e){ el.innerHTML = ''; }
    }
    // ══ ESTUDIOS Y PRODUCTORAS: desde la ficha o desde Descubre, todo lo que han hecho ══
    const DESC_ESTUDIOS = [[41077,'A24',/a24/i],[3,'Pixar',/pixar/i],[10342,'Studio Ghibli',/ghibli/i],[420,'Marvel Studios',/marvel/i],[1,'Lucasfilm',/lucasfilm/i],[3172,'Blumhouse',/blumhouse/i],
      [6125,'Disney Animation',/disney/i],[521,'DreamWorks Animation',/dreamworks/i],[6704,'Illumination',/illumination/i],[11537,'Laika',/laika/i],[297,'Aardman',/aardman/i],
      [9996,'Syncopy',/syncopy/i],[56,'Amblin',/amblin/i],[90733,'Neon',/neon/i],[13184,'Annapurna',/annapurna/i],[81,'Plan B',/plan b/i],[43,'Searchlight',/searchlight/i],[49,'El Deseo',/deseo/i]];
    function abrirEstudio(id, nombre, tipo, orden){
      const k = `est-${Number(id)}`;
      window._descExtra[k] = {k, n:nombre, e:'🏢', movie:`with_companies=${Number(id)}`, tv:`with_companies=${Number(id)}`};
      descAbrirGenero(k, tipo, orden);
    }
    function abrirEstudioFicha(i){ const c = (window._estudiosFicha||[])[i]; if(c) abrirEstudio(c.id, c.name); }
    async function _descPintarEstudios(){
      const el = document.getElementById('desc-estudios'); if(!el) return;
      if(!window._estudiosOk){
        let cache = null; try{ cache = JSON.parse(localStorage.getItem('cm:estudios')||'null'); }catch(e){}
        if(cache && Date.now()-cache.t < 30*864e5) window._estudiosOk = cache.l;
        else{
          // se comprueba con TMDB el nombre de cada estudio (y se trae su logo); si no cuadra, no se muestra
          const res = await _fetchEnLotes(DESC_ESTUDIOS, async ([id,n,re])=>{ try{ const d = await _tmdbJson(`/company/${id}`); return d && re.test(d.name||'') ? {id, n, logo:d.logo_path||''} : null; }catch(e){ return null; } }, 6);
          window._estudiosOk = res.filter(Boolean);
          if(window._estudiosOk.length) try{ localStorage.setItem('cm:estudios', JSON.stringify({t:Date.now(), l:window._estudiosOk})); }catch(e){}
        }
      }
      const l = window._estudiosOk || [];
      el.innerHTML = l.length ? `<div class="desc-fila-cab"><h3>Explora por estudio</h3></div><div class="desc-gen-scroll">${l.map(x=>`<button type="button" class="desc-est" onclick="abrirEstudio(${x.id},'${_escHtml(x.n).replace(/'/g,"\\'")}')">${x.logo ? `<img loading="lazy" src="https://image.tmdb.org/t/p/w185${x.logo}" alt="${_escHtml(x.n)}">` : `<span>${_escHtml(x.n)}</span>`}</button>`).join('')}</div>` : '';
    }
    // ── Pantalla Buscar (pestaña de abajo): títulos y personas, con su propia lista de resultados ──
    function abrirBuscar(){
      irA('p-buscar', true);
      _buscarPintarRecientes();
      const inp = document.getElementById('buscar-input');
      if(!inp.value) setTimeout(()=>inp.focus(), 50);
    }
    // Sugerencias mientras escribes (títulos y personas) y tus últimas búsquedas
    function _separarAnio(q){ const m = String(q).trim().match(/^(.*\S)\s+\(?((?:18|19|20)\d{2})\)?$/); return m ? {q:m[1], anio:m[2]} : {q:String(q).trim(), anio:''}; }
    function _buscarSugerir(){
      clearTimeout(window._sugT);
      const q = document.getElementById('buscar-input').value.trim(), el = document.getElementById('buscar-sug');
      if(q.length<2){ el.innerHTML = ''; _buscarPintarRecientes(); return; }
      document.getElementById('buscar-recientes').innerHTML = '';
      window._sugT = setTimeout(async ()=>{
        const turno = (window._sugTurno = (window._sugTurno||0)+1), {q:texto, anio} = _separarAnio(q);
        try{
          const d = await _tmdbJson(`/search/multi&language=es-ES&include_adult=false&query=${encodeURIComponent(texto)}&page=1`);
          if(turno!==window._sugTurno) return;
          let r = (d.results||[]).filter(x=>['movie','tv','person'].includes(x.media_type) && (x.poster_path || x.profile_path) && !(x.media_type!=='person' && esOculta(x.id, x.media_type)));
          if(anio){ const con = r.filter(x=>x.media_type==='person' || (x.release_date||x.first_air_date||'').startsWith(anio)); if(con.length) r = con; }
          r = r.sort((a,b)=>(b.popularity||0)-(a.popularity||0)).slice(0,8); // lo más conocido primero («nolan» → Christopher Nolan)
          window._sug = r;
          el.innerHTML = r.map((x,i)=>{
            const per = x.media_type==='person', f = (x.release_date||x.first_air_date||'').slice(0,4);
            const sub = per ? `${x.known_for_department==='Directing' ? 'Dirección' : 'Interpretación'}${x.known_for?.[0] ? ` · ${_escHtml(x.known_for[0].title||x.known_for[0].name||'')}` : ''}` : `${x.media_type==='tv'?'Serie':'Película'}${f ? ' · '+f : ''}${x.vote_average ? ` · ★ ${x.vote_average.toFixed(1)}` : ''}`;
            return `<button type="button" class="sug${per?' per':''}" onclick="abrirSugerencia(${i})"><img loading="lazy" src="https://image.tmdb.org/t/p/w92${per ? x.profile_path : x.poster_path}" alt=""><span class="sug-t"><b>${_escHtml(x.title||x.name||'')}</b><span>${sub}</span></span></button>`;
          }).join('');
        }catch(e){}
      }, 280);
    }
    function abrirSugerencia(i){
      const x = (window._sug||[])[i]; if(!x) return;
      _buscarGuardarReciente(document.getElementById('buscar-input').value.trim());
      if(x.media_type==='person') mostrarFilmografia(x.id, x.name, x.profile_path||'', x.known_for_department==='Directing' ? 'Director' : 'Actor');
      else abrirDetalle({...x, _tipo:x.media_type, title:x.title||x.name, release_date:x.release_date||x.first_air_date});
    }
    function _buscarRecientes(){ try{ const a = JSON.parse(localStorage.getItem('cm:busquedas')||'[]'); return Array.isArray(a) ? a : []; }catch(e){ return []; } }
    function _buscarGuardarReciente(q){
      q = String(q||'').trim(); if(q.length<2) return;
      const a = [q, ..._buscarRecientes().filter(x=>x.toLowerCase()!==q.toLowerCase())].slice(0,8);
      try{ localStorage.setItem('cm:busquedas', JSON.stringify(a)); }catch(e){}
    }
    function _buscarPintarRecientes(){
      const el = document.getElementById('buscar-recientes'), a = _buscarRecientes();
      if(!el) return;
      if(!a.length || document.getElementById('buscar-input').value.trim()){ el.innerHTML = ''; return; }
      el.innerHTML = `<div class="busc-rec-cab"><span>Búsquedas recientes</span><button type="button" onclick="try{localStorage.removeItem('cm:busquedas')}catch(e){};_buscarPintarRecientes()">Borrar</button></div>
        <div class="busc-rec">${a.map((q,i)=>`<button type="button" onclick="buscarReciente(${i})">${_escHtml(q)}</button>`).join('')}</div>`;
    }
    function buscarReciente(i){ const q = _buscarRecientes()[i]; if(!q) return; document.getElementById('buscar-input').value = q; buscarEnPantalla(); }
    async function buscarEnPantalla(){
      const inp = document.getElementById('buscar-input'), q = inp.value.trim(); if(!q) return;
      clearTimeout(window._sugT); window._sugTurno = (window._sugTurno||0)+1;
      document.getElementById('buscar-sug').innerHTML = ''; document.getElementById('buscar-recientes').innerHTML = '';
      _buscarGuardarReciente(q);
      const btn = document.getElementById('buscar-btn'), div = document.getElementById('resultados-buscar');
      inp.blur(); btn.disabled = true; btn.textContent = 'Buscando…';
      document.getElementById('buscar-ayuda').style.display = 'none';
      div.innerHTML = '<p class="rk-ayuda">Buscando…</p>';
      window._destinoBuscar = true;
      try{ await buscarPorTitulo(q, true); }
      catch(e){ div.innerHTML = '<p class="rk-ayuda">No se pudo buscar. Comprueba tu conexión e inténtalo de nuevo.</p>'; }
      finally{ window._destinoBuscar = false; btn.disabled = false; btn.textContent = 'Buscar'; }
    }
    // Actores y directores cuyo nombre contiene todas las palabras buscadas («Almodóvar», «Cate Blanchett»…)
    async function _buscarPersonas(q){
      try{
        const palabras=normalizarTitulo(q).split(/\s+/).filter(Boolean);
        const res=(await _tmdbJson(`/search/person&language=es-ES&query=${encodeURIComponent(q)}&page=1`)).results||[];
        return res.filter(x=>x.profile_path && (x.popularity||0)>=1 && ['Acting','Directing'].includes(x.known_for_department)
            && palabras.every(w=>normalizarTitulo(x.name||'').includes(w))).slice(0,3);
      }catch(e){ return []; }
    }
    function _pintarPersonasBuscadas(personas){
      const enBuscar=window._destinoBuscar, div=document.getElementById(enBuscar?'resultados-buscar':'resultados');
      div.querySelector('.personas-busqueda')?.remove();
      if(!personas.length) return;
      window._personasBuscadas=personas;
      if(!div.querySelector('.res-lista')) div.querySelectorAll(':scope > p').forEach(x=>x.remove()); // solo hay personas
      div.insertAdjacentHTML('afterbegin',`<div class="personas-busqueda"><div class="result-title" style="margin-bottom:10px">Personas</div>${personas.map((x,i)=>`
        <div class="persona-row" onclick="abrirPersonaBuscada(${i})"><img class="persona-avatar" src="https://image.tmdb.org/t/p/w92${x.profile_path}" alt="${_escHtml(x.name)}"><div><div class="persona-nombre">${_escHtml(x.name)}</div><div class="persona-rol-tag">${x.known_for_department==='Directing'?'Dirección':'Interpretación'} · Ver filmografía</div></div><span class="persona-arrow">›</span></div>`).join('')}</div>`);
    }
    function abrirPersonaBuscada(i){
      const x=(window._personasBuscadas||[])[i]; if(!x) return;
      mostrarFilmografia(x.id, x.name, x.profile_path||'', x.known_for_department==='Directing'?'Director':'Actor');
    }

    function mostrarResultados(items,reset,titulo){
      const enBuscar=window._destinoBuscar, div=document.getElementById(enBuscar?'resultados-buscar':'resultados'), arr=enBuscar?'itemsBuscar':'itemsActuales';
      if(!items||!items.length){div.innerHTML='<p style="color:var(--k-61635e);margin-top:16px">No encontramos nada. Prueba otra combinación.</p>';return;}
      window[arr]=items;
      div.innerHTML=`<div class="result-header"><div class="result-title">${titulo?_escHtml(titulo):'Recomendaciones'}</div><div class="res-acciones">${titulo?'':'<div class="btn-otras" onclick="buscar(false)">Ver otras ↻</div>'}${_descVistaBotones()}</div></div><div class="res-lista" data-arr="${arr}"></div>`;
      _pintarResLista(div.querySelector('.res-lista'));
      if(!reset && !enBuscar)div.scrollIntoView({behavior:'smooth'});
    }

    // ── ACENTO DINÁMICO SEGÚN EL PÓSTER ──────────────────────────────────
    // TMDB no siempre sirve sus imágenes con cabeceras CORS consistentes (problema
    // conocido y documentado en su propio foro), así que esto puede fallar en
    // según qué imagen o navegador. Por eso todo va en try/catch y, si falla,
    // se queda tal cual con el morado de siempre — nunca rompe la ficha.
    function _extraerColorPoster(src){
      return new Promise((resolve)=>{
        try{
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = ()=>{
            try{
              const w = 24, h = 36;
              const canvas = document.createElement('canvas');
              canvas.width = w; canvas.height = h;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0, w, h);
              const data = ctx.getImageData(0,0,w,h).data;
              let r=0,g=0,b=0,n=0;
              for(let i=0;i<data.length;i+=4){
                const br = (data[i]+data[i+1]+data[i+2])/3;
                if(br<18 || br>240) continue; // ignoramos negro/blanco puro (bordes, letras) para un color más representativo
                r+=data[i]; g+=data[i+1]; b+=data[i+2]; n++;
              }
              if(!n){ resolve(null); return; }
              resolve({ r:Math.round(r/n), g:Math.round(g/n), b:Math.round(b/n) });
            }catch(e){ resolve(null); } // canvas contaminado por CORS u otro fallo: degradamos al acento fijo
          };
          img.onerror = ()=>resolve(null);
          img.src = src;
        }catch(e){ resolve(null); }
      });
    }
    function _aplicarAcentoDetalle(rgb){
      const el = document.getElementById('p-detalle');
      const meta = document.querySelector('meta[name="theme-color"]');
      window.acentoDetalleActual = rgb;
      if(!rgb){
        el.style.removeProperty('--acento-detalle');
        el.style.removeProperty('--acento-detalle-suave');
        el.style.removeProperty('--acento-detalle-bg');
        if(meta) meta.setAttribute('content', _temaOscuro() ? '#121413' : '#f5f3ef');
        return;
      }
      const {r,g,b} = rgb;
      const aclarar = v=>Math.round(v + (255-v)*0.35); // aclaramos para que siga leyéndose igual de bien que el morado actual sobre fondo oscuro
      el.style.setProperty('--acento-detalle', `rgb(${r},${g},${b})`);
      el.style.setProperty('--acento-detalle-suave', `rgb(${aclarar(r)},${aclarar(g)},${aclarar(b)})`);
      el.style.setProperty('--acento-detalle-bg', `rgba(${r},${g},${b},0.14)`);
      if(meta) meta.setAttribute('content', `rgb(${r},${g},${b})`);
    }

    async function abrirDetalle(p, desdeHistorial){
      if(document.getElementById('juntos-hoja')?.style.display==='flex') cerrarJuntos(); // se abre desde la hoja «Juntos en…»
      bsoParar();
      const origenPrevio=document.querySelector('.pantalla.activa')?.id;
      if(origenPrevio && origenPrevio!=='p-detalle') window.origenDetalle=origenPrevio;
      peliculaActual=p;
      _fichaAsentar();
      setTimeout(colActualizarBotonFicha, 0);
      _pintarBotonAbandonada();
      _pintarBotonOcultar(false);
      document.getElementById('d-antes').style.display='none';
      document.getElementById('d-siguiente').style.display='none'; window._sagaFicha=null;
      document.getElementById('d-titulo-header').textContent=p.title;
      const posterUrl = p.poster_path?'https://image.tmdb.org/t/p/w300'+p.poster_path:'';
      // Sin póster (o si no carga): hueco limpio en lugar del icono de imagen rota
      const imgPoster = document.getElementById('d-poster');
      imgPoster.onerror = ()=>{ imgPoster.removeAttribute('src'); imgPoster.parentElement.classList.add('sin-poster'); };
      imgPoster.parentElement.classList.toggle('sin-poster', !posterUrl);
      if(posterUrl) imgPoster.src = posterUrl; else imgPoster.removeAttribute('src');
      imgPoster.alt = posterUrl ? 'Póster de '+p.title : '';
      document.getElementById('d-titulo').textContent=p.title;
      document.getElementById('d-meta').textContent=(p.release_date?p.release_date.substring(0,4):'')+(p._tipo==='tv'?' · Serie':' · Película');
      document.getElementById('d-score').textContent=p.vote_average?p.vote_average.toFixed(1):'-';
      document.getElementById('d-votos').textContent='';
      document.getElementById('d-hero-backdrop-img').style.backgroundImage='linear-gradient(to bottom, #1b1d1c 0%, #1b1d1c 42%, var(--k-f5f3ef) 100%)';
      document.getElementById('d-hero-backdrop').style.transform='';
      document.getElementById('d-coleccion-box').style.display='none';
      document.getElementById('d-premios-box').style.display='none';
      document.getElementById('d-wiki-box').style.display='none'; document.getElementById('d-wiki').innerHTML='';
      document.getElementById('d-rodaje-box').style.display='none'; document.getElementById('d-basada').style.display='none'; window._basada=null;
      ['d-estado-serie','d-recap','d-montajes-box','d-versiones-box'].forEach(id=>{ const e = document.getElementById(id); if(e){ e.style.display='none'; e.innerHTML=''; } });
      document.getElementById('d-galeria-box').style.display='none'; document.getElementById('d-galeria').innerHTML='';
      document.getElementById('d-videos').innerHTML='';
      document.getElementById('d-logo').style.display='none';
      document.getElementById('d-logo').src='';
      document.getElementById('d-titulo').style.display='';
      document.getElementById('d-tagline').style.display='none';
      document.getElementById('d-titulo-original').style.display='none';
      document.getElementById('d-mood-row').style.display='none';
      document.getElementById('d-mood-label').style.display='none';
      _aplicarAcentoDetalle(null);
      if(posterUrl) _extraerColorPoster(posterUrl).then(rgb=>{ if(peliculaActual===p) _aplicarAcentoDetalle(rgb); });
      ['d-sinopsis','d-ficha','d-trailer-content','d-bso','d-directores','d-reparto','d-similares','d-plataformas'].forEach(id=>{document.getElementById(id).innerHTML='<span style="color:var(--k-767973);font-size:13px">Cargando...</span>';});
      document.getElementById('d-temporadas-box').style.display='none';
      document.getElementById('d-progreso-temporadas-box').style.display='none';
      window.temporadasSeriesActual = null;
      window.episodiosVistosGuardado = {};
      irA('p-detalle', false, desdeHistorial);
      cargarEstadoBiblioteca();
      _pintarNotaPrevista(p);
      // La ficha se enseña entera en cuanto llegan los datos principales y la clasificación por edad
      const _pDetalles = cargarDetallesCompletos(p.id,p._tipo), _pCalif = cargarCalificacion(p.id,p._tipo);
      Promise.allSettled([_pDetalles, _pCalif]).then(()=>{ if(peliculaActual===p) _fichaDatosListos(); });
      await Promise.all([
        _pDetalles,
        cargarCreditos(p.id,p._tipo),
        cargarPlataformas(p.id,p._tipo),
        cargarTemas(p.id,p._tipo),
        _pCalif,
        cargarSimilares(p),
        cargarTrailer(p.id,p._tipo),
        p._tipo==='tv'?cargarTemporadas(p.id):Promise.resolve()
      ]);
    }

    const MOOD_EMOJI = { aburrido:'😴', triste:'😢', contento:'😄', estresado:'😤', romantico:'🥰', pensativo:'🤔' };
    const MOOD_LABEL = { aburrido:'Aburrido', triste:'Triste', contento:'Contento', estresado:'Estresado', romantico:'Romántico', pensativo:'Pensativo' };
    // Un estado de ánimo encaja si el título tiene alguno de sus géneros, ninguno de los excluidos y la nota pedida.
    // Pesa más el primer género del título (el principal). Máximo dos.
    function _moodsParaGeneros(genreIds, tipo, voto){
      const t = tipo==='tv' ? 'tv' : 'movie', g = (genreIds||[]).map(Number);
      return Object.entries(ANIMOS[t]).map(([mood,d])=>{
        if(d.palabra) return null;                             // romance en series: TMDB no lo distingue por género
        if(d.sin.some(x=>g.includes(x))) return null;
        if(d.voto && !(voto>=d.voto)) return null;
        if(mood==='romantico' && !g.includes(10749)) return null;
        let puntos = g.reduce((s,x,i)=>s + (d.con.includes(x) ? (i===0 ? 3 : i===1 ? 2 : 1) : 0), 0);
        if(mood==='romantico') puntos = 99; // si tiene romance, «Romántico» va siempre primero
        return puntos>=2 ? {mood, puntos} : null;
      }).filter(Boolean).sort((a,b)=>b.puntos-a.puntos).slice(0,2).map(m=>m.mood);
    }
    function _mostrarMoodYTagline(d,tipo){
      const row = document.getElementById('d-mood-row');
      const moods = _moodsParaGeneros((d.genres||[]).map(g=>g.id), tipo, d.vote_average);
      if(moods.length){
        row.innerHTML = moods.map(m=>`<span style="background:var(--k-fffefb);border:1px solid var(--k-dedfd8);border-radius:6px;padding:6px 12px;font-size:12px;color:var(--k-303330);white-space:nowrap">${MOOD_EMOJI[m]} ${MOOD_LABEL[m]}</span>`).join('');
        row.style.display = 'flex';
        document.getElementById('d-mood-label').style.display = 'block';
      }
      const tag = document.getElementById('d-tagline');
      if(d.tagline && d.tagline.trim()){
        tag.textContent = `"${d.tagline.trim()}"`;
        tag.style.display = 'block';
      }
      const original = d.original_title || d.original_name;
      const actual = d.title || d.name;
      if(original && actual && original.trim().toLowerCase() !== actual.trim().toLowerCase()){
        const elOriginal = document.getElementById('d-titulo-original');
        elOriginal.textContent = `Título original: ${original}`;
        elOriginal.style.display = 'block';
      }
    }
    // Fotogramas: primero los que no llevan texto encima; se abren a pantalla completa y se pasan deslizando
    function _pintarGaleria(backdrops, p){
      const box = document.getElementById('d-galeria-box'), el = document.getElementById('d-galeria');
      const limpias = backdrops.filter(b=>!b.iso_639_1), conTexto = backdrops.filter(b=>b.iso_639_1);
      const fotos = [...limpias, ...conTexto].filter((b,i,a)=>a.findIndex(x=>x.file_path===b.file_path)===i).slice(0,20);
      if(fotos.length<2){ box.style.display = 'none'; return; }
      window._galeria = fotos.map(b=>b.file_path);
      el.innerHTML = window._galeria.map((f,i)=>`<button type="button" class="galeria-mini" onclick="abrirGaleria(${i})" aria-label="Ver imagen ${i+1}"><img loading="lazy" src="https://image.tmdb.org/t/p/w300${f}" alt=""></button>`).join('');
      box.style.display = 'block';
    }
    function abrirGaleria(i){
      let v = document.getElementById('galeria-visor');
      if(!v){
        v = document.createElement('div'); v.id = 'galeria-visor'; v.className = 'galeria-visor'; v.setAttribute('role','dialog'); v.setAttribute('aria-label','Imágenes');
        v.innerHTML = '<div class="galeria-pista" id="galeria-pista"></div><div class="galeria-cont" id="galeria-cont"></div><button type="button" class="galeria-cerrar" onclick="cerrarGaleria()" aria-label="Cerrar">✕</button>';
        document.body.appendChild(v);
        v.querySelector('#galeria-pista').addEventListener('scroll', e=>{ const t = e.target, n = Math.round(t.scrollLeft/t.clientWidth); document.getElementById('galeria-cont').textContent = `${n+1} / ${window._galeria.length}`; }, {passive:true});
      }
      const pista = v.querySelector('#galeria-pista');
      pista.innerHTML = (window._galeria||[]).map(f=>`<div class="galeria-foto"><img loading="lazy" src="https://image.tmdb.org/t/p/w1280${f}" alt=""></div>`).join('');
      v.style.display = 'flex'; document.body.style.overflow = 'hidden';
      requestAnimationFrame(()=>{ pista.scrollLeft = i*pista.clientWidth; document.getElementById('galeria-cont').textContent = `${i+1} / ${window._galeria.length}`; });
    }
    function cerrarGaleria(){ const v = document.getElementById('galeria-visor'); if(v) v.style.display = 'none'; document.body.style.overflow = ''; }
    // ── Entrada en la ficha sin saltos ──
    // Al abrir una ficha, sus datos llegan por partes (clasificación, lema, IMDb, «Le pondrías un…», el logo…) y la
    // tarjeta de arriba crecía a trozos, empujando hacia abajo todo lo demás. Ahora:
    //  · se ve al instante lo esencial (póster, título y año);
    //  · el resto aparece de una vez, con un fundido, en cuanto llegan los datos principales y la clasificación
    //    (como mucho, 0,7 s);
    //  · lo que llega más tarde tiene su hueco reservado: el título y el logo ocupan lo mismo, y la fila de
    //    IMDb/Metacritic se reserva hasta saber si hay notas.
    const _ficha = {tope:0, calma:0};
    function _fichaMostrar(){
      clearTimeout(_ficha.tope); clearTimeout(_ficha.calma);
      document.getElementById('p-detalle').classList.remove('ficha-cargando');
    }
    function _fichaAsentar(){
      _fichaMostrar();
      document.getElementById('p-detalle').classList.add('ficha-cargando');
      const notas = document.getElementById('d-notas-ext'), p = peliculaActual;
      notas.classList.add('reservado');
      setTimeout(()=>{ if(peliculaActual===p && !notas.childElementCount) notas.classList.remove('reservado'); }, 6000);   // por si nunca llegan
      _ficha.tope = setTimeout(_fichaMostrar, 700);
    }
    // Un instante de margen para que se pinte lo que ha llegado a la vez
    function _fichaDatosListos(){ clearTimeout(_ficha.calma); _ficha.calma = setTimeout(_fichaMostrar, 80); }
    function _fichaLogoListo(){}   // el logo ya no retrasa la ficha (tiene su hueco reservado)

    // ¿Se leería el logo sobre la tarjeta oscura de la ficha? Se calcula la luminancia relativa media (WCAG, en
    // escala lineal) de sus partes visibles: por debajo de 0,1 el contraste con el fondo no llega a 3 y es un logo
    // oscuro (negro o gris oscuro, pensado para fondo blanco). Un rojo intenso, por ejemplo, sí se lee y se respeta.
    function _logoEsOscuro(img){
      try{
        const ancho = 64, alto = Math.max(1, Math.round(64 * img.naturalHeight / Math.max(1, img.naturalWidth)));
        const c = document.createElement('canvas'); c.width = ancho; c.height = alto;
        const x = c.getContext('2d', {willReadFrequently:true}); x.drawImage(img, 0, 0, ancho, alto);
        const d = x.getImageData(0, 0, ancho, alto).data;
        const lin = v => { v /= 255; return v <= 0.03928 ? v/12.92 : ((v+0.055)/1.055) ** 2.4; };
        let suma = 0, peso = 0;
        for(let i=0; i<d.length; i+=4){
          const a = d[i+3]/255; if(a < 0.2) continue;
          suma += a * (0.2126*lin(d[i]) + 0.7152*lin(d[i+1]) + 0.0722*lin(d[i+2])); peso += a;
        }
        return peso > 0 && suma/peso < 0.1;
      }catch(e){ return false; }   // si no se puede medir, se deja como está
    }
    async function _cargarLogoOficial(id,tipo){
      const p=peliculaActual;
      try{
        const data = await fetch(`${TMDB_PROXY}?path=/${tipo}/${id}/images&include_image_language=es,en,null`).then(r=>r.json());
        if(peliculaActual!==p)return;
        _pintarGaleria(data.backdrops||[], p);
        const logos = data.logos||[];
        const elegido = logos.find(l=>l.iso_639_1==='es') || logos.find(l=>l.iso_639_1===null) || logos.find(l=>l.iso_639_1==='en') || logos[0];
        if(!elegido){ _fichaLogoListo(); return; } // sin logo disponible: se queda el título en texto de siempre
        const img = document.getElementById('d-logo');
        img.classList.remove('logo-oscuro');
        img.crossOrigin = 'anonymous';   // TMDB lo permite: así se puede medir si el logo es oscuro
        img.onload = ()=>{
          if(peliculaActual!==p)return;
          // Algunos logos son negros (pensados para fondo blanco) y sobre la tarjeta oscura no se verían: se pasan a blanco
          img.classList.toggle('logo-oscuro', _logoEsOscuro(img));
          img.style.display='block'; document.getElementById('d-titulo').style.display='none';
          _fichaLogoListo();
        };
        const src = `https://image.tmdb.org/t/p/w500${elegido.file_path}`;
        // Si la carga con permiso para medirla falla, se carga normal (sin medir): el logo se ve igual
        img.onerror = ()=>{
          if(peliculaActual!==p || !img.getAttribute('src')) return;   // el aviso es de otra ficha (al vaciar la imagen)
          if(img.crossOrigin){ img.removeAttribute('crossorigin'); img.src = src; } else _fichaLogoListo();
        };
        // «?cors=1»: el navegador podría tener ya esta imagen guardada sin permiso para leerla, y la reutilizaría
        img.src = src + '?cors=1';
      }catch(e){ _fichaLogoListo(); /* se queda el título en texto, comportamiento de siempre */ }
    }
    async function _cargarColeccion(d,tipo){
      const box = document.getElementById('d-coleccion-box');
      if(tipo!=='movie' || !d.belongs_to_collection){ return; } // ya se deja oculta por defecto al abrir la ficha
      const p=peliculaActual;
      try{
        const col = await fetch(`${TMDB_PROXY}?path=/collection/${d.belongs_to_collection.id}&language=es-ES`).then(r=>r.json());
        if(peliculaActual!==p)return;
        const partes = (col.parts||[]).filter(p=>p.poster_path).sort((a,b)=>(a.release_date||'9999')<(b.release_date||'9999')?-1:1);
        if(partes.length<2) return; // colección sin más entregas útiles que mostrar
        // si la ficha se abre nada más arrancar, se espera a tener tus vistas para no marcar mal el orden
        if(sesionActual && !(window.idsVistosSet && window.idsVistosSet.size)){ try{ await refrescarIdsVistos(); }catch(e){} if(peliculaActual!==p) return; }
        const vistosSet = window.idsVistosSet || new Set();
        const vistas = partes.filter(p=>vistosSet.has(`${p.id}-movie`)).length;
        _pintarAntesVe(d, col, partes, vistosSet);
        window._sagaFicha = {p, col, partes}; _pintarSiguienteSaga();
        const nombre = String(col.name||'').replace(/\s*[-–:]?\s*\(?(colecci[oó]n|collection|saga)\)?\s*$/i,'').replace(/^(colecci[oó]n|saga)\s*(de\s*)?/i,'') || col.name;
        const falta = partes.find(x=>!vistosSet.has(`${x.id}-movie`) && x.id!==p.id), pos = partes.findIndex(x=>x.id===p.id)+1, pct = Math.round(vistas/partes.length*100);
        window._sagaFalta = falta ? {...falta, _tipo:'movie', title:falta.title||falta.name} : null;
        const fondo = col.backdrop_path || (partes.find(x=>x.backdrop_path)||{}).backdrop_path;
        document.getElementById('d-coleccion-label').innerHTML = `<div class="saga-ban" style="${fondo ? `background-image:url(https://image.tmdb.org/t/p/w780${fondo})` : ''}" onclick="abrirSaga(${Number(d.belongs_to_collection.id)})">
            <div class="saga-ban-in">
              <div class="saga-ban-k">🎞️ Saga · ${pos}ª de ${partes.length}</div>
              <div class="saga-ban-t">${_escHtml(nombre)}</div>
              <div class="saga-ban-barra"><i style="width:${pct}%"></i></div>
              <div class="saga-ban-m">${vistas===partes.length ? '¡Las has visto todas! 🏆' : `${vistas} de ${partes.length} vistas`}${falta ? ` · te falta <b>${_escHtml(falta.title||falta.name)}</b>` : ''}</div>
              <span class="saga-ban-btn">Ver la saga ›</span>
            </div></div>`;
        window.coleccionActual = partes.map(p=>({...p, _tipo:'movie', title:p.title||p.name}));
        document.getElementById('d-coleccion').innerHTML = window.coleccionActual.map((p,i)=>{
          const visto = vistosSet.has(`${p.id}-movie`);
          const aqui = p.id===peliculaActual?.id;
          return `<div class="similar-card saga-card${aqui?' aqui':''}" onclick="abrirDetalle(coleccionActual[${i}])"><div style="position:relative"><img loading="lazy" src="https://image.tmdb.org/t/p/w200${p.poster_path}" alt="${_escHtml(p.title)}"><span class="saga-num">${i+1}</span>${aqui?'<span class="saga-aqui">Estás aquí</span>':''}${visto?'<div style="position:absolute;top:6px;right:6px;background:rgba(61,102,81,0.95);color:#fff;font-size:11px;font-weight:800;width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.4)">✓</div>':''}</div><div class="similar-titulo">${_escHtml(p.title)}</div><div class="similar-meta">${p.release_date?p.release_date.substring(0,4):''} · ★${p.vote_average?p.vote_average.toFixed(1):'-'}</div></div>`;
        }).join('');
        box.style.display='block';
      }catch(e){ /* se queda oculta: no rompe el resto de la ficha */ }
    }
    // Cuando ya has visto esta, la siguiente de la saga que te falta (o cuándo se estrena)
    function _pintarSiguienteSaga(){
      const el = document.getElementById('d-siguiente'), s = window._sagaFicha; if(!el) return;
      el.style.display = 'none';
      if(!s || peliculaActual!==s.p) return;
      const vistos = window.idsVistosSet || new Set(), idx = s.partes.findIndex(x=>x.id===s.p.id);
      if(idx<0 || !vistos.has(`${s.p.id}-movie`)) return;
      const sig = s.partes.slice(idx+1).find(x=>!vistos.has(`${x.id}-movie`)); if(!sig) return;
      const hoy = new Date().toISOString().slice(0,10), fut = !sig.release_date || sig.release_date>hoy;
      window._sagaSig = {...sig, _tipo:'movie', title:sig.title||sig.name};
      const pend = (window._descPend||new Set()).has(`${sig.id}-movie`);
      el.innerHTML = `${sig.poster_path ? `<img src="https://image.tmdb.org/t/p/w154${sig.poster_path}" alt="">` : ''}
        <div class="d-sig-info"><div class="d-sig-k">${fut ? 'La siguiente de la saga' : '¿Sigues con la saga?'}</div>
          <div class="d-sig-t">${_escHtml(window._sagaSig.title)}</div>
          <div class="d-sig-m">${fut ? (sig.release_date ? `Se estrena el ${new Date(sig.release_date+'T12:00:00').toLocaleDateString('es-ES',{day:'numeric',month:'long',year:'numeric'})}` : 'Sin fecha de estreno') : (sig.release_date||'').slice(0,4)}</div>
          <div class="d-sig-b">${pend ? '<span class="d-sig-ya">🔖 Ya está en «Para ver»</span>' : `<button type="button" class="desc-hero-btn principal" onclick="sagaSigPendiente(this)">＋ Para ver</button>`}<button type="button" class="desc-hero-btn" onclick="abrirDetalle(_sagaSig)">Ver ficha</button></div></div>`;
      el.style.display = 'flex';
    }
    async function sagaSigPendiente(btn){
      const x = window._sagaSig; if(!x) return; btn.disabled = true;
      if(await _lpGuardar({id:x.id, tipo:'movie', t:x.title, poster:x.poster_path, f:x.release_date}, {pendiente:true}, `＋ «${x.title}» añadida a «Para ver»`)){ (window._descPend = window._descPend || new Set()).add(`${x.id}-movie`); btn.outerHTML = '<span class="d-sig-ya">🔖 Añadida a «Para ver»</span>'; }
      else btn.disabled = false;
    }
    // Orden de la saga en la ficha: avisa si te faltan anteriores y, aunque no falte nada, deja consultar el orden
    function _pintarAntesVe(d, col, partes, vistosSet){
      const el = document.getElementById('d-antes'); if(!el) return;
      el.style.display = 'none'; el.classList.remove('ok');
      const hoy = new Date().toISOString().slice(0,10), idx = partes.findIndex(x=>x.id===d.id);
      if(idx<0 || partes.length<2) return;
      const saga = String(col.name||'').replace(/\s*[-–:]\s*Colecci[oó]n$/i,'').replace(/^Colecci[oó]n\s+(de\s+)?/i,'').trim();
      const deSaga = saga ? ` de <b>${_escHtml(saga)}</b>` : ' de su saga';
      const anteriores = partes.slice(0,idx).filter(x=>x.release_date && x.release_date<=hoy);
      const faltan = vistosSet.has(`${d.id}-movie`) ? [] : anteriores.filter(x=>!vistosSet.has(`${x.id}-movie`));
      window._antesFaltan = partes.map(x=>({...x, _tipo:'movie', title:x.title||x.name}));
      const fila = (x,i) => {
        const esta = i===idx, vista = vistosSet.has(`${x.id}-movie`), futura = !x.release_date || x.release_date>hoy;
        return `<button type="button" class="d-antes-f${esta?' esta':''}${vista?' vista':''}" ${esta ? 'disabled' : `onclick="abrirDetalle(_antesFaltan[${i}])"`}>
          <span class="d-antes-n">${i+1}</span><span class="d-antes-tt">${_escHtml(x.title)}${x.release_date ? ` <span>(${x.release_date.slice(0,4)})</span>` : ''}</span>
          <span class="d-antes-e">${esta ? 'Esta' : vista ? '✓ Vista' : futura ? 'Próximamente' : '○ Sin ver'}</span></button>`;
      };
      let cab;
      if(faltan.length) cab = `⚠️ Es la ${idx+1}.ª película${deSaga}. ${anteriores.length>1 ? `Te ${faltan.length===1?'falta':'faltan'} <b>${faltan.length} de ${anteriores.length}</b> anteriores${faltan.length===1 ? `: ${_escHtml(faltan[0].title||faltan[0].name)}` : ''}.` : `Antes te falta <b>${_escHtml(faltan[0].title||faltan[0].name)}</b>.`}`;
      else{
        el.classList.add('ok');
        cab = `🎬 Es la ${idx+1}.ª de ${partes.length} películas${deSaga}.${anteriores.length ? ` ✓ Has visto ${anteriores.length===1 ? 'la anterior' : `las ${anteriores.length} anteriores`}.` : ''}`;
      }
      el.innerHTML = `<div class="d-antes-t">${cab}</div>
        <button type="button" class="d-antes-toggle" onclick="const l=this.nextElementSibling;l.hidden=!l.hidden;this.textContent=l.hidden?'Ver el orden de la saga ▾':'Ocultar el orden ▴'">Ver el orden de la saga ▾</button>
        <div class="d-antes-lista" hidden>${window._antesFaltan.map(fila).join('')}</div>`;
      el.style.display = 'block';
    }
    async function cargarDetallesCompletos(id,tipo){
      // Si mientras tanto se abre otra ficha, estos datos ya no se pintan (evita mezclar títulos)
      const p=peliculaActual;
      try{
        const res=await fetch(`${TMDB_PROXY}?path=/${tipo}/${id}&language=es-ES`);
        const d=await res.json();
        if(peliculaActual!==p)return;
        if(d.backdrop_path){
          document.getElementById('d-hero-backdrop-img').style.backgroundImage=
            `linear-gradient(to bottom, rgba(27,29,28,0.62) 0%, rgba(27,29,28,0.28) 34%, color-mix(in srgb, var(--k-f5f3ef) 55%, transparent) 72%, color-mix(in srgb, var(--k-f5f3ef) 100%, transparent) 100%), url(https://image.tmdb.org/t/p/w780${d.backdrop_path})`;
        }
        _cargarColeccion(d,tipo);
        _pintarEstadoSerie(d, tipo, p);
        if(tipo==='movie'){ _pintarMontajes(p); _pintarVersiones(p); }
        _cargarLogoOficial(id,tipo);
        _pintarBSO(d);
        _pintarNotasExternas(tipo, id, p);
        _mostrarMoodYTagline(d,tipo);
        let sinopsis=d.overview&&d.overview.trim();
        if(!sinopsis){try{sinopsis=(await(await fetch(`${TMDB_PROXY}?path=/${tipo}/${id}&language=en-US`)).json()).overview||'';}catch(e){}
          if(peliculaActual!==p)return;}
        document.getElementById('d-sinopsis').textContent=sinopsis||'Sin sinopsis disponible.';
        if(d.vote_count){const v=d.vote_count>=1000?(d.vote_count/1000).toFixed(1)+'K':d.vote_count;document.getElementById('d-votos').textContent=`· ${v} votos`;}
        const items=[];
        if(tipo==='movie'){
          if(d.runtime)items.push({val:formatDuracion(d.runtime),label:'Duración'});
          if(d.release_date)items.push({val:d.release_date.substring(0,4),label:'Año'});
          const pais=d.production_countries?.[0]?.name;if(pais)items.push({val:_escHtml(pais),label:'País'});
          if(d.original_language)items.push({val:_escHtml(_idiomaMayus(d.original_language)),label:'Idioma original'});
        }else{
          if(d.number_of_seasons)items.push({val:`${d.number_of_seasons} temp.`,label:'Temporadas'});
          if(d.number_of_episodes)items.push({val:`${d.number_of_episodes} ep.`,label:'Episodios'});
          const pais=d.production_countries?.[0]?.name;if(pais)items.push({val:_escHtml(pais),label:'País'});
          if(d.first_air_date&&d.last_air_date){const finalizada=d.status==='Ended'||d.status==='Canceled';const fin=finalizada?d.last_air_date.substring(0,4):'hoy';items.push({val:`${d.first_air_date.substring(0,4)}–${fin}`,label:'Emisión'});}
          if(d.original_language)items.push({val:_escHtml(_idiomaMayus(d.original_language)),label:'Idioma original'});
        }
        let html='';
        if(tipo==='tv'){
          const prox=d.next_episode_to_air;
          if(prox&&prox.air_date){
            const fd=new Date(prox.air_date+'T12:00:00'), f=fd.toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long',...(fd.getFullYear()!==new Date().getFullYear()?{year:'numeric'}:{})});
            html+=`<div class="ficha-proximo">📅 <b>Próximo episodio:</b> T${prox.season_number} · E${prox.episode_number}${prox.name&&!/^Episodio \d+$/i.test(prox.name)?` «${_escHtml(prox.name)}»`:''} · ${f}</div>`;
          }else if(d.status==='Returning Series'){
            html+=`<div class="ficha-proximo">🔄 <b>Renovada:</b> habrá más temporadas, aún sin fecha.</div>`;
          }else if(d.status==='Ended'||d.status==='Canceled'){
            html+=`<div class="ficha-proximo fin">${d.status==='Canceled'?'✖️ <b>Cancelada</b>':'🏁 <b>Finalizada</b>'}${d.last_episode_to_air?.air_date?` · último episodio en ${d.last_episode_to_air.air_date.slice(0,4)}`:''}</div>`;
          }
        }
        if(items.length)html+=`<div class="ficha-grid">${items.map(i=>`<div class="ficha-item"><div class="ficha-valor">${i.val}</div><div class="ficha-label">${i.label}</div></div>`).join('')}</div>`;
        if(d.genres&&d.genres.length)html+=`<div class="ficha-row">${d.genres.map(g=>`<span class="ficha-tag">${_escHtml(g.name)}</span>`).join('')}</div>`;
        const prod=(d.production_companies||[]).slice(0,4);
        window._estudiosFicha=prod;
        if(prod.length)html+=`<div class="ficha-row">${prod.map((c,i)=>`<button type="button" class="ficha-tag ficha-tag-link" onclick="abrirEstudioFicha(${i})" title="Ver todo lo de ${_escHtml(c.name)}">🏢 ${_escHtml(c.name)} ›</button>`).join('')}</div>`;
        if(tipo==='movie'){const pre=formatDinero(d.budget),rec=formatDinero(d.revenue);if(pre||rec)html+=`<div class="ficha-dinero">${pre?`<div class="ficha-dinero-item"><div class="ficha-dinero-val">${pre}</div><div class="ficha-dinero-label">Presupuesto</div></div>`:''} ${rec?`<div class="ficha-dinero-item"><div class="ficha-dinero-val">${rec}</div><div class="ficha-dinero-label">Recaudación</div></div>`:''}</div>`;}
        document.getElementById('d-ficha').innerHTML=html||'<span style="color:var(--k-767973);font-size:13px">No disponible</span>';
      }catch(e){if(peliculaActual!==p)return;document.getElementById('d-sinopsis').textContent='Sin sinopsis disponible.';document.getElementById('d-ficha').innerHTML='<span style="color:var(--k-767973);font-size:13px">No disponible</span>';}
    }
    function formatDinero(n){if(!n||n===0)return null;if(n>=1e9)return(n/1e9).toFixed(1)+'B $';if(n>=1e6)return Math.round(n/1e6)+'M $';return n.toLocaleString()+' $';}
    function formatDuracion(min){if(!min)return null;const h=Math.floor(min/60),m=min%60;return h>0?`${h}h ${m}min`:`${m}min`;}

    // ── TEMPORADAS (solo series) ───────────────────────────────────────────
    async function cargarTemporadas(id){
      const p=peliculaActual;
      try{
        const d=await(await fetch(`${TMDB_PROXY}?path=/tv/${id}&language=es-ES`)).json();
        if(peliculaActual!==p)return;
        const seasons=(d.seasons||[]).filter(s=>s.season_number>0); // excluir "Especiales" (season 0)
        window.temporadasSeriesActual = seasons;
        window.serieDetalleActual = d;
        window.tvIdActual = id;
        window.episodiosCache = {};
        renderProgresoTemporadas();
        if(!seasons.length)return;
        document.getElementById('d-temporadas-box').style.display='block';
        _pintarMejorEpisodio(id, seasons, p);
        document.getElementById('d-temporadas').innerHTML=seasons.map(s=>{
          const vistos = (window.episodiosVistosGuardado?.[s.season_number]||[]).length;
          return `
          <div class="temporada-item">
            <img loading="lazy" class="temporada-poster" src="${s.poster_path?'https://image.tmdb.org/t/p/w92'+s.poster_path:''}" alt="${_escHtml(s.name)}">
            <div class="temporada-info">
              <div class="temporada-nombre">${_escHtml(s.name)}</div>
              <div class="temporada-meta">${s.air_date?s.air_date.substring(0,4):''} · ${s.episode_count} episodios</div>
              ${sesionActual && (!s.air_date || s.air_date<=new Date().toISOString().slice(0,10)) ? `<label class="temp-nota">Tu nota <select onchange="guardarNotaTemporada(${id},${s.season_number},this.value)"><option value="">—</option>${Array.from({length:10},(_,k)=>10-k).map(n=>`<option value="${n}"${(_notasTempLeer()[id]||{})[s.season_number]==n?' selected':''}>${n}</option>`).join('')}</select></label>` : ''}
              ${s.overview?`<div class="temporada-sinopsis">${_escHtml(s.overview)}</div>`:''}
              <div class="link-sutil" id="toggle-temp-${s.season_number}" data-abierto="0" onclick="toggleEpisodiosSeason(${s.season_number})">▸ Ver episodios (${vistos}/${s.episode_count} vistos)</div>
              <div id="episodios-temp-${s.season_number}" style="display:none;margin-top:8px"></div>
            </div>
          </div>`;
        }).join('');
      }catch(e){}
    }

    function renderProgresoTemporadas(){
      setTimeout(_pintarRecap, 0);
      const box = document.getElementById('d-progreso-temporadas-box');
      const seasons = window.temporadasSeriesActual;
      if(!peliculaActual || peliculaActual._tipo!=='tv' || !seasons || !seasons.length){ box.style.display='none'; return; }
      if(!sesionActual){ box.style.display='none'; return; }
      const guardado = window.episodiosVistosGuardado || {};
      const totalEpisodios = seasons.reduce((s,se)=>s+(se.episode_count||0),0);
      const vistosEpisodios = seasons.reduce((s,se)=>s+((guardado[se.season_number]||[]).length),0);
      document.getElementById('d-progreso-temporadas').innerHTML = `
        <div class="d-puntuacion-row">
          ${seasons.map(se=>{
            const vistosTemp = (guardado[se.season_number]||[]).length;
            const completa = se.episode_count>0 && vistosTemp>=se.episode_count;
            return `<div class="d-punto ${completa?'active':''}" onclick="toggleTemporadaCompleta(${se.season_number},${se.episode_count})" title="${_escHtml(se.name)}: toca para marcar/desmarcar toda la temporada">${se.season_number}</div>`;
          }).join('')}
        </div>
        <div class="progreso-temporadas-texto">${vistosEpisodios}/${totalEpisodios} episodios vistos · toca el número para marcar la temporada entera, o "Ver episodios" para ir uno a uno</div>
        ${(()=>{ const q = vistosEpisodios ? _loQueQueda(window.serieDetalleActual, guardado) : null; return q && q.eps ? `<div class="progreso-queda">⏳ Te ${q.eps===1?'queda':'quedan'} <b>${q.eps} ${q.eps===1?'episodio':'episodios'}</b>${q.min?` · ${_duracionAprox(q.min)}`:''}${q.pendientes?` <span>(+${q.pendientes} por emitir)</span>`:''}</div>` : ''; })()}
      `;
      box.style.display='block';
    }

    // si al guardar el progreso ya está el 100% de episodios vistos, se marca "Vista" sola.
    // Nunca la desmarca en sentido contrario: si quitas un episodio, tú decides si sigue siendo "Vista".
    function patchEpisodiosConVistoAuto(guardado){
      const seasons = window.temporadasSeriesActual || [];
      const totalEpisodios = seasons.reduce((s,se)=>s+(se.episode_count||0),0);
      const vistosEpisodios = seasons.reduce((s,se)=>s+((guardado[se.season_number]||[]).length),0);
      const patch = { episodios_vistos: guardado };
      if(totalEpisodios>0 && vistosEpisodios>=totalEpisodios) patch.visto = true;
      return patch;
    }
    // Episodios ya emitidos que te faltan por ver y el tiempo aproximado que suponen
    function _loQueQueda(d, vistos){
      if(!d || !d.seasons) return null;
      const prox = d.next_episode_to_air, hoy = new Date().toISOString().slice(0,10);
      const yaEmitido = prox && prox.air_date && prox.air_date > hoy;
      const emitidos = s => !yaEmitido || s.season_number < prox.season_number ? (s.episode_count||0) : s.season_number === prox.season_number ? Math.max(0, prox.episode_number-1) : 0;
      let eps = 0, pendientes = 0;
      d.seasons.filter(s=>s.season_number>0).forEach(s=>{
        const e = emitidos(s), visto = ((vistos||{})[s.season_number]||[]).filter(n=>n<=e).length;
        eps += Math.max(0, e - visto); pendientes += Math.max(0, (s.episode_count||0) - e);
      });
      const rts = (d.episode_run_time||[]).filter(x=>x>0);
      const media = rts.length ? rts.reduce((a,b)=>a+b,0)/rts.length : (d.last_episode_to_air?.runtime || 0);
      return {eps, pendientes, min: media ? Math.round(eps*media) : 0};
    }
    function _duracionAprox(min){ return min < 60 ? `unos ${min} min` : min < 90 ? 'algo más de 1 h' : `unas ${Math.round(min/60)} h`; }
    // Sello «VISTA» sobre el póster de la ficha
    function _selloVista(){
      const w = document.querySelector('#p-detalle .d-poster-wrap'); if(!w) return;
      w.querySelector('.sello-vista')?.remove();
      const s = document.createElement('span'); s.className = 'sello-vista'; s.textContent = 'VISTA';
      w.appendChild(s); setTimeout(()=>s.remove(), 2600);
    }
    // Confeti y mensaje (grande al terminar algo entero; discreto al completar una temporada)
    function _celebrar(texto, grande){
      const reducido = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
      const c = document.createElement('div'); c.className = 'celebra' + (grande ? ' grande' : '');
      const colores = ['var(--acento)','#ffd27a','#3d6651','#4f8fdb','#f08a82','#ffffff'];
      c.innerHTML = (reducido ? '' : Array.from({length: grande ? 70 : 28}, (_,i)=>`<i style="left:${Math.random()*100}%;background:${colores[i%colores.length]};animation-delay:${(Math.random()*0.5).toFixed(2)}s;animation-duration:${(1.6+Math.random()*1.2).toFixed(2)}s;transform:rotate(${Math.round(Math.random()*360)}deg)"></i>`).join('')) + `<div class="celebra-t">${_escHtml(texto)}</div>`;
      document.body.appendChild(c);
      if(navigator.vibrate) navigator.vibrate(grande ? [20,40,20] : 15);
      setTimeout(()=>c.classList.add('fuera'), grande ? 2600 : 1700);
      setTimeout(()=>c.remove(), grande ? 3100 : 2200);
    }
    async function toggleTemporadaCompleta(seasonNumber, episodeCount){
      if(!sesionActual){ mostrarCuenta(); return; }
      const guardado = { ...(window.episodiosVistosGuardado||{}) };
      const actuales = guardado[seasonNumber] || [];
      const completa = episodeCount>0 && actuales.length >= episodeCount;
      guardado[seasonNumber] = completa ? [] : Array.from({length:episodeCount},(_,i)=>i+1);
      if(!completa && !patchEpisodiosConVistoAuto(guardado).visto) _celebrar(`✅ Temporada ${seasonNumber} completada`, false);
      window.episodiosVistosGuardado = guardado;
      renderProgresoTemporadas();
      actualizarContadorTemporadaUI(seasonNumber);
      if(window.episodiosCache?.[seasonNumber]) renderEpisodiosDeTemporada(seasonNumber);
      await upsertBiblioteca(patchEpisodiosConVistoAuto(guardado));
    }

    async function toggleEpisodiosSeason(seasonNumber){
      const cont = document.getElementById(`episodios-temp-${seasonNumber}`);
      const link = document.getElementById(`toggle-temp-${seasonNumber}`);
      const abierto = link.dataset.abierto === '1';
      if(abierto){
        cont.style.display = 'none';
        link.dataset.abierto = '0';
        actualizarContadorTemporadaUI(seasonNumber);
        return;
      }
      if(!sesionActual){ mostrarCuenta(); return; }
      link.dataset.abierto = '1';
      cont.style.display = 'block';
      actualizarContadorTemporadaUI(seasonNumber);
      if(!window.episodiosCache) window.episodiosCache = {};
      if(!window.episodiosCache[seasonNumber]){
        cont.innerHTML = '<span style="color:var(--k-767973);font-size:12px">Cargando episodios...</span>';
        try{
          const d = await (await fetch(`${TMDB_PROXY}?path=/tv/${window.tvIdActual}/season/${seasonNumber}&language=es-ES`)).json();
          const eps = d.episodes||[];
          const generico = ep => !ep.name || /^Episodio \d+$/i.test(ep.name.trim());
          if(eps.some(ep=>!ep.overview || generico(ep))){
            try{
              const en = await _tmdbJson(`/tv/${window.tvIdActual}/season/${seasonNumber}&language=en-US`);
              eps.forEach(ep=>{
                const x = (en.episodes||[]).find(y=>y.episode_number===ep.episode_number); if(!x) return;
                if(!ep.overview && x.overview){ ep.overview = x.overview; ep._sinopsisEn = true; }
                if(generico(ep) && x.name && !/^Episode \d+$/i.test(x.name.trim())) ep.name = x.name;
              });
            }catch(e){}
          }
          window.episodiosCache[seasonNumber] = eps;
        }catch(e){
          cont.innerHTML = '<span style="color:#b3261e;font-size:12px">⚠️ No se pudieron cargar los episodios. Comprueba tu conexión.</span>';
          return;
        }
      }
      renderEpisodiosDeTemporada(seasonNumber);
    }

    function renderEpisodiosDeTemporada(seasonNumber){
      const cont = document.getElementById(`episodios-temp-${seasonNumber}`);
      if(!cont) return;
      const episodios = window.episodiosCache?.[seasonNumber] || [];
      const vistos = window.episodiosVistosGuardado?.[seasonNumber] || [];
      if(!episodios.length){ cont.innerHTML = '<span style="color:var(--k-767973);font-size:12px">Todavía no hay episodios listados para esta temporada.</span>'; return; }
      const hoyISO = new Date().toISOString().slice(0,10);
      const mejores = _mejoresEpisodios(episodios, episodios.length > 12 ? 3 : 2);
      cont.innerHTML = episodios.map(ep=>{
        const fecha = ep.air_date ? new Date(ep.air_date+'T12:00:00').toLocaleDateString('es-ES',{day:'numeric', month:'short', year:'numeric'}) : '';
        const nota = _notaFiable(ep) ? `★ ${ep.vote_average.toFixed(1)}` : '';
        const meta = [fecha && (ep.air_date>hoyISO ? 'Se emite el '+fecha : fecha), ep.runtime ? ep.runtime+' min' : '', nota].filter(Boolean).join(' · ');
        return `
        <div class="episodio-row${mejores.has(ep.episode_number)?' mejor':''}" onclick="toggleEpisodioVisto(${seasonNumber},${ep.episode_number})">
          <span class="episodio-check">${vistos.includes(ep.episode_number)?'✅':'⬜'}</span>
          <div class="episodio-info">
            <span class="episodio-nombre">${ep.episode_number}. ${_escHtml(ep.name||'Episodio '+ep.episode_number)}${mejores.has(ep.episode_number)?' <span class="episodio-top" title="De los mejor valorados de la temporada">⭐</span>':''}</span>
            ${meta ? `<span class="episodio-meta">${meta}</span>` : ''}
            ${ep.overview ? `<button type="button" class="episodio-ver" onclick="event.stopPropagation();verSinopsisEpisodio(this)">Ver de qué va ▾</button>
              <p class="episodio-sinopsis" hidden onclick="event.stopPropagation()">${_escHtml(ep.overview)}${ep._sinopsisEn ? ' <em>(en inglés: no está traducida en TMDB)</em>' : ''}</p>` : ''}
          </div>
          <span class="episodio-play" role="button" aria-label="Ver fuentes del episodio ${ep.episode_number}" onclick="event.stopPropagation();abrirFuentesEpisodio(${seasonNumber},${ep.episode_number})">▶</span>
        </div>`;
      }).join('');
    }
    // Nota de episodio: con pocos votos en TMDB no es fiable, así que no se enseña
    function _notaFiable(ep){ return ep && ep.vote_count >= 5 && ep.vote_average > 0 && (!ep.air_date || ep.air_date <= new Date().toISOString().slice(0,10)); }
    function _mejoresEpisodios(eps, n){
      const conNota = eps.filter(_notaFiable);
      if(conNota.length < 4) return new Set();
      const media = conNota.reduce((t,e)=>t+e.vote_average,0)/conNota.length;
      // Solo los que destacan de verdad sobre el resto de la temporada (si todos empatan, ninguno)
      return new Set(conNota.sort((a,b)=>b.vote_average-a.vote_average || b.vote_count-a.vote_count).slice(0,n).filter(e=>e.vote_average>=7.5 && e.vote_average>=media+0.3).map(e=>e.episode_number));
    }
    // El mejor episodio de toda la serie (en series de hasta 12 temporadas, para no hacer decenas de peticiones)
    async function _pintarMejorEpisodio(id, seasons, p){
      const el = document.getElementById('d-mejor-ep'); if(!el) return;
      el.innerHTML = ''; el.style.display = 'none';
      const curva = document.getElementById('d-curva'); curva.innerHTML = ''; curva.style.display = 'none'; window._curvaActual = null;
      if(!seasons.length || seasons.length > 12) return;
      const temps = await _fetchEnLotes(seasons, async s=>{ try{ return await _tmdbCacheado(`/tv/${id}/season/${s.season_number}&language=es-ES`); }catch(e){ return null; } }, 4);
      if(peliculaActual!==p) return;
      // nota media de cada temporada, con los episodios que tienen votos suficientes
      const datos = temps.filter(Boolean).map(t=>{ const e = (t.episodes||[]).filter(_notaFiable); return e.length>=3 ? {s:t.season_number, m:e.reduce((a,x)=>a+x.vote_average,0)/e.length} : null; }).filter(Boolean);
      if(datos.length>=2){ window._curvaActual = {id, datos}; _pintarCurva(); }
      const todos = temps.filter(Boolean).flatMap(t=>(t.episodes||[]).map(e=>({...e, season_number:t.season_number})));
      const top = todos.filter(e=>_notaFiable(e) && e.vote_count>=10).sort((a,b)=>b.vote_average-a.vote_average || b.vote_count-a.vote_count).slice(0,3);
      if(!top.length || top[0].vote_average < 7.5) return;
      el.innerHTML = `<div class="mejor-ep-t">⭐ Los episodios mejor valorados</div>` + top.map(e=>`<div class="mejor-ep-f"><b>T${e.season_number} · E${e.episode_number}</b> ${_escHtml(e.name||'')} <span>★ ${e.vote_average.toFixed(1)}</span></div>`).join('');
      el.style.display = 'block';
    }
    function _pintarCurva(){
      const el = document.getElementById('d-curva'), c = window._curvaActual; if(!el || !c) return;
      const tus = _notasTempLeer()[c.id] || {};
      const ms = c.datos.map(d=>d.m), min = Math.min(...ms), max = Math.max(...ms);
      const lo = Math.max(0, Math.floor(min-0.6)), hi = Math.min(10, Math.max(lo+1, Math.ceil(max+0.1)));
      const alto = v => Math.round(12 + (v-lo)/(hi-lo)*88);
      const mejor = c.datos.find(d=>d.m===max), peor = c.datos.find(d=>d.m===min);
      const f = v => v.toFixed(1).replace('.', ',');
      let frase = 'Muy regular: todas las temporadas tienen una nota parecida.';
      if(max-min>=0.4){
        const ultima = c.datos[c.datos.length-1], primera = c.datos[0];
        frase = `La mejor temporada es la ${mejor.s} (${f(mejor.m)}) y la más floja, la ${peor.s} (${f(peor.m)}).`;
        if(ultima.m <= min+0.05 && ultima.m < primera.m-0.4) frase += ' Va a menos al final.';
        else if(ultima.m >= max-0.05 && ultima.m > primera.m+0.4) frase += ' Va a más.';
      }
      el.innerHTML = `<div class="curva-t">📈 Calidad por temporada <span>nota media de sus episodios</span></div>
        <div class="curva-barras">${c.datos.map(d=>`<div class="curva-col"><div class="curva-v">${f(d.m)}</div><div class="curva-b${d===mejor&&max-min>=0.4?' top':''}${d===peor&&max-min>=0.4?' low':''}" style="height:${alto(d.m)}%"></div><div class="curva-s">T${d.s}</div>${tus[d.s] ? `<div class="curva-tu" title="Tu nota">Tú ${tus[d.s]}</div>` : ''}</div>`).join('')}</div>
        <div class="curva-frase">${frase}</div>`;
      el.style.display = 'block';
    }
    // Tu nota de cada temporada (en tu cuenta): { idSerie: { temporada: nota } }
    const NOTAS_TEMP_LS = 'cm:notasTemp';
    let _notasTempT = null;
    function _notasTempLeer(){ try{ return JSON.parse(localStorage.getItem(NOTAS_TEMP_LS)||'{}') || {}; }catch(e){ return {}; } }
    function _notasTempGuardar(o){
      try{ localStorage.setItem(NOTAS_TEMP_LS, JSON.stringify(o)); }catch(e){}
      if(!sesionActual) return;
      clearTimeout(_notasTempT);
      _notasTempT = setTimeout(async ()=>{ try{ await sb.auth.updateUser({ data: { cm_notas_temp: o } }); }catch(e){} }, 600);
    }
    function notasTempDesdeCuenta(){
      const r = sesionActual && sesionActual.user && sesionActual.user.user_metadata && sesionActual.user.user_metadata.cm_notas_temp;
      if(r && typeof r==='object'){ try{ localStorage.setItem(NOTAS_TEMP_LS, JSON.stringify(r)); }catch(e){} }
      else if(sesionActual){ const o = _notasTempLeer(); if(Object.keys(o).length) _notasTempGuardar(o); }
    }
    function guardarNotaTemporada(tv, s, v){
      if(!sesionActual){ mostrarCuenta(); return; }
      const o = _notasTempLeer(); o[tv] = o[tv] || {};
      if(v) o[tv][s] = Number(v); else delete o[tv][s];
      if(!Object.keys(o[tv]).length) delete o[tv];
      _notasTempGuardar(o);
      _pintarCurva();
    }
    // Sinopsis plegada por defecto (para no destripar nada al abrir la temporada)
    function verSinopsisEpisodio(btn){
      const p = btn.nextElementSibling; p.hidden = !p.hidden;
      btn.textContent = p.hidden ? 'Ver de qué va ▾' : 'Ocultar ▴';
    }

    function actualizarContadorTemporadaUI(seasonNumber){
      const seasons = window.temporadasSeriesActual || [];
      const s = seasons.find(se=>se.season_number===seasonNumber);
      if(!s) return;
      const vistos = (window.episodiosVistosGuardado?.[seasonNumber]||[]).length;
      const link = document.getElementById(`toggle-temp-${seasonNumber}`);
      if(link){
        const abierto = link.dataset.abierto === '1';
        link.textContent = `${abierto?'▾ Ocultar':'▸ Ver'} episodios (${vistos}/${s.episode_count} vistos)`;
      }
    }

    async function toggleEpisodioVisto(seasonNumber, episodeNumber){
      if(!sesionActual){ mostrarCuenta(); return; }
      const guardado = { ...(window.episodiosVistosGuardado||{}) };
      const actuales = guardado[seasonNumber] ? [...guardado[seasonNumber]] : [];
      const idx = actuales.indexOf(episodeNumber);
      let tempsAnteriores = [];
      if(idx>=0) actuales.splice(idx,1);
      else{
        actuales.push(episodeNumber);
        // ¿y lo anterior? Útil si empiezas a apuntar una serie a medias
        const faltanAqui = Array.from({length:episodeNumber-1},(_,i)=>i+1).filter(n=>!actuales.includes(n));
        tempsAnteriores = (window.temporadasSeriesActual||[]).filter(se=>se.season_number<seasonNumber && (guardado[se.season_number]||[]).length < (se.episode_count||0));
        if(faltanAqui.length || tempsAnteriores.length){
          const partes = [];
          if(tempsAnteriores.length) partes.push(tempsAnteriores.length===1 ? `la temporada ${tempsAnteriores[0].season_number} entera` : `las temporadas ${tempsAnteriores.map(t=>t.season_number).join(', ').replace(/, (\d+)$/,' y $1')} enteras`);
          if(faltanAqui.length) partes.push(faltanAqui.length===1 ? `el episodio ${faltanAqui[0]} de esta temporada` : `los ${faltanAqui.length} episodios anteriores de esta temporada`);
          if(await _confirmar(`¿Marco también como vistos ${partes.join(' y ')}?`, {aceptar:'Sí, marcarlos', cancelar:'Solo este'})){
            faltanAqui.forEach(n=>actuales.push(n));
            tempsAnteriores.forEach(se=>{ guardado[se.season_number] = Array.from({length:se.episode_count},(_,i)=>i+1); });
          } else tempsAnteriores = [];
        }
        actuales.sort((a,b)=>a-b);
      }
      guardado[seasonNumber] = actuales;
      window.episodiosVistosGuardado = guardado;
      renderEpisodiosDeTemporada(seasonNumber);
      actualizarContadorTemporadaUI(seasonNumber);
      tempsAnteriores.forEach(se=>{ actualizarContadorTemporadaUI(se.season_number); if(window.episodiosCache?.[se.season_number]) renderEpisodiosDeTemporada(se.season_number); });
      renderProgresoTemporadas();
      const patchEp = patchEpisodiosConVistoAuto(guardado);
      const temp = (window.temporadasSeriesActual||[]).find(se=>se.season_number===seasonNumber);
      if(idx<0 && !patchEp.visto && temp && actuales.length>=temp.episode_count) _celebrar(`✅ Temporada ${seasonNumber} completada`, false);
      await upsertBiblioteca(patchEp);
    }




    // ── SIMILARES — primero recomendaciones nativas TMDB, luego búsqueda manual ──
    async function cargarSimilares(item){
      const div=document.getElementById('d-similares');
      try{
        // 1. Intentar recomendaciones nativas de TMDB
        const recUrl=`${TMDB_PROXY}?path=/${item._tipo}/${item.id}/recommendations&language=es-ES&page=1`;
        const recData=await(await fetch(recUrl)).json();
        if(peliculaActual!==item)return;
        const vistosSim=window.idsVistosSet||new Set();
        const todosRec=(recData.results||[]).filter(s=>s.poster_path && !esOculta(s.id,item._tipo));
        const sinVer=todosRec.filter(s=>!vistosSim.has(`${s.id}-${item._tipo}`));
        const recomendados=(sinVer.length>=4?sinVer:todosRec).slice(0,20);

        if(recomendados.length>=4){
          // Suficientes recomendaciones nativas — usarlas directamente
          window.similaresActuales=recomendados.map(s=>({...s,_tipo:item._tipo,title:s.title||s.name,release_date:s.release_date||s.first_air_date}));
          _simIniciar(item, window.similaresActuales, div, true);
          return;
        }

        // 2. Fallback: búsqueda manual por géneros
        const det=await(await fetch(`${TMDB_PROXY}?path=/${item._tipo}/${item.id}&language=es-ES`)).json();
        const gOrig=(det.genres||[]).map(g=>g.id);const esAnim=gOrig.includes(16);
        const fecha=det.release_date||det.first_air_date||'';const ano=fecha?parseInt(fecha.substring(0,4)):2000;
        const gStr=gOrig.slice(0,2).join(',');
        const idsVistos=new Set([item,...recomendados].map(r=>`${item._tipo}-${r.id}`));
        const similares=[...recomendados.map(s=>({...s,_tipo:item._tipo,title:s.title||s.name,release_date:s.release_date||s.first_air_date}))];
        const tipos=item._tipo==='movie'?['movie','tv']:['tv','movie'];
        // todas las páginas a la vez; se procesan en el orden de siempre (tipo, página)
        const pedidas=tipos.flatMap(t=>[1,2,3,4].map(p=>({t,p})));
        const respuestas=await Promise.all(pedidas.map(async({t,p})=>{
          const campo=t==='movie'?'primary_release_date':'first_air_date';
          try{
            let url=`${TMDB_PROXY}?path=/discover/${t}&language=es-ES&sort_by=vote_average.desc&vote_count.gte=100&vote_average.gte=6.5&with_genres=${gStr}&${campo}.gte=${Math.max(1990,ano-15)}-01-01&${campo}.lte=${Math.min(ANIO_ACTUAL,ano+15)}-12-31&page=${p}`;
            if(!esAnim)url+=`&without_genres=16${t==='tv'?',10762':''}`;else if(t==='tv')url+=`&without_genres=10762`;
            return (await(await fetch(url)).json()).results||[];
          }catch(e){return [];}
        }));
        respuestas.forEach((res,k)=>{const t=pedidas[k].t;
          res.filter(s=>s.poster_path&&!idsVistos.has(`${t}-${s.id}`)).forEach(s=>{idsVistos.add(`${t}-${s.id}`);similares.push({...s,_tipo:t,title:s.title||s.name,release_date:s.release_date||s.first_air_date});});
        });
        if(peliculaActual!==item)return;
        window.similaresActuales=similares.sort((a,b)=>(b.vote_average||0)-(a.vote_average||0)).slice(0,60);
        _simIniciar(item, window.similaresActuales, div, false);
      }catch(e){if(peliculaActual!==item)return;div.innerHTML='<span style="color:var(--k-767973);font-size:13px">No se pudo cargar.</span>';}
    }
