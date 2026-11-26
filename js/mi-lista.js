// CineMood · Mi lista: carga, filtros y preferencias
// (Parte de index.html; se carga como script clásico: todo comparte el mismo ámbito global.)

    // Mi lista: misma tabla y mismos identificadores. Sin migraciones ni borrados.
    let _mlTurno=0, _mlResumenTurno=0, _mlResumenFilas=[], _mlResumenUsuario=null;
    const _mlPreferenciasMemoria=new Map();
    function _usarPerfilDeGusto(){
      if(!sesionActual) return true;
      const key='cm:usarPerfilGusto:'+sesionActual.user.id;
      if(_mlPreferenciasMemoria.has(key)) return _mlPreferenciasMemoria.get(key);
      try{return localStorage.getItem(key)!=='no';}catch(e){return true;}
    }
    function guardarPreferenciaGusto(usar){
      if(!sesionActual) return;
      const key='cm:usarPerfilGusto:'+sesionActual.user.id;
      _mlPreferenciasMemoria.set(key,!!usar);
      let persistido=true;
      try{localStorage.setItem(key,usar?'si':'no');}catch(e){persistido=false;}
      document.getElementById('ml-preferencias-estado').textContent=(usar?'Perfil activado para afinar las recomendaciones.':'Perfil desactivado; no se ha borrado ningún dato.')+(persistido?' Preferencia guardada en este dispositivo.':' Solo se mantendrá durante esta sesión.');
      cargarParaTi();
    }
    async function recalcularPreferencias(btn){
      if(!sesionActual) return;
      const estado=document.getElementById('ml-preferencias-estado'), uid=sesionActual.user.id;
      btn.disabled=true; estado.textContent='Recalculando con tus títulos vistos y valoraciones…';
      try{
        const perfil=await construirPerfilGusto(true);
        if(sesionActual?.user.id!==uid) return;
        estado.textContent=perfil?.vacio?'Todavía no hay títulos vistos. Puedes marcar uno sin necesidad de puntuarlo.':'Preferencias recalculadas. No se han cambiado títulos, notas ni episodios.'+(!_usarPerfilDeGusto()?' La personalización sigue desactivada.':'');
        if(_usarPerfilDeGusto()) cargarParaTi();
      }catch(e){estado.textContent='No se pudieron recalcular las preferencias. No se han borrado tus datos.';}
      finally{btn.disabled=false;}
    }
    async function _mlLeerTodo(uid){
      const filas=[], lote=500;
      for(let desde=0;;desde+=lote){
        if(sesionActual?.user.id!==uid) throw new Error('sesion');
        const {data,error}=await sb.from('mi_biblioteca').select('*').eq('user_id',uid).order('id',{ascending:true}).range(desde,desde+lote-1);
        if(error) throw error;
        if(sesionActual?.user.id!==uid) throw new Error('sesion');
        filas.push(...(data||[]));
        if(!data||data.length<lote) return filas;
      }
    }
    function _mlBase(it){ return (bibliotecaTabActual==='pendiente'?it.pendiente&&!it.visto:it.visto)&&(bibliotecaTipoActual==='todos'||it.tipo===bibliotecaTipoActual); }
    const _mlVal = id => (document.getElementById(id)?.value||'');
    function _mlNecesitaInfo(){ return !!(_mlVal('ml-genero') || _mlVal('ml-duracion') || ['corta','publico','prevista'].includes(_mlVal('ml-orden'))); }
    const _mlPrevista = it => { const m = window._mlModelo; if(!m || !m.fit || !it._info) return null; if(it._prev===undefined || it._prevT!==m.t){ it._prev = _notaPredecir(m.fit, it.tipo, it._info)?.nota ?? null; it._prevT = m.t; } return it._prev; };
    function _mlHayFiltros(){ return !!(_mlVal('ml-buscar').trim() || _mlVal('ml-genero') || _mlVal('ml-decada') || _mlVal('ml-duracion')); }
    function _mlFiltrar(filas){
      const q = normalizarTitulo(_mlVal('ml-buscar')), gen = Number(_mlVal('ml-genero'))||0, dec = Number(_mlVal('ml-decada'))||0, dur = _mlVal('ml-duracion');
      return filas.filter(it=>{
        if(!_mlBase(it)) return false;
        if(q && !normalizarTitulo(it.titulo||'').includes(q)) return false;
        const anio = Number(it.anio) || Number(it._info?.y) || 0;
        if(dec && !(anio>=dec && anio<dec+10)) return false;
        if(gen && !(it._info?.g||[]).includes(gen)) return false;
        if(dur==='mini') return it.tipo==='tv' && it._info?.ns===1;
        if(dur){ const r = it._info?.r||0, m = Number(dur); if(it.tipo!=='movie' || !r) return false; if(m===121 ? r<=120 : r>=m) return false; }
        return true;
      });
    }
    let _mlFiltroT = null;
    function _mlFiltroCambio(escribiendo){ clearTimeout(_mlFiltroT); _mlFiltroT = setTimeout(()=>_miListaCargar(true), escribiendo ? 250 : 0); }
    function _mlQuitarFiltros(){ ['ml-buscar','ml-genero','ml-decada','ml-duracion'].forEach(id=>{ const el = document.getElementById(id); if(el) el.value=''; }); _miListaCargar(true); }
    async function _mlPrepararSelects(){
      const dec = document.getElementById('ml-decada');
      if(dec && dec.options.length<=1){ for(let d=Math.floor(new Date().getFullYear()/10)*10; d>=1920; d-=10) dec.add(new Option(`Años ${d<2000 ? String(d).slice(2) : d}`, d)); }
      const gen = document.getElementById('ml-genero');
      if(gen && gen.options.length<=1){ try{ const m = await _mapaGenerosGlobal(); Object.entries(m).filter(([,n])=>n).sort((a,b)=>a[1].localeCompare(b[1],'es')).forEach(([id,n])=>gen.add(new Option(n, id))); }catch(e){} }
    }
    function _mlFecha(it){
      const n=Date.parse(it.creado_en||it.actualizado_en||'');
      return Number.isFinite(n)?n:0;
    }
    function _mlOrdenar(filas){
      const orden=document.getElementById('ml-orden').value;
      const cmpTitulo=(a,b)=>String(a.titulo||'').localeCompare(String(b.titulo||''),'es');
      return [...filas].sort((a,b)=>{
        if(orden==='titulo') return cmpTitulo(a,b);
        if(orden==='antiguo') return _mlFecha(a)-_mlFecha(b)||cmpTitulo(a,b);
        if(orden==='nota') return (Number(b.puntuacion??-1)-Number(a.puntuacion??-1))||cmpTitulo(a,b);
        if(orden==='publico') return ((b._info?.va||0)-(a._info?.va||0))||cmpTitulo(a,b);
        if(orden==='prevista') return ((_mlPrevista(b)??-1)-(_mlPrevista(a)??-1))||cmpTitulo(a,b);
        if(orden==='estreno') return ((Number(b.anio)||b._info?.y||0)-(Number(a.anio)||a._info?.y||0))||cmpTitulo(a,b);
        if(orden==='estreno-ant') return ((Number(a.anio)||a._info?.y||9999)-(Number(b.anio)||b._info?.y||9999))||cmpTitulo(a,b);
        if(orden==='corta'){ const r = x => x.tipo==='movie' && x._info?.r ? x._info.r : 9999; return (r(a)-r(b))||cmpTitulo(a,b); }
        return _mlFecha(b)-_mlFecha(a)||cmpTitulo(a,b);
      });
    }
    async function _miListaCargar(soloFiltro){
      if(!soloFiltro) _pintarEspecialesMiLista();
      const turno=++_mlTurno, cont=document.getElementById('biblioteca-lista'), estado=document.getElementById('ml-estado'), btn=document.getElementById('btn-elige-por-mi');
      _mlPrepararSelects();
      const pendiente=bibliotecaTabActual==='pendiente', uid=sesionActual?.user.id;
      btn.style.display=pendiente?'block':'none'; btn.disabled=true;
      const bm=document.getElementById('btn-mundial'); if(bm) bm.style.display=pendiente?'block':'none';
      const opcionNota=document.querySelector('#ml-orden option[value="nota"]');
      opcionNota.disabled=pendiente;
      if(pendiente&&document.getElementById('ml-orden').value==='nota') document.getElementById('ml-orden').value='reciente';
      const usarCache = soloFiltro && window._mlCache?.uid===uid;
      if(!usarCache){ estado.textContent='Cargando tu lista…'; cont.setAttribute('aria-busy','true'); cont.replaceChildren(); }
      if(!uid){estado.textContent='Inicia sesión para consultar tu lista.';cont.setAttribute('aria-busy','false');return;}
      try{
        const filas=usarCache ? window._mlCache.filas : await _mlLeerTodo(uid);
        if(turno!==_mlTurno||sesionActual?.user.id!==uid) return;
        window._mlCache={uid, filas};
        filas.forEach(it=>{ if(!it._info) it._info=_leerInfoLogro(it.tipo,it.tmdb_id); });
        // género, duración y nota del público necesitan los datos de cada título (se guardan en el dispositivo)
        if(_mlNecesitaInfo()){
          const faltan=filas.filter(it=>_mlBase(it)&&!it._info);
          if(faltan.length){
            let h=0; estado.textContent=`Preparando los filtros… 0 de ${faltan.length}`;
            await _fetchEnLotes(faltan, async it=>{ try{ it._info=_guardarInfoLogro(it.tipo,it.tmdb_id, await _fetchDetalleYCreditos(it.tipo,it.tmdb_id)); }catch(e){} if(turno===_mlTurno) estado.textContent=`Preparando los filtros… ${++h} de ${faltan.length}`; }, 6);
            if(turno!==_mlTurno) return;
          }
        }
        window._mlModelo = _mlVal('ml-orden')==='prevista' ? await _modeloNotaObtener().catch(()=>null) : null;
        if(turno!==_mlTurno) return;
        const verPrev = !!(window._mlModelo && window._mlModelo.fit);
        if(_mlVal('ml-orden')==='prevista' && !verPrev) estado.textContent='Para ordenar por lo que más te va a gustar hacen falta al menos 8 títulos con tu nota.';
        const visibles=_mlOrdenar(_mlFiltrar(filas));
        window.bibliotecaActual=visibles;
        btn.disabled=!visibles.length;
        estado.textContent=visibles.length+' '+(visibles.length===1?'título':'títulos')+(pendiente?(visibles.length===1?' pendiente':' pendientes'):(visibles.length===1?' visto':' vistos'))+(_mlHayFiltros()?' con estos filtros. ':'. ');
        if(_mlHayFiltros()) estado.append(_fEl('button',{class:'ml-quitar-filtros',type:'button',onclick:_mlQuitarFiltros},'Quitar filtros'));
        cont.replaceChildren();
        if(!visibles.length){
          cont.append(_fEl('div',{class:'ml-vacio'},
            _fEl('p',{text:pendiente?'No tienes pendientes con este filtro. Guarda un título desde su ficha o prueba otro tipo.':'Todavía no hay títulos vistos con este filtro.'}),
            _fEl('button',{class:'ml-secundario',type:'button',onclick:()=>irA('p-inicio')},'Buscar algo para ver')));
          return;
        }
        _mlPintarVistaBotones();
        if(_mlVista()==='carteles'){
          // rejilla de pósters: en «Vistas» con tu nota encima
          cont.className='ml-rejilla';
          cont.innerHTML=visibles.map((it,i)=>`<div class="desc-card" onclick="abrirDetalleDesdeBiblioteca(${i})" ${_lp({id:it.tmdb_id,tipo:it.tipo,t:it.titulo,poster:it.poster_path,f:it.anio?it.anio+'-01-01':''})}>
            <div class="desc-poster">${it.poster_path?`<img loading="lazy" src="https://image.tmdb.org/t/p/w342${it.poster_path}" alt="">`:''}${!pendiente&&it.puntuacion!=null?`<span class="desc-marca nota">★ ${it.puntuacion}</span>`:''}${verPrev&&it.puntuacion==null&&_mlPrevista(it)!=null?`<span class="desc-marca prevista">🔮 ${_notaFmt(_mlPrevista(it))}</span>`:''}</div>
            <div class="desc-t">${_escHtml(it.titulo||'Sin título')}</div><div class="desc-m">${it.anio||''}${it.tipo==='tv'?' · Serie':' · Película'}</div></div>`).join('');
          return;
        }
        cont.className='';
        if(pendiente && !window._mlAyudaGestos){ window._mlAyudaGestos=true; estado.append(_fEl('span',{class:'ml-gesto-ayuda',text:' En el móvil: desliza ← para marcar como vista y → para quitarla.'})); }
        cont.replaceChildren(...visibles.map((it,i)=>{
          const info=_fEl('div',{class:'ml-info'},
            _fEl('button',{class:'ml-titulo',type:'button',onclick:()=>abrirDetalleDesdeBiblioteca(i)},String(it.titulo||'Sin título')),
            _fEl('p',{class:'ml-meta',text:[it.anio,it.tipo==='tv'?(it._info?.ns?`Serie · ${it._info.ns} temp.`:'Serie'):'Película',it.tipo==='movie'&&it._info?.r?formatDuracion(it._info.r):'',it._info?.va?'★ '+Number(it._info.va).toFixed(1):'',it.tipo==='tv'&&esAbandonada(it.tmdb_id)?'La dejé':''].filter(Boolean).join(' · ')}));
          if(verPrev&&it.puntuacion==null&&_mlPrevista(it)!=null) info.append(_fEl('span',{class:'ml-prevista',text:'🔮 Le pondrías un '+_notaFmt(_mlPrevista(it))}));
          if(!pendiente) info.append(_fEl('p',{class:'ml-nota',text:it.puntuacion!=null?'Mi valoración: '+it.puntuacion+'/10':'Sin valorar'}));
          else info.append(_fEl('div',{class:'ml-fila-acciones'},
            _fEl('button',{class:'ml-secundario',type:'button',onclick:e=>_mlCambiarEstado(it.id,{visto:true,pendiente:false},e.currentTarget)},'Marcar como vista'),
            _fEl('button',{class:'ml-secundario',type:'button',onclick:e=>quitarDePendientes(it.id,e.currentTarget)},'Quitar de pendientes')));
          const card=_fEl('article',{class:'ml-fila','data-testid':'lista-titulo-'+it.id});
          if(typeof it.poster_path==='string'&&/^\/[^\\]*$/.test(it.poster_path)){
            const img=_fEl('img',{src:'https://image.tmdb.org/t/p/w200'+it.poster_path,alt:'',loading:'lazy',decoding:'async',width:64,height:96});
            img.addEventListener('error',()=>img.remove(),{once:true}); card.append(img);
          }
          card.append(info);
          if(!pendiente) return card;
          // deslizar: ← vista · → quitar de pendientes (con «Deshacer»)
          card.dataset.id=it.id;
          return _fEl('div',{class:'ml-swipe'},_fEl('div',{class:'ml-swipe-bg vista',text:'✓ Vista'}),_fEl('div',{class:'ml-swipe-bg quitar',text:'✕ Quitar'}),card);
        }));
      }catch(e){
        if(turno!==_mlTurno) return;
        window.bibliotecaActual=[];
        estado.textContent='No se pudo cargar tu lista. Tus datos guardados no se han modificado.';
        cont.replaceChildren(_fEl('button',{class:'ml-secundario',type:'button',onclick:()=>cargarBiblioteca()},'Reintentar'));
      }finally{if(turno===_mlTurno)cont.setAttribute('aria-busy','false');}
    }
    function _mlVista(){ try{ return localStorage.getItem('cm:mlVista') || 'lista'; }catch(e){ return 'lista'; } }
    function _mlPintarVistaBotones(){
      const v = _mlVista(), el = document.getElementById('ml-vista-btns'); if(!el) return;
      el.innerHTML = `<div class="desc-vista" role="group" aria-label="Vista">
        <button type="button" class="${v==='carteles'?'activo':''}" onclick="mlCambiarVista('carteles')" aria-label="Carteles" title="Carteles"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5"/></svg></button>
        <button type="button" class="${v==='lista'?'activo':''}" onclick="mlCambiarVista('lista')" aria-label="Lista" title="Lista"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="4" rx="1.5"/><rect x="3" y="10" width="18" height="4" rx="1.5"/><rect x="3" y="16" width="18" height="4" rx="1.5"/></svg></button></div>`;
    }
    function mlCambiarVista(v){ try{ localStorage.setItem('cm:mlVista', v); }catch(e){} _miListaCargar(true); }
    async function _mlCambiarEstado(id,patch,btn){
      const uid=sesionActual?.user.id;if(!uid)return;
      if(btn)btn.disabled=true;
      let antes=null; try{ antes=(await sb.from('mi_biblioteca').select('*').eq('id',id).eq('user_id',uid).maybeSingle()).data; }catch(e){}
      try{
        const {data,error}=await sb.from('mi_biblioteca').update(patch).eq('id',id).eq('user_id',uid).select('id').maybeSingle();
        if(error||!data)throw error||new Error('sin-confirmacion');
        if(sesionActual?.user.id!==uid)return;
        await cargarBiblioteca();
        document.getElementById('ml-estado').textContent=patch.visto?'Marcada como vista. Se mantienen tus notas y episodios.':'Quitada de pendientes. Se mantienen el registro, tus notas y episodios.';
        if(antes) _avisoDeshacer(patch.visto?`✓ «${antes.titulo||''}» marcada como vista`:`«${antes.titulo||''}» quitada de pendientes`, _deshacerFila(antes.tipo, antes.tmdb_id, antes, null));
        refrescarIdsVistos(); cargarParaTi(); cargarContinuarViendo();
        if(peliculaActual)cargarEstadoBiblioteca();
      }catch(e){document.getElementById('ml-estado').textContent='No se ha podido guardar el cambio. No se han borrado datos.';}
      finally{if(btn)btn.disabled=false;}
    }
    async function quitarDePendientes(id,btn){
      await _mlCambiarEstado(id,{pendiente:false},btn); // sin confirmación: el aviso permite deshacerlo
    }
    async function _miListaElegir(){
      if(!sesionActual||bibliotecaTabActual!=='pendiente')return;
      const btn=document.getElementById('btn-elige-por-mi'), uid=sesionActual.user.id;
      const estado=document.getElementById('ml-estado');
      btn.disabled=true;btn.textContent='Eligiendo…';
      try{
        const filas=_mlFiltrar(window._mlCache?.uid===uid ? window._mlCache.filas : await _mlLeerTodo(uid));
        if(!filas.length){estado.textContent='No hay pendientes con este filtro.';return;}
        const it=filas[Math.floor(Math.random()*filas.length)];
        const r=await fetch(`${TMDB_PROXY}?path=/${it.tipo}/${it.tmdb_id}&language=es-ES`);
        if(!r.ok)throw new Error('red');
        const d=await r.json();
        if(!d.id||sesionActual?.user.id!==uid)throw new Error('detalle');
        await abrirDetalle({...d,_tipo:it.tipo,title:d.title||d.name,release_date:d.release_date||d.first_air_date});
      }catch(e){estado.textContent='No se pudo abrir una sugerencia. Tu lista no ha cambiado; puedes reintentarlo.';}
      finally{btn.disabled=false;btn.textContent='Elige una por mí';}
    }
    async function abrirResumen(){
      if(!sesionActual){mostrarCuenta();return;}
      const turno=++_mlResumenTurno,uid=sesionActual.user.id;
      irA('p-resumen');
      const cont=document.getElementById('ml-resumen-cont'),sel=document.getElementById('ml-resumen-year');
      cont.replaceChildren(_fEl('p',{class:'ml-ayuda',role:'status',text:'Preparando tu resumen…'}));
      _mlResumenFilas=[];_mlResumenUsuario=null;
      try{
        const filas=await _mlLeerTodo(uid);
        if(turno!==_mlResumenTurno||sesionActual?.user.id!==uid)return;
        _mlResumenFilas=filas;_mlResumenUsuario=uid;
        const previo=sel.value;
        const years=[...new Set(filas.map(_mlAnoRegistro).filter(Boolean))].sort((a,b)=>b-a);
        sel.replaceChildren(_fEl('option',{value:'todos',text:'Todos los años'}),...years.map(y=>_fEl('option',{value:y,text:String(y)})));
        sel.value=years.includes(Number(previo))?previo:'todos';
        pintarResumen();
      }catch(e){
        if(turno!==_mlResumenTurno)return;
        cont.replaceChildren(_fEl('p',{class:'ml-ayuda',text:'No se pudo consultar el resumen. No se han modificado tus datos.'}),_fEl('button',{class:'ml-secundario',type:'button',onclick:abrirResumen},'Reintentar'));
      }
    }
    function _mlAnoRegistro(it){
      const fecha=new Date(it.creado_en||'');
      return Number.isFinite(fecha.getTime())?fecha.getFullYear():null;
    }
    function pintarResumen(){
      if(_mlResumenUsuario!==sesionActual?.user.id)return;
      const periodo=document.getElementById('ml-resumen-year').value;
      const filas=_mlResumenFilas.filter(it=>periodo==='todos'||_mlAnoRegistro(it)===Number(periodo));
      const vistas=filas.filter(it=>it.visto),pendientes=filas.filter(it=>it.pendiente&&!it.visto);
      const notas=vistas.filter(it=>it.puntuacion!=null&&Number.isFinite(Number(it.puntuacion)));
      const media=notas.length?(notas.reduce((s,it)=>s+Number(it.puntuacion),0)/notas.length).toFixed(1):'—';
      const cont=document.getElementById('ml-resumen-cont');
      const grid=_fEl('div',{class:'ml-resumen-grid'},
        ...[[vistas.length,'Títulos vistos'],[pendientes.length,'Pendientes'],[vistas.filter(it=>it.tipo==='movie').length,'Películas vistas'],[vistas.filter(it=>it.tipo==='tv').length,'Series vistas']].map(([n,t])=>_fEl('div',{class:'ml-dato'},_fEl('strong',{text:String(n)}),_fEl('span',{text:t}))));
      cont.replaceChildren(grid,_fEl('p',{class:'ml-ayuda',text:'Nota media: '+media+(notas.length?' · '+notas.length+(notas.length===1?' título valorado.':' títulos valorados.'):'. Puedes valorar cuando quieras; no es obligatorio.')}),_fEl('h3',{class:'ml-subtitulo',text:'Tus mejor valoradas'}));
      const top=[...notas].sort((a,b)=>Number(b.puntuacion)-Number(a.puntuacion)).slice(0,5);
      if(!top.length)cont.append(_fEl('p',{class:'ml-ayuda',text:'Todavía no hay valoraciones en este periodo.'}));
      top.forEach(it=>cont.append(_fEl('button',{class:'ml-top',type:'button',onclick:async()=>{
        const index=(window.bibliotecaActual=[it]).length-1;
        await abrirDetalleDesdeBiblioteca(index);
      }},_fEl('span',{text:String(it.titulo||'Sin título')}),_fEl('b',{text:it.puntuacion+'/10'}))));
      const sinFecha=_mlResumenFilas.filter(it=>!_mlAnoRegistro(it)).length;
      if(sinFecha)cont.append(_fEl('p',{class:'ml-ayuda',text:sinFecha+(sinFecha===1?' registro sin fecha de alta solo aparece':' registros sin fecha de alta solo aparecen')+' en «Todos los años». No se ha inventado una fecha.'}));
    }
    async function descargarCopiaMiLista(btn){
      if(!sesionActual)return;
      const uid=sesionActual.user.id,estado=document.getElementById('ml-copia-estado');
      btn.disabled=true;estado.textContent='Preparando una copia de todos tus registros…';
      try{
        const filas=await _mlLeerTodo(uid);
        const copia={formato:'CineMood-mi-lista-v1',exportado_en:new Date().toISOString(),registros:filas};
        const url=URL.createObjectURL(new Blob([JSON.stringify(copia,null,2)],{type:'application/json'}));
        const a=document.createElement('a');a.href=url;a.download='CineMood-mi-lista-'+new Date().toISOString().slice(0,10)+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
        estado.textContent='Copia generada: '+filas.length+' registros. Guárdala en privado; no se ha borrado ni modificado nada. Es una copia de datos, no de vídeos.';
      }catch(e){estado.textContent='No se pudo generar una copia completa. No se han modificado tus datos.';}
      finally{btn.disabled=false;}
    }
