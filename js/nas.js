// CineMood · NAS: enviar descargas (películas, series por temporada o capítulo, «Enviar al NAS» en «Ver») y «Mis descargas»
// (Parte de index.html; se carga como script clásico: todo comparte el mismo ámbito global.)

    // ── Hoja de fuentes ──

    let _nasEnviando = false;
    // Estados que significan «sigue en marcha»: si ya hay una solicitud así, no se repite
    const _NAS_ACTIVOS = ['pendiente','procesando','descargando'];

    // Avisos del NAS: el aviso flotante común de la app (js/dialogos.js)
    const _nasAviso = (texto, esError) => _aviso(texto, esError);

    async function solicitarDescargaNAS(){
      if(_nasEnviando) return;
      if(!sesionActual){ _nasAviso('Inicia sesión para enviar descargas al NAS.', true); return; }
      const p = peliculaActual; if(!p) return;
      // Películas: se abre la hoja de fuentes en «modo NAS» para elegir proveedor y torrent
      if(p._tipo!=='tv'){ abrirFuentes({tipo:'movie', tmdbId:p.id, titulo:p.title||p.name||'', nas:true}); return; }
      // Series: por temporada (packs), capítulo a capítulo o la serie entera
      abrirNasSerie();
    }

    // Clave para comparar solicitudes: mismo título, temporada y capítulo
    const _nasClave = (tipo, id, t, e) => `${tipo}:${id}:${t??'-'}:${e??'-'}`;

    // Guarda en la cola del NAS una fila por cada elemento de «partes»:
    //   {}                                  → película (el NAS elige el torrent)
    //   {temporada, episodio}               → un capítulo (el NAS elige un torrent de ese capítulo)
    //   {temporada, episodio:null}          → la temporada entera (el NAS elige un pack)
    //   {temporada:null, episodio:null}     → la serie entera (solo con un pack elegido)
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

      const btn = document.getElementById('btn-descargar-nas'), btnUsado = opciones.boton;
      _nasEnviando = true;
      if(btn) btn.setAttribute('aria-disabled','true');
      if(btnUsado) btnUsado.disabled = true;
      try{
        // Lo que ya está en marcha para este título no se vuelve a pedir
        let repetidas = 0;
        const {data:activas, error:errLeer} = await sb.from('solicitudes_descarga')
          .select('temporada,episodio').eq('user_id', sesionActual.user.id)
          .eq('tmdb_id', p.id).eq('tipo', tipo).in('estado', _NAS_ACTIVOS);
        if(!errLeer && Array.isArray(activas)){
          const enCola = new Set(activas.map(a=>_nasClave(tipo,p.id,a.temporada,a.episodio)));
          const serieEnCola = activas.some(a=>a.temporada==null && a.episodio==null);
          const antes = filas.length;
          // también cuenta lo que ya cubre algo más grande en cola: la serie entera cubre todo y una temporada, sus capítulos
          filas = filas.filter(f=>!enCola.has(_nasClave(tipo,f.tmdb_id,f.temporada,f.episodio)) && !(tipo==='tv' && serieEnCola)
            && !(f.episodio!=null && enCola.has(_nasClave(tipo,f.tmdb_id,f.temporada,null))));
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
        const una = f => f.temporada==null ? 'serie completa' : f.episodio==null ? `temporada ${f.temporada} completa` : `T${f.temporada} · E${f.episodio}`;
        const que = tipo==='movie' ? titulo
          : filas.length===1 ? `${titulo} · ${una(filas[0])}`
          : filas.every(f=>f.episodio==null) ? `${filas.length} temporadas de ${titulo}`
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
        if(btnUsado) btnUsado.disabled = false;
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

    // ══ NAS de una serie: por temporada (packs), capítulo a capítulo o la serie entera ══
    // Usa la misma hoja que «Ver» (js/fuentes.js) con ctx.serieNas y ctx.vista:
    //   'temporada' → packs con la temporada entera · 'capitulos' → lista de capítulos para marcar
    //   'episodio'  → torrents de un capítulo concreto · 'serie' → packs con todas las temporadas
    function abrirNasSerie(){
      const p = peliculaActual; if(!p) return;
      const ctx = {tipo:'tv', nas:true, serieNas:true, tmdbId:p.id, titulo:p.title||p.name||''};
      _ctxSerie(ctx, null, null);
      ctx.vista = 'temporada'; ctx.seleccion = new Set();
      abrirFuentes(ctx);
    }
    // Cabecera: temporadas (y «Toda la serie») y, dentro de una temporada, «Temporada completa» o «Capítulos»
    function _nasSerieCabecera(ctx, cont){
      const ir = cambios=>{
        Object.assign(ctx, cambios); ctx.incluirPacks = false;
        _fteSelectores(); document.querySelector('#fuentes-modal .fte-sheet').scrollTop = 0; cargarFuentes();
      };
      const chip = (txt, on, cambios) => _fEl('button',{type:'button',class:'fte-chip'+(on?' on':''),'aria-pressed':on?'true':'false',onclick:()=>ir(cambios)},txt);
      const kids = [_fEl('div',{class:'fte-chips nas-temps',role:'group','aria-label':'Qué descargar'},
        chip('Toda la serie', ctx.vista==='serie', {vista:'serie'}),
        ...ctx.temporadas.map(t=>chip('T'+t.n, ctx.vista!=='serie' && ctx.season===t.n,
          {season:t.n, vista: ctx.vista==='capitulos' ? 'capitulos' : 'temporada', seleccion:new Set()})))];
      if(ctx.vista!=='serie'){
        const t = ctx.temporadas.find(x=>x.n===ctx.season);
        const enCaps = ctx.vista==='capitulos' || ctx.vista==='episodio';
        const seg = (v, txt, on) => _fEl('button',{type:'button',role:'tab','aria-selected':on?'true':'false',class:'nas-seg-btn'+(on?' on':''),onclick:()=>ir({vista:v})},txt);
        kids.push(_fEl('div',{class:'nas-seg',role:'tablist','aria-label':'Temporada '+ctx.season},
          seg('temporada','Temporada completa', !enCaps),
          seg('capitulos','Capítulos'+(t&&t.count>1?' ('+t.count+')':''), enCaps)));
      }
      cont.className = 'fte-sel nas-cab-serie';
      cont.replaceChildren(...kids);
    }
    // Explicación y botón «Que elija el NAS» encima de los resultados
    function _nasSerieIntro(ctx){
      const enviar = (partes, txt) => _fEl('button',{type:'button',class:'fte-btn',onclick:async e=>{ if(await _enviarSolicitudesNAS(partes,{boton:e.currentTarget})) cerrarFuentes(); }},txt);
      if(ctx.vista==='serie'){
        const temps = ctx.temporadas.map(t=>t.n);
        return _fEl('div',{class:'nas-intro'},
          _fEl('p',{class:'nas-intro-tit',text:'Toda la serie'}),
          _fEl('p',{class:'nas-intro-txt',text:'Packs con todas las temporadas. Si no te convence ninguno, el NAS puede buscar el mejor pack de cada temporada por separado.'}),
          enviar(temps.map(n=>({temporada:n, episodio:null})), `Que elija el NAS · ${temps.length} ${temps.length===1?'temporada':'temporadas'}`));
      }
      if(ctx.vista==='episodio'){
        return _fEl('div',{class:'nas-intro'},
          _fEl('button',{type:'button',class:'fte-link',onclick:()=>{ ctx.vista='capitulos'; ctx.incluirPacks=false; _fteSelectores(); cargarFuentes(); }},'‹ Volver a los capítulos'),
          _fEl('p',{class:'nas-intro-tit',text:`T${ctx.season} · Capítulo ${ctx.episode}`+(ctx.nombreEp?' · '+ctx.nombreEp:'')}),
          _fEl('label',{class:'nas-check'}, _fEl('input',{type:'checkbox',checked:!!ctx.incluirPacks,onchange:e=>{ ctx.incluirPacks=e.target.checked; cargarFuentes(); }}),
            ' Mostrar también packs de temporada (descargan la temporada entera)'));
      }
      return _fEl('div',{class:'nas-intro'},
        _fEl('p',{class:'nas-intro-tit',text:`Temporada ${ctx.season} completa`}),
        _fEl('p',{class:'nas-intro-txt',text:'Elige un pack con la temporada entera, o deja que el NAS escoja el mejor (en español y buena calidad si lo hay).'}),
        enviar([{temporada:ctx.season, episodio:null}], 'Que elija el NAS'));
    }
    function _nasSerieSinResultados(ctx){
      if(ctx.vista==='temporada') return _fEl('span',{}, `Tus addons no tienen packs con la temporada ${ctx.season} completa. `,
        _fEl('button',{type:'button',class:'fte-link',onclick:()=>{ ctx.vista='capitulos'; _fteSelectores(); cargarFuentes(); }},'Pedirla capítulo a capítulo'));
      if(ctx.vista==='serie') return 'Tus addons no tienen packs con la serie entera. Usa «Que elija el NAS» para pedir cada temporada por separado.';
      return ctx.incluirPacks ? 'Tus addons no han devuelto torrents para este capítulo.'
        : 'No hay torrents de este capítulo suelto. Marca «Mostrar también packs de temporada» si te vale descargar la temporada entera.';
    }
    // Lista de capítulos de la temporada para marcar varios (el NAS elige un torrent de cada uno)
    async function _nasSerieCapitulos(ctx, body, vivo){
      body.replaceChildren(_fteCargando('Cargando los capítulos…'));
      const t = ctx.temporadas.find(x=>x.n===ctx.season) || {count:0};
      const eps = await _nasEpisodiosTemporada(ctx.tmdbId, ctx.season, t.count);
      if(!vivo()) return;
      const sel = ctx.seleccion || (ctx.seleccion = new Set());
      const emitidos = eps.filter(e=>e.emitido);
      const boton = _fEl('button',{type:'button',class:'fte-btn fte-btn-prim nas-enviar-caps'});
      const todos = _fEl('button',{type:'button',class:'fte-link'});
      const actualizar = ()=>{
        const n = sel.size;
        boton.textContent = n ? `Enviar ${n} ${n===1?'capítulo':'capítulos'} · el NAS elige` : 'Marca los capítulos que quieras';
        boton.disabled = !n;
        todos.textContent = emitidos.length && sel.size===emitidos.length ? 'Desmarcar todos' : 'Marcar todos';
      };
      const lista = _fEl('div',{class:'nas-caps'}, ...eps.map(e=>_fEl('div',{class:'nas-cap'+(e.emitido?'':' futuro')},
        _fEl('label',{class:'nas-cap-check'},
          _fEl('input',{type:'checkbox',value:e.n,checked:sel.has(e.n),disabled:!e.emitido,'aria-label':'Capítulo '+e.n,
            onchange:ev=>{ ev.target.checked ? sel.add(e.n) : sel.delete(e.n); actualizar(); }}),
          _fEl('span',{class:'nas-cap-num',text:'E'+e.n}),
          _fEl('span',{class:'nas-cap-nom'}, _fEl('b',{text:e.nombre||'Capítulo '+e.n}),
            e.emitido ? null : _fEl('small',{text:e.fecha ? 'Se emite el '+_nasFechaCorta(e.fecha) : 'Aún no emitido'}))),
        e.emitido ? _fEl('button',{type:'button',class:'fte-btn fte-btn-sec',onclick:()=>{
          Object.assign(ctx,{vista:'episodio', episode:e.n, nombreEp:e.nombre||'', incluirPacks:false});
          _fteSelectores(); document.querySelector('#fuentes-modal .fte-sheet').scrollTop = 0; cargarFuentes();
        }},'Elegir torrent') : null)));
      todos.onclick = ()=>{
        if(sel.size===emitidos.length) sel.clear(); else emitidos.forEach(e=>sel.add(e.n));
        lista.querySelectorAll('input[type=checkbox]').forEach(c=>{ c.checked = sel.has(+c.value); });
        actualizar();
      };
      boton.onclick = async ()=>{
        const partes = [...sel].sort((a,b)=>a-b).map(e=>({temporada:ctx.season, episodio:e}));
        if(await _enviarSolicitudesNAS(partes,{boton})){ sel.clear(); cerrarFuentes(); }
      };
      body.replaceChildren(
        _fEl('div',{class:'nas-intro'},
          _fEl('p',{class:'nas-intro-txt',text:'Marca capítulos y el NAS buscará un torrent de cada uno (solo del capítulo, nunca la temporada entera). O pulsa «Elegir torrent» para escogerlo tú.'}),
          emitidos.length ? todos : null),
        eps.length ? lista : _fEl('p',{class:'fte-msg',text:'No se han podido cargar los capítulos de esta temporada.'}),
        _fEl('div',{class:'nas-barra-enviar'}, boton));
      actualizar();
    }
    // Capítulos de una temporada con nombre y fecha (los que aún no se han emitido no se pueden pedir)
    async function _nasEpisodiosTemporada(serieId, temporada, totalFicha){
      const hoy = new Date().toISOString().slice(0,10);
      try{
        const d = await _tmdbCacheado(`/tv/${serieId}/season/${temporada}&language=es-ES`);
        const eps = (d && d.episodes || []).filter(e=>e.episode_number>0);
        if(eps.length) return eps.map(e=>({n:e.episode_number, nombre:e.name||'', fecha:e.air_date||'', emitido:!!(e.air_date && e.air_date<=hoy)}));
      }catch(e){}
      return Array.from({length:totalFicha||0},(_,i)=>({n:i+1, nombre:'', fecha:'', emitido:true}));
    }
    const _nasFechaCorta = f => { try{ return new Date(f+'T12:00:00').toLocaleDateString('es-ES',{day:'numeric',month:'short'}); }catch(e){ return f; } };

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
      cancelada:   {txt:'Cancelada',        grupo:'mal'},
    };
    const _nasEstado = e => _NAS_ESTADOS[e] || {txt:e||'Desconocido', grupo:'curso'};
    const _nasMis = {filas:[], filtro:'todas', abiertos:new Set(), timer:null, cargando:false, conProgreso:true};
    const _NAS_COLS = 'id,tmdb_id,tipo,titulo,temporada,episodio,estado,fuente,error_mensaje,info_hash,creada_en,actualizada_en';

    async function abrirMisDescargas(){
      irA('p-nas');
      await cargarMisDescargas();
    }
    // Se actualiza sola cada 15 s mientras estés en la pantalla y haya algo en marcha;
    // si todo está terminado no pregunta a Supabase hasta que pulses «Actualizar»
    function _nasProgramarRefresco(){
      clearTimeout(_nasMis.timer); _nasMis.timer = null;
      const enMarcha = _nasMis.filas.some(f=>_NAS_ACTIVOS.includes(f.estado));
      if(!enMarcha) return;
      _nasMis.timer = setTimeout(()=>{
        // fuera de «Mis descargas» o con la app en segundo plano: se vuelve a intentar más tarde (al volver se pone al día)
        if(!document.getElementById('p-nas').classList.contains('activa') || document.hidden){ _nasProgramarRefresco(); return; }
        cargarMisDescargas(true);
      }, 15000);
    }

    async function cargarMisDescargas(silencioso){
      const lista = document.getElementById('nas-lista'), estado = document.getElementById('nas-estado');
      if(!sesionActual){ lista.replaceChildren(); estado.textContent = 'Inicia sesión para ver tus descargas.'; return; }
      if(_nasMis.cargando) return;
      _nasMis.cargando = true;
      if(!silencioso) estado.textContent = 'Cargando…';
      try{
        // Con progreso y cancelar (supabase/nas.sql, apartado 6). Si aún no existen esas columnas, sin ellas.
        const leer = cols => sb.from('solicitudes_descarga').select(cols)
          .eq('user_id', sesionActual.user.id).order('creada_en', {ascending:false}).limit(1000);
        let {data, error} = await leer(_NAS_COLS+',progreso,velocidad,eta,tamano,cancelar');
        _nasMis.conProgreso = !error;
        if(error && /progreso|velocidad|eta|tamano|cancelar|42703|PGRST204/i.test(String(error.message)+' '+error.code)) ({data, error} = await leer(_NAS_COLS));
        if(error) throw error;
        // Aviso dentro de la app si algo ha terminado desde la última vez que se miró
        const antes = new Map(_nasMis.filas.map(x=>[x.id, x.estado]));
        _nasMis.filas = data || [];
        const nuevas = _nasMis.filas.filter(x=>x.estado==='completada' && antes.has(x.id) && antes.get(x.id)!=='completada');
        if(nuevas.length) _aviso(nuevas.length===1 ? `✓ Descargado: ${nuevas[0].titulo}${_nasDondeEs(nuevas[0]) ? ' · '+_nasDondeEs(nuevas[0]) : ''}. Ya aparecerá en Plex.` : `✓ ${nuevas.length} descargas terminadas. Ya aparecerán en Plex.`);
        estado.textContent = 'Actualizado a las '+new Date().toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'})+'.';
        pintarMisDescargas();
        _nasProgramarRefresco();
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
    // Atascada: el NAS la marca así si lleva un rato sin avanzar (sigue «descargando» por si se recupera)
    const _nasAtascada = f => f.estado==='descargando' && /^Atascada/.test(f.error_mensaje||'');
    function _nasEtiqueta(est, f){
      if(f && _nasAtascada(f)) return _fEl('span',{class:'nas-etq nas-etq-mal',text:'Atascada'});
      const e=_nasEstado(est); return _fEl('span',{class:'nas-etq nas-etq-'+e.grupo+(est==='descargando'||est==='procesando'?' nas-etq-vivo':''),text:e.txt});
    }

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
          _fEl('div',{class:'nas-cab'}, _fEl('div',{class:'nas-cab-txt'}, titulo, _fEl('span',{class:'nas-sub',text:tipoTxt})), _nasEtiqueta(f0.estado, f0)),
          _nasDetalle(f0));
      }
      // Series (o varias peticiones del mismo título): barra de progreso y lista desplegable
      const ok = g.filter(f=>f.estado==='completada').length, mal = g.filter(f=>f.estado==='error' || f.estado==='sin_fuentes');
      const bajando = g.filter(f=>f.estado==='descargando').length;
      const resumen = `${g.length} ${g.length===1?'elemento':(serie?'capítulos':'peticiones')} · ${ok} completad${g.length===1?'o':'os'}`
        +(bajando?` · ${bajando} descargando`:'')+(mal.length?` · ${mal.length} con problemas`:'');
      const parcial = g.reduce((s,f)=>s+(f.estado==='descargando' && f.progreso>0 ? Math.min(f.progreso,100)/100 : 0),0);
      const pct = Math.round((ok+parcial)*100/g.length);
      const orden = [...g].sort((a,b)=>(a.temporada??-1)-(b.temporada??-1)||(a.episodio??-1)-(b.episodio??-1)||String(a.creada_en).localeCompare(String(b.creada_en)));
      const det = _fEl('details',{class:'nas-det',open:_nasMis.abiertos.has(clave)},
        _fEl('summary',{text:'Ver '+(serie?'capítulos':'peticiones')}),
        ...orden.map(f=>_fEl('div',{class:'nas-item'},
          _fEl('div',{class:'nas-cab'}, _fEl('b',{text:_nasDondeEs(f)||_nasFecha(f.creada_en)}), _nasEtiqueta(f.estado, f)),
          _nasDetalle(f))));
      det.addEventListener('toggle',()=>{ det.open ? _nasMis.abiertos.add(clave) : _nasMis.abiertos.delete(clave); });
      const acciones = _fEl('div',{class:'vid-acciones'});
      if(mal.length>1) acciones.append(_fEl('button',{type:'button',class:'btn-limpiar',onclick:e=>_nasReintentar(mal,e.currentTarget)},`↻ Reintentar los ${mal.length} con problemas`));
      return _fEl('div',{class:'addon-card nas-card'},
        _fEl('div',{class:'nas-cab'}, _fEl('div',{class:'nas-cab-txt'}, titulo, _fEl('span',{class:'nas-sub',text:tipoTxt+' · '+resumen}))),
        _fEl('div',{class:'nas-barra',role:'progressbar','aria-valuemin':'0','aria-valuemax':'100','aria-valuenow':String(pct),'aria-label':'Descargado'}, _fEl('i',{style:'width:'+pct+'%'})),
        _fEl('span',{class:'nas-barra-txt',text:`${ok} de ${g.length} ${serie?(g.every(f=>f.episodio==null)?'descargadas':'descargados'):'descargadas'} · ${pct} %`}),
        acciones.childNodes.length ? acciones : null, det);
    }

    // 3,2 MB/s · 1,4 GB · quedan 12 min
    function _nasBytes(n){
      if(!(n>0)) return '0 B';
      const u=['B','KB','MB','GB','TB']; let i=0; while(n>=1024 && i<u.length-1){ n/=1024; i++; }
      return n.toLocaleString('es-ES',{maximumFractionDigits: n<10&&i>1 ? 1 : 0})+' '+u[i];
    }
    function _nasQueda(seg){
      if(!(seg>0)) return '';
      if(seg<60) return 'menos de 1 min';
      const h=Math.floor(seg/3600), m=Math.round((seg%3600)/60);
      return h ? `${h} h ${m} min` : `${m} min`;
    }
    // Barra de progreso de una descarga en curso (datos que copia el NAS desde RDT-Client)
    function _nasProgreso(f){
      if(f.estado!=='descargando' || f.progreso==null) return null;
      const pct = Math.max(0, Math.min(100, Number(f.progreso)||0));
      const datos = [pct.toLocaleString('es-ES',{maximumFractionDigits:1})+' %'];
      if(f.tamano) datos.push(_nasBytes(f.tamano*pct/100)+' de '+_nasBytes(f.tamano));
      if(f.velocidad>0) datos.push(_nasBytes(f.velocidad)+'/s'); else datos.push('esperando velocidad');
      const queda = _nasQueda(f.eta); if(queda) datos.push('quedan '+queda);
      return _fEl('div',{class:'nas-prog'},
        _fEl('div',{class:'nas-barra nas-barra-viva',role:'progressbar','aria-valuemin':'0','aria-valuemax':'100','aria-valuenow':String(Math.round(pct)),'aria-label':'Descargado'}, _fEl('i',{style:'width:'+pct+'%'})),
        _fEl('span',{class:'nas-prog-txt',text:datos.join(' · ')}));
    }

    // Datos de una solicitud y sus botones
    function _nasDetalle(f){
      const enMarcha = f.estado==='procesando' || f.estado==='descargando';
      const lineas = [
        f.fuente ? 'Torrent elegido: '+f.fuente : 'Torrent: lo elige el NAS automáticamente',
        'Pedido el '+_nasFecha(f.creada_en)+(f.actualizada_en && f.actualizada_en!==f.creada_en ? ' · último cambio el '+_nasFecha(f.actualizada_en) : ''),
      ];
      const acciones = _fEl('div',{class:'vid-acciones'});
      if(f.estado==='error' || f.estado==='sin_fuentes') acciones.append(_fEl('button',{type:'button',class:'btn-limpiar',onclick:e=>_nasReintentar([f],e.currentTarget)},'↻ Reintentar'));
      if(f.estado==='cancelada') acciones.append(_fEl('button',{type:'button',class:'btn-limpiar',onclick:e=>_nasReintentar([f],e.currentTarget)},'↻ Volver a pedir'));
      if(_nasAtascada(f) && _nasMis.conProgreso && !f.cancelar) acciones.append(_fEl('button',{type:'button',class:'btn-limpiar',onclick:e=>_nasProbarOtro(f,e.currentTarget)},'↻ Probar con otro torrent'));
      if(enMarcha && _nasMis.conProgreso && !f.cancelar) acciones.append(_fEl('button',{type:'button',class:'btn-limpiar',onclick:e=>_nasCancelar(f,e.currentTarget)},'✕ Cancelar descarga'));
      if(!enMarcha) acciones.append(_fEl('button',{type:'button',class:'btn-limpiar',onclick:e=>_nasQuitar(f,e.currentTarget)},'Quitar de la lista'));
      let nota = null;
      if(f.cancelar && enMarcha) nota = 'Cancelando: el NAS la borrará de RDT-Client en unos segundos.';
      else if(enMarcha && !_nasMis.conProgreso) nota = 'Se está procesando en el NAS: no se puede quitar hasta que termine.';
      return _fEl('div',{class:'nas-info'},
        _nasProgreso(f),
        ...lineas.map(t=>_fEl('span',{text:t})),
        f.error_mensaje && (_nasEstado(f.estado).grupo==='mal' || _nasAtascada(f)) ? _fEl('span',{class:f.estado==='cancelada'?'':'nas-err',text:(f.estado==='cancelada'||_nasAtascada(f)?'':'Motivo: ')+f.error_mensaje}) : null,
        nota ? _fEl('span',{class:'nas-nota',text:nota}) : null,
        acciones.childNodes.length ? acciones : null);
    }

    // Los botones que borran o cancelan piden confirmación pulsando otra vez (sin ventanas del navegador)
    function _nasConfirmado(btn){
      if(btn.dataset.confirmar==='1') return true;
      btn.dataset.confirmar = '1'; const txt = btn.textContent; btn.textContent = '¿Seguro? Pulsa otra vez';
      setTimeout(()=>{ if(btn.isConnected){ btn.dataset.confirmar=''; btn.textContent = txt; } }, 3500);
      return false;
    }
    // Probar con otro torrent: se cancela la atascada y se pide de nuevo lo mismo sin torrent elegido;
    // el NAS borra la atascada de RDT-Client y, al buscar, descarta los torrents que ya fallaron para eso
    async function _nasProbarOtro(f, btn){
      if(!_nasConfirmado(btn)) return;
      btn.disabled = true;
      try{
        // primero la nueva petición y luego cancelar la atascada: si algo falla, no se queda sin ninguna
        const {error:e2} = await sb.from('solicitudes_descarga').insert({tmdb_id:f.tmdb_id, tipo:f.tipo, titulo:f.titulo, temporada:f.temporada, episodio:f.episodio});
        if(e2) throw e2;
        const {error:e1} = await sb.from('solicitudes_descarga').update({cancelar:true}).eq('id', f.id).eq('user_id', sesionActual.user.id);
        if(e1) throw e1;
        _nasAviso('Buscando otro torrent: el NAS quitará el atascado y probará con uno distinto.');
      }catch(e){ console.error(e); btn.disabled = false; _nasAviso(_nasTextoError(e, 'No se pudo cambiar de torrent.'), true); return; }
      cargarMisDescargas(true);
    }
    // Cancelar = marcarla; el NAS borra el torrent de RDT-Client en su siguiente repaso
    async function _nasCancelar(f, btn){
      if(!_nasConfirmado(btn)) return;
      btn.disabled = true;
      try{
        const {error} = await sb.from('solicitudes_descarga').update({cancelar:true}).eq('id', f.id).eq('user_id', sesionActual.user.id);
        if(error) throw error;
        f.cancelar = true;
        pintarMisDescargas();
        _nasAviso('Cancelando: el NAS la borrará de RDT-Client en unos segundos. Lo ya descargado no se borra.');
      }catch(e){
        console.error(e); btn.disabled = false; _nasAviso(_nasTextoError(e, 'No se pudo cancelar.'), true);
      }
    }

    // Reintentar = volver a ponerla en la cola (copia nueva en «pendiente») y quitar la fallida
    async function _nasReintentar(filas, btn){
      if(btn) btn.disabled = true;
      try{
        // lo que ya vuelve a estar en marcha (p. ej. tras «Probar con otro torrent») no se pide otra vez
        const activas = new Set((_nasMis.filas||[]).filter(x=>_NAS_ACTIVOS.includes(x.estado)).map(x=>_nasClave(x.tipo,x.tmdb_id,x.temporada,x.episodio)));
        const nuevas = filas.filter(f=>!activas.has(_nasClave(f.tipo,f.tmdb_id,f.temporada,f.episodio))).map(f=>({tmdb_id:f.tmdb_id,tipo:f.tipo,titulo:f.titulo,temporada:f.temporada,episodio:f.episodio,
          ...(f.info_hash?{info_hash:f.info_hash,fuente:f.fuente}:{})}));
        if(nuevas.length){ const {error} = await sb.from('solicitudes_descarga').insert(nuevas); if(error) throw error; }
        const {error:errB} = await sb.from('solicitudes_descarga').delete().in('id', filas.map(f=>f.id)).eq('user_id', sesionActual.user.id);
        if(errB) console.warn('No se pudo quitar la solicitud fallida:', errB);
        _nasAviso(filas.length===1 ? 'Vuelve a estar en la cola del NAS.' : filas.length+' solicitudes vuelven a estar en la cola del NAS.');
      }catch(e){
        console.error(e); _nasAviso(_nasTextoError(e, 'No se pudo reintentar.'), true);
      }finally{ if(btn) btn.disabled = false; cargarMisDescargas(true); }
    }
    // Quitar pide confirmación pulsando dos veces (sin ventanas del navegador)
    async function _nasQuitar(f, btn){
      if(!_nasConfirmado(btn)) return;
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
    // «Que elija el NAS» en una película
    function _nasBloqueAuto(){
      return _fEl('div',{class:'nas-intro'},
        _fEl('p',{class:'nas-intro-txt',text:'Elige el torrent que quieras, o deja que el NAS busque el mejor (en español y buena calidad si lo hay).'}),
        _fEl('button',{type:'button',class:'fte-btn',onclick:async e=>{ if(await _enviarSolicitudesNAS([{}],{boton:e.currentTarget})) cerrarFuentes(); }},'Que elija el NAS'));
    }
    // Texto que se guarda en «fuente»: addon y nombre del torrent (nunca el enlace: puede llevar tu clave del debrid)
    function _nasFuenteTexto(s, a){
      return (a.nombre+' · '+(_fteNombreTorrent(s) || s.filename || '')).slice(0,300);
    }
    // Qué se pide al NAS con un torrent: un capítulo, una temporada entera (pack) o la serie entera
    function _nasParteTorrent(s, a, ctx, tipoT){
      const base = {info_hash:_hashDeFuente(s), fuente:_nasFuenteTexto(s, a)};
      if(ctx.tipo!=='tv') return {parte:base, texto:'Enviar al NAS'};
      const t = tipoT || _fteTipoTorrent(s);
      if(t.clase==='serie') return {parte:{...base, temporada:null, episodio:null}, texto:'Enviar la serie completa',
        aviso: ctx.vista==='serie' ? '' : 'Es un pack con toda la serie: se descargarán todas las temporadas.'};
      if(t.clase==='temporada'){
        const n = t.temporada || ctx.season;
        return {parte:{...base, temporada:n, episodio:null}, texto:'Enviar la temporada '+n,
          aviso: ctx.vista==='temporada' ? '' : `Es un pack con la temporada ${n} entera: se descargará completa.`};
      }
      return {parte:{...base, temporada:ctx.season, episodio:ctx.episode}, texto:'Enviar el capítulo'};
    }
    // Botón de cada tarjeta en el modo NAS
    function _nasAccionTarjeta(r, ctx, estado){
      const {parte, texto, aviso} = _nasParteTorrent(r.s, r.a, ctx, r.tipoT);
      if(!_HASH_TORRENT.test(parte.info_hash||'')) return _fEl('span',{class:'fte-no-compat'},'Sin un hash de torrent válido');
      return _fEl('div',{class:'fte-card-acc'},
        _fEl('button',{type:'button',class:'fte-btn fte-btn-prim',onclick:async e=>{ if(await _enviarSolicitudesNAS([parte],{boton:e.currentTarget})) cerrarFuentes(); }}, texto),
        aviso ? _fEl('span',{class:'fte-card-aviso',text:aviso}) : null);
    }
    // «Enviar al NAS» dentro de «Ver»: solo en torrents. En series, el capítulo elegido arriba
    // (o la temporada / serie entera si el torrent es un pack, avisándolo).
    function _nasBotonEnVer(s, a, ctx, estado, tipoT){
      if(!_hashDeFuente(s)) return null;
      const {parte, texto, aviso} = _nasParteTorrent(s, a, ctx, tipoT);
      const etiqueta = ctx.tipo==='tv' && parte.episodio==null ? texto.replace(/^Enviar /,'Enviar al NAS ') : 'Enviar al NAS';
      return _fEl('button',{type:'button',class:'fte-btn',title:aviso||'',onclick:async e=>{
        if(await _enviarSolicitudesNAS([parte],{boton:e.currentTarget}) && estado){
          const que = ctx.tipo!=='tv' ? '' : parte.temporada==null ? ' (serie completa)' : parte.episodio==null ? ` (temporada ${parte.temporada} completa)` : ` (T${parte.temporada} · E${parte.episodio})`;
          estado.textContent = 'En la cola del NAS'+que+'. Cuando termine aparecerá en Plex; síguelo en «Mis descargas».';
        }
      }}, etiqueta);
    }
