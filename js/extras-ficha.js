// CineMood · Maratón, estado de la serie, resumen, remakes y versiones
// (Parte de index.html; se carga como script clásico: todo comparte el mismo ámbito global.)

    // ══ ESPECIALES: «Tu maratón» (el especial que llevas a medias y cuál toca ahora) y la sección dentro de Descubre ══
    function _espItemVisto(it){
      const vistosSet = window.vistosNormSet || new Set(), idsSet = window.idsVistosSet || new Set();
      const r = it.tmdb_id ? {id:it.tmdb_id, tipo:it.tipo} : (window.especialIdsResueltos||{})[_claveIdResuelto(it)];
      return (r && idsSet.size) ? idsSet.has(`${r.id}-${r.tipo}`) : vistosSet.has(`${normalizarTitulo(it.t)}|${it.tipo}`);
    }
    // Ruta del especial: la que elegiste, o deducida (si hasta donde vas te has saltado todas las opcionales, vas «sin opcionales»)
    function _espRuta(e){
      const g = _espRutaGuardada(e.id); if(g) return g;
      if(!e.items.some(x=>x.imp)) return 'todo';
      const vistos = e.items.map(_espItemVisto), ult = vistos.lastIndexOf(true); if(ult<0) return 'todo';
      const antes = e.items.slice(0, ult+1).map((x,i)=>({x, v:vistos[i]}));
      const opc = antes.filter(o=>o.x.imp==='o'), noClave = antes.filter(o=>o.x.imp==='i');
      if(opc.length>=2 && !opc.some(o=>o.v)) return noClave.length>=2 && !noClave.some(o=>o.v) ? 'clave' : 'esencial';
      return 'todo';
    }
    function _espItemsRuta(e){ const r = _espRuta(e); return e.items.filter(x=>r==='todo' || (r==='esencial' && x.imp!=='o') || (r==='clave' && x.imp==='c')); }
    function _espSiguiente(e){
      const items = _espItemsRuta(e), vistos = items.map(_espItemVisto), ult = vistos.lastIndexOf(true);
      let i = vistos.indexOf(false, ult+1); if(i<0) i = vistos.indexOf(false); // si ya vas por el final, el primer hueco que te quede
      return i<0 ? null : {it:items[i], pos:e.items.indexOf(items[i])+1};
    }
    async function _espPintarMaraton(e, caja){
      if(!caja || !e) return;
      const ruta = _espRuta(e), items = _espItemsRuta(e), total = items.length, vistas = items.filter(_espItemVisto).length, sig = _espSiguiente(e), pct = Math.round(vistas/total*100);
      const it = sig && sig.it, r = it ? (it.tmdb_id ? {id:it.tmdb_id, tipo:it.tipo} : (window.especialIdsResueltos||{})[_claveIdResuelto(it)]) : null;
      window._espMaraton = {e, it, r};
      caja.innerHTML = `<div class="esp-maraton" style="--esp-c:${e.color||'var(--acento)'}" onclick="abrirEspecial('${e.id}')"><div class="in">
          <div class="k">${e.emoji} Tu maratón</div>
          <div class="t">${_escHtml(e.titulo)}</div>
          <div class="barra"><i style="width:${pct}%"></i></div>
          <div class="cuenta">${vistas} de ${total} vistas${ruta==='esencial' ? ' · ruta sin opcionales' : ruta==='clave' ? ' · solo claves' : ''} · te ${total-vistas===1?'queda 1':`quedan ${total-vistas}`}</div>
          ${it ? `<div class="sig">Te toca: <b>${_escHtml(it.t)}</b>${it.y ? ` (${it.y})` : ''}<small>${[`Nº ${sig.pos} del especial`, it.tag || it.era || '', it.tipo==='tv'?'Serie':'Película'].filter(Boolean).map(_escHtml).join(' · ')}</small></div>` : '<div class="sig">¡Lo has visto todo! 🏆</div>'}
          <div class="noche-b">${it ? `<button type="button" class="noche-btn principal" onclick="event.stopPropagation();espVerSiguiente()">▶ Ver la siguiente</button>` : ''}<button type="button" class="noche-btn" onclick="event.stopPropagation();abrirEspecial('${e.id}')">Abrir el especial ›</button></div>
        </div></div>`;
      // de fondo, la imagen de la que te toca (o la del especial)
      try{
        let ruta = null;
        if(r){ const d = await _tmdbJson(`/${r.tipo}/${r.id}&language=es-ES`); ruta = d.backdrop_path; }
        if(!ruta) ruta = await _resolverImagenHeroEspecial(e);
        const m = caja.querySelector('.esp-maraton'); if(ruta && m) m.style.backgroundImage = `url(https://image.tmdb.org/t/p/w1280${ruta})`;
      }catch(err){}
    }
    function espVerSiguiente(){
      const x = window._espMaraton; if(!x || !x.it) return;
      if(x.r) abrirDetalle({id:x.r.id, _tipo:x.r.tipo, title:x.it.t, release_date:x.it.f || (x.it.y ? x.it.y+'-01-01' : '')});
      else abrirEspecial(x.e.id);
    }
    // Marvel y tus colecciones, en una fila arriba de Mi lista
    function _pintarEspecialesMiLista(){
      const box = document.getElementById('ml-especiales'); if(!box) return;
      if(!sesionActual){ box.innerHTML = ''; return; }
      const cont = window._espContarVistos || (()=>0);
      const cols = (window.misColecciones||[]).map(col=>_espDesdeColeccion('col-'+col.id)).filter(Boolean);
      const lista = [...ESPECIALES.filter(_espVisible), ...cols];
      const tile = e => { const v = cont(e), n = e.items.length; return `<div class="especial-tile" data-esp-id="${e.id}" onclick="abrirEspecial('${e.id}')" style="--esp-c:${e.color||'var(--acento)'};--esp-bg:${e.colorBg||'#1b1d1c'}"><span class="especial-tile-emoji">${e.emoji||'📋'}</span><div class="especial-tile-titulo">${_escHtml(e.titulo)}</div><div class="especial-tile-sub">${v ? `${v} de ${n} vistas` : `${n} títulos`}</div>${v ? `<div class="especial-progreso-bar"><div class="especial-progreso-fill" style="width:${Math.round(v/n*100)}%;background:${e.color||'#b52c29'}"></div></div>` : ''}</div>`; };
      box.innerHTML = `<div class="esp-sec-cab" style="margin:6px 0 8px"><div class="section-label" style="margin:0">Maratones y colecciones</div><button type="button" class="d-saga-link" onclick="irA('p-especiales-hub'); renderEspecialesTiles();">Ver todo ›</button></div>
        <div class="especiales-scroll">${lista.map(tile).join('')}<div class="especial-tile col-nueva-tile" onclick="abrirColOverlay('crear')"><span class="especial-tile-emoji">＋</span><div class="especial-tile-titulo">Nueva colección</div><div class="especial-tile-sub">Tu propia lista</div></div></div>`;
      _resolverImagenesHeroEspeciales();
    }
    // Inicio: tu maratón en pequeño, para seguir por donde ibas
    function cargarMaratonInicio(){
      const box = document.getElementById('inicio-maraton'); if(!box) return;
      if(!sesionActual){ box.innerHTML = ''; return; }
      // solo un maratón que de verdad llevas empezado (con 0 vistas no es «tu» maratón)
      const e = calcularEnCurso(window._espContarVistos || (()=>0)).find(x=>_espItemsRuta(x).some(_espItemVisto));
      if(!e){ box.innerHTML = ''; return; }
      const items = _espItemsRuta(e), vistas = items.filter(_espItemVisto).length, sig = _espSiguiente(e);
      if(!sig){ box.innerHTML = ''; return; }
      const it = sig.it, r = it.tmdb_id ? {id:it.tmdb_id, tipo:it.tipo} : (window.especialIdsResueltos||{})[_claveIdResuelto(it)];
      window._espMaraton = {e, it, r};
      box.innerHTML = `<div class="maraton-mini" style="--esp-c:${e.color||'var(--acento)'}" onclick="abrirEspecial('${e.id}')">
          <span class="maraton-mini-ic">${e.emoji}</span>
          <div class="maraton-mini-t"><span>Tu maratón · ${_escHtml(e.titulo.replace(/\s*\(.*?\)\s*/g,' ').replace(/^Universo\s+/i,'').trim())} · ${vistas} de ${items.length}</span><b>Te toca: ${_escHtml(it.t)}</b><i style="--p:${Math.round(vistas/items.length*100)}%"></i></div>
          <button type="button" class="maraton-mini-play" onclick="event.stopPropagation();espVerSiguiente()" aria-label="Ver la siguiente">▶</button>
        </div>`;
    }
    // ══ ESTADO DE LA SERIE: renovada, terminada (con final) o cancelada (puede quedarse sin final) ══
    function _pintarEstadoSerie(d, tipo, p){
      const el = document.getElementById('d-estado-serie'); if(!el) return;
      if(tipo!=='tv' || !d || peliculaActual!==p){ el.style.display = 'none'; return; }
      const n = d.number_of_seasons || 0, temps = `${n} ${n===1?'temporada':'temporadas'}`, prox = d.next_episode_to_air;
      const fecha = f => new Date(f+'T12:00:00').toLocaleDateString('es-ES', {day:'numeric', month:'long', year:'numeric'});
      let t = '';
      if(d.status==='Canceled') t = `❌ <b>Cancelada</b> tras ${temps}: puede quedarse sin final.`;
      else if(d.status==='Ended') t = `🏁 <b>Terminada</b> · ${temps}, con su final.`;
      else if(d.status==='Returning Series') t = prox ? `✅ <b>Renovada</b> · ${prox.episode_number===1 ? `la temporada ${prox.season_number} empieza` : 'próximo episodio'} el ${fecha(prox.air_date)}.` : `✅ <b>Renovada</b> · esperando fecha de la próxima temporada.`;
      else if(d.status==='In Production') t = `🎬 <b>En producción</b>${prox ? ` · estreno el ${fecha(prox.air_date)}` : ''}.`;
      else if(d.status==='Planned' || d.status==='Pilot') t = `📅 <b>Anunciada</b>, todavía sin estrenar.`;
      if(!t){ el.style.display = 'none'; return; }
      el.innerHTML = t; el.style.display = 'block';
    }

    // ══ LO QUE PASÓ HASTA AHORA: resumen hasta el último episodio que marcaste (plegado, por los spoilers) ══
    function _pintarRecap(){
      const box = document.getElementById('d-recap'), p = peliculaActual; if(!box) return;
      const g = window.episodiosVistosGuardado || {};
      const temps = Object.keys(g).map(Number).filter(t=>t>0 && (g[t]||[]).length).sort((a,b)=>a-b);
      if(!p || p._tipo!=='tv' || !sesionActual || !temps.length){ box.style.display = 'none'; box.innerHTML = ''; return; }
      const t = temps[temps.length-1], e = Math.max(...g[t].map(Number));
      window._recap = {p, t, e};
      box.innerHTML = `<button type="button" class="recap-btn" onclick="abrirRecap(this)">📖 Lo que pasó hasta ahora <small style="font-weight:600;color:var(--k-767973)">· hasta T${t}·E${e}</small><span>Ver ▾</span></button><div id="recap-txt"></div>`;
      box.style.display = 'block';
    }
    async function abrirRecap(btn){
      const r = window._recap, txt = document.getElementById('recap-txt'); if(!r || !txt) return;
      if(txt.innerHTML){ txt.innerHTML = ''; btn.querySelector('span').textContent = 'Ver ▾'; return; }
      btn.querySelector('span').textContent = 'Ocultar ▴';
      txt.innerHTML = '<div class="recap-txt">Cargando…</div>';
      const temporada = async (n, idioma) => _tmdbJson(`/tv/${r.p.id}/season/${n}&language=${idioma}`).catch(()=>({}));
      try{
        let [es, ant] = await Promise.all([temporada(r.t, 'es-ES'), r.t>1 ? temporada(r.t-1, 'es-ES') : Promise.resolve(null)]);
        let eps = (es.episodes||[]).filter(x=>x.episode_number<=r.e), ingles = false;
        // si en español faltan resúmenes de los episodios, se usan los de inglés
        if(eps.length && eps.slice(-4).every(x=>!x.overview)){ const en = await temporada(r.t, 'en-US'); const m = {}; (en.episodes||[]).forEach(x=>{ m[x.episode_number] = x.overview; }); eps = eps.map(x=>({...x, overview: x.overview || m[x.episode_number] || ''})); ingles = true; }
        if(peliculaActual!==r.p) return;
        const ultimos = eps.slice(-4).filter(x=>x.overview);
        const html = [
          ant && ant.overview ? `<h4>Temporada ${r.t-1}</h4><p>${_escHtml(ant.overview)}</p>` : '',
          es.overview ? `<h4>Temporada ${r.t}</h4><p>${_escHtml(es.overview)}</p>` : '',
          ultimos.length ? `<h4>Tus últimos episodios</h4>${ultimos.map(x=>`<p><b>E${x.episode_number} · ${_escHtml(x.name||'')}</b><br>${_escHtml(x.overview)}</p>`).join('')}` : ''
        ].join('');
        txt.innerHTML = html ? `<div class="recap-txt">${html}<div class="recap-aviso">Solo hasta el último episodio que marcaste${ingles ? ' · algunos resúmenes, en inglés' : ''}. Resúmenes de TMDB.</div></div>` : '<div class="recap-txt">No hay resúmenes de esta temporada todavía.</div>';
      }catch(e){ txt.innerHTML = '<div class="recap-txt">No se pudo cargar el resumen.</div>'; }
    }

    // ══ REMAKES Y VERSIONES (Wikidata): original, remakes y otras versiones de la misma historia ══

    // ══ ¿QUÉ VERSIÓN VER? Montajes del director, ediciones extendidas y cortes alternativos ══
    // Guía propia para las conocidas; para el resto se mira si la Wikipedia tiene un apartado de versiones.
    // v: [nombre, año, duración aprox. en min (0 = sin dato), en qué cambia]; r: índice de la recomendada; ir: otra ficha relacionada
    const _BN = (titulo, anio, nombre) => ({r:0, por:`Primero en color, como se estrenó. La versión en blanco y negro es para una segunda vez: el propio director la considera su favorita y cambia mucho la sensación.`,
      v:[['Estreno en color', anio, 0, 'La versión de cines.'], [nombre, anio+1, 0, 'La misma película en blanco y negro, con la imagen reajustada plano a plano.']]});
    const _ESDLA = (a,b,extra) => ({r:1, por:'Si ya la has visto o te encanta la saga, la extendida sin dudarlo: no alarga por alargar, añade personajes y escenas que dan sentido a cosas de las siguientes. Para una primera vez con prisa, la de cines también es redonda.',
      v:[['Versión de cines', 0, a, 'La que se estrenó.'], ['Versión extendida', 0, b, extra]]});
    const _HOBBIT = (a,b,extra) => ({r:0, por:'La de cines, salvo que te haya encantado: la extendida añade más de lo mismo y la hace más lenta.',
      v:[['Versión de cines', 0, a, 'La que se estrenó.'], ['Versión extendida', 0, b, extra]]});
    const _MONT_SECCION = /(\bmontajes?\s+(del director|alternativ|extendid|original)|\bversi[oó]n(es)?\s+(alternativ|extendid|del director|sin cortes|de cines|restaurad)|\bedici[oó]n(es)?\s+(extendid|especial|del director)|\bdirector'?s cut|\bextended (edition|cut|version)|\b(alternate|alternative) (versions?|endings?|cuts?)|^(versions|cuts)$|\btheatrical (and|vs\.?)|\bfinal cut\b|\brestorations?\b|\brestauraci[oó]n(es)?\b)/i;
    async function _montajesWiki(id){
      if(id in window._montajesCache) return window._montajesCache[id];
      let res = null;
      try{
        const f = await _wdSparql(`SELECT ?es ?en WHERE { ?f wdt:P4947 "${Number(id)}". OPTIONAL{ ?a schema:about ?f; schema:isPartOf <https://es.wikipedia.org/>; schema:name ?es. } OPTIONAL{ ?b schema:about ?f; schema:isPartOf <https://en.wikipedia.org/>; schema:name ?en. } } LIMIT 1`);
        const r = f[0] || {};
        for(const [lang, campo] of [['es','es'], ['en','en']]){
          const titulo = r[campo] && r[campo].value; if(!titulo) continue;
          const api = `https://${lang}.wikipedia.org/w/api.php?format=json&origin=*&action=parse&redirects=1&page=${encodeURIComponent(titulo)}`;
          const secs = ((await (await fetch(api+'&prop=sections')).json()).parse || {}).sections || [];
          const sec = secs.find(x=>_MONT_SECCION.test(String(x.line||'').replace(/<[^>]+>/g,'').trim()));
          if(!sec) continue;
          const html = ((await (await fetch(api+'&prop=text&section='+sec.index)).json()).parse || {}).text;
          const div = document.createElement('div'); div.innerHTML = (html && html['*']) || '';
          div.querySelectorAll('sup, style, table, .mw-editsection, .hatnote, .reference, figure, .thumb').forEach(e=>e.remove());
          const parrafos = [...div.querySelectorAll('p, li')].map(e=>e.textContent.replace(/\[[^\]]*\]/g,'').replace(/\s+/g,' ').trim()).filter(t=>t.length>40);
          if(!parrafos.length) continue;
          let txt = ''; for(const p of parrafos){ if(txt.length>420) break; txt += (txt?' ':'') + p; }
          if(txt.length>560) txt = txt.slice(0, 540).replace(/\s+\S*$/,'') + '…';
          res = {lang, txt, titulo:String(sec.line||'').replace(/<[^>]+>/g,''), url:`https://${lang}.wikipedia.org/wiki/${encodeURIComponent(titulo.replace(/ /g,'_'))}#${encodeURIComponent(String(sec.anchor||''))}`};
          break;
        }
      }catch(e){ return null; } // si falla la red no se guarda, se reintenta otro día
      window._montajesCache[id] = res;
      return res;
    }
    const _minFmt = m => m ? (m>=60 ? `${Math.floor(m/60)} h ${String(m%60).padStart(2,'0')} min` : `${m} min`) : '';
    async function _pintarMontajes(p){
      const box = document.getElementById('d-montajes-box'); if(!box || !p) return;
      const g = MONTAJES[Number(p.id)];
      if(g){
        const rec = g.v[g.r];
        const filas = g.v.map((v,i)=>`<div class="mont-v"><b>${_escHtml(v[0])}${i===g.r?'<span class="mont-tag">👉 La buena</span>':''}</b><small>${[v[1]||'', _minFmt(v[2])].filter(Boolean).join(' · ')}</small><div>${_escHtml(v[3])}</div></div>`).join('');
        box.innerHTML = `<div class="detalle-box-label">¿Qué versión ver?</div>
          <div class="mont-chip">👉 ${_escHtml(rec[0])}${rec[2] ? ' · '+_minFmt(rec[2]) : ''}</div>
          <div class="mont-rec">${_escHtml(g.por)}</div>
          ${g.ir ? `<button type="button" class="mont-ir" onclick="_montIr(${g.ir})">${_escHtml(g.irTxt||'Ver ficha')} ›</button>` : ''}
          <div class="mont-lista"><button type="button" class="recap-btn" onclick="const l=this.nextElementSibling; const ab=l.style.display!=='none'; l.style.display=ab?'none':'block'; this.querySelector('span').textContent=ab?'Ver':'Ocultar';">Las ${g.v.length} versiones <span>Ver</span></button><div style="display:none">${filas}</div></div>`;
        box.style.display = 'block';
        return;
      }
      const w = await _montajesWiki(p.id);
      if(peliculaActual!==p || !w) return;
      box.innerHTML = `<div class="detalle-box-label">¿Qué versión ver?</div>
        <div class="mont-rec"><b>Esta película tiene más de una versión</b> (montaje del director, edición extendida o cortes distintos). Antes de darle al play, échale un ojo.</div>
        <div class="mont-lista"><button type="button" class="recap-btn" onclick="const l=this.nextElementSibling; const ab=l.style.display!=='none'; l.style.display=ab?'none':'block'; this.querySelector('span').textContent=ab?'Ver':'Ocultar';">Lo que cuenta la Wikipedia${w.lang==='en' ? ' (en inglés)' : ''} <span>Ver</span></button><div style="display:none"><div class="recap-txt"><h4>${_escHtml(w.titulo)}</h4><p>${_escHtml(w.txt)}</p></div>
        <div class="mont-fuente"><a href="${w.url}" target="_blank" rel="noopener">Leer completo en Wikipedia ›</a></div></div></div>`;
      box.style.display = 'block';
    }
    async function _montIr(id){
      try{ const pak = await _fetchDetalleYCreditos('movie', id), d = pak && pak.detalle; if(d && d.id) abrirDetalle({...d, _tipo:'movie'}); }catch(e){}
    }
    async function _pintarVersiones(p){
      const box = document.getElementById('d-versiones-box'); if(!box || !p || p._tipo!=='movie') return;
      try{
        // cada rama ya exige que la otra película tenga id de TMDB (así Wikidata no recorre todo lo basado en un libro famoso)
        const filas = await _wdSparql(`SELECT DISTINCT ?tmdb ?rel WHERE {
          ?f wdt:P4947 "${Number(p.id)}".
          { ?f wdt:P144 ?x. ?x wdt:P4947 ?tmdb. BIND("original" AS ?rel) } UNION { ?x wdt:P4969 ?f. ?x wdt:P4947 ?tmdb. BIND("original" AS ?rel) }
          UNION { ?x wdt:P144 ?f. ?x wdt:P4947 ?tmdb. BIND("remake" AS ?rel) } UNION { ?f wdt:P4969 ?x. ?x wdt:P4947 ?tmdb. BIND("remake" AS ?rel) }
          UNION { ?f wdt:P144 ?o. ?x wdt:P144 ?o. ?x wdt:P4947 ?tmdb. FILTER(?x != ?f) BIND("version" AS ?rel) }
          } LIMIT 12`);
        if(peliculaActual!==p) return;
        const vistosIds = new Set(), lista = [];
        filas.forEach(f=>{ const id = Number(f.tmdb.value); if(!id || id===Number(p.id) || vistosIds.has(id)) return; vistosIds.add(id); lista.push({id, rel:f.rel.value}); });
        if(!lista.length) return;
        await _modeloNotaObtener().catch(()=>null);
        const datos = (await _fetchEnLotes(lista.slice(0,8), async x=>{
          try{
            const pak = await _fetchDetalleYCreditos('movie', x.id), d = pak && pak.detalle; if(!d || !d.id) return null;
            if(!_infoCompleta('movie', x.id)) _piGuardar('movie', x.id, _infoDesdePak('movie', pak));
            return {...x, title:d.title, poster_path:d.poster_path, release_date:d.release_date||'', vote_average:d.vote_average, _tipo:'movie'};
          }catch(e){ return null; }
        }, 4)).filter(Boolean).sort((a,b)=>({original:0, remake:2, version:1})[a.rel]-({original:0, remake:2, version:1})[b.rel] || (a.release_date||'').localeCompare(b.release_date||''));
        if(peliculaActual!==p || !datos.length) return;
        window._versiones = datos;
        const etq = {original:'🎞️ Original', remake:'🔁 Remake', version:'🔀 Otra versión'}, vistos = window.idsVistosSet || new Set();
        box.innerHTML = `<div class="detalle-box-label">Versiones de esta historia</div>${datos.map((x,i)=>{ const v = vistos.has(`${x.id}-movie`), nota = v ? null : _notaExacta(x);
          return `<div class="vers-fila" onclick="abrirDetalle(_versiones[${i}])"><img loading="lazy" src="https://image.tmdb.org/t/p/w154${x.poster_path||''}" alt=""><div class="i"><div class="k">${etq[x.rel]}</div><b>${_escHtml(x.title)}</b><small>${[(x.release_date||'').slice(0,4), x.vote_average ? '★ '+x.vote_average.toFixed(1) : '', v ? '✓ Vista' : nota!=null ? '🔮 '+_notaFmt(nota) : ''].filter(Boolean).join(' · ')}</small></div></div>`; }).join('')}`;
        box.style.display = 'block';
      }catch(e){}
    }
