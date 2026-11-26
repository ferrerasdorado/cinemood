// CineMood · NAS: enviar descargas (pop-up de series, modo NAS de «Ver», «Enviar al NAS») y «Mis descargas»
// (Parte de index.html; se carga como script clásico: todo comparte el mismo ámbito global.)

    // ── Hoja de fuentes ──

    let _nasEnviando = false;
    // Estados que significan «sigue en marcha»: si ya hay una solicitud así, no se repite
    const _NAS_ACTIVOS = ['pendiente','procesando','descargando'];

    // Aviso flotante de la app (en lugar de alert): admite varias líneas
    function _nasAviso(texto, esError){
      let t = document.getElementById('nas-aviso');
      if(!t){ t = document.createElement('div'); t.id = 'nas-aviso'; t.className = 'cm-deshacer nas-aviso'; t.setAttribute('role','status'); t.setAttribute('aria-live','polite'); document.body.appendChild(t); }
      t.classList.toggle('error', !!esError);
      t.replaceChildren(_fEl('span',{text:texto}), _fEl('button',{type:'button','aria-label':'Cerrar aviso',onclick:()=>t.classList.remove('on')},'✕'));
      clearTimeout(t._tm);
      t.classList.add('on');
      t._tm = setTimeout(()=>t.classList.remove('on'), esError ? 9000 : 5000);
    }

    async function solicitarDescargaNAS(){
      if(_nasEnviando) return;
      if(!sesionActual){ _nasAviso('Inicia sesión para enviar descargas al NAS.', true); return; }
      const p = peliculaActual; if(!p) return;
      // Películas: se abre la hoja de fuentes en «modo NAS» para elegir proveedor y torrent
      if(p._tipo!=='tv'){ abrirFuentes({tipo:'movie', tmdbId:p.id, titulo:p.title||p.name||'', nas:true}); return; }
      // Series: pop-up para elegir serie completa, temporada completa o capítulos sueltos
      abrirNasModal();
    }

    // Clave para comparar solicitudes: mismo título, temporada y capítulo
    const _nasClave = (tipo, id, t, e) => `${tipo}:${id}:${t??'-'}:${e??'-'}`;

    // Guarda en la cola del NAS una fila por cada elemento de «partes»:
    //   {}                                  → película (el NAS elige el torrent)
    //   {temporada, episodio}               → un capítulo (el NAS elige el torrent)
    //   {..., info_hash, fuente}            → con el torrent que has elegido tú
    // Antes de guardar quita lo que ya está en la cola, para no descargar dos veces lo mismo.
    // Devuelve true si todo ha quedado en la cola (aunque fuera porque ya estaba).
    async function _enviarSolicitudesNAS(partes, opciones){
      opciones = opciones || {};
      if(_nasEnviando || !partes.length) return false;
      if(!sesionActual){ _nasAviso('Inicia sesión para enviar descargas al NAS.', true); return false; }
      const p = opciones.pelicula || peliculaActual; if(!p) return false;
      const tipo = p._tipo==='tv' ? 'tv' : 'movie';
      const titulo = String(p.title||p.name||'Sin título').slice(0,500);
      let filas = partes.map(x=>({tmdb_id:p.id, tipo, titulo, temporada:x.temporada??null, episodio:x.episodio??null,
        ...(x.info_hash ? {info_hash:x.info_hash, fuente:x.fuente||null} : {})}));
      // Sin repetidos dentro del mismo envío
      const vistas = new Set();
      filas = filas.filter(f=>{ const k=_nasClave(tipo,f.tmdb_id,f.temporada,f.episodio); if(vistas.has(k)) return false; vistas.add(k); return true; });

      const btn = document.getElementById('btn-descargar-nas');
      const btnModal = document.getElementById('nas-enviar');
      _nasEnviando = true;
      if(btn) btn.setAttribute('aria-disabled','true');
      if(btnModal) btnModal.disabled = true;
      try{
        // Lo que ya está en marcha para este título no se vuelve a pedir
        let repetidas = 0;
        const {data:activas, error:errLeer} = await sb.from('solicitudes_descarga')
          .select('temporada,episodio').eq('user_id', sesionActual.user.id)
          .eq('tmdb_id', p.id).eq('tipo', tipo).in('estado', _NAS_ACTIVOS);
        if(!errLeer && Array.isArray(activas)){
          const enCola = new Set(activas.map(a=>_nasClave(tipo,p.id,a.temporada,a.episodio)));
          const antes = filas.length;
          filas = filas.filter(f=>!enCola.has(_nasClave(tipo,f.tmdb_id,f.temporada,f.episodio)));
          repetidas = antes - filas.length;
        }
        if(!filas.length){
          _nasAviso(repetidas>1 ? 'Esos capítulos ya están en la cola del NAS.' : 'Ya está en la cola del NAS. Puedes seguirlo en «Mis descargas».');
          return true;
        }
        // En tandas, por si es una serie entera
        for(let i=0;i<filas.length;i+=200){
          const {error} = await sb.from('solicitudes_descarga').insert(filas.slice(i,i+200));
          if(error) throw error;
        }
        const que = tipo==='movie' ? titulo
          : filas.length===1 ? `${titulo} · T${filas[0].temporada} · E${filas[0].episodio}`
          : `${filas.length} capítulos de ${titulo}`;
        _nasAviso('Enviado al NAS: '+que+(repetidas ? ` (${repetidas} ya estaban en la cola)` : '')+'. Síguelo en «Mis descargas».');
        if(document.getElementById('p-nas')?.classList.contains('activa')) cargarMisDescargas();
        return true;
      }catch(e){
        console.error('Supabase solicitudes_descarga:', e);
        _nasAviso(_nasTextoError(e, 'No se pudo enviar al NAS.'), true);
        return false;
      }finally{
        _nasEnviando = false;
        if(btn) btn.removeAttribute('aria-disabled');
        if(btnModal){ btnModal.disabled = false; _actualizarBotonNas(); }
      }
    }
    // Explica un error de Supabase con palabras normales
    function _nasTextoError(e, inicio){
      const msg = String(e && (e.message||e.details) || '');
      if(/could not find .*(info_hash|fuente)|column .*(info_hash|fuente).* does not exist/i.test(msg))
        return inicio+' Faltan las columnas info_hash y fuente: ejecuta supabase/nas.sql en Supabase.';
      if(/permission denied|row-level security|42501/i.test(msg+' '+(e&&e.code)))
        return inicio+' Supabase no da permiso: ejecuta supabase/nas.sql en Supabase.';
      if(/failed to fetch|network|load failed/i.test(msg)) return inicio+' Sin conexión: inténtalo de nuevo.';
      return inicio+' '+([e&&e.code, msg].filter(Boolean).join(' · ').slice(0,200) || 'Error desconocido.');
    }

    // Lista de capítulos ya emitidos de una temporada (los que aún no han salido no se piden).
    // Si TMDB no responde, se usan todos los capítulos que dice la ficha.
    async function _nasCapitulosEmitidos(serieId, temporada, totalFicha){
      const hoy = new Date().toISOString().slice(0,10);
      try{
        const d = await _tmdbCacheado(`/tv/${serieId}/season/${temporada}&language=es-ES`);
        const eps = (d && d.episodes || []).filter(e=>e.episode_number>0);
        if(eps.length) return {emitidos: eps.filter(e=>e.air_date && e.air_date<=hoy).map(e=>e.episode_number), total: eps.length};
      }catch(e){}
      const n = totalFicha||0;
      return {emitidos: Array.from({length:n},(_,i)=>i+1), total:n};
    }

    // ── Pop-up «¿Qué quieres descargar?» (solo series) ──
    // Estado del pop-up: qué opción está marcada, qué temporada y qué capítulos
    const _nas = {modo:'serie', temporada:1, episodios:new Set(), preparando:false};

    function abrirNasModal(){
      const p = peliculaActual; if(!p) return;
      // La ficha de la serie ya cargó sus temporadas (sin «Especiales»), con cuántos capítulos tiene cada una
      const temps = (window.temporadasSeriesActual||[]).filter(s=>s.season_number>0);
      _nas.modo = 'serie';
      _nas.temporada = temps.length ? temps[0].season_number : 1;
      _nas.episodios = new Set();
      document.getElementById('nas-titulo').textContent = 'Descargar en el NAS · '+(p.name||p.title||'');
      _pintarNasModal();
      document.getElementById('nas-modal').style.display = 'flex';
      document.body.style.overflow = 'hidden';
      setTimeout(()=>document.querySelector('#nas-body input[type=radio]:checked')?.focus(), 0);
    }
    function cerrarNasModal(){
      document.getElementById('nas-modal').style.display = 'none';
      if(!document.getElementById('visor').classList.contains('activo') && !document.getElementById('fuentes-modal').classList.contains('activo')) document.body.style.overflow = '';
      document.getElementById('btn-descargar-nas')?.focus();
    }

    function _pintarNasModal(){
      const temps = (window.temporadasSeriesActual||[]).filter(s=>s.season_number>0);
      const totalEps = temps.reduce((s,t)=>s+(t.episode_count||0),0);
      const tActual = temps.find(t=>t.season_number===_nas.temporada) || temps[0];
      const body = document.getElementById('nas-body');

      // Una fila con su botón de radio por cada opción
      const opcion = (modo, nombre, desc, disabled) => _fEl('label',{class:'fte-fila nas-opcion'+(_nas.modo===modo?' on':'')+(disabled?' fte-off':'')},
        _fEl('input',{type:'radio', name:'nas-modo', value:modo, checked:_nas.modo===modo, disabled,
          onchange:()=>{ _nas.modo = modo; _nas.episodios = new Set(); _pintarNasModal(); document.querySelector('#nas-body input[value="'+modo+'"]')?.focus(); }}),
        _fEl('span',{class:'fte-cuerpo'}, _fEl('span',{class:'fte-nombre', text:nombre}), _fEl('span',{class:'fte-desc', text:desc})));

      const sinTemps = !temps.length;
      const kids = [
        _fEl('p',{class:'fte-msg', text:'¿Qué quieres descargar?'}),
        opcion('serie', 'Serie completa', sinTemps ? 'Todas las temporadas' : `${temps.length} ${temps.length===1?'temporada':'temporadas'} · ${totalEps} capítulos`),
        opcion('temporada', 'Temporada completa', 'Todos los capítulos de una temporada', sinTemps),
        opcion('sueltos', 'Capítulos sueltos', 'Elige uno o varios capítulos', sinTemps),
      ];
      if(sinTemps) kids.push(_fEl('p',{class:'fte-aviso', text:'No se han podido cargar las temporadas de esta serie, así que solo puedes pedirla completa.'}));

      // Selector de temporada (para «Temporada completa» y «Capítulos sueltos»)
      if(_nas.modo!=='serie' && tActual){
        const extra = _fEl('div',{class:'nas-extra'});
        extra.append(_fEl('div',{class:'fte-sel'}, _fEl('label',{text:'Temporada'},
          _fEl('select',{id:'nas-temp', onchange:e=>{ _nas.temporada = +e.target.value; _nas.episodios = new Set(); _pintarNasModal(); document.getElementById('nas-temp')?.focus(); }},
            ...temps.map(t=>_fEl('option',{value:t.season_number, selected:t.season_number===tActual.season_number,
              text:`Temporada ${t.season_number}${t.episode_count?' · '+t.episode_count+' capítulos':''}`}))))));

        // Casillas de capítulos (solo «Capítulos sueltos»)
        if(_nas.modo==='sueltos'){
          const n = tActual.episode_count||0;
          if(!n) extra.append(_fEl('p',{class:'fte-aviso', text:'Esta temporada todavía no tiene capítulos.'}));
          else{
            const todos = _nas.episodios.size===n;
            extra.append(_fEl('div',{class:'nas-eps'}, ...Array.from({length:n},(_,i)=>i+1).map(e=>
              _fEl('label',{class:'nas-ep'}, _fEl('input',{type:'checkbox', value:e, checked:_nas.episodios.has(e), 'aria-label':'Capítulo '+e,
                onchange:ev=>{ ev.target.checked ? _nas.episodios.add(e) : _nas.episodios.delete(e); _actualizarBotonNas(); }}), document.createTextNode(String(e))))));
            extra.append(_fEl('button',{type:'button', class:'nas-todos', text:todos?'Quitar todos':'Marcar todos',
              onclick:()=>{ _nas.episodios = todos ? new Set() : new Set(Array.from({length:n},(_,i)=>i+1)); _pintarNasModal(); }}));
          }
        }
        kids.push(extra);
      }

      kids.push(_fEl('button',{type:'button', id:'nas-enviar', class:'fte-accion fte-accion-vlc nas-enviar', onclick:_confirmarNas}));
      body.replaceChildren(...kids);
      _actualizarBotonNas();
    }

    // El texto del botón dice exactamente lo que se va a pedir
    function _actualizarBotonNas(){
      const b = document.getElementById('nas-enviar'); if(!b) return;
      const temps = (window.temporadasSeriesActual||[]).filter(s=>s.season_number>0);
      const total = temps.reduce((s,t)=>s+(t.episode_count||0),0);
      const tSel = temps.find(t=>t.season_number===_nas.temporada);
      let txt = 'Solicitar la serie completa'+(total?` (${total} capítulos)`:''), ok = temps.length>0;
      if(_nas.modo==='temporada') txt = 'Solicitar la temporada '+_nas.temporada+(tSel&&tSel.episode_count?` (${tSel.episode_count} capítulos)`:'');
      if(_nas.modo==='sueltos'){
        const n = _nas.episodios.size;
        ok = n>0;
        txt = ok ? `Solicitar ${n} ${n===1?'capítulo':'capítulos'} de la T${_nas.temporada}` : 'Marca al menos un capítulo';
      }
      if(_nas.preparando){ txt = 'Preparando la lista de capítulos…'; ok = false; }
      b.textContent = txt;
      b.disabled = !ok || _nasEnviando;
    }

    // «Serie completa» y «Temporada completa» se convierten en una solicitud por capítulo:
    // así el NAS busca y descarga cada capítulo, y en «Mis descargas» se ve el progreso de cada uno.
    async function _confirmarNas(){
      const p = peliculaActual; if(!p || _nas.preparando) return;
      let partes = [], futuros = 0;
      if(_nas.modo==='sueltos'){
        partes = [..._nas.episodios].sort((a,b)=>a-b).map(e=>({temporada:_nas.temporada, episodio:e}));
      }else{
        const temps = (window.temporadasSeriesActual||[]).filter(s=>s.season_number>0)
          .filter(t=>_nas.modo==='serie' || t.season_number===_nas.temporada);
        _nas.preparando = true; _actualizarBotonNas();
        try{
          const listas = await _fetchEnLotes(temps, t=>_nasCapitulosEmitidos(p.id, t.season_number, t.episode_count), 4);
          temps.forEach((t,i)=>{
            const l = listas[i] || {emitidos:[], total:0};
            futuros += Math.max(0, l.total - l.emitidos.length);
            l.emitidos.forEach(e=>partes.push({temporada:t.season_number, episodio:e}));
          });
        }finally{ _nas.preparando = false; _actualizarBotonNas(); }
      }
      if(!partes.length){ _nasAviso(futuros ? 'Esos capítulos todavía no se han emitido.' : 'No hay capítulos que pedir.', true); return; }
      if(await _enviarSolicitudesNAS(partes)){
        cerrarNasModal();
        if(futuros) setTimeout(()=>_nasAviso(`${futuros} ${futuros===1?'capítulo aún no emitido no se ha pedido':'capítulos aún no emitidos no se han pedido'}.`), 5200);
      }
    }

    // ══ MIS DESCARGAS: lo que has enviado al NAS y en qué estado está ══
    // Lee la tabla solicitudes_descarga (solo tus filas). El NAS va cambiando «estado»:
    // pendiente → procesando → descargando → completada (o error / sin_fuentes).
    const _NAS_ESTADOS = {
      pendiente:   {txt:'En cola',          grupo:'curso'},
      procesando:  {txt:'Buscando torrent', grupo:'curso'},
      descargando: {txt:'Descargando',      grupo:'curso'},
      completada:  {txt:'Completada',       grupo:'ok'},
      error:       {txt:'Error',            grupo:'mal'},
      sin_fuentes: {txt:'Sin fuentes',      grupo:'mal'},
    };
    const _nasEstado = e => _NAS_ESTADOS[e] || {txt:e||'Desconocido', grupo:'curso'};
    const _nasMis = {filas:[], filtro:'todas', abiertos:new Set(), timer:null, cargando:false};

    async function abrirMisDescargas(){
      irA('p-nas');
      await cargarMisDescargas();
      // Mientras estés en la pantalla, se actualiza sola cada 20 segundos
      clearInterval(_nasMis.timer);
      _nasMis.timer = setInterval(()=>{
        if(!document.getElementById('p-nas').classList.contains('activa')){ clearInterval(_nasMis.timer); _nasMis.timer = null; return; }
        if(!document.hidden) cargarMisDescargas(true);
      }, 20000);
    }

    async function cargarMisDescargas(silencioso){
      const lista = document.getElementById('nas-lista'), estado = document.getElementById('nas-estado');
      if(!sesionActual){ lista.replaceChildren(); estado.textContent = 'Inicia sesión para ver tus descargas.'; return; }
      if(_nasMis.cargando) return;
      _nasMis.cargando = true;
      if(!silencioso) estado.textContent = 'Cargando…';
      try{
        const {data, error} = await sb.from('solicitudes_descarga')
          .select('id,tmdb_id,tipo,titulo,temporada,episodio,estado,fuente,error_mensaje,info_hash,creada_en,actualizada_en')
          .eq('user_id', sesionActual.user.id).order('creada_en', {ascending:false}).limit(1000);
        if(error) throw error;
        _nasMis.filas = data || [];
        estado.textContent = 'Actualizado a las '+new Date().toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'})+'.';
        pintarMisDescargas();
      }catch(e){
        console.error('Mis descargas:', e);
        estado.textContent = _nasTextoError(e, 'No se pudieron cargar tus descargas.');
      }finally{ _nasMis.cargando = false; }
    }

    function _nasFecha(iso){
      if(!iso) return '';
      try{ return new Date(iso).toLocaleString('es-ES',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}); }catch(e){ return ''; }
    }
    function _nasDondeEs(f){
      if(f.tipo!=='tv') return '';
      if(f.temporada==null) return 'Serie completa';
      if(f.episodio==null) return 'Temporada '+f.temporada+' completa';
      return 'T'+f.temporada+' · E'+f.episodio;
    }
    function _nasEtiqueta(est){ const e=_nasEstado(est); return _fEl('span',{class:'nas-etq nas-etq-'+e.grupo+(est==='descargando'||est==='procesando'?' nas-etq-vivo':''),text:e.txt}); }

    function pintarMisDescargas(){
      const filas = _nasMis.filas, cont = document.getElementById('nas-lista');
      const cuenta = {curso:0, ok:0, mal:0};
      filas.forEach(f=>cuenta[_nasEstado(f.estado).grupo]++);
      // Resumen y filtro
      const chip = (k, txt, n) => _fEl('button',{type:'button',class:'nas-chip'+(_nasMis.filtro===k?' on':''),'aria-pressed':_nasMis.filtro===k?'true':'false',
        onclick:()=>{ _nasMis.filtro=k; pintarMisDescargas(); }}, txt+' ', _fEl('b',{text:String(n)}));
      const chips = _fEl('div',{class:'nas-chips',role:'group','aria-label':'Filtrar descargas'},
        chip('todas','Todas',filas.length), chip('curso','En curso',cuenta.curso), chip('ok','Completadas',cuenta.ok), chip('mal','Con problemas',cuenta.mal));
      if(!filas.length){
        cont.replaceChildren(_fEl('div',{class:'nas-vacio'},
          _fEl('p',{class:'fte-msg',text:'Todavía no has enviado nada al NAS.'}),
          _fEl('p',{class:'fte-nota',text:'Abre una película o serie y pulsa «NAS», o entra en «Ver» y pulsa «Enviar al NAS» en el torrent que quieras.'})));
        return;
      }
      const visibles = filas.filter(f=>_nasMis.filtro==='todas' || _nasEstado(f.estado).grupo===_nasMis.filtro);
      // Agrupadas por título (las series juntan todos sus capítulos), el más reciente primero
      const grupos = new Map();
      visibles.forEach(f=>{ const k=f.tipo+':'+f.tmdb_id; if(!grupos.has(k)) grupos.set(k,[]); grupos.get(k).push(f); });
      const tarjetas = [...grupos.entries()].map(([k,g])=>_nasTarjeta(k,g));
      cont.replaceChildren(chips, ...(tarjetas.length ? tarjetas : [_fEl('p',{class:'fte-msg',text:'No hay descargas con este filtro.'})]));
    }

    function _nasTarjeta(clave, g){
      const f0 = g[0], serie = f0.tipo==='tv';
      const titulo = _fEl('button',{type:'button',class:'nas-titulo',title:'Abrir ficha',
        onclick:()=>abrirDetalle({id:f0.tmdb_id,_tipo:f0.tipo,title:f0.titulo,name:f0.titulo})}, f0.titulo);
      const tipoTxt = serie ? '📺 Serie' : '🎬 Película';
      if(!serie && g.length===1){
        return _fEl('div',{class:'addon-card nas-card'},
          _fEl('div',{class:'nas-cab'}, _fEl('div',{class:'nas-cab-txt'}, titulo, _fEl('span',{class:'nas-sub',text:tipoTxt})), _nasEtiqueta(f0.estado)),
          _nasDetalle(f0));
      }
      // Series (o varias peticiones del mismo título): barra de progreso y lista desplegable
      const ok = g.filter(f=>f.estado==='completada').length, mal = g.filter(f=>_nasEstado(f.estado).grupo==='mal');
      const resumen = `${g.length} ${g.length===1?'elemento':(serie?'capítulos':'peticiones')} · ${ok} completad${g.length===1?'o':'os'}`+(mal.length?` · ${mal.length} con problemas`:'');
      const pct = Math.round(ok*100/g.length);
      const orden = [...g].sort((a,b)=>(a.temporada??-1)-(b.temporada??-1)||(a.episodio??-1)-(b.episodio??-1)||String(a.creada_en).localeCompare(String(b.creada_en)));
      const det = _fEl('details',{class:'nas-det',open:_nasMis.abiertos.has(clave)},
        _fEl('summary',{text:'Ver '+(serie?'capítulos':'peticiones')}),
        ...orden.map(f=>_fEl('div',{class:'nas-item'},
          _fEl('div',{class:'nas-cab'}, _fEl('b',{text:_nasDondeEs(f)||_nasFecha(f.creada_en)}), _nasEtiqueta(f.estado)),
          _nasDetalle(f))));
      det.addEventListener('toggle',()=>{ det.open ? _nasMis.abiertos.add(clave) : _nasMis.abiertos.delete(clave); });
      const acciones = _fEl('div',{class:'vid-acciones'});
      if(mal.length>1) acciones.append(_fEl('button',{type:'button',class:'btn-limpiar',onclick:e=>_nasReintentar(mal,e.currentTarget)},`↻ Reintentar los ${mal.length} con problemas`));
      return _fEl('div',{class:'addon-card nas-card'},
        _fEl('div',{class:'nas-cab'}, _fEl('div',{class:'nas-cab-txt'}, titulo, _fEl('span',{class:'nas-sub',text:tipoTxt+' · '+resumen}))),
        _fEl('div',{class:'nas-barra',role:'progressbar','aria-valuemin':'0','aria-valuemax':'100','aria-valuenow':String(pct),'aria-label':'Completado'}, _fEl('i',{style:'width:'+pct+'%'})),
        acciones.childNodes.length ? acciones : null, det);
    }

    // Datos de una solicitud y sus botones
    function _nasDetalle(f){
      const enMarcha = f.estado==='procesando' || f.estado==='descargando';
      const lineas = [
        f.fuente ? 'Torrent elegido: '+f.fuente : 'Torrent: lo elige el NAS automáticamente',
        'Pedido el '+_nasFecha(f.creada_en)+(f.actualizada_en && f.actualizada_en!==f.creada_en ? ' · último cambio el '+_nasFecha(f.actualizada_en) : ''),
      ];
      const acciones = _fEl('div',{class:'vid-acciones'});
      if(_nasEstado(f.estado).grupo==='mal') acciones.append(_fEl('button',{type:'button',class:'btn-limpiar',onclick:e=>_nasReintentar([f],e.currentTarget)},'↻ Reintentar'));
      if(!enMarcha) acciones.append(_fEl('button',{type:'button',class:'btn-limpiar',onclick:e=>_nasQuitar(f,e.currentTarget)},'Quitar de la lista'));
      return _fEl('div',{class:'nas-info'},
        ...lineas.map(t=>_fEl('span',{text:t})),
        f.error_mensaje && _nasEstado(f.estado).grupo==='mal' ? _fEl('span',{class:'nas-err',text:'Motivo: '+f.error_mensaje}) : null,
        enMarcha ? _fEl('span',{class:'nas-nota',text:'Se está procesando en el NAS: no se puede quitar hasta que termine.'}) : null,
        acciones.childNodes.length ? acciones : null);
    }

    // Reintentar = volver a ponerla en la cola (copia nueva en «pendiente») y quitar la fallida
    async function _nasReintentar(filas, btn){
      if(btn) btn.disabled = true;
      try{
        const nuevas = filas.map(f=>({tmdb_id:f.tmdb_id,tipo:f.tipo,titulo:f.titulo,temporada:f.temporada,episodio:f.episodio,
          ...(f.info_hash?{info_hash:f.info_hash,fuente:f.fuente}:{})}));
        const {error} = await sb.from('solicitudes_descarga').insert(nuevas);
        if(error) throw error;
        const {error:errB} = await sb.from('solicitudes_descarga').delete().in('id', filas.map(f=>f.id)).eq('user_id', sesionActual.user.id);
        if(errB) console.warn('No se pudo quitar la solicitud fallida:', errB);
        _nasAviso(filas.length===1 ? 'Vuelve a estar en la cola del NAS.' : filas.length+' solicitudes vuelven a estar en la cola del NAS.');
      }catch(e){
        console.error(e); _nasAviso(_nasTextoError(e, 'No se pudo reintentar.'), true);
      }finally{ if(btn) btn.disabled = false; cargarMisDescargas(true); }
    }
    // Quitar pide confirmación pulsando dos veces (sin ventanas del navegador)
    async function _nasQuitar(f, btn){
      if(btn.dataset.confirmar!=='1'){
        btn.dataset.confirmar = '1'; const txt = btn.textContent; btn.textContent = '¿Seguro? Pulsa otra vez';
        setTimeout(()=>{ if(btn.isConnected){ btn.dataset.confirmar=''; btn.textContent = txt; } }, 3500);
        return;
      }
      btn.disabled = true;
      try{
        const {error} = await sb.from('solicitudes_descarga').delete().eq('id', f.id).eq('user_id', sesionActual.user.id);
        if(error) throw error;
        _nasMis.filas = _nasMis.filas.filter(x=>x.id!==f.id);
        pintarMisDescargas();
        _nasAviso('Quitada de la lista. Si ya se había descargado, el archivo sigue en el NAS.');
      }catch(e){
        console.error(e); btn.disabled = false; _nasAviso(_nasTextoError(e, 'No se pudo quitar.'), true);
      }
    }

    // ── Modo NAS de la hoja de fuentes: eliges el proveedor (addon) y el torrent ──
    // Hash de un torrent: 40 caracteres hexadecimales o 32 en base32
    const _HASH_TORRENT = /^(?:[a-f0-9]{40}|[a-z2-7]{32})$/i;
    // El hash del torrent puede venir de tres formas según el addon:
    //  1) en el campo infoHash (Torrentio sin servicio de debrid)
    //  2) dentro de un enlace magnet:?xt=urn:btih:HASH
    //  3) dentro del enlace ya resuelto por un debrid, como hace Torrentio con
    //     Real-Debrid: …/resolve/realdebrid/CLAVE/HASH/…/archivo.mkv
    //     (se busca un tramo de la ruta de exactamente 40 caracteres hexadecimales;
    //      la clave de Real-Debrid no lo cumple, así que nunca se guarda)
    function _hashDeFuente(s){
      const h = String(s.infoHash||'').trim();
      if(_HASH_TORRENT.test(h)) return h.toLowerCase();
      const u = String(s.url||'');
      let m = u.match(/btih:([a-f0-9]{40}|[a-z2-7]{32})(?![a-z0-9])/i);
      if(m) return m[1].toLowerCase();
      m = u.match(/\/([a-f0-9]{40})(?=[\/?#]|$)/i);
      return m ? m[1].toLowerCase() : null;
    }
    function _nasBloqueAuto(){
      return _fEl('div',{class:'fte-fila fte-opciones'},
        _fEl('div',{class:'fte-cuerpo'},
          _fEl('span',{class:'fte-nombre',text:'Elige el torrent que quieres'}),
          _fEl('span',{class:'fte-desc',text:'Filtra por proveedor, idioma o resolución y pulsa «Enviar al NAS» en el torrent que prefieras. Si no quieres elegir, el NAS buscará uno automáticamente.'})),
        _fEl('div',{class:'fte-acciones'},
          _fEl('button',{class:'fte-accion',type:'button',onclick:async()=>{ if(await _enviarSolicitudesNAS([{}])) cerrarFuentes(); }},'Que elija el NAS automáticamente')));
    }
    // Texto que se guarda en «fuente»: proveedor y nombre del archivo (nunca el enlace: puede llevar tu clave del debrid)
    function _nasFuenteTexto(s, a){
      return (a.nombre+' · '+(s.filename || String(s.description||'').split('\n')[0] || s.name || '')).slice(0,300);
    }
    // Botón «Enviar al NAS» para la hoja normal de «Ver»: solo en fuentes que son torrents.
    // En series manda el capítulo que tienes elegido arriba (temporada y episodio).
    function _nasBotonEnVer(s, a, ctx, estado){
      const hash = _hashDeFuente(s);
      if(!hash) return null;
      return _fEl('button',{class:'fte-accion',type:'button',onclick:async()=>{
        const parte = {info_hash:hash, fuente:_nasFuenteTexto(s, a)};
        if(ctx.tipo==='tv'){ parte.temporada = ctx.season; parte.episodio = ctx.episode; }
        if(await _enviarSolicitudesNAS([parte]) && estado)
          estado.textContent = 'En la cola del NAS'+(ctx.tipo==='tv'?' (T'+ctx.season+' · E'+ctx.episode+')':'')+'. Cuando termine aparecerá en Plex; síguelo en «Mis descargas».';
      }},'Enviar al NAS');
    }
    function _nasFilaTorrent(s, a){
      const nombre = s.name || a.nombre;
      const hash = _hashDeFuente(s) || '';
      const cuerpo = _fEl('div',{class:'fte-cuerpo'}, _fEl('span',{class:'fte-nombre',text:nombre}),
        s.description && _fEl('span',{class:'fte-desc',text:s.description}),
        _fEl('span',{class:'fte-aviso',text:'Proveedor: '+a.nombre}));
      if(!_HASH_TORRENT.test(hash))
        return _fEl('div',{class:'fte-fila fte-off','aria-disabled':'true'}, cuerpo, _fEl('span',{class:'fte-badge',text:'Hash no válido'}));
      const fuente = _nasFuenteTexto(s, a);
      return _fEl('div',{class:'fte-fila fte-opciones'}, cuerpo,
        _fEl('div',{class:'fte-acciones'},
          _fEl('button',{class:'fte-accion fte-accion-vlc',type:'button',onclick:async()=>{
            if(await _enviarSolicitudesNAS([{info_hash:hash, fuente}])) cerrarFuentes();
          }},'Enviar al NAS')));
    }
