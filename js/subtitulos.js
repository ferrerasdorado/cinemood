// CineMood · Subtítulos del reproductor integrado
// (Se carga como script clásico: todo comparte el mismo ámbito global.)
//
// Al pulsar «Subtítulos» se pregunta a tus addons de subtítulos (por ejemplo OpenSubtitles) por ese título
// o capítulo. El elegido se descarga, se pasa a WebVTT si viene en SRT y se añade como pista del vídeo.
// No se usa en la app de la tele (allí los subtítulos los gestiona su propio reproductor).

    const _subs = {ctx:null, turno:0, blob:null, buscado:false};

    // Al abrir un vídeo: panel cerrado y sin pistas de antes
    function _subtitulosPreparar(ctx){
      _subtitulosLimpiar();
      _subs.ctx = {...ctx}; _subs.buscado = false; _subs.turno++;
      const panel = document.getElementById('visor-subs'), btn = document.getElementById('visor-subs-btn');
      panel.hidden = true; panel.replaceChildren(); btn.setAttribute('aria-expanded','false'); btn.textContent = 'Subtítulos';
    }
    function _subtitulosLimpiar(){
      const v = document.getElementById('visor-video');
      v.querySelectorAll('track[data-cm-sub]').forEach(t=>t.remove());
      if(_subs.blob){ URL.revokeObjectURL(_subs.blob); _subs.blob = null; }
    }
    function _subtitulosCerrar(){ _subs.turno++; _subs.ctx = null; _subtitulosLimpiar(); }

    function _subtitulosAlternar(){
      const panel = document.getElementById('visor-subs'), btn = document.getElementById('visor-subs-btn');
      panel.hidden = !panel.hidden;
      btn.setAttribute('aria-expanded', String(!panel.hidden));
      if(!panel.hidden && !_subs.buscado){ _subs.buscado = true; _subtitulosBuscar(panel); }
    }

    async function _subtitulosBuscar(panel){
      const ctx = _subs.ctx; if(!ctx) return;
      const mio = ++_subs.turno, vigente = ()=>mio===_subs.turno && _subs.ctx===ctx;
      const estado = _fEl('p',{class:'visor-subs-estado',role:'status','aria-live':'polite'}), lista = _fEl('div',{class:'visor-subs-lista'});
      const quitar = _fEl('button',{type:'button',class:'visor-sub',onclick:()=>{ _subtitulosLimpiar(); marcar(quitar); estado.textContent = 'Sin subtítulos.'; }},'Sin subtítulos');
      const marcar = b => lista.querySelectorAll('.visor-sub').forEach(x=>x.classList.toggle('on', x===b));
      panel.replaceChildren(estado, lista);
      estado.replaceChildren(_fteCargando('Buscando subtítulos en tus addons…'));
      try{
        const imdb = await _imdbIdDe(ctx.tipo, ctx.tmdbId);
        if(!vigente()) return;
        const tipo = ctx.tipo==='tv' ? 'series' : 'movie', id = ctx.tipo==='tv' ? `${imdb}:${ctx.season}:${ctx.episode}` : imdb;
        const addons = addonsLeer().filter(a=>_addonManeja(a,'subtitles',tipo,id));
        if(!addons.length){ estado.textContent = 'No tienes ningún addon de subtítulos. Puedes añadir uno (por ejemplo, OpenSubtitles) en Tú → Mis addons.'; return; }
        const todos = [];
        await Promise.all(addons.map(async a=>{
          try{
            const d = await _fetchAddon(_addonUrl(a,'subtitles',tipo,id));
            (Array.isArray(d && d.subtitles) ? d.subtitles : []).filter(x=>x && _urlSegura(x.url)).slice(0,200).forEach(x=>todos.push({x, a}));
          }catch(e){}
        }));
        if(!vigente()) return;
        // Primero en español, luego en inglés, luego el resto
        const peso = x => /^(spa|es|esp|es-es|es-419)$/i.test(x.lang||'') ? 0 : /^(eng|en)$/i.test(x.lang||'') ? 1 : 2;
        todos.sort((p,q)=>peso(p.x)-peso(q.x));
        estado.textContent = todos.length ? `${todos.length} subtítulos. Toca uno para activarlo.` : 'Tus addons no tienen subtítulos para esto.';
        lista.replaceChildren(quitar, ...todos.slice(0,60).map(({x,a})=>{
          const b = _fEl('button',{type:'button',class:'visor-sub',onclick:()=>{ marcar(b); _subtitulosCargar(x, estado, ctx, mio); }},
            _subtitulosIdioma(x.lang)+(x.label && x.label!==x.lang ? ' · '+String(x.label).slice(0,60) : '')+' · '+a.nombre);
          return b;
        }));
      }catch(e){ if(vigente()) estado.textContent = e.message; }
    }
    function _subtitulosIdioma(c){
      try{ const n = new Intl.DisplayNames(['es'],{type:'language'}).of({spa:'es',eng:'en',fre:'fr',fra:'fr',ger:'de',deu:'de',ita:'it',por:'pt',pob:'pt-BR'}[c]||c); if(n) return n[0].toUpperCase()+n.slice(1); }catch(e){}
      return c || 'Idioma desconocido';
    }

    async function _subtitulosCargar(sub, estado, ctx, turno){
      const vigente = ()=>turno===_subs.turno && _subs.ctx===ctx;
      const ctrl = new AbortController(), tm = setTimeout(()=>ctrl.abort(), 20000);
      estado.replaceChildren(_fteCargando('Cargando el subtítulo…'));
      try{
        const r = await fetch(_urlSegura(sub.url), {signal:ctrl.signal, credentials:'omit', referrerPolicy:'no-referrer'});
        if(!r.ok) throw new Error('el servidor respondió '+r.status);
        const bytes = await r.arrayBuffer();
        if(bytes.byteLength>5000000) throw new Error('el archivo es demasiado grande');
        let texto = new TextDecoder().decode(bytes);
        if(texto.includes('�')) texto = new TextDecoder('windows-1252').decode(bytes);   // subtítulos antiguos en Latin-1
        texto = texto.replace(/^﻿/,'').replace(/\r\n?/g,'\n').trim();
        if(!/^WEBVTT\b/.test(texto)){
          if(!/\d{1,2}:\d{2}:\d{2}[,.]\d{3}\s*-->/.test(texto)) throw new Error('solo se admiten SRT y WebVTT');
          texto = 'WEBVTT\n\n'+texto.replace(/^\d+\s*\n(?=\d{1,2}:)/gm,'').replace(/(\d{1,2}:\d{2}:\d{2}),(\d{3})/g,'$1.$2');
        }
        if(!vigente()) return;
        _subtitulosLimpiar();
        _subs.blob = URL.createObjectURL(new Blob([texto],{type:'text/vtt'}));
        const pista = document.createElement('track');
        pista.dataset.cmSub = '1'; pista.kind = 'subtitles'; pista.default = true; pista.src = _subs.blob;
        pista.label = _subtitulosIdioma(sub.lang);
        pista.srclang = ({spa:'es',eng:'en',fra:'fr',fre:'fr',por:'pt',ita:'it'})[sub.lang] || String(sub.lang||'und').slice(0,8);
        pista.onerror = ()=>{ estado.textContent = 'No se ha podido leer ese subtítulo. Prueba otro.'; };
        document.getElementById('visor-video').append(pista);
        pista.track.mode = 'showing';
        estado.textContent = 'Subtítulos activados. Si van desfasados, prueba otra versión.';
      }catch(e){
        if(vigente()) estado.textContent = 'No se ha podido cargar ('+(e.name==='AbortError' ? 'tarda demasiado' : e.message)+'). Prueba otro.';
      }finally{ clearTimeout(tm); }
    }
