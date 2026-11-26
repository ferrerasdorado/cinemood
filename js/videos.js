// CineMood · Mis vídeos (enlaces propios y AllDebrid)
// (Parte de index.html; se carga como script clásico: todo comparte el mismo ámbito global.)

    // ══════════════════════════════════════════════════════════════════════
    // MIS VÍDEOS: enlaces propios (tus webs, o archivos en webs de descargas de terceros).
    //  · «Directo»: un archivo mp4/webm/m3u8 en una dirección https, se reproduce tal cual.
    //  · «AllDebrid»: un enlace de una web de descargas; tu cuenta de AllDebrid lo convierte en un enlace directo.
    // Las peticiones a AllDebrid salen de tu navegador (no de un servidor): su API rechaza conexiones de servidores.
    // La API key se guarda solo en este dispositivo.
    // ══════════════════════════════════════════════════════════════════════
    const VIDEOS_LS = 'cm:videos', ADB_LS = 'cm:adb', ADB_BASE = 'https://api.alldebrid.com/v4';
    const _EXT_DIRECTA = /\.(mp4|m4v|webm|mov|m3u8|mkv|ts|m2ts|flv|avi)$/i;
    const _MODOS = ['auto','directo','alldebrid'];

    function adbKey(){ try{ return localStorage.getItem(ADB_LS) || ''; }catch(e){ return ''; } }
    const _ADB_ERRORES = {
      AUTH_MISSING_APIKEY:'Falta tu API key de AllDebrid.', AUTH_BAD_APIKEY:'La API key de AllDebrid no es válida.',
      AUTH_BLOCKED:'AllDebrid no reconoce este dispositivo: te habrá enviado un correo para confirmarlo. Confírmalo y vuelve a intentarlo.',
      AUTH_USER_BANNED:'Tu cuenta de AllDebrid está bloqueada.', LINK_HOST_NOT_SUPPORTED:'AllDebrid no admite este enlace.', LINK_NOT_SUPPORTED:'AllDebrid no admite este enlace.',
      LINK_DOWN:'El archivo ya no está disponible en la web donde estaba.', LINK_HOST_UNAVAILABLE:'Esa web de descargas está en mantenimiento.',
      LINK_TOO_MANY_DOWNLOADS:'Hay demasiadas descargas a la vez en tu cuenta de AllDebrid.', LINK_HOST_FULL:'Los servidores de esa web están llenos: inténtalo más tarde.',
      LINK_HOST_LIMIT_REACHED:'Has llegado al límite diario de descargas de esa web.', LINK_PASS_PROTECTED:'El enlace tiene contraseña, y esta app todavía no la admite.',
      LINK_ERROR:'AllDebrid no ha podido desbloquear el enlace.', LINK_TEMPORARY_UNAVAILABLE:'El archivo no está disponible ahora mismo en esa web.',
      MUST_BE_PREMIUM:'Para este enlace tu cuenta de AllDebrid tiene que ser premium.', FREE_TRIAL_LIMIT_REACHED:'Has agotado la prueba gratuita de AllDebrid.',
      NO_SERVER:'AllDebrid rechaza esta conexión (¿VPN o red de empresa?).', DELAYED_INVALID_ID:'AllDebrid perdió la petición: vuelve a intentarlo.'
    };
    function _adbMsg(code, msg){ return _ADB_ERRORES[code] || ('AllDebrid respondió con un error: ' + (msg || code || 'desconocido')); }
    async function _adbLlamar(ruta, params){
      const key = adbKey();
      if(!key) throw new Error(_adbMsg('AUTH_MISSING_APIKEY'));
      const cuerpo = params ? new URLSearchParams(params) : null;
      let r;
      try{
        r = await fetch(ADB_BASE+ruta, {method: cuerpo?'POST':'GET', body: cuerpo, headers:{Authorization:'Bearer '+key}, credentials:'omit', referrerPolicy:'no-referrer'});
      }catch(e1){
        // si el navegador bloquea la cabecera Authorization (CORS), se reintenta como petición simple con la clave en la dirección
        try{
          const u = new URL(ADB_BASE+ruta); u.searchParams.set('apikey', key);
          r = await fetch(u, {method: cuerpo?'POST':'GET', body: cuerpo, credentials:'omit', referrerPolicy:'no-referrer'});
        }catch(e2){ throw new Error('No se pudo conectar con AllDebrid desde el navegador (sin red, o bloqueado por CORS).'); }
      }
      let d; try{ d = await r.json(); }catch(e){ throw new Error('AllDebrid devolvió una respuesta que no es JSON.'); }
      if(!d || d.status!=='success') throw new Error(_adbMsg(d && d.error && d.error.code, d && d.error && d.error.message));
      return d.data || {};
    }
    // Devuelve el enlace directo de un enlace de una web de descargas. Si AllDebrid necesita tiempo, espera (máx. 2 min).
    async function adbResolver(enlace, estado){
      const d = await _adbLlamar('/link/unlock', {link: enlace});
      if(d.delayed){
        const fin = Date.now() + 120000, cada = window.__ADB_POLL_MS || 5000;
        while(Date.now() < fin){
          if(estado) estado('AllDebrid está preparando el archivo…');
          await new Promise(res=>setTimeout(res, cada));
          const x = await _adbLlamar('/link/delayed', {id: String(d.delayed)});
          if(x.status===2 && x.link) return {url:x.link, nombre:d.filename||''};
          if(x.status===3) throw new Error('AllDebrid no ha podido generar el enlace.');
        }
        throw new Error('AllDebrid tarda demasiado en preparar el archivo. Inténtalo de nuevo en unos minutos.');
      }
      if(!d.link) throw new Error(Array.isArray(d.streams) && d.streams.length ? 'Este enlace ofrece varias calidades de vídeo, y esa opción todavía no está soportada.' : 'AllDebrid no ha devuelto un enlace directo.');
      return {url:d.link, nombre:d.filename||''};
    }

    // ── Almacenamiento: local, y nube (tabla mis_videos) si hay sesión y existe la tabla ──
    function videosLeer(){
      try{
        const a = JSON.parse(localStorage.getItem(VIDEOS_LS) || '[]');
        return Array.isArray(a) ? a.filter(x=>x && _esTxt(x.id) && _esTxt(x.titulo) && _esTxt(x.enlace) && _MODOS.includes(x.modo)) : [];
      }catch(e){ return []; }
    }
    function videosGuardar(l){ try{ localStorage.setItem(VIDEOS_LS, JSON.stringify(l)); }catch(e){} }
    async function videosSync(){
      window._videosSync = sesionActual ? 'error' : 'local';
      if(!sesionActual) return;
      try{
        const uid = sesionActual.user.id;
        const {data, error} = await sb.from('mis_videos').select('id,titulo,enlace,modo').eq('user_id', uid);
        if(error) throw error;
        const local = videosLeer(), ids = new Set(local.map(v=>v.id));
        (data||[]).forEach(r=>{ if(_esTxt(r.id) && _esTxt(r.titulo) && _esTxt(r.enlace) && _MODOS.includes(r.modo) && !ids.has(r.id)){ local.push({id:r.id, titulo:String(r.titulo).slice(0,120), enlace:String(r.enlace).slice(0,2000), modo:r.modo}); ids.add(r.id); } });
        videosGuardar(local);
        const remotos = new Set((data||[]).map(r=>r.id));
        const nuevos = local.filter(v=>!remotos.has(v.id));
        if(nuevos.length){
          const {error:e2} = await sb.from('mis_videos').upsert(nuevos.map(v=>({id:v.id, user_id:uid, titulo:v.titulo, enlace:v.enlace, modo:v.modo})), {onConflict:'id'});
          if(e2) throw e2;
        }
        window._videosSync = 'nube';
      }catch(e){ window._videosSync = 'error'; }
    }

    // ── Pantalla «Mis vídeos» ──
    async function abrirVideos(){
      irA('p-videos');
      document.getElementById('adb-key').value = adbKey();
      renderVideos();
      await videosSync();
      renderVideos();
    }
    function renderVideos(){
      const lista = videosLeer(), cont = document.getElementById('vid-lista');
      if(!lista.length) cont.replaceChildren(_fEl('p',{class:'fte-msg',text:'Todavía no has añadido ningún vídeo.'}));
      else cont.replaceChildren(...lista.map(v=>{
        const etiqueta = {auto:'Automático', directo:'Directo', alldebrid:'AllDebrid'}[v.modo];
        return _fEl('div',{class:'addon-card'},
          _fEl('b',{text:v.titulo}),
          _fEl('span',{text:etiqueta+' · '+(()=>{ try{ return new URL(v.enlace).host; }catch(e){ return ''; } })()}),
          _fEl('div',{class:'vid-acciones'},
            _fEl('button',{class:'btn-limpiar',type:'button','aria-label':'Reproducir '+v.titulo,onclick:()=>reproducirVideo(v.id)},'▶ Reproducir'),
            _fEl('button',{class:'btn-limpiar',type:'button','aria-label':'Quitar '+v.titulo,onclick:()=>videoQuitar(v.id)},'Quitar')));
      }));
      const est = {nube:'Sincronizados con tu cuenta.', local:'Solo en este dispositivo. Inicia sesión para sincronizarlos.', error:'Solo en este dispositivo: para sincronizarlos hay que crear la tabla mis_videos en Supabase.'}[window._videosSync || 'local'];
      document.getElementById('vid-sync').textContent = est;
    }
    async function videoAnadir(){
      const err = document.getElementById('vid-error'); err.style.color = '#b3261e'; err.textContent = '';
      const titulo = document.getElementById('vid-titulo').value.trim().slice(0,120);
      const enlace = document.getElementById('vid-enlace').value.trim();
      const modo = document.getElementById('vid-modo').value;
      try{
        if(!titulo) throw new Error('Ponle un título.');
        let u; try{ u = new URL(enlace); }catch(e){ throw new Error('El enlace no es una URL válida.'); }
        if(!/^https?:$/.test(u.protocol)) throw new Error('El enlace tiene que empezar por https://');
        if(modo==='directo' && !_urlSegura(u.href)) throw new Error('Un enlace directo tiene que ser https.');
        const v = {id: (crypto.randomUUID ? crypto.randomUUID() : 'v'+Date.now()+Math.random().toString(16).slice(2)), titulo, enlace: u.href, modo};
        videosGuardar([...videosLeer(), v]);
        document.getElementById('vid-titulo').value = ''; document.getElementById('vid-enlace').value = '';
        renderVideos();
        if(sesionActual){ try{ await sb.from('mis_videos').upsert({id:v.id, user_id:sesionActual.user.id, titulo:v.titulo, enlace:v.enlace, modo:v.modo}, {onConflict:'id'}); }catch(e){} }
      }catch(e){ err.textContent = e.message; }
    }
    async function videoQuitar(id){
      videosGuardar(videosLeer().filter(v=>v.id!==id));
      renderVideos();
      if(sesionActual){ try{ await sb.from('mis_videos').delete().eq('user_id', sesionActual.user.id).eq('id', id); }catch(e){} }
    }
    async function reproducirVideo(id){
      const v = videosLeer().find(x=>x.id===id); if(!v) return;
      const est = document.getElementById('vid-estado'); est.className = 'fte-msg'; est.textContent = 'Preparando…';
      try{
        let url = v.enlace, via = 'Directo', nombre = '';
        const directo = v.modo==='directo' || (v.modo==='auto' && _EXT_DIRECTA.test(new URL(v.enlace).pathname));
        if(!directo){ const r = await adbResolver(v.enlace, t=>{ est.textContent = t; }); url = r.url; nombre = r.nombre; via = 'AllDebrid'; }
        const s = _fuenteLimpia({url, name:v.titulo, behaviorHints: nombre ? {filename: nombre} : undefined});
        const c = _clasificarFuente(s);
        if(c.tipo!=='play') throw new Error('Se ha obtenido el archivo'+(nombre?' («'+nombre+'»)':'')+', pero no se puede reproducir aquí: '+(c.motivo||'formato no compatible'));
        est.textContent = '';
        reproducirFuente(s, {tipo:'video', tmdbId:v.id, titulo:v.titulo, fuente:via});
      }catch(e){ est.className = 'fte-msg fte-err'; est.textContent = e.message; }
    }
    async function adbGuardar(){
      const est = document.getElementById('adb-estado'); est.style.color = '#b3261e'; est.textContent = '';
      const k = document.getElementById('adb-key').value.trim();
      try{
        if(!k){ localStorage.removeItem(ADB_LS); est.style.color = ''; est.textContent = 'Clave borrada de este dispositivo.'; return; }
        localStorage.setItem(ADB_LS, k);
        est.style.color = ''; est.textContent = 'Probando…';
        const d = await _adbLlamar('/user'); const u = d.user || {};
        est.style.color = u.isPremium ? '#1e7a3a' : '#b3261e';
        est.textContent = 'Conectado como '+(u.username||'?')+' · '+(u.isPremium ? 'cuenta premium' : 'cuenta sin premium (muchos enlaces no funcionarán)');
      }catch(e){ est.style.color = '#b3261e'; est.textContent = e.message; }
    }
