// CineMood · «Buscar también en webs de descargas» (Cinecalidad) dentro de la hoja «Ver»
// (Se carga como script clásico: todo comparte el mismo ámbito global.)
//
// Es una búsqueda aparte de tus addons: la función de Supabase «cinemood-hosters» busca la ficha en
// Cinecalidad y extrae los enlaces de alojamiento (1fichier, Mega…); tu cuenta de AllDebrid los convierte
// en un enlace directo que se puede reproducir o descargar como cualquier otra fuente.
// Solo se busca cuando abres la sección, para no hacer peticiones que no vas a usar.

    const _HOSTERS_PERMITIDOS = ['1fichier.com','mega.nz','mega.co.nz','megaup.net','mediafire.com','rapidgator.net','ddownload.com'];

    async function _hostersApi(cuerpo){
      const {data, error} = await sb.auth.getSession();
      if(error || !data.session) throw new Error('Inicia sesión en CineMood para buscar en webs de descargas.');
      let r;
      try{
        r = await fetch(SUPABASE_URL+'/functions/v1/cinemood-hosters', {method:'POST', credentials:'omit',
          headers:{Authorization:'Bearer '+data.session.access_token, apikey:SUPABASE_KEY, 'Content-Type':'application/json'},
          body:JSON.stringify(cuerpo), signal:AbortSignal.timeout(40000)});
      }catch(e){
        throw new Error(e && e.name==='TimeoutError' ? 'Cinecalidad tarda demasiado en responder. Inténtalo más tarde.' : 'No se pudo conectar con el buscador de webs. Comprueba tu conexión.');
      }
      let d; try{ d = await r.json(); }catch(e){ throw new Error('El buscador de webs ha devuelto una respuesta no válida.'); }
      if(!r.ok) throw new Error(d && d.error ? String(d.error) : 'El buscador de webs ha fallado (error '+r.status+').');
      return d;
    }
    function _hosterSeguro(raw){
      try{
        const u = new URL(raw);
        return u.protocol==='https:' && !u.username && !u.password && _HOSTERS_PERMITIDOS.some(h=>u.hostname===h || u.hostname.endsWith('.'+h)) ? u.href : null;
      }catch(e){ return null; }
    }

    // Sección plegable que se añade al final de la hoja «Ver»
    function _hostersSeccion(ctx){
      const ep = ctx.tipo==='tv' ? ` · T${ctx.season} E${ctx.episode}` : '';
      const estado = _fEl('p',{class:'fte-msg',role:'status','aria-live':'polite'});
      const resultados = _fEl('div',{class:'hst-lista'});
      const consulta = _fEl('input',{type:'search',value:ctx.titulo,'aria-label':'Título para buscar en Cinecalidad',
        onkeydown:e=>{ if(e.key==='Enter'){ e.preventDefault(); buscar(); } }});
      const boton = _fEl('button',{type:'button',class:'fte-btn',onclick:()=>buscar()},'Buscar');
      const sigueAbierta = ()=>window._fte===ctx;
      let turno = 0, buscada = false;

      async function buscar(){
        const mio = ++turno, vigente = ()=>mio===turno && sigueAbierta();
        estado.replaceChildren(_fteCargando('Buscando en Cinecalidad…')); resultados.replaceChildren(); boton.disabled = true;
        try{
          const d = await _hostersApi({action:'search', title:consulta.value.trim()||ctx.titulo, type:ctx.tipo, season:ctx.season, episode:ctx.episode});
          if(!vigente()) return;
          const fichas = Array.isArray(d.results) ? d.results : [];
          estado.textContent = fichas.length ? `${fichas.length} ${fichas.length===1?'ficha encontrada':'fichas encontradas'}. Abre la que corresponda${ctx.tipo==='tv'?' a la serie':' a la película'}.`
            : 'No hay coincidencias. Prueba con otro título (por ejemplo, el original).';
          resultados.replaceChildren(...fichas.map(f=>_hostersFicha(f, ctx, vigente)));
        }catch(e){ if(vigente()) estado.textContent = e.message; }
        finally{ if(vigente()) boton.disabled = false; }
      }
      const seccion = _fEl('details',{class:'fte-plegable hst'},
        _fEl('summary',{}, _fEl('span',{text:'Buscar también en webs de descargas'}), _fEl('small',{text:'Cinecalidad · necesita AllDebrid'})),
        _fEl('div',{class:'fte-plegable-cuerpo'},
          _fEl('p',{class:'fte-nota-corta',text:`Búsqueda aparte de tus addons${ep}. Comprueba título, año e idioma: no se verifican automáticamente.`}),
          _fEl('div',{class:'hst-buscar'}, consulta, boton), estado, resultados));
      seccion.addEventListener('toggle', ()=>{ if(seccion.open && !buscada){ buscada = true; buscar(); } });
      return seccion;
    }

    // Una ficha de Cinecalidad: al confirmarla se extraen sus enlaces de alojamiento
    function _hostersFicha(ficha, ctx, vigente){
      const nota = _fEl('p',{class:'fte-msg',role:'status'}), enlaces = _fEl('div',{});
      const confirmar = _fEl('button',{type:'button',class:'fte-btn fte-btn-sec',onclick:async()=>{
        confirmar.disabled = true; nota.replaceChildren(_fteCargando('Sacando los enlaces…'));
        try{
          const x = await _hostersApi({action:'extract', page:ficha.page, season:ctx.season, episode:ctx.episode});
          if(!vigente()) return;
          const lista = (x.links||[]).filter(l=>_hosterSeguro(l.url));
          nota.textContent = lista.length ? `${lista.length} ${lista.length===1?'enlace':'enlaces'}. Audio y subtítulos sin verificar.` : 'Esta ficha no tiene enlaces que se puedan usar.';
          enlaces.replaceChildren(...lista.map(l=>_hostersEnlace(l, ctx, vigente)), ...(x.notes||[]).map(t=>_fEl('p',{class:'fte-nota-corta',text:t})));
          confirmar.hidden = lista.length>0;
        }catch(e){ if(vigente()) nota.textContent = e.message; }
        finally{ confirmar.disabled = false; }
      }}, ctx.tipo==='tv' ? `Es esta serie: buscar T${ctx.season} E${ctx.episode}` : 'Es esta película: ver enlaces');
      return _fEl('div',{class:'hst-ficha'},
        _fEl('b',{text:ficha.title}),
        _fEl('small',{text: ficha.match==='titulo-coincidente' ? 'El título coincide (año sin verificar)' : 'Coincidencia parcial: comprueba que sea esta'}),
        confirmar, nota, enlaces);
    }
    // Un enlace de alojamiento: AllDebrid lo convierte en un enlace directo y se muestra como una fuente más
    function _hostersEnlace(l, ctx, vigente){
      const destino = _hosterSeguro(l.url), est = _fEl('p',{class:'fte-msg',role:'status'}), salida = _fEl('div',{});
      const resolver = _fEl('button',{type:'button',class:'fte-btn fte-btn-sec',onclick:async()=>{
        if(!adbKey()){ est.textContent = 'Primero guarda tu clave de AllDebrid en Tú → Mis vídeos → AllDebrid.'; return; }
        resolver.disabled = true; est.replaceChildren(_fteCargando('Resolviendo con AllDebrid…'));
        try{
          const r = await adbResolver(destino, msg=>{ if(vigente()) est.textContent = msg; });
          if(!vigente()) return;
          const url = _urlSegura(r.url); if(!url) throw new Error('AllDebrid ha devuelto un enlace no válido.');
          est.textContent = 'Listo. Comprueba el nombre del archivo; el enlace caduca al cabo de un tiempo.';
          salida.replaceChildren(_fteFila({url, name:'Cinecalidad · '+l.host, description:r.nombre||'Archivo sin nombre', filename:r.nombre||''}, {nombre:'Cinecalidad'}, {...ctx, fuente:'Cinecalidad'}));
          resolver.textContent = 'Volver a resolver';
        }catch(e){ if(vigente()) est.textContent = e.message; }
        finally{ resolver.disabled = false; }
      }},'Resolver con AllDebrid');
      return _fEl('div',{class:'hst-enlace'}, _fEl('span',{text:l.host+' · '+(l.label||'Enlace de alojamiento')}), resolver, est, salida);
    }
