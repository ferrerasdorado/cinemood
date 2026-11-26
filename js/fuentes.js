// CineMood · Hoja de fuentes («Ver»): lista, filtros, reproducir, VLC y descargar
// (Parte de index.html; se carga como script clásico: todo comparte el mismo ámbito global.)

    function verFuentesFicha(){
      const p = peliculaActual; if(!p) return;
      const tv = p._tipo==='tv';
      const ctx = {tipo: tv?'tv':'movie', tmdbId: p.id, titulo: p.title||p.name||''};
      if(tv) _ctxSerie(ctx, null, null);
      abrirFuentes(ctx);
    }
    function abrirFuentesEpisodio(season, episode){
      const p = peliculaActual; if(!p) return;
      const ctx = {tipo:'tv', tmdbId: window.tvIdActual||p.id, titulo: p.title||p.name||''};
      _ctxSerie(ctx, season, episode);
      abrirFuentes(ctx);
    }
    function _ctxSerie(ctx, season, episode){
      const ss = (window.temporadasSeriesActual||[]).map(s=>({n:s.season_number, count:s.episode_count||1}));
      ctx.temporadas = ss.length ? ss : [{n:1, count:30}];
      ctx.season = season!=null ? season : ctx.temporadas[0].n;
      ctx.episode = episode!=null ? episode : 1;
    }
    function abrirFuentes(ctx){
      window._fte = ctx;
      document.getElementById('fte-titulo').textContent = ctx.nas ? 'Enviar al NAS · '+ctx.titulo : ctx.titulo;
      document.querySelector('#fuentes-modal .fte-nota').style.display = ctx.nas ? 'none' : '';
      _fteSelectores();
      document.getElementById('fuentes-modal').classList.add('activo');
      document.body.style.overflow = 'hidden';
      cargarFuentes();
    }
    function cerrarFuentes(){
      document.getElementById('fuentes-modal').classList.remove('activo');
      window._fte = null;
      if(!document.getElementById('visor').classList.contains('activo')) document.body.style.overflow = '';
    }
    function _fteSelectores(){
      const ctx = window._fte, cont = document.getElementById('fte-sel');
      if(ctx.tipo!=='tv'){ cont.replaceChildren(); return; }
      const sTemp = _fEl('select',{id:'fte-temp','aria-label':'Temporada',onchange:e=>{ ctx.season = +e.target.value; ctx.episode = 1; _fteSelectores(); cargarFuentes(); }},
        ctx.temporadas.map(t=>_fEl('option',{value:t.n,text:'Temporada '+t.n,selected:t.n===ctx.season})));
      const t0 = ctx.temporadas.find(t=>t.n===ctx.season) || ctx.temporadas[0];
      const sEp = _fEl('select',{id:'fte-ep','aria-label':'Episodio',onchange:e=>{ ctx.episode = +e.target.value; cargarFuentes(); }},
        Array.from({length:Math.max(1,t0.count)},(_,i)=>_fEl('option',{value:i+1,text:'Episodio '+(i+1),selected:i+1===ctx.episode})));
      cont.replaceChildren(_fEl('label',{},'Temporada',sTemp), _fEl('label',{},'Episodio',sEp));
    }
    async function cargarFuentes(){
      const ctx = window._fte; if(!ctx) return;
      const body = document.getElementById('fte-body');
      const mi = (window._fteTurno = (window._fteTurno||0) + 1); // descarta respuestas de una petición anterior
      const vivo = ()=>mi===window._fteTurno && window._fte===ctx;
      const addons = addonsLeer();
      if(!addons.length){
        body.replaceChildren(...(ctx.nas ? [_nasBloqueAuto()] : []), _fEl('p',{class:'fte-msg',text:'Aún no has añadido addons. Necesitas al menos uno que ofrezca fuentes de vídeo.'}),
          _fEl('div',{class:'cta-btn',onclick:()=>{ cerrarFuentes(); abrirAddons(); }},'Añadir un addon'));
        return;
      }
      body.replaceChildren(_fEl('p',{class:'fte-msg',role:'status',text:'Buscando fuentes…'}));
      let imdb;
      try{ imdb = await _imdbIdDe(ctx.tipo, ctx.tmdbId); }
      catch(e){ if(vivo()) body.replaceChildren(_fEl('p',{class:'fte-msg fte-err',text:e.message})); return; }
      if(!vivo()) return;
      const tipoA = ctx.tipo==='tv' ? 'series' : 'movie';
      const vid = ctx.tipo==='tv' ? `${imdb}:${ctx.season}:${ctx.episode}` : imdb;
      const cands = addons.filter(a=>_addonManeja(a,'stream',tipoA,vid));
      if(!cands.length){ body.replaceChildren(_fEl('p',{class:'fte-msg',text:'Ninguno de tus addons ofrece fuentes para este tipo de título.'})); return; }
      body.replaceChildren();
      let pend=cands.length;
      const resultados=[], avisos=[];
      const filtros={idioma:'todos',resolucion:'todas',subtitulos:'todos',proveedor:'todos',buscar:'',orden:'original'};
      const barra=_fEl('div',{class:'fte-filtros'});
      const resumen=_fEl('p',{class:'fte-msg',role:'status'});
      const listaUI=_fEl('div',{class:'fte-grupo'}), avisosUI=_fEl('div',{});
      function seleccionar(clave,titulo,opciones){
        const el=_fEl('select',{'aria-label':titulo,onchange:e=>{filtros[clave]=e.target.value;pintar();}},opciones.map(([value,text])=>_fEl('option',{value,text})));
        barra.append(_fEl('label',{},titulo+' ',el));return el;
      }
      seleccionar('idioma','Idioma',[['todos','Todos'],['es','Español (cualquiera)'],['cast','Castellano indicado'],['lat','Latino indicado'],['en','Inglés'],['multi','Multi indicado'],['desconocido','Sin identificar']]);
      seleccionar('resolucion','Resolución',[['todas','Todas'],['2160','2160p / 4K'],['1080','1080p'],['720','720p'],['sd','576p o inferior'],['desconocida','Sin identificar']]);
      seleccionar('subtitulos','Subtítulos',[['todos','Sin filtrar'],['indicados','Algún subtítulo indicado'],['es','Español indicado'],['en','Inglés indicado'],['desconocidos','Sin información']]);
      seleccionar('proveedor','Proveedor',[['todos','Todos'],...cands.map((a,i)=>[String(i),a.nombre])]);
      seleccionar('orden','Orden',[['original','Orden de proveedores'],['es','Español → resolución → semillas'],['calidad','Resolución → semillas'],['semillas','Semillas → resolución']]);
      const texto=_fEl('input',{type:'search',placeholder:'Buscar en nombre o descripción','aria-label':'Buscar en resultados',oninput:e=>{filtros.buscar=e.target.value.toLowerCase();pintar();}});
      barra.append(texto,_fEl('button',{type:'button',onclick:()=>{Object.assign(filtros,{idioma:'todos',resolucion:'todas',subtitulos:'todos',proveedor:'todos',buscar:'',orden:'original'});barra.querySelectorAll('select').forEach(el=>el.selectedIndex=0);texto.value='';pintar();}},'Restablecer'));
      if(ctx.nas) body.append(_nasBloqueAuto());
      body.append(barra,_fEl('p',{class:'fte-msg',text:'Los filtros usan las etiquetas y datos del proveedor, sin comprobar el audio ni el archivo. Sin identificar no significa que no tenga ese idioma o subtítulos. Los filtros no encuentran nuevas fuentes.'}),resumen,listaUI,avisosUI);
      function pintar(){
        const lista=resultados.filter(r=>{
          const m=r.meta,f=filtros;
          if(ctx.nas&&!_hashDeFuente(r.s))return false;
          if(f.proveedor!=='todos'&&String(r.proveedor)!==f.proveedor)return false;
          if(f.buscar&&!m.texto.toLowerCase().includes(f.buscar))return false;
          if(f.idioma==='es'&&!m.es)return false;
          if(f.idioma==='cast'&&!m.cast)return false;
          if(f.idioma==='lat'&&!m.lat)return false;
          if(f.idioma==='en'&&!m.en)return false;
          if(f.idioma==='multi'&&!m.multi)return false;
          if(f.idioma==='desconocido'&&m.idiomaConocido)return false;
          if(f.resolucion==='desconocida'&&m.calidad!==0)return false;
          if(f.resolucion==='sd'&&!(m.calidad>0&&m.calidad<=576))return false;
          if(/^\d+$/.test(f.resolucion)&&m.calidad!==Number(f.resolucion))return false;
          if(f.subtitulos==='indicados'&&!m.subs)return false;
          if(f.subtitulos==='es'&&!m.subEs)return false;
          if(f.subtitulos==='en'&&!m.subEn)return false;
          if(f.subtitulos==='desconocidos'&&m.subs)return false;
          return true;
        });
        lista.sort((a,b)=>{
          if(filtros.orden==='original')return a.proveedor-b.proveedor||a.pos-b.pos;
          const campos=filtros.orden==='es'?['es','calidad','semillas']:filtros.orden==='semillas'?['semillas','calidad']:['calidad','semillas'];
          for(const k of campos){const d=Number(b.meta[k])-Number(a.meta[k]);if(d)return d;}
          return a.proveedor-b.proveedor||a.pos-b.pos;
        });
        listaUI.replaceChildren(...lista.map(r=>_fEl('div',{},_fEl('p',{class:'fte-msg',text:r.a.nombre+' · '+(r.meta.calidad?r.meta.calidad+'p':'Resolución sin identificar')+' · Semillas: '+(r.meta.semillas<0?'sin dato':r.meta.semillas)+' · Subtítulos: '+(r.meta.subs?'indicados por la fuente':'sin información')}),_fteFila(r.s,r.a,ctx))));
        if(!lista.length)listaUI.append(_fEl('p',{class:'fte-msg',text:resultados.length?(ctx.nas&&!resultados.some(r=>_hashDeFuente(r.s))?'Tus proveedores no han devuelto ningún torrent para este título.':'Ningún resultado coincide. Prueba a quitar filtros.'):pend?'Esperando resultados…':'No se han encontrado resultados.'}));
        resumen.textContent=lista.length+' visibles de '+resultados.length+' recibidos · '+(pend?'Buscando en '+pend+' proveedores…':'Búsqueda terminada.');
        avisosUI.replaceChildren(...avisos.map(text=>_fEl('p',{class:'fte-msg',text})));
      }
      pintar();
      cands.forEach((a,proveedor)=>{
        _fetchAddon(_addonUrl(a,'stream',tipoA,vid)).then(d=>{
          if(!vivo())return;
          const raw=Array.isArray(d&&d.streams)?d.streams:[];
          raw.slice(0,500).forEach((original,pos)=>{const limpio=_fuenteLimpia(original);if(limpio)resultados.push({s:limpio,a,proveedor,pos,meta:_fteMetadatos(original)});});
          if(!raw.length)avisos.push(a.nombre+': sin resultados.');
          if(raw.length>500)avisos.push(a.nombre+': límite de 500 resultados.');
        }).catch(e=>{if(vivo())avisos.push(a.nombre+': '+e.message);}).finally(()=>{if(vivo()){pend--;pintar();}});
      });
    }
    function _fteMetadatos(s){
      const texto=[s.name,s.description,s.title,s.behaviorHints&&s.behaviorHints.filename,Array.isArray(s.languages)?s.languages.join(' '):s.language||''].filter(Boolean).join(' ');
      const subLineas=texto.split(/\n|\r/).filter(l=>/sub(?:title|t[ií]tulo)?s?\b|subbed|subtitulado|💬/i.test(l));
      const subTexto=subLineas.join(' ');
      const audioTexto=texto.split(/\n|\r/).filter(l=>!subLineas.includes(l)).join(' ');
      const cast=/castellano|🇪🇸|\bes-es\b/i.test(audioTexto),lat=/latino|latam|🇲🇽|🇦🇷|\bes-419\b/i.test(audioTexto);
      const es=cast||lat||/espa[ñn]ol|spanish|\b(?:esp|spa|es)\b/i.test(audioTexto);
      const en=/english|ingl[eé]s|🇬🇧|🇺🇸|\b(?:eng|en)\b/i.test(audioTexto),multi=/\bmulti(?:audio|lang)?\b/i.test(audioTexto);
      const q=texto.match(/\b(2160|1440|1080|720|576|480|360)p?\b/i),calidad=q?+q[1]:/\b4k\b/i.test(texto)?2160:0;
      const match=texto.match(/(?:👤|👥|🌱|\bseeders?\b|\bseeds\b)\s*[:=]?\s*([\d.,]+\s*[kKmM]?)/u);
      let semillas=-1;
      if(Number.isFinite(s.seeders)&&s.seeders>=0)semillas=s.seeders;
      else if(match){const v=match[1].trim(),u=v.match(/[kKmM]$/),n=u?parseFloat(v.replace(',','.')):Number(v.replace(/[.,\s]/g,''));if(Number.isFinite(n))semillas=n*(u?(/m/i.test(u[0])?1000000:1000):1);}
      const subs=Array.isArray(s.subtitles)?s.subtitles:[];
      const lenguas=subs.map(x=>String(x.lang||x.language||'')).join(' ');
      const subEs=/espa[ñn]ol|spanish|castellano|🇪🇸|\b(?:es|spa|esp|es-es)\b/i.test(subTexto+' '+lenguas);
      const subEn=/english|ingl[eé]s|🇬🇧|🇺🇸|\b(?:en|eng)\b/i.test(subTexto+' '+lenguas);
      return {texto,es,cast,lat,en,multi,idiomaConocido:es||en||multi||/french|french|fran[cç][eé]s|german|alem[aá]n|italian|italiano|portugu[eê]s|russian|ruso|japanese|japon[eé]s/i.test(audioTexto),calidad,semillas,subs:subs.length>0||subLineas.length>0,subEs,subEn};
    }

    // Acciones stream y download de VLC para iOS y Android:
    // https://wiki.videolan.org/Documentation:IOS/
    function _esVLCiOS(){
      return /iPad|iPhone|iPod/i.test(navigator.userAgent) ||
        (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1);
    }
    function _esAndroid(){
      return /Android/i.test(navigator.userAgent) || _tieneExoNativo();
    }
    // En Android (también la app de la tele) el vídeo se pasa a VLC con un «intent»
    function _vlcIntentAndroid(u, titulo){
      try{
        const x = new URL(u);
        const extra = titulo ? `S.title=${encodeURIComponent(String(titulo).slice(0,140))};` : '';
        return `intent://${x.host}${x.pathname}${x.search}#Intent;scheme=${x.protocol.replace(':','')};action=android.intent.action.VIEW;type=video/*;package=org.videolan.vlc;${extra}end`;
      }catch(e){ return null; }
    }
    function _vlcHref(enlace, accion='stream', titulo=''){
      const u = _urlStreamValida(enlace);
      if(!u || (accion!=='stream' && accion!=='download')) return null;
      if(_esAndroid() && accion==='stream') return _vlcIntentAndroid(u, titulo);
      return 'vlc-x-callback://x-callback-url/'+accion+'?url='+encodeURIComponent(u);
    }
    function _guardarListaVLC(enlace, titulo, estado){
      const u=_urlSegura(enlace); if(!u) return;
      _pausarParaVLC();
      const nombre=String(titulo||'CineMood').replace(/[\r\n\u0000-\u001f]/g,' ').slice(0,180);
      const lista='#EXTM3U\n#EXTINF:-1,'+nombre+'\n'+u+'\n';
      const blob=new Blob([lista],{type:'audio/x-mpegurl;charset=utf-8'});
      const blobUrl=URL.createObjectURL(blob);
      const a=document.createElement('a');
      a.href=blobUrl;
      a.download=(nombre.replace(/[^a-z0-9áéíóúüñ _-]/gi,'').trim().slice(0,80)||'CineMood')+'.m3u';
      document.body.append(a); a.click(); a.remove();
      setTimeout(()=>URL.revokeObjectURL(blobUrl),60000);
      if(estado) estado.textContent='Se ha generado una lista .m3u. En Descargas: clic derecho → Abrir con → VLC. Es solo un acceso al vídeo, no una copia offline. No compartas la lista.';
    }
    function _abrirVLCVisor(ev){
      const srcActual = window._visorSrcActual || document.getElementById('visor-video').currentSrc || document.getElementById('visor-video').src;
      const tituloActual = document.getElementById('visor-titulo').textContent;
      if(_esAndroid()){
        ev.preventDefault();
        const u = _urlStreamValida(srcActual), it = u && _vlcIntentAndroid(u, tituloActual);
        if(it){ _pausarParaVLC(); location.href = it; }
        return;
      }
      if(!_esVLCiOS()){
        ev.preventDefault();
        _guardarListaVLC(srcActual, tituloActual);
      }else _pausarParaVLC();
    }
    function _esArchivoDescargable(enlace){
      const u=_urlSegura(enlace); if(!u) return false;
      // Una lista HLS/DASH no es el archivo completo para uso sin conexión.
      return !/\.(m3u8|mpd)(?:$)/i.test(new URL(u).pathname);
    }
    function _pausarParaVLC(){
      const v=document.getElementById('visor-video');
      if(v && !v.paused) v.pause();
    }
    async function _copiarFuenteVLC(enlace, estado){
      const u=_urlStreamValida(enlace); if(!u) return;
      try{
        if(window.CineMoodTV && typeof window.CineMoodTV.copiar === 'function'){
          window.CineMoodTV.copiar(u);
          estado.textContent='Enlace copiado al portapapeles del dispositivo. No compartas este enlace: puede incluir acceso privado.';
          return;
        }
        await navigator.clipboard.writeText(u);
        estado.textContent=_esVLCiOS() ? 'Enlace copiado. En VLC: Red → Abrir flujo de red. No compartas este enlace: puede incluir acceso privado.' : (_esAndroid() ? 'Enlace copiado. En VLC: Más → Nuevo flujo, pega el enlace y abre. No compartas este enlace.' : 'Enlace copiado. En VLC del Mac/PC: Archivo → Abrir red, pega el enlace y abre. No compartas este enlace: puede incluir acceso privado.');
      }catch(e){
        const input=_fEl('input',{type:'text',value:u,readonly:true,'aria-label':'Enlace privado para copiar',style:'width:100%;min-width:0;padding:10px;font-size:16px;margin-top:8px'});
        estado.replaceChildren(document.createTextNode('Mantén pulsado el enlace para copiarlo. No lo compartas.'),input);
        input.focus(); input.select();
      }
    }
    function _fteFila(s, a, ctx){
      if(ctx.nas) return _nasFilaTorrent(s, a);
      const c = _clasificarFuente(s);
      const nombre = s.name || a.nombre;
      const cuerpo = _fEl('div',{class:'fte-cuerpo'}, _fEl('span',{class:'fte-nombre',text:nombre}),
        s.description && _fEl('span',{class:'fte-desc',text:s.description}),
        // Un torrent no se puede reproducir aquí, pero sí enviar al NAS: se explica sin ponerlo como error
        c.tipo==='no' && (_hashDeFuente(s)
          ? _fEl('span',{class:'fte-aviso',text:'Torrent: no se puede reproducir aquí sin un servicio como AllDebrid, pero puedes enviarlo al NAS.'})
          : _fEl('span',{class:'fte-motivo',text:c.motivo})),
        c.tipo==='play' && c.aviso && _fEl('span',{class:'fte-aviso',text:c.aviso}));
      if(c.tipo==='externa') return _fEl('a',{class:'fte-fila',href:c.href,target:'_blank',rel:'noopener noreferrer'}, cuerpo, _fEl('span',{class:'fte-ico','aria-hidden':'true',text:'↗'}), _fEl('span',{class:'sr-only',style:'position:absolute;left:-9999px',text:' (se abre en una pestaña nueva)'}));
      const vlc = !s.proxyHeaders && s.url && _vlcHref(s.url, 'stream', ctx.titulo);
      if(c.tipo==='play' || vlc){
        const estado=_fEl('p',{class:'fte-vlc-ayuda',role:'status','aria-live':'polite'});
        const acciones=_fEl('div',{class:'fte-acciones'});
        if(c.tipo==='play') acciones.append(_fEl('button',{class:'fte-accion fte-accion-play',type:'button',onclick:()=>reproducirFuente(s,{...ctx,fuente:nombre})},'Reproducir'));
        if(vlc){
          if(_esVLCiOS() || _esAndroid()) acciones.append(
            _fEl('a',{class:'fte-accion fte-accion-vlc',href:vlc,onclick:()=>{
              _pausarParaVLC();
              estado.textContent='Se ha solicitado abrir VLC. Si no se abre, comprueba que VLC esté instalado o utiliza «Copiar enlace».';
            }},'Abrir en VLC'));
          else acciones.append(_fEl('button',{class:'fte-accion fte-accion-vlc',type:'button',onclick:()=>_guardarListaVLC(s.url,ctx.titulo,estado)},'Abrir en VLC (.m3u)'));
        }
        if(s.url && _urlStreamValida(s.url)){
          acciones.append(_fEl('button',{class:'fte-accion',type:'button',onclick:()=>_copiarFuenteVLC(s.url,estado)},'Copiar enlace'));
          if(_esArchivoDescargable(s.url)) acciones.append(
            _esVLCiOS() ?
            _fEl('a',{class:'fte-accion',href:_vlcHref(s.url,'download'),onclick:()=>{
              _pausarParaVLC();
              estado.textContent='Se ha solicitado la descarga en VLC. Comprueba allí su progreso y que haya espacio suficiente.';
            }},'Descargar en VLC') :
            _fEl('a',{class:'fte-accion',href:_urlSegura(s.url),download:'',target:'_blank',rel:'noopener noreferrer',referrerpolicy:'no-referrer',onclick:()=>{
              estado.textContent='Se abrirá el archivo original para guardarlo. Si el navegador lo muestra, usa su opción de descargar.';
            }},'Descargar'));
        }
        const nas = _nasBotonEnVer(s, a, ctx, estado);
        if(nas) acciones.append(nas);
        return _fEl('div',{class:'fte-fila fte-opciones'},cuerpo,acciones,estado);
      }
      // Torrent sin enlace directo: no se puede reproducir aquí, pero sí enviar al NAS
      const estadoNas = _fEl('p',{class:'fte-vlc-ayuda',role:'status','aria-live':'polite'});
      const nasSolo = _nasBotonEnVer(s, a, ctx, estadoNas);
      if(nasSolo) return _fEl('div',{class:'fte-fila fte-opciones'}, cuerpo, _fEl('div',{class:'fte-acciones'}, nasSolo), estadoNas);
      return _fEl('div',{class:'fte-fila fte-off','aria-disabled':'true'}, cuerpo, _fEl('span',{class:'fte-badge',text:'No compatible'}));
    }
