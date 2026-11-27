// CineMood · Reproductor interno (HTML5, hls.js y mpegts.js)
// (Parte de index.html; se carga como script clásico: todo comparte el mismo ámbito global.)

    // ── Reproductor interno: Media3 ExoPlayer en app Android TV + HTML5/hls.js/mpegts.js en web ──
    function _progKey(ctx){ return 'cm:prog:'+ctx.tipo+':'+ctx.tmdbId+(ctx.tipo==='tv'?':'+ctx.season+':'+ctx.episode:''); }
    const _libsStream = {};
    function _cargarLibStream(url, check){
      if(check()) return Promise.resolve(true);
      if(_libsStream[url]) return _libsStream[url];
      return (_libsStream[url] = new Promise(res=>{
        const sc = document.createElement('script');
        sc.src = url; sc.async = true;
        sc.onload = ()=>res(!!check());
        sc.onerror = ()=>{ delete _libsStream[url]; res(false); };
        document.head.appendChild(sc);
      }));
    }
    function _limpiarMotoresVisor(){
      if(window._visorHls){ try{ window._visorHls.destroy(); }catch(e){} window._visorHls = null; }
      if(window._visorMpegts){ try{ window._visorMpegts.unload(); window._visorMpegts.detachMediaElement(); window._visorMpegts.destroy(); }catch(e){} window._visorMpegts = null; }
    }
    async function _enviarSubtitulosAddonsATV(ctx, turnoTV){
      if(!window.CineMoodTV || typeof window.CineMoodTV.anadirSubtitulos !== 'function') return;
      try{
        if(ctx.tipo !== 'movie' && ctx.tipo !== 'tv') return;
        const imdb = await _imdbIdDe(ctx.tipo, ctx.tmdbId);
        if(window._visorTurnoTV !== turnoTV) return;
        const type = ctx.tipo==='tv' ? 'series' : 'movie';
        const id = ctx.tipo==='tv' ? `${imdb}:${ctx.season}:${ctx.episode}` : imdb;
        const addons = addonsLeer().filter(a=>_addonManeja(a,'subtitles',type,id));
        if(!addons.length) return;
        const acumulados = [];
        await Promise.all(addons.map(async a=>{
          try{
            const d = await _fetchAddon(_addonUrl(a,'subtitles',type,id));
            const items = (Array.isArray(d&&d.subtitles)?d.subtitles:[]).filter(x=>x&&_urlSegura(x.url)).slice(0,40);
            items.forEach((x,i)=>acumulados.push({
              url: _urlSegura(x.url),
              lang: String(x.lang||x.language||'und').slice(0,24),
              label: (String(x.label||x.lang||'Subtítulo').slice(0,70)+' · '+a.nombre+' #'+(i+1))
            }));
          }catch(e){}
        }));
        if(window._visorTurnoTV === turnoTV && acumulados.length){
          window.CineMoodTV.anadirSubtitulos(JSON.stringify(acumulados.slice(0,80)));
        }
      }catch(e){}
    }
    async function reproducirFuente(s, ctx){
      const src = _urlStreamValida(s.url); if(!src) return;
      const key = _progKey(ctx);
      const subTxt = [ctx.tipo==='tv'?`T${ctx.season} · E${ctx.episode}`:'', ctx.fuente].filter(Boolean).join(' · ');
      if(_tieneExoNativo()){
        const turnoTV = (window._visorTurnoTV = (window._visorTurnoTV||0) + 1);
        const inicioSeg = Math.max(0, Math.floor(parseFloat(localStorage.getItem(key)||'0') || 0));
        window.CineMoodTV.reproducir(JSON.stringify({
          url: src,
          titulo: String(ctx.titulo||'CineMood'),
          subtitulo: subTxt,
          progKey: key,
          inicioSeg,
          headers: s.reqHeaders || null,
          subtitulos: Array.isArray(s.subtitles) ? s.subtitles : []
        }));
        _enviarSubtitulosAddonsATV(ctx, turnoTV);
        return;
      }
      const ov = document.getElementById('visor'), v = document.getElementById('visor-video'), err = document.getElementById('visor-error');
      const miTurno = (window._visorTurno = (window._visorTurno||0) + 1);
      _limpiarMotoresVisor();
      window._visorSrcActual = src;
      const vlcLink=document.getElementById('visor-vlc-link');
      vlcLink.href=(_esVLCiOS()||_esAndroid()) ? (_vlcHref(src,'stream',ctx.titulo)||'#') : '#';
      vlcLink.textContent=(_esVLCiOS()||_esAndroid()) ? 'Abrir en VLC' : 'Abrir en VLC (.m3u)';
      err.hidden = true;
      document.getElementById('visor-titulo').textContent = ctx.titulo;
      document.getElementById('visor-sub').textContent = subTxt;
      _subtitulosPreparar(ctx);
      let ultimo = Date.now(), retomoAplicado = false, fallbackHlsIntentado = false;
      const retomar = ()=>{
        if(retomoAplicado) return; retomoAplicado = true;
        const t = parseFloat(localStorage.getItem(key)||'0');
        if(t>5 && (!isFinite(v.duration) || t<v.duration*0.92)){ try{ v.currentTime = t; }catch(e){} }
      };
      const guardar = ()=>{ if(v.currentTime>1 && (!isFinite(v.duration) || v.duration>10)) { try{ localStorage.setItem(key, String(v.currentTime)); }catch(e){} } };
      const mostrarError = detalle=>{
        if(miTurno !== window._visorTurno) return;
        _visorProblema('No se puede reproducir aquí: '+detalle, s, ctx);
      };
      // Vigilancia: si a los 12 s no ha empezado, o se ve pero sin sonido (audio que el navegador no descodifica,
      // como DTS o AC-3), se ofrece otra fuente que sí se vea aquí, o VLC, en vez de quedarse cargando sin fin
      clearTimeout(window._visorVigia);
      window._visorVigia = setTimeout(()=>{
        if(miTurno === window._visorTurno && v.readyState < 1 && err.hidden)
          _visorProblema('Esta fuente no arranca: probablemente su formato no se puede ver en el navegador.', s, ctx, true);
      }, 12000);
      v.onplaying = ()=>{
        if(miTurno !== window._visorTurno) return;
        err.hidden = true;
        if(!('webkitAudioDecodedByteCount' in v)) return;
        setTimeout(()=>{
          if(miTurno === window._visorTurno && !v.paused && !v.muted && v.currentTime > 1.5 && v.webkitAudioDecodedByteCount === 0 && err.hidden)
            _visorProblema('Se ve pero sin sonido: el audio de esta fuente no se puede reproducir en el navegador.', s, ctx, true);
        }, 5000);
      };
      v.onloadedmetadata = ()=>{ clearTimeout(window._visorVigia); retomar(); };
      v.ontimeupdate = ()=>{ if(Date.now()-ultimo>10000){ ultimo = Date.now(); guardar(); } };
      v.onpause = guardar;
      v.onended = ()=>{ try{ localStorage.removeItem(key); }catch(e){} };
      window._visorGuardar = guardar;
      ov.classList.add('activo');
      document.body.style.overflow = 'hidden';

      const ext = _extDeFuente(s, src);
      const iniciarPlay = ()=>{ const p = v.play(); if(p && p.catch) p.catch(()=>{}); };

      if(ext === 'm3u8'){
        const nativoHls = !!v.canPlayType('application/vnd.apple.mpegurl');
        if(!nativoHls){
          const okHls = await _cargarLibStream('https://cdn.jsdelivr.net/npm/hls.js@1.5.17/dist/hls.min.js', ()=>!!(window.Hls && window.Hls.isSupported));
          if(miTurno !== window._visorTurno) return;
          if(okHls && window.Hls.isSupported()){
            const hls = new window.Hls({enableWorker:true, backBufferLength:60});
            window._visorHls = hls;
            hls.on(window.Hls.Events.MANIFEST_PARSED, ()=>{ retomar(); iniciarPlay(); });
            hls.on(window.Hls.Events.ERROR, (_, data)=>{
              if(!data || !data.fatal) return;
              if(data.type === window.Hls.ErrorTypes.NETWORK_ERROR) mostrarError('Error de red o bloqueo CORS al cargar la lista HLS.');
              else if(data.type === window.Hls.ErrorTypes.MEDIA_ERROR){ try{ hls.recoverMediaError(); }catch(e){ mostrarError('No se pudo decodificar el flujo HLS.'); } }
              else mostrarError('No se pudo iniciar el flujo HLS.');
            });
            hls.loadSource(src);
            hls.attachMedia(v);
            return;
          }
        }
      } else if(['ts','m2ts','flv'].includes(ext)){
        const okTs = await _cargarLibStream('https://cdn.jsdelivr.net/npm/mpegts.js@1.8.2/dist/mpegts.js', ()=>!!(window.mpegts && window.mpegts.isSupported));
        if(miTurno !== window._visorTurno) return;
        if(okTs && window.mpegts.isSupported()){
          try{
            const tipoTs = ext==='flv' ? 'flv' : 'mpegts';
            const mp = window.mpegts.createPlayer({type: tipoTs, isLive: false, url: src}, {enableWorker: true, lazyLoadMaxDuration: 180});
            window._visorMpegts = mp;
            mp.on(window.mpegts.Events.ERROR, (_, det)=>mostrarError('Flujo '+ext.toUpperCase()+' no accesible desde el navegador ('+(det||'posible bloqueo CORS')+').'));
            mp.attachMediaElement(v);
            mp.load();
            iniciarPlay();
            return;
          }catch(e){}
        }
      }

      v.onerror = async()=>{
        if(miTurno !== window._visorTurno) return;
        // Si una dirección sin extensión resulta ser HLS en un navegador sin HLS nativo, probar hls.js una vez
        if(!fallbackHlsIntentado && !ext && !v.canPlayType('application/vnd.apple.mpegurl')){
          fallbackHlsIntentado = true;
          const okHls = await _cargarLibStream('https://cdn.jsdelivr.net/npm/hls.js@1.5.17/dist/hls.min.js', ()=>!!(window.Hls && window.Hls.isSupported));
          if(miTurno === window._visorTurno && okHls && window.Hls.isSupported()){
            v.onerror = null;
            const hls = new window.Hls({enableWorker:true});
            window._visorHls = hls;
            hls.on(window.Hls.Events.MANIFEST_PARSED, ()=>{ err.hidden = true; retomar(); iniciarPlay(); });
            hls.on(window.Hls.Events.ERROR, (_, data)=>{ if(data && data.fatal) mostrarError('El formato o códec no es compatible con este navegador.'); });
            hls.loadSource(src); hls.attachMedia(v);
            return;
          }
        }
        const msg = {1:'La carga se interrumpió.',2:'Error de red al cargar el vídeo.',3:'El códec de vídeo o audio no se pudo decodificar aquí.',4:'Este navegador no admite este contenedor/códec o el enlace no responde.'}[v.error&&v.error.code] || 'Formato no admitido directamente.';
        mostrarError(msg);
      };
      v.src = src;
      iniciarPlay();
    }
    // Aviso dentro del reproductor con salidas: otra fuente que se vea aquí, VLC o seguir esperando
    function _visorProblema(texto, s, ctx, puedeEsperar){
      const err = document.getElementById('visor-error');
      const lista = window._fteReproducibles || [];
      const i = lista.findIndex(x=>x.s.url===s.url);
      const otra = lista.slice(i+1).find(x=>x.s.url!==s.url) || (i<0 ? lista[0] : null);
      err.replaceChildren(
        _fEl('p',{text:texto}),
        _fEl('div',{class:'visor-error-acc'},
          otra ? _fEl('button',{type:'button',class:'visor-btn prim',onclick:()=>reproducirFuente(otra.s,{...ctx,fuente:otra.s.name||otra.a.nombre})},'Probar otra que se ve aquí') : null,
          _fEl('button',{type:'button',class:'visor-btn',onclick:ev=>{ _abrirVLCVisor(ev); if(_esVLCiOS() && !_esAndroid()) location.href = document.getElementById('visor-vlc-link').href; }},'Abrir en VLC'),
          puedeEsperar ? _fEl('button',{type:'button',class:'visor-btn',onclick:()=>{ err.hidden = true; }},'Seguir esperando') : null));
      err.hidden = false;
    }
    function cerrarVisor(){
      const ov = document.getElementById('visor'), v = document.getElementById('visor-video');
      if(!ov.classList.contains('activo')) return;
      window._visorTurno = (window._visorTurno||0) + 1;
      window._visorSrcActual = '';
      if(window._visorGuardar) window._visorGuardar();
      v.onpause = v.ontimeupdate = v.onerror = v.onended = v.onloadedmetadata = v.onplaying = null;
      clearTimeout(window._visorVigia);
      _limpiarMotoresVisor();
      v.pause(); v.removeAttribute('src'); v.load();
      document.getElementById('visor-vlc-link').removeAttribute('href');
      _subtitulosCerrar();
      ov.classList.remove('activo');
      if(!document.getElementById('fuentes-modal').classList.contains('activo')) document.body.style.overflow = '';
    }
