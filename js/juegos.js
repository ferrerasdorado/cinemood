// CineMood · Puntuación rápida, «¿La has visto?», toque largo, siguiente episodio y tu semana
// (Parte de index.html; se carga como script clásico: todo comparte el mismo ámbito global.)

    // ══ PUNTUACIÓN RÁPIDA: tus vistos sin nota, uno a uno ══════════════════
    let _pq = null;
    async function abrirPuntuar(){
      if(!sesionActual){ mostrarCuenta(); return; }
      irA('p-puntuar');
      const cont = document.getElementById('pq-cont');
      cont.innerHTML = '<p class="rk-ayuda">Cargando lo que te falta por puntuar…</p>';
      const { data, error } = await sb.from('mi_biblioteca').select('id,tmdb_id,tipo,titulo,poster_path,anio').eq('user_id', sesionActual.user.id).eq('visto', true).is('puntuacion', null);
      if(error){ cont.innerHTML = '<p class="rk-ayuda">No se pudo cargar tu lista. Inténtalo de nuevo.</p>'; return; }
      _pq = {lista: barajar(data||[]), i:0, hechos:0, ultimo:null};
      _pintarPuntuar();
    }
    function _pintarPuntuar(){
      const cont = document.getElementById('pq-cont'); if(!cont || !_pq) return;
      const it = _pq.lista[_pq.i], total = _pq.lista.length;
      if(!it){
        cont.innerHTML = `<div class="pq-fin"><div class="pq-fin-e">${_pq.hechos ? '🎉' : '✅'}</div>
          <div class="pq-fin-t">${_pq.hechos ? `¡${_pq.hechos} ${_pq.hechos===1?'título puntuado':'títulos puntuados'}!` : (total ? 'Has llegado al final' : 'Todo lo que has visto tiene nota')}</div>
          <p class="rk-ayuda">Tus recomendaciones y tu ranking ya tienen en cuenta las notas nuevas.</p>
          <div class="cta-btn" onclick="mostrarCuenta()">Volver</div></div>`;
        if(_pq.hechos){ cargarParaTi(); if(_pq.ultimo) _comprobarLogrosNuevos(_pq.ultimo); }
        return;
      }
      _pq.nivelSel = _pq.nivelSel || null;
      cont.innerHTML = `
        <div class="pq-progreso"><span>${_pq.i+1} de ${total}</span><span>${_pq.hechos} puntuados</span></div>
        <div class="lg-barra"><div style="width:${Math.round(_pq.i/Math.max(1,total)*100)}%"></div></div>
        <div class="pq-carta">
          ${it.poster_path ? `<img src="https://image.tmdb.org/t/p/w342${it.poster_path}" alt="">` : '<div class="pq-sin"></div>'}
          <div class="pq-titulo">${_escHtml(it.titulo||'')}</div>
          <div class="pq-meta">${it.tipo==='tv' ? 'Serie' : 'Película'}${it.anio ? ' · '+it.anio : ''}</div>
        </div>
        <div class="pq-k">Nota</div>
        <div class="pq-notas">${Array.from({length:10},(_,k)=>k+1).map(n=>`<button type="button" class="pq-nota" onclick="pqPuntuar(${n})">${n}</button>`).join('')}</div>
        <div class="pq-k">Ranking <span>(opcional: elígelo antes de la nota)</span></div>
        <div class="d-nivel-row pq-niveles">${_filaNiveles('pqNivel', _pq.nivelSel || _nivelDeTitulo(`${it.tipo}:${it.tmdb_id}`))}</div>
        <div class="pq-acciones"><button type="button" class="ml-secundario" id="pq-saltar" onclick="pqSaltar()">${_pq.nivelSel ? 'Guardar solo el nivel' : 'No me acuerdo · saltar'}</button></div>
        <p class="rk-ayuda" style="text-align:center">Si no eliges nivel, se coloca solo según la nota.</p>`;
      const sig = _pq.lista[_pq.i+1]; if(sig && sig.poster_path){ const pre = new Image(); pre.src = `https://image.tmdb.org/t/p/w342${sig.poster_path}`; }
    }
    // ══ ¿LA HAS VISTO?: títulos muy conocidos, uno a uno, para apuntar en un toque lo que viste hace tiempo ══
    let _lhv = null;
    const LHV_NO_LS = 'cm:lhvNo';
    function _lhvNoLeer(){ try{ return new Set(JSON.parse(localStorage.getItem(LHV_NO_LS)||'[]')); }catch(e){ return new Set(); } }
    function _lhvNoGuardar(set){ try{ localStorage.setItem(LHV_NO_LS, JSON.stringify([...set].slice(-3000))); }catch(e){} }
    async function abrirLaHasVisto(){
      if(!sesionActual){ mostrarCuenta(); return; }
      irA('p-lahasvisto');
      const cont = document.getElementById('lhv-cont');
      cont.innerHTML = '<p class="rk-ayuda">Buscando títulos que probablemente hayas visto…</p>';
      const { data, error } = await sb.from('mi_biblioteca').select('tmdb_id,tipo').eq('user_id', sesionActual.user.id);
      if(error){ cont.innerHTML = '<p class="rk-ayuda">No se pudo cargar tu lista. Inténtalo de nuevo.</p>'; return; }
      _lhv = {lista:[], i:0, pagina:0, vistas:0, pendientes:0, cargando:null, ultimo:null,
              conocidos:new Set((data||[]).map(x=>`${x.tipo}:${x.tmdb_id}`)), no:_lhvNoLeer()};
      await _lhvCargarMas();
      _pintarLHV();
    }
    // Lo más votado de siempre (lo más probable es que lo hayas visto), cine español y tus géneros favoritos, intercalados
    function _lhvCargarMas(){
      if(_lhv.cargando) return _lhv.cargando;
      _lhv.cargando = (async ()=>{
        const pag = ++_lhv.pagina, perfil = _cargarPerfilGustoCache();
        const topG = perfil?.generosPeso ? Object.entries(perfil.generosPeso).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([g])=>g) : [];
        const rutas = [['movie',`sort_by=vote_count.desc&page=${pag}`], ['tv',`sort_by=vote_count.desc&without_genres=10763,10764,10767&page=${pag}`],
                       ['movie',`sort_by=vote_count.desc&with_origin_country=ES&page=${pag}`], ['movie',`sort_by=vote_count.desc&page=${pag+5}`]];
        topG.forEach(g=>rutas.push(['movie',`sort_by=vote_count.desc&with_genres=${g}&page=${pag+1}`]));
        const res = await Promise.all(rutas.map(([t,q])=>_tmdbJson(`/discover/${t}&language=es-ES&${q}`).then(d=>(d.results||[]).map(r=>({id:r.id, tipo:t, t:r.title||r.name, poster:r.poster_path, f:r.release_date||r.first_air_date||'', g:r.genre_ids||[]}))).catch(()=>[])));
        const ya = new Set(_lhv.lista.map(x=>`${x.tipo}:${x.id}`));
        const max = Math.max(0, ...res.map(r=>r.length));
        for(let k=0; k<max; k++) res.forEach(r=>{ const x = r[k]; if(!x || !x.poster) return; const key = `${x.tipo}:${x.id}`;
          if(ya.has(key) || _lhv.conocidos.has(key) || _lhv.no.has(key) || esOculta(x.id, x.tipo)) return; ya.add(key); _lhv.lista.push(x); });
        _lhv.cargando = null;
      })();
      return _lhv.cargando;
    }
    function _pintarLHV(){
      const cont = document.getElementById('lhv-cont'); if(!cont || !_lhv) return;
      const it = _lhv.lista[_lhv.i];
      const resumen = `<div class="pq-progreso"><span>${_lhv.vistas} ${_lhv.vistas===1?'vista':'vistas'} · ${_lhv.pendientes} para ver</span><span>${_lhv.i} revisadas</span></div>`;
      if(!it){
        if(_lhv.cargando || _lhv.pagina<15){ cont.innerHTML = resumen + '<p class="rk-ayuda">Buscando más…</p>'; _lhvCargarMas().then(_pintarLHV); return; }
        cont.innerHTML = resumen + `<div class="pq-fin"><div class="pq-fin-e">🎉</div><div class="pq-fin-t">Has repasado todo</div><div class="cta-btn" onclick="salirLaHasVisto()">Terminar</div></div>`;
        return;
      }
      cont.innerHTML = `${resumen}
        <div class="pq-carta lhv-carta">
          <img src="https://image.tmdb.org/t/p/w342${it.poster}" alt="">
          <div class="pq-titulo">${_escHtml(it.t)}</div>
          <div class="pq-meta">${it.tipo==='tv' ? 'Serie' : 'Película'}${it.f ? ' · '+it.f.slice(0,4) : ''}</div>
        </div>
        <button type="button" class="cta-btn lhv-si" onclick="lhvAccion('visto')">✓ La he visto</button>
        <div class="pq-k" style="text-align:center">o ponle nota directamente</div>
        <div class="pq-notas">${Array.from({length:10},(_,k)=>k+1).map(n=>`<button type="button" class="pq-nota" onclick="lhvAccion('visto',${n})">${n}</button>`).join('')}</div>
        <div class="lhv-fila">
          <button type="button" class="ml-secundario" onclick="lhvAccion('no')">✕ No la he visto</button>
          <button type="button" class="ml-secundario" onclick="lhvAccion('pendiente')">＋ Me interesa</button>
        </div>
        <div class="lhv-fila"><button type="button" class="ml-secundario lhv-ocultar" onclick="lhvAccion('ocultar')">🙅 No me interesa</button></div>
        <p class="rk-ayuda" style="text-align:center">Todo se guarda al momento. Puedes salir cuando quieras.</p>`;
      const sig = _lhv.lista[_lhv.i+1]; if(sig){ const pre = new Image(); pre.src = `https://image.tmdb.org/t/p/w342${sig.poster}`; }
      if(_lhv.i >= _lhv.lista.length-6) _lhvCargarMas();
    }
    async function lhvAccion(a, nota){
      const it = _lhv && _lhv.lista[_lhv.i]; if(!it) return;
      const key = `${it.tipo}:${it.id}`, pos = _lhv.i;
      _lhv.i++;
      const volver = () => { _lhv.lista.splice(_lhv.i, 0, _lhv.lista.splice(pos,1)[0]); _pintarLHV(); }; // al deshacer, vuelve a salir
      if(a==='no'){ _lhv.no.add(key); _lhvNoGuardar(_lhv.no); _pintarLHV(); return; }
      if(a==='ocultar'){ _pintarLHV(); ocultarTitulo(it); return; }
      _pintarLHV();
      const patch = a==='visto' ? {visto:true, pendiente:false, ...(nota ? {puntuacion:nota} : {})} : {pendiente:true};
      const rk = _rkCopia();
      if(nota && !_nivelDeTitulo(key)) _colocarEnNivel(key, _nivelPorNota(nota));
      const base = {user_id:sesionActual.user.id, tmdb_id:it.id, tipo:it.tipo, titulo:it.t, poster_path:it.poster||null, anio:it.f ? it.f.slice(0,4) : ''};
      const { error } = await sb.from('mi_biblioteca').upsert({...base, ...patch}, { onConflict:'user_id,tmdb_id,tipo' });
      if(error){ _aviso(`No se pudo guardar «${it.t}». Inténtalo de nuevo.`, true); _lhv.i = Math.min(_lhv.i, pos); _pintarLHV(); return; }
      _lhv.conocidos.add(key);
      if(a==='visto'){ _lhv.vistas++; _lhv.ultimo = {_tipo:it.tipo, id:it.id}; } else _lhv.pendientes++;
      const cab = document.querySelector('#lhv-cont .pq-progreso span'); if(cab) cab.textContent = `${_lhv.vistas} ${_lhv.vistas===1?'vista':'vistas'} · ${_lhv.pendientes} para ver`;
      _avisoDeshacer(a==='visto' ? `✓ «${it.t}» vista${nota ? ' con un '+nota : ''}` : `＋ «${it.t}» para ver`, async ()=>{
        await _deshacerFila(it.tipo, it.id, null, rk)();
        _lhv.conocidos.delete(key); if(a==='visto') _lhv.vistas--; else _lhv.pendientes--;
        _lhv.i--; volver();
      });
    }
    function salirLaHasVisto(){
      if(_lhv && (_lhv.vistas || _lhv.pendientes)){
        refrescarIdsVistos(); refrescarVistosNormalizados().then(()=>{ renderEspecialesTiles(); });
        cargarParaTi(); if(_lhv.ultimo) _comprobarLogrosNuevos(_lhv.ultimo);
      }
      _lhv = null;
      mostrarCuenta();
    }
    // Fila S–D reutilizable: «fn» es la función a la que llama cada botón; «activo», el nivel marcado
    function _filaNiveles(fn, activo){
      return RK_NIVELES.map(([n,c])=>`<button type="button" class="d-nivel${activo===n?' activo':''}" style="--c:${c}" onclick="${fn}('${n}')">${n}</button>`).join('');
    }
    const _nivelPorNota = n => n>=10 ? 'A' : n>=8 ? 'B' : n>=7 ? 'C' : 'D';
    function pqNivel(n){
      if(!_pq) return;
      _pq.nivelSel = _pq.nivelSel===n ? null : n;
      const it = _pq.lista[_pq.i];
      document.querySelector('.pq-niveles').innerHTML = _filaNiveles('pqNivel', _pq.nivelSel || (it && _nivelDeTitulo(`${it.tipo}:${it.tmdb_id}`)));
      document.getElementById('pq-saltar').textContent = _pq.nivelSel ? 'Guardar solo el nivel' : 'No me acuerdo · saltar';
    }
    async function pqPuntuar(n){
      const it = _pq && _pq.lista[_pq.i]; if(!it) return;
      const nivel = _pq.nivelSel;
      _pq.i++; _pq.hechos++; _pq.nivelSel = null; _pintarPuntuar();   // se pasa al siguiente al momento; se guarda por detrás
      const k = `${it.tipo}:${it.tmdb_id}`;
      if(nivel) _colocarEnNivel(k, nivel);
      else if(!_nivelDeTitulo(k)) _colocarEnNivel(k, _nivelPorNota(n));
      const { error } = await sb.from('mi_biblioteca').update({puntuacion:n}).eq('id', it.id).eq('user_id', sesionActual.user.id);
      if(error){ _pq.hechos--; _aviso(`No se pudo guardar la nota de «${it.titulo}». Inténtalo luego.`, true); }
      else _pq.ultimo = {_tipo:it.tipo, id:it.tmdb_id};
    }
    function pqSaltar(){
      if(!_pq) return;
      const it = _pq.lista[_pq.i];
      if(_pq.nivelSel && it){ _colocarEnNivel(`${it.tipo}:${it.tmdb_id}`, _pq.nivelSel); _pq.hechos++; } // solo el nivel
      _pq.nivelSel = null; _pq.i++; _pintarPuntuar();
    }

    // ══ TOQUE LARGO (o clic derecho) SOBRE UN PÓSTER: visto / para ver sin abrir la ficha ══
    function _lp(o){ return `data-lp="${encodeURIComponent(JSON.stringify(o))}"`; }
    function _abrirMenuLp(el){
      let o; try{ o = JSON.parse(decodeURIComponent(el.getAttribute('data-lp'))); }catch(e){ return; }
      if(window._lpAbierto && Date.now()-window._lpAbierto<600) return; // toque largo + menú contextual a la vez
      window._lpAbierto = Date.now(); window._lpObj = o;
      let fondo = document.getElementById('lp-fondo'), menu = document.getElementById('lp-menu');
      if(!menu){
        fondo = document.createElement('div'); fondo.id = 'lp-fondo'; fondo.className = 'lp-fondo'; fondo.onclick = cerrarMenuLp;
        menu = document.createElement('div'); menu.id = 'lp-menu'; menu.className = 'lp-menu';
        document.body.append(fondo, menu);
      }
      const visto = (window.idsVistosSet||new Set()).has(`${o.id}-${o.tipo}`);
      menu.innerHTML = `<div class="lp-cab">${o.poster ? `<img src="https://image.tmdb.org/t/p/w92${o.poster}" alt="">` : ''}
          <div><div class="lp-t">${_escHtml(o.t||'')}</div><div class="lp-m">${o.tipo==='tv' ? 'Serie' : 'Película'}${o.f ? ' · '+String(o.f).slice(0,4) : ''}</div></div></div>
        <div id="lp-cuerpo">
          ${visto ? '<div class="lp-ya">✓ Ya la tienes como vista</div>' : '<button type="button" class="lp-btn principal" onclick="lpAccion(\'visto\')">✓ Marcar como vista</button>'}
          <button type="button" class="lp-btn" onclick="lpAccion('pendiente')">＋ Añadir a «Para ver»</button>
          <button type="button" class="lp-btn" onclick="lpAccion('ficha')">Abrir ficha</button>
          ${visto ? '' : '<button type="button" class="lp-btn" onclick="lpAccion(\'ocultar\')">🙅 No me interesa</button>'}
          <button type="button" class="lp-btn sec" onclick="cerrarMenuLp()">Cancelar</button>
        </div>`;
      fondo.classList.add('on'); menu.classList.add('on');
    }
    function cerrarMenuLp(){ document.getElementById('lp-fondo')?.classList.remove('on'); document.getElementById('lp-menu')?.classList.remove('on'); }
    async function _lpGuardar(o, patch, textoDeshacer){
      if(!sesionActual){ cerrarMenuLp(); mostrarCuenta(); return false; }
      if(patch.visto===true) patch = {...patch, pendiente:false};
      let antes = null; const rk = textoDeshacer ? _rkCopia() : null;
      if(textoDeshacer){ try{ antes = await _filaBiblio(o.tipo, o.id); }catch(e){} }
      const base = {user_id:sesionActual.user.id, tmdb_id:o.id, tipo:o.tipo, titulo:o.t, poster_path:o.poster||null, anio:o.f ? String(o.f).slice(0,4) : ''};
      const { error } = await sb.from('mi_biblioteca').upsert({...base, ...patch}, { onConflict:'user_id,tmdb_id,tipo' });
      if(error){ _aviso('No se ha podido guardar. Inténtalo de nuevo.', true); return false; }
      if(textoDeshacer) _avisoDeshacer(textoDeshacer, _deshacerFila(o.tipo, o.id, antes, rk));
      if('visto' in patch){ await refrescarIdsVistos(); refrescarVistosNormalizados(); if(o.tipo==='tv') cargarContinuarViendo(); }
      if(patch.puntuacion!=null){ const k = `${o.tipo}:${o.id}`; if(!_nivelDeTitulo(k)) _colocarEnNivel(k, patch.puntuacion>=10 ? 'A' : patch.puntuacion>=8 ? 'B' : patch.puntuacion>=7 ? 'C' : 'D'); }
      _comprobarLogrosNuevos({_tipo:o.tipo, id:o.id});
      return true;
    }
    async function lpAccion(a){
      const o = window._lpObj; if(!o) return;
      const cuerpo = document.getElementById('lp-cuerpo');
      if(a==='ficha'){ cerrarMenuLp(); abrirDetalle({id:o.id, _tipo:o.tipo, title:o.t, poster_path:o.poster, release_date:o.f}); return; }
      if(a==='ocultar'){ cerrarMenuLp(); ocultarTitulo(o); return; }
      cuerpo.querySelectorAll('button').forEach(b=>b.disabled = true);
      if(a==='pendiente'){
        if(await _lpGuardar(o, {pendiente:true}, `＋ «${o.t||''}» añadida a «Para ver»`)){ cuerpo.innerHTML = '<div class="lp-ya">＋ Añadida a «Para ver»</div>'; setTimeout(cerrarMenuLp, 900); }
        else cuerpo.querySelectorAll('button').forEach(b=>b.disabled = false);
        return;
      }
      if(await _lpGuardar(o, {visto:true}, `✓ «${o.t||''}» marcada como vista`)){
        // y, ya que estás, la nota
        window._lpNivelSel = null;
        cuerpo.innerHTML = `<div class="lp-ya">✓ Marcada como vista. ¿Qué nota le pones?</div>
          <div class="pq-notas lp-notas">${Array.from({length:10},(_,k)=>k+1).map(n=>`<button type="button" class="pq-nota" onclick="lpNota(${n})">${n}</button>`).join('')}</div>
          <div class="pq-k">Ranking <span>(opcional: elígelo antes de la nota)</span></div>
          <div class="d-nivel-row lp-niveles">${_filaNiveles('lpNivel', _nivelDeTitulo(`${o.tipo}:${o.id}`))}</div>
          <button type="button" class="lp-btn sec" id="lp-ahora-no" onclick="lpSoloNivel()">Ahora no</button>`;
      } else cuerpo.querySelectorAll('button').forEach(b=>b.disabled = false);
    }
    function lpNivel(n){
      const o = window._lpObj; if(!o) return;
      window._lpNivelSel = window._lpNivelSel===n ? null : n;
      document.querySelector('.lp-niveles').innerHTML = _filaNiveles('lpNivel', window._lpNivelSel || _nivelDeTitulo(`${o.tipo}:${o.id}`));
      document.getElementById('lp-ahora-no').textContent = window._lpNivelSel ? 'Guardar solo el nivel' : 'Ahora no';
    }
    function lpSoloNivel(){
      const o = window._lpObj;
      if(o && window._lpNivelSel){ _colocarEnNivel(`${o.tipo}:${o.id}`, window._lpNivelSel); document.getElementById('lp-cuerpo').innerHTML = `<div class="lp-ya">✓ Colocada en ${window._lpNivelSel}</div>`; window._lpNivelSel = null; setTimeout(cerrarMenuLp, 900); return; }
      cerrarMenuLp();
    }
    async function lpNota(n){
      const o = window._lpObj; if(!o) return;
      if(window._lpNivelSel){ _colocarEnNivel(`${o.tipo}:${o.id}`, window._lpNivelSel); window._lpNivelSel = null; }
      document.querySelectorAll('#lp-cuerpo button').forEach(b=>b.disabled = true);
      if(await _lpGuardar(o, {visto:true, puntuacion:n})){ document.getElementById('lp-cuerpo').innerHTML = `<div class="lp-ya">✓ Guardada con un ${n}</div>`; setTimeout(cerrarMenuLp, 900); }
    }
    async function _tmdbCacheado(ruta){ if(!window._cacheSeries[ruta]) window._cacheSeries[ruta] = _tmdbJson(ruta).catch(e=>{ delete window._cacheSeries[ruta]; throw e; }); return window._cacheSeries[ruta]; }
    async function _siguienteEpisodio(id, prog){
      const d = await _tmdbCacheado(`/tv/${id}&language=es-ES`);
      const temps = (d.seasons||[]).filter(s=>s.season_number>0).sort((a,b)=>a.season_number-b.season_number);
      const actual = temps.find(s=>s.season_number===prog.temporada);
      let s, e;
      if(actual && prog.episodio < (actual.episode_count||0)){ s = prog.temporada; e = prog.episodio+1; }
      else { const sig = temps.find(x=>x.season_number>prog.temporada); if(!sig) return {alDia:true, proximo:d.next_episode_to_air||null}; s = sig.season_number; e = 1; }
      let nombre = '', fecha = null;
      try{ const temp = await _tmdbCacheado(`/tv/${id}/season/${s}&language=es-ES`); const ep = (temp.episodes||[]).find(x=>x.episode_number===e); if(ep){ nombre = ep.name||''; fecha = ep.air_date||null; } }catch(err){}
      if(!fecha && d.next_episode_to_air && d.next_episode_to_air.season_number===s && d.next_episode_to_air.episode_number===e) fecha = d.next_episode_to_air.air_date;
      return {s, e, nombre, fecha, queda:_loQueQueda(d, prog.vistos)};
    }
    const _fechaCorta = f => new Date(f+'T12:00:00').toLocaleDateString('es-ES', {day:'numeric', month:'short'});
    async function _pintarSiguientesEpisodios(lista){
      const hoyISO = new Date().toISOString().slice(0,10);
      await _fetchEnLotes(lista.map((it,i)=>({it,i})), async ({it,i})=>{
        const el = document.getElementById(`cv-ep-${i}`); if(!el) return;
        try{
          const n = await _siguienteEpisodio(it.tmdb_id, {...it._progreso, vistos:it.episodios_vistos}); it._siguiente = n;
          const q = n.queda && n.queda.eps>1 ? `<div class="cv-queda">Quedan ${n.queda.eps} ep.${n.queda.min?' · '+_duracionAprox(n.queda.min).replace(/^(unos|unas) /,'~'):''}</div>` : '';
          if(n.alDia){ el.innerHTML = `<span class="cv-al-dia">✓ Al día${n.proximo && n.proximo.air_date ? ` · nuevo ${_fechaCorta(n.proximo.air_date)}` : ''}</span>`; return; }
          const sale = n.fecha && n.fecha>hoyISO;
          el.innerHTML = `<div class="cv-ep-t">T${n.s} · E${n.e}${n.nombre ? ' · '+_escHtml(n.nombre) : ''}</div>
            ${sale ? `<div class="cv-sale">Sale el ${_fechaCorta(n.fecha)}</div>` : `${q}<button type="button" class="cv-visto" onclick="event.stopPropagation();cvMarcarVisto(${i}, this)">✓ Visto</button>`}`;
        }catch(e){ el.innerHTML = ''; }
      }, 4);
    }
    async function cvMarcarVisto(i, btn){
      const it = (window.continuarViendoActual||[])[i], n = it && it._siguiente; if(!n || n.alDia) return;
      btn.disabled = true; btn.textContent = 'Guardando…';
      const ev = JSON.parse(JSON.stringify(it.episodios_vistos||{}));
      ev[n.s] = [...new Set([...(ev[n.s]||[]), n.e])].sort((a,b)=>a-b);
      const { error } = await sb.from('mi_biblioteca').update({episodios_vistos:ev}).eq('user_id', sesionActual.user.id).eq('tmdb_id', it.tmdb_id).eq('tipo','tv');
      if(error){ btn.disabled = false; btn.textContent = '✓ Visto'; _aviso('No se pudo guardar. Inténtalo de nuevo.', true); return; }
      const previo = it.episodios_vistos || {};
      _avisoDeshacer(`✓ ${it.titulo} · T${n.s} E${n.e} visto`, async ()=>{
        const { error:e2 } = await sb.from('mi_biblioteca').update({episodios_vistos:previo}).eq('user_id', sesionActual.user.id).eq('tmdb_id', it.tmdb_id).eq('tipo','tv');
        if(e2) throw e2; cargarContinuarViendo();
      });
      cargarContinuarViendo();
    }

    // ══ AVISO DE NUEVAS TEMPORADAS de tus series (se comprueba una vez al día) ══
    // ══ TU SEMANA: estrenos en cines y en casa que encajan contigo y episodios de tus series en los próximos 7 días ══
    async function cargarTuSemana(){
      const box = document.getElementById('tu-semana'); if(!box || !sesionActual) return;
      const hoy = new Date(), iso = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const d1 = iso(hoy), d2 = iso(new Date(hoy.getTime()+6*864e5));
      const clave = `cm:semana:${sesionActual.user.id}:${d1}`;
      let datos = null; try{ datos = JSON.parse(sessionStorage.getItem(clave)||'null'); }catch(e){}
      if(!datos){
        try{
          const perfil = _cargarPerfilGustoCache(), vistos = window.idsVistosSet || new Set();
          const orden = l => l.filter(x=>x.poster_path && !vistos.has(`${x.id}-movie`) && !esOculta(x.id,'movie')).map(x=>({...x, _g: perfil ? _puntuarPorGustoEstable({genre_ids:x.genre_ids, release_date:x.release_date, vote_average:x.vote_average||6}, perfil) + (x.popularity||0)/2000 : (x.popularity||0)})).sort((a,b)=>b._g-a._g).slice(0,4);
          const q = t => `/discover/movie&language=es-ES&region=ES&with_release_type=${t}&release_date.gte=${d1}&release_date.lte=${d2}&sort_by=popularity.desc`;
          const [cines, casa, filas] = await Promise.all([
            _tmdbJson(q('2|3')).then(d=>orden(d.results||[])).catch(()=>[]),
            _tmdbJson(q('4')).then(d=>orden(d.results||[])).catch(()=>[]),
            sb.from('mi_biblioteca').select('tmdb_id,titulo,poster_path,visto,pendiente,episodios_vistos').eq('user_id', sesionActual.user.id).eq('tipo','tv').then(r=>r.data||[]).catch(()=>[])
          ]);
          const mias = filas.filter(x=>!esAbandonada(x.tmdb_id) && (x.visto || x.pendiente || _episodiosVistos(x))).slice(0,40);
          const eps = (await _fetchEnLotes(mias, async x=>{ try{ const d = await _tmdbCacheado(`/tv/${x.tmdb_id}&language=es-ES`); const p = d.next_episode_to_air; return p && p.air_date>=d1 && p.air_date<=d2 ? {id:x.tmdb_id, t:d.name||x.titulo, poster:d.poster_path||x.poster_path, f:p.air_date, s:p.season_number, e:p.episode_number} : null; }catch(e){ return null; } }, 5)).filter(Boolean).sort((a,b)=>a.f.localeCompare(b.f));
          const mini = x => ({id:x.id, t:x.title||x.name, poster:x.poster_path, f:x.release_date});
          datos = {cines:cines.map(mini), casa:casa.map(mini), eps};
          try{ sessionStorage.setItem(clave, JSON.stringify(datos)); }catch(e){}
        }catch(e){ return; }
      }
      if(!datos.cines.length && !datos.casa.length && !datos.eps.length){ box.style.display = 'none'; return; }
      window._semana = datos;
      const dia = f => { const d = new Date(f+'T12:00:00'), h = iso(new Date()); return f===h ? 'Hoy' : d.toLocaleDateString('es-ES',{weekday:'short', day:'numeric'}).replace('.',''); };
      const fila = (l, tipo, k) => l.map((x,i)=>`<button type="button" class="sem-item" onclick="abrirDetalle({id:_semana.${k}[${i}].id,_tipo:'${tipo}',title:_semana.${k}[${i}].t,poster_path:_semana.${k}[${i}].poster,release_date:_semana.${k}[${i}].f})">
          <span class="sem-img">${x.poster ? `<img loading="lazy" src="https://image.tmdb.org/t/p/w154${x.poster}" alt="">` : ''}<em>${dia(x.f)}</em></span>
          <span class="sem-t">${_escHtml(x.t)}</span>${x.s ? `<span class="sem-m">T${x.s} · E${x.e}</span>` : ''}</button>`).join('');
      const bloques = [['🍿 En cines', datos.cines, 'movie', 'cines'], ['🏠 Para ver en casa', datos.casa, 'movie', 'casa'], ['📺 Tus series', datos.eps.slice(0,4), 'tv', 'eps']].filter(([,l])=>l.length);
      box.innerHTML = `<div class="sem-cab"><div><div class="sem-k">Tu semana</div><div class="sem-titulo">Lo que llega de hoy al ${dia(d2)}</div></div><button type="button" class="d-saga-link" onclick="abrirCalendario()">Calendario ›</button></div>
        ${bloques.map(([t,l,tipo,k])=>`<div class="sem-bloque"><div class="sem-bk">${t}</div><div class="sem-fila">${fila(l, tipo, k)}</div></div>`).join('')}`;
      box.style.display = 'block';
    }
    async function cargarAvisosSeries(){
      const box = document.getElementById('avisos-series'); if(!box || !sesionActual) return;
      const hoy = new Date(), hoyISO = hoy.toISOString().slice(0,10), clave = 'cm:avisosSeries';
      let cache = null; try{ cache = JSON.parse(localStorage.getItem(clave)||'null'); }catch(e){}
      let avisos;
      if(cache && cache.fecha===hoyISO && cache.uid===sesionActual.user.id) avisos = cache.avisos;
      else{
        const { data } = await sb.from('mi_biblioteca').select('tmdb_id,titulo,poster_path,visto,episodios_vistos').eq('user_id', sesionActual.user.id).eq('tipo','tv');
        const mias = (data||[]).filter(x=>(x.visto || calcularProgresoSerie(x.episodios_vistos)) && !esAbandonada(x.tmdb_id)).slice(0,40);
        const res = await _fetchEnLotes(mias, async x=>{
          try{
            const d = await _tmdbJson(`/tv/${x.tmdb_id}&language=es-ES`);
            const dias = f => Math.round((new Date(f+'T12:00:00') - hoy)/86400000);
            const vistasDe = s => ((x.episodios_vistos||{})[s]||[]).length;
            const prox = d.next_episode_to_air;
            if(prox && prox.air_date && prox.episode_number===1 && dias(prox.air_date)>=0 && dias(prox.air_date)<=120)
              return {id:x.tmdb_id, t:d.name||x.titulo, poster:d.poster_path||x.poster_path, s:prox.season_number, f:prox.air_date, tipo:'vuelve'};
            const ult = (d.seasons||[]).filter(s=>s.season_number>0 && s.air_date).sort((a,b)=>b.season_number-a.season_number)[0];
            if(ult && dias(ult.air_date)<=0 && dias(ult.air_date)>=-45 && !vistasDe(ult.season_number))
              return {id:x.tmdb_id, t:d.name||x.titulo, poster:d.poster_path||x.poster_path, s:ult.season_number, f:ult.air_date, tipo:'nueva'};
          }catch(e){}
          return null;
        }, 5);
        avisos = res.filter(Boolean).sort((a,b)=>a.f.localeCompare(b.f));
        try{ localStorage.setItem(clave, JSON.stringify({fecha:hoyISO, uid:sesionActual.user.id, avisos})); }catch(e){}
      }
      if(!avisos.length){ box.style.display = 'none'; return; }
      window._avisosSeries = avisos;
      box.innerHTML = `<div class="section-label">📺 Tus series</div>` + avisos.slice(0,4).map((a,i)=>{
        const d = Math.round((new Date(a.f+'T12:00:00') - new Date(hoyISO+'T12:00:00'))/86400000);
        const cuando = a.tipo==='vuelve' ? (d===0 ? 'se estrena hoy' : d===1 ? 'se estrena mañana' : `vuelve el ${new Date(a.f+'T12:00:00').toLocaleDateString('es-ES',{day:'numeric', month:'long'})}`) : `ya disponible${d<0 ? ` desde hace ${-d} ${-d===1?'día':'días'}` : ''}`;
        return `<div class="aviso-serie" onclick="abrirDetalle({id:_avisosSeries[${i}].id,_tipo:'tv',title:_avisosSeries[${i}].t,poster_path:_avisosSeries[${i}].poster})">
          ${a.poster ? `<img src="https://image.tmdb.org/t/p/w92${a.poster}" alt="">` : ''}
          <div><div class="aviso-serie-t">${_escHtml(a.t)} · temporada ${a.s}</div><div class="aviso-serie-c ${a.tipo}">${a.tipo==='vuelve' ? '📅' : '🆕'} ${cuando}</div></div></div>`;
      }).join('');
      box.style.display = 'block';
    }

    async function cargarContinuarViendo(){
      cargarSeguirViendo();
      const wrap = document.getElementById('continuar-viendo-wrap');
      if(!sesionActual){ wrap.style.display='none'; return; }
      const { data, error } = await sb.from('mi_biblioteca').select('*')
        .eq('user_id', sesionActual.user.id).eq('tipo','tv').eq('visto', false)
        .order('actualizado_en', { ascending:false });
      if(error || !data || !data.length){ wrap.style.display='none'; return; }
      const enProgreso = data
        .filter(row=>!esAbandonada(row.tmdb_id))
        .map(row=>{ const p = calcularProgresoSerie(row.episodios_vistos); return p ? {...row,_progreso:p} : null; })
        .filter(Boolean)
        .slice(0,10);
      if(!enProgreso.length){ wrap.style.display='none'; return; }
      window.continuarViendoActual = enProgreso;
      document.getElementById('continuar-viendo-scroll').innerHTML = enProgreso.map((it,i)=>`
        <div class="similar-card" onclick="abrirDetalleDesdeContinuar(${i})">
          <img loading="lazy" src="${it.poster_path?'https://image.tmdb.org/t/p/w200'+it.poster_path:''}" alt="${_escHtml(it.titulo)}">
          <div class="similar-titulo">${_escHtml(it.titulo)}</div>
          <div class="similar-meta">Vas por T${it._progreso.temporada} · E${it._progreso.episodio}</div>
          <div class="cv-ep" id="cv-ep-${i}"></div>
        </div>`).join('');
      wrap.style.display = 'block';
      _pintarSiguientesEpisodios(enProgreso);
    }
    async function abrirDetalleDesdeContinuar(i){
      const it = window.continuarViendoActual[i];
      try{
        const d = await (await fetch(`${TMDB_PROXY}?path=/tv/${it.tmdb_id}&language=es-ES`)).json();
        const obj = {...d, title: d.name||d.title, release_date: d.first_air_date, _tipo:'tv'};
        await abrirDetalle(obj);
      }catch(e){}
    }

    // ── COMPARADOR ("¿Cuál veo?") ─────────────────────────────────────────
    let comparadorSlotActivo = null;
    let comparadorA = null, comparadorB = null;
    let comparadorBusquedaTimeout = null;

    function abrirBusquedaComparador(slot){
      comparadorSlotActivo = slot;
      document.getElementById('comparador-busqueda').style.display = 'block';
      document.getElementById('comp-busqueda-input').value = '';
      document.getElementById('comparador-resultados').innerHTML = '';
      document.getElementById('comp-busqueda-input').focus();
    }
    function cerrarBusquedaComparador(){
      document.getElementById('comparador-busqueda').style.display = 'none';
    }
    function buscarParaComparador(){
      clearTimeout(comparadorBusquedaTimeout);
      const cont = document.getElementById('comparador-resultados');
      const q = document.getElementById('comp-busqueda-input').value.trim();
      if(q.length<2){ cont.innerHTML=''; return; }
      comparadorBusquedaTimeout = setTimeout(async ()=>{
        try{
          const [rm,rt] = await Promise.all([
            fetch(`${TMDB_PROXY}?path=/search/movie&language=es-ES&query=${encodeURIComponent(q)}`).then(r=>r.json()),
            fetch(`${TMDB_PROXY}?path=/search/tv&language=es-ES&query=${encodeURIComponent(q)}`).then(r=>r.json())
          ]);
          const combinados = [
            ...(rm.results||[]).map(x=>({...x,_tipo:'movie',title:x.title})),
            ...(rt.results||[]).map(x=>({...x,_tipo:'tv',title:x.name,release_date:x.first_air_date}))
          ].filter(x=>x.poster_path).sort((a,b)=>(b.popularity||0)-(a.popularity||0)).slice(0,6);
          window.comparadorResultadosActual = combinados;
          cont.innerHTML = combinados.map((p,i)=>`
            <div class="comparador-resultado-card" onclick="elegirParaComparador(${i})">
              <img loading="lazy" src="https://image.tmdb.org/t/p/w200${p.poster_path}" alt="${_escHtml(p.title)}">
              <div class="comparador-resultado-titulo">${_escHtml(p.title)}</div>
              <div class="comparador-resultado-meta">${p.release_date?p.release_date.substring(0,4):''} · ${p._tipo==='tv'?'Serie':'Película'}</div>
            </div>`).join('');
        }catch(e){}
      }, 400);
    }
    async function elegirParaComparador(i){
      const p = window.comparadorResultadosActual[i];
      try{
        const detalles = await (await fetch(`${TMDB_PROXY}?path=/${p._tipo}/${p.id}&language=es-ES&append_to_response=credits`)).json();
        const obj = {...detalles, _tipo:p._tipo, title: detalles.title||detalles.name, release_date: detalles.release_date||detalles.first_air_date};
        if(comparadorSlotActivo==='a') comparadorA = obj; else comparadorB = obj;
      }catch(e){ return; }
      cerrarBusquedaComparador();
      renderComparadorSlots();
      renderTablaComparador();
    }
    function renderComparadorSlots(){
      ['a','b'].forEach(slot=>{
        const obj = slot==='a'?comparadorA:comparadorB;
        const el = document.getElementById(`comp-slot-${slot}`);
        if(!obj){ el.innerHTML = `<div class="comparador-slot-vacio" onclick="abrirBusquedaComparador('${slot}')">+ Elegir título</div>`; return; }
        el.innerHTML = `
          <img class="comparador-poster" src="${obj.poster_path?'https://image.tmdb.org/t/p/w300'+obj.poster_path:''}" alt="${_escHtml(obj.title)}">
          <div class="comparador-slot-titulo">${_escHtml(obj.title)}</div>
          <div class="link-sutil" onclick="abrirBusquedaComparador('${slot}')">Cambiar</div>`;
      });
    }
    function renderTablaComparador(){
      const cont = document.getElementById('comparador-tabla');
      if(!comparadorA || !comparadorB){ cont.innerHTML=''; return; }
      const generosA = (comparadorA.genres||[]).map(g=>g.name).join(', ') || '—';
      const generosB = (comparadorB.genres||[]).map(g=>g.name).join(', ') || '—';
      const castA = (comparadorA.credits?.cast||[]).slice(0,8).map(c=>c.name);
      const castB = (comparadorB.credits?.cast||[]).slice(0,8).map(c=>c.name);
      const comunes = castA.filter(n=>castB.includes(n));
      const duracion = obj => obj._tipo==='movie'
        ? (obj.runtime?`${obj.runtime} min`:'—')
        : (obj.number_of_seasons?`${obj.number_of_seasons} temp. · ${obj.number_of_episodes||'?'} eps`:'—');
      const filas = [
        ['★ Nota TMDB', comparadorA.vote_average?comparadorA.vote_average.toFixed(1):'—', comparadorB.vote_average?comparadorB.vote_average.toFixed(1):'—'],
        ['Año', comparadorA.release_date?comparadorA.release_date.substring(0,4):'—', comparadorB.release_date?comparadorB.release_date.substring(0,4):'—'],
        ['Duración', duracion(comparadorA), duracion(comparadorB)],
        ['Género', generosA, generosB]
      ];
      cont.innerHTML = `
        ${filas.map(([label,a,b])=>`
          <div class="comparador-fila">
            <div class="comparador-valor">${a}</div>
            <div class="comparador-label">${label}</div>
            <div class="comparador-valor">${b}</div>
          </div>`).join('')}
        <div class="comparador-sinopsis-row">
          <div><div class="comparador-sinopsis-label">${_escHtml(comparadorA.title)}</div><div class="comparador-sinopsis-texto">${_escHtml(comparadorA.overview||'Sin sinopsis disponible.')}</div></div>
          <div><div class="comparador-sinopsis-label">${_escHtml(comparadorB.title)}</div><div class="comparador-sinopsis-texto">${_escHtml(comparadorB.overview||'Sin sinopsis disponible.')}</div></div>
        </div>
        ${comunes.length?`<div class="progreso-temporadas-texto" style="text-align:center;margin-top:12px">🎭 Reparto en común: ${comunes.join(', ')}</div>`:''}
        <div class="cta-btn cta-sec" style="margin-top:16px" onclick="reiniciarComparador()">🔄 Comparar otros dos</div>
      `;
    }
    function reiniciarComparador(){
      comparadorA = null; comparadorB = null;
      renderComparadorSlots();
      document.getElementById('comparador-tabla').innerHTML = '';
      cerrarBusquedaComparador();
    }

    // ── PARA TI ──
    // Semillas: lo que más te ha gustado, por tu nota y por tu ranking (S y A pesan más), elegidas al azar según su peso.
    // De cada semilla salen como mucho 3 recomendaciones de TMDB, solo bien valoradas y con votos suficientes,
    // y se ordenan según tu perfil de gusto (con algo de azar para que «Ver otras» varíe).
    const PT_PESO_NIVEL = {S:5, A:4, B:2.5};
    const PT_PESO_NOTA = n => n>=10 ? 4 : n>=9 ? 3.5 : n>=8 ? 2.5 : n>=7 ? 1.5 : 0;
    // Candidatos «Para ti» de un tipo: recomendaciones de TMDB a partir de semillas elegidas según tus notas y tu ranking
    async function _candidatosParaTi(tipo, {nSemillas=5, maxPorSemilla=3, conHistorial=true}={}){
      const { data: toda, error } = await sb.from('mi_biblioteca').select('tmdb_id,tipo,titulo,visto,puntuacion').eq('user_id', sesionActual.user.id);
      if(error || !toda) return null;
      const yaConocidos = new Set(toda.map(x=>`${x.tmdb_id}-${x.tipo}`));
      // nivel de cada título en tu ranking
      const nivelDe = {}; const rk = rankingLeer();
      Object.keys(PT_PESO_NIVEL).forEach(n=>(rk[n]||[]).forEach(k=>{ nivelDe[k] = n; }));
      const semillas = toda.filter(x=>x.visto && x.tipo===tipo).map(x=>{
        const nivel = nivelDe[`${x.tipo}:${x.tmdb_id}`];
        return {...x, nivel, peso: Math.max(PT_PESO_NIVEL[nivel]||0, PT_PESO_NOTA(Number(x.puntuacion)||0))};
      }).filter(x=>x.peso>0);
      if(!semillas.length) return [];
      // semillas al azar, con más probabilidad cuanto más te gustó (sin repetir)
      const elegidas = [], bolsa = semillas.slice();
      while(elegidas.length<nSemillas && bolsa.length){
        let r = Math.random() * bolsa.reduce((t,x)=>t+x.peso, 0);
        const i = bolsa.findIndex(x=>(r -= x.peso) <= 0);
        elegidas.push(bolsa.splice(i<0 ? bolsa.length-1 : i, 1)[0]);
      }
      const historial = new Set(conHistorial ? (window._paraTiHistorial[tipo]||[]) : []);
      const perfil = _cargarPerfilGustoCache();
      const porSemilla = await Promise.all(elegidas.map(async sem=>{
        const pagina = Math.floor(Math.random()*2)+1; // página 1 o 2, para no pedir siempre lo mismo
        let res = [];
        try{ res = (await _tmdbJson(`/${tipo}/${sem.tmdb_id}/recommendations&language=es-ES&page=${pagina}`)).results || []; }catch(e){}
        return res.filter(x=>x.poster_path && (x.vote_average||0)>=6.5 && (x.vote_count||0)>=150 && !yaConocidos.has(`${x.id}-${tipo}`) && !esOculta(x.id, tipo))
          .map(x=>({...x, _tipo:tipo, title:x.title||x.name, release_date:x.release_date||x.first_air_date, _porque:sem.titulo}));
      }));
      // como mucho 3 por semilla, primero las que aún no te hemos enseñado, ordenadas por tu gusto
      const usados = new Set(), candidatos = [];
      porSemilla.forEach(lista=>{
        const nuevas = lista.filter(x=>!historial.has(`${x.id}-${tipo}`)), viejas = lista.filter(x=>historial.has(`${x.id}-${tipo}`));
        [...nuevas.sort((a,b)=>_puntuarPorGusto(b,perfil)-_puntuarPorGusto(a,perfil)), ...viejas]
          .filter(x=>!usados.has(x.id)).slice(0,maxPorSemilla).forEach(x=>{ usados.add(x.id); candidatos.push(x); });
      });
      // lo que se parece a lo que has descartado («No me interesa») baja posiciones
      const rech = _generosRechazados();
      const pen = x => rech.size && (x.genre_ids||[]).some(g=>rech.has(g)) ? 0.15 : 0;
      return candidatos.sort((a,b)=>(_puntuarPorGusto(b,perfil)-pen(b))-(_puntuarPorGusto(a,perfil)-pen(a)));
    }
    async function refrescarParaTi(tipo){
      const wrapId = tipo==='movie' ? 'para-ti-pelis-wrap' : 'para-ti-series-wrap';
      const scrollId = tipo==='movie' ? 'para-ti-pelis-scroll' : 'para-ti-series-scroll';
      const subWrap = document.getElementById(wrapId);
      if(!sesionActual){ subWrap.style.display='none'; return; }
      const candidatos = await _candidatosParaTi(tipo);
      if(!candidatos){ subWrap.style.display='none'; return; }
      const lista = candidatos.slice(0,12);
      _marcarMostradosParaTi(tipo, lista);
      if(!lista.length){ subWrap.style.display='none'; return; }
      window[tipo==='movie'?'paraTiPelisActual':'paraTiSeriesActual'] = lista;
      document.getElementById(scrollId).innerHTML = lista.map((p,i)=>`
        <div class="similar-card" onclick="abrirDetalleDesdeParaTi('${tipo}',${i})" ${_lp({id:p.id,tipo,t:p.title,poster:p.poster_path,f:p.release_date})}>
          <img loading="lazy" src="${p.poster_path?'https://image.tmdb.org/t/p/w200'+p.poster_path:''}" alt="${_escHtml(p.title)}">
          <div class="similar-titulo">${_escHtml(p.title)}</div>
          <div class="similar-meta">${p.release_date?p.release_date.substring(0,4):''} · ★${p.vote_average?p.vote_average.toFixed(1):'-'}</div>
          <div class="para-ti-porque" title="Porque te gustó ${_escHtml(p._porque)}"><span>♥</span> ${_escHtml(p._porque)}</div>
        </div>`).join('');
      subWrap.style.display='block';
      document.getElementById('para-ti-wrap').style.display='block';
    }
    // El perfil de gusto (géneros y épocas favoritos) se calcula solo, en segundo plano y una vez,
    // para que «Para ti» lo use sin tener que abrir antes la pantalla «Perfil de gusto».
    let _perfilAutoLanzado = false;
    function _perfilGustoEnSegundoPlano(){
      if(_perfilAutoLanzado || !sesionActual || !_usarPerfilDeGusto()) return;
      _perfilAutoLanzado = true;
      setTimeout(()=>{ construirPerfilGusto(false).then(()=>cargarLogroDestacado()).catch(()=>{ _perfilAutoLanzado = false; }); }, 6000);
    }
    async function abrirDetalleDesdeParaTi(tipo,i){
      const arr = tipo==='movie' ? window.paraTiPelisActual : window.paraTiSeriesActual;
      await abrirDetalle(arr[i]);
    }

    // ── ESTADÍSTICAS DE BIBLIOTECA ───────────────────────────────────────

    // ── SCROLL HORIZONTAL CÓMODO EN PC (flechas + arrastre + rueda) ─────
    function scrollCarrusel(id, dir){
      const el = document.getElementById(id);
      if(el) el.scrollBy({ left: dir * Math.round(el.clientWidth*0.8), behavior:'smooth' });
    }
    function habilitarDragScroll(id){
      const el = document.getElementById(id);
      if(!el || el._dragEnabled) return;
      el._dragEnabled = true;
      el.style.cursor = 'grab';
      let down=false, startX=0, startScroll=0;
      el.addEventListener('mousedown', e=>{ down=true; el.style.cursor='grabbing'; startX=e.pageX; startScroll=el.scrollLeft; });
      window.addEventListener('mouseup', ()=>{ down=false; el.style.cursor='grab'; });
      el.addEventListener('mousemove', e=>{ if(!down) return; e.preventDefault(); el.scrollLeft = startScroll-(e.pageX-startX); });
      el.addEventListener('wheel', e=>{
        if(Math.abs(e.deltaY)>Math.abs(e.deltaX)){ el.scrollLeft += e.deltaY; e.preventDefault(); }
      }, { passive:false });
    }
