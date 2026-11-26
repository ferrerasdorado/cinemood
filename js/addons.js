// CineMood · Addons (protocolo de Stremio): instalar, guardar y consultar
// (Parte de index.html; se carga como script clásico: todo comparte el mismo ámbito global.)

    // ══════════════════════════════════════════════════════════════════════
    // FUENTES (addons): protocolo de addons de Stremio. Pegas la URL del manifest de un addon
    // y, en la ficha, «▶ Ver» pregunta a todos tus addons por fuentes de ese título.
    // Todo lo que devuelve un addon es no fiable: se pinta siempre con textContent, nunca con innerHTML.
    // ══════════════════════════════════════════════════════════════════════
    const ADDONS_LS = 'cm:addons';
    const ADDON_MS = 8000;
    const _LOCALHOST = /^(localhost|127\.0\.0\.1|\[::1\])$/;

    function _fEl(tag, props, ...kids){
      const e = document.createElement(tag);
      for(const [k,v] of Object.entries(props||{})){
        if(v==null||v===false) continue;
        if(k==='class') e.className = v;
        else if(k==='text') e.textContent = v;
        else if(k.startsWith('on') && typeof v==='function') e.addEventListener(k.slice(2), v);
        else e.setAttribute(k, v===true?'':String(v));
      }
      kids.flat(Infinity).forEach(c=>{ if(c==null||c===false) return; e.append(c.nodeType?c:document.createTextNode(String(c))); });
      return e;
    }
    // https siempre; http solo en localhost (pruebas). El resto se rechaza.
    function _urlSegura(u){
      try{ const x=new URL(String(u)); if(x.protocol==='https:') return x.href; if(x.protocol==='http:'&&_LOCALHOST.test(x.hostname)) return x.href; }catch(e){}
      return null;
    }
    function _urlHttps(u){ try{ const x=new URL(String(u)); return x.protocol==='https:'?x.href:null; }catch(e){ return null; } }
    function _addonBase(input){
      let u = String(input||'').trim();
      if(!u) throw new Error('Escribe la dirección del manifest del addon.');
      if(u.startsWith('stremio://')) u = 'https://'+u.slice(10);
      let url; try{ url=new URL(u); }catch(e){ throw new Error('Esa dirección no es una URL válida.'); }
      if(!_urlSegura(url.href)) throw new Error('Solo se admiten direcciones https.');
      return url.origin + url.pathname.replace(/\/manifest\.json$/,'').replace(/\/+$/,'');
    }
    async function _fetchAddon(url){
      const ctrl = new AbortController();
      const t = setTimeout(()=>ctrl.abort(), ADDON_MS);
      try{
        const r = await fetch(url, {signal:ctrl.signal, credentials:'omit', referrerPolicy:'no-referrer'});
        if(!r.ok) throw new Error('El addon respondió con el error '+r.status+'.');
        return await r.json();
      }catch(e){
        if(e.name==='AbortError') throw new Error('No respondió en '+Math.round(ADDON_MS/1000)+' s.');
        if(e instanceof SyntaxError) throw new Error('La respuesta no es JSON válido.');
        if(/^El addon/.test(e.message)) throw e;
        throw new Error('No se pudo conectar (addon caído, sin CORS o sin conexión).');
      }finally{ clearTimeout(t); }
    }
    const _esTxt = x=>typeof x==='string' && x.length>0;
    function _manifestLimpio(m){
      if(!m || typeof m!=='object' || Array.isArray(m) || !_esTxt(m.id) || !_esTxt(m.name) || !Array.isArray(m.resources)) return null;
      const tipos = (Array.isArray(m.types)?m.types:[]).filter(_esTxt);
      const pref = Array.isArray(m.idPrefixes)?m.idPrefixes.filter(_esTxt):null;
      const resources = m.resources.slice(0,30).map(r=>{
        if(typeof r==='string') return {name:r, types:tipos, idPrefixes:pref};
        if(r && _esTxt(r.name)) return {name:r.name, types:Array.isArray(r.types)?r.types.filter(_esTxt):tipos, idPrefixes:Array.isArray(r.idPrefixes)?r.idPrefixes.filter(_esTxt):pref};
        return null;
      }).filter(Boolean);
      if(!resources.length) return null;
      const bh = m.behaviorHints && typeof m.behaviorHints==='object' ? m.behaviorHints : {};
      return {nombre:String(m.name).slice(0,120), version:String(m.version||'').slice(0,40), descripcion:String(m.description||'').slice(0,400), resources, configurationRequired:!!bh.configurationRequired};
    }

    // ── Almacenamiento: localStorage, y nube (tabla mis_addons) si hay sesión y existe la tabla ──
    function addonsLeer(){
      try{
        const a = JSON.parse(localStorage.getItem(ADDONS_LS)||'[]');
        if(!Array.isArray(a)) return [];
        return a.filter(x=>x && _esTxt(x.url) && _urlSegura(x.url) && Array.isArray(x.resources) && _esTxt(x.nombre));
      }catch(e){ return []; }
    }
    function addonsGuardar(lista){ try{ localStorage.setItem(ADDONS_LS, JSON.stringify(lista)); }catch(e){} }
    async function addonsSync(){
      window._addonsSync = sesionActual ? 'error' : 'local';
      if(!sesionActual) return;
      try{
        const uid = sesionActual.user.id;
        const {data, error} = await sb.from('mis_addons').select('transport_url,manifest').eq('user_id', uid);
        if(error) throw error;
        const local = addonsLeer(); const urls = new Set(local.map(a=>a.url));
        (data||[]).forEach(r=>{
          const m = _manifestLimpio({id:'x', name:r.manifest&&r.manifest.nombre, resources:r.manifest&&r.manifest.resources});
          if(m && _urlSegura(r.transport_url) && !urls.has(r.transport_url)){
            local.push({url:r.transport_url, nombre:String(r.manifest.nombre).slice(0,120), version:String(r.manifest.version||'').slice(0,40), descripcion:String(r.manifest.descripcion||'').slice(0,400), resources:m.resources});
            urls.add(r.transport_url);
          }
        });
        addonsGuardar(local);
        const remotos = new Set((data||[]).map(r=>r.transport_url));
        const nuevos = local.filter(a=>!remotos.has(a.url));
        if(nuevos.length){
          const {error:e2} = await sb.from('mis_addons').upsert(nuevos.map(a=>({user_id:uid, transport_url:a.url, manifest:a})), {onConflict:'user_id,transport_url'});
          if(e2) throw e2;
        }
        window._addonsSync = 'nube';
      }catch(e){ window._addonsSync = 'error'; }
    }

    // ── Pantalla «Mis addons» ──
    async function abrirAddons(){
      irA('p-addons');
      renderAddons();
      await addonsSync();
      renderAddons();
    }
    function renderAddons(){
      const lista = addonsLeer(); const cont = document.getElementById('addon-lista');
      if(!lista.length) cont.replaceChildren(_fEl('p',{class:'fte-msg',text:'Aún no has añadido ningún addon. Sin addons, el botón «Ver» de las fichas no tiene de dónde sacar fuentes.'}));
      else cont.replaceChildren(...lista.map(a=>{
        const res = Array.from(new Set(a.resources.map(r=>r.name))).join(', ');
        return _fEl('div',{class:'addon-card'},
          _fEl('b',{text:a.nombre+(a.version?'  ·  v'+a.version:'')}),
          a.descripcion && _fEl('span',{text:a.descripcion}),
          _fEl('span',{text:'Recursos: '+res}),
          _fEl('button',{class:'btn-limpiar',type:'button','aria-label':'Quitar '+a.nombre,onclick:()=>addonQuitar(a.url)},'Quitar'));
      }));
      const est = {nube:'Sincronizados con tu cuenta.', local:'Solo en este dispositivo. Inicia sesión para sincronizarlos.', error:'Solo en este dispositivo: para sincronizarlos hay que crear la tabla mis_addons en Supabase.'}[window._addonsSync||'local'];
      document.getElementById('addon-sync').textContent = est;
    }
    async function addonInstalar(){
      const inp = document.getElementById('addon-url'), err = document.getElementById('addon-error'), btn = document.getElementById('addon-btn');
      err.style.color = '#b3261e'; err.textContent = '';
      btn.classList.add('loading');
      try{
        const url = _addonBase(inp.value) + '/manifest.json';
        if(addonsLeer().some(a=>a.url===url)) throw new Error('Ese addon ya está añadido.');
        const m = _manifestLimpio(await _fetchAddon(url));
        if(!m) throw new Error('La respuesta no es un manifest de addon válido.');
        if(m.configurationRequired) throw new Error('«'+m.nombre+'» necesita configuración antes de añadirse. Configúralo en la web de su autor y pega aquí la dirección que te dé.');
        delete m.configurationRequired;
        const entrada = {url, ...m};
        addonsGuardar([...addonsLeer(), entrada]);
        inp.value = '';
        renderAddons();
        if(sesionActual){ try{ await sb.from('mis_addons').upsert({user_id:sesionActual.user.id, transport_url:url, manifest:entrada}, {onConflict:'user_id,transport_url'}); }catch(e){} }
        err.style.color = '#1e7a3a'; err.textContent = '«'+m.nombre+'» añadido.';
      }catch(e){ err.textContent = e.message || 'No se pudo añadir este addon.'; }
      finally{ btn.classList.remove('loading'); }
    }
    // ── Copiar / pegar la lista de addons (copia de seguridad o pasarlos a otra cuenta) ──
    function _addonIoMsg(txt, ok){ const m = document.getElementById('addon-io-msg'); m.style.color = ok ? '#1e7a3a' : '#b3261e'; m.textContent = txt; }
    async function addonsCopiar(){
      const lista = addonsLeer();
      if(!lista.length){ _addonIoMsg('No tienes addons que copiar.', false); return; }
      const hoy = new Date().toLocaleDateString('es-ES');
      const texto = [`# CineMood · mis addons (${hoy})`, ...lista.flatMap(a=>['', '# '+a.nombre, a.url])].join('\n');
      let ok = false;
      try{ if(navigator.clipboard && window.isSecureContext){ await navigator.clipboard.writeText(texto); ok = true; } }catch(e){}
      if(!ok){
        // Alternativa para navegadores sin acceso al portapapeles: seleccionar el texto en un campo temporal
        const ta = document.createElement('textarea'); ta.value = texto; ta.setAttribute('readonly',''); ta.style.cssText='position:fixed;top:0;left:0;opacity:0';
        document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, texto.length);
        try{ ok = document.execCommand('copy'); }catch(e){}
        ta.remove();
      }
      if(ok) _addonIoMsg(`Copiados ${lista.length} ${lista.length===1?'addon':'addons'}. Pégalos en Notas o donde quieras.`, true);
      else { addonsMostrarPegar(); const t = document.getElementById('addon-pegar-txt'); t.value = texto; t.select(); _addonIoMsg('No se pudo copiar automáticamente: el texto está seleccionado abajo, cópialo a mano.', false); }
    }
    function addonsMostrarPegar(){
      const p = document.getElementById('addon-pegar');
      const visible = p.style.display !== 'none';
      p.style.display = visible ? 'none' : 'block';
      if(!visible) document.getElementById('addon-pegar-txt').focus();
    }
    async function addonsPegar(){
      const btn = document.getElementById('addon-pegar-btn');
      const lineas = document.getElementById('addon-pegar-txt').value.split(/\r?\n/).map(l=>l.trim()).filter(l=>l && !l.startsWith('#'));
      const crudas = lineas.flatMap(l=>l.match(/(?:https?|stremio):\/\/\S+/gi) || []);
      if(!crudas.length){ _addonIoMsg('No he encontrado ninguna dirección en el texto pegado.', false); return; }
      btn.classList.add('loading');
      const anadidos = [], yaEstaban = [], fallidos = [];
      for(const cruda of crudas){
        let url;
        try{ url = _addonBase(cruda) + '/manifest.json'; }catch(e){ fallidos.push(cruda.slice(0,40)+'…'); continue; }
        if(addonsLeer().some(a=>a.url===url) || anadidos.some(a=>a.url===url)){ yaEstaban.push(url); continue; }
        try{
          const m = _manifestLimpio(await _fetchAddon(url));
          if(!m || m.configurationRequired) throw new Error();
          delete m.configurationRequired;
          const entrada = {url, ...m};
          addonsGuardar([...addonsLeer(), entrada]);
          anadidos.push(entrada);
          if(sesionActual){ try{ await sb.from('mis_addons').upsert({user_id:sesionActual.user.id, transport_url:url, manifest:entrada}, {onConflict:'user_id,transport_url'}); }catch(e){} }
        }catch(e){ fallidos.push(new URL(url).hostname); }
      }
      btn.classList.remove('loading');
      renderAddons();
      const partes = [];
      if(anadidos.length) partes.push(`Añadidos ${anadidos.length}: ${anadidos.map(a=>a.nombre).join(', ')}.`);
      if(yaEstaban.length) partes.push(`${yaEstaban.length} ya ${yaEstaban.length===1?'estaba':'estaban'} añadido${yaEstaban.length===1?'':'s'}.`);
      if(fallidos.length) partes.push(`${fallidos.length===1?'No se pudo añadir':'No se pudieron añadir'}: ${fallidos.join(', ')}.`);
      _addonIoMsg(partes.join(' '), anadidos.length>0 && !fallidos.length);
      if(anadidos.length && !fallidos.length){ document.getElementById('addon-pegar-txt').value=''; document.getElementById('addon-pegar').style.display='none'; }
    }
    async function addonQuitar(url){
      addonsGuardar(addonsLeer().filter(a=>a.url!==url));
      renderAddons();
      if(sesionActual){ try{ await sb.from('mis_addons').delete().eq('user_id', sesionActual.user.id).eq('transport_url', url); }catch(e){} }
    }

    // ── Protocolo: qué addon responde a qué, y cómo se pide ──
    function _addonManeja(a, recurso, tipo, id){
      return a.resources.some(r=>r.name===recurso && r.types.includes(tipo) && (!r.idPrefixes || !r.idPrefixes.length || r.idPrefixes.some(p=>String(id).startsWith(p))));
    }
    function _addonUrl(a, recurso, tipo, id){
      return a.url.replace(/\/manifest\.json$/,'') + '/' + recurso + '/' + encodeURIComponent(tipo) + '/' + encodeURIComponent(id) + '.json';
    }
    function _tieneExoNativo(){
      return !!(window.CineMoodTV && typeof window.CineMoodTV.reproducir === 'function');
    }
    function _urlStreamValida(raw){
      if(!_esTxt(raw)) return null;
      const u = _urlSegura(raw); if(u) return u;
      if(_tieneExoNativo()){
        try{ const x = new URL(raw); return (x.protocol==='http:' || x.protocol==='https:') && !x.username && !x.password ? x.href : null; }catch(e){}
      }
      return null;
    }
    function _extDeFuente(s, u){
      const candidatas = [u ? (()=>{ try{ return new URL(u).pathname; }catch(e){ return ''; } })() : '', s && s.filename || '', s && s.description || '', s && s.name || ''];
      for(const txt of candidatas){
        const m = String(txt).match(/\.([a-z0-9]{2,5})(?:$|[?#\s"')\],])/i);
        if(m && /^(mp4|m4v|webm|mov|m3u8|mpd|mkv|avi|wmv|flv|ts|m2ts|mpg|mpeg)$/i.test(m[1])) return m[1].toLowerCase();
      }
      if(u && /[?&=/](?:playlist|master|index|manifest)?[^?#]*\.m3u8\b|[?&]format=hls\b/i.test(u)) return 'm3u8';
      return '';
    }
    function _fuenteLimpia(s){
      if(!s || typeof s!=='object') return null;
      const bh = s.behaviorHints && typeof s.behaviorHints==='object' ? s.behaviorHints : {};
      const rh = bh.proxyHeaders && typeof bh.proxyHeaders==='object' && bh.proxyHeaders.request && typeof bh.proxyHeaders.request==='object' ? bh.proxyHeaders.request : null;
      const subs = Array.isArray(s.subtitles) ? s.subtitles.filter(x=>x&&_urlSegura(x.url)).slice(0,40).map(x=>({url:_urlSegura(x.url), lang:String(x.lang||x.language||'').slice(0,24), label:String(x.label||x.lang||'').slice(0,80)})) : [];
      return {url:_esTxt(s.url)?s.url.slice(0,4000):null, externalUrl:_esTxt(s.externalUrl)?s.externalUrl.slice(0,4000):null, ytId:_esTxt(s.ytId)?s.ytId:null, infoHash:_esTxt(s.infoHash)?s.infoHash:null,
        name:String(s.name||'').slice(0,120), description:String(s.description||s.title||'').slice(0,600), filename:_esTxt(bh.filename)?bh.filename.slice(0,260):'',
        notWebReady:!!bh.notWebReady, proxyHeaders:!!bh.proxyHeaders, reqHeaders:rh, subtitles:subs};
    }
    // Qué se puede reproducir en el reproductor interno (Media3 en Android TV / HTML5+HLS+MPEG-TS en web) y qué no
    function _clasificarFuente(s){
      const no = motivo=>({tipo:'no', motivo});
      if(s.externalUrl){ const u=_urlHttps(s.externalUrl); return u?{tipo:'externa', href:u}:no('El enlace externo no es una dirección https válida.'); }
      if(s.infoHash) return no('Es un torrent: necesita un servicio (como AllDebrid) que lo convierta en enlace directo.');
      if(s.ytId) return no('Es un vídeo de YouTube: aún no está soportado aquí.');
      if(!s.url) return no('Tipo de fuente desconocido.');
      const u = _urlStreamValida(s.url);
      if(!u) return no(/^http:/i.test(s.url)?'La dirección usa http sin cifrar y el navegador la bloquea.':'La dirección de la fuente no es válida.');
      if(_tieneExoNativo()) return {tipo:'play', motor:'exo'};
      if(s.proxyHeaders) return no('Necesita cabeceras especiales que un navegador web no puede enviar (sí funciona en la app de Android TV).');
      const e = _extDeFuente(s, u);
      if(e==='m3u8') return {tipo:'play', motor:'hls'};
      if(['ts','m2ts','flv'].includes(e)) return {tipo:'play', motor:'mpegts', aviso:'Flujo .'+e+' en reproductor interno; si el servidor bloquea el acceso directo, usa «Abrir en VLC».'};
      if(['mkv','avi','wmv','mpg','mpeg'].includes(e) || s.notWebReady) return {tipo:'play', motor:'nativo', aviso:'Si algún códec de audio o vídeo no suena en el reproductor interno, usa «Abrir en VLC».'};
      return {tipo:'play', motor:'nativo'};
    }

    // ── El id de IMDb sale de TMDB (los addons usan ids de IMDb) ──
    const _imdbCache = {};
    async function _imdbIdDe(tipo, id){
      const k = tipo+':'+id;
      if(_imdbCache[k]) return _imdbCache[k];
      let d; try{ d = await (await fetch(`${TMDB_PROXY}?path=/${tipo}/${id}/external_ids`)).json(); }catch(e){ throw new Error('No se pudo consultar TMDB. Comprueba tu conexión.'); }
      if(!d || !_esTxt(d.imdb_id)) throw new Error('TMDB no tiene el id de IMDb de este título, y los addons lo necesitan.');
      return (_imdbCache[k] = d.imdb_id);
    }
