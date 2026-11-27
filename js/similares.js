// CineMood · Similares con filtros y listas relacionadas
// (Parte de index.html; se carga como script clásico: todo comparte el mismo ámbito global.)

    // ══ SIMILARES CON FILTROS: «como esta, pero…» (más cortas, en tus plataformas, recientes, mejor valoradas, para ti) ══
    const SIM_FILTROS = [['corta','⏱️ Menos de 1 h 45'],['plat','📺 En mis plataformas'],['reciente','🆕 Recientes'],['valorada','⭐ Mejor valoradas'],['parati','🔮 Para ti']];
    async function _simIniciar(item, base, div, ampliar){
      window._simItem = item; window._simPool = base.slice();
      _simPintarChips(); _simAplicar();
      if(!ampliar) return;
      // más candidatas para que al filtrar quede donde elegir: 2.ª página de recomendaciones y las «similares» de TMDB
      try{
        const [r2, sim] = await Promise.all([_tmdbJson(`/${item._tipo}/${item.id}/recommendations&language=es-ES&page=2`).catch(()=>({})), _tmdbJson(`/${item._tipo}/${item.id}/similar&language=es-ES&page=1`).catch(()=>({}))]);
        if(peliculaActual!==item) return;
        const vistos = window.idsVistosSet || new Set(), ya = new Set(window._simPool.map(x=>`${x.id}-${x._tipo}`));
        [...(r2.results||[]), ...(sim.results||[])].forEach(s=>{ const k = `${s.id}-${item._tipo}`; if(!s.poster_path || ya.has(k) || vistos.has(k) || esOculta(s.id, item._tipo)) return; ya.add(k); window._simPool.push({...s, _tipo:item._tipo, title:s.title||s.name, release_date:s.release_date||s.first_air_date}); });
        if(window._simFiltros.size) _simAplicar();
      }catch(e){}
    }
    function _simPintarChips(){
      const box = document.getElementById('d-sim-filtros'); if(!box) return;
      box.innerHTML = SIM_FILTROS.map(([k,t])=>`<button type="button" class="noche-chip${window._simFiltros.has(k)?' activo':''}" onclick="simFiltro('${k}')" aria-pressed="${window._simFiltros.has(k)}">${t}</button>`).join('');
    }
    function simFiltro(k){ const f = window._simFiltros; if(f.has(k)) f.delete(k); else f.add(k); _simPintarChips(); _simAplicar(); }
    const _simMisPlats = () => { const o = _nocheOpts(); const nom = {}; DESC_PLATAFORMAS.forEach(([id,n])=>{ if(id) nom[id] = n; }); return o.plats.length ? o.plats : DESC_PLATAFORMAS.map(([id])=>id).filter(Boolean); };
    async function _simAplicar(){
      const item = window._simItem, div = document.getElementById('d-similares'), f = window._simFiltros, turno = (window._simTurno = (window._simTurno||0)+1);
      if(!item || !div) return;
      let lista = (window._simPool||[]).slice();
      if(f.size){
        // lo que hace falta saber de cada candidata se pide solo al activar el filtro (y se guarda)
        const necesitaInfo = f.has('corta') || f.has('parati'), necesitaProv = f.has('plat');
        if(necesitaInfo || necesitaProv){
          div.innerHTML = '<span style="color:var(--k-767973);font-size:13px">Comprobando…</span>';
          if(necesitaInfo) await _modeloNotaObtener().catch(()=>null);
          await _fetchEnLotes(lista, async x=>{
            if(necesitaInfo && !_infoCompleta(x._tipo, x.id)){ try{ _piGuardar(x._tipo, x.id, _infoDesdePak(x._tipo, await _fetchDetalleYCreditos(x._tipo, x.id))); }catch(e){} }
            const kp = `${x._tipo}:${x.id}`;
            if(necesitaProv && !window._simProv.has(kp)){ try{ const pv = await _tmdbJson(`/${x._tipo}/${x.id}/watch/providers`); window._simProv.set(kp, (((pv.results||{}).ES||{}).flatrate||[]).map(p=>String(p.provider_id))); }catch(e){ window._simProv.set(kp, []); } }
          }, 6);
          if(turno!==window._simTurno || peliculaActual!==item) return;
        }
        const anio = new Date().getFullYear(), plats = _simMisPlats();
        if(f.has('corta')) lista = lista.filter(x=>{ const r = _infoCompleta(x._tipo, x.id)?.r; return x._tipo==='movie' && r && r < 105; });
        if(f.has('plat')) lista = lista.filter(x=>(window._simProv.get(`${x._tipo}:${x.id}`)||[]).some(id=>plats.includes(id)));
        if(f.has('reciente')) lista = lista.filter(x=>Number((x.release_date||'').slice(0,4)) >= anio-10);
        if(f.has('valorada')) lista = lista.filter(x=>(x.vote_average||0) >= 7.2 && (x.vote_count||0) >= 300);
        if(f.has('parati')) lista = lista.map((x,i)=>({x, i, v:_notaExacta(x)})).sort((a,b)=>((b.v??-1)-(a.v??-1)) || a.i-b.i).map(o=>o.x);
        else lista.sort((a,b)=>(b.vote_average||0)-(a.vote_average||0));
      }
      lista = lista.slice(0, 20);
      window.similaresActuales = lista;
      if(!lista.length){ div.innerHTML = `<span style="color:var(--k-767973);font-size:13px">Ninguna cumple todos esos filtros. Prueba a quitar alguno.</span>`; return; }
      mostrarSimilares(lista, div);
    }
    function mostrarSimilares(items,div){
      div.innerHTML=items.length
        ?items.map((s,i)=>`<div class="similar-card" onclick="abrirDetalle(similaresActuales[${i}])" ${_lp({id:s.id,tipo:s._tipo,t:s.title,poster:s.poster_path,f:s.release_date})}><img loading="lazy" src="https://image.tmdb.org/t/p/w200${s.poster_path}" alt="${_escHtml(s.title)}"><div class="similar-titulo">${_escHtml(s.title)}</div><div class="similar-meta">${s.release_date?s.release_date.substring(0,4):''} · ★${s.vote_average?s.vote_average.toFixed(1):'-'}${(()=>{ const v = sesionActual && !(window.idsVistosSet||new Set()).has(`${s.id}-${s._tipo}`) ? _notaExacta(s) : null; return v==null ? '' : ` · <b class="prev-txt">🔮 ${_notaFmt(v)}</b>`; })()}</div></div>`).join('')
        :'<span style="color:var(--k-767973);font-size:13px">No encontramos títulos similares.</span>';
    }
    async function _elegirTrailer(tipo, id){
      const k = `${tipo}:${id}`;
      if(k in window._trailerCache) return window._trailerCache[k];
      const d = await _tmdbJson(`/${tipo}/${id}/videos&language=es-ES&include_video_language=es,en`);
      if(!Array.isArray(d.results)) throw new Error('Respuesta de TMDB no válida');
      (window._videosCache = window._videosCache || {})[k] = d.results;
      const puntos = v => (v.iso_639_1==='es' ? 100 : 0) + (v.iso_3166_1==='ES' ? 20 : 0) + (v.type==='Trailer' ? 10 : 0) + (v.official ? 5 : 0);
      const v = (d.results||[])
        .filter(v=>v.site==='YouTube' && (v.iso_639_1==='es' || v.iso_639_1==='en') && (v.type==='Trailer' || v.type==='Teaser'))
        .sort((a,b)=>puntos(b)-puntos(a) || (b.published_at||'').localeCompare(a.published_at||''))[0];
      return window._trailerCache[k] = v ? {key:v.key, idioma:v.iso_639_1} : null;
    }
    // Si YouTube no deja reproducirlo aquí (archivo abierto en el ordenador o vídeo bloqueado fuera de YouTube), un acceso claro
    function _ytAlternativa(key, motivo){
      return `<a class="yt-fallo" href="https://www.youtube.com/watch?v=${encodeURIComponent(key)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">
        <img src="https://img.youtube.com/vi/${encodeURIComponent(key)}/hqdefault.jpg" alt=""><span class="yt-fallo-c"><b>▶ Ver en YouTube</b><small>${motivo}</small></span></a>`;
    }
    function _ytEscuchar(f){ try{ f.contentWindow.postMessage(JSON.stringify({event:'listening', id:1, channel:'widget'}), '*'); }catch(e){} }
    function _iframeTrailer(t, opc={}){
      if(!/^https?:$/.test(location.protocol)) return _ytAlternativa(t.key, 'Para verlo aquí, abre CineMood desde su web y no como archivo');
      const p = new URLSearchParams({playsinline:'1', rel:'0', modestbranding:'1', hl:'es', enablejsapi:'1'});
      if(location.origin.startsWith('http')) p.set('origin', location.origin);
      if(opc.autoplay) p.set('autoplay','1');
      if(opc.mute) p.set('mute','1');
      if(t.idioma!=='es'){ p.set('cc_load_policy','1'); p.set('cc_lang_pref','es'); }
      return `<iframe data-yt="${_escHtml(t.key)}" onload="_ytEscuchar(this)" src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(t.key)}?${p}" title="Tráiler" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin" style="position:absolute;inset:0;width:100%;height:100%;border:0"></iframe>`;
    }
    function _textoIdiomaTrailer(t){ return t.idioma==='es' ? 'En español' : 'En inglés · subtítulos activados'; }
    async function cargarTrailer(id,tipo){
      const div=document.getElementById('d-trailer-content');
      const p=peliculaActual;
      try{
        const t = await _elegirTrailer(tipo,id);
        if(peliculaActual!==p)return;
        if(!t){div.innerHTML='<span class="no-trailer">No hay tráiler en español ni en inglés.</span>';return;}
        window._trailerFicha = t;
        _pintarMasVideos(tipo, id, t, p);
        div.innerHTML=`<div class="trailer-thumb" role="button" tabindex="0" aria-label="Reproducir tráiler" onclick="reproducirTrailerFicha(this)"><img loading="lazy" src="https://img.youtube.com/vi/${encodeURIComponent(t.key)}/hqdefault.jpg" alt="Tráiler"><div class="trailer-play"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></div><span class="trailer-lang-badge">${_textoIdiomaTrailer(t)}</span></div>
          <a class="trailer-abrir" href="https://www.youtube.com/watch?v=${encodeURIComponent(t.key)}" target="_blank" rel="noopener">Abrir en YouTube ↗</a>`;
      }catch(e){if(peliculaActual!==p)return;div.innerHTML='<span class="no-trailer">No se pudo cargar el tráiler.</span>';}
    }
    // Más vídeos de TMDB (escenas, making of, avances…), en español primero; se ven dentro de la app
    const _TIPO_VIDEO = {Clip:'Escena', 'Behind the Scenes':'Making of', Featurette:'Reportaje', Bloopers:'Tomas falsas', Teaser:'Avance', Trailer:'Tráiler', 'Opening Credits':'Créditos'};
    const _ORDEN_VIDEO = ['Clip','Behind the Scenes','Featurette','Bloopers','Teaser','Trailer','Opening Credits'];
    function _pintarMasVideos(tipo, id, principal, p){
      const box = document.getElementById('d-videos'); if(!box) return;
      box.innerHTML = '';
      const todos = ((window._videosCache||{})[`${tipo}:${id}`]||[]).filter(v=>v.site==='YouTube' && v.key && v.key!==principal?.key && _TIPO_VIDEO[v.type]);
      const vistos = new Set(), lista = todos.sort((a,b)=>(_ORDEN_VIDEO.indexOf(a.type)-_ORDEN_VIDEO.indexOf(b.type)) || ((b.iso_639_1==='es')-(a.iso_639_1==='es')) || (b.published_at||'').localeCompare(a.published_at||''))
        .filter(v=>!vistos.has(v.key) && vistos.add(v.key)).slice(0,16);
      if(peliculaActual!==p || !lista.length) return;
      window._videosFicha = lista.map(v=>({key:v.key, idioma:v.iso_639_1, tipo:_TIPO_VIDEO[v.type], nombre:v.name||''}));
      box.innerHTML = `<div class="videos-k">Más vídeos · ${lista.length}</div><div class="videos-tira">${window._videosFicha.map((v,i)=>`
        <button type="button" class="video-mini" onclick="abrirVideo(${i})"><span class="video-img"><img loading="lazy" src="https://img.youtube.com/vi/${encodeURIComponent(v.key)}/mqdefault.jpg" alt=""><span class="video-play">▶</span><span class="video-tipo">${v.tipo}${v.idioma==='es'?'':' · EN'}</span></span>
        <span class="video-n">${_escHtml(v.nombre)}</span></button>`).join('')}</div>`;
    }
    function abrirVideo(i){
      const v = (window._videosFicha||[])[i]; if(!v) return;
      let o = document.getElementById('video-visor');
      if(!o){ o = document.createElement('div'); o.id = 'video-visor'; o.className = 'video-visor'; o.setAttribute('role','dialog'); o.onclick = e=>{ if(e.target===o) cerrarVideo(); }; document.body.appendChild(o); }
      o.innerHTML = `<div class="video-caja"><div class="video-cab"><span><b>${_escHtml(v.tipo)}</b>${v.nombre ? ' · '+_escHtml(v.nombre) : ''}</span><button type="button" onclick="cerrarVideo()" aria-label="Cerrar">✕</button></div>
        <div class="video-marco">${_iframeTrailer(v, {autoplay:true})}</div>
        <div class="video-pie">${v.idioma==='es' ? 'En español' : 'En inglés · subtítulos si los hay'} · <a href="https://www.youtube.com/watch?v=${encodeURIComponent(v.key)}" target="_blank" rel="noopener">Abrir en YouTube ↗</a></div>
        ${window._videosFicha.length>1 ? `<div class="video-nav"><button type="button" ${i?'':'disabled'} onclick="abrirVideo(${i-1})">‹ Anterior</button><span>${i+1} / ${window._videosFicha.length}</span><button type="button" ${i<window._videosFicha.length-1?'':'disabled'} onclick="abrirVideo(${i+1})">Siguiente ›</button></div>` : ''}</div>`;
      o.style.display = 'flex'; document.body.style.overflow = 'hidden';
    }
    function cerrarVideo(){ const o = document.getElementById('video-visor'); if(o){ o.style.display = 'none'; o.innerHTML = ''; } document.body.style.overflow = ''; }
    function reproducirTrailerFicha(el){
      const t = window._trailerFicha; if(!t) return;
      el.onclick = null; el.removeAttribute('role');
      el.innerHTML = _iframeTrailer(t, {autoplay:true});
    }
    // ── FEED DE TRÁILERS: pantalla vertical, un tráiler por pantalla (cines, populares y estrenos en España) ──
    async function abrirFeedTrailers(){
      const ov = document.getElementById('feed-overlay'), lista = document.getElementById('feed-lista');
      ov.style.display = 'block'; document.body.style.overflow = 'hidden';
      _feedPintarSonido();
      if(window._feed && window._feed.slides.length){ _feedActivar(window._feed.actual); return; }
      lista.innerHTML = '<div class="feed-estado">Buscando tráilers…</div>';
      const turno = (window._feedTurno = (window._feedTurno||0)+1);
      try{
        const etiquetar = (lista, motivo) => (lista||[]).map(it=>({...it, _motivo:motivo}));
        const [cines, popular, estrenos, pPelis, pSeries, toda] = await Promise.all([
          _espCargarGenerado('cines-es', ()=>_espEnCines('ES')).catch(()=>[]),
          _espCargarGenerado('popular-es', ()=>_espPopular('ES')).catch(()=>[]),
          _espCargarGenerado('estrenos-mes', ()=>_espEstrenosMes()).catch(()=>[]),
          sesionActual ? _candidatosParaTi('movie', {nSemillas:8, maxPorSemilla:4, conHistorial:false}).catch(()=>[]) : [],
          sesionActual ? _candidatosParaTi('tv', {nSemillas:5, maxPorSemilla:4, conHistorial:false}).catch(()=>[]) : [],
          sesionActual ? sb.from('mi_biblioteca').select('tmdb_id,tipo').eq('user_id', sesionActual.user.id).then(r=>r.data||[]).catch(()=>[]) : []
        ]);
        if(turno!==window._feedTurno) return;
        const perfil = _cargarPerfilGustoCache();
        const gusto = it => _puntuarPorGustoEstable({genre_ids:it.g||[], release_date:it.f, vote_average:it.voto}, perfil) + Math.random()*0.15;
        // lo que ya tienes en tu lista (visto o pendiente) no sale
        const conocidos = new Set([...(toda||[]).map(x=>`${x.tmdb_id}-${x.tipo}`), ...(window.idsVistosSet||[]), ...ocultasLeer().map(k=>{ const [t,i] = k.split(':'); return `${i}-${t}`; })]);
        const personal = [...(pPelis||[]), ...(pSeries||[])].map(r=>({..._itemDesdeTmdb(r, r._tipo, ''), _motivo:`♥ Porque te gustó ${r._porque}`}))
          .sort((a,b)=>gusto(b)-gusto(a));
        const actualidad = [...etiquetar(cines,'🍿 En cines ahora'), ...etiquetar(estrenos,'🎟️ Estreno del mes'), ...etiquetar(popular,'📈 Popular en plataformas')]
          .sort((a,b)=>gusto(b)-gusto(a));
        // se intercalan: dos tuyos, uno de actualidad
        const mezcla = [];
        for(let i=0, j=0; i<personal.length || j<actualidad.length; ){
          if(i<personal.length) mezcla.push(personal[i++]);
          if(i<personal.length) mezcla.push(personal[i++]);
          if(j<actualidad.length) mezcla.push(actualidad[j++]);
        }
        const usados = new Set();
        const cands = mezcla.filter(it=>{
          const k = `${it.tmdb_id}-${it.tipo}`;
          if(usados.has(k) || conocidos.has(k)) return false;
          usados.add(k); return true;
        });
        window._feed = {cands, pos:0, slides:[], actual:0, cargando:false};
        lista.innerHTML = '';
        await _feedCargarMas();
        if(!window._feed.slides.length) lista.innerHTML = '<div class="feed-estado">No hay tráilers en español o en inglés ahora mismo.</div>';
      }catch(e){
        lista.innerHTML = `<div class="feed-estado">No se pudieron cargar los tráilers.<br><button type="button" class="feed-btn" style="margin-top:14px;max-width:200px" onclick="window._feed=null;abrirFeedTrailers()">Reintentar</button></div>`;
      }
    }
    function cerrarFeedTrailers(){
      document.getElementById('feed-overlay').style.display = 'none';
      document.body.style.overflow = '';
      document.querySelectorAll('#feed-lista .feed-video iframe').forEach(f=>_feedRestaurar(f.closest('.feed-slide')));
    }
    // Añade tráilers de 6 en 6 (solo los que tienen versión en español o inglés)
    async function _feedCargarMas(){
      const f = window._feed; if(!f || f.cargando || f.pos>=f.cands.length) return;
      f.cargando = true;
      try{
        const lista = document.getElementById('feed-lista');
        let nuevos = 0;
        while(nuevos<4 && f.pos<f.cands.length){
          const lote = f.cands.slice(f.pos, f.pos+6); f.pos += lote.length;
          const trailers = await Promise.all(lote.map(it=>_elegirTrailer(it.tipo, it.tmdb_id).catch(()=>null)));
          lote.forEach((it,k)=>{
            const t = trailers[k]; if(!t) return;
            const i = f.slides.length; f.slides.push({...it, trailer:t}); nuevos++;
            lista.insertAdjacentHTML('beforeend', _feedSlideHTML(f.slides[i], i));
            const sin = lista.lastElementChild.querySelector('.feed-sinopsis'); // «Leer completa» solo si está cortada
            if(sin && sin.scrollHeight<=sin.clientHeight+1) sin.nextElementSibling.remove();
            _feedObservador().observe(lista.lastElementChild);
          });
        }
      } finally { f.cargando = false; }
    }
    function _feedSlideHTML(it, i){
      const meta = [it.y, it.tipo==='tv' ? 'Serie' : 'Película', it.voto ? '★ '+it.voto.toFixed(1) : ''].filter(Boolean).join(' · ');
      return `<section class="feed-slide" data-i="${i}">
        ${it.poster ? `<div class="feed-fondo" style="background-image:url(https://image.tmdb.org/t/p/w342${it.poster})"></div>` : ''}
        <div class="feed-cuerpo">
          <div class="feed-video" onclick="_feedActivar(${i}, true)">${_feedMiniatura(it)}</div>
          <div class="feed-info">
            ${it._motivo ? `<div class="feed-motivo">${_escHtml(it._motivo)}</div>` : ''}
            <div class="feed-nombre">${_escHtml(it.t)}</div>
            <div class="feed-meta"><span>${_escHtml(meta)}</span><span class="feed-idioma">${_textoIdiomaTrailer(it.trailer)}</span></div>
            ${it.p ? `<div class="feed-sinopsis" role="button" tabindex="0" onclick="this.classList.toggle('abierta')">${_escHtml(it.p)}</div><div class="feed-mas" onclick="this.previousElementSibling.classList.toggle('abierta')">Leer sinopsis completa</div>` : ''}
            <div class="feed-acciones">
              <button type="button" class="feed-btn principal" onclick="feedAPendiente(${i}, this)">＋ Para ver</button>
              <button type="button" class="feed-btn" onclick="feedAbrirFicha(${i})">Ver ficha</button>
              <button type="button" class="feed-btn" onclick="feedOcultar(${i}, this)" aria-label="No me interesa">🙅</button>
            </div>
          </div>
        </div>
      </section>`;
    }
    function _feedMiniatura(it){
      return `<img loading="lazy" src="https://img.youtube.com/vi/${encodeURIComponent(it.trailer.key)}/hqdefault.jpg" alt=""><div class="trailer-play"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></div>`;
    }
    // Solo hay un reproductor cargado a la vez: el del tráiler que está en pantalla
    function _feedObservador(){
      if(window._feedObs) return window._feedObs;
      window._feedObs = new IntersectionObserver(entradas=>{
        entradas.forEach(e=>{
          const i = +e.target.dataset.i;
          if(e.isIntersecting && e.intersectionRatio>=0.6) _feedActivar(i);
          else if(!e.isIntersecting || e.intersectionRatio<0.3) _feedRestaurar(e.target);
        });
      }, {root:document.getElementById('feed-lista'), threshold:[0.3,0.6]});
      return window._feedObs;
    }
    function _feedActivar(i, porToque){
      const f = window._feed; if(!f || !f.slides[i]) return;
      if(document.getElementById('feed-overlay').style.display==='none') return;
      f.actual = i;
      document.querySelectorAll('#feed-lista .feed-slide').forEach(sl=>{ if(+sl.dataset.i!==i) _feedRestaurar(sl); });
      const sl = document.querySelector(`#feed-lista .feed-slide[data-i="${i}"]`); if(!sl) return;
      const v = sl.querySelector('.feed-video');
      if(!v.querySelector('iframe')) v.innerHTML = _iframeTrailer(f.slides[i].trailer, {autoplay:true, mute:!(window._feedSonido || porToque)});
      if(i >= f.slides.length-3) _feedCargarMas();
    }
    function _feedRestaurar(sl){
      if(!sl) return;
      const v = sl.querySelector('.feed-video'), f = window._feed;
      if(v && v.querySelector('iframe') && f) v.innerHTML = _feedMiniatura(f.slides[+sl.dataset.i]);
    }
    // Sonido: los navegadores solo dejan reproducir con sonido tras tocar la pantalla, así que empieza en silencio
    function feedAlternarSonido(){
      window._feedSonido = !window._feedSonido;
      _feedPintarSonido();
      const fr = document.querySelector('#feed-lista .feed-video iframe');
      if(fr) fr.contentWindow.postMessage(JSON.stringify({event:'command', func: window._feedSonido ? 'unMute' : 'mute', args:[]}), '*');
    }
    function _feedPintarSonido(){
      document.getElementById('feed-sonido').textContent = window._feedSonido ? '🔊 Con sonido' : '🔇 Activar sonido';
    }
    async function feedAPendiente(i, btn){
      const it = window._feed && window._feed.slides[i]; if(!it) return;
      if(!sesionActual){ cerrarFeedTrailers(); mostrarCuenta(); return; }
      btn.disabled = true;
      let antes = null; try{ antes = await _filaBiblio(it.tipo, it.tmdb_id); }catch(e){}
      const base = {user_id: sesionActual.user.id, tmdb_id: it.tmdb_id, tipo: it.tipo, titulo: it.t, poster_path: it.poster||null, anio: it.y ? String(it.y) : ''};
      const { error } = await sb.from('mi_biblioteca').upsert({...base, pendiente:true}, { onConflict: 'user_id,tmdb_id,tipo' });
      btn.disabled = false;
      if(error){ console.error(error); _aviso('No se ha podido guardar. Inténtalo de nuevo.', true); return; }
      btn.textContent = '✓ En tu lista'; btn.classList.add('activo'); btn.onclick = null;
      _avisoDeshacer(`＋ «${it.t}» añadida a «Para ver»`, async ()=>{ await _deshacerFila(it.tipo, it.tmdb_id, antes, null)(); btn.textContent = '＋ Para ver'; btn.classList.remove('activo'); btn.onclick = ()=>feedAPendiente(i, btn); });
    }
    function feedOcultar(i, btn){
      const it = window._feed && window._feed.slides[i]; if(!it) return;
      if(!ocultarTitulo({id:it.tmdb_id, tipo:it.tipo, t:it.t, poster:it.poster, f:it.f, g:it.g})){ cerrarFeedTrailers(); return; }
      btn.disabled = true; btn.textContent = '✓';
      const sig = document.querySelector(`#feed-lista .feed-slide[data-i="${i+1}"]`);
      if(sig) setTimeout(()=>sig.scrollIntoView({behavior:'smooth'}), 400);
    }
    function feedAbrirFicha(i){
      const it = window._feed && window._feed.slides[i]; if(!it) return;
      cerrarFeedTrailers();
      abrirDetalle({id:it.tmdb_id, _tipo:it.tipo, title:it.t, poster_path:it.poster||null, release_date:it.f, vote_average:it.voto});
    }
    // ── NOTAS EXTERNAS (IMDb, Rotten Tomatoes, Metacritic) vía OMDb: clave gratuita de omdbapi.com ──
    const OMDB_KEY = '8f16c621';
    async function _pintarNotasExternas(tipo, id, p){
      const el = document.getElementById('d-notas-ext'); if(!el) return;
      el.innerHTML = ''; el.style.display = 'none';
      if(!OMDB_KEY) return;
      try{
        const imdb = await _imdbIdDe(tipo, id);
        const d = window._omdbCache[imdb] || await _omdbDatos(imdb);
        if(d && d.Response==='True') window._omdbCache[imdb] = d;
        if(peliculaActual!==p || !d || d.Response!=='True') return;
        const fuente = n => ((d.Ratings||[]).find(r=>r.Source===n)||{}).Value;
        const notas = [];
        if(d.imdbRating && d.imdbRating!=='N/A') notas.push(`<a class="nota-ext" href="https://www.imdb.com/title/${encodeURIComponent(imdb)}/" target="_blank" rel="noopener"><b>IMDb</b> ${_escHtml(d.imdbRating)}</a>`);
        const rt = fuente('Rotten Tomatoes'); if(rt) notas.push(`<span class="nota-ext"><b>Rotten</b> ${_escHtml(rt)}</span>`);
        const mc = fuente('Metacritic'); if(mc) notas.push(`<span class="nota-ext"><b>Metacritic</b> ${_escHtml(mc.replace('/100',''))}</span>`);
        if(!notas.length) return;
        // crítica (Metacritic o Rotten) frente a público (IMDb): si se separan mucho, se dice
        const critica = mc ? Number(mc.replace('/100','')) : rt ? Number(rt.replace('%','')) : null, publico = d.imdbRating && d.imdbRating!=='N/A' ? Number(d.imdbRating)*10 : null;
        if(critica!=null && publico!=null){
          const dif = critica - publico, cn = mc ? `Metacritic ${critica}` : `Rotten ${critica}%`, pn = `IMDb ${String(d.imdbRating).replace('.',',')}`;
          if(dif >= 15) notas.push(`<div class="nota-gap">🧐 La crítica la valoró bastante mejor que el público (${cn} · ${pn}).</div>`);
          else if(dif <= -15) notas.push(`<div class="nota-gap">🍿 Al público le gustó mucho más que a la crítica (${pn} · ${cn}).</div>`);
        }
        el.innerHTML = notas.join(''); el.style.display = 'flex'; el.style.flexWrap = 'wrap';
      }catch(e){ /* sin notas externas: la ficha sigue igual */ }
    }
    function _omdbDatos(imdb){
      window._omdbProm = window._omdbProm || {};
      if(!window._omdbProm[imdb]) window._omdbProm[imdb] = fetch(`https://www.omdbapi.com/?i=${encodeURIComponent(imdb)}&apikey=${OMDB_KEY}`, {credentials:'omit'}).then(r=>r.json()).catch(e=>{ delete window._omdbProm[imdb]; throw e; });
      return window._omdbProm[imdb];
    }
    // ── PREMIOS: los importantes, con categoría y persona (Wikidata), más el recuento total (OMDb) ──
    const _CEREMONIAS = [
      ['Óscar', /academy award|\boscar/i], ['Globos de Oro', /golden globe/i], ['BAFTA', /bafta|british academy/i], ['Goya', /goya/i],
      ['Emmy', /emmy/i], ['Festival de Cannes', /palme d'or|cannes/i], ['Festival de Venecia', /golden lion|silver lion|venice|volpi cup/i],
      ['Festival de Berlín', /golden bear|silver bear|berlin/i], ['César', /c[ée]sar award/i], ['Sindicato de Actores (SAG)', /screen actors guild/i],
      ['Critics Choice', /critics'? choice|cr[ií]tica cinematogr/i]];
    function _premiosOmdbEs(a){
      if(!a || a==='N/A') return '';
      const nombres = [[/Oscars?/,'Óscar'],[/Primetime Emmys?/,'Emmy'],[/Golden Globes?/,'Globos de Oro'],[/BAFTA/,'BAFTA']];
      const nom = x => (nombres.find(([r])=>r.test(x))||[])[1];
      let t = a.trim().replace(/\.$/,'')
        .replace(/Won (\d+) ([A-Za-z ]+?)(?=\.|$)/g, (m,n,x)=>nom(x) ? `Ganó ${n} ${nom(x)}` : m)
        .replace(/Nominated for (\d+) ([A-Za-z ]+?)(?=\.|$)/g, (m,n,x)=>nom(x) ? `Nominada a ${n} ${nom(x)}` : m)
        .replace(/Another (\d+) wins? & (\d+) nominations?/i, '$1 premios más y $2 nominaciones')
        .replace(/(\d+) wins? & (\d+) nominations? total/i, '$1 premios y $2 nominaciones en total')
        .replace(/(\d+) wins? & (\d+) nominations?/i, '$1 premios y $2 nominaciones')
        .replace(/(\d+) wins? total|(\d+) wins?/i, (m,a1,a2)=>`${a1||a2} premios`).replace(/(\d+) nominations? total|(\d+) nominations?/i, (m,a1,a2)=>`${a1||a2} nominaciones`)
        .replace(/\.\s*/g, ' · ').replace(/\b1 premios\b/g,'1 premio').replace(/\b1 nominaciones\b/g,'1 nominación');
      return /\b(won|nominated|wins?|nominations?|another)\b/i.test(t) ? '' : t;
    }
    // Wikidata no siempre tiene el nombre de la categoría en español: se traducen las habituales
    function _categoriaEnEs(c){
      const T = [[/(Single|Multi)-Camera /ig,''],[/^(Outstanding|Best) /i,'Mejor '],[/Picture Editing|Film Editing|Editing/i,'montaje'],[/Cinematography/i,'fotografía'],[/Casting/i,'casting'],
        [/Directing|Director/i,'dirección'],[/Writing|Screenplay/i,'guion'],[/Lead Actor/i,'actor protagonista'],[/Lead Actress/i,'actriz protagonista'],
        [/Supporting Actor/i,'actor de reparto'],[/Supporting Actress/i,'actriz de reparto'],[/Guest Actor/i,'actor invitado'],[/Guest Actress/i,'actriz invitada'],
        [/Original Score|Music Composition|Original Music|Original Main Title Theme Music/i,'música'],[/Sound Editing|Sound Mixing|\bSound\b/i,'sonido'],[/Visual Effects/i,'efectos visuales'],
        [/Production Design|Art Direction/i,'diseño de producción'],[/Costumes?( Design)?/i,'vestuario'],[/Makeup|Hairstyling/i,'maquillaje'],[/Main Title Design/i,'cabecera'],
        [/Stunt (Coordination|Performance)/i,'especialistas'],[/\bActor\b/i,'actor'],[/\bActress\b/i,'actriz']];
      let t = c.replace(/ for an? (?:Single-Camera |Multi-Camera |One[- ]Hour |Half[- ]Hour |Contemporary |Period |Fantasy )*(Drama|Comedy|Limited|Anthology)?\s*Series(?: or Movie)?.*$/i, (m,g)=>({drama:' - Serie dramática', comedy:' - Serie de comedia', limited:' - Miniserie', anthology:' - Miniserie'}[String(g).toLowerCase()] || ' - Serie'))
        .replace(/ in an? (Drama|Comedy) Series$/i, (m,g)=>g.toLowerCase()==='drama' ? ' - Serie dramática' : ' - Serie de comedia');
      T.forEach(([r,x])=>{ t = t.replace(r, x); });
      return t;
    }
    async function _wdSparql(q){
      const ctrl = new AbortController(), tm = setTimeout(()=>ctrl.abort(), 15000);
      try{
        const r = await fetch('https://query.wikidata.org/sparql?format=json&query='+encodeURIComponent(q), {signal:ctrl.signal, credentials:'omit'});
        if(!r.ok) throw new Error('wikidata '+r.status);
        return (await r.json()).results.bindings || [];
      } finally { clearTimeout(tm); }
    }
    async function _premiosWikidata(tipo, id, creditos){
      const prop = tipo==='movie' ? 'P4947' : 'P4983';
      const q = (await _wdSparql(`SELECT ?f WHERE { ?f wdt:${prop} "${Number(id)}". } LIMIT 1`))[0];
      if(!q) return [];
      const film = 'wd:' + q.f.value.split('/').pop();
      const etiquetas = v => `OPTIONAL{ ?${v} rdfs:label ?${v}es. FILTER(LANG(?${v}es)="es") } OPTIONAL{ ?${v} rdfs:label ?${v}en. FILTER(LANG(?${v}en)="en") }`;
      const personas = [...new Set([...(creditos.cast||[]).slice(0,15), ...(creditos.crew||[]).filter(c=>['Director','Screenplay','Writer','Original Music Composer','Director of Photography','Editor','Producer','Creator'].includes(c.job))].map(c=>String(Number(c.id))))].slice(0,45);
      const [delTitulo, dePersonas] = await Promise.all([
        _wdSparql(`SELECT ?tipo ?aes ?aen ?qes ?qen ?tmdb ?t WHERE { { ${film} p:P166 ?st. ?st ps:P166 ?a. BIND("gana" AS ?tipo) } UNION { ${film} p:P1411 ?st. ?st ps:P1411 ?a. BIND("nom" AS ?tipo) } OPTIONAL{ ?st pq:P585 ?t } OPTIONAL{ ?st pq:P1346 ?q. OPTIONAL{ ?q wdt:P4985 ?tmdb } ${etiquetas('q')} } ${etiquetas('a')} }`).catch(()=>[]),
        personas.length ? _wdSparql(`SELECT ?tipo ?aes ?aen ?qes ?qen ?tmdb ?t WHERE { VALUES ?tmdb { ${personas.map(x=>`"${x}"`).join(' ')} } ?q wdt:P4985 ?tmdb. { ?q p:P166 ?st. ?st ps:P166 ?a. BIND("gana" AS ?tipo) } UNION { ?q p:P1411 ?st. ?st ps:P1411 ?a. BIND("nom" AS ?tipo) } ?st pq:P1686 ${film}. OPTIONAL{ ?st pq:P585 ?t } ${etiquetas('a')} ${etiquetas('q')} }`).catch(()=>[]) : []
      ]);
      const v = (b,k) => b[k] ? b[k].value : '';
      const lista = [];
      [...delTitulo, ...dePersonas].forEach(b=>{
        const en = v(b,'aen'), es = (v(b,'aes') || en).replace(/^Anexo:\s*/,'');
        if(/submission/i.test(en)) return; // candidata de su país, no una nominación
        const cer = _CEREMONIAS.find(([,r])=>r.test(en) || r.test(es)) || ['Otros premios'];
        // en «Otros premios» se deja el nombre completo del premio, que es lo que lo identifica
        let cat = cer[0]==='Otros premios' ? es : es.replace(/^.*?\s(?:a la|al|a los|a las|a)\s(?=mejor)/i,'');
        if(cer[0]!=='Otros premios' && cat===es && !/mejor/i.test(cat)) cat = _categoriaEnEs(es.replace(/^.*? for /i,''));
        cat = cat.charAt(0).toUpperCase()+cat.slice(1);
        const persona = /pel[ií]cula|serie|film|picture|series|^mejor reparto|especialistas/i.test(cat) ? '' : (v(b,'qes') || v(b,'qen'));
        lista.push({cer:cer[0], cat, persona, pid:persona ? Number(v(b,'tmdb'))||0 : 0, gana:v(b,'tipo')==='gana', y:v(b,'t').slice(0,4)});
      });
      // una entrada por categoría y persona; si ganó, cuenta como premio y no como nominación
      const m = new Map();
      lista.forEach(x=>{ const k = `${x.cer}|${normalizarTitulo(x.cat)}|${x.persona}`; const ya = m.get(k); if(!ya || (x.gana && !ya.gana)) m.set(k, {...x, y:x.y||ya?.y||''}); else if(!ya.y && x.y) ya.y = x.y; });
      const res = [...m.values()];
      return res.filter(x=>x.persona || !res.some(o=>o!==x && o.persona && o.cer===x.cer && normalizarTitulo(o.cat)===normalizarTitulo(x.cat)));
    }
    async function _pintarPremios(tipo, id, creditos, p){
      const box = document.getElementById('d-premios-box'), el = document.getElementById('d-premios');
      const clave = `cm:premios3:${tipo}:${id}`;
      let datos = null;
      try{ const c = JSON.parse(localStorage.getItem(clave)||'null'); if(c && Date.now()-c.ts < 14*864e5) datos = c; }catch(e){}
      if(!datos){
        const [lista, resumen] = await Promise.all([
          _premiosWikidata(tipo, id, creditos).catch(()=>null),
          _imdbIdDe(tipo, id).then(_omdbDatos).then(d=>_premiosOmdbEs(d && d.Awards)).catch(()=>'')
        ]);
        datos = {ts:Date.now(), lista:lista||[], resumen};
        if(lista) try{ localStorage.setItem(clave, JSON.stringify(datos)); }catch(e){}
      }
      if(peliculaActual!==p) return;
      if(!datos.lista.length && !datos.resumen){ box.style.display = 'none'; return; }
      const grupos = [..._CEREMONIAS, ['Otros premios']].map(([c])=>[c, datos.lista.filter(x=>x.cer===c)]).filter(([,l])=>l.length);
      const hayGrandes = grupos.some(([c])=>c!=='Otros premios');
      const fotos = {}, roles = {}, ROL = {Director:'Director', Screenplay:'Guion', Writer:'Guion', 'Original Music Composer':'Música', 'Director of Photography':'Fotografía', Editor:'Montaje', Producer:'Producción'};
      [...(creditos.cast||[]), ...(creditos.crew||[])].forEach(c=>{ if(c.profile_path) fotos[c.id] = c.profile_path; roles[c.id] = c.job ? (ROL[c.job]||roles[c.id]||'Equipo') : 'Actor'; });
      window._premiosPersonas = [];
      const linea = x => {
        if(!x.persona) return _escHtml(x.cat);
        if(!x.pid) return `${_escHtml(x.cat)} <span class="premio-quien">· ${_escHtml(x.persona)}</span>`;
        const i = window._premiosPersonas.push({id:x.pid, n:x.persona, f:fotos[x.pid]||'', r:roles[x.pid]||''}) - 1;
        return `${_escHtml(x.cat)} <span class="premio-quien">· <button type="button" class="premio-persona" onclick="abrirPersonaPremio(${i})">${_escHtml(x.persona)}</button></span>`;
      };
      const total = datos.lista.length;
      // con muchos premios, solo el primero desplegado; «Otros premios» siempre empieza plegado
      const abiertoPorDefecto = (gi, c) => c!=='Otros premios' && (total<=10 || gi===0);
      el.innerHTML = (datos.resumen ? `<div class="premios-resumen">${_escHtml(datos.resumen)}</div>` : '')
        + (!hayGrandes ? '<p class="premios-sin">Sin premios ni nominaciones en los grandes certámenes (Óscar, Globos de Oro, BAFTA, Goya, Emmy ni los festivales de Cannes, Venecia o Berlín). Lo que suma son premios menores: de fans, de asociaciones de críticos, festivales pequeños…</p>' : '')
        + (grupos.length>1 && total>10 ? `<button type="button" class="premios-todos" onclick="premiosPlegarTodo(this)">Desplegar todos ▾</button>` : '') + grupos.map(([c,l],gi)=>{
        const ganados = l.filter(x=>x.gana), noms = l.filter(x=>!x.gana), anios = [...new Set(l.map(x=>x.y).filter(Boolean))].sort();
        const cab = anios.length ? (anios.length>1 ? `${anios[0]}–${anios[anios.length-1]}` : anios[0]) : '';
        const nCat = l => new Set(l.map(x=>normalizarTitulo(x.cat))).size; // un premio compartido por dos personas cuenta una vez
        const nG = nCat(ganados), nN = nCat(noms);
        const resumenCer = [nG ? `🏆 ${nG}` : '', nN ? `${nN} ${nN===1?'nominación':'nominaciones'}` : ''].filter(Boolean).join(' · ');
        return `<div class="premio-cer${abiertoPorDefecto(gi, c) ? ' abierto' : ''}">
          <button type="button" class="premio-cer-t" onclick="this.parentElement.classList.toggle('abierto')" aria-label="Desplegar o plegar ${c}"><span class="premio-flecha">▸</span>${c} <span>${cab}</span><span class="premio-cer-n">${resumenCer}</span></button>
          <div class="premio-cuerpo">
          ${ganados.map(x=>`<div class="premio-l gana">🏆 ${linea(x)}</div>`).join('')}
          ${noms.length ? `<div class="premio-noms${ganados.length && noms.length>3 ? ' plegado' : ''}" id="premio-noms-${gi}">${noms.map(x=>`<div class="premio-l nom">Nominada · ${linea(x)}</div>`).join('')}</div>
            ${ganados.length && noms.length>3 ? `<button type="button" class="premio-mas" onclick="document.getElementById('premio-noms-${gi}').classList.remove('plegado');this.remove()">Ver las ${noms.length} nominaciones ▾</button>` : ''}` : ''}
          </div>
        </div>`;
      }).join('') + (grupos.length || datos.resumen ? '<div class="premios-fuente">Detalle de premios según Wikidata; el recuento total, de IMDb. Puede faltar alguno.</div>' : '');
      box.style.display = 'block';
    }
    function abrirPersonaPremio(i){ const x = (window._premiosPersonas||[])[i]; if(x) mostrarFilmografia(x.id, x.n, x.f, x.r || 'Premiado'); }
    function premiosPlegarTodo(btn){
      const cers = document.querySelectorAll('#d-premios .premio-cer'), abrir = [...cers].some(c=>!c.classList.contains('abierto'));
      cers.forEach(c=>c.classList.toggle('abierto', abrir));
      btn.textContent = abrir ? 'Plegar todos ▴' : 'Desplegar todos ▾';
    }
    // ── «BASADA EN…» Y «DÓNDE SE RODÓ» (Wikidata) ──
    // Tipo de obra original → cómo se dice y con qué icono
    const _OBRAS = [[/manga/i,'el manga','📚'],[/comic|graphic novel/i,'el cómic','🦸'],[/superhero|fictional|character|team|organization/i,'los personajes de','🦸'],
      [/video ?game/i,'el videojuego','🎮'],[/novella/i,'la novela corta','📖'],[/novel/i,'la novela','📖'],[/short story/i,'el relato','📖'],[/fairy tale|folk tale|legend|myth/i,'el cuento','📖'],
      [/memoir|autobiograph|biograph/i,'las memorias','📖'],[/musical/i,'el musical','🎭'],[/play|opera|theatr/i,'la obra de teatro','🎭'],[/poem/i,'el poema','📖'],
      [/television|tv series|series/i,'la serie','📺'],[/film|movie/i,'la película','🎬'],[/article|essay|reportage|journal/i,'el artículo','📰'],[/book|literary|written work|work/i,'el libro','📖']];
    async function _cargarWikidataFicha(tipo, id, p){
      const clave = `cm:wdF:${tipo}:${id}`;
      let d = null;
      try{ const c = JSON.parse(localStorage.getItem(clave)||'null'); if(c && Date.now()-c.t < 30*864e5) d = c; }catch(e){}
      if(!d){
        const prop = tipo==='movie' ? 'P4947' : 'P4983', f = `?f wdt:${prop} "${Number(id)}".`;
        const lbl = v => `OPTIONAL{ ?${v} rdfs:label ?${v}es. FILTER(LANG(?${v}es)="es") } OPTIONAL{ ?${v} rdfs:label ?${v}en. FILTER(LANG(?${v}en)="en") }`;
        const [base, lug] = await Promise.all([
          _wdSparql(`SELECT ?b ?prop ?ten ?aes ?aen ?fecha ?bes ?ben WHERE { ${f} { ?f wdt:P144 ?b. BIND("P144" AS ?prop) } UNION { ?f wdt:P941 ?b. BIND("P941" AS ?prop) } OPTIONAL{ ?b wdt:P31 ?t. ?t rdfs:label ?ten. FILTER(LANG(?ten)="en") } OPTIONAL{ ?b wdt:P50 ?a. ${lbl('a')} } OPTIONAL{ ?b wdt:P577 ?fecha } ${lbl('b')} } LIMIT 40`).catch(()=>null),
          _wdSparql(`SELECT ?l ?coord ?pes ?pen ?les ?len WHERE { ${f} ?f wdt:P915 ?l. OPTIONAL{ ?l wdt:P625 ?coord } OPTIONAL{ ?l wdt:P17 ?p. ${lbl('p')} } ${lbl('l')} } LIMIT 40`).catch(()=>null)
        ]);
        if(!base && !lug) return;
        const v = (b,k) => b[k] ? b[k].value : '';
        const obras = new Map();
        (base||[]).forEach(b=>{ const k = v(b,'b'); const o = obras.get(k) || {n:v(b,'bes')||v(b,'ben'), prop:v(b,'prop'), tipos:new Set(), autores:new Set(), y:''};
          if(v(b,'ten')) o.tipos.add(v(b,'ten')); const a = v(b,'aes')||v(b,'aen'); if(a) o.autores.add(a); const y = v(b,'fecha').slice(0,4); if(y && (!o.y || y<o.y)) o.y = y; obras.set(k, o); });
        const lugares = new Map();
        (lug||[]).forEach(b=>{ const k = v(b,'l'); if(lugares.has(k)) return; const m = v(b,'coord').match(/Point\(([-\d.]+) ([-\d.]+)\)/);
          lugares.set(k, {n:v(b,'les')||v(b,'len'), pais:v(b,'pes')||v(b,'pen'), lat:m ? Number(m[2]) : null, lon:m ? Number(m[1]) : null}); });
        d = {t:Date.now(), obras:[...obras.values()].filter(o=>o.n && !/^Q\d+$/.test(o.n)).map(o=>({...o, tipos:[...o.tipos], autores:[...o.autores]})).slice(0,3), lugares:[...lugares.values()].filter(l=>l.n && !/^Q\d+$/.test(l.n)).slice(0,25)};
        try{ localStorage.setItem(clave, JSON.stringify(d)); }catch(e){}
      }
      if(peliculaActual!==p) return;
      _basadaEn(p, {obras:d.obras});
      _pintarRodaje(d.lugares, p);
    }
    // Se pinta cuando llegan los datos de Wikidata y los temas de TMDB (lo que llegue primero se completa con lo otro)
    function _basadaEn(p, datos){
      if(!window._basada || window._basada.p!==p) window._basada = {p};
      Object.assign(window._basada, datos);
      const el = document.getElementById('d-basada'), b = window._basada; if(!el || peliculaActual!==p) return;
      const lineas = (b.obras||[]).map(o=>{
        const tipo = _OBRAS.find(([r])=>o.tipos.some(t=>r.test(t))) || [null,'la obra','📖'];
        if(tipo[1]==='la película') return `🎬 Nueva versión de <b>«${_escHtml(o.n)}»</b>${o.y ? ` (${o.y})` : ''}`;
        const autor = o.autores.slice(0,2).join(' y ');
        return `${tipo[2]} ${o.prop==='P941' ? 'Inspirada en' : 'Basada en'} ${tipo[1]} <b>«${_escHtml(o.n)}»</b>${autor ? ` de ${_escHtml(autor)}` : ''}${o.y ? ` (${o.y})` : ''}`;
      });
      if(!lineas.length && b.hechos) lineas.push('📰 Basada en hechos reales');
      el.innerHTML = lineas.map(x=>`<div>${x}</div>`).join('');
      el.style.display = lineas.length ? 'block' : 'none';
    }
    // Mapa con los lugares de rodaje (Leaflet se descarga solo cuando hace falta)
    function _cargarLeaflet(){
      if(window.L) return Promise.resolve(window.L);
      if(window._leafletP) return window._leafletP;
      return window._leafletP = new Promise((res,rej)=>{
        const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; document.head.appendChild(css);
        const js = document.createElement('script'); js.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'; js.onload = ()=>res(window.L); js.onerror = ()=>{ window._leafletP = null; rej(); }; document.head.appendChild(js);
      });
    }
    async function _pintarRodaje(lugares, p){
      const box = document.getElementById('d-rodaje-box'), lista = document.getElementById('d-rodaje-lista'), mapa = document.getElementById('d-rodaje-mapa');
      if(!box || !lugares || !lugares.length){ if(box) box.style.display = 'none'; return; }
      window._rodaje = lugares;
      lista.innerHTML = lugares.map((l,i)=>`<a class="rodaje-l" href="${l.lat!=null ? `https://maps.apple.com/?ll=${l.lat},${l.lon}&q=${encodeURIComponent(l.n)}` : `https://maps.apple.com/?q=${encodeURIComponent(l.n+(l.pais?', '+l.pais:''))}`}" target="_blank" rel="noopener">📍 ${_escHtml(l.n)}${l.pais && l.pais!==l.n ? ` <span>· ${_escHtml(l.pais)}</span>` : ''}</a>`).join('');
      box.style.display = 'block';
      const con = lugares.filter(l=>l.lat!=null);
      if(!con.length){ mapa.style.display = 'none'; return; }
      mapa.style.display = 'block';
      try{
        const L = await _cargarLeaflet(); if(peliculaActual!==p) return;
        if(window._rodajeMapa){ window._rodajeMapa.remove(); window._rodajeMapa = null; }
        const m = window._rodajeMapa = L.map(mapa, {zoomControl:false, attributionControl:true, scrollWheelZoom:false, dragging:!L.Browser.mobile, tap:false});
        const oscuro = document.documentElement.dataset.theme==='dark';
        L.tileLayer(`https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/${oscuro ? 'World_Dark_Gray_Base' : 'World_Light_Gray_Base'}/MapServer/tile/{z}/{y}/{x}`, {attribution:'Mapa © Esri', maxZoom:12}).addTo(m);
        const icono = L.divIcon({className:'rodaje-pin', html:'<span></span>', iconSize:[18,18], iconAnchor:[9,9]});
        const marcas = con.map(l=>L.marker([l.lat,l.lon], {icon:icono}).addTo(m).bindTooltip(l.n));
        if(con.length===1) m.setView([con[0].lat, con[0].lon], 5); else m.fitBounds(L.featureGroup(marcas).getBounds(), {padding:[24,24], maxZoom:6});
      }catch(e){ mapa.style.display = 'none'; }
    }
    // ── SOBRE LA PELÍCULA: el artículo de Wikipedia (en español; si no hay, en inglés), sin el argumento para no destripar nada ──
    async function _pintarWikipedia(tipo, id, p){
      const box = document.getElementById('d-wiki-box'), el = document.getElementById('d-wiki');
      const clave = `cm:wiki2:${tipo}:${id}`;
      let datos = null;
      try{ const c = JSON.parse(localStorage.getItem(clave)||'null'); if(c && Date.now()-c.t < 14*864e5) datos = c; }catch(e){}
      if(!datos){
        try{
          const prop = tipo==='movie' ? 'P4947' : 'P4983';
          const art = await _wdSparql(`SELECT ?art ?lang WHERE { ?f wdt:${prop} "${Number(id)}". ?art schema:about ?f; schema:inLanguage ?lang; schema:isPartOf ?w. FILTER(?lang IN ("es","en")) FILTER(CONTAINS(STR(?w), "wikipedia.org")) }`);
          const elegido = art.find(b=>b.lang.value==='es') || art.find(b=>b.lang.value==='en');
          if(!elegido){ datos = {t:Date.now(), vacio:true}; }
          else{
            const lang = elegido.lang.value, titulo = decodeURIComponent(elegido.art.value.split('/wiki/')[1]||'');
            const r = await (await fetch(`https://${lang}.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&exsectionformat=wiki&redirects=1&format=json&origin=*&titles=${encodeURIComponent(titulo)}`, {credentials:'omit'})).json();
            const pag = Object.values(r?.query?.pages||{})[0] || {}, txt = String(pag.extract||'');
            // se trocea por secciones (== Producción ==, === Rodaje ===…)
            const trozos = txt.split(/\n(?==+ [^=\n]+ =+\s*\n)/);
            const intro = (trozos.shift()||'').trim();
            const secciones = [];
            const NO = /argumento|sinopsis|trama|resumen|plot|synopsis|reparto|cast|premios|nominaciones|awards|accolades|referencias|references|enlaces|links|bibliograf|notas|notes|véase|see also|fuentes|lecturas/i;
            const SI = /producci|desarrollo|preproducci|rodaje|filmaci|guion|escritura|casting|elecci|efectos|dise|música|banda sonora|recepci|crítica|taquilla|recaudaci|estreno|lanzamiento|legado|influencia|curiosidad|anécdota|controversia|production|development|filming|writing|visual effects|music|reception|critical|box office|release|legacy|influence|trivia|controvers/i;
            let actual = null;
            trozos.forEach(tz=>{
              const m = tz.match(/^(=+) ([^=\n]+) =+\s*\n?([\s\S]*)$/); if(!m) return;
              const nivel = m[1].length, nombre = m[2].trim(), cuerpo = m[3].trim();
              if(nivel===2){ actual = NO.test(nombre) || !SI.test(nombre) ? null : {n:nombre, t:''}; if(actual) secciones.push(actual); if(actual && cuerpo) actual.t += cuerpo+'\n\n'; }
              else if(actual && cuerpo && !NO.test(nombre)) actual.t += `«${nombre}»\n${cuerpo}\n\n`;
            });
            datos = {t:Date.now(), lang, url:elegido.art.value, intro, sec:secciones.map(x=>({n:x.n, t:x.t.trim()})).filter(x=>x.t.length>80).slice(0,8)}; // el texto entero, sin recortes
          }
          try{ localStorage.setItem(clave, JSON.stringify(datos)); }catch(e){ try{ Object.keys(localStorage).filter(k=>k.startsWith('cm:wiki')).forEach(k=>localStorage.removeItem(k)); localStorage.setItem(clave, JSON.stringify(datos)); }catch(e2){} }
        }catch(e){ return; }
      }
      if(peliculaActual!==p || datos.vacio || (!datos.intro && !datos.sec?.length)) return;
      const parrafos = t => _escHtml(String(t).replace(/\s*\[(cita requerida|citation needed|sin referencias|aclaración requerida|¿?cuándo\??|\d+|nota \d+|n\. \d+|[a-z])\]/gi,'')).split(/\n{2,}/).map(x=>x.trim()).filter(Boolean).map(x=>/^«.+»\n/.test(x) ? `<p><b>${x.slice(1, x.indexOf('»'))}</b><br>${x.slice(x.indexOf('»')+2)}</p>` : `<p>${x}</p>`).join('');
      document.getElementById('d-wiki-label').innerHTML = `Sobre la ${tipo==='tv' ? 'serie' : 'película'} <span class="wiki-fuente">· Wikipedia${datos.lang==='en' ? ' (en inglés)' : ''}</span>`;
      const larga = (datos.intro||'').length > 420;
      el.innerHTML = `${datos.intro ? `<div class="wiki-intro${larga ? ' plegada' : ''}">${parrafos(datos.intro)}</div>${larga ? `<button type="button" class="wiki-mas" onclick="const t=this.previousElementSibling;t.classList.toggle('plegada');this.textContent=t.classList.contains('plegada')?'Leer más ▾':'Leer menos ▴'">Leer más ▾</button>` : ''}` : ''}
        ${datos.sec.map((x,i)=>`<div class="wiki-sec"><button type="button" class="wiki-cab" onclick="this.parentElement.classList.toggle('abierto')"><span>${_escHtml(x.n)}</span><i>▾</i></button><div class="wiki-cuerpo">${parrafos(x.t)}</div></div>`).join('')}
        <a class="wiki-link" href="${_escHtml(datos.url)}" target="_blank" rel="noopener">Leer el artículo completo en Wikipedia ↗</a>`;
      box.style.display = 'block';
    }
    // ── BANDA SONORA ──
    // Los enlaces de búsqueda de Apple Music abren la app en Inicio, así que se busca el álbum concreto con el buscador
    // público de Apple (itunes.apple.com/search) y se enlaza directamente. Spotify no tiene buscador público:
    // se abre su búsqueda dentro de la app (spotify:search:…) y, si la app no está instalada, la web.
    async function _pintarBSO(d){
      const el = document.getElementById('d-bso'); if(!el) return;
      const p = peliculaActual;
      const titulo = d.original_title || d.original_name || d.title || d.name || '';
      if(!titulo){ el.innerHTML = '<span class="no-trailer">No disponible</span>'; return; }
      const q = `${titulo} soundtrack`;
      window._bsoBusqueda = q;
      el.innerHTML = `<div class="bso-row"><span class="bso-btn bso-cargando">🎵 Buscando en Apple Music…</span><a class="bso-btn" href="https://open.spotify.com/search/${encodeURIComponent(q)}" onclick="return abrirSpotifyBSO(event)">🎧 Spotify</a></div>`;
      let album = null;
      try{
        const r = await (await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=album&country=es&limit=15`, {credentials:'omit'})).json();
        const norm = normalizarTitulo(titulo);
        const puntos = a => {
          const n = normalizarTitulo(a.collectionName||'');
          return (n.includes(norm) ? 4 : 0) + (/soundtrack|banda sonora|original score|music from|original series|motion picture/.test(n) ? 3 : 0) - (/ - single$|\(single\)/.test(n) ? 2 : 0);
        };
        album = (r.results||[]).map(a=>({a, pt:puntos(a)})).filter(x=>x.pt>=7).sort((x,y)=>y.pt-x.pt)[0]?.a || null;
      }catch(e){ album = null; }
      if(peliculaActual!==p) return;
      const apple = album
        ? `<a class="bso-btn" href="${_escHtml(album.collectionViewUrl.replace('?uo=4',''))}" target="_blank" rel="noopener">🎵 Apple Music</a>`
        : `<span class="bso-btn bso-no">🎵 No está en Apple Music</span>`;
      el.innerHTML = `<div id="bso-temas"></div><div class="bso-row">${apple}<a class="bso-btn" href="https://open.spotify.com/search/${encodeURIComponent(q)}" onclick="return abrirSpotifyBSO(event)">🎧 Spotify</a></div>
        ${album ? `<div class="bso-album">${_escHtml(album.collectionName)} · ${_escHtml(album.artistName)}</div>` : ''}`;
      if(album) _pintarTemasBSO(album, p);
    }
    // Avance de 30 s de cada canción (Apple): arriba el tema principal y, plegadas, todas las demás
    async function _pintarTemasBSO(album, p){
      const el = document.getElementById('bso-temas'); if(!el) return;
      try{
        const r = await (await fetch(`https://itunes.apple.com/lookup?id=${encodeURIComponent(album.collectionId)}&entity=song&country=es&limit=60`, {credentials:'omit'})).json();
        if(peliculaActual!==p) return;
        const temas = (r.results||[]).filter(x=>x.wrapperType==='track' && x.previewUrl).sort((a,b)=>(a.discNumber-b.discNumber)||(a.trackNumber-b.trackNumber));
        if(!temas.length) return;
        // el tema principal: el que lleva el nombre de la película o «theme / main title / tema»; si no, la primera pista
        const nt = normalizarTitulo(String(p.original_title||p.original_name||p.title||'')).replace(/[^a-z0-9 ]/g,'').trim();
        const puntos = x => { const n = normalizarTitulo(x.trackName||''); return (nt && nt.length>2 && n.includes(nt) ? 5 : 0) + (/\b(main title|main theme|theme|tema principal|tema)\b/.test(n) ? 4 : 0) + (/opening|suite|end title|end credits/.test(n) ? 2 : 0); };
        const principal = temas.slice().sort((a,b)=>puntos(b)-puntos(a) || (a.trackNumber-b.trackNumber))[0];
        window._bsoTemas = [principal, ...temas.filter(x=>x!==principal)];
        const fila = (x,i) => `<div class="bso-tema${i===0?' principal':''}" data-i="${i}" role="button" tabindex="0" onclick="bsoReproducir(${i})"><span class="bso-play">▶</span><span class="bso-tt"><b>${_escHtml(x.trackName||'')}</b><span>${i===0 ? 'Tema principal · ' : ''}${_escHtml(x.artistName||'')} · avance de 30 s</span></span>${x.trackViewUrl ? `<a class="bso-am" href="${_escHtml(String(x.trackViewUrl).replace(/[?&]uo=\d+/,''))}" target="_blank" rel="noopener" onclick="event.stopPropagation();bsoParar();_bsoMarcar(-1)" aria-label="Escuchar entera en Apple Music">Apple Music ↗</a>` : ''}<span class="bso-barra"><i></i></span></div>`;
        el.innerHTML = fila(window._bsoTemas[0],0) + (window._bsoTemas.length>1 ? `<button type="button" class="bso-mas" onclick="const l=this.nextElementSibling;l.hidden=!l.hidden;this.textContent=l.hidden?'Ver las ${window._bsoTemas.length-1} canciones más ▾':'Ocultar canciones ▴'">Ver las ${window._bsoTemas.length-1} canciones más ▾</button><div class="bso-lista" hidden>${window._bsoTemas.slice(1).map((x,i)=>fila(x,i+1)).join('')}</div>` : '');
      }catch(e){}
    }
    function bsoReproducir(i){
      const x = (window._bsoTemas||[])[i]; if(!x) return;
      let a = window._bsoAudio;
      if(!a){ a = window._bsoAudio = new Audio(); a.addEventListener('timeupdate', ()=>{ const b = document.querySelector(`.bso-tema[data-i="${a._i}"] .bso-barra i`); if(b && a.duration) b.style.width = (a.currentTime/a.duration*100)+'%'; }); a.addEventListener('ended', ()=>_bsoMarcar(-1)); }
      if(a._i===i && !a.paused){ a.pause(); _bsoMarcar(-1); return; }
      if(a._i!==i){ a.src = x.previewUrl; a._i = i; document.querySelectorAll('.bso-barra i').forEach(b=>b.style.width='0'); }
      a.play().then(()=>_bsoMarcar(i)).catch(()=>{});
    }
    function _bsoMarcar(i){ document.querySelectorAll('.bso-tema').forEach(b=>{ const on = Number(b.dataset.i)===i; b.classList.toggle('sonando', on); b.querySelector('.bso-play').textContent = on ? '❚❚' : '▶'; }); }
    function bsoParar(){ if(window._bsoAudio){ window._bsoAudio.pause(); window._bsoAudio._i = -1; } }
    function abrirSpotifyBSO(ev){
      const q = window._bsoBusqueda; if(!q) return true;
      ev.preventDefault();
      const web = `https://open.spotify.com/search/${encodeURIComponent(q)}`;
      const t0 = Date.now();
      // Si la app no se abre (la página sigue visible), se abre la web de Spotify
      const respaldo = setTimeout(()=>{ if(!document.hidden && Date.now()-t0<2500) window.open(web, '_blank', 'noopener'); }, 1500);
      document.addEventListener('visibilitychange', ()=>clearTimeout(respaldo), {once:true});
      location.href = `spotify:search:${encodeURIComponent(q)}`;
      return false;
    }

    async function cargarCreditos(id,tipo){
      const p=peliculaActual;
      try{
        const data=await(await fetch(`${TMDB_PROXY}?path=/${tipo}/${id}/credits&language=es-ES`)).json();
        let dirs=[];
        if(tipo==='tv'){const dd=await(await fetch(`${TMDB_PROXY}?path=/tv/${id}&language=es-ES`)).json();dirs=(dd.created_by||[]).map(c=>({...c,_rol:'Creador'}));}
        else{dirs=(data.crew||[]).filter(c=>c.job==='Director').map(c=>({...c,_rol:'Director'}));}
        if(peliculaActual!==p)return;
        const cast=(data.cast||[]).slice(0,12);
        _pintarEquipo(data.crew||[], p);
        _pintarPremios(tipo, id, data, p);
        _pintarWikipedia(tipo, id, p);
        _cargarWikidataFicha(tipo, id, p);
        window.repartoActual=cast;window.directoresActuales=dirs;
        const pH=(arr,vn)=>arr.length?arr.map((p,i)=>`<div class="persona-row" onclick="abrirPersonaDesdeDetalle(${vn}[${i}])"><img loading="lazy" class="persona-avatar" src="${p.profile_path?'https://image.tmdb.org/t/p/w92'+p.profile_path:''}" alt="${_escHtml(p.name)}"><div><div class="persona-nombre">${_escHtml(p.name)}</div><div class="persona-rol-tag">${_escHtml(p._rol)}</div></div><span class="persona-arrow">›</span></div>`).join(''):'<span style="color:var(--k-767973);font-size:13px">No disponible</span>';
        document.getElementById('d-directores').innerHTML=pH(dirs,'directoresActuales');
        document.getElementById('d-reparto').innerHTML=cast.length?cast.map((a,i)=>`<div class="actor-card" onclick="abrirPersonaActor(${i})"><img loading="lazy" class="actor-foto" src="${a.profile_path?'https://image.tmdb.org/t/p/w92'+a.profile_path:''}" alt="${_escHtml(a.name)}"><div class="actor-nombre">${_escHtml(a.name)}</div>${a.character ? `<div class="actor-personaje">${_escHtml(String(a.character).replace(/\s*\((voice|voz|uncredited)\)/ig,''))}</div>` : ''}<div class="actor-suena" data-pid="${a.id}"></div></div>`).join(''):'<span style="color:var(--k-767973);font-size:13px">No disponible</span>';
        _pintarDeQueMeSuena(cast, p);
      }catch(e){if(peliculaActual!==p)return;['d-directores','d-reparto'].forEach(id=>document.getElementById(id).innerHTML='<span style="color:var(--k-767973);font-size:13px">No disponible</span>');}
    }
    async function _pintarDeQueMeSuena(cast, p){
      const vistos = window.idsVistosSet; if(!vistos || !vistos.size || !cast.length) return;
      await _fetchEnLotes(cast, async a=>{
        try{
          const c = window._suenaCache[a.id] || (window._suenaCache[a.id] = (await _tmdbJson(`/person/${a.id}/combined_credits&language=es-ES`)).cast || []);
          if(peliculaActual!==p) return;
          const ya = new Set(), vistas = [];
          c.forEach(x=>{
            const tipo = x.media_type==='tv' ? 'tv' : 'movie', k = `${x.id}-${tipo}`;
            if(vistos.has(k) && !(x.id===p.id && tipo===p._tipo) && !ya.has(k)){ ya.add(k); vistas.push(x); }
          });
          if(!vistas.length) return;
          vistas.sort((x,y)=>(y.popularity||0)-(x.popularity||0));
          const el = document.querySelector(`#d-reparto .actor-suena[data-pid="${a.id}"]`); if(!el) return;
          // Un solo título (el más conocido) para que quepa entero; el resto, al tocar el texto
          const primero = vistas[0].title || vistas[0].name;
          el.textContent = `Lo viste en ${primero}` + (vistas.length>1 ? ` y ${vistas.length-1} más` : '');
          el.title = 'Lo viste en: ' + vistas.map(x=>x.title||x.name).join(', ');
          if(vistas.length>1){
            el.classList.add('con-mas');
            el.onclick = ev=>{ ev.stopPropagation(); el.textContent = 'Lo viste en ' + vistas.map(x=>x.title||x.name).join(', '); el.classList.add('abierto'); el.onclick = null; };
          }
        }catch(e){}
      }, 4);
    }
    // ── TEMAS (palabras clave de TMDB). TMDB solo las tiene en inglés: las habituales se traducen ──
    const _TEMAS_ES = {'time travel':'viajes en el tiempo','heist':'atraco','based on true story':'basada en hechos reales','based on novel or book':'basada en una novela','based on comic':'basada en un cómic','dystopia':'distopía','post-apocalyptic future':'postapocalíptico','artificial intelligence (a.i.)':'inteligencia artificial','superhero':'superhéroes','serial killer':'asesino en serie','revenge':'venganza','alien':'extraterrestres','space':'espacio','space travel':'viajes espaciales','zombie':'zombis','vampire':'vampiros','ghost':'fantasmas','haunted house':'casa encantada','supernatural':'sobrenatural','magic':'magia','dragon':'dragones','robot':'robots','dinosaur':'dinosaurios','world war ii':'Segunda Guerra Mundial','world war i':'Primera Guerra Mundial','vietnam war':'guerra de Vietnam','cold war':'Guerra Fría','spy':'espías','assassin':'asesino a sueldo','hitman':'asesino a sueldo','mafia':'mafia','gangster':'gánsteres','drug cartel':'cártel de la droga','police':'policía','detective':'detective','murder':'asesinato','investigation':'investigación','prison':'cárcel','prison escape':'fuga de la cárcel','courtroom':'juicio','lawyer':'abogados','journalism':'periodismo','politics':'política','biography':'biografía','sports':'deporte','boxing':'boxeo','football (soccer)':'fútbol','music':'música','musical':'musical','dancing':'baile','high school':'instituto','coming of age':'hacerse mayor','friendship':'amistad','family':'familia','father son relationship':'padres e hijos','mother daughter relationship':'madres e hijas','love':'amor','romance':'romance','wedding':'boda','christmas':'Navidad','road trip':'viaje por carretera','survival':'supervivencia','island':'isla','desert':'desierto','ocean':'océano','shark':'tiburones','monster':'monstruos','kaiju':'monstruos gigantes','virtual reality':'realidad virtual','parallel world':'universos paralelos','multiverse':'multiverso','time loop':'bucle temporal','amnesia':'amnesia','psychological thriller':'thriller psicológico','twist ending':'giro final','conspiracy':'conspiración','corruption':'corrupción','terrorism':'terrorismo','hostage':'rehenes','kidnapping':'secuestro','martial arts':'artes marciales','samurai':'samuráis','western':'western','cowboy':'vaqueros','pirate':'piratas','medieval':'Edad Media','ancient rome':'Antigua Roma','king':'reyes','witch':'brujas','fairy tale':'cuento de hadas','animation':'animación','anime':'anime','satire':'sátira','dark comedy':'comedia negra','parody':'parodia','remake':'remake','sequel':'secuela','prequel':'precuela','spin off':'spin-off','miniseries':'miniserie','new york city':'Nueva York','los angeles, california':'Los Ángeles','london, england':'Londres','paris, france':'París','spain':'España','madrid, spain':'Madrid','barcelona, spain':'Barcelona','tokyo, japan':'Tokio','small town':'pueblo pequeño','cult film':'película de culto','duringcreditsstinger':'escena durante los créditos','aftercreditsstinger':'escena poscréditos','woman director':'dirigida por una mujer','lgbt':'LGTBI','gay theme':'temática gay','mental illness':'salud mental','addiction':'adicciones','cancer':'cáncer','grief':'duelo','loneliness':'soledad','hacker':'hackers','computer':'informática','car race':'carreras de coches','car chase':'persecuciones','racing':'carreras','heist movie':'atraco','bank robbery':'atraco a un banco','drugs':'drogas','drug dealer':'traficantes','drug addiction':'adicción a las drogas','drug trafficking':'narcotráfico','narcissism':'narcisismo','psychopath':'psicópatas','terminal illness':'enfermedad terminal','outlaw':'forajidos','tragedy':'tragedia','new mexico':'Nuevo México','texas':'Texas','california':'California','chicago, illinois':'Chicago','las vegas':'Las Vegas','mexico':'México','italy':'Italia','france':'Francia','germany':'Alemania','japan':'Japón','china':'China','russia':'Rusia','england':'Inglaterra','scotland':'Escocia','ireland':'Irlanda','africa':'África','india':'India','south korea':'Corea del Sur','australia':'Australia','canada':'Canadá','brazil':'Brasil','argentina':'Argentina','crime boss':'capos del crimen','organized crime':'crimen organizado','gang':'bandas','money laundering':'blanqueo de dinero','fraud':'estafas','con artist':'estafadores','robbery':'robos','thief':'ladrones','bank':'bancos','prison guard':'carceleros','fbi':'FBI','cia':'CIA','secret agent':'agentes secretos','secret service':'servicios secretos','undercover':'infiltrados','undercover cop':'policía infiltrado','police officer':'policías','police detective':'detectives de policía','corrupt cop':'policías corruptos','murder investigation':'investigación de asesinato','missing person':'desapariciones','whodunit':'¿quién lo hizo?','mystery':'misterio','suspense':'suspense','neo-noir':'neo-noir','film noir':'cine negro','violence':'violencia','gore':'gore','slasher':'slasher','psychological horror':'terror psicológico','body horror':'terror corporal','found footage':'metraje encontrado','possession':'posesiones','exorcism':'exorcismos','demon':'demonios','devil':'el diablo','satanism':'satanismo','cult':'sectas','religion':'religión','faith':'fe','church':'iglesia','priest':'sacerdotes','nun':'monjas','witchcraft':'brujería','curse':'maldiciones','werewolf':'hombres lobo','mutant':'mutantes','superpower':'superpoderes','marvel cinematic universe (mcu)':'Universo Marvel','dc extended universe (dceu)':'Universo DC','based on comic book':'basada en un cómic','based on video game':'basada en un videojuego','based on play or musical':'basada en una obra de teatro','based on short story':'basada en un relato','based on true events':'basada en hechos reales','based on memoir or autobiography':'basada en memorias','based on tv series':'basada en una serie','biopic':'biopic','historical':'histórica','history':'historia','period drama':'drama de época','19th century':'siglo XIX','1920s':'años 20','1930s':'años 30','1940s':'años 40','1950s':'años 50','1960s':'años 60','1970s':'años 70','1980s':'años 80','1990s':'años 90','nazi':'nazis','holocaust':'Holocausto','soldier':'soldados','army':'ejército','military':'militares','war':'guerra','battle':'batallas','civil war':'guerra civil','spanish civil war':'Guerra Civil española','american civil war':'guerra de Secesión','korean war':'guerra de Corea','iraq war':'guerra de Irak','afghanistan':'Afganistán','submarine':'submarinos','pilot':'pilotos','airplane':'aviones','plane crash':'accidente aéreo','disaster':'catástrofes','natural disaster':'desastres naturales','earthquake':'terremotos','tsunami':'tsunamis','pandemic':'pandemias','virus':'virus','epidemic':'epidemias','apocalypse':'apocalipsis','end of the world':'el fin del mundo','nuclear war':'guerra nuclear','climate change':'cambio climático','environmental':'medio ambiente','nature':'naturaleza','animal':'animales','dog':'perros','cat':'gatos','horse':'caballos','wildlife':'fauna salvaje','jungle':'selva','mountain':'montaña','snow':'nieve','winter':'invierno','summer':'verano','beach':'playa','sea':'mar','underwater':'bajo el agua','ship':'barcos','boat':'barcos','shipwreck':'naufragios','treasure':'tesoros','treasure hunt':'búsqueda del tesoro','adventure':'aventura','quest':'misión','journey':'viaje','road movie':'road movie','travel':'viajes','escape':'huidas','chase':'persecuciones','car':'coches','motorcycle':'motos','train':'trenes','spaceship':'naves espaciales','space station':'estaciones espaciales','mars':'Marte','moon':'la Luna','planet':'planetas','astronaut':'astronautas','alien invasion':'invasión alienígena','first contact':'primer contacto','extraterrestrial technology':'tecnología extraterrestre','cyberpunk':'cyberpunk','android':'androides','cyborg':'cíborgs','technology':'tecnología','social media':'redes sociales','internet':'internet','video game':'videojuegos','simulation':'simulaciones','clone':'clones','genetic engineering':'ingeniería genética','scientist':'científicos','experiment':'experimentos','mad scientist':'científico loco','dream':'sueños','dreams':'sueños','memory':'memoria','memory loss':'pérdida de memoria','identity':'identidad','double life':'doble vida','doppelganger':'dobles','twins':'gemelos','unreliable narrator':'narrador poco fiable','nonlinear timeline':'narración no lineal','flashback':'flashbacks','mind-bending':'para pensar','philosophy':'filosofía','existentialism':'existencialismo','surrealism':'surrealismo','absurdism':'absurdo','dark fantasy':'fantasía oscura','fantasy world':'mundo de fantasía','sword and sorcery':'espada y brujería','elves':'elfos','wizard':'magos','prophecy':'profecías','chosen one':'el elegido','good versus evil':'el bien contra el mal','hero':'héroes','villain':'villanos','anti hero':'antihéroes','vigilante':'justicieros','redemption':'redención','betrayal':'traición','loyalty':'lealtad','sacrifice':'sacrificio','power':'poder','greed':'codicia','ambition':'ambición','money':'dinero','wealth':'riqueza','poverty':'pobreza','class differences':'diferencias sociales','social commentary':'crítica social','racism':'racismo','sexism':'machismo','feminism':'feminismo','immigration':'inmigración','refugee':'refugiados','dictatorship':'dictaduras','rebellion':'rebelión','revolution':'revolución','resistance':'resistencia','government':'gobierno','president':'presidentes','election':'elecciones','political thriller':'thriller político','espionage':'espionaje','assassination':'asesinatos políticos','bomb':'bombas','explosion':'explosiones','gun':'armas','shootout':'tiroteos','sniper':'francotiradores','martial arts master':'maestros de artes marciales','kung fu':'kung fu','fight':'peleas','tournament':'torneos','competition':'competición','underdog':'el más débil','coach':'entrenadores','basketball':'baloncesto','baseball':'béisbol','american football':'fútbol americano','tennis':'tenis','golf':'golf','olympics':'Juegos Olímpicos','chess':'ajedrez','gambling':'apuestas','casino':'casinos','poker':'póquer','band':'grupos de música','rock music':'rock','hip-hop':'hip-hop','jazz':'jazz','singer':'cantantes','musician':'músicos','concert':'conciertos','theater':'teatro','actor':'actores','hollywood':'Hollywood','filmmaking':'rodajes de cine','movie business':'industria del cine','writer':'escritores','artist':'artistas','painter':'pintores','photographer':'fotógrafos','fashion':'moda','cooking':'cocina','chef':'cocineros','restaurant':'restaurantes','food':'comida','hotel':'hoteles','office':'oficinas','workplace':'trabajo','boss':'jefes','job':'trabajo','school':'colegio','teacher':'profesores','student':'estudiantes','college':'universidad','university':'universidad','teenager':'adolescentes','teen':'adolescentes','childhood':'infancia','child':'niños','kids':'niños','baby':'bebés','pregnancy':'embarazo','parenting':'crianza','single mother':'madres solteras','single father':'padres solteros','father daughter relationship':'padres e hijas','mother son relationship':'madres e hijos','brother brother relationship':'hermanos','sister sister relationship':'hermanas','siblings':'hermanos','sibling rivalry':'rivalidad entre hermanos','dysfunctional family':'familias disfuncionales','marriage':'matrimonio','divorce':'divorcio','infidelity':'infidelidad','love triangle':'triángulo amoroso','first love':'primer amor','romantic comedy':'comedia romántica','unrequited love':'amor no correspondido','forbidden love':'amor prohibido','lovers':'amantes','sex':'sexo','erotic':'erótica','lgbt teen':'adolescentes LGTBI','transgender':'personas trans','lesbian':'lésbica','homosexuality':'homosexualidad','old age':'vejez','death':'muerte','suicide':'suicidio','depression':'depresión','trauma':'trauma','ptsd':'estrés postraumático','disability':'discapacidad','blindness':'ceguera','illness':'enfermedad','hospital':'hospitales','doctor':'médicos','nurse':'enfermeras','medicine':'medicina','alcoholism':'alcoholismo','loss of loved one':'pérdida de un ser querido','mourning':'duelo','hope':'esperanza','friends':'amigos','best friend':'mejores amigos','neighbor':'vecinos','roommate':'compañeros de piso','strangers':'desconocidos','isolation':'aislamiento','small town life':'vida de pueblo','rural setting':'mundo rural','farm':'granjas','village':'pueblos','city':'ciudad','suburb':'afueras','urban':'urbana','new york':'Nueva York','manhattan, new york city':'Manhattan','brooklyn, new york city':'Brooklyn','washington dc, usa':'Washington','boston, massachusetts':'Boston','san francisco, california':'San Francisco','miami, florida':'Miami','new orleans, louisiana':'Nueva Orleans','rome, italy':'Roma','berlin, germany':'Berlín','moscow, russia':'Moscú','seoul, south korea':'Seúl','hong kong':'Hong Kong','dark humor':'humor negro','black comedy':'comedia negra','slapstick comedy':'humor absurdo','buddy comedy':'comedia de colegas','buddy cop':'pareja de policías','mockumentary':'falso documental','anthology':'antología','short film':'cortometraje','silent film':'cine mudo','black and white':'blanco y negro','stop motion':'stop motion','computer animation':'animación por ordenador','hand drawn animation':'animación tradicional','talking animal':'animales que hablan','toy':'juguetes','princess':'princesas','fairy':'hadas','mermaid':'sirenas','giant monster':'monstruos gigantes','creature':'criaturas','creature feature':'criaturas','evil doll':'muñecos diabólicos','clown':'payasos','killer':'asesinos','masked killer':'asesino enmascarado','home invasion':'allanamiento','stalker':'acosadores','obsession':'obsesión','paranoia':'paranoia','manipulation':'manipulación','blackmail':'chantaje','secret':'secretos','lie':'mentiras','trust':'confianza','cat and mouse':'el gato y el ratón','race against time':'contrarreloj','one night':'en una noche','real time':'en tiempo real','single location':'un solo escenario','survival horror':'terror de supervivencia','cannibalism':'canibalismo','torture':'tortura','vengeance':'venganza','revenge thriller':'thriller de venganza','tough guy':'tipos duros','mercenary':'mercenarios','special forces':'fuerzas especiales','rescue':'rescates','rescue mission':'misión de rescate','heist gone wrong':'atraco fallido','kidnapping plot':'secuestro','ransom':'rescate','cop':'policías','sheriff':'sheriffs','bounty hunter':'cazarrecompensas','gunslinger':'pistoleros','wild west':'Lejano Oeste','native american':'nativos americanos','frontier':'la frontera','ranch':'ranchos'};
    // Etiquetas técnicas de TMDB que no dicen nada del argumento
    const _TEMAS_FUERA = new Set(['duringcreditsstinger','aftercreditsstinger','woman director','miniseries','sequel','remake','prequel','spin off','3d']);
    async function cargarTemas(id,tipo){
      const box = document.getElementById('d-temas-box'), el = document.getElementById('d-temas'), p = peliculaActual;
      box.style.display = 'none'; el.innerHTML = '';
      const pos = document.getElementById('d-poscreditos'); pos.style.display = 'none';
      try{
        const d = await _tmdbJson(`/${tipo}/${id}/keywords`);
        if(peliculaActual!==p) return;
        // TMDB marca las películas con escena durante o después de los créditos
        const claves = new Set((d.keywords || d.results || []).map(k=>String(k.name||'').toLowerCase()));
        const durante = claves.has('duringcreditsstinger'), despues = claves.has('aftercreditsstinger');
        _basadaEn(p, {hechos: claves.has('based on true story') || claves.has('based on real events') || claves.has('biography')});
        if(durante || despues){
          pos.innerHTML = `🍿 <b>No te levantes:</b> ${durante && despues ? 'tiene escenas durante y después de los créditos' : durante ? 'tiene una escena durante los créditos' : 'tiene una escena al final de los créditos'}`;
          pos.style.display = 'block';
        }
        const kws = (d.keywords || d.results || []).filter(k=>k && k.name && !_TEMAS_FUERA.has(k.name.toLowerCase()))
          .map(k=>({id:k.id, nombre:_TEMAS_ES[k.name.toLowerCase()] || null, en:k.name}));
        // Se muestran los temas traducidos; los que solo existen en inglés, únicamente si no hay ninguno traducido
        const traducidos = kws.filter(k=>k.nombre), vistosNom = new Set();
        const lista = (traducidos.length ? traducidos : kws.slice(0,5)).filter(k=>{ const n=(k.nombre||k.en).toLowerCase(); if(vistosNom.has(n)) return false; vistosNom.add(n); return true; }).slice(0,10);
        if(!lista.length) return;
        window._temasFicha = lista;
        el.innerHTML = lista.map((k,i)=>`<button type="button" class="tema-chip" onclick="abrirTema(${i})">${_escHtml(k.nombre || k.en)}</button>`).join('');
        box.style.display = 'block';
      }catch(e){}
    }
    // Lista con lo mejor valorado sobre ese tema (mismo tipo que la ficha), sin lo que ya has visto
    async function abrirTema(i){
      const k = (window._temasFicha||[])[i], p = peliculaActual; if(!k || !p) return;
      const tipo = p._tipo, nombre = k.nombre || k.en, plural = tipo==='tv' ? 'series' : 'películas';
      const esp = {id:'tema-'+k.id, categoria:'tema', dinamico:true, tipoFijo:true, soloPeliculas:tipo==='movie',
        emoji:'🏷️', icono:'🏷️', titulo:`Tema: ${nombre}`, color:'#b52c29', colorBg:'#2a1614', colorSoft:'#f2a69f',
        bannerTitulo:`Tema: <span>${_escHtml(nombre)}</span>`,
        bannerSub:`Las ${plural} más valoradas sobre este tema. No incluye lo que ya has visto.`, sub:'', items:[]};
      window._origenEspecial = 'p-detalle';
      _pintarEspecialCargando(esp, false);
      try{
        const pags = await Promise.all([1,2].map(n=>_tmdbJson(`/discover/${tipo}&language=es-ES&with_keywords=${k.id}&sort_by=vote_count.desc&page=${n}`)));
        const vistos = window.idsVistosSet || new Set(), ya = new Set();
        const items = _numerar(pags.flatMap(d=>d.results||[])
          .filter(r=>r.poster_path && r.id!==p.id && !vistos.has(`${r.id}-${tipo}`) && !ya.has(r.id) && ya.add(r.id))
          .map(r=>_itemDesdeTmdb(r, tipo, '')));
        if(!window.especialActual || window.especialActual.id!==esp.id) return;
        _pintarEspecial({...esp, items, sub:`${items.length} ${plural}`});
      }catch(e){ if(window.especialActual && window.especialActual.id===esp.id) _pintarEspecialCargando(esp, true); }
    }
    function volverDeEspecial(){
      const o = window._origenEspecial; window._origenEspecial = null;
      if(o) irA(o, true);
      else if(_navEstado().i>0) history.back(); // a la pantalla de la que viniste (Descubre, Especiales…)
      else irA('p-especiales-hub', true);
    }
    // ── Guion y música, a partir de los créditos ──
    function _pintarEquipo(crew, p){
      const el = document.getElementById('d-equipo'); if(!el || peliculaActual!==p) return;
      const nombres = jobs => [...new Set(crew.filter(c=>jobs.includes(c.job)).map(c=>c.name))];
      const guion = nombres(['Screenplay','Writer','Story','Novel','Author','Characters']).slice(0,4);
      const musica = nombres(['Original Music Composer','Music','Composer']).slice(0,3);
      const foto = nombres(['Director of Photography']).slice(0,2);
      const filas = [['Guion', guion], ['Música', musica], ['Fotografía', foto]].filter(([,n])=>n.length);
      el.innerHTML = filas.length ? `<div class="ficha-equipo">${filas.map(([k,n])=>`<div><span>${k}</span>${n.map(_escHtml).join(', ')}</div>`).join('')}</div>` : '';
    }
    // ── Calificación por edad (España; si no hay, la de EE. UU.) ──
    async function cargarCalificacion(id, tipo){
      const el = document.getElementById('d-calif'), p = peliculaActual;
      el.style.display = 'none'; el.textContent = '';
      const est = document.getElementById('d-estreno'); est.style.display = 'none'; est.innerHTML = '';
      try{
        let es = '', us = '';
        if(tipo==='movie'){
          const d = await _tmdbJson(`/movie/${id}/release_dates`);
          const de = c => ((d.results||[]).find(r=>r.iso_3166_1===c)?.release_dates||[]).map(x=>x.certification).find(Boolean) || '';
          es = de('ES'); us = de('US');
          if(peliculaActual===p) _pintarEstreno(d.results||[], est);
        } else {
          const d = await _tmdbJson(`/tv/${id}/content_ratings`);
          const de = c => (d.results||[]).find(r=>r.iso_3166_1===c)?.rating || '';
          es = de('ES'); us = de('US');
        }
        if(peliculaActual!==p) return;
        const texto = es ? (/^(A|TP|APTA|ALL)$/i.test(es) ? 'Todos los públicos' : `No recomendada para menores de ${es.replace(/\D/g,'')||es} años`) : us ? `Calificación EE. UU.: ${us}` : '';
        const corto = es ? (/^(A|TP|APTA|ALL)$/i.test(es) ? 'TP' : `+${es.replace(/\D/g,'')||es}`) : us;
        if(!texto) return;
        el.innerHTML = `<span class="calif-badge">${_escHtml(corto)}</span> ${_escHtml(texto)}`;
        el.style.display = 'block';
      }catch(e){}
    }
    // Cuándo llega a los cines de España y cuándo se puede ver en casa (alquiler/compra digital).
    // Solo se muestra en películas recientes o por estrenar: en las antiguas no aporta nada.
    function _pintarEstreno(paises, el){
      const fechas = (c, tipos) => ((paises.find(r=>r.iso_3166_1===c)||{}).release_dates||[]).filter(x=>tipos.includes(x.type) && x.release_date).map(x=>x.release_date.slice(0,10)).sort();
      const hoy = new Date().toISOString().slice(0,10);
      const dias = f => Math.round((new Date(f+'T12:00:00') - new Date(hoy+'T12:00:00'))/86400000);
      const cineES = fechas('ES',[3])[0] || fechas('ES',[2])[0];
      const cineRef = cineES || fechas('US',[3])[0] || paises.flatMap(r=>(r.release_dates||[]).filter(x=>x.type===3).map(x=>x.release_date.slice(0,10))).sort()[0];
      let casa = fechas('ES',[4])[0], casaPais = '';
      if(!casa){ casa = fechas('US',[4])[0]; if(casa) casaPais = ' (EE. UU.)'; }
      // Películas que salen directamente en plataforma (sin cines): la fecha "digital" es su estreno
      if(!cineRef && !casa) return;
      const reciente = f => f && dias(f) > -240;
      if(!reciente(cineRef) && !reciente(casa)) return;
      const larga = f => new Date(f+'T12:00:00').toLocaleDateString('es-ES',{day:'numeric',month:'long',...(f.slice(0,4)!==hoy.slice(0,4)?{year:'numeric'}:{})});
      const lineas = [];
      if(cineES) lineas.push(dias(cineES)>0 ? `🎟️ <b>En cines el ${larga(cineES)}</b>` : dias(cineES)===0 ? '🎟️ <b>Se estrena hoy en cines</b>' : `🎟️ En cines desde el ${larga(cineES)}`);
      else if(cineRef && dias(cineRef)>-60) lineas.push('🎟️ Sin fecha de estreno en cines de España');
      if(casa) lineas.push(dias(casa)>0 ? `🏠 <b>En casa (alquiler o compra digital) el ${larga(casa)}${casaPais}</b>` : `🏠 Ya se puede ver en casa desde el ${larga(casa)}${casaPais}`);
      else if(cineRef && dias(cineRef)>-240) lineas.push('🏠 Aún sin fecha para verla en casa');
      if(!lineas.length) return;
      el.innerHTML = lineas.map(l=>`<div>${l}</div>`).join('');
      el.style.display = 'block';
    }
    function _idiomaMayus(c){ const n = _idioma(c) || c; return n.charAt(0).toUpperCase()+n.slice(1); }
    async function cargarPlataformas(id,tipo){
      const div=document.getElementById('d-plataformas');
      const p=peliculaActual;
      try{
        const data=await(await fetch(`${TMDB_PROXY}?path=/${tipo}/${id}/watch/providers`)).json();
        if(peliculaActual!==p)return;
        const es=data.results?.ES;
        const grupos=[['Incluida en',[...(es?.flatrate||[]),...(es?.free||[]),...(es?.ads||[])]],['Alquiler',es?.rent||[]],['Compra',es?.buy||[]]];
        const vistos=new Set();
        const html=grupos.map(([label,lista])=>{
          // una plataforma que ya sale como incluida no se repite en alquiler/compra
          const unicos=lista.filter(x=>x&&x.logo_path&&!vistos.has(x.provider_id)&&vistos.add(x.provider_id)).sort((a,b)=>(a.display_priority||0)-(b.display_priority||0));
          return unicos.length?`<div class="plataformas-grupo"><div class="plataformas-grupo-label">${label}</div><div class="plataformas-row">${unicos.map(x=>`<img class="plataforma-logo" loading="lazy" src="https://image.tmdb.org/t/p/w92${x.logo_path}" alt="${_escHtml(x.provider_name)}" title="${_escHtml(x.provider_name)}">`).join('')}</div></div>`:'';
        }).join('');
        const enlace=_urlHttps(es?.link||'');
        div.innerHTML=html
          ?html+(enlace?`<a class="plataformas-enlace" href="${_escHtml(enlace)}" target="_blank" rel="noopener">Ver precios y enlaces →</a>`:'')
          :'<span style="color:var(--k-767973);font-size:13px">No disponible en plataformas en España</span>';
      }catch(e){if(peliculaActual!==p)return;div.innerHTML='<span style="color:var(--k-767973);font-size:13px">No se pudo cargar</span>';}
    }

    function abrirPersonaDesdeDetalle(persona){mostrarFilmografia(persona.id,persona.name,persona.profile_path||'',persona._rol);}
    async function abrirPersonaActor(i){const a=window.repartoActual[i];await mostrarFilmografia(a.id,a.name,a.profile_path||'','Actor');}
    const GENEROS_NO_FICCION_TV = new Set([10763,10764,10767]); // TMDB TV: Noticias, Reality, Talk show
    async function mostrarFilmografia(id,nombre,foto,rol,desdeHistorial){
      window._personaArgs = {id, nombre, foto, rol};
      document.getElementById('p-nombre').textContent=nombre;document.getElementById('p-rol').textContent=rol;
      document.getElementById('p-foto').src=foto?'https://image.tmdb.org/t/p/w185'+foto:'';
      document.getElementById('p-progreso').textContent='';
      window._personaNac = null;
      _pintarDatosPersona(id);
      _pintarPremiosPersona(id);
      document.getElementById('p-conocida').innerHTML=''; document.getElementById('p-breves').innerHTML=''; document.getElementById('p-colabs').innerHTML=''; document.getElementById('fm-generos').innerHTML='';
      document.querySelector('#p-persona .persona-mosaico')?.remove();
      document.getElementById('filmografia-orden').style.display='none';
      document.getElementById('p-filmografia').innerHTML=Array(6).fill(`
        <div class="fm-fila"><div class="skeleton fm-img"></div><div class="fm-info">
          <div class="skeleton" style="height:12px;width:70%;border-radius:3px;margin-bottom:6px"></div>
          <div class="skeleton" style="height:10px;width:40%;border-radius:3px"></div></div></div>`).join('');
      irA('p-persona', false, desdeHistorial);
      try{
        const data=await(await fetch(`${TMDB_PROXY}?path=/person/${id}/combined_credits&language=es-ES`)).json();
        let esCast = !(rol==='Director'||rol==='Creador'||rol==='Productor'||rol==='Productor ejecutivo');
        let creditos=rol==='Director'||rol==='Creador'?(data.crew||[]).filter(p=>p.job==='Director'||p.job==='Creator'||p.department==='Directing'):rol==='Productor'||rol==='Productor ejecutivo'?(data.crew||[]).filter(p=>p.job==='Producer'||p.job==='Executive Producer'):(data.cast||[]);
        // Música, fotografía, montaje, guion…: si su trabajo está en el equipo y no delante de la cámara, se usa eso
        if(esCast && !/^Actor|^Actriz/.test(rol) && (data.crew||[]).length > (data.cast||[]).length){ creditos = data.crew||[]; esCast = false; }
        // TMDB da una entrada por personaje o trabajo: se juntan en una sola por título (con todos sus papeles y episodios)
        const porTitulo = new Map();
        creditos.forEach(c=>{
          const k = `${c.media_type||'movie'}:${c.id}`, x = porTitulo.get(k);
          const papel = esCast ? String(c.character||'').trim() : ({Director:'Dirección',Creator:'Creación',Producer:'Producción','Executive Producer':'Producción ejecutiva','Original Music Composer':'Música',Music:'Música','Director of Photography':'Fotografía',Editor:'Montaje',Screenplay:'Guion',Writer:'Guion',Story:'Historia',Novel:'Novela',Characters:'Personajes','Casting':'Casting','Production Design':'Diseño de producción','Costume Design':'Vestuario'}[c.job]||c.job||'');
          if(!x) porTitulo.set(k, {...c, _papeles: papel ? [papel] : [], _eps: c.episode_count||0});
          else{ if(papel && !x._papeles.includes(papel)) x._papeles.push(papel); x._eps += c.episode_count||0; }
        });
        const limpiarPapel = t => t.replace(/\s*\((voice|uncredited|archive footage)\)/ig, m=>/voice/i.test(m)?' (voz)':'').trim();
        let pelis = [...porTitulo.values()].filter(p=>{
          if(!p.poster_path || (p.vote_count||0)<=30) return false;
          if((p.genre_ids||[]).some(g=>GENEROS_NO_FICCION_TV.has(g))) return false; // fuera: noticias, reality, talk shows
          if(esCast){
            p._papeles = p._papeles.filter(x=>!/^(self|himself|herself|themselves|él mismo|ella misma)\b/i.test(x));
            if(!p._papeles.length) return false; // fuera: apariciones como "él mismo"
          }
          return true;
        });
        pelis.forEach(p=>{
          p.title=p.title||p.name; p.release_date=p.release_date||p.first_air_date; p._tipo=p.media_type||'movie'; p._crew=!esCast;
          // «Doctor Strange (voz) / Strange Supreme (voz)», «Doctor Strange / Strange Supreme»… → nombres únicos y «(voz)» una sola vez
          const nombres = p._papeles.map(limpiarPapel).flatMap(x=>x.split(/\s*\/\s*/)).filter(Boolean);
          p._voz = nombres.some(x=>/\(voz\)/i.test(x));
          const vistosN = new Set();
          p._papel = nombres.map(x=>x.replace(/\s*\(voz\)/ig,'').trim()).filter(x=>{ const k = normalizarTitulo(x).replace(/[^a-z0-9]/g,''); if(!k || vistosN.has(k)) return false; vistosN.add(k); return true; });
          // aparición breve: 1–2 episodios de una serie, o un papel sin acreditar
          p._breve = esCast && ((p._tipo==='tv' && p._eps>0 && p._eps<=2) || creditos.some(c=>c.id===p.id && /uncredited/i.test(c.character||'')));
        });
        const vistosSet = window.idsVistosSet || new Set();
        pelis.forEach(p=>{ p._visto = vistosSet.has(`${p.id}-${p._tipo}`); });
        window.filmografiaActual=pelis.filter(p=>!p._breve);
        window.filmografiaBreves=pelis.filter(p=>p._breve).sort((a,b)=>(b.vote_count||0)-(a.vote_count||0));
        window.filmografiaOrden='ano'; window.filmografiaTipo='todo'; window.filmografiaGenero=0;
        _pintarGenerosFilmografia();
        document.getElementById('fm-orden').value='ano';
        const principales = window.filmografiaActual, vistas = principales.filter(p=>p._visto).length;
        document.getElementById('p-progreso').textContent = principales.length ? `Has visto ${vistas} de ${principales.length} · te faltan ${principales.length-vistas}` : '';
        document.getElementById('filmografia-orden').style.display = principales.length>1 ? 'flex' : 'none';
        // lo más conocido, en grande y arriba (por número de votos: lo que más gente ha visto)
        window._fmTop = principales.slice().sort((a,b)=>(b.vote_count||0)-(a.vote_count||0)).slice(0,8);
        _pintarMosaicoPersona(window._fmTop);
        document.getElementById('p-conocida').innerHTML = window._fmTop.length>=3 ? `<div class="fm-k">Lo más conocido</div><div class="fm-top">${window._fmTop.map((p,i)=>`
          <div class="fm-top-c" onclick="abrirDetalle(_fmTop[${i}])" ${_lp({id:p.id,tipo:p._tipo,t:p.title,poster:p.poster_path,f:p.release_date})}>
            <div class="fm-top-img"><img loading="lazy" src="https://image.tmdb.org/t/p/w185${p.poster_path}" alt="">${p._visto?'<span class="fm-check">✓</span>':''}</div>
            <div class="fm-top-t">${_escHtml(p.title)}</div>${p._papel[0] ? `<div class="fm-top-p">${_escHtml(p._papel[0])}${p._voz?' (voz)':''}</div>` : ''}</div>`).join('')}</div>` : '';
        const nP = principales.filter(p=>p._tipo==='movie').length, nS = principales.length-nP;
        document.getElementById('fm-tipos').innerHTML = (nP && nS) ? [['todo',`Todo ${principales.length}`],['movie',`Pelis ${nP}`],['tv',`Series ${nS}`]].map(([k,t])=>`<button type="button" class="fm-tipo${k==='todo'?' activo':''}" data-t="${k}" onclick="filtrarFilmografia('${k}')">${t}</button>`).join('') : '';
        const br = window.filmografiaBreves;
        document.getElementById('p-breves').innerHTML = br.length ? `<button type="button" class="fm-breves-b" onclick="const l=this.nextElementSibling;l.hidden=!l.hidden;this.querySelector('i').textContent=l.hidden?'▾':'▴'">Apariciones breves y cameos · ${br.length} <i>▾</i></button>
          <div class="fm-lista" hidden>${br.map((p,i)=>_filaFilmografia(p, `abrirDetalle(filmografiaBreves[${i}])`)).join('')}</div>` : '';
        renderFilmografiaGrid();
        _pintarColaboradores(id, esCast);
      }catch(e){document.getElementById('p-filmografia').innerHTML='<p style="color:var(--k-767973);font-size:13px">No se pudo cargar.</p>';}
    }
    // Edad, nacimiento y biografía (en español; si TMDB no la tiene, en inglés)
    async function _pintarDatosPersona(id){
      const datos = document.getElementById('p-datos'), bio = document.getElementById('p-bio');
      datos.textContent = ''; bio.hidden = true; bio.innerHTML = '';
      window._personaActual = id;
      try{
        let d = await _tmdbJson(`/person/${id}&language=es-ES`), enIngles = false;
        if(!d.biography){ try{ const en = await _tmdbJson(`/person/${id}&language=en-US`); if(en.biography){ d = {...d, biography:en.biography}; enIngles = true; } }catch(e){} }
        if(window._personaActual!==id) return;
        const img = document.getElementById('p-foto'); if(!img.getAttribute('src') && d.profile_path) img.src = 'https://image.tmdb.org/t/p/w185'+d.profile_path;
        const fecha = f => new Date(f+'T12:00:00').toLocaleDateString('es-ES',{day:'numeric',month:'long',year:'numeric'});
        const edad = (desde, hasta) => { const a = new Date(desde+'T12:00:00'), b = hasta ? new Date(hasta+'T12:00:00') : new Date(); let e = b.getFullYear()-a.getFullYear(); if(b < new Date(b.getFullYear(), a.getMonth(), a.getDate())) e--; return e; };
        const partes = [];
        if(d.birthday) partes.push(d.deathday ? `${fecha(d.birthday)} – ${fecha(d.deathday)} (${edad(d.birthday, d.deathday)} años)` : `Nació el ${fecha(d.birthday)} · ${edad(d.birthday)} años`);
        if(d.place_of_birth) partes.push(d.place_of_birth);
        datos.textContent = partes.join(' · ');
        // con la fecha de nacimiento ya se puede poner la edad en cada título
        window._personaNac = {id, b:d.birthday||'', d:d.deathday||''};
        if(d.birthday && window.filmografiaActual) renderFilmografiaGrid();
        if(d.biography){
          bio.innerHTML = `<p class="persona-bio-t">${_escHtml(d.biography).replace(/\n\n+/g,'</p><p class="persona-bio-t">')}</p>${enIngles ? '<p class="persona-bio-nota">Biografía en inglés: no está traducida en TMDB.</p>' : ''}
            <button type="button" class="persona-bio-mas" onclick="const b=document.getElementById('p-bio');b.classList.toggle('abierta');this.textContent=b.classList.contains('abierta')?'Leer menos ▴':'Leer biografía completa ▾'">Leer biografía completa ▾</button>`;
          bio.hidden = false;
        }
      }catch(e){}
    }
    // Con quién trabaja más: se mira el reparto y el equipo de sus 15 películas más conocidas
    async function _pintarColaboradores(id, esCast){
      const el = document.getElementById('p-colabs'); if(!el) return;
      const pelis = (window.filmografiaActual||[]).filter(p=>p._tipo==='movie').sort((a,b)=>(b.vote_count||0)-(a.vote_count||0)).slice(0,15);
      if(pelis.length<4) return;
      el.innerHTML = '<div class="fm-k">Con quién trabaja más</div><p class="rk-ayuda">Buscando…</p>';
      const creds = await _fetchEnLotes(pelis, p=>_tmdbCacheado(`/movie/${p.id}/credits&language=es-ES`).catch(()=>null), 5);
      if(window._personaActual!==id) return;
      const contar = (lista, min) => {
        const m = new Map();
        lista.forEach(({c, peli})=>{ if(!c || c.id===id) return; const x = m.get(c.id) || {c, pelis:new Map()}; x.pelis.set(peli.id, peli); m.set(c.id, x); });
        return [...m.values()].filter(x=>x.pelis.size>=min).sort((a,b)=>b.pelis.size-a.pelis.size || (b.c.popularity||0)-(a.c.popularity||0)).slice(0,10);
      };
      const de = fn => creds.flatMap((cr,i)=>cr ? fn(cr).map(c=>({c, peli:pelis[i]})) : []);
      const grupos = esCast
        ? [['Directores con los que más repite', contar(de(cr=>(cr.crew||[]).filter(c=>c.job==='Director')), 2), 'Director'],
           ['Con quién más comparte reparto', contar(de(cr=>(cr.cast||[]).filter(c=>c.order<10)), 3), 'Actor']]
        : [['Sus actores fetiche', contar(de(cr=>(cr.cast||[]).filter(c=>c.order<10)), 2), 'Actor'],
           ['Su equipo habitual', contar(de(cr=>(cr.crew||[]).filter(c=>['Original Music Composer','Director of Photography','Editor','Screenplay','Producer'].includes(c.job))), 2), 'Equipo']];
      const ROL = {'Original Music Composer':'Música','Director of Photography':'Fotografía', Editor:'Montaje', Screenplay:'Guion', Producer:'Producción'};
      window._colabs = [];
      const html = grupos.filter(([,l])=>l.length).map(([titulo, l, rol])=>`<div class="fm-k">${titulo}</div><div class="colab-fila">${l.map(x=>{
        const titulos = [...x.pelis.values()].map(q=>q.title);
        const i = window._colabs.push({id:x.c.id, n:x.c.name, f:x.c.profile_path||'', r:rol==='Equipo' ? (ROL[x.c.job]||'Equipo') : rol, pelis:[...x.pelis.values()], yo:id}) - 1;
        return `<button type="button" class="colab" onclick="abrirColab(${i})" title="${_escHtml(titulos.join(', '))}">
          <span class="colab-img">${x.c.profile_path ? `<img loading="lazy" src="https://image.tmdb.org/t/p/w185${x.c.profile_path}" alt="">` : `<span>${_escHtml((x.c.name||'?').charAt(0))}</span>`}<i>×${x.pelis.size}</i></span>
          <span class="colab-n">${_escHtml(x.c.name)}</span><span class="colab-r">${rol==='Equipo' ? (ROL[x.c.job]||'') : _escHtml(titulos.slice(0,2).join(', '))}</span></button>`;
      }).join('')}</div>`).join('');
      el.innerHTML = html;
    }
    // Hoja «Juntos en…»: todas las películas que han hecho juntos (TMDB) y acceso a su filmografía
    async function abrirColab(i){
      const x = (window._colabs||[])[i]; if(!x) return;
      const yo = document.getElementById('p-nombre').textContent;
      let h = document.getElementById('juntos-hoja');
      if(!h){ h = document.createElement('div'); h.id = 'juntos-hoja'; h.className = 'juntos-fondo'; h.onclick = e=>{ if(e.target===h) cerrarJuntos(); }; document.body.appendChild(h); }
      const pintar = (lista, nota) => {
        window._juntos = lista;
        h.innerHTML = `<div class="juntos-hoja"><div class="juntos-asa"></div>
          <div class="juntos-cab"><span class="rep-img">${x.f ? `<img src="https://image.tmdb.org/t/p/w92${x.f}" alt="">` : `<span>${_escHtml(x.n.charAt(0))}</span>`}</span>
            <div><div class="juntos-t">${_escHtml(yo)} y ${_escHtml(x.n)}</div><div class="juntos-m">${lista.length} ${lista.length===1?'película juntos':'películas juntos'}${nota||''}</div></div>
            <button type="button" class="galeria-cerrar juntos-x" onclick="cerrarJuntos()" aria-label="Cerrar">✕</button></div>
          <div class="desc-rejilla juntos-rejilla">${lista.map((p,j)=>_descTarjeta(p, '_juntos', j)).join('')}</div>
          <button type="button" class="cta-btn juntos-ir" onclick="cerrarJuntos();mostrarFilmografia(${Number(x.id)}, ${JSON.stringify(x.n).replace(/"/g,'&quot;')}, '${x.f||''}', '${_escHtml(x.r)}')">Ver la filmografía de ${_escHtml(x.n)} ›</button></div>`;
      };
      const locales = (x.pelis||[]).map(p=>({...p, _tipo:'movie'})).sort((a,b)=>(b.release_date||'').localeCompare(a.release_date||''));
      pintar(locales, ' · buscando más…');
      h.style.display = 'flex'; document.body.style.overflow = 'hidden';
      // TMDB devuelve todas las películas en las que aparecen los dos (delante o detrás de la cámara)
      try{
        const yoId = x.yo, pags = await Promise.all([1,2].map(pg=>_tmdbJson(`/discover/movie&language=es-ES&with_people=${Number(yoId)},${Number(x.id)}&sort_by=primary_release_date.desc&page=${pg}`).catch(()=>({}))));
        if(h.style.display==='none') return;
        const todas = pags.flatMap(d=>d.results||[]).filter(p=>p.poster_path).map(p=>({...p, _tipo:'movie', title:p.title||p.name}));
        const ya = new Set(), lista = [...todas, ...locales].filter(p=>!ya.has(p.id) && ya.add(p.id)).sort((a,b)=>(b.release_date||'').localeCompare(a.release_date||''));
        pintar(lista, '');
      }catch(e){ pintar(locales, ''); }
    }
    function cerrarJuntos(){ const h = document.getElementById('juntos-hoja'); if(h){ h.style.display = 'none'; } document.body.style.overflow = ''; }
    // Detrás de la foto y el nombre, un mosaico difuminado con sus pósters más conocidos
    function _pintarMosaicoPersona(top){
      const box = document.querySelector('#p-persona .persona-header-box'); if(!box) return;
      box.querySelector('.persona-mosaico')?.remove();
      const l = (top||[]).filter(x=>x.poster_path).slice(0,8); if(l.length<3) return;
      const rel = [...l, ...l].slice(0,12);
      const m = document.createElement('div'); m.className = 'persona-mosaico'; m.setAttribute('aria-hidden','true');
      m.innerHTML = `<div class="pm-rejilla">${rel.map(x=>`<img src="https://image.tmdb.org/t/p/w185${x.poster_path}" alt="" loading="lazy">`).join('')}</div><div class="pm-velo"></div>`;
      box.prepend(m); box.classList.add('con-mosaico');
    }
    // Edad que tenía cuando se estrenó (o «póstuma» si fue después de su muerte)
    function _edadEn(fecha){
      const n = window._personaNac; if(!n || n.id!==window._personaActual || !n.b || !fecha) return '';
      if(n.d && fecha > n.d) return ' · <span class="fm-edad">póstuma</span>';
      const a = new Date(n.b+'T12:00:00'), b = new Date(fecha+'T12:00:00');
      let e = b.getFullYear()-a.getFullYear(); if(b < new Date(b.getFullYear(), a.getMonth(), a.getDate())) e--;
      return e>=0 && e<110 ? ` · <span class="fm-edad">con ${e} años</span>` : '';
    }
    // Premios importantes de la persona (Wikidata), con la película o serie por la que los recibió
    async function _pintarPremiosPersona(id){
      const el = document.getElementById('p-premios'); if(!el) return;
      el.innerHTML = ''; el.hidden = true;
      const clave = `cm:premiosP:${id}`;
      let lista = null;
      try{ const c = JSON.parse(localStorage.getItem(clave)||'null'); if(c && Date.now()-c.t < 14*864e5) lista = c.l; }catch(e){}
      if(!lista){
        try{
          const et = v => `OPTIONAL{ ?${v} rdfs:label ?${v}es. FILTER(LANG(?${v}es)="es") } OPTIONAL{ ?${v} rdfs:label ?${v}en. FILTER(LANG(?${v}en)="en") }`;
          const filas = await _wdSparql(`SELECT ?tipo ?aes ?aen ?wes ?wen ?t WHERE { ?q wdt:P4985 "${Number(id)}". { ?q p:P166 ?st. ?st ps:P166 ?a. BIND("gana" AS ?tipo) } UNION { ?q p:P1411 ?st. ?st ps:P1411 ?a. BIND("nom" AS ?tipo) } OPTIONAL{ ?st pq:P585 ?t } OPTIONAL{ ?st pq:P1686 ?w. ${et('w')} } ${et('a')} }`);
          const v = (b,k) => b[k] ? b[k].value : '', m = new Map();
          filas.forEach(b=>{
            const en = v(b,'aen'), es = (v(b,'aes') || en).replace(/^Anexo:\s*/,'');
            if(/submission/i.test(en)) return;
            const cer = _CEREMONIAS.find(([,r])=>r.test(en) || r.test(es)); if(!cer) return;
            let cat = es.replace(/^.*?\s(?:a la|al|a los|a las|a)\s(?=mejor)/i,'');
            if(cat===es && !/mejor/i.test(cat)) cat = _categoriaEnEs(es.replace(/^.*? for /i,''));
            cat = cat.charAt(0).toUpperCase()+cat.slice(1);
            const x = {cer:cer[0], cat, obra:v(b,'wes')||v(b,'wen'), gana:v(b,'tipo')==='gana', y:v(b,'t').slice(0,4)};
            const k = `${x.cer}|${normalizarTitulo(x.cat)}|${normalizarTitulo(x.obra)}`, ya = m.get(k);
            if(!ya || (x.gana && !ya.gana)) m.set(k, {...x, y:x.y||ya?.y||''});
          });
          lista = [...m.values()];
          try{ localStorage.setItem(clave, JSON.stringify({t:Date.now(), l:lista})); }catch(e){}
        }catch(e){ return; }
      }
      if(window._personaActual!==id || !lista.length) return;
      const grupos = _CEREMONIAS.map(([c])=>[c, lista.filter(x=>x.cer===c).sort((a,b)=>(b.gana-a.gana)||(a.y||'').localeCompare(b.y||''))]).filter(([,l])=>l.length);
      const n = c => { const g = (grupos.find(([x])=>x===c)||[])[1]||[]; return {g:g.filter(x=>x.gana).length, n:g.filter(x=>!x.gana).length}; };
      const res = grupos.slice(0,3).map(([c])=>{ const r = n(c); return r.g ? `${r.g} ${c}${r.n ? ` (+${r.n} nom.)` : ''}` : `${r.n} ${r.n===1?'nominación':'nominaciones'} ${c==='Óscar'?'al Óscar':'en '+c}`; }).join(' · ');
      el.innerHTML = `<button type="button" class="pp-cab" onclick="this.parentElement.classList.toggle('abierto')"><span>🏆 ${_escHtml(res)}</span><i>▾</i></button>
        <div class="pp-cuerpo">${grupos.map(([c,l])=>`<div class="premio-cer abierto"><div class="premio-cer-t">${c}</div>${l.map(x=>`<div class="premio-l ${x.gana?'gana':'nom'}">${x.gana?'🏆 ':'Nominación · '}${_escHtml(x.cat)}${x.obra ? ` <span class="premio-quien">· ${_escHtml(x.obra)}</span>` : ''}${x.y ? ` <span class="premio-quien">(${x.y})</span>` : ''}</div>`).join('')}</div>`).join('')}
        <div class="premios-fuente">Premios principales según Wikidata. Puede faltar alguno.</div></div>`;
      el.hidden = false;
    }
    // Fila compacta: póster pequeño, título, año, tipo, papel y si la has visto
    function _filaFilmografia(p, onclick){
      const ep = p._tipo==='tv' && p._eps ? ` · ${p._eps} ${p._eps===1?'episodio':'episodios'}` : '';
      const papel = (p._papel||[]).slice(0,2).join(' / ') + ((p._papel||[]).length>2 ? '…' : '') + (p._voz ? ' (voz)' : '');
      return `<div class="fm-fila${p._visto?' visto':''}" onclick="${onclick}" ${_lp({id:p.id,tipo:p._tipo,t:p.title,poster:p.poster_path,f:p.release_date})}>
        <img class="fm-img" loading="lazy" src="https://image.tmdb.org/t/p/w92${p.poster_path}" alt="">
        <div class="fm-info"><div class="fm-t">${_escHtml(p.title)}</div>
          <div class="fm-m">${p.release_date?p.release_date.substring(0,4):'—'} · ${p._tipo==='tv'?'Serie':'Película'}${ep}${p.vote_average?` · ★ ${p.vote_average.toFixed(1)}`:''}${_edadEn(p.release_date)}</div>
          ${papel ? `<div class="fm-p">${p._crew ? '' : 'como '}${_escHtml(papel)}</div>` : ''}</div>
        ${p._visto ? '<span class="fm-visto">✓</span>' : ''}</div>`;
    }
    function renderFilmografiaGrid(){
      let lista = [...(window.filmografiaActual||[])];
      if(window.filmografiaTipo && window.filmografiaTipo!=='todo') lista = lista.filter(p=>p._tipo===window.filmografiaTipo);
      if(window.filmografiaGenero) lista = lista.filter(p=>(p.genre_ids||[]).includes(window.filmografiaGenero));
      const o = window.filmografiaOrden;
      if(o==='alfa') lista.sort((a,b)=>a.title.localeCompare(b.title,'es',{sensitivity:'base'}));
      else if(o==='antiguas') lista.sort((a,b)=>(a.release_date||'9999').localeCompare(b.release_date||'9999'));
      else if(o==='punt') lista.sort((a,b)=>(b.vote_average||0)-(a.vote_average||0));
      else if(o==='pop') lista.sort((a,b)=>(b.vote_count||0)-(a.vote_count||0));
      else lista.sort((a,b)=>(b.release_date||'').localeCompare(a.release_date||''));
      window.filmografiaVisible = lista;
      document.getElementById('p-filmografia').innerHTML = lista.length ? lista.map((p,i)=>_filaFilmografia(p, `abrirDetalleDesdeFilmografia(${i})`)).join('') : '<p class="rk-ayuda">No hay títulos con datos suficientes en TMDB.</p>';
    }
    function ordenarFilmografia(modo){ window.filmografiaOrden = modo; renderFilmografiaGrid(); }
    // Pastillas con los géneros que más repite (con al menos 2 títulos)
    async function _pintarGenerosFilmografia(){
      const el = document.getElementById('fm-generos'); if(!el) return;
      el.innerHTML = '';
      const quien = window._personaActual, mapa = await _mapaGenerosGlobal().catch(()=>({}));
      if(quien!==window._personaActual) return;
      const c = {}; (window.filmografiaActual||[]).forEach(p=>(p.genre_ids||[]).forEach(g=>{ c[g] = (c[g]||0)+1; }));
      // los géneros de series y de películas con el mismo nombre se cuentan juntos por su id de película
      const l = Object.entries(c).filter(([g,n])=>n>=2 && mapa[g]).sort((a,b)=>b[1]-a[1]).slice(0,9);
      if(l.length<2) return;
      el.innerHTML = `<button type="button" class="fm-tipo activo" data-g="0" onclick="filtrarGeneroFilmografia(0)">Todos</button>` + l.map(([g,n])=>`<button type="button" class="fm-tipo" data-g="${g}" onclick="filtrarGeneroFilmografia(${g})">${_escHtml(mapa[g])} <span>${n}</span></button>`).join('');
    }
    function filtrarGeneroFilmografia(g){
      window.filmografiaGenero = Number(g)||0;
      document.querySelectorAll('#fm-generos .fm-tipo').forEach(b=>b.classList.toggle('activo', Number(b.dataset.g)===window.filmografiaGenero));
      renderFilmografiaGrid();
    }
    function filtrarFilmografia(t){
      window.filmografiaTipo = t;
      document.querySelectorAll('#fm-tipos .fm-tipo').forEach(b=>b.classList.toggle('activo', b.dataset.t===t));
      renderFilmografiaGrid();
    }
    async function abrirDetalleDesdeFilmografia(i){await abrirDetalle(window.filmografiaVisible[i]);}
    function volverDesdeDetalle(){ _aplicarAcentoDetalle(null); irA(window.origenDetalle||'p-inicio', true); }
    function abrirTMDB(){if(peliculaActual)window.open((peliculaActual._tipo==='tv'?'https://www.themoviedb.org/tv/':'https://www.themoviedb.org/movie/')+peliculaActual.id,'_blank');}
    // ── ESPECIALES ──────────────────────────────────────────────────────
    // Estructura pensada para poder añadir más especiales en el futuro
    // (Star Wars, DC, etc.) sin tocar la lógica, solo añadiendo un objeto aquí.
    const MARVEL_UCM = [
      {n:1,imp:'o',rel:[[26,'i','Amplía la historia y los orígenes de Wakanda.']],era:'1260 a.C.',nota:'hasta 1896 d.C.',t:'Los ojos de Wakanda',y:2025,tipo:'tv',tag:'años 1260 a.C.–1896 d.C.',p:'Expande los orígenes de Wakanda mucho antes de que exista ningún otro héroe del UCM; sitúa el contexto histórico de Pantera Negra.'},
      {n:2,imp:'c',rel:[[3,'c','Peggy Carter protagoniza su propia serie tras la guerra.'],[5,'a','El Teseracto vuelve a aparecer en los años 90.'],[10,'a','Steve despierta en el presente y se une al equipo.'],[13,'i','Bucky y Hydra son el núcleo de esta historia.']],era:'1943',nota:'hasta 1945',t:'Capitán América: El primer vengador',y:2011,tipo:'movie',tag:'1943-1945',p:'Es el origen cronológico de uno de los pilares del UCM y sienta las bases de SHIELD y Hydra.'},
      {n:3,imp:'o',rel:[[20,'a','Peggy aparece en el prólogo, en 1989.'],[13,'a','Peggy, ya mayor, vuelve a cruzarse con Steve.']],era:'1946',nota:'en adelante',t:'Agente Carter',y:2015,tipo:'tv',tag:'desde 1946',p:'Continúa directamente la historia del Capitán América tras la guerra.'},
      {n:4,imp:'i',rel:[[62,'i','Su escena poscréditos anticipa la llegada del cuarteto al UCM principal.'],[67,'a','el cuarteto forma parte del reparto.']],era:'Años 60',nota:'universo paralelo',t:'Los 4 Fantásticos: Primeros pasos',y:2025,tipo:'movie',tag:'años 60 (universo paralelo)',p:'Introduce a los 4 Fantásticos, aunque transcurre en una realidad alternativa al UCM principal.'},
      {n:5,imp:'i',rel:[[32,'i','La escena poscréditos la llama a la acción.'],[33,'a','Carol Danvers es decisiva en la batalla final.'],[37,'a','Monica Rambeau, aquí una niña, regresa adulta.'],[56,'a','Talos y los skrulls vuelven a primer plano.'],[57,'c','La historia de Carol continúa.']],era:'1995',nota:'con flashbacks a 1989',t:'Capitana Marvel',y:2019,tipo:'movie',tag:'1995 (con flashbacks a 1989)',p:'Es el origen del personaje que luego será clave en varias crisis futuras del UCM.'},
      {n:6,imp:'c',rel:[[7,'c','Tony sigue justo donde lo dejó.'],[10,'a','Tony Stark es pieza central del equipo.'],[27,'a','Tony ejerce de mentor de Peter Parker.']],era:'2010',t:'Iron Man',y:2008,tipo:'movie',tag:'2010',p:'La película fundacional de todo el universo cinematográfico.'},
      {n:7,imp:'i',rel:[[9,'i','Su escena poscréditos lleva directamente a Nuevo México.'],[10,'a','Natasha, que debuta aquí, es clave en el equipo.'],[25,'a','Natasha protagoniza su propia película.']],era:'2011',t:'Iron Man 2',y:2010,tipo:'movie',tag:'2011',p:'Continúa la historia de Tony Stark e introduce piezas clave para "Los Vengadores".'},
      {n:8,imp:'i',rel:[[10,'a','Bruce Banner vuelve (con otro actor) para unirse al equipo.'],[24,'a','El general Ross reaparece como secretario de Estado.'],[61,'i','El villano nace en esta película.']],era:'2011',t:'El increíble Hulk',y:2008,tipo:'movie',tag:'2011',p:'Aporta contexto sobre Hulk antes de su incorporación al equipo de Vengadores.'},
      {n:9,imp:'c',rel:[[10,'i','Loki es el villano de la primera gran reunión.'],[11,'c','La historia de Thor y Loki continúa.'],[34,'a','Loki protagoniza su propia serie.']],era:'2011',t:'Thor',y:2011,tipo:'movie',tag:'2011',p:'Introduce Asgard y amplía el universo más allá de la Tierra.'},
      {n:10,imp:'c',rel:[[19,'c','El equipo vuelve a reunirse.'],[32,'i','Su escena poscréditos presenta a Thanos.'],[33,'a','Se vuelve a visitar la batalla de Nueva York.']],era:'2012',t:'Los Vengadores',y:2012,tipo:'movie',tag:'2012',p:'El primer gran crossover, punto de encuentro de todas las tramas anteriores.'},
      {n:11,imp:'i',rel:[[14,'i','Su poscréditos presenta al Coleccionista.'],[30,'c','La historia de Thor sigue.'],[33,'a','Se vuelve a visitar Asgard en 2013.']],era:'2013',t:'Thor: El mundo oscuro',y:2013,tipo:'movie',tag:'2013',p:'Continúa la historia asgardiana en paralelo al resto de tramas terrestres.'},
      {n:12,imp:'i',rel:[[24,'a','Tony vuelve en plena ruptura del equipo.'],[38,'a','Trevor Slattery reaparece por sorpresa.']],era:'2013',t:'Iron Man 3',y:2013,tipo:'movie',tag:'2013',p:'Cierra el arco personal de Stark tras los eventos de "Los Vengadores".'},
      {n:13,imp:'c',rel:[[24,'c','Steve y Bucky continúan su historia.'],[39,'a','Sam y Bucky protagonizan su propia serie.']],era:'2014',t:'Capitán América: El Soldado de Invierno',y:2014,tipo:'movie',tag:'2014',p:'Cambia el rumbo de toda la saga al reconfigurar el papel de las organizaciones de espionaje.'},
      {n:14,imp:'c',rel:[[15,'c','Los Guardianes continúan su historia.'],[16,'a','El pequeño Groot tiene su serie de cortos.'],[32,'i','Gamora y Thanos están en el centro de todo.']],era:'2014',t:'Guardianes de la Galaxia',y:2014,tipo:'movie',tag:'2014',p:'Expande el UCM al espacio exterior con un tono muy distinto.'},
      {n:15,imp:'i',rel:[[32,'a','Los Guardianes se cruzan con Thor.'],[53,'a','Mantis, Drax y compañía protagonizan el especial navideño.'],[55,'i','Su poscréditos presenta a Adam Warlock; la saga cierra aquí.']],era:'2014',t:'Guardianes de la Galaxia Vol. 2',y:2017,tipo:'movie',tag:'2014',p:'Continuación directa que profundiza en la familia improvisada de los Guardianes.'},
      {n:16,imp:'o',rel:[[55,'a','Groot vuelve con el resto de los Guardianes.']],t:'Yo soy Groot',y:2022,tipo:'tv',tag:'tras Vol. 2',p:'Complemento ligero centrado en un personaje muy querido.'},
      {n:17,imp:'o',rel:[[23,'c','Matt se une al grupo de héroes de Nueva York.'],[42,'a','Matt Murdock hace un cameo como abogado.'],[60,'c','Su historia continúa años después.']],t:'Daredevil',y:2015,tipo:'tv',tag:'situada aquí por Disney+',p:'Introduce el lado más callejero y oscuro del universo.'},
      {n:18,imp:'o',rel:[[21,'a','Luke Cage, presentado aquí, tiene su propia serie.'],[23,'c','Jessica se une al grupo de héroes de Nueva York.']],era:'2014',t:'Jessica Jones',y:2015,tipo:'tv',tag:'2014',p:'Amplía el elenco de héroes urbanos de Nueva York.'},
      {n:19,imp:'c',rel:[[24,'c','Las consecuencias de Sokovia desembocan en la ruptura del equipo.'],[30,'a','Hulk reaparece lejos de la Tierra.'],[37,'a','Wanda y Visión protagonizan su propia serie.']],era:'2015',t:'Vengadores: La era de Ultrón',y:2015,tipo:'movie',tag:'2015',p:'Segundo gran crossover que redefine al equipo de Vengadores.'},
      {n:20,imp:'i',rel:[[24,'a','Scott Lang se suma al combate.'],[31,'c','La historia de Scott y Hope continúa.'],[33,'i','El reino cuántico es la clave del desenlace.']],era:'2015',t:'Ant-Man',y:2015,tipo:'movie',tag:'2015',p:'Introduce la tecnología de reducción que será clave más adelante.'},
      {n:21,imp:'o',rel:[[23,'c','Luke se une al grupo de héroes de Nueva York.']],t:'Luke Cage',y:2016,tipo:'tv',tag:'tras Jessica Jones',p:'Suma otro héroe callejero al universo de Nueva York.'},
      {n:22,imp:'o',rel:[[23,'c','Danny se une al grupo de héroes de Nueva York.']],era:'2016',nota:'principios de año',t:'Iron Fist',y:2017,tipo:'tv',tag:'principios de 2016',p:'Completa el grupo de héroes que luego se unirá en "The Defenders".'},
      {n:23,imp:'o',rel:[[28,'a','Frank Castle, presentado en Daredevil, tiene su propia serie.'],[60,'c','La historia de Daredevil continúa años después.']],era:'2016',t:'The Defenders',y:2017,tipo:'tv',tag:'2016',p:'Reúne a los protagonistas de las series anteriores.'},
      {n:24,imp:'c',rel:[[25,'c','Transcurre justo después, con Natasha huida.'],[26,'a','T’Challa, que debuta aquí, protagoniza su película.'],[27,'a','Este Spider-Man debuta aquí y sigue en solitario.'],[32,'i','El equipo dividido llega así a la gran amenaza.']],era:'2016',t:'Capitán América: Civil War',y:2016,tipo:'movie',tag:'2016',p:'Punto de inflexión que reconfigura las alianzas de cara al futuro.'},
      {n:25,imp:'i',rel:[[44,'a','Yelena Belova reaparece.'],[62,'a','Yelena y Red Guardian vuelven al frente.']],era:'2016',t:'Viuda Negra',y:2021,tipo:'movie',tag:'2016',p:'Profundiza en la historia de un personaje clave antes de despedirse de él.'},
      {n:26,imp:'i',rel:[[1,'i','Amplía la historia de Wakanda.'],[32,'a','Wakanda es escenario clave de la gran batalla.'],[46,'c','La historia de Wakanda continúa.']],era:'2016',t:'Black Panther',y:2018,tipo:'movie',tag:'2016',p:'Presenta Wakanda a fondo, un lugar fundamental en el futuro de la saga.'},
      {n:27,imp:'i',rel:[[32,'a','Peter se une a la gran batalla.'],[40,'c','La historia de Peter continúa.']],era:'2016',t:'Spider-Man: Homecoming',y:2017,tipo:'movie',tag:'2016',p:'Primera aventura en solitario del nuevo Spider-Man dentro del UCM.'},
      {n:28,imp:'o',rel:[[60,'a','Frank Castle reaparece.'],[64,'c','Frank vuelve en un especial propio.']],t:'The Punisher',y:2017,tipo:'tv',tag:'tras Daredevil T2',p:'Añade un tono más violento y realista al universo urbano.'},
      {n:29,imp:'c',rel:[[30,'a','Strange hace un cameo junto a Thor.'],[32,'i','La Gema del Tiempo que protege es clave.'],[42,'a','Strange es pieza central.'],[43,'c','Su historia continúa.']],era:'2016',nota:'hasta 2017',t:'Doctor Strange',y:2016,tipo:'movie',tag:'2016-2017',p:'Introduce la magia y la dimensión mística del UCM.'},
      {n:30,imp:'c',rel:[[32,'c','Su escena poscréditos enlaza directamente.'],[50,'c','Thor vuelve a protagonizar.']],era:'2017',t:'Thor: Ragnarok',y:2017,tipo:'movie',tag:'2017',p:'Cambio de tono que redefine al personaje antes de las grandes batallas finales.'},
      {n:31,imp:'i',rel:[[33,'i','Su poscréditos deja a Scott atrapado en el reino cuántico.'],[54,'c','La familia Lang-Van Dyne vuelve al reino cuántico.']],era:'2017',t:'Ant-Man y la Avispa',y:2018,tipo:'movie',tag:'2017',p:'Profundiza en la tecnología cuántica que tendrá gran importancia después.'},
      {n:32,imp:'c',rel:[[33,'c','Continúa directamente.']],era:'2017',t:'Vengadores: Infinity War',y:2018,tipo:'movie',tag:'2017',p:'El gran crossover que reúne prácticamente todas las tramas del UCM hasta la fecha.'},
      {n:33,imp:'c',rel:[[34,'i','Un Loki escapa con el Teseracto: así arranca su serie.'],[37,'c','Arranca semanas después.'],[39,'c','Sam recibe el escudo y todo lo que significa.'],[40,'c','Muestra el mundo tras lo ocurrido.'],[44,'a','Clint sigue su historia.']],era:'2018',nota:'con salto a 2023',t:'Vengadores: Endgame',y:2019,tipo:'movie',tag:'2018 (con salto a 2023)',p:'Cierre de la primera gran etapa del UCM.'},
      {n:34,imp:'c',rel:[[54,'i','Kang, presentado aquí, es el villano.'],[58,'a','La AVT vuelve a aparecer.'],[67,'a','Loki forma parte del reparto.']],era:'2023',nota:'tras Endgame',t:'Loki',y:2021,tipo:'tv',tag:'tras Endgame',p:'Abre una nueva rama argumental que da forma al multiverso.'},
      {n:35,imp:'o',rel:[[36,'c','Su episodio de zombis da pie a la serie.']],t:'¿Qué pasaría si...?',y:2021,tipo:'tv',tag:'variable',p:'Complemento que enriquece el concepto de multiverso.'},
      {n:36,imp:'o',rel:[[35,'v','Nace de uno de sus episodios.']],era:'2023',t:'Marvel Zombis',y:2025,tipo:'tv',tag:'2023',p:'Spin-off de una de las líneas alternativas de "¿Qué pasaría si...?".'},
      {n:37,imp:'i',rel:[[43,'c','Wanda continúa su historia.'],[66,'c','Visión protagoniza su propia serie.'],[57,'a','Monica Rambeau sigue en acción.'],[59,'c','Agatha Harkness protagoniza su propia serie.']],t:'Bruja Escarlata y Visión',y:2021,tipo:'tv',tag:'meses tras Endgame',p:'Serie fundamental que abre nuevas posibilidades narrativas para el UCM.'},
      {n:38,imp:'i',rel:[[48,'a','Abominación, que aparece aquí, vuelve.'],[67,'a','Shang-Chi forma parte del reparto.']],era:'2024',t:'Shang-Chi y la leyenda de los diez anillos',y:2021,tipo:'movie',tag:'2024',p:'Presenta a Shang-Chi y los diez anillos, cuyo misterio sigue abierto. El personaje vuelve en "Vengadores: Doomsday".'},
      {n:39,imp:'i',rel:[[61,'c','Sam asume el escudo como Capitán América.'],[62,'a','Bucky y John Walker vuelven al frente.']],era:'2024',t:'Falcon y el Soldado de Invierno',y:2021,tipo:'tv',tag:'2024',p:'Continúa el legado del Capitán América tras los eventos de Endgame.'},
      {n:40,imp:'i',rel:[[42,'c','Su poscréditos desemboca directamente.'],[56,'i','Su poscréditos anticipa a Talos y los skrulls.']],era:'2024',t:'Spider-Man: Lejos de casa',y:2019,tipo:'movie',tag:'2024',p:'Cierra una etapa importante del personaje antes de grandes cambios.'},
      {n:41,imp:'o',era:'2024',t:'Eternals',y:2021,tipo:'movie',tag:'2024',p:'Amplía enormemente el trasfondo cósmico del UCM.'},
      {n:42,imp:'i',rel:[[43,'c','Strange continúa su historia.'],[65,'c','Peter Parker continúa su historia.']],era:'2024',nota:'finales de año',t:'Spider-Man: No Way Home',y:2021,tipo:'movie',tag:'finales de 2024',p:'Continuación directa de la anterior con grandes consecuencias.'},
      {n:43,imp:'i',rel:[[37,'v','Conviene haber visto antes lo que le ocurre a Wanda.']],t:'Doctor Strange en el multiverso de la locura',y:2022,tipo:'movie',tag:'tras No Way Home',p:'Profundiza en el concepto de multiverso ya abierto por Loki y Spider-Man.'},
      {n:44,imp:'o',rel:[[47,'c','Maya López protagoniza su propia serie.'],[60,'a','Kingpin vuelve a aparecer.'],[62,'a','Yelena vuelve al frente.']],era:'2024',nota:'Navidad',t:'Ojo de Halcón',y:2021,tipo:'tv',tag:'Navidad de 2024',p:'Introduce a un nuevo personaje que tomará relevancia en el futuro.'},
      {n:45,imp:'o',era:'2025',nota:'primavera',t:'Caballero Luna',y:2022,tipo:'tv',tag:'primavera de 2025',p:'Historia bastante independiente que amplía el tono más oscuro del UCM.'},
      {n:46,imp:'i',rel:[[26,'v','Continúa la historia de Wakanda.'],[51,'a','Riri Williams, presentada aquí, protagoniza su serie.'],[67,'a','Shuri, Namor y M’Baku forman parte del reparto.']],t:'Black Panther: Wakanda Forever',y:2022,tipo:'movie',tag:'próxima a Love and Thunder',p:'Shuri hereda el manto de Black Panther y aparece Namor, el rey de Talokan. Los dos vuelven en "Vengadores: Doomsday".'},
      {n:47,imp:'o',rel:[[60,'c','Kingpin y Daredevil continúan.']],era:'2025',nota:'mayo',t:'Echo',y:2024,tipo:'tv',tag:'mayo de 2025',p:'Conecta directamente con tramas urbanas que resurgirán después.'},
      {n:48,imp:'o',t:'She-Hulk: Abogada Hulka',y:2022,tipo:'tv',tag:'tras Shang-Chi',p:'Aporta un tono de comedia distinto dentro del universo.'},
      {n:49,imp:'o',rel:[[57,'c','Kamala continúa su historia.']],t:'Ms. Marvel',y:2022,tipo:'tv',tag:'tras Multiverso de la locura',p:'Introduce a un personaje que después tendrá un papel relevante.'},
      {n:50,imp:'i',rel:[[30,'v','Thor viene de aquí.'],[67,'a','Thor forma parte del reparto.']],era:'2025',nota:'finales de año / 2026',t:'Thor: Love and Thunder',y:2022,tipo:'movie',tag:'finales de 2025/2026',p:'Continúa la historia de Thor tras "Endgame" y deja su situación lista para "Vengadores: Doomsday", donde vuelve como uno de los protagonistas.'},
      {n:51,imp:'o',rel:[[46,'v','Riri debuta aquí.']],era:'2025',nota:'finales de año',t:'Ironheart',y:2025,tipo:'tv',tag:'finales de 2025',p:'Presenta a un personaje que se cruzará con tramas tecnológicas importantes.'},
      {n:52,imp:'o',t:'La maldición del hombre lobo',y:2022,tipo:'movie',tag:'sin ubicación clara',p:'Historia autoconclusiva con potencial para el futuro del UCM.'},
      {n:53,imp:'o',rel:[[55,'c','Los Guardianes cierran su historia.']],era:'2025',nota:'Navidad',t:'Guardianes de la Galaxia: Especial Felices Fiestas',y:2022,tipo:'movie',tag:'Navidad de 2025',p:'Puente ligero antes de la última película de los Guardianes.'},
      {n:54,imp:'i',rel:[[34,'v','Kang viene de aquí.'],[67,'a','Ant-Man forma parte del reparto.']],t:'Ant-Man y la Avispa: Quantumania',y:2023,tipo:'movie',tag:'en paralelo a Wakanda Forever',p:'Profundiza en el Reino Cuántico, clave para tramas futuras.'},
      {n:55,imp:'i',era:'2026',t:'Guardianes de la Galaxia Vol. 3',y:2023,tipo:'movie',tag:'2026',p:'Cierra el arco de esta versión del equipo de Guardianes.'},
      {n:56,imp:'o',rel:[[57,'a','Nick Fury sigue en acción.']],t:'Invasión Secreta',y:2023,tipo:'tv',tag:'tras She-Hulk',p:'Trama de espionaje con consecuencias para el resto del universo.'},
      {n:57,imp:'i',t:'The Marvels',y:2023,tipo:'movie',tag:'tras Ms. Marvel',p:'Une varias tramas de personajes ya presentados.'},
      {n:58,imp:'i',rel:[[34,'v','La AVT viene de aquí.'],[67,'a','Gambit y varios X-Men forman parte del reparto.']],t:'Deadpool y Lobezno',y:2024,tipo:'movie',tag:'situada aquí por Disney+',p:'Cruce entre universos con gran repercusión para el futuro del UCM.'},
      {n:59,imp:'o',rel:[[37,'v','Agatha viene de aquí.']],t:'Agatha, ¿Quién si no?',y:2024,tipo:'tv',tag:'3 años tras WandaVision',p:'Spin-off que amplía el universo mágico abierto por "Bruja Escarlata y Visión".'},
      {n:60,imp:'o',rel:[[28,'v','Frank Castle viene de aquí.'],[64,'c','Frank vuelve en un especial propio.']],t:'Daredevil: Born Again',y:2025,tipo:'tv',tag:'tras Agatha',p:'Retoma y actualiza la historia del personaje para el presente del UCM.'},
      {n:61,imp:'i',rel:[[8,'v','El villano viene de aquí.'],[39,'v','Sam recibe el testigo aquí.'],[67,'a','Sam Wilson y Joaquín Torres forman parte del reparto.']],era:'2026',nota:'hasta 2027',t:'Capitán América: Brave New World',y:2025,tipo:'movie',tag:'2026-2027',p:'Consolida al nuevo portador del escudo.'},
      {n:62,imp:'c',rel:[[4,'i','Su poscréditos anticipa a los 4 Fantásticos.'],[67,'a','Bucky, Yelena, John Walker, Red Guardian y Bob forman parte del reparto.']],era:'2027',t:'Thunderbolts',y:2025,tipo:'movie',tag:'2027',p:'Reúne a varios antihéroes que acaban formando un nuevo equipo de Vengadores, punto de partida directo hacia "Vengadores: Doomsday".'},
      {n:63,imp:'o',era:'2027',nota:'hasta 2028',t:'Wonder Man',y:2026,tipo:'tv',tag:'2027-2028',p:'Introduce a un nuevo héroe conectado con tramas de Hollywood y espectáculo.'},
      {n:64,imp:'o',rel:[[28,'v','Frank Castle viene de aquí.']],era:'2027',t:'The Punisher: One Last Kill',y:2026,tipo:'movie',tag:'2027',p:'Continúa el camino personal del personaje.'},
      {n:65,imp:'i',rel:[[42,'v','Viene directamente de aquí.']],era:'2028',t:'Spider-Man: Brand New Day',y:2026,tipo:'movie',tag:'2028',p:'Es, por ahora, el capítulo más avanzado en el tiempo de toda la cronología del UCM.'},
      {n:66,imp:'i',rel:[[37,'v','Visión viene de aquí.']],nota:'en Disney+ desde el 13 de octubre de 2026',t:'VisionQuest',y:2026,tipo:'tv',tmdb_id:213375,tag:'Disney+ · recién estrenada',p:'Serie de Disney+ protagonizada por Visión (Paul Bettany), que retoma lo que dejó abierto «Bruja Escarlata y Visión».'},
      {n:67,imp:'c',rel:[[68,'c','La historia continúa en «Vengadores: Secret Wars».'],[62,'v','Los nuevos Vengadores vienen de aquí.'],[4,'v','Los 4 Fantásticos llegan desde su universo.'],[61,'v','Sam Wilson llega como Capitán América.']],era:'Próximamente',nota:'se estrena el 18 de diciembre de 2026',t:'Vengadores: Doomsday',y:2026,tipo:'movie',tag:'estreno: 18 de diciembre de 2026',p:'La próxima gran reunión: Vengadores, 4 Fantásticos, Thunderbolts y X-Men frente al Doctor Muerte, interpretado por Robert Downey Jr. Todo lo marcado como clave o importante prepara esta película.'},
      {n:68,imp:'c',rel:[[67,'v','Continúa directamente la historia de Doomsday.']],nota:'se estrena el 17 de diciembre de 2027',t:'Vengadores: Secret Wars',y:2027,tipo:'movie',tag:'estreno: 17 de diciembre de 2027',p:'El final de la Saga del Multiverso y continuación directa de «Vengadores: Doomsday».'}
    ];

    // Óscar a Mejor Película — año = el de la GALA (ceremonia), como se pidió.
    // y = año real de estreno de la película (para que la búsqueda en TMDB sea precisa).
    const OSCARS_MEJOR_PELICULA = [
      {n:1980,era:'1980',t:'Kramer contra Kramer',y:1979,tipo:'movie',tag:'Óscar 1980',p:'Drama sobre un divorcio y una custodia que marcó una época; ganó también Mejor Director y Mejor Actor para Dustin Hoffman.'},
      {n:1981,era:'1981',t:'Gente corriente',y:1980,tipo:'movie',tag:'Óscar 1981',p:'Debut como director de Robert Redford; retrato íntimo del duelo dentro de una familia acomodada.'},
      {n:1982,era:'1982',t:'Carros de fuego',y:1981,tipo:'movie',tag:'Óscar 1982',p:'La historia de dos atletas británicos en los JJOO de 1924, con una banda sonora icónica de Vangelis.'},
      {n:1983,era:'1983',t:'Gandhi',y:1982,tipo:'movie',tag:'Óscar 1983',p:'Épica biográfica de Richard Attenborough sobre el líder indio; ganó 8 Óscar en total.'},
      {n:1984,era:'1984',t:'La fuerza del cariño',y:1983,tipo:'movie',tag:'Óscar 1984',p:'Drama familiar con Shirley MacLaine y Debra Winger que combina comedia y tragedia con maestría.'},
      {n:1985,era:'1985',t:'Amadeus',y:1984,tipo:'movie',tag:'Óscar 1985',p:'La rivalidad entre Mozart y Salieri, dirigida por Miloš Forman; ganó 8 Óscar.'},
      {n:1986,era:'1986',t:'Memorias de África',y:1985,tipo:'movie',tag:'Óscar 1986',p:'Romance épico en Kenia con Meryl Streep y Robert Redford, dirigido por Sydney Pollack.'},
      {n:1987,era:'1987',t:'Pelotón',y:1986,tipo:'movie',tag:'Óscar 1987',p:'Oliver Stone lleva su propia experiencia en Vietnam a una de las películas bélicas más crudas de la década.'},
      {n:1988,era:'1988',t:'El último emperador',y:1987,tipo:'movie',tag:'Óscar 1988',p:'Bertolucci narra la vida del último emperador de China; arrasó con 9 Óscar.'},
      {n:1989,era:'1989',t:'Rain Man',y:1988,tipo:'movie',tag:'Óscar 1989',p:'Dustin Hoffman y Tom Cruise en un road trip que popularizó el término "savant" en la cultura popular.'},
      {n:1990,era:'1990',t:'Paseando a Miss Daisy',y:1989,tipo:'movie',tag:'Óscar 1990',p:'La amistad entre una anciana judía y su chófer negro en el sur de EE.UU., contada con delicadeza.'},
      {n:1991,era:'1991',t:'Bailando con lobos',y:1990,tipo:'movie',tag:'Óscar 1991',p:'Kevin Costner dirige y protagoniza este western revisionista sobre un soldado que convive con los sioux.'},
      {n:1992,era:'1992',t:'El silencio de los corderos',y:1991,tipo:'movie',tag:'Óscar 1992',p:'Uno de los pocos thrillers de terror en ganar Mejor Película; arrasó en las 5 categorías principales.'},
      {n:1993,era:'1993',t:'Sin perdón',y:1992,tipo:'movie',tag:'Óscar 1993',p:'Clint Eastwood cierra su etapa como pistolero con un western crepuscular y moralmente ambiguo.'},
      {n:1994,era:'1994',t:'La lista de Schindler',y:1993,tipo:'movie',tag:'Óscar 1994',p:'Spielberg narra el rescate de más de mil judíos durante el Holocausto; considerada una obra maestra absoluta.'},
      {n:1995,era:'1995',t:'Forrest Gump',y:1994,tipo:'movie',tag:'Óscar 1995',p:'Tom Hanks recorre décadas de historia de EE.UU. desde la mirada de un hombre extraordinariamente sencillo.'},
      {n:1996,era:'1996',t:'Braveheart',y:1995,tipo:'movie',tag:'Óscar 1996',p:'Mel Gibson dirige y protagoniza esta épica sobre la rebelión escocesa de William Wallace.'},
      {n:1997,era:'1997',t:'El paciente inglés',y:1996,tipo:'movie',tag:'Óscar 1997',p:'Romance trágico en la Segunda Guerra Mundial, narrado con estructura de flashback y fotografía deslumbrante.'},
      {n:1998,era:'1998',t:'Titanic',y:1997,tipo:'movie',tag:'Óscar 1998',p:'La superproducción de James Cameron que igualó el récord de 11 Óscar y se convirtió en fenómeno mundial.'},
      {n:1999,era:'1999',t:'Shakespeare in Love',y:1998,tipo:'movie',tag:'Óscar 1999',p:'Comedia romántica que imagina el origen de "Romeo y Julieta"; venció por sorpresa a "Salvar al soldado Ryan".'},
      {n:2000,era:'2000',t:'American Beauty',y:1999,tipo:'movie',tag:'Óscar 2000',p:'Sam Mendes diseca la crisis de la mediana edad y el sueño americano en un suburbio cualquiera.'},
      {n:2001,era:'2001',t:'Gladiator',y:2000,tipo:'movie',tag:'Óscar 2001',p:'Ridley Scott resucita el peplum con Russell Crowe como un general convertido en gladiador.'},
      {n:2002,era:'2002',t:'Una mente maravillosa',y:2001,tipo:'movie',tag:'Óscar 2002',p:'Russell Crowe interpreta al matemático John Nash y su lucha con la esquizofrenia.'},
      {n:2003,era:'2003',t:'Chicago',y:2002,tipo:'movie',tag:'Óscar 2003',p:'El musical de Bob Fosse llevado al cine, con Renée Zellweger, Catherine Zeta-Jones y Richard Gere.'},
      {n:2004,era:'2004',t:'El señor de los anillos: El retorno del rey',y:2003,tipo:'movie',tag:'Óscar 2004',p:'Cierre de la trilogía de Peter Jackson; ganó los 11 Óscar a los que optaba, un récord compartido.'},
      {n:2005,era:'2005',t:'Million Dollar Baby',y:2004,tipo:'movie',tag:'Óscar 2005',p:'Clint Eastwood dirige un drama de boxeo que se transforma en una reflexión sobre la dignidad y la muerte.'},
      {n:2006,era:'2006',t:'Crash',y:2005,tipo:'movie',tag:'Óscar 2006',p:'Retrato coral sobre el racismo y la tensión racial en Los Ángeles, con múltiples historias entrelazadas.'},
      {n:2007,era:'2007',t:'Infiltrados',y:2006,tipo:'movie',tag:'Óscar 2007',p:'Martin Scorsese gana por fin su Óscar con este thriller policial ambientado en el crimen organizado de Boston.'},
      {n:2008,era:'2008',t:'No es país para viejos',y:2007,tipo:'movie',tag:'Óscar 2008',p:'Los hermanos Coen adaptan a Cormac McCarthy en un thriller tenso protagonizado por un asesino imparable.'},
      {n:2009,era:'2009',t:'Slumdog Millionaire',y:2008,tipo:'movie',tag:'Óscar 2009',p:'Danny Boyle narra la historia de un joven de los suburbios de Bombay que triunfa en un concurso de TV.'},
      {n:2010,era:'2010',t:'En tierra hostil',y:2009,tipo:'movie',tag:'Óscar 2010',p:'Kathryn Bigelow, primera mujer en ganar Mejor Director, retrata a un equipo de desactivación de bombas en Irak.'},
      {n:2011,era:'2011',t:'El discurso del rey',y:2010,tipo:'movie',tag:'Óscar 2011',p:'Colin Firth interpreta a Jorge VI y su lucha contra la tartamudez en vísperas de la Segunda Guerra Mundial.'},
      {n:2012,era:'2012',t:'The Artist',y:2011,tipo:'movie',tag:'Óscar 2012',p:'Homenaje al cine mudo, en blanco y negro, que sorprendió a la Academia y se llevó el premio mayor.'},
      {n:2013,era:'2013',t:'Argo',y:2012,tipo:'movie',tag:'Óscar 2013',p:'Ben Affleck dirige y protagoniza el rescate real de diplomáticos estadounidenses en Irán disfrazado de rodaje de ciencia ficción.'},
      {n:2014,era:'2014',t:'12 años de esclavitud',y:2013,tipo:'movie',tag:'Óscar 2014',p:'Steve McQueen narra sin concesiones la historia real de un hombre libre secuestrado y vendido como esclavo.'},
      {n:2015,era:'2015',t:'Birdman',y:2014,tipo:'movie',tag:'Óscar 2015',p:'Alejandro G. Iñárritu rueda con la ilusión de un plano secuencia continuo la crisis de un actor venido a menos.'},
      {n:2016,era:'2016',t:'Spotlight',y:2015,tipo:'movie',tag:'Óscar 2016',p:'La investigación periodística que destapó el escándalo de abusos en la Iglesia católica de Boston.'},
      {n:2017,era:'2017',t:'Moonlight',y:2016,tipo:'movie',tag:'Óscar 2017',p:'Retrato en tres etapas de la vida de un hombre negro y gay en Miami; protagonizó el famoso error de sobre en la gala.'},
      {n:2018,era:'2018',t:'La forma del agua',y:2017,tipo:'movie',tag:'Óscar 2018',p:'Guillermo del Toro firma un cuento de amor fantástico entre una mujer muda y una criatura acuática.'},
      {n:2019,era:'2019',t:'Green Book',y:2018,tipo:'movie',tag:'Óscar 2019',p:'Comedia dramática sobre un pianista negro y su chófer ítaloamericano de gira por el sur segregado de EE.UU.'},
      {n:2020,era:'2020',t:'Parásitos',y:2019,tipo:'movie',tag:'Óscar 2020',p:'Bong Joon-ho hace historia como la primera película no anglófona en ganar Mejor Película.'},
      {n:2021,era:'2021',t:'Nomadland',y:2020,tipo:'movie',tag:'Óscar 2021',p:'Chloé Zhao retrata la vida itinerante de trabajadores nómadas en EE.UU. con Frances McDormand.'},
      {n:2022,era:'2022',t:'CODA',y:2021,tipo:'movie',tag:'Óscar 2022',p:'La historia de la única hija oyente de una familia sorda que descubre su pasión por el canto.'},
      {n:2023,era:'2023',t:'Everything Everywhere All at Once',y:2022,tipo:'movie',tag:'Óscar 2023',p:'Multiverso, artes marciales y drama familiar se mezclan en una de las sorpresas más celebradas de la década.'},
      {n:2024,era:'2024',t:'Oppenheimer',y:2023,tipo:'movie',tag:'Óscar 2024',p:'Christopher Nolan narra la creación de la bomba atómica y el dilema moral de su creador; ganó 7 Óscar.'},
      {n:2025,era:'2025',t:'Anora',y:2024,tipo:'movie',tag:'Óscar 2025',p:'Sean Baker firma una tragicomedia sobre una bailarina de striptease y un romance relámpago con el hijo de un oligarca ruso.'},
      {n:2026,era:'2026',t:'Una batalla tras otra',y:2025,tipo:'movie',tag:'Óscar 2026',p:'Paul Thomas Anderson dirige este drama con Leonardo DiCaprio y Sean Penn que arrasó con 6 premios en la 98.ª gala, incluyendo Mejor Película, Dirección y Guion Adaptado.'}
    ];

    // James Bond — las 25 películas oficiales de Eon Productions, en orden de estreno.
    const BOND_007 = [
      {n:1,t:'Agente 007 contra el Dr. No',y:1962,tipo:'movie',tag:'Sean Connery',p:'La primera película de la saga; establece el tono, el gadget y el "Bond, James Bond" para siempre.'},
      {n:2,t:'Desde Rusia con amor',y:1963,tipo:'movie',tag:'Sean Connery',p:'Espionaje puro de Guerra Fría, considerada por muchos fans la Bond más clásica.'},
      {n:3,t:'Goldfinger',y:1964,tipo:'movie',tag:'Sean Connery',p:'La que fijó la fórmula definitiva: villano excéntrico, chica Bond, Aston Martin con gadgets.'},
      {n:4,t:'Operación Trueno',y:1965,tipo:'movie',tag:'Sean Connery',p:'Espectacular por su ambientación submarina; fue la Bond más taquillera de su década.'},
      {n:5,t:'Solo se vive dos veces',y:1967,tipo:'movie',tag:'Sean Connery',p:'Bond se infiltra en Japón y nos presenta por primera vez al villano Blofeld en pantalla.'},
      {n:6,t:'Al servicio secreto de Su Majestad',y:1969,tipo:'movie',tag:'George Lazenby',p:'Única aparición de Lazenby como Bond; también la única vez que Bond se casa. Culto entre los fans.'},
      {n:7,t:'Diamantes para la eternidad',y:1971,tipo:'movie',tag:'Sean Connery',p:'El regreso de Connery tras la salida de Lazenby, con un tono más ligero y desenfadado.'},
      {n:8,t:'Vive y deja morir',y:1973,tipo:'movie',tag:'Roger Moore',p:'Debut de Roger Moore, con un Bond más humorístico ambientado en el vudú y el crimen organizado de EE.UU.'},
      {n:9,t:'El hombre de la pistola de oro',y:1974,tipo:'movie',tag:'Roger Moore',p:'Christopher Lee interpreta a Scaramanga, uno de los villanos más memorables de la saga clásica.'},
      {n:10,t:'La espía que me amó',y:1977,tipo:'movie',tag:'Roger Moore',p:'Considerada la mejor Bond de Moore; introduce al icónico secuaz "Tiburón".'},
      {n:11,t:'Moonraker',y:1979,tipo:'movie',tag:'Roger Moore',p:'Bond se va al espacio para aprovechar la fiebre de "Star Wars"; la entrega más disparatada de la era Moore.'},
      {n:12,t:'Solo para sus ojos',y:1981,tipo:'movie',tag:'Roger Moore',p:'Vuelta a un tono más realista y terrenal tras los excesos de "Moonraker".'},
      {n:13,t:'Octopussy',y:1983,tipo:'movie',tag:'Roger Moore',p:'Intriga con joyas de contrabando y una organización circense como tapadera en plena Guerra Fría.'},
      {n:14,t:'Panorama para matar',y:1985,tipo:'movie',tag:'Roger Moore',p:'Última aparición de Roger Moore, ya con 57 años, ambientada entre París y Silicon Valley.'},
      {n:15,t:'Alta tensión',y:1987,tipo:'movie',tag:'Timothy Dalton',p:'Dalton aporta un Bond más serio y fiel a las novelas de Fleming, alejado del tono paródico anterior.'},
      {n:16,t:'Licencia para matar',y:1989,tipo:'movie',tag:'Timothy Dalton',p:'La Bond más violenta y personal hasta la fecha, con 007 actuando por venganza fuera del MI6.'},
      {n:17,t:'GoldenEye',y:1995,tipo:'movie',tag:'Pierce Brosnan',p:'Reinicio tras 6 años sin película; adapta la saga al mundo post-Guerra Fría y da el salto a videojuego de culto.'},
      {n:18,t:'El mañana nunca muere',y:1997,tipo:'movie',tag:'Pierce Brosnan',p:'Un magnate de los medios manipula la geopolítica mundial para vender noticias; Bond a la altura de los 90.'},
      {n:19,t:'El mundo nunca es suficiente',y:1999,tipo:'movie',tag:'Pierce Brosnan',p:'Trama sobre oleoductos y venganza con una de las villanas más recordadas, Elektra King.'},
      {n:20,t:'Muere otro día',y:2002,tipo:'movie',tag:'Pierce Brosnan',p:'Última Bond de Brosnan, con coche invisible incluido; cierra la etapa más "gadget" de la saga.'},
      {n:21,t:'Casino Royale',y:2006,tipo:'movie',tag:'Daniel Craig',p:'Reinicio total de la saga: un Bond más crudo, humano y recién ascendido a Doble 0.'},
      {n:22,t:'Quantum of Solace',y:2008,tipo:'movie',tag:'Daniel Craig',p:'Secuela directa de "Casino Royale" centrada en la venganza personal de Bond.'},
      {n:23,t:'Skyfall',y:2012,tipo:'movie',tag:'Daniel Craig',p:'Celebra el 50 aniversario de la saga profundizando en el pasado de Bond y de M; un éxito de crítica y taquilla.'},
      {n:24,t:'Spectre',y:2015,tipo:'movie',tag:'Daniel Craig',p:'Regresa la organización SPECTRE y Blofeld, conectando todas las películas de la era Craig.'},
      {n:25,t:'Sin tiempo para morir',y:2021,tipo:'movie',tag:'Daniel Craig',p:'Cierre definitivo de la etapa de Craig, con el final más arriesgado y emocional de toda la saga.'}
    ];

    // Universo DC — DCEU clásico (2013-2023) por orden cronológico interno + nuevo DCU de James Gunn (2024-).
    // Se excluyen películas de DC fuera de estos universos compartidos (Nolan, Joker, The Batman de Reeves...).
    const DC_UNIVERSO = [
      {n:1,era:'1918',nota:'con marco en la actualidad',t:'Wonder Woman',y:2017,tipo:'movie',tag:'1918 (con marco en la actualidad)',p:'Aunque se estrenó después de "Batman v Superman", su trama transcurre sobre todo en la Primera Guerra Mundial.'},
      {n:2,era:'1984',t:'Wonder Woman 1984',y:2020,tipo:'movie',tag:'1984',p:'Salto temporal de varias décadas; Diana se enfrenta a un empresario con un objeto que concede deseos.'},
      {n:3,era:'Presente',eraCap:'DCEU',t:'El hombre de acero',y:2013,tipo:'movie',tag:'Presente',p:'Origen de Superman y arranque del DCEU tal y como lo conocimos.'},
      {n:4,era:'Presente',eraCap:'DCEU',nota:'Tras El hombre de acero',t:'Batman v Superman: El amanecer de la justicia',y:2016,tipo:'movie',tag:'Tras El hombre de acero',p:'Primer choque entre los dos íconos y presentación en pantalla de Wonder Woman.'},
      {n:5,era:'Presente',eraCap:'DCEU',nota:'Tras Batman v Superman',t:'Escuadrón Suicida',y:2016,tipo:'movie',tag:'Tras Batman v Superman',p:'Un grupo de villanos es reclutado por el gobierno para misiones de alto riesgo.'},
      {n:6,era:'Presente',eraCap:'DCEU',nota:'Tras Escuadrón Suicida',t:'La Liga de la Justicia de Zack Snyder',y:2021,tipo:'movie',tag:'Tras Escuadrón Suicida',p:'La versión definitiva del primer gran crossover del DCEU, con la visión original de Snyder.'},
      {n:7,era:'Presente',eraCap:'DCEU',nota:'Tras Liga de la Justicia',t:'Aquaman',y:2018,tipo:'movie',tag:'Tras Liga de la Justicia',p:'Arthur Curry reclama su lugar como rey de la Atlántida sumergida.'},
      {n:8,era:'Presente',eraCap:'DCEU',nota:'Tras Aquaman',t:'¡Shazam!',y:2019,tipo:'movie',tag:'Tras Aquaman',p:'Un adolescente descubre que puede transformarse en un superhéroe adulto con solo decir una palabra.'},
      {n:9,era:'Presente',eraCap:'DCEU',nota:'Tras Shazam',t:'Aves de presa',y:2020,tipo:'movie',tag:'Tras Shazam',p:'Harley Quinn rompe con el Joker y se une a un grupo de heroínas de Gotham.'},
      {n:10,era:'Presente',eraCap:'DCEU',nota:'Tras Aves de presa',t:'El Escuadrón Suicida',y:2021,tipo:'movie',tag:'Tras Aves de presa',p:'James Gunn reinicia el concepto con un tono más gamberro y sangriento.'},
      {n:11,era:'Presente',eraCap:'DCEU',nota:'Tras El Escuadrón Suicida',t:'Black Adam',y:2022,tipo:'movie',tag:'Tras El Escuadrón Suicida',p:'Dwayne Johnson da vida a un antihéroe con poderes casi ilimitados, tras 5.000 años encerrado.'},
      {n:12,era:'Presente',eraCap:'DCEU',nota:'Tras Black Adam',t:'¡Shazam! La furia de los dioses',y:2023,tipo:'movie',tag:'Tras Black Adam',p:'La familia Shazam se enfrenta a las hijas de Atlas, dioses del panteón griego.'},
      {n:13,era:'Presente',eraCap:'DCEU',nota:'Cierra el DCEU',t:'Flash',y:2023,tipo:'movie',tag:'Cierra el DCEU',p:'Barry Allen viaja en el tiempo y desata un multiverso que da carpetazo a esta etapa del DCEU.'},
      {n:14,era:'Presente',eraCap:'DCEU',nota:'Puente hacia el nuevo DCU',t:'Blue Beetle',y:2023,tipo:'movie',tag:'Puente hacia el nuevo DCU',p:'Suele considerarse el primer paso, aún tímido, hacia la nueva continuidad que llegaría después.'},
      {n:15,era:'Presente',eraCap:'DCEU',nota:'Última del DCEU clásico',t:'Aquaman y el reino perdido',y:2023,tipo:'movie',tag:'Última del DCEU clásico',p:'Despedida oficial del DCEU tal y como se concibió en 2013.'},
      {n:16,era:'Nuevo DCU',nota:'Capítulo 1',t:'Creature Commandos',y:2024,tipo:'tv',tag:'Nuevo DCU · Capítulo 1',p:'Serie animada de James Gunn que inaugura oficialmente el nuevo universo DC compartido.'},
      {n:17,era:'Nuevo DCU',t:'Superman',y:2025,tipo:'movie',tag:'Nuevo DCU',p:'Reinicio del origen de Superman de la mano de James Gunn; primera gran película del nuevo DCU.'},
      {n:18,era:'Nuevo DCU',nota:'Tras Superman',t:'Supergirl',y:2026,tipo:'movie',tag:'Tras Superman',tmdb_id:1081003,p:'Milly Alcock estrena a Kara Zor-El en solitario dentro del nuevo DCU: un viaje interestelar de venganza y justicia para salvar a su perro Krypto, con Jason Momoa como Lobo.'},
      {n:19,era:'Nuevo DCU',nota:'Puente entre universos (T1) / Nuevo DCU (T2)',t:'Pacificador',y:2022,tipo:'tv',tag:'Puente entre universos (T1) / Nuevo DCU (T2)',p:'La primera temporada pertenece al DCEU clásico; la segunda se integra ya en el nuevo DCU.'},
      {n:20,era:'Nuevo DCU',nota:'Tras Superman',t:'Linternas',y:2026,tipo:'tv',tmdb_id:95350,tag:'Nuevo DCU · HBO Max',p:'Hal Jordan y John Stewart, dos Green Lantern, investigan un asesinato en el corazón de Estados Unidos. Serie de HBO con tono de thriller policial.'},
      {n:21,era:'Nuevo DCU',t:'Clayface',y:2026,tipo:'movie',tmdb_id:1400940,tag:'Nuevo DCU · terror',p:'El origen de Clayface, uno de los villanos de Batman, en clave de terror corporal dentro del nuevo DCU.'},
      {n:22,era:'Próximamente',nota:'se estrena el 7 de julio de 2027',t:'El Hombre del Mañana',y:2027,tipo:'movie',tmdb_id:1523140,tag:'estreno: 7 de julio de 2027',p:'«Man of Tomorrow»: la continuación de «Superman» de James Gunn, con Lex Luthor de nuevo en el centro.'}
    ];

    const TARANTINO = [
      {n:1,t:'Reservoir Dogs',y:1992,tipo:'movie',tag:'Primer largo',p:'El debut que lo cambió todo: ocho hombres en una habitación tras un atraco que salió mal. Diálogo afilado, tensión pura y la primera demostración de que Tarantino iba a jugar diferente.'},
      {n:2,t:'Pulp Fiction',y:1994,tipo:'movie',tag:'Obra maestra',p:'La película que reinventó el cine independiente de los 90. Tres historias entrelazadas, estructura no lineal y personajes que no se olvidan. Referencia absoluta del cine moderno.'},
      {n:3,t:'Jackie Brown',y:1997,tipo:'movie',tag:'La más infravalorada',p:'Su homenaje al blaxploitation de los 70. Más tranquila que las otras, pero igual de brillante. Si no la has visto todavía, te llevas una sorpresa.'},
      {n:4,t:'Kill Bill: Volumen 1',y:2003,tipo:'movie',tag:'Primera parte',p:'Explosión de violencia estilizada, anime, kung fu y venganza. Una experiencia visual única que se disfruta como un cómic en movimiento.'},
      {n:5,t:'Kill Bill: Volumen 2',y:2004,tipo:'movie',tag:'Segunda parte',p:'Donde el volumen 1 era pura adrenalina, el 2 frena y profundiza. Más diálogos, más personaje, el mismo universo pero con otra temperatura.'},
      {n:6,t:'Death Proof',y:2007,tipo:'movie',tag:'Grindhouse',p:'Su experimento más extremo: homenaje a los coches de los 70 con Kurt Russell de villano. Polariza, pero los que la aman la aman con locura.'},
      {n:7,t:'Malditos bastardos',y:2009,tipo:'movie',tag:'Revisión histórica',p:'La Segunda Guerra Mundial reescrita con el descaro de Tarantino. Brad Pitt lidera un grupo de soldados judeoamericanos en una película llena de escenas que ya son historia del cine.'},
      {n:8,t:'Django desencadenado',y:2012,tipo:'movie',tag:'Western revisionista',p:'Un esclavo liberado busca a su esposa en el sur de EE.UU. Jamie Foxx y Christoph Waltz en una de las parejas más carismáticas del cine reciente. Divertida, brutal y directa.'},
      {n:9,t:'Los odiosos ocho',y:2015,tipo:'movie',tag:'Whodunit de invierno',p:'Ocho desconocidos atrapados en una cabaña durante una ventisca. Tarantino en modo cámara de teatro: casi todo ocurre en un único espacio y la tensión no afloja en ningún momento.'},
      {n:10,t:'Érase una vez en... Hollywood',y:2019,tipo:'movie',tag:'Carta de amor al cine',p:'Su película más personal: Hollywood en 1969, el final de una era dorada. Leonardo DiCaprio y Brad Pitt en estado puro. Más contemplativa que las anteriores, pero la recompensa es enorme.'}
    ];

    const COEN = [
      {n:1,t:'Sangre fácil',y:1984,tipo:'movie',tag:'Debut',p:'El primer largo de los Coen ya venía con su sello inconfundible: crimen, traición y consecuencias imprevistas en el sur de Texas. Un noir de manual que anunciaba lo que estaba por venir.'},
      {n:2,t:'Arizona Baby',y:1987,tipo:'movie',tag:'Comedia disparatada',p:'Un ex-presidiario y su mujer policía raptan a un bebé de quíntuplets. Comedia absurda con una energía visual que te arrolla desde el primer plano. Inesperadamente tierna.'},
      {n:3,t:'Muerte entre las flores',y:1990,tipo:'movie',tag:'Noir de gánsters',p:'El mejor filme de gánsters de los Coen, basado en el universo de Dashiell Hammett. Violencia, lealtades rotas y uno de los planos de persecución más elegantes del cine.'},
      {n:4,t:'Barton Fink',y:1991,tipo:'movie',tag:'Palma de Oro Cannes',p:'Un dramaturgo neoyorquino llega a Hollywood con bloqueo creativo y paranoia creciente. Kafkiana, opresiva y extrañísima. La que más divide a los fans, y también la que más te persigue.'},
      {n:5,t:'Fargo',y:1996,tipo:'movie',tag:'2 Óscar (incl. Mejor Guion)',p:'Un secuestro sale terriblemente mal en la nieve de Minnesota. Probablemente la obra maestra absoluta de los Coen: humor negrísimo, violencia brutal y Frances McDormand en su papel más icónico.'},
      {n:6,t:'El gran Lebowski',y:1998,tipo:'movie',tag:'Película de culto',p:'El Nota busca que le paguen una alfombra. Suena simple, pero es una de las comedias más ricas y citadas de la historia. Cada personaje es un universo y Jeff Bridges nunca ha estado mejor.'},
      {n:7,t:'O Brother, Where Art Thou?',y:2000,tipo:'movie',tag:'Comedia musical',p:'La Odisea de Homero trasladada al sur de EE.UU. en los años 30, con música country y bluegrass. Luminosa, divertida y con una banda sonora que ganó el Grammy al mejor álbum del año.'},
      {n:8,t:'El hombre que nunca estuvo allí',y:2001,tipo:'movie',tag:'Noir en blanco y negro',p:'Un barbero silencioso en la California de los 50 se mete en un lío de chantaje. Fotografía en blanco y negro deslumbrante. Su homenaje más puro al noir clásico.'},
      {n:9,t:'No es país para viejos',y:2007,tipo:'movie',tag:'Óscar Mejor Película',p:'Un hombre encuentra una maleta llena de dinero en el desierto de Texas. Anton Chigurh es uno de los villanos más aterradores del cine. Adaptación perfecta de Cormac McCarthy.'},
      {n:10,t:'Quémame después de leer',y:2008,tipo:'movie',tmdb_id:4944,tag:'Comedia negra',p:'Brad Pitt, George Clooney y Frances McDormand en una comedia de espías completamente ridícula y brillante. Todo el mundo malinterpreta todo y las consecuencias son desastrosas.'},
      {n:11,t:'Un tipo serio',y:2009,tipo:'movie',tag:'Semipersonal',p:'Un profesor de física judío en Minnesota ve cómo su vida se desmorona sin explicación aparente. La más oscura y la más filosófica. Kafkiana con un humor que duele.'},
      {n:12,t:'Valor de ley',y:2010,tipo:'movie',tag:'Western',p:'Una niña de 14 años contrata a un alguacil borrachín para vengar a su padre. Jeff Bridges, Matt Damon y Hailee Steinfeld en un western duro y emotivo a partes iguales.'},
      {n:13,t:'A propósito de Llewyn Davis',y:2013,tipo:'movie',tag:'Favorita de fans',p:'Una semana en la vida de un músico folk en el Greenwich Village de 1961 que no termina de despegar. Melancólica y circular, con una banda sonora de T Bone Burnett que es un regalo.'},
      {n:14,t:'Ave, César!',y:2016,tipo:'movie',tag:'Comedia de Hollywood',p:'Un día en la vida de un productor del Hollywood de los 50. Homenaje al cine clásico con un reparto estelar y el humor absurdo que los Coen dominan como nadie.'},
      {n:15,t:'La balada de Buster Scruggs',y:2018,tipo:'movie',tag:'Antología Netflix',p:'Seis historias cortas del oeste americano, desde la más cómica hasta la más existencial. Cada segmento tiene su propio tono y todos comparten la misma visión: el oeste como escenario de lo inevitable.'}
    ];

    const NOLAN = [
      {n:1,t:'Following',y:1998,tipo:'movie',tag:'Primer largo',p:'Con 16.000 dólares y en blanco y negro, Nolan ya demostraba su obsesión por la estructura narrativa no lineal. Imprescindible para entender de dónde viene todo lo que vendría después.'},
      {n:2,t:'Memento',y:2000,tipo:'movie',tag:'La que lo cambió todo',p:'Un hombre sin memoria a corto plazo investiga el asesinato de su mujer. Narrada al revés. Una de las estructuras más ingeniosas del cine moderno. Dos visionados mínimo.'},
      {n:3,t:'Insomnia',y:2002,tipo:'movie',tag:'Encargo de estudio',p:'Su único trabajo de encargo, pero impecable. Al Pacino como detective que no puede dormir en Alaska. Más clásica que las otras, pero el pulso no falla en ningún momento.'},
      {n:4,t:'Batman Begins',y:2005,tipo:'movie',tag:'Trilogía Batman',p:'El superhéroe reinterpretado como thriller de crimen realista. Devolvió a Batman la credibilidad que había perdido. El origen que definió cómo se hacen las películas de superhéroes hoy.'},
      {n:5,t:'El truco final',y:2006,tipo:'movie',tag:'Joya infravalorada',p:'Dos magos rivales en el Londres victoriano. La más perfecta de sus películas en cuanto a estructura: todo está en el texto desde el principio y solo lo ves la segunda vez. Absolutamente recomendable.'},
      {n:6,t:'El caballero oscuro',y:2008,tipo:'movie',tag:'Obra maestra',p:'No es solo una película de superhéroes: es un thriller sobre el caos, el orden y los límites morales. Heath Ledger como el Joker es insuperable. Una de las mejores películas del siglo.'},
      {n:7,t:'Origen',y:2010,tipo:'movie',tag:'Sci-fi de autor',p:'Un ladrón que roba ideas de los sueños recibe una misión imposible: plantar una idea. Cada visionado revela algo nuevo. La película de ciencia ficción más ambiciosa de su generación.'},
      {n:8,t:'El caballero oscuro: La leyenda renace',y:2012,tipo:'movie',tag:'Trilogía Batman',p:'El cierre de la trilogía. Más épica y más imperfecta que la anterior, pero el arco emocional de Bruce Wayne llega a un final que satisface. Tom Hardy como Bane, imponente.'},
      {n:9,t:'Interstellar',y:2014,tipo:'movie',tag:'La más emotiva',p:'Astronautas viajan más allá de la galaxia buscando un nuevo hogar para la humanidad. La más sentimental de sus películas. Divide, pero la escena del planeta con las olas no se olvida fácil.'},
      {n:10,t:'Dunkerque',y:2017,tipo:'movie',tag:'Bélica minimalista',p:'La evacuación de Dunkerque narrada desde tres perspectivas temporales distintas. Sin héroes ni villanos reconocibles, solo el caos y el instinto de supervivencia. En IMAX, una experiencia física.'},
      {n:11,t:'Tenet',y:2020,tipo:'movie',tag:'La más compleja',p:'Un protagonista sin nombre opera en un mundo donde el tiempo puede invertirse. La más difícil de seguir y también la que más recompensa a quien la trabaja. Mejor verla dos veces.'},
      {n:12,t:'Oppenheimer',y:2023,tipo:'movie',tag:'Óscar Mejor Película',p:'La creación de la bomba atómica y el peso moral de quien la hizo posible. Cillian Murphy está soberbio. Tres horas que no pesan.'},
      {n:13,t:'La Odisea',y:2025,tipo:'movie',tmdb_id:1368337,tag:'Último estreno',p:'Su adaptación de la epopeya de Homero. El viaje de Odiseo de vuelta a casa tras la guerra de Troya, con el sello visual y sonoro de Nolan llevado a la épica clásica. La más ambiciosa de su carrera.'}
    ];

    // Pelis de miedo — imprescindibles del terror, de clásico a moderno
    const TERROR = [
      {n:1,t:'El exorcista',y:1973,tipo:'movie',tag:'Terror sobrenatural',p:'La que definió el terror religioso para siempre; sigue siendo perturbadora medio siglo después.'},
      {n:2,t:'La noche de Halloween',y:1978,tipo:'movie',tag:'Slasher fundacional',p:'John Carpenter inventa prácticamente el slasher moderno con Michael Myers.'},
      {n:3,t:'El bebé de Rosemary',y:1968,tipo:'movie',tag:'Terror psicológico',p:'Polanski construye la paranoia perfecta sin apenas mostrar nada explícito.'},
      {n:4,t:'La cosa',y:1982,tipo:'movie',tag:'Terror + ciencia ficción',p:'Paranoia y efectos prácticos brutales en una base antártica infestada por algo que imita a los humanos.'},
      {n:5,t:'Posesión infernal',y:1981,tipo:'movie',tag:'Terror gore de culto',p:'Sam Raimi define el terror de cabaña en el bosque con un gore delirante y muy influyente.'},
      {n:6,t:'Pesadilla en Elm Street',y:1984,tipo:'movie',tag:'Slasher onírico',p:'Freddy Krueger convierte el sueño en el escenario del terror; Wes Craven en estado puro.'},
      {n:7,t:'El aro',y:2002,tipo:'movie',tag:'Terror de maldición',p:'El remake que introdujo el terror de fantasmas japonés al gran público occidental.'},
      {n:8,t:'Expediente Warren',y:2013,tipo:'movie',tag:'Terror de casa encantada',p:'James Wan revitaliza el género con un terror clásico, bien construido y sin necesidad de gore.'},
      {n:9,t:'Insidious',y:2010,tipo:'movie',tag:'Terror sobrenatural',p:'Sustos bien calculados y una mitología propia sobre un plano astral llamado "Más Allá".'},
      {n:10,t:'Sinister',y:2012,tipo:'movie',tag:'Terror found footage',p:'Unas cintas caseras encontradas esconden algo mucho más siniestro de lo que parece.'},
      {n:11,t:'La bruja',y:2015,tipo:'movie',tag:'Terror de época',p:'Robert Eggers construye un terror lentísimo y asfixiante ambientado en la Nueva Inglaterra puritana.'},
      {n:12,t:'It Follows',y:2014,tipo:'movie',tag:'Terror de persecución',p:'Una maldición que se transmite y que siempre, siempre, viene caminando hacia ti.'},
      {n:13,t:'Hereditary',y:2018,tipo:'movie',tag:'Terror familiar',p:'Ari Aster convierte el duelo familiar en una de las películas de terror más angustiosas de la década.'},
      {n:14,t:'Midsommar',y:2019,tipo:'movie',tag:'Terror folclórico a plena luz del día',p:'Terror que ocurre casi todo de día, en un festival pagano sueco que se va torciendo poco a poco.'},
      {n:15,t:'¡Huye!',y:2017,tipo:'movie',tag:'Terror social',p:'Jordan Peele mezcla terror y crítica racial en un debut que redefinió el género.'},
      {n:16,t:'La profecía',y:1976,tipo:'movie',tag:'Terror del anticristo',p:'Un diplomático descubre que su hijo adoptivo podría ser el anticristo; terror religioso clásico de los 70.'},
      {n:17,t:'Poltergeist',y:1982,tipo:'movie',tag:'Terror de casa encantada',p:'Una familia suburbana ve cómo su casa es invadida por fuerzas del más allá; terror muy influyente para su época.'},
      {n:18,t:'Scream',y:1996,tipo:'movie',tag:'Slasher autoconsciente',p:'Wes Craven reinventa el slasher jugando con sus propias reglas y con un público que se las sabe de memoria.'},
      {n:19,t:'28 días después',y:2002,tipo:'movie',tag:'Terror post-apocalíptico',p:'Reinventa el género zombi con infectados rapidísimos y un Londres completamente vacío.'},
      {n:20,t:'Saw',y:2004,tipo:'movie',tag:'Terror de trampas mortales',p:'El origen de todo un subgénero de terror de trampas, con un giro final muy comentado en su momento.'},
      {n:21,t:'El orfanato',y:2007,tipo:'movie',tag:'Terror sobrenatural español',p:'Guillermo del Toro produce este terror gótico español, elegante y profundamente emotivo.'},
      {n:22,t:'Déjame entrar',y:2008,tipo:'movie',tag:'Terror con vampiros',p:'Una historia de amistad y vampirismo ambientada en la nieve sueca; terror con mucho más corazón del habitual.'},
      {n:23,t:'La huérfana',y:2009,tipo:'movie',tag:'Terror familiar',p:'Una familia adopta a una niña que esconde un secreto perturbador; giro final muy recordado.'},
      {n:24,t:'Verónica',y:2017,tipo:'movie',tag:'Terror sobrenatural español',p:'Una sesión de ouija en un instituto de Madrid desata algo que no debería haberse despertado.'},
      {n:25,t:'Un lugar tranquilo',y:2018,tipo:'movie',tag:'Terror silencioso',p:'Una familia sobrevive en silencio absoluto ante criaturas que cazan por el sonido; tensión constante sin apenas diálogo.'}
    ];

    // Thrillers psicológicos — mentes rotas, manipulación y giros mentales
    const THRILLER_PSICOLOGICO = [
      {n:1,t:'El silencio de los corderos',y:1991,tipo:'movie',tag:'Duelo de mentes',p:'El duelo entre Clarice Starling y Hannibal Lecter que redefinió el thriller psicológico.'},
      {n:2,t:'Seven',y:1995,tipo:'movie',tag:'Thriller criminal',p:'Un asesino que convierte los pecados capitales en un macabro plan maestro; final devastador.'},
      {n:3,t:'El club de la lucha',y:1999,tipo:'movie',tag:'Identidad fracturada',p:'Fincher diseca la masculinidad, el consumismo y la identidad con un giro que lo cambia todo.'},
      {n:4,t:'Los sospechosos de siempre',y:1995,tipo:'movie',tag:'Narrador poco fiable',p:'Uno de los finales más citados de la historia del cine; nada es lo que parece.'},
      {n:5,t:'Memento',y:2000,tipo:'movie',tag:'Memoria y estructura',p:'Nolan cuenta la historia al revés para meterte literalmente en la cabeza de un hombre sin memoria reciente.'},
      {n:6,t:'El juego',y:1997,tipo:'movie',tag:'Paranoia',p:'Un multimillonario se apunta a un "juego" que empieza a devorar por completo su vida real.'},
      {n:7,t:'Shutter Island',y:2010,tipo:'movie',tag:'Realidad inestable',p:'Scorsese y DiCaprio construyen un rompecabezas mental ambientado en un psiquiátrico de máxima seguridad.'},
      {n:8,t:'Black Swan',y:2010,tipo:'movie',tag:'Obsesión y perfección',p:'La presión por la perfección artística devora literalmente la cordura de su protagonista.'},
      {n:9,t:'Perdida',y:2014,tipo:'movie',tag:'Matrimonio y manipulación',p:'Fincher adapta a Gillian Flynn en un retrato feroz de un matrimonio que esconde mucho más de lo que parece.'},
      {n:10,t:'Prisioneros',y:2013,tipo:'movie',tag:'Moralidad al límite',p:'Un padre desesperado cruza líneas que no debería cruzar buscando a su hija desaparecida.'},
      {n:11,t:'Zodiac',y:2007,tipo:'movie',tag:'Obsesión investigativa',p:'La obsesión por resolver un caso real sin solución, contada con una tensión que no necesita violencia explícita.'},
      {n:12,t:'Parásitos',y:2019,tipo:'movie',tag:'Tensión de clases',p:'Bong Joon-ho construye una tensión que no para de escalar hasta un punto de no retorno.'},
      {n:13,t:'Chinatown',y:1974,tipo:'movie',tag:'Neo-noir',p:'Uno de los guiones más perfectos jamás escritos; corrupción, agua y secretos familiares en Los Ángeles.'},
      {n:14,t:'Perdición',y:1944,tipo:'movie',tag:'Cine negro clásico',p:'La plantilla del cine negro: una femme fatale, un plan perfecto y una voz en off que ya sabe cómo acaba todo.'},
      {n:15,t:'Alguien voló sobre el nido del cuco',y:1975,tipo:'movie',tag:'Institución y control',p:'Jack Nicholson en un psiquiátrico que funciona como metáfora de la represión y el control social.'},
      {n:16,t:'Atracción fatal',y:1987,tipo:'movie',tag:'Obsesión romántica',p:'Una aventura de una noche se convierte en la peor pesadilla posible; thriller que definió el subgénero.'},
      {n:17,t:'El resplandor',y:1980,tipo:'movie',tag:'Aislamiento y locura',p:'Un hotel vacío en invierno y una familia que se va desmoronando poco a poco; Kubrick en estado puro.'},
      {n:18,t:'American Psycho',y:2000,tipo:'movie',tag:'Sátira y locura',p:'Un ejecutivo de Wall Street esconde (¿o no?) los instintos más oscuros bajo un traje impecable.'},
      {n:19,t:'Adiós, pequeña, adiós',y:2007,tipo:'movie',tag:'Moralidad ambigua',p:'Ben Affleck dirige un thriller sobre un secuestro que se complica con cada decisión moral que toman sus protagonistas.'},
      {n:20,t:'Nightcrawler',y:2014,tipo:'movie',tag:'Ambición sin límites',p:'Jake Gyllenhaal como un periodista freelance sin escrúpulos que graba accidentes y crímenes para venderlos a la tele.'},
      {n:21,t:'Enemigo',y:2013,tipo:'movie',tag:'Identidad y dobles',p:'Denis Villeneuve y Jake Gyllenhaal en una pesadilla sobre un hombre que encuentra a su doble exacto.'},
      {n:22,t:'Ex Machina',y:2014,tipo:'movie',tag:'IA y manipulación',p:'Un test de Turing que se convierte en un juego de manipulación mucho más inquietante de lo esperado.'},
      {n:23,t:'La habitación',y:2015,tipo:'movie',tag:'Cautiverio y libertad',p:'Una madre y su hijo intentan reconstruir su vida tras años encerrados; devastador y esperanzador a la vez.'},
      {n:24,t:'La chica del tren',y:2016,tipo:'movie',tag:'Narradora poco fiable',p:'Una mujer alcohólica se obsesiona con la vida de una pareja que observa cada día desde el tren.'},
      {n:25,t:'Bajo la piel',y:2013,tipo:'movie',tag:'Extrañeza absoluta',p:'Scarlett Johansson como una presencia alienígena que caza hombres por las calles de Escocia; hipnótica e incómoda.'}
    ];

    // Thrillers de acción — pulso, persecuciones y set pieces memorables
    const THRILLER_ACCION = [
      {n:1,t:'Jungla de cristal',y:1988,tipo:'movie',tag:'El origen del "un hombre contra todos"',p:'John McClane define para siempre la fórmula del héroe de acción atrapado y sin ayuda.'},
      {n:2,t:'El fugitivo',y:1993,tipo:'movie',tag:'Persecución implacable',p:'Harrison Ford huyendo de la ley mientras intenta demostrar su inocencia; ritmo perfecto de principio a fin.'},
      {n:3,t:'Máxima velocidad',y:1994,tipo:'movie',tag:'Tensión en tiempo real',p:'Un autobús que no puede bajar de cierta velocidad o explota; tensión sin un solo respiro.'},
      {n:4,t:'Heat',y:1995,tipo:'movie',tag:'Ladrones vs. policía',p:'Michael Mann enfrenta a De Niro y Pacino en el atraco y tiroteo callejero más influyente del cine moderno.'},
      {n:5,t:'Misión: Imposible',y:1996,tipo:'movie',tag:'Espionaje de acción',p:'La escena de la cámara acorazada colgando del techo, sin apenas diálogo, ya vale la entrada.'},
      {n:6,t:'El caso Bourne',y:2002,tipo:'movie',tag:'Espía sin memoria',p:'Reinventa el género de espías con una acción más cruda, realista y sin gadgets imposibles.'},
      {n:7,t:'Colateral',y:2004,tipo:'movie',tag:'Una noche, un taxi',p:'Un taxista se ve arrastrado a una noche entera con un asesino a sueldo en Los Ángeles.'},
      {n:8,t:'El fuego de la venganza',y:2004,tipo:'movie',tag:'Venganza personal',p:'Denzel Washington como guardaespaldas que se convierte en un ángel vengador imparable.'},
      {n:9,t:'Sicario',y:2015,tipo:'movie',tag:'Guerra contra el narco',p:'Denis Villeneuve retrata la guerra contra el narco en la frontera con una tensión asfixiante.'},
      {n:10,t:'Mad Max: Furia en la carretera',y:2015,tipo:'movie',tag:'Persecución postapocalíptica',p:'Dos horas de persecución casi ininterrumpida; probablemente la mejor película de acción del siglo.'},
      {n:11,t:'John Wick',y:2014,tipo:'movie',tag:'Venganza coreografiada',p:'Coreografías de acción que revitalizaron por completo el género en la última década.'},
      {n:12,t:'Nadie',y:2021,tipo:'movie',tag:'El vecino que no debías provocar',p:'Un padre de familia aparentemente normal resulta tener un pasado bastante más violento de lo esperado.'},
      {n:13,t:'León: el profesional',y:1994,tipo:'movie',tag:'Asesino con corazón',p:'Un sicario solitario protege a una niña huérfana; acción con una ternura poco habitual en el género.'},
      {n:14,t:'Terminator 2: el juicio final',y:1991,tipo:'movie',tag:'Persecución imparable',p:'James Cameron perfecciona su propia fórmula con un villano líquido y set pieces todavía impresionantes hoy.'},
      {n:15,t:'Con Air: convictos en el aire',y:1997,tipo:'movie',tag:'Acción de los 90',p:'Un avión lleno de los peores criminales de EE.UU. secuestrado en pleno vuelo; acción noventera sin complejos.'},
      {n:16,t:'El ultimátum de Bourne',y:2007,tipo:'movie',tag:'Espionaje de acción',p:'Considerada la mejor entrega de la trilogía original; persecución tras persecución sin un respiro.'},
      {n:17,t:'Búsqueda implacable',y:2008,tipo:'movie',tag:'Rescate contrarreloj',p:'Liam Neeson y su "set de habilidades muy particular" buscando a su hija secuestrada en 96 horas.'},
      {n:18,t:'La redada asesina',y:2011,tipo:'movie',tag:'Acción indonesia sin descanso',p:'Un edificio entero controlado por criminales y un equipo que debe abrirse paso planta a planta; coreografías brutales.'},
      {n:19,t:'Dredd',y:2012,tipo:'movie',tag:'Acción distópica',p:'Un juez implacable limpia un bloque de apartamentos vertical controlado por un cartel de la droga.'},
      {n:20,t:'Kingsman: servicio secreto',y:2014,tipo:'movie',tag:'Espionaje con humor',p:'Espías con estilo británico impecable y una escena de iglesia que se hizo viral por su nivel de locura.'},
      {n:21,t:'Baby Driver',y:2017,tipo:'movie',tag:'Persecuciones al ritmo de la música',p:'Cada persecución de coches está coreografiada al ritmo exacto de la banda sonora; un experimento único.'},
      {n:22,t:'Misión: Imposible - Fallout',y:2018,tipo:'movie',tag:'Acrobacias reales',p:'Tom Cruise haciendo sus propias acrobacias en la que muchos consideran la mejor entrega de toda la saga.'},
      {n:23,t:'Tyler Rake',y:2020,tipo:'movie',tag:'Acción sin tregua',p:'Chris Hemsworth como mercenario en una misión de rescate con un plano secuencia de acción larguísimo.'},
      {n:24,t:'Atómica',y:2017,tipo:'movie',tag:'Espionaje en la Guerra Fría',p:'Charlize Theron en un thriller de espías con una coreografía de peleas brutal en un hueco de escalera.'},
      {n:25,t:'RRR',y:2022,tipo:'movie',tag:'Épica de acción india',p:'Un espectáculo de acción, música y amistad a una escala que Hollywood rara vez se atreve a intentar.'}
    ];

    // Películas con giros de guión imposibles — nada es lo que parece
    const GIROS_GUION = [
      {n:1,t:'El sexto sentido',y:1999,tipo:'movie',tag:'⚠️ Final que lo cambia todo',p:'El giro que se convirtió en sinónimo de "final sorpresa" en la cultura popular.'},
      {n:2,t:'Los otros',y:2001,tipo:'movie',tag:'⚠️ Final que lo cambia todo',p:'Alejandro Amenábar construye un giro que reordena toda la película que acabas de ver.'},
      {n:3,t:'Los sospechosos de siempre',y:1995,tipo:'movie',tag:'⚠️ Narrador poco fiable',p:'"La mayor artimaña del diablo fue convencer al mundo de que no existía". Y ya sabes cómo termina.'},
      {n:4,t:'El club de la lucha',y:1999,tipo:'movie',tag:'⚠️ Identidad',p:'Un giro que obliga a replantearse todo lo visto en las dos horas anteriores.'},
      {n:5,t:'Origen',y:2010,tipo:'movie',tag:'⚠️ Realidad ambigua',p:'La peonza que sigue girando (¿o no?) en el plano final más debatido de la última década.'},
      {n:6,t:'Shutter Island',y:2010,tipo:'movie',tag:'⚠️ Realidad inestable',p:'Una revelación final que te obliga a rebobinar mentalmente toda la trama.'},
      {n:7,t:'Oldboy',y:2003,tipo:'movie',tag:'⚠️ Venganza y revelación',p:'Uno de los giros más brutales y perturbadores del cine coreano moderno.'},
      {n:8,t:'Perdida',y:2014,tipo:'movie',tag:'⚠️ Punto medio revelador',p:'El giro llega a mitad de película y cambia por completo quién es realmente la víctima.'},
      {n:9,t:'Ahora me ves',y:2013,tipo:'movie',tag:'⚠️ Trama orquestada',p:'Magos, atracos y una revelación final que reordena todo el plan desde el principio.'},
      {n:10,t:'La llegada',y:2016,tipo:'movie',tag:'⚠️ Percepción del tiempo',p:'Un giro conceptual sobre el lenguaje y el tiempo que se entiende del todo solo al final.'},
      {n:11,t:'Parásitos',y:2019,tipo:'movie',tag:'⚠️ Punto de inflexión',p:'El timbre que suena a mitad de metraje cambia el género de la película que estabas viendo.'},
      {n:12,t:'Seven',y:1995,tipo:'movie',tag:'⚠️ Final devastador',p:'"¿Qué hay en la caja?" Uno de los finales más duros y comentados del thriller moderno.'},
      {n:13,t:'El truco final',y:2006,tipo:'movie',tag:'⚠️ Rivalidad y secreto',p:'Dos magos rivales esconden un secreto que cambia por completo el sentido de todo lo anterior.'},
      {n:14,t:'Identidad',y:2003,tipo:'movie',tag:'⚠️ Realidad fragmentada',p:'Un grupo de desconocidos atrapados en un motel durante una tormenta esconde mucho más de lo que parece.'},
      {n:15,t:'La cabaña en el bosque',y:2012,tipo:'movie',tag:'⚠️ Subversión de género',p:'Empieza como un slasher cualquiera y termina siendo otra cosa completamente distinta.'},
      {n:16,t:'Fractura',y:2019,tipo:'movie',tag:'⚠️ Realidad distorsionada',p:'Una familia en un hospital tras un accidente descubre que nada encaja como debería.'},
      {n:17,t:'Coherence',y:2013,tipo:'movie',tag:'⚠️ Realidades paralelas',p:'Una cena entre amigos se complica con física cuántica; cuanto menos sepas antes de verla, mejor.'},
      {n:18,t:'Cisne negro',y:2010,tipo:'movie',tag:'⚠️ Percepción quebrada',p:'La línea entre lo que es real y lo que es delirio se difumina hasta el final, y no siempre queda clara.'}
    ];

    // Para ver en pareja — comedia, romance y algo de todo para gustos cruzados
    const PARA_PAREJA = [
      {n:1,t:'Diario de una pasión',y:2004,tipo:'movie',tag:'Romance clásico',p:'La historia de amor de toda una vida que se ha convertido en el estándar del género romántico.'},
      {n:2,t:'Cuando Harry encontró a Sally',y:1989,tipo:'movie',tag:'Comedia romántica',p:'La pregunta de si un hombre y una mujer pueden ser solo amigos, resuelta con muchísimo ingenio.'},
      {n:3,t:'Orgullo y prejuicio',y:2005,tipo:'movie',tag:'Romance de época',p:'La adaptación de Jane Austen más elegante y accesible para ver juntos un domingo por la tarde.'},
      {n:4,t:'Antes del amanecer',y:1995,tipo:'movie',tag:'Romance conversacional',p:'Dos desconocidos, una noche en Viena, y una conversación que se siente completamente real.'},
      {n:5,t:'Notting Hill',y:1999,tipo:'movie',tag:'Comedia romántica',p:'Una librería, una estrella de cine y el Londres más entrañable de la comedia romántica de los 90.'},
      {n:6,t:'500 días juntos',y:2009,tipo:'movie',tag:'Romance no lineal',p:'Cuenta una relación fuera de orden cronológico, sin idealizarla ni convertirla en cuento de hadas.'},
      {n:7,t:'La La Land',y:2016,tipo:'movie',tag:'Musical romántico',p:'Amor, ambición y sueños que no siempre encajan del todo; visualmente precioso de principio a fin.'},
      {n:8,t:'El lado bueno de las cosas',y:2012,tipo:'movie',tag:'Comedia con corazón',p:'Dos personas rotas que se encuentran, con mucho humor y sin edulcorar del todo sus problemas.'},
      {n:9,t:'Locamente millonarios',y:2018,tipo:'movie',tag:'Comedia romántica',p:'Glamour, familia y un choque cultural que funciona tanto para reír como para pasar un buen rato juntos.'},
      {n:10,t:'La forma del agua',y:2017,tipo:'movie',tag:'Romance fantástico',p:'Un cuento de amor imposible y precioso que ganó el Óscar a Mejor Película.'},
      {n:11,t:'Palm Springs',y:2020,tipo:'movie',tag:'Comedia con bucle temporal',p:'Una boda, un bucle temporal infinito y una química de pareja que lo hace todo mejor.'},
      {n:12,t:'Eterno resplandor de una mente sin recuerdos',y:2004,tipo:'movie',tag:'Romance con ciencia ficción',p:'Qué pasaría si pudieras borrar de tu memoria a tu ex; una de las historias de amor más originales jamás escritas.'},
      {n:13,t:'El diario de Bridget Jones',y:2001,tipo:'movie',tag:'Comedia romántica',p:'Renée Zellweger como la soltera más entrañable y torpe del cine romántico británico.'},
      {n:14,t:'Cómo perder a un chico en 10 días',y:2003,tipo:'movie',tag:'Comedia romántica',p:'Una apuesta cruzada entre dos personas que intentan, sin saberlo, sabotearse mutuamente su propia relación.'},
      {n:15,t:'La boda de mi mejor amigo',y:1997,tipo:'movie',tag:'Comedia romántica',p:'Julia Roberts intenta reconquistar a su mejor amigo justo antes de que este se case con otra.'},
      {n:16,t:'Amélie',y:2001,tipo:'movie',tag:'Romance con mucho encanto',p:'Una joven parisina cambia en secreto la vida de quienes la rodean; una de las películas más entrañables del cine francés.'},
      {n:17,t:'10 cosas que odio de ti',y:1999,tipo:'movie',tag:'Comedia adolescente clásica',p:'Adaptación libre de Shakespeare con una química de pareja que sigue funcionando décadas después.'},
      {n:18,t:'Ghost, más allá del amor',y:1990,tipo:'movie',tag:'Romance sobrenatural',p:'La escena del torno de alfarero es tan icónica que se ha parodiado un millón de veces.'},
      {n:19,t:'Dirty Dancing',y:1987,tipo:'movie',tag:'Romance con baile',p:'"Nadie pone a Baby en un rincón"; el romance de verano ochentero por excelencia.'},
      {n:20,t:'Loco y estúpido amor',y:2011,tipo:'movie',tag:'Comedia romántica coral',p:'Varias historias de amor entrelazadas con un reparto coral y un giro final muy bien llevado.'},
      {n:21,t:'Yesterday',y:2019,tipo:'movie',tag:'Comedia romántica musical',p:'Un mundo donde solo él recuerda a los Beatles; comedia ligera con banda sonora inmejorable.'},
      {n:22,t:'Definitivamente, quizás',y:2008,tipo:'movie',tag:'Comedia romántica',p:'Un padre le cuenta a su hija la historia de sus tres grandes amores, sin revelar cuál de ellas es su madre.'},
      {n:23,t:'Julie & Julia',y:2009,tipo:'movie',tag:'Comedia con cocina de por medio',p:'Dos historias en paralelo sobre la pasión por la cocina; perfecta para ver mientras se cena algo rico.'},
      {n:24,t:'Perdiendo el norte',y:2015,tipo:'movie',tag:'Comedia romántica española',p:'Jóvenes españoles emigrando a Alemania en busca de futuro; comedia ligera con corazón.'}
    ];

    // Clásicos de siempre — el canon que todo cinéfilo debería ver al menos una vez
    const CLASICOS_SIEMPRE = [
      {n:1,t:'Ciudadano Kane',y:1941,tipo:'movie',tag:'El clásico de los clásicos',p:'Considerada durante décadas la mejor película jamás hecha; revolucionó el lenguaje cinematográfico.'},
      {n:2,t:'Casablanca',y:1942,tipo:'movie',tag:'Romance de guerra',p:'"Siempre nos quedará París". El romance y los diálogos más citados de la Edad de Oro de Hollywood.'},
      {n:3,t:'Lo que el viento se llevó',y:1939,tipo:'movie',tag:'Épica histórica',p:'Superproducción histórica sobre la guerra civil americana; un hito técnico para su época.'},
      {n:4,t:'Doce hombres sin piedad',y:1957,tipo:'movie',tag:'Drama de sala cerrada',p:'Una sola habitación, doce jurados, y una tensión que no necesita nada más para atraparte.'},
      {n:5,t:'La ventana indiscreta',y:1954,tipo:'movie',tag:'Suspense de Hitchcock',p:'Hitchcock convierte espiar a los vecinos en una de las tramas de suspense más elegantes jamás filmadas.'},
      {n:6,t:'Con la muerte en los talones',y:1959,tipo:'movie',tag:'Thriller de Hitchcock',p:'La escena de la avioneta persiguiendo a Cary Grant es puro cine de acción antes de que existiera el término.'},
      {n:7,t:'Vértigo',y:1958,tipo:'movie',tag:'Obsesión y suspense',p:'Obsesión, identidad y vértigo real; considerada por muchos la obra maestra absoluta de Hitchcock.'},
      {n:8,t:'Con faldas y a lo loco',y:1959,tipo:'movie',tag:'Comedia clásica',p:'Una de las comedias mejor escritas de la historia, con Marilyn Monroe en su papel más icónico.'},
      {n:9,t:'Solo ante el peligro',y:1952,tipo:'movie',tag:'Western en tiempo real',p:'Un western que transcurre casi en tiempo real, construyendo una tensión que se adelantó a su época.'},
      {n:10,t:'Cantando bajo la lluvia',y:1952,tipo:'movie',tag:'Musical clásico',p:'El musical más celebrado de Hollywood; la escena del paraguas es historia pura del cine.'},
      {n:11,t:'Psicosis',y:1960,tipo:'movie',tag:'Terror y suspense',p:'La escena de la ducha cambió para siempre lo que el cine de terror y suspense podía hacer.'},
      {n:12,t:'Ben-Hur',y:1959,tipo:'movie',tag:'Épica histórica',p:'La carrera de cuadrigas sigue siendo una de las secuencias de acción más impresionantes jamás rodadas.'},
      {n:13,t:'2001: Una odisea del espacio',y:1968,tipo:'movie',tag:'Ciencia ficción',p:'Kubrick redefine la ciencia ficción con una película tan visual como filosófica.'},
      {n:14,t:'La naranja mecánica',y:1971,tipo:'movie',tag:'Provocación y ultraviolencia',p:'Kubrick de nuevo, ahora con una de las películas más provocadoras y debatidas de la historia.'},
      {n:15,t:'El padrino',y:1972,tipo:'movie',tag:'Épica criminal',p:'Probablemente la película mejor considerada de la historia del cine; el estándar con el que se compara todo lo demás.'},
      {n:16,t:'Metrópolis',y:1927,tipo:'movie',tag:'Ciencia ficción muda',p:'La primera gran epopeya de ciencia ficción de la historia del cine, aún hoy visualmente impresionante.'},
      {n:17,t:'El acorazado Potemkin',y:1925,tipo:'movie',tag:'Cine soviético fundacional',p:'La escena de la escalinata de Odessa es una de las secuencias de montaje más estudiadas de la historia del cine.'},
      {n:18,t:'Tiempos modernos',y:1936,tipo:'movie',tag:'Comedia muda de Chaplin',p:'Chaplin retrata la deshumanización industrial con una ternura y un humor que siguen funcionando hoy.'},
      {n:19,t:'La diligencia',y:1939,tipo:'movie',tag:'Western fundacional',p:'John Wayne y John Ford definen el western clásico tal y como se ha repetido durante décadas.'},
      {n:20,t:'El crepúsculo de los dioses',y:1950,tipo:'movie',tag:'Drama sobre Hollywood',p:'Una diseccción despiadada y brillante de la propia industria del cine y sus estrellas olvidadas.'},
      {n:21,t:'Sed de mal',y:1958,tipo:'movie',tag:'Cine negro de Welles',p:'El plano secuencia inicial es una masterclass de puesta en escena que se sigue enseñando en escuelas de cine.'},
      {n:22,t:'El apartamento',y:1960,tipo:'movie',tag:'Comedia dramática',p:'Billy Wilder mezcla comedia romántica y crítica social con una precisión que envejece extraordinariamente bien.'},
      {n:23,t:'Centauros del desierto',y:1956,tipo:'movie',tag:'Western',p:'Considerada por muchos directores modernos como el mejor western jamás filmado.'},
      {n:24,t:'Toro salvaje',y:1980,tipo:'movie',tag:'Biopic de boxeo',p:'Scorsese y De Niro en blanco y negro retratando la autodestrucción de un boxeador; interpretación legendaria.'},
      {n:25,t:'Uno de los nuestros',y:1990,tipo:'movie',tag:'Cine de gánsteres',p:'Scorsese narra el ascenso y caída de un mafioso con un ritmo narrativo que cambió el cine de gánsteres para siempre.'}
    ];

    // Joyas ocultas — grandes películas que mucha gente aún no ha descubierto
    const JOYAS_OCULTAS = [
      {n:1,t:'Perfectos desconocidos',y:2017,tipo:'movie',tag:'Comedia dramática española',p:'Una cena entre amigos y un juego con los móviles sobre la mesa que se descontrola por completo.'},
      {n:2,t:'El hoyo',y:2019,tipo:'movie',tag:'Sci-fi social español',p:'Una prisión vertical donde la comida baja piso a piso; una metáfora social tan sencilla como brutal.'},
      {n:3,t:'Relatos salvajes',y:2014,tipo:'movie',tag:'Antología de venganza',p:'Seis historias independientes sobre gente normal llevada al límite; humor negro argentino en su máxima expresión.'},
      {n:4,t:'El faro',y:2019,tipo:'movie',tag:'Terror psicológico en blanco y negro',p:'Dos fareros aislados se van hundiendo en la locura; una experiencia visual y sonora única.'},
      {n:5,t:'Aftersun',y:2022,tipo:'movie',tag:'Drama íntimo',p:'Un padre y su hija de vacaciones, contado con una delicadeza y una tristeza que se sienten muy reales.'},
      {n:6,t:'Swiss Army Man',y:2016,tipo:'movie',tag:'Comedia absurda con corazón',p:'Un hombre náufrago y un cadáver flatulento que se convierte en su mejor amigo; mucho más emotiva de lo que suena.'},
      {n:7,t:'Whiplash',y:2014,tipo:'movie',tag:'Drama musical intenso',p:'Un batería de jazz y un profesor despiadado; tensión pura hasta el último minuto.'},
      {n:8,t:'La ola',y:2008,tipo:'movie',tag:'Drama social alemán',p:'Un experimento escolar sobre el autoritarismo que se descontrola con una rapidez inquietante.'},
      {n:9,t:'El hombre de al lado',y:2009,tipo:'movie',tag:'Comedia negra argentina',p:'Un conflicto de vecinos aparentemente absurdo que se convierte en una radiografía de clase muy incómoda.'},
      {n:10,t:'Coherence',y:2013,tipo:'movie',tag:'Sci-fi de bajo presupuesto',p:'Una cena entre amigos se complica con física cuántica y realidades paralelas; rodada con un presupuesto mínimo.'},
      {n:11,t:'Moon',y:2009,tipo:'movie',tag:'Sci-fi minimalista',p:'Sam Rockwell prácticamente solo en una base lunar; ciencia ficción íntima y con un giro muy bien llevado.'},
      {n:12,t:'Locke',y:2013,tipo:'movie',tag:'Un solo actor, un solo coche',p:'Tom Hardy conduciendo y hablando por teléfono durante 85 minutos; tensión pura sin salir jamás del coche.'},
      {n:13,t:'Nunca me abandones',y:2010,tipo:'movie',tag:'Drama con ciencia ficción',p:'Una historia de amor con un trasfondo de ciencia ficción que se va revelando poco a poco; devastadora.'},
      {n:14,t:'Buscando a Sugar Man',y:2012,tipo:'movie',tag:'Documental',p:'La historia real de un músico olvidado en su país que resultó ser una superestrella al otro lado del mundo, sin saberlo.'},
      {n:15,t:'Rompenieves',y:2013,tipo:'movie',tag:'Sci-fi social',p:'Bong Joon-ho antes de "Parásitos": un tren que da la vuelta al mundo helado como metáfora de clases sociales.'},
      {n:16,t:'Estación Zombie: Busan',y:2016,tipo:'movie',tag:'Terror surcoreano',p:'Un brote zombi dentro de un tren de alta velocidad; acción, terror y mucho más corazón del esperado.'},
      {n:17,t:'Green Room',y:2015,tipo:'movie',tag:'Thriller de supervivencia',p:'Una banda de punk queda atrapada en un local controlado por neonazis; tensión asfixiante de principio a fin.'},
      {n:18,t:'Toc Toc',y:2017,tipo:'movie',tag:'Comedia española',p:'Seis pacientes con distintos TOC atrapados en una sala de espera; comedia entrañable con un reparto muy querido en España.'}
    ];

    // Cine de culto — las que todo cinéfilo debería conocer, con permiso de la taquilla
    const CINE_CULTO = [
      {n:1,t:'El gran Lebowski',y:1998,tipo:'movie',tag:'Comedia de culto',p:'El Nota y su liga de bolos se enredan en un caso digno del cine negro; una comedia que ha generado su propio fandom.'},
      {n:2,t:'Pulp Fiction',y:1994,tipo:'movie',tag:'Estructura no lineal',p:'Tarantino reinventa el cine de gánsteres con una estructura fragmentada y diálogos que se citan hasta hoy.'},
      {n:3,t:'Trainspotting',y:1996,tipo:'movie',tag:'Drama con energía punk',p:'Adicción, amistad y Escocia retratadas con una energía visual que marcó a toda una generación.'},
      {n:4,t:'Donnie Darko',y:2001,tipo:'movie',tag:'Sci-fi de culto',p:'Un conejo gigante, viajes en el tiempo y adolescencia; una de las películas de culto más debatidas de los 2000.'},
      {n:5,t:'Blade Runner',y:1982,tipo:'movie',tag:'Ciencia ficción noir',p:'Ridley Scott define la estética cyberpunk que todavía hoy sigue copiando medio género.'},
      {n:6,t:'El resplandor',y:1980,tipo:'movie',tag:'Terror de culto',p:'Kubrick convierte un hotel vacío en una de las experiencias de terror más analizadas de la historia del cine.'},
      {n:7,t:'Kill Bill: Volumen 1',y:2003,tipo:'movie',tag:'Acción de culto',p:'Tarantino rinde homenaje al cine de artes marciales con una violencia estilizada muy reconocible.'},
      {n:8,t:'Scarface: el precio del poder',y:1983,tipo:'movie',tag:'Cine criminal de culto',p:'Tony Montana se convirtió en un icono cultural mucho más allá del propio cine.'},
      {n:9,t:'Miedo y asco en Las Vegas',y:1998,tipo:'movie',tag:'Contracultura',p:'Un viaje alucinógeno por Las Vegas basado en el gonzo journalism de Hunter S. Thompson.'},
      {n:10,t:'El club de la lucha',y:1999,tipo:'movie',tag:'Icono generacional',p:'Fue un fracaso en taquilla y se convirtió después en una de las películas más citadas de su generación.'},
      {n:11,t:'Perros de reserva',y:1992,tipo:'movie',tag:'Debut de Tarantino',p:'El atraco que sale mal contado casi en tiempo real; el debut que anunció a Tarantino al mundo.'},
      {n:12,t:'The Rocky Horror Picture Show',y:1975,tipo:'movie',tag:'Musical de culto absoluto',p:'La película de culto por excelencia, con proyecciones participativas que llevan décadas activas en todo el mundo.'},
      {n:13,t:'Eraserhead',y:1977,tipo:'movie',tag:'Surrealismo de culto',p:'El debut de David Lynch: una pesadilla en blanco y negro que sigue sin tener una explicación única.'},
      {n:14,t:'Mulholland Drive',y:2001,tipo:'movie',tag:'Surrealismo neo-noir',p:'Lynch de nuevo, con un rompecabezas narrativo sobre Hollywood que cada espectador interpreta de forma distinta.'},
      {n:15,t:'Terciopelo azul',y:1986,tipo:'movie',tag:'Suburbio y oscuridad',p:'Lynch destapa la oscuridad que se esconde bajo la superficie perfecta de un pueblo americano cualquiera.'},
      {n:16,t:'Heathers: escuela de jóvenes asesinos',y:1988,tipo:'movie',tag:'Comedia negra adolescente',p:'Sátira feroz sobre la vida en el instituto americano, muy adelantada a su tiempo.'},
      {n:17,t:'La matanza de Texas',y:1974,tipo:'movie',tag:'Terror de culto fundacional',p:'Con muy poco presupuesto y gore explícito casi inexistente, definió el terror slasher más crudo.'},
      {n:18,t:'Videodrome',y:1983,tipo:'movie',tag:'Body horror',p:'Cronenberg mezcla televisión, realidad y mutación corporal en una de las películas más extrañas de los 80.'},
      {n:19,t:'Escape de Nueva York',y:1981,tipo:'movie',tag:'Sci-fi distópico de culto',p:'John Carpenter y Kurt Russell en una Manhattan convertida en cárcel de máxima seguridad.'},
      {n:20,t:'Showgirls',y:1995,tipo:'movie',tag:'Camp de culto',p:'Fracasó estrepitosamente en su estreno y con los años se ha convertido en una de las películas "malas" más queridas de la historia.'},
      {n:21,t:'Barbarella',y:1968,tipo:'movie',tag:'Ciencia ficción camp',p:'Jane Fonda en una space opera psicodélica que definió la estética camp de la ciencia ficción de los 60.'}
    ];

    // Star Wars — orden cronológico interno (línea temporal galáctica), no de estreno
    const STAR_WARS = [
      {n:1,era:'32 ABY',eraCap:'antes de la Batalla de Yavin',t:'Star Wars: Episodio I - La amenaza fantasma',y:1999,tipo:'movie',tag:'32 años antes de la Batalla de Yavin',p:'El origen de todo: Anakin Skywalker es descubierto como un niño esclavo con un potencial enorme en la Fuerza.'},
      {n:2,era:'22 ABY',eraCap:'antes de la Batalla de Yavin',t:'Star Wars: Episodio II - El ataque de los clones',y:2002,tipo:'movie',tag:'22 años antes de Yavin',p:'El inicio de las Guerras Clon y el romance secreto entre Anakin y Padmé.'},
      {n:3,era:'22–19 ABY',eraCap:'antes de la Batalla de Yavin',t:'Star Wars: La Guerra de los Clones',y:2008,tipo:'tv',tag:'22-19 años antes de Yavin',p:'Serie animada que expande enormemente las Guerras Clon y el desarrollo de Anakin hacia el lado oscuro.'},
      {n:4,era:'Décadas ABY',eraCap:'antes de la Batalla de Yavin',t:'Tales of the Jedi',y:2022,tipo:'tv',tag:'Varias décadas antes de Yavin',p:'Antología animada que profundiza en los orígenes de Ahsoka Tano y el conde Dooku.'},
      {n:5,era:'19 ABY',eraCap:'antes de la Batalla de Yavin',t:'Star Wars: Episodio III - La venganza de los Sith',y:2005,tipo:'movie',tag:'19 años antes de Yavin',p:'La caída definitiva de Anakin Skywalker y el nacimiento del Imperio Galáctico.'},
      {n:6,era:'~13–10 ABY',eraCap:'antes de la Batalla de Yavin',t:'Solo: una historia de Star Wars',y:2018,tipo:'movie',tag:'~13-10 años antes de Yavin',p:'Los orígenes de Han Solo, Chewbacca y el mítico Halcón Milenario.'},
      {n:7,era:'9 ABY',eraCap:'antes de la Batalla de Yavin',t:'Obi-Wan Kenobi',y:2022,tipo:'tv',tag:'9 años antes de Yavin',p:'Obi-Wan, exiliado en Tatooine, se reencuentra con Anakin, ahora convertido en Darth Vader.'},
      {n:8,era:'5–4 ABY',eraCap:'antes de la Batalla de Yavin',t:'Andor',y:2022,tipo:'tv',tag:'5-4 años antes de Yavin',p:'Los orígenes de la Rebelión contados como un thriller político adulto; considerada la mejor serie de la franquicia.'},
      {n:9,era:'5–1 ABY',eraCap:'antes de la Batalla de Yavin',t:'Star Wars Rebels',y:2014,tipo:'tv',tag:'5-1 años antes de Yavin',p:'Serie animada que sigue a una tripulación rebelde en los primeros años de resistencia contra el Imperio.'},
      {n:10,era:'0 ABY',eraCap:'justo antes de la Batalla de Yavin',t:'Rogue One: una historia de Star Wars',y:2016,tipo:'movie',tag:'Justo antes de Yavin',p:'El robo de los planos de la Estrella de la Muerte, en una precuela directa de la película original.'},
      {n:11,era:'Año 0',eraCap:'la Batalla de Yavin',t:'Star Wars: Episodio IV - Una nueva esperanza',y:1977,tipo:'movie',tag:'Año 0: Batalla de Yavin',p:'La película que lo empezó todo en 1977 y cambió para siempre el cine de ciencia ficción.'},
      {n:12,era:'3 DBY',eraCap:'después de la Batalla de Yavin',t:'Star Wars: Episodio V - El imperio contraataca',y:1980,tipo:'movie',tag:'3 años después de Yavin',p:'Considerada por muchos la mejor entrega de la saga; el giro "yo soy tu padre" es historia del cine.'},
      {n:13,era:'4 DBY',eraCap:'después de la Batalla de Yavin',t:'Star Wars: Episodio VI - El retorno del Jedi',y:1983,tipo:'movie',tag:'4 años después de Yavin',p:'La caída definitiva del Imperio y la redención de Darth Vader.'},
      {n:14,era:'9 DBY',eraCap:'después de la Batalla de Yavin',t:'The Mandalorian',y:2019,tipo:'tv',tag:'9 años después de Yavin',p:'Un cazarrecompensas solitario protege a "Grogu" (Baby Yoda) por la galaxia; relanzó la franquicia en streaming.'},
      {n:15,era:'9 DBY',eraCap:'después de la Batalla de Yavin',t:'The Book of Boba Fett',y:2021,tipo:'tv',tag:'9 años después de Yavin',p:'El legendario cazarrecompensas reclama el trono de Jabba the Hutt en Tatooine.'},
      {n:16,era:'9 DBY',eraCap:'después de la Batalla de Yavin',t:'Ahsoka',y:2023,tipo:'tv',tag:'9 años después de Yavin',p:'La antigua padawan de Anakin investiga una amenaza que podría traer de vuelta al Imperio.'},
      {n:17,era:'9 DBY',eraCap:'después de la Batalla de Yavin',t:'The Mandalorian and Grogu',y:2026,tipo:'movie',tag:'9 años después de Yavin',tmdb_id:1228710,p:'Primera película de Star Wars en cines desde 2019: Din Djarin y Grogu continúan su historia al servicio de la Nueva República, con Jon Favreau de nuevo al mando y Sigourney Weaver incorporándose al reparto.'},
      {n:18,era:'34 DBY',eraCap:'después de la Batalla de Yavin',t:'Star Wars: Episodio VII - El despertar de la fuerza',y:2015,tipo:'movie',tag:'34 años después de Yavin',p:'Una nueva generación de héroes retoma la lucha contra los restos del Imperio, ahora la Primera Orden.'},
      {n:19,era:'34 DBY',eraCap:'después de la Batalla de Yavin',t:'Star Wars: Episodio VIII - Los últimos Jedi',y:2017,tipo:'movie',tag:'34 años después de Yavin',p:'La entrega más divisiva de la saga; Luke Skywalker reaparece tras años de exilio autoimpuesto.'},
      {n:20,era:'35 DBY',eraCap:'después de la Batalla de Yavin',t:'Star Wars: Episodio IX - El ascenso de Skywalker',y:2019,tipo:'movie',tag:'35 años después de Yavin',p:'El cierre oficial de la saga Skywalker, nueve episodios y cuatro décadas después de la primera película.'}
    ];

    // Series imprescindibles — lo mejor de la televisión, sin importar género
    const SERIES_IMPRESCINDIBLES = [
      {n:1,t:'Los Soprano',y:1999,tipo:'tv',tag:'Drama criminal',p:'La serie que inauguró la "edad de oro" de la televisión moderna; un mafioso en terapia como nunca se había visto.'},
      {n:2,t:'The Wire',y:2002,tipo:'tv',tag:'Drama policial coral',p:'Considerada por muchos críticos la mejor serie de la historia; retrata Baltimore desde todos los ángulos posibles.'},
      {n:3,t:'Mad Men',y:2007,tipo:'tv',tag:'Drama de época',p:'Publicidad, ambición y crisis de identidad en el Nueva York de los años 60.'},
      {n:4,t:'Breaking Bad',y:2008,tipo:'tv',tag:'Drama criminal',p:'Un profesor de química se convierte en fabricante de metanfetamina; una de las transformaciones de personaje más brillantes jamás escritas.'},
      {n:5,t:'Sherlock',y:2010,tipo:'tv',tag:'Misterio moderno',p:'Benedict Cumberbatch reinventa a Sherlock Holmes en el Londres actual con un ritmo trepidante.'},
      {n:6,t:'Juego de Tronos',y:2011,tipo:'tv',tag:'Fantasía épica',p:'La serie que convirtió la fantasía épica en fenómeno de masas global durante casi una década.'},
      {n:7,t:'Black Mirror',y:2011,tipo:'tv',tag:'Antología de ciencia ficción',p:'Cada episodio es una historia distinta sobre cómo la tecnología puede salir espantosamente mal.'},
      {n:8,t:'Peaky Blinders',y:2013,tipo:'tv',tag:'Drama criminal de época',p:'Una familia de gánsteres en el Birmingham de posguerra, con una estética y banda sonora inconfundibles.'},
      {n:9,t:'Fargo',y:2014,tipo:'tv',tag:'Antología de crimen',p:'Cada temporada cuenta una historia distinta con el mismo tono de humor negro gélido que la película original.'},
      {n:10,t:'True Detective',y:2014,tipo:'tv',tag:'Thriller antológico',p:'La primera temporada, con McConaughey y Harrelson, es una obra maestra del thriller televisivo.'},
      {n:11,t:'Better Call Saul',y:2015,tipo:'tv',tag:'Precuela de drama criminal',p:'La precuela de Breaking Bad que muchos consideran, contra todo pronóstico, superior a su serie original.'},
      {n:12,t:'The Crown',y:2016,tipo:'tv',tag:'Drama histórico',p:'La vida de la reina Isabel II y la familia real británica, con una producción de nivel cinematográfico.'},
      {n:13,t:'Stranger Things',y:2016,tipo:'tv',tag:'Aventura y terror ochentero',p:'Nostalgia de los 80, terror sobrenatural y amistad adolescente convertidos en fenómeno mundial.'},
      {n:14,t:'Fleabag',y:2016,tipo:'tv',tag:'Comedia dramática',p:'Phoebe Waller-Bridge rompe la cuarta pared en una de las comedias más agudas y emotivas de la última década.'},
      {n:15,t:'La Casa de Papel',y:2017,tipo:'tv',tag:'Thriller de atracos español',p:'El fenómeno español que se convirtió en la serie no inglesa más vista de Netflix en su momento.'},
      {n:16,t:'El cuento de la criada',y:2017,tipo:'tv',tag:'Distopía',p:'Una adaptación devastadora de la novela de Margaret Atwood sobre una sociedad totalitaria y patriarcal.'},
      {n:17,t:'Dark',y:2017,tipo:'tv',tag:'Sci-fi de viajes en el tiempo',p:'Un thriller alemán sobre viajes en el tiempo tan complejo como adictivo; de lo mejor que ha dado el sci-fi europeo.'},
      {n:18,t:'Succession',y:2018,tipo:'tv',tag:'Drama corporativo familiar',p:'La lucha por el control de un imperio mediático familiar; diálogos afiladísimos y personajes despreciables y fascinantes a la vez.'},
      {n:19,t:'Chernobyl',y:2019,tipo:'tv',tag:'Drama histórico',p:'La reconstrucción del desastre nuclear de 1986, con un rigor y una tensión pocas veces vistos en TV.'},
      {n:20,t:'The Bear',y:2022,tipo:'tv',tag:'Drama de cocina',p:'El caos de una cocina profesional retratado con una ansiedad y una energía que se sienten físicamente.'}
    ];

    // Martin Scorsese — selección de su filmografía más determinante
    const SCORSESE = [
      {n:1,t:'Malas calles',y:1973,tipo:'movie',tag:'Origen del cine de Scorsese',p:'El primer gran retrato de Scorsese sobre la pequeña delincuencia de la Little Italy neoyorquina.'},
      {n:2,t:'Taxi Driver',y:1976,tipo:'movie',tag:'Alienación urbana',p:'Robert De Niro como un taxista al borde del colapso mental en un Nueva York decadente; icónica de principio a fin.'},
      {n:3,t:'Toro salvaje',y:1980,tipo:'movie',tag:'Biopic de boxeo',p:'Considerada por muchos la mejor película de los años 80; De Niro en su interpretación más física y devastadora.'},
      {n:4,t:'Uno de los nuestros',y:1990,tipo:'movie',tag:'Cine de gánsteres',p:'El ascenso y caída de un mafioso contado con un ritmo narrativo que reinventó el género criminal.'},
      {n:5,t:'Casino',y:1995,tipo:'movie',tag:'Cine de gánsteres',p:'El lado corrupto de Las Vegas en los años 70, con De Niro y Pesci de nuevo a las órdenes de Scorsese.'},
      {n:6,t:'Pandillas de Nueva York',y:2002,tipo:'movie',tag:'Épica histórica criminal',p:'La violencia entre bandas en el Nueva York del siglo XIX; Daniel Day-Lewis está descomunal.'},
      {n:7,t:'El aviador',y:2004,tipo:'movie',tag:'Biopic',p:'La vida de Howard Hughes, entre la genialidad, la obsesión y el trastorno mental.'},
      {n:8,t:'Infiltrados',y:2006,tipo:'movie',tag:'Thriller criminal',p:'El Óscar a Mejor Película que finalmente reconoció a Scorsese; un juego de espejos entre policía y mafia de Boston.'},
      {n:9,t:'Shutter Island',y:2010,tipo:'movie',tag:'Thriller psicológico',p:'Scorsese se mueve al thriller de misterio con un giro final que sigue generando debate.'},
      {n:10,t:'El lobo de Wall Street',y:2013,tipo:'movie',tag:'Sátira financiera',p:'Los excesos de un corredor de bolsa corrupto, contados con un ritmo frenético y sin ningún tipo de censura moral.'},
      {n:11,t:'Silencio',y:2016,tipo:'movie',tag:'Drama espiritual',p:'Dos misioneros jesuitas se enfrentan a la persecución religiosa en el Japón del siglo XVII; el proyecto más personal de Scorsese.'},
      {n:12,t:'El irlandés',y:2019,tipo:'movie',tag:'Epopeya criminal',p:'Un repaso a toda una vida en el crimen organizado, con De Niro, Pacino y Pesci reunidos tres décadas después.'},
      {n:13,t:'Los asesinos de la luna',y:2023,tipo:'movie',tag:'Drama criminal histórico',p:'Una investigación sobre los asesinatos sistemáticos de miembros de la nación Osage en los años 20.'}
    ];

    // Stanley Kubrick — filmografía completa (13 largometrajes, un catálogo cerrado)
    const KUBRICK = [
      {n:1,t:'Atraco perfecto',y:1956,tipo:'movie',tag:'Cine negro',p:'Un atraco a un hipódromo contado con una estructura no lineal muy adelantada a su época.'},
      {n:2,t:'Senderos de gloria',y:1957,tipo:'movie',tag:'Antibélica',p:'Una crítica feroz a la injusticia militar durante la Primera Guerra Mundial, con Kirk Douglas.'},
      {n:3,t:'Espartaco',y:1960,tipo:'movie',tag:'Épica histórica',p:'La única película de Kubrick rodada por encargo, sobre la rebelión de esclavos liderada por Espartaco.'},
      {n:4,t:'Lolita',y:1962,tipo:'movie',tag:'Drama controvertido',p:'La adaptación de la novela de Nabokov, filtrada por la censura pero igualmente perturbadora.'},
      {n:5,t:'Teléfono rojo, ¿volamos hacia Moscú?',y:1964,tipo:'movie',tag:'Sátira de Guerra Fría',p:'Comedia negra sobre el apocalipsis nuclear; Peter Sellers interpreta tres papeles distintos de forma magistral.'},
      {n:6,t:'2001: Una odisea del espacio',y:1968,tipo:'movie',tag:'Ciencia ficción',p:'Redefine la ciencia ficción con una película tan visual como filosófica; su influencia sigue vigente hoy.'},
      {n:7,t:'La naranja mecánica',y:1971,tipo:'movie',tag:'Provocación',p:'Una de las películas más provocadoras y debatidas de la historia del cine sobre violencia y libre albedrío.'},
      {n:8,t:'Barry Lyndon',y:1975,tipo:'movie',tag:'Drama de época',p:'Rodada con luz de velas real, es una de las películas visualmente más bellas jamás filmadas.'},
      {n:9,t:'El resplandor',y:1980,tipo:'movie',tag:'Terror psicológico',p:'Un hotel vacío en invierno y una familia que se va desmoronando poco a poco; terror de culto absoluto.'},
      {n:10,t:'La chaqueta metálica',y:1987,tipo:'movie',tag:'Cine bélico',p:'Dividida en dos mitades perfectamente diferenciadas: el infierno de la instrucción militar y el de la guerra de Vietnam.'},
      {n:11,t:'Eyes Wide Shut',y:1999,tipo:'movie',tag:'Drama psicosexual',p:'La última película de Kubrick, estrenada tras su muerte; un descenso onírico al matrimonio y el deseo.'}
    ];

    // Steven Spielberg — selección de su extensa filmografía
    const SPIELBERG = [
      {n:1,t:'Tiburón',y:1975,tipo:'movie',tag:'El primer blockbuster moderno',p:'Inventó literalmente el concepto de "blockbuster" de verano tal y como lo conocemos hoy.'},
      {n:2,t:'Encuentros en la tercera fase',y:1977,tipo:'movie',tag:'Ciencia ficción',p:'Uno de los primeros grandes tratamientos amables del contacto extraterrestre en el cine mainstream.'},
      {n:3,t:'En busca del arca perdida',y:1981,tipo:'movie',tag:'Aventura',p:'El nacimiento de Indiana Jones y de todo un subgénero de aventuras de acción.'},
      {n:4,t:'E.T., el extraterrestre',y:1982,tipo:'movie',tag:'Fantasía familiar',p:'Probablemente la película familiar más emotiva jamás filmada; un fenómeno cultural absoluto en 1982.'},
      {n:5,t:'Indiana Jones y el templo maldito',y:1984,tipo:'movie',tag:'Aventura',p:'Más oscura que su predecesora, ayudó a crear la clasificación PG-13 en EE.UU. por su intensidad.'},
      {n:6,t:'El color púrpura',y:1985,tipo:'movie',tag:'Drama',p:'Spielberg demuestra que también sabe manejar el drama social más puro y doloroso.'},
      {n:7,t:'El imperio del sol',y:1987,tipo:'movie',tag:'Drama bélico',p:'Un niño británico sobrevive solo en la China ocupada por Japón; debut de un jovencísimo Christian Bale.'},
      {n:8,t:'Indiana Jones y la última cruzada',y:1989,tipo:'movie',tag:'Aventura',p:'Sean Connery como el padre de Indiana Jones; considerada la mejor secuela de toda la saga.'},
      {n:9,t:'Parque Jurásico',y:1993,tipo:'movie',tag:'Ciencia ficción',p:'Revolucionó los efectos visuales para siempre y sigue impresionando más de tres décadas después.'},
      {n:10,t:'La lista de Schindler',y:1993,tipo:'movie',tag:'Drama histórico',p:'El rescate de más de mil judíos durante el Holocausto; una obra maestra absoluta filmada en blanco y negro.'},
      {n:11,t:'Salvar al soldado Ryan',y:1998,tipo:'movie',tag:'Cine bélico',p:'Los primeros 20 minutos sobre el desembarco de Normandía redefinieron cómo se filma la guerra en el cine.'},
      {n:12,t:'Minority Report',y:2002,tipo:'movie',tag:'Ciencia ficción',p:'Un thriller de ciencia ficción sobre la predicción de crímenes antes de que ocurran; muy adelantado a su tiempo.'},
      {n:13,t:'Atrápame si puedes',y:2002,tipo:'movie',tag:'Comedia dramática',p:'DiCaprio como un estafador juvenil basado en una historia real, perseguido por un agente del FBI.'},
      {n:14,t:'La guerra de los mundos',y:2005,tipo:'movie',tag:'Ciencia ficción',p:'Una invasión alienígena vista desde la perspectiva de una familia corriente intentando sobrevivir.'},
      {n:15,t:'Múnich',y:2005,tipo:'movie',tag:'Thriller histórico',p:'La respuesta israelí a la masacre de Múnich de 1972, contada sin maniqueísmos fáciles.'},
      {n:16,t:'Lincoln',y:2012,tipo:'movie',tag:'Drama histórico',p:'Daniel Day-Lewis encarna al presidente en los meses previos a la abolición de la esclavitud en EE.UU.'},
      {n:17,t:'Puente de espías',y:2015,tipo:'movie',tag:'Thriller de espías',p:'Un abogado neoyorquino negocia el intercambio de un espía soviético en plena Guerra Fría.'},
      {n:18,t:'West Side Story',y:2021,tipo:'movie',tag:'Musical',p:'Spielberg reinventa el clásico musical con una puesta en escena y una fotografía deslumbrantes.'},
      {n:19,t:'Los Fabelman',y:2022,tipo:'movie',tag:'Autobiográfica',p:'La película más personal de Spielberg: su propia infancia y el nacimiento de su pasión por el cine.'},
      {n:20,t:'Disclosure Day',y:2026,tipo:'movie',tag:'Ciencia ficción',tmdb_id:1275779,p:'El regreso de Spielberg a la ciencia ficción: una meteoróloga y un analista de ciberseguridad intentan revelar al mundo la prueba de vida extraterrestre mientras un contratista del gobierno intenta impedirlo. Guion de David Koepp y banda sonora de John Williams, su 30ª colaboración con Spielberg.'}
    ];

    // Cine español imprescindible — el mejor cine hecho en España
    const CINE_ESPANOL = [
      {n:1,t:'Mujeres al borde de un ataque de nervios',y:1988,tipo:'movie',tag:'Comedia (Almodóvar)',p:'La comedia que catapultó a Almodóvar internacionalmente; caos, gazpacho con somníferos y mucho color.'},
      {n:2,t:'Todo sobre mi madre',y:1999,tipo:'movie',tag:'Drama (Almodóvar)',p:'Ganadora del Óscar a Mejor Película de Habla No Inglesa; melodrama, maternidad e identidad en estado puro.'},
      {n:3,t:'Hable con ella',y:2002,tipo:'movie',tag:'Drama (Almodóvar)',p:'Una de las películas más arriesgadas y elogiadas de Almodóvar, ganadora del Óscar al mejor guion original.'},
      {n:4,t:'Volver',y:2006,tipo:'movie',tag:'Drama (Almodóvar)',p:'Penélope Cruz brilla en un drama sobre madres, hijas y fantasmas del pasado en La Mancha.'},
      {n:5,t:'La piel que habito',y:2011,tipo:'movie',tag:'Thriller (Almodóvar)',p:'Un cirujano plástico con una obsesión perturbadora; uno de los giros más inquietantes del cine de Almodóvar.'},
      {n:6,t:'Dolor y gloria',y:2019,tipo:'movie',tag:'Drama (Almodóvar)',p:'Antonio Banderas como un director de cine que repasa su vida; la película más autobiográfica de Almodóvar.'},
      {n:7,t:'Tesis',y:1996,tipo:'movie',tag:'Thriller (Amenábar)',p:'El debut de Amenábar: una estudiante de cine investiga snuff movies y descubre algo muy cerca de casa.'},
      {n:8,t:'Abre los ojos',y:1997,tipo:'movie',tag:'Sci-fi (Amenábar)',p:'Tan influyente que Hollywood la remakeó como "Vanilla Sky" con Tom Cruise unos años después.'},
      {n:9,t:'Los otros',y:2001,tipo:'movie',tag:'Terror (Amenábar)',p:'Nicole Kidman en una casa encantada en la posguerra; uno de los giros finales más recordados del cine español.'},
      {n:10,t:'Mar adentro',y:2004,tipo:'movie',tag:'Drama (Amenábar)',p:'Ganadora del Óscar a Mejor Película de Habla No Inglesa; el drama sobre el derecho a morir dignamente.'},
      {n:11,t:'El día de la bestia',y:1995,tipo:'movie',tag:'Comedia de terror (De la Iglesia)',p:'Un cura convencido de que se acerca el Anticristo se une a un rockero satánico; humor negro español en estado puro.'},
      {n:12,t:'La comunidad',y:2000,tipo:'movie',tag:'Comedia negra (De la Iglesia)',p:'Una comunidad de vecinos entera dispuesta a matar por un dinero escondido; Álex de la Iglesia en plena forma.'},
      {n:13,t:'Celda 211',y:2009,tipo:'movie',tag:'Thriller carcelario',p:'Un funcionario de prisiones queda atrapado en medio de un motín; uno de los thrillers españoles más tensos jamás rodados.'},
      {n:14,t:'El orfanato',y:2007,tipo:'movie',tag:'Terror sobrenatural',p:'Terror gótico español producido por Guillermo del Toro, elegante y profundamente emotivo.'},
      {n:15,t:'El laberinto del fauno',y:2006,tipo:'movie',tag:'Fantasía oscura',p:'Guillermo del Toro mezcla la posguerra española con un cuento de hadas oscurísimo; ganadora de 3 Óscar.'},
      {n:16,t:'Ocho apellidos vascos',y:2014,tipo:'movie',tag:'Comedia',p:'La comedia española más taquillera de la historia, sobre los tópicos entre andaluces y vascos.'},
      {n:17,t:'Perfectos desconocidos',y:2017,tipo:'movie',tag:'Comedia dramática',p:'Una cena entre amigos y un juego con los móviles sobre la mesa que se descontrola por completo.'},
      {n:18,t:'Contratiempo',y:2016,tipo:'movie',tag:'Thriller',p:'Un thriller de puzle español que se convirtió en un éxito sorpresa mundial en Netflix.'},
      {n:19,t:'El hoyo',y:2019,tipo:'movie',tag:'Sci-fi social',p:'Una prisión vertical donde la comida baja piso a piso; una metáfora social tan sencilla como brutal.'},
      {n:20,t:'Verónica',y:2017,tipo:'movie',tag:'Terror sobrenatural',p:'Una sesión de ouija en un instituto de Madrid desata algo que no debería haberse despertado.'},
      {n:21,t:'Toc Toc',y:2017,tipo:'movie',tag:'Comedia',p:'Seis pacientes con distintos TOC atrapados en una sala de espera; comedia entrañable muy querida en España.'},
      {n:22,t:'Blancanieves',y:2012,tipo:'movie',tag:'Drama muda en blanco y negro',p:'Una reinvención muy española del cuento clásico, rodada como si fuera cine mudo de los años 20.'},
      {n:23,t:'Campeones',y:2018,tipo:'movie',tag:'Comedia con corazón',p:'Un entrenador de baloncesto dirige a un equipo de personas con discapacidad intelectual; comedia entrañable y muy taquillera.'},
      {n:24,t:'As bestas',y:2022,tipo:'movie',tag:'Thriller rural',p:'Un conflicto vecinal en la Galicia rural que escala hasta niveles de tensión asfixiantes.'},
      {n:25,t:'Un monstruo viene a verme',y:2016,tipo:'movie',tag:'Fantasía dramática',p:'J.A. Bayona dirige una fábula sobre el duelo infantil, con un monstruo gigante y mucha ternura detrás.'}
    ];

    // Comedia imprescindible — para reírse sin complicaciones
    const COMEDIA = [
      {n:1,t:'Con faldas y a lo loco',y:1959,tipo:'movie',tag:'Comedia clásica',p:'Una de las comedias mejor escritas de la historia, con Marilyn Monroe en su papel más icónico.'},
      {n:2,t:'Aterriza como puedas',y:1980,tipo:'movie',tag:'Comedia absurda',p:'Un chiste visual o verbal cada pocos segundos; la referencia del humor absurdo moderno.'},
      {n:3,t:'Cazafantasmas',y:1984,tipo:'movie',tag:'Comedia fantástica',p:'Un grupo de científicos caza fantasmas por Nueva York con un tono perfecto entre comedia y aventura.'},
      {n:4,t:'Dos tontos muy tontos',y:1994,tipo:'movie',tag:'Comedia absurda',p:'Jim Carrey y Jeff Daniels en una road trip disparatada que define el humor de los 90.'},
      {n:5,t:'El gran Lebowski',y:1998,tipo:'movie',tag:'Comedia de culto',p:'El Nota y su liga de bolos se enredan en un caso digno del cine negro; comedia que ha generado su propio fandom.'},
      {n:6,t:'Loco por Mary',y:1998,tipo:'movie',tag:'Comedia romántica gamberra',p:'Los hermanos Farrelly llevan el humor incómodo a su máxima expresión sin perder el corazón de la historia.'},
      {n:7,t:'Zoolander',y:2001,tipo:'movie',tag:'Sátira de la moda',p:'Ben Stiller como un modelo tan guapo como corto de luces, en una sátira absurda del mundo de la moda.'},
      {n:8,t:'Elf',y:2003,tipo:'movie',tag:'Comedia navideña',p:'Will Ferrell como un humano criado por elfos en el Polo Norte; comedia navideña de culto absoluto.'},
      {n:9,t:'Anchorman: la leyenda de Ron Burgundy',y:2004,tipo:'movie',tag:'Comedia absurda',p:'Will Ferrell como un presentador de telediario ridículamente machista en los años 70; llena de frases de culto.'},
      {n:10,t:'La 40 años virgen',y:2005,tipo:'movie',tag:'Comedia romántica',p:'Steve Carell en una comedia sobre la madurez sexual tardía, más tierna de lo que su título sugiere.'},
      {n:11,t:'Superbad',y:2007,tipo:'movie',tag:'Comedia adolescente',p:'Dos amigos inseparables intentan triunfar en la última fiesta antes de graduarse; comedia generacional de los 2000.'},
      {n:12,t:'Tropic Thunder: una guerra muy perra',y:2008,tipo:'movie',tag:'Sátira de Hollywood',p:'Un grupo de actores rodando una película bélica termina metido en un conflicto real sin saberlo.'},
      {n:13,t:'Resacón en Las Vegas',y:2009,tipo:'movie',tag:'Comedia de despedida',p:'Una despedida de soltero sale tan mal que ni siquiera recuerdan qué pasó; comedia que definió toda una década.'},
      {n:14,t:'La boda de mi mejor amiga',y:2011,tipo:'movie',tag:'Comedia coral',p:'Kristen Wiig en una comedia sobre amistad femenina, celos y una boda que se va complicando por momentos.'},
      {n:15,t:'Deadpool',y:2016,tipo:'movie',tag:'Comedia de acción',p:'Un antihéroe con la boca más sucia del cine de superhéroes, rompiendo la cuarta pared constantemente.'},
      {n:16,t:'Jojo Rabbit',y:2019,tipo:'movie',tag:'Sátira histórica',p:'Un niño alemán con un amigo imaginario llamado Adolf Hitler; comedia arriesgadísima con mucho corazón detrás.'},
      {n:17,t:'Booksmart',y:2019,tipo:'movie',tag:'Comedia adolescente',p:'Dos amigas empollonas intentan vivir la noche de fiesta que nunca tuvieron antes de graduarse.'}
    ];

    // Ciencia ficción imprescindible — más allá de las grandes sagas
    const CIENCIA_FICCION = [
      {n:1,t:'2001: Una odisea del espacio',y:1968,tipo:'movie',tag:'Ciencia ficción filosófica',p:'Kubrick redefine el género con una película tan visual como filosófica; su influencia sigue vigente hoy.'},
      {n:2,t:'Alien, el octavo pasajero',y:1979,tipo:'movie',tag:'Terror espacial',p:'Ridley Scott mezcla terror y ciencia ficción en una nave espacial de la que nadie puede escapar.'},
      {n:3,t:'Terminator',y:1984,tipo:'movie',tag:'Sci-fi de acción',p:'Un asesino cibernético del futuro es enviado al pasado; el origen de una de las sagas más influyentes del género.'},
      {n:4,t:'Regreso al futuro',y:1985,tipo:'movie',tag:'Sci-fi de aventuras',p:'Viajes en el tiempo, un DeLorean y una de las bandas sonoras más reconocibles del cine ochentero.'},
      {n:5,t:'Contact',y:1997,tipo:'movie',tag:'Primer contacto',p:'Jodie Foster busca inteligencia extraterrestre en un tratamiento serio y emotivo del primer contacto.'},
      {n:6,t:'Matrix',y:1999,tipo:'movie',tag:'Cyberpunk',p:'Redefine la acción y la ciencia ficción con una premisa filosófica sobre la realidad simulada.'},
      {n:7,t:'Minority Report',y:2002,tipo:'movie',tag:'Sci-fi de predicción',p:'Un thriller sobre la predicción de crímenes antes de que ocurran; muy adelantado a su tiempo.'},
      {n:8,t:'Distrito 9',y:2009,tipo:'movie',tag:'Sci-fi social',p:'Extraterrestres refugiados segregados en Sudáfrica; una metáfora del apartheid con mucha acción de por medio.'},
      {n:9,t:'Origen',y:2010,tipo:'movie',tag:'Sci-fi de sueños',p:'Nolan construye un asalto a un sueño dentro de otro sueño con un final que sigue debatiéndose hoy.'},
      {n:10,t:'Looper',y:2012,tipo:'movie',tag:'Viajes en el tiempo',p:'Sicarios que eliminan objetivos enviados desde el futuro; una premisa original bien resuelta hasta el final.'},
      {n:11,t:'Gravity',y:2013,tipo:'movie',tag:'Supervivencia espacial',p:'Sandra Bullock a la deriva en el espacio tras un accidente; una experiencia casi física de tensión.'},
      {n:12,t:'Her',y:2013,tipo:'movie',tag:'Sci-fi romántico',p:'Un hombre se enamora de un sistema operativo con inteligencia artificial; una reflexión muy adelantada sobre la IA y la soledad.'},
      {n:13,t:'Ex Machina',y:2014,tipo:'movie',tag:'IA y manipulación',p:'Un test de Turing que se convierte en un juego de manipulación mucho más inquietante de lo esperado.'},
      {n:14,t:'Interstellar',y:2014,tipo:'movie',tag:'Sci-fi espacial',p:'Nolan combina física teórica real con una historia emocional sobre el tiempo y la paternidad.'},
      {n:15,t:'La llegada',y:2016,tipo:'movie',tag:'Primer contacto',p:'Un giro conceptual sobre el lenguaje y el tiempo que se entiende del todo solo al final.'},
      {n:16,t:'Blade Runner 2049',y:2017,tipo:'movie',tag:'Cyberpunk',p:'La secuela que nadie esperaba que fuera tan buena; visualmente arrebatadora y fiel al espíritu del original.'},
      {n:17,t:'Ready Player One',y:2018,tipo:'movie',tag:'Sci-fi pop',p:'Spielberg construye un mundo virtual repleto de referencias a la cultura pop de las últimas cuatro décadas.'},
      {n:18,t:'Rompenieves',y:2013,tipo:'movie',tag:'Sci-fi distópico',p:'Bong Joon-ho antes de "Parásitos": un tren que da la vuelta al mundo helado como metáfora de clases sociales.'},
      {n:19,t:'Dune',y:2021,tipo:'movie',tag:'Space opera',p:'Denis Villeneuve adapta la novela considerada durante décadas "imposible de llevar al cine" con una escala visual descomunal.'},
      {n:20,t:'Moon',y:2009,tipo:'movie',tag:'Sci-fi minimalista',p:'Sam Rockwell prácticamente solo en una base lunar; ciencia ficción íntima con un giro muy bien llevado.'}
    ];

    // Documentales imprescindibles — realidad que a veces supera a la ficción
    const DOCUMENTALES = [
      {n:1,t:'Fahrenheit 9/11',y:2004,tipo:'movie',tag:'Documental político',p:'Michael Moore analiza la respuesta del gobierno de EE.UU. tras el 11-S; el documental más taquillero de la historia en su momento.'},
      {n:2,t:'Una verdad incómoda',y:2006,tipo:'movie',tag:'Documental medioambiental',p:'Al Gore lleva el cambio climático al gran público con datos y una charla que cambió la conversación global.'},
      {n:3,t:'Man on Wire',y:2008,tipo:'movie',tag:'Documental de aventura',p:'La historia real del funambulista que cruzó caminando entre las Torres Gemelas en 1974, sin permiso ni red de seguridad.'},
      {n:4,t:'El acto de matar',y:2012,tipo:'movie',tag:'Documental sobre genocidio',p:'Antiguos verdugos indonesios recrean sus propios crímenes para las cámaras; perturbador como pocos documentales.'},
      {n:5,t:'Jodorowsky\'s Dune',y:2013,tipo:'movie',tag:'Documental sobre cine',p:'La historia de la adaptación de "Dune" que nunca llegó a rodarse y que igualmente cambió la ciencia ficción para siempre.'},
      {n:6,t:'Blackfish',y:2013,tipo:'movie',tag:'Documental sobre animales',p:'La historia de una orca de SeaWorld que cambió por completo la conversación pública sobre los parques acuáticos.'},
      {n:7,t:'Amy',y:2015,tipo:'movie',tag:'Documental musical',p:'La vida y caída de Amy Winehouse contada casi enteramente con material de archivo; devastador.'},
      {n:8,t:'O.J.: Made in America',y:2016,tipo:'tv',tag:'Documental true crime',p:'Un repaso al caso O.J. Simpson que es en realidad un retrato entero de la raza y la justicia en EE.UU.'},
      {n:9,t:'13th',y:2016,tipo:'movie',tag:'Documental social · La Enmienda XIII',p:'Un análisis sobre la relación entre la esclavitud, la Enmienda XIII y el sistema penitenciario actual de EE.UU.'},
      {n:10,t:'Icarus',y:2017,tipo:'movie',tag:'Documental deportivo',p:'Empieza como un experimento sobre dopaje personal y termina destapando un escándalo de estado en el deporte ruso.'},
      {n:11,t:'Free Solo',y:2018,tipo:'movie',tag:'Documental de aventura',p:'Un escalador sube la pared de El Capitán sin cuerdas ni protección; tensión real, sin ningún efecto especial de por medio.'},
      {n:12,t:'El dilema de las redes',y:2020,tipo:'movie',tag:'Documental tecnológico',p:'Extrabajadores de Silicon Valley explican cómo las redes sociales están diseñadas para engancharnos, sin fingir sorpresa.'},
      {n:13,t:'Lo que el pulpo me enseñó',y:2020,tipo:'movie',tag:'Documental de naturaleza',p:'La amistad entre un cineasta y un pulpo salvaje; una de las historias de naturaleza más bonitas jamás filmadas.'},
      {n:14,t:'Buscando a Sugar Man',y:2012,tipo:'movie',tag:'Documental musical',p:'La historia real de un músico olvidado en su país que resultó ser una superestrella al otro lado del mundo, sin saberlo.'},
      {n:15,t:'La marcha de los pingüinos',y:2005,tipo:'movie',tag:'Documental de naturaleza',p:'El viaje anual de los pingüinos emperador en la Antártida; documental familiar ganador del Óscar.'}
    ];

    // Alien — saga completa en orden cronológico interno
    const ALIEN = [
      {n:1,era:'2089',eraCap:'aprox. · cronología interna',t:'Prometheus',y:2012,tipo:'movie',tag:'~2089 (interno)',p:'La precuela más antigua de la saga; los Ingenieros y el origen del propio Xenomorfo empiezan a esclarecerse aquí.'},
      {n:2,era:'2104',eraCap:'aprox. · cronología interna',t:'Alien: Covenant',y:2017,tipo:'movie',tag:'~2104 (interno)',p:'Continúa directamente los eventos de Prometheus con la tripulación de la nave colonizadora Covenant.'},
      {n:3,era:'2120',eraCap:'aprox. · cronología interna',t:'Alien: Earth',y:2025,tipo:'tv',tag:'~2120 (interno)',tmdb_id:157239,p:'Primera serie de la franquicia, ambientada dos años antes de la película original: un grupo de híbridos humano-sintéticos se enfrenta al xenomorfo y a otras especies alienígenas tras el hallazgo de una nave estrellada en la Tierra.'},
      {n:4,era:'2122',eraCap:'aprox. · cronología interna',t:'Alien, el octavo pasajero',y:1979,tipo:'movie',tag:'~2122 (interno)',p:'La película que lo empezó todo: terror y ciencia ficción en una nave de la que nadie puede escapar.'},
      {n:5,era:'2142',eraCap:'aprox. · cronología interna',t:'Alien: Romulus',y:2024,tipo:'movie',tag:'~2142 (interno)',p:'Ambientada entre la primera y la segunda película; un grupo de jóvenes colonos se topa con horrores conocidos.'},
      {n:6,era:'2179',eraCap:'aprox. · cronología interna',t:'Aliens: el regreso',y:1986,tipo:'movie',tag:'~2179 (interno)',p:'James Cameron convierte el terror en acción militar; Ripley regresa al planeta con un pelotón de marines.'},
      {n:7,era:'2179',eraCap:'aprox. · cronología interna',t:'Alien 3',y:1992,tipo:'movie',tag:'~2179 (interno)',p:'Ripley cae en un planeta prisión sin ningún tipo de arma; la entrega más oscura y desesperanzada de la saga.'},
      {n:8,era:'2381',eraCap:'aprox. · cronología interna',t:'Alien: Resurrección',y:1997,tipo:'movie',tag:'~2381 (interno)',p:'Doscientos años después, Ripley es clonada para recuperar el ADN del Xenomorfo que lleva dentro.'}
    ];

    // Terminator — saga completa en orden de estreno (la continuidad se reinicia varias veces)
    const TERMINATOR = [
      {n:1,t:'Terminator',y:1984,tipo:'movie',tag:'Origen de la saga',p:'Un asesino cibernético del futuro es enviado al pasado para evitar el nacimiento del líder de la resistencia humana.'},
      {n:2,t:'Terminator 2: El juicio final',y:1991,tipo:'movie',tag:'La cumbre de la saga',p:'James Cameron perfecciona su propia fórmula con un villano líquido y efectos que siguen impresionando hoy.'},
      {n:3,t:'Terminator 3',y:2003,tipo:'movie',tag:'Continuación',p:'Skynet lanza un nuevo modelo de Terminator femenino contra John Connor, ya adulto.'},
      {n:4,t:'Terminator: La salvación',y:2009,tipo:'movie',tag:'Guerra futura',p:'La única entrega ambientada por completo en la guerra futura contra las máquinas, sin viajes en el tiempo de por medio.'},
      {n:5,t:'Terminator: Génesis',y:2015,tipo:'movie',tag:'Línea temporal alterada',p:'Reinicia la continuidad con una línea temporal alternativa donde el pasado ya ha sido modificado antes de empezar la película.'},
      {n:6,t:'Terminator: Destino oscuro',y:2019,tipo:'movie',tag:'Secuela directa de T2',p:'Ignora todas las secuelas posteriores a "El juicio final" y trae de vuelta a Linda Hamilton como Sarah Connor.'}
    ];

    // Stargate — franquicia completa en orden cronológico
    const STARGATE = [
      {n:1,era:'1939',nota:'Precuela',t:'Stargate Origins',y:2018,tipo:'tv',tag:'Precuela · 1939',p:'Miniserie precuela ambientada décadas antes del descubrimiento moderno de la puerta estelar.'},
      {n:2,era:'1994',nota:'Origen de la franquicia',t:'Stargate',y:1994,tipo:'movie',tag:'Origen de la franquicia',p:'El descubrimiento de un portal capaz de viajar a otros planetas; la película que dio origen a todo el universo Stargate.'},
      {n:3,era:'1997',nota:'10 temporadas',t:'Stargate SG-1',y:1997,tipo:'tv',tag:'10 temporadas',p:'El equipo SG-1 explora la galaxia a través de la puerta estelar durante una década; el pilar de toda la franquicia.'},
      {n:4,era:'2004',nota:'Spin-off · Galaxia de Pegaso',t:'Stargate Atlantis',y:2004,tipo:'tv',tag:'Spin-off · Galaxia de Pegaso',p:'Un equipo se traslada a la legendaria ciudad perdida de Atlantis, en una galaxia completamente distinta.'},
      {n:5,era:'2008',nota:'Cierre de SG-1',t:'Stargate: Arca de la Verdad',y:2008,tipo:'movie',tag:'Cierre de SG-1',p:'Película que cierra las tramas pendientes de SG-1 tras la cancelación de la serie.'},
      {n:6,era:'2008',nota:'Viajes en el tiempo',t:'Stargate: Continuum',y:2008,tipo:'movie',tag:'Viajes en el tiempo',p:'Una alteración en la línea temporal borra la existencia del Stargate Command tal y como se conocía.'},
      {n:7,era:'2009',nota:'Tono más oscuro y serio',t:'Stargate Universe',y:2009,tipo:'tv',tag:'Tono más oscuro y serio',p:'Un grupo queda varado en una nave ancestral a años luz de casa; la entrega más dramática y adulta de la franquicia.'}
    ];

    // Comedia europea — Francia, Italia y Reino Unido, cada una con su propio sentido del humor
    const COMEDIA_EUROPEA = [
      {n:1,t:'La cena de los idiotas',y:1998,tipo:'movie',tag:'🇫🇷 Francia',p:'Un grupo de amigos organiza una cena para reírse a costa del invitado más idiota que encuentren; gira mal desde el principio.'},
      {n:2,t:'Los visitantes',y:1993,tipo:'movie',tag:'🇫🇷 Francia',p:'Un caballero medieval y su escudero viajan por error al presente; comedia de choque temporal muy querida en Francia.'},
      {n:3,t:'Bienvenidos al Norte',y:2008,tipo:'movie',tag:'🇫🇷 Francia',p:'La película francesa más taquillera de su década, sobre los prejuicios entre el sur y el norte de Francia.'},
      {n:4,t:'Amélie',y:2001,tipo:'movie',tag:'🇫🇷 Francia',p:'Una joven parisina cambia en secreto la vida de quienes la rodean; una de las comedias más entrañables del cine francés.'},
      {n:5,t:'OSS 117: El Cairo, nido de espías',y:2006,tipo:'movie',tag:'🇫🇷 Francia',p:'Parodia de las películas de espías de los 60, con un protagonista tan encantador como profundamente ridículo.'},
      {n:6,t:'Intocable',y:2011,tipo:'movie',tag:'🇫🇷 Francia',p:'Comedia con mucho corazón sobre la amistad entre un aristócrata tetrapléjico y su cuidador de origen humilde.'},
      {n:7,t:'La familia Bélier',y:2014,tipo:'movie',tag:'🇫🇷 Francia',p:'La única hija oyente de una familia sorda descubre que tiene un don para el canto; comedia con mucho corazón.'},
      {n:8,t:'Perfectos desconocidos',y:2016,tipo:'movie',tag:'🇮🇹 Italia (versión original)',p:'La película italiana original antes de todos sus remakes por medio mundo (incluido el español); una cena y un juego con los móviles que se descontrola.'},
      {n:9,t:'La vida es bella',y:1997,tipo:'movie',tag:'🇮🇹 Italia',p:'Un padre convierte el horror de un campo de concentración en un juego para proteger a su hijo; comedia y drama en su máxima expresión.'},
      {n:10,t:'Pan y tulipanes',y:2000,tipo:'movie',tag:'🇮🇹 Italia',p:'Una ama de casa olvidada por su familia en una parada de autobús descubre una nueva vida en Venecia.'},
      {n:11,t:'Bienvenidos al Sur',y:2010,tipo:'movie',tag:'🇮🇹 Italia',p:'Remake italiano de "Bienvenidos al Norte" sobre los prejuicios entre el norte y el sur de Italia.'},
      {n:12,t:'Divorcio a la italiana',y:1961,tipo:'movie',tag:'🇮🇹 Italia',p:'Comedia negra clásica sobre un aristócrata siciliano que trama deshacerse "legalmente" de su esposa.'},
      {n:13,t:'El cartero (Il Postino)',y:1994,tipo:'movie',tag:'🇮🇹 Italia',p:'Un cartero italiano aprende sobre poesía y amor de su cliente más ilustre, el poeta chileno Pablo Neruda.'},
      {n:14,t:'Cuatro bodas y un funeral',y:1994,tipo:'movie',tag:'🇬🇧 Reino Unido',p:'Hugh Grant en la comedia romántica británica que definió todo un subgénero durante los años 90.'},
      {n:15,t:'La vida de Brian',y:1979,tipo:'movie',tag:'🇬🇧 Reino Unido',p:'Monty Python en su sátira religiosa más famosa y controvertida; humor absurdo británico en estado puro.'},
      {n:16,t:'Full Monty',y:1997,tipo:'movie',tag:'🇬🇧 Reino Unido',p:'Un grupo de exmineros en paro decide montar un espectáculo de striptease; comedia social con mucho corazón.'},
      {n:17,t:'Zombies Party',y:2004,tipo:'movie',tag:'🇬🇧 Reino Unido',p:'Una comedia de zombis que también es una comedia romántica sobre la rutina y la amistad; humor británico muy afilado.'},
      {n:18,t:'Hot Fuzz',y:2007,tipo:'movie',tag:'🇬🇧 Reino Unido',p:'Un policía de Londres es trasladado a un pueblo tranquilo que esconde algo mucho más siniestro de lo esperado.'},
      {n:19,t:'Escondidos en Brujas',y:2008,tipo:'movie',tag:'🇬🇧 Reino Unido',p:'Dos sicarios escondidos en Brujas tras un trabajo que salió mal; comedia negra con un humor muy británico e irlandés.'},
      {n:20,t:'Paddington',y:2014,tipo:'movie',tag:'🇬🇧 Reino Unido',p:'Un oso peruano llega a Londres y termina cambiando la vida de la familia que lo acoge; comedia familiar entrañable.'}
    ];
