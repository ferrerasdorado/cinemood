// CineMood · Mis colecciones y «En curso»
// (Parte de index.html; se carga como script clásico: todo comparte el mismo ámbito global.)

    // ══ MIS COLECCIONES (listas propias tipo playlist) ═══════════════════
    // Se guardan en el dispositivo y, si existe la tabla mis_listas en Supabase, también en la nube.
    const COL_LS = 'cm:colecciones';
    const COL_EMOJIS = ['🎬','🍿','❤️','🔥','🌙','👻','🚀','🧠','⭐','🎄'];
    function _escHtml(s){ return String(s==null?'':s).replace(/[&<>"']/g, ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
    function colLeer(){
      try{ const a = JSON.parse(localStorage.getItem(COL_LS)||'[]'); return Array.isArray(a) ? a.filter(x=>x && x.id && typeof x.nombre==='string' && Array.isArray(x.items)) : []; }
      catch(e){ return []; }
    }   // true: sincronizado · false: solo en el dispositivo
    function colGuardarLocal(){ try{ localStorage.setItem(COL_LS, JSON.stringify(window.misColecciones)); }catch(e){} }
    async function colSync(){
      if(!sesionActual){ window._colNube = false; return; }
      try{
        const uid = sesionActual.user.id;
        const {data, error} = await sb.from('mis_listas').select('id,nombre,emoji,items').eq('user_id', uid).order('creado_en', {ascending:true});
        if(error) throw error;
        const pendientes = window.misColecciones.filter(x=>String(x.id).startsWith('local-'));
        const remotas = (data||[]).filter(r=>r && r.id && typeof r.nombre==='string' && r.nombre.trim()).map(r=>({id:r.id, nombre:r.nombre, emoji:r.emoji||'🎬', items:Array.isArray(r.items)?r.items.filter(x=>x && x.id && (x.tipo==='movie'||x.tipo==='tv')):[]}));
        for(const p of pendientes){
          const {data:ins, error:e2} = await sb.from('mis_listas').insert({user_id:uid, nombre:p.nombre, emoji:p.emoji, items:p.items}).select('id').single();
          remotas.push(e2 || !ins ? p : {...p, id:ins.id});
        }
        window.misColecciones = remotas;
        window._colNube = true;
        colGuardarLocal();
      }catch(e){ window._colNube = false; }
    }
    async function colPersistir(col){
      colGuardarLocal();
      if(!sesionActual || window._colNube === false) return;
      try{
        if(String(col.id).startsWith('local-')){
          const {data, error} = await sb.from('mis_listas').insert({user_id:sesionActual.user.id, nombre:col.nombre, emoji:col.emoji, items:col.items}).select('id').single();
          if(error) throw error;
          const viejo = col.id; col.id = data.id; colGuardarLocal();
          const mo = colOrdenLeer(); if(mo[viejo]){ mo[col.id] = mo[viejo]; delete mo[viejo]; colOrdenGuardar(mo); }
          if(window.especialActual && window.especialActual.colId===viejo) window.especialActual.colId = col.id;
        } else {
          const {error} = await sb.from('mis_listas').update({nombre:col.nombre, emoji:col.emoji, items:col.items, actualizado_en:new Date().toISOString()}).eq('id', col.id);
          if(error) throw error;
        }
      }catch(e){ window._colNube = false; }
    }
    function _colPorId(id){ return (window.misColecciones||[]).find(x=>String(x.id)===String(id)); }
    // Convierte una colección en un "especial" para reutilizar la línea temporal, vistos, tiempo y Sorpréndeme
    // ── Orden de cada colección: manual · estreno · historia (se guarda en el dispositivo y en tu cuenta) ──
    const COL_ORDEN_LS = 'cm:colOrden';
    function colOrdenLeer(){ try{ const o = JSON.parse(localStorage.getItem(COL_ORDEN_LS)||'{}'); return (o && typeof o==='object') ? o : {}; }catch(e){ return {}; } }
    let _colOrdenT = null;
    function colOrdenGuardar(m){
      try{ localStorage.setItem(COL_ORDEN_LS, JSON.stringify(m)); }catch(e){}
      if(!sesionActual) return;
      clearTimeout(_colOrdenT);
      _colOrdenT = setTimeout(async ()=>{ try{ await sb.auth.updateUser({ data: { cm_col_orden: m } }); }catch(e){} }, 600);
    }
    function colOrdenDesdeCuenta(){
      const r = sesionActual && sesionActual.user && sesionActual.user.user_metadata && sesionActual.user.user_metadata.cm_col_orden;
      if(r && typeof r==='object'){ try{ localStorage.setItem(COL_ORDEN_LS, JSON.stringify({...colOrdenLeer(), ...r})); }catch(e){} }
    }
    function colOrdenDe(colId){ const m = colOrdenLeer()[colId]; return (m==='estreno'||m==='historia') ? m : 'manual'; }
    function colCambiarOrden(modo){
      const esp = window.especialActual; if(!esp || !esp.esColeccion) return;
      const m = colOrdenLeer(); m[esp.colId] = modo; colOrdenGuardar(m);
      abrirEspecial('col-'+esp.colId);
    }
    // Índice de cronología de las sagas que conozco (especiales de tipo saga)
    let _cronoIndice = null;
    function _cronologiaSagas(){
      if(_cronoIndice) return _cronoIndice;
      _cronoIndice = ESPECIALES.filter(e=>e.categoria==='saga').map(e=>({esp:e, eras:_tlCalcularEras(e)}));
      return _cronoIndice;
    }
    // ¿En qué posición de qué saga está este título? (por ID ya resuelto o, si no, por título y año)
    function _posicionesEnSagas(x){
      const res = [];
      const tn = normalizarTitulo(x.t);
      _cronologiaSagas().forEach(({esp, eras})=>{
        esp.items.forEach((it,k)=>{
          if(it.tipo!==x.tipo) return;
          const r = window.especialIdsResueltos && window.especialIdsResueltos[_claveIdResuelto(it)];
          const mismoId = (it.tmdb_id && it.tmdb_id===x.id) || (r && r.id===x.id);
          const mismoTitulo = normalizarTitulo(it.t)===tn && (!x.y || !it.y || Math.abs(it.y - x.y)<=1);
          if(mismoId || mismoTitulo) res.push({esp, k, er:eras[k], it});
        });
      });
      return res;
    }
    function _fechaClave(x){ return x.f || (x.y ? `${x.y}-12-31` : '9999-12-31'); }
    // Convierte una colección en un "especial" para reutilizar la línea temporal, vistos, tiempo y Sorpréndeme
    function _espDesdeColeccion(id){
      if(!String(id).startsWith('col-')) return null;
      const col = _colPorId(String(id).slice(4)); if(!col) return null;
      const n = col.items.length;
      const orden = colOrdenDe(col.id);
      let filas = col.items.map((x,ci)=>({x, ci}));
      let items;
      if(orden==='estreno'){
        filas.sort((a,b)=>_fechaClave(a.x).localeCompare(_fechaClave(b.x)) || a.ci-b.ci);
        items = filas.map(({x,ci},i)=>({n:i+1, _ci:ci, t:x.t, y:x.y, tipo:x.tipo, tmdb_id:x.id, tag:'', p:''}));
      } else if(orden==='historia'){
        // Cada título se asigna a la saga que más títulos tiene en esta colección; las sagas van en el orden en que aparecen
        const pos = filas.map(f=>({...f, cand:_posicionesEnSagas(f.x)}));
        const peso = {}; pos.forEach(p=>p.cand.forEach(c=>{ peso[c.esp.id] = (peso[c.esp.id]||0)+1; }));
        pos.forEach(p=>{ p.m = p.cand.sort((a,b)=>(peso[b.esp.id]-peso[a.esp.id]))[0] || null; });
        const ordenSagas = []; pos.forEach(p=>{ if(p.m && !ordenSagas.includes(p.m.esp.id)) ordenSagas.push(p.m.esp.id); });
        const conSaga = pos.filter(p=>p.m).sort((a,b)=>(ordenSagas.indexOf(a.m.esp.id)-ordenSagas.indexOf(b.m.esp.id)) || (a.m.k-b.m.k));
        const sinSaga = pos.filter(p=>!p.m).sort((a,b)=>_fechaClave(a.x).localeCompare(_fechaClave(b.x)) || a.ci-b.ci);
        let sagaPrev = null;
        items = conSaga.map((p,i)=>{
          const er = p.m.er || {};
          const era = er.era || String(p.m.it.y || p.x.y || '');
          const primeraDeSaga = p.m.esp.id !== sagaPrev; sagaPrev = p.m.esp.id;
          return {n:i+1, _ci:p.ci, era, eraCap: primeraDeSaga ? p.m.esp.titulo : (er.cap||''), nota: er.nota||'', t:p.x.t, y:p.x.y, tipo:p.x.tipo, tmdb_id:p.x.id, tag:'', p:''};
        });
        sinSaga.forEach((p,j)=>{
          items.push({n:items.length+1, _ci:p.ci, era: p.x.y ? String(p.x.y) : 'Sin fecha', eraCap: j===0 ? 'Fuera de las sagas · por estreno' : '', nota:'', t:p.x.t, y:p.x.y, tipo:p.x.tipo, tmdb_id:p.x.id, tag:'', p:''});
        });
      } else {
        items = filas.map(({x,ci},i)=>({n:i+1, _ci:ci, t:x.t, y:x.y, tipo:x.tipo, tmdb_id:x.id, tag:'', p:''}));
      }
      const subOrden = {manual:'en tu orden', estreno:'por fecha de estreno', historia:'por cronología de la historia'}[orden];
      return {
        id, categoria:'coleccion', esColeccion:true, colId:col.id, ordenCol:orden,
        emoji:col.emoji, icono:col.emoji, titulo:_escHtml(col.nombre),
        sub:`${n} ${n===1?'título':'títulos'} · tu colección`,
        color:'#b52c29', colorBg:'#2a1614', colorSoft:'#f2a69f',
        fondo: (col.items.find(x=>x.poster)||{}).poster || null,
        bannerTitulo:`<span>${_escHtml(col.nombre)}</span>`,
        bannerSub: !n ? 'Aún está vacía. Añade títulos desde la ficha de cualquier película o serie con el botón «Colección».'
          : orden==='manual' ? 'Tu colección, en el orden que tú decidas. Reordénala con las flechas o quita títulos.'
          : orden==='estreno' ? 'Ordenada automáticamente por fecha de estreno.'
          : 'Ordenada por la cronología interna de cada saga que conozco (UCM, Star Wars, X-Men…). Lo que no pertenece a ninguna va al final, por estreno.',
        subOrden,
        items
      };
    }
    let _colFechaT = null;
    function _colRellenarFecha(colId, tipo, id, fecha){
      const col = _colPorId(colId); if(!col) return;
      const x = col.items.find(z=>z.id===id && z.tipo===tipo);
      if(!x || x.f) return;
      x.f = fecha;
      clearTimeout(_colFechaT);
      _colFechaT = setTimeout(()=>{
        colPersistir(col);
        // si está ordenada por estreno, recolocar con las fechas exactas
        if(window.especialActual && window.especialActual.colId===col.id && window.especialActual.ordenCol==='estreno') _colReabrir();
      }, 900);
    }
    function _colReabrir(){
      const esp = window.especialActual; if(!esp || !esp.esColeccion) return;
      const y = window.scrollY;
      abrirEspecial('col-'+esp.colId);
      window.scrollTo(0, y);
    }
    function colMover(i, dir){
      const esp = window.especialActual; if(!esp) return;
      const col = _colPorId(esp.colId); if(!col) return;
      const j = i+dir; if(j<0 || j>=col.items.length) return;
      [col.items[i], col.items[j]] = [col.items[j], col.items[i]];
      colPersistir(col); _colReabrir();
    }
    function colQuitarDeEspecial(i){
      const esp = window.especialActual; if(!esp) return;
      const col = _colPorId(esp.colId); if(!col) return;
      const ci = (esp.items[i] && esp.items[i]._ci!=null) ? esp.items[i]._ci : i;
      col.items.splice(ci,1);
      colPersistir(col); _colReabrir();
    }
    // ── Ventana: añadir desde la ficha · crear · editar ──
    let _colModo = 'anadir', _colEditando = null, _colEmoji = '🎬';
    function _colEnFicha(col){ const p = peliculaActual; return !!(p && col.items.some(x=>x.id===p.id && x.tipo===p._tipo)); }
    function colActualizarBotonFicha(){
      const b = document.getElementById('btn-coleccion'); if(!b) return;
      const n = (window.misColecciones||[]).filter(_colEnFicha).length;
      b.classList.toggle('active', n>0);
      b.innerHTML = `<span>${n?'✔️':'📋'}</span><span>${n?(n===1?'En colección':`En ${n}`):'Colección'}</span>`;
    }
    function _colPintarEmojis(){
      document.getElementById('col-ov-emojis').innerHTML = COL_EMOJIS.map(e=>`<button type="button" class="col-emoji${e===_colEmoji?' activo':''}" onclick="_colEmoji='${e}';_colPintarEmojis()">${e}</button>`).join('');
    }
    function _colPintarLista(){
      const cont = document.getElementById('col-ov-lista');
      if(_colModo!=='anadir'){ cont.innerHTML=''; return; }
      const cols = window.misColecciones||[];
      cont.innerHTML = cols.length ? cols.map(col=>{
        const dentro = _colEnFicha(col);
        return `<button type="button" class="col-ov-fila${dentro?' dentro':''}" onclick="colToggleEnFicha('${col.id}')"><span class="col-ov-emoji">${col.emoji}</span><span class="col-ov-nombre">${_escHtml(col.nombre)}<small>${col.items.length} ${col.items.length===1?'título':'títulos'}</small></span><span class="col-ov-check">${dentro?'✓':'+'}</span></button>`;
      }).join('') : `<div class="col-ov-vacio">Aún no tienes colecciones. Crea la primera aquí abajo.</div>`;
    }
    function abrirColOverlay(modo, colId){
      _colModo = modo; _colEditando = colId ? _colPorId(colId) : null;
      document.getElementById('col-ov-error').textContent = '';
      const titulo = document.getElementById('col-ov-titulo');
      const nombre = document.getElementById('col-ov-nombre');
      if(modo==='anadir'){
        if(!peliculaActual) return;
        document.getElementById('col-ov-cabecera').textContent = 'Añadir a una colección';
        titulo.textContent = peliculaActual.title || '';
        titulo.style.display = '';
        document.getElementById('col-ov-label').textContent = 'O crea una nueva';
        document.getElementById('col-ov-boton').textContent = 'Crear y añadir';
        nombre.value = ''; _colEmoji = '🎬';
      } else if(modo==='crear'){
        document.getElementById('col-ov-cabecera').textContent = 'Nueva colección';
        titulo.style.display = 'none';
        document.getElementById('col-ov-label').textContent = 'Nombre';
        document.getElementById('col-ov-boton').textContent = 'Crear colección';
        nombre.value = ''; _colEmoji = '🎬';
      } else {
        if(!_colEditando) return;
        document.getElementById('col-ov-cabecera').textContent = 'Editar colección';
        titulo.style.display = 'none';
        document.getElementById('col-ov-label').textContent = 'Nombre';
        document.getElementById('col-ov-boton').textContent = 'Guardar cambios';
        nombre.value = _colEditando.nombre; _colEmoji = _colEditando.emoji || '🎬';
      }
      document.getElementById('col-ov-borrar').style.display = modo==='editar' ? '' : 'none';
      _colPintarLista(); _colPintarEmojis();
      document.getElementById('col-overlay').style.display = 'flex';
    }
    function cerrarColOverlay(){ document.getElementById('col-overlay').style.display = 'none'; }
    function colToggleEnFicha(colId){
      const col = _colPorId(colId); const p = peliculaActual; if(!col || !p) return;
      const k = col.items.findIndex(x=>x.id===p.id && x.tipo===p._tipo);
      if(k>=0) col.items.splice(k,1);
      else col.items.push({id:p.id, tipo:p._tipo, t:p.title||'', y:(p.release_date||'').slice(0,4)*1||null, f:p.release_date||null, poster:p.poster_path||null});
      colPersistir(col); _colPintarLista(); colActualizarBotonFicha();
    }
    async function colConfirmarForm(){
      const nombre = document.getElementById('col-ov-nombre').value.trim().slice(0,60);
      if(!nombre){ document.getElementById('col-ov-error').textContent = 'Ponle un nombre a la colección.'; document.getElementById('col-ov-nombre').focus(); return; }
      if(_colModo==='editar' && _colEditando){
        _colEditando.nombre = nombre; _colEditando.emoji = _colEmoji;
        await colPersistir(_colEditando); cerrarColOverlay();
        if(window.especialActual && window.especialActual.colId===_colEditando.id) _colReabrir();
        renderEspecialesTiles(); return;
      }
      const col = {id:'local-'+Date.now().toString(36), nombre, emoji:_colEmoji, items:[]};
      const p = peliculaActual;
      if(_colModo==='anadir' && p) col.items.push({id:p.id, tipo:p._tipo, t:p.title||'', y:(p.release_date||'').slice(0,4)*1||null, f:p.release_date||null, poster:p.poster_path||null});
      window.misColecciones.push(col);
      await colPersistir(col);
      if(_colModo==='anadir'){ document.getElementById('col-ov-nombre').value=''; _colPintarLista(); colActualizarBotonFicha(); }
      else { cerrarColOverlay(); renderEspecialesTiles(); }
    }
    async function colBorrarActual(){
      const col = _colEditando; if(!col) return;
      if(!(await _confirmar(`¿Borrar la colección «${col.nombre}»? Los títulos no se borran de tu lista.`, {aceptar:'Borrar', peligro:true}))) return;
      window.misColecciones = window.misColecciones.filter(x=>x!==col);
      colGuardarLocal();
      if(sesionActual && window._colNube !== false && !String(col.id).startsWith('local-')){
        try{ const {error} = await sb.from('mis_listas').delete().eq('id', col.id); if(error) throw error; }catch(e){ window._colNube = false; }
      }
      cerrarColOverlay();
      irA('p-especiales-hub'); renderEspecialesTiles();
    }

    // ══ "EN CURSO": decisión manual (📌 añadir · ✕ quitar) + detección automática ══
    // Lo que añades sale siempre y primero; lo que quitas no vuelve a salir solo.
    // Se guarda en el dispositivo y en tu cuenta (metadatos del usuario de Supabase), sin tablas nuevas.
    const EN_CURSO_LS = 'cm:enCursoManual';
    function enCursoManualLeer(){
      try{ const o = JSON.parse(localStorage.getItem(EN_CURSO_LS)||'{}');
        return {fijados: Array.isArray(o.fijados)?o.fijados.filter(x=>typeof x==='string'):[], quitados: Array.isArray(o.quitados)?o.quitados.filter(x=>typeof x==='string'):[]}; }
      catch(e){ return {fijados:[], quitados:[]}; }
    }
    let _enCursoSyncT = null;
    function enCursoManualGuardar(m){
      try{ localStorage.setItem(EN_CURSO_LS, JSON.stringify(m)); }catch(e){}
      if(!sesionActual) return;
      clearTimeout(_enCursoSyncT);
      _enCursoSyncT = setTimeout(async ()=>{ try{ await sb.auth.updateUser({ data: { cm_en_curso: m } }); }catch(e){} }, 600);
    }
    // Al iniciar sesión: lo guardado en la cuenta manda (así se ve igual en todos tus dispositivos)
    function enCursoDesdeCuenta(){
      const r = sesionActual && sesionActual.user && sesionActual.user.user_metadata && sesionActual.user.user_metadata.cm_en_curso;
      if(r && (Array.isArray(r.fijados) || Array.isArray(r.quitados))){
        try{ localStorage.setItem(EN_CURSO_LS, JSON.stringify({fijados:r.fijados||[], quitados:r.quitados||[]})); }catch(e){}
      } else if(sesionActual){
        const m = enCursoManualLeer(); if(m.fijados.length || m.quitados.length) enCursoManualGuardar(m);
      }
    }
    function calcularEnCurso(contarVistos){
      const man = enCursoManualLeer();
      const fijados = man.fijados.map(id=>ESPECIALES.find(e=>e.id===id)).filter(e=>e && _espVisible(e));
      const abiertos = _espAbiertosLeer();
      const auto = ESPECIALES.filter(e=>_espVisible(e) && !man.fijados.includes(e.id) && !man.quitados.includes(e.id))
        .map(e=>({e, v:contarVistos(e), ts:abiertos[e.id]||0}))
        .filter(x=>x.v>0 && x.v<x.e.items.length && (x.e.categoria==='saga' || x.v>=2 || x.ts))
        .sort((a,b)=>(b.ts-a.ts) || (b.v-a.v))
        .slice(0,6)
        .map(x=>x.e);
      return [...fijados, ...auto];
    }
    function enCursoQuitar(id){
      const m = enCursoManualLeer();
      m.fijados = m.fijados.filter(x=>x!==id);
      if(!m.quitados.includes(id)) m.quitados.push(id);
      enCursoManualGuardar(m);
      renderEspecialesTiles(); _enCursoPintarBoton();
    }
    function enCursoAnadir(id){
      const m = enCursoManualLeer();
      m.quitados = m.quitados.filter(x=>x!==id);
      m.fijados = [id, ...m.fijados.filter(x=>x!==id)];   // el último añadido, primero
      enCursoManualGuardar(m);
      renderEspecialesTiles(); _enCursoPintarBoton();
    }
    function enCursoAlternarActual(){
      const esp = window.especialActual; if(!esp || esp.esColeccion) return;
      if(window._enCursoIds && window._enCursoIds.has(esp.id)) enCursoQuitar(esp.id); else enCursoAnadir(esp.id);
    }
    function _enCursoPintarBoton(){
      const b = document.getElementById('esp-encurso-btn'); const esp = window.especialActual;
      if(!b || !esp) return;
      const dentro = !!(window._enCursoIds && window._enCursoIds.has(esp.id));
      b.classList.toggle('encurso-activo', dentro);
      b.innerHTML = dentro ? '✓ En curso · <u>Quitar</u>' : '📌 Añadir a «En curso»';
    }

    const ESP_ABIERTOS_LS = 'cm:espAbiertos';
    function _espAbiertosLeer(){ try{ const o = JSON.parse(localStorage.getItem(ESP_ABIERTOS_LS)||'{}'); return (o && typeof o==='object') ? o : {}; }catch(e){ return {}; } }
    function _espMarcarAbierto(id){ try{ const o = _espAbiertosLeer(); o[id] = Date.now(); localStorage.setItem(ESP_ABIERTOS_LS, JSON.stringify(o)); }catch(e){} }
    async function abrirEspecial(id){
      window._origenEspecial = null;
      let esp = ESPECIALES.find(e=>e.id===id) || _espDesdeColeccion(id);
      if(esp && !esp.esColeccion) _espMarcarAbierto(esp.id);
      if(!esp) return;
      const turno = window._espTurno = (window._espTurno||0)+1;
      if(!esp.esColeccion){
        const vista = _espVistaLeer()[esp.id] || {};
        const completa = !!esp.personas && vista.lista==='completa';
        if(esp.dinamico || completa){
          _pintarEspecialCargando(esp, false);
          try{
            const items = await _espCargarGenerado(completa ? 'film:'+esp.id : esp.id, ()=>completa ? _espFilmografia(esp) : esp.dinamico());
            if(turno!==window._espTurno) return;
            esp = completa
              ? {...esp, items, listaVista:'completa', sub:`${items.length} películas · filmografía al día`,
                 bannerSub:'Todas sus películas como director según TMDB, también las que están por estrenar. Se actualiza sola.'}
              : _espFiltrarTipo({...esp, items}, esp.soloPeliculas ? 'todo' : vista.tipo);
          }catch(e){
            if(turno===window._espTurno) _pintarEspecialCargando(esp, true);
            return;
          }
        }
        if(esp.cronologico && vista.orden==='estreno') esp = _espEnOrdenEstreno(esp);
      }
      _pintarEspecial(esp);
    }
    // Listas de «Al día»: rejilla de pósters. No son rutas para ver en orden, así que no llevan línea temporal.
    function _pintarRejillaEspecial(esp){
      const lista = document.getElementById('especial-lista');
      lista.className = 'filmografia-grid esp-rejilla';
      ['tl-filtros','tl-tiempo','tl-siguiente'].forEach(id=>{ const el = document.getElementById(id); el.style.display = 'none'; el.innerHTML = ''; });
      document.getElementById('tl-era-flotante').classList.remove('on');
      window.tlSiguiente = null;
      const idsSet = window.idsVistosSet || new Set();
      lista.innerHTML = esp.items.map((it,i)=>{
        // Los datos ya vienen de TMDB: se dejan listos para abrir la ficha sin otra petición
        window.especialTmdbCache[i] = {id:it.tmdb_id, _tipo:it.tipo, title:it.t, poster_path:it.poster||null, release_date:it.f, vote_average:it.voto, overview:it.p};
        const meta = [it.y, esp.soloPeliculas ? '' : (it.tipo==='tv' ? 'Serie' : 'Película'), it.voto ? '★ '+it.voto.toFixed(1) : ''].filter(Boolean).join(' · ');
        return `<div class="film-card" onclick="abrirDetalleDesdeEspecial(${i})" ${_lp({id:it.tmdb_id,tipo:it.tipo,t:it.t,poster:it.poster,f:it.f})}>
          <div class="esp-rejilla-poster">
            ${it.poster ? `<img loading="lazy" src="https://image.tmdb.org/t/p/w342${it.poster}" alt="${_escHtml(it.t)}">` : ''}
            ${esp.ranking ? `<span class="esp-rejilla-puesto">${i+1}</span>` : ''}
            ${idsSet.has(`${it.tmdb_id}-${it.tipo}`) ? '<span class="esp-rejilla-visto" title="Vista">✓</span>' : ''}
          </div>
          <div class="film-card-info"><div class="film-card-titulo">${_escHtml(it.t)}</div><div class="film-card-meta">${_escHtml(meta)}</div></div>
        </div>`;
      }).join('');
      irA('p-especial');
    }
    function _pintarEspecialCargando(esp, error){
      window.especialActual = {...esp, items:[]};
      document.getElementById('esp-titulo-header').textContent = esp.titulo;
      const root = document.getElementById('p-especial');
      root.style.setProperty('--esp-color', esp.color||'#b52c29');
      root.style.setProperty('--esp-color-bg', esp.colorBg||'#1a1230');
      root.style.setProperty('--esp-color-soft', esp.colorSoft||'#f2a69f');
      document.getElementById('esp-banner').innerHTML = `
        <div class="especial-banner-titulo">${esp.bannerTitulo}</div>
        <div class="especial-banner-sub">${esp.bannerSub}</div>
        <div class="especial-tile-badge">${error ? 'No se pudo cargar la lista' : 'Cargando desde TMDB…'}</div>
        ${error ? `<div class="cta-btn cta-sec" style="margin-top:14px" onclick="${esp.categoria==='tema' ? 'irA(\'p-detalle\', true)' : `abrirEspecial('${esp.id}')`}">${esp.categoria==='tema' ? 'Volver a la ficha' : 'Reintentar'}</div>` : ''}`;
      document.getElementById('especial-lista').innerHTML = '';
      const filtros = document.getElementById('tl-filtros'); filtros.innerHTML = ''; filtros.style.display = 'none';
      irA('p-especial');
    }
    function _pintarEspecial(esp){
      window.especialActual = esp;
      window.especialTmdbCache = {};
      window._duracionesListas = false;
      document.getElementById('esp-titulo-header').textContent = esp.titulo;
      const root = document.getElementById('p-especial');
      root.style.setProperty('--esp-color', esp.color||'#b52c29');
      root.style.setProperty('--esp-color-bg', esp.colorBg||'#1a1230');
      root.style.setProperty('--esp-color-soft', esp.colorSoft||'#f2a69f');
      document.getElementById('esp-banner').innerHTML = `
        <div class="especial-banner-titulo">${esp.bannerTitulo}</div>
        <div class="especial-banner-sub">${esp.bannerSub}</div>
        <div class="especial-tile-badge">${esp.sub}</div>
        ${esp.items.some(x=>x.imp)?`<div class="imp-leyenda"><span><span class="imp-badge imp-c">Clave</span> imprescindible</span><span><span class="imp-badge imp-i">Importante</span> aporta contexto</span><span><span class="imp-badge imp-o">Opcional</span> se puede saltar</span></div>`:''}
        ${esp.items.length?`<div class="cta-btn cta-sec" id="esp-sorpresa-btn" style="margin-top:14px" onclick="sorprendemeEnEspecial()">🎲 Sorpréndeme con esta lista</div>`:''}
        ${esp.cronologico?`<div class="col-orden"><span class="col-orden-k">Orden</span>${[['cronologico','Cronológico'],['estreno','Estreno']].map(([k,l])=>`<button type="button" class="col-orden-b${(esp.ordenVista||'cronologico')===k?' activo':''}" onclick="espCambiarVista('orden','${k}')">${l}</button>`).join('')}</div>`:''}
        ${esp.dinamico && !esp.soloPeliculas && !esp.tipoFijo?`<div class="col-orden"><span class="col-orden-k">Ver</span>${[['todo','Todo'],['movie','Películas'],['tv','Series']].map(([k,l])=>`<button type="button" class="col-orden-b${(esp.tipoVista||'todo')===k?' activo':''}" onclick="espCambiarVista('tipo','${k}')">${l}</button>`).join('')}</div>`:''}
        ${esp.personas?`<div class="col-orden"><span class="col-orden-k">Lista</span>${[['seleccion','Comentada'],['completa','Completa y al día']].map(([k,l])=>`<button type="button" class="col-orden-b${(esp.listaVista||'seleccion')===k?' activo':''}" onclick="espCambiarVista('lista','${k}')">${l}</button>`).join('')}</div>`:''}
        ${esp.esColeccion && esp.items.length>1?`<div class="col-orden"><span class="col-orden-k">Orden</span>${[['manual','Manual'],['estreno','Estreno'],['historia','Historia']].map(([k,l])=>`<button type="button" class="col-orden-b${esp.ordenCol===k?' activo':''}" onclick="colCambiarOrden('${k}')">${l}</button>`).join('')}</div>`:''}
        ${esp.esColeccion?`<div class="cta-btn cta-sec" style="margin-top:10px" onclick="abrirColOverlay('editar','${esp.colId}')">✏️ Editar colección</div>`:esp.dinamico?'':`<div class="cta-btn cta-sec encurso-btn" id="esp-encurso-btn" style="margin-top:10px" onclick="enCursoAlternarActual()"></div>`}`;
      if(!esp.esColeccion){ renderEspecialesTiles(); if(!esp.dinamico) _enCursoPintarBoton(); }
      if(esp.dinamico){ _pintarRejillaEspecial(esp); return; }
      document.getElementById('especial-lista').className = 'timeline';
      const tieneImp = esp.items.some(x=>x.imp);
      const NOMBRE_IMP = {c:'Clave',i:'Importante',o:'Opcional'};
      const eras = _tlCalcularEras(esp);
      window.tlEras = eras;
      document.getElementById('especial-lista').innerHTML = `<div class="tl-track" id="tl-track"><div class="tl-fill" id="tl-fill"></div><div class="tl-head" id="tl-head"></div></div>` + esp.items.map((it,i)=>{
        const yaVista = window.vistosNormSet && window.vistosNormSet.has(`${normalizarTitulo(it.t)}|${it.tipo}`);
        const num = String(esp.ordenVista==='estreno' ? i+1 : it.n).padStart(2,'0');
        const er = eras[i];
        const tam = !er.era ? '' : er.era.length>9 ? ' tl-ano-s' : er.era.length>6 ? ' tl-ano-m' : '';
        const hito = er.hito ? `
        <div class="tl-hito tl-anim" data-era="${er.era}">
          <div class="tl-hito-marca"></div>
          <div class="tl-hito-txt"><div class="tl-hito-fila"><span class="tl-hito-ano${tam}">${er.era}</span><span class="tl-hito-linea"></span></div>${er.cap?`<span class="tl-hito-cap">${er.cap}</span>`:''}</div>
        </div>` : '';
        const stamp = er.nota ? `<div class="tl-stamp">${er.era?'':(esp.icono||'📍')+' '}${er.nota}</div>` : '';
        return hito + `
        <div class="tl-row tl-anim${yaVista?' tl-visto':''}" id="esp-row-${i}" data-idx="${i}" data-imp="${it.imp||''}" data-era="${er.era||''}">
          <div class="tl-node${it.imp?' tl-node-'+it.imp:''}" title="${it.imp?NOMBRE_IMP[it.imp]:''}"><span class="tl-num">${num}</span><span class="tl-check">✓</span></div>
          <div class="tl-content">
            ${stamp}
            <div class="especial-item-card" id="esp-item-${i}" onclick="abrirDetalleDesdeEspecial(${i})">
              <img loading="lazy" class="especial-item-poster skeleton" id="esp-poster-${i}" src="" alt="${_escHtml(it.t)}">
              <div class="especial-item-info">
                ${it.imp?`<div class="especial-item-badges"><span class="imp-badge imp-${it.imp}">${NOMBRE_IMP[it.imp]}</span></div>`:''}
                <div class="especial-item-titulo">${_escHtml(it.t)}</div>
                <div class="especial-item-meta" id="esp-meta-${i}">${it.y} · ${it.tipo==='tv'?'Serie':'Película'}</div>
                <div class="especial-item-porque${it.p?'':' desde-tmdb'}" id="esp-porque-${i}">${_escHtml(it.p||'')}</div>
                ${it.rel&&it.rel.length?`<div class="tl-rel-wrap" onclick="event.stopPropagation()">
                  <div class="tl-rel-toggle" onclick="this.parentNode.classList.toggle('abierto')"><span>🔗 Conexiones · ${it.rel.length}</span><span class="tl-rel-flecha">▾</span></div>
                  <div class="tl-rel-lista">
                    <div class="tl-rel-aviso">Puede adelantar quién vuelve a aparecer.</div>
                    ${it.rel.map(([n,tipo,txt])=>{ const d = n!=null ? esp.items.find(x=>x.n===n) : null; const etq = {c:'Continúa',a:'Reaparece',i:'Prepara',v:'Viene de'}[tipo];
                      return d ? `<div class="tl-rel tl-rel-link" onclick="saltarATituloTimeline(${n})"><span class="tl-rel-tipo tl-rel-${tipo}">${etq}</span><span class="tl-rel-cuerpo"><span class="tl-rel-titulo">${String(esp.ordenVista==='estreno' ? esp.items.indexOf(d)+1 : d.n).padStart(2,'0')} · ${_escHtml(d.t)}</span><span class="tl-rel-txt">${txt}</span></span><span class="tl-rel-ir">›</span></div>`
                               : `<div class="tl-rel"><span class="tl-rel-tipo tl-rel-${tipo}">${etq}</span><span class="tl-rel-cuerpo"><span class="tl-rel-txt">${txt}</span></span></div>`; }).join('')}
                  </div>
                </div>`:''}
                ${yaVista
                  ? `<div class="especial-visto-btn activo" id="esp-visto-${i}" onclick="event.stopPropagation();toggleVistoDesdeEspecial(${i})"><span>✅</span><span>Vista</span></div>`
                  : `<div class="especial-visto-btn" id="esp-visto-${i}" onclick="event.stopPropagation();toggleVistoDesdeEspecial(${i})"><span>⬜</span><span>Marcar vista</span></div>`}
                ${esp.esColeccion?`<div class="col-ctrl" onclick="event.stopPropagation()">${esp.ordenCol==='manual'?`<button type="button" onclick="colMover(${i},-1)" ${i===0?'disabled':''} aria-label="Subir">↑</button><button type="button" onclick="colMover(${i},1)" ${i===esp.items.length-1?'disabled':''} aria-label="Bajar">↓</button>`:''}<button type="button" class="col-ctrl-quitar" onclick="colQuitarDeEspecial(${i})">Quitar</button></div>`:''}
              </div>
            </div>
          </div>
        </div>`;
      }).join('');
      // Filtros de ruta (solo en listas clasificadas por importancia)
      const filtros = document.getElementById('tl-filtros');
      window.tlFiltro = 'todo';
      if(tieneImp){
        const nEsencial = esp.items.filter(x=>x.imp==='c'||x.imp==='i').length;
        const nClave = esp.items.filter(x=>x.imp==='c').length;
        filtros.innerHTML = `
          <div class="tl-filtros-label">Ruta</div>
          <div class="punt-row" style="margin-bottom:0">
            <div class="punt-chip tl-fchip active" data-f="todo" onclick="filtrarTimeline('todo')"><span class="tl-fpuntos"><i class="tl-p-c"></i><i class="tl-p-i"></i><i class="tl-p-o"></i></span><span class="tl-fnom">Completa</span><span class="tl-fnum">${esp.items.length} títulos</span></div>
            <div class="punt-chip tl-fchip" data-f="esencial" onclick="filtrarTimeline('esencial')"><span class="tl-fpuntos"><i class="tl-p-c"></i><i class="tl-p-i"></i></span><span class="tl-fnom">Sin opcionales</span><span class="tl-fnum">${nEsencial} títulos</span></div>
            <div class="punt-chip tl-fchip" data-f="clave" onclick="filtrarTimeline('clave')"><span class="tl-fpuntos"><i class="tl-p-c"></i></span><span class="tl-fnom">Solo claves</span><span class="tl-fnum">${nClave} títulos</span></div>
          </div>
          <div class="tl-filtros-desc" id="tl-filtros-desc"></div>`;
        filtros.style.display = 'block';
        filtrarTimeline(_espRuta(esp), true);
      } else { filtros.innerHTML = ''; filtros.style.display = 'none'; }
      _prepararAnimacionTimeline();
      actualizarTimeline();
      irA('p-especial');
      cargarPostersEspecial(esp);
    }
