// CineMood · Hoja de fuentes («Ver» y «NAS»): lista de resultados de tus addons, filtros y acciones
// (Se carga como script clásico: todo comparte el mismo ámbito global.)
//
// La misma hoja sirve para tres cosas:
//  · «Ver» (ctx.nas falso): reproducir, abrir en VLC, copiar, descargar o enviar al NAS.
//  · «NAS» de una película (ctx.nas): solo torrents, para elegir cuál descarga el NAS.
//  · «NAS» de una serie (ctx.serieNas): por temporada, con packs de temporada, capítulos o la serie entera (js/nas.js).

    const FTE_PAGINA = 20;            // resultados que se pintan de cada vez («Mostrar más»)
    const FTE_FILTROS_LS = 'cm:fte-filtros';

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
      const ss = (window.temporadasSeriesActual||[]).filter(s=>s.season_number>0).map(s=>({n:s.season_number, count:s.episode_count||1}));
      ctx.temporadas = ss.length ? ss : [{n:1, count:30}];
      ctx.season = season!=null ? season : ctx.temporadas[0].n;
      ctx.episode = episode!=null ? episode : 1;
    }
    function abrirFuentes(ctx){
      window._fte = ctx;
      document.getElementById('fte-titulo').textContent = ctx.nas ? 'Enviar al NAS · '+ctx.titulo : ctx.titulo;
      document.querySelector('#fuentes-modal .fte-nota').hidden = !!ctx.nas;
      _fteSelectores();
      document.getElementById('fuentes-modal').classList.add('activo');
      document.body.style.overflow = 'hidden';
      document.querySelector('#fuentes-modal .fte-sheet').scrollTop = 0;
      cargarFuentes();
    }
    function cerrarFuentes(){
      document.getElementById('fuentes-modal').classList.remove('activo');
      window._fte = null;
      window._fteTurno = (window._fteTurno||0) + 1;   // descarta lo que aún estuviera cargando
      if(!document.getElementById('visor').classList.contains('activo')) document.body.style.overflow = '';
    }

    // Cabecera de la hoja: temporada y capítulo en «Ver» de una serie; en el NAS de una serie, js/nas.js
    function _fteSelectores(){
      const ctx = window._fte, cont = document.getElementById('fte-sel');
      if(ctx.serieNas){ _nasSerieCabecera(ctx, cont); return; }
      cont.className = 'fte-sel';
      if(ctx.tipo!=='tv'){ cont.replaceChildren(); return; }
      const sTemp = _fEl('select',{id:'fte-temp','aria-label':'Temporada',onchange:e=>{ ctx.season = +e.target.value; ctx.episode = 1; _fteSelectores(); cargarFuentes(); }},
        ctx.temporadas.map(t=>_fEl('option',{value:t.n,text:'Temporada '+t.n,selected:t.n===ctx.season})));
      const t0 = ctx.temporadas.find(t=>t.n===ctx.season) || ctx.temporadas[0];
      const sEp = _fEl('select',{id:'fte-ep','aria-label':'Capítulo',onchange:e=>{ ctx.episode = +e.target.value; cargarFuentes(); }},
        Array.from({length:Math.max(1,t0.count)},(_,i)=>_fEl('option',{value:i+1,text:'Capítulo '+(i+1),selected:i+1===ctx.episode})));
      cont.replaceChildren(_fEl('label',{},'Temporada',sTemp), _fEl('label',{},'Capítulo',sEp));
    }

    // ── Qué es cada torrent de una serie: un capítulo, una temporada entera o varias temporadas ──
    // Los addons (Torrentio y parecidos) ponen el nombre del torrent en la primera línea y, si es un pack,
    // el archivo del capítulo en la segunda. Las mismas reglas están en nas/cinemood_nas.py.
    const _FTE_META_LINEA = /^(?:👤|💾|⚙️|⚙|🌱|📦|🔗|🇦|🇧|🇨|🇩|🇪|🇫|🇬|🇮|🇯|🇰|🇱|🇲|🇳|🇵|🇷|🇸|🇹|🇺|Multi|Dual)/u;
    const _RE_EP = /\bS\d{1,2}[ ._-]?E\d{1,3}\b|\b\d{1,2}x\d{2}\b/i;
    const _RE_RANGO_EP = /\bS?\d{0,2}[ ._-]?E\d{1,3}[ ._]?[-–][ ._]?E?\d{1,3}\b/i;
    const _RE_VARIAS_TEMP = /\bS\d{1,2}[ ._]?[-–][ ._]?S?\d{1,2}\b|\bS\d{1,2}(?:[ ._-]S\d{1,2})+\b|\bseasons?[ ._]?\d{1,2}[ ._]?[-–][ ._]?\d{1,2}\b|\btemporadas?[ ._]?\d{1,2}[ ._]?(?:[-–]|a|al)[ ._]?\d{1,2}\b|\bseason[ ._]1[ ._]2[ ._]3|\bcomplete[ ._]series\b|\bserie[ ._]completa\b|\btodas[ ._]las[ ._]temporadas\b|\[S\d{2}[-–]\d{2}\]|\bseasons\b|\btemporadas\b|\bint[eé]grale\b|\d{1,2}ª[ ._]*(?:a|al|-|y)?[ ._]*\d{1,2}ª/i;
    const _RE_UNA_TEMP = /\bS(\d{1,2})\b(?![ ._-]?E\d)|\bseason[ ._]?(\d{1,2})\b|\btemporada[ ._]?(\d{1,2})\b|\b(\d{1,2})ª[ ._]temporada|сезон:?\s?(\d{1,2})/i;
    function _fteLineas(s){ return String(s.description||s.title||'').split(/\n/).map(l=>l.trim()).filter(Boolean); }
    function _fteNombreTorrent(s){ return _fteLineas(s).find(l=>!_FTE_META_LINEA.test(l)) || s.filename || String(s.name||'').replace(/\n/g,' '); }
    function _fteArchivo(s){
      const l = _fteLineas(s).filter(x=>!_FTE_META_LINEA.test(x));
      const f = l[1] && /\.(mkv|mp4|m4v|avi|ts|webm)$|S\d{1,2}[ ._-]?E\d{1,3}/i.test(l[1]) ? l[1] : '';
      return f && f!==l[0] ? f.split('/').pop() : '';
    }
    function _fteTipoTorrent(s){
      const n = _fteNombreTorrent(s), arch = _fteArchivo(s);
      if(_RE_VARIAS_TEMP.test(n)) return {clase:'serie', temporada:null};
      const m = n.match(_RE_UNA_TEMP), temp = m ? +(m.slice(1).find(Boolean)) : null;
      if(_RE_RANGO_EP.test(n)) return {clase:'temporada', temporada:temp};
      if(_RE_EP.test(n)) return {clase:'episodio', temporada:null};
      if(m) return {clase:'temporada', temporada:temp};
      if(/\bfull\b(?![ ._-]?hd)/i.test(n)) return {clase:'serie', temporada:null};
      if(/\b(complete|completa|pack)\b/i.test(n)) return {clase: /\bseason\b|\btemporada\b/i.test(n) ? 'temporada' : 'serie', temporada:null};
      if(arch && _RE_EP.test(arch)) return {clase:'temporada', temporada:null};
      return {clase:'episodio', temporada:null};
    }

    // ── Datos de cada resultado sacados del texto del addon (idioma, calidad, semillas, tamaño…) ──
    function _fteMetadatos(s){
      const texto=[s.name,s.description,s.title,s.behaviorHints&&s.behaviorHints.filename,Array.isArray(s.languages)?s.languages.join(' '):s.language||''].filter(Boolean).join(' ');
      const subLineas=texto.split(/\n|\r/).filter(l=>/sub(?:title|t[ií]tulo)?s?\b|subbed|subtitulado|💬/i.test(l));
      const subTexto=subLineas.join(' ');
      const audioTexto=texto.split(/\n|\r/).filter(l=>!subLineas.includes(l)).join(' ');
      const cast=/castellano|🇪🇸|\bes-es\b/i.test(audioTexto),lat=/latino|latam|🇲🇽|🇦🇷|\bes-419\b/i.test(audioTexto);
      const es=cast||lat||/espa[ñn]ol|spanish|\b(?:esp|spa|es)\b/i.test(audioTexto);
      const en=/english|ingl[eé]s|🇬🇧|🇺🇸|\b(?:eng|en)\b/i.test(audioTexto),multi=/\bmulti(?:audio|lang)?\b|dual[ ._-]?audio/i.test(audioTexto);
      const q=texto.match(/\b(2160|1440|1080|720|576|480|360)p?\b/i),calidad=q?+q[1]:/\b4k\b/i.test(texto)?2160:0;
      const match=texto.match(/(?:👤|👥|🌱|\bseeders?\b|\bseeds\b)\s*[:=]?\s*([\d.,]+\s*[kKmM]?)/u);
      let semillas=-1;
      if(Number.isFinite(s.seeders)&&s.seeders>=0)semillas=s.seeders;
      else if(match){const v=match[1].trim(),u=v.match(/[kKmM]$/),n=u?parseFloat(v.replace(',','.')):Number(v.replace(/[.,\s]/g,''));if(Number.isFinite(n))semillas=n*(u?(/m/i.test(u[0])?1000000:1000):1);}
      const tm=texto.match(/💾\s*([\d.,]+)\s*(TB|GB|MB|KB)/iu)||texto.match(/\b([\d]+(?:[.,]\d+)?)\s?(TiB|GiB|MiB|TB|GB|MB)\b/i);
      const tamano=tm?Math.round(parseFloat(tm[1].replace(',','.'))*({kb:1024,mb:1024**2,mib:1024**2,gb:1024**3,gib:1024**3,tb:1024**4,tib:1024**4}[tm[2].toLowerCase()]||0)):0;
      const subs=Array.isArray(s.subtitles)?s.subtitles:[];
      const lenguas=subs.map(x=>String(x.lang||x.language||'')).join(' ');
      const subEs=/espa[ñn]ol|spanish|castellano|🇪🇸|\b(?:es|spa|esp|es-es)\b/i.test(subTexto+' '+lenguas);
      const subEn=/english|ingl[eé]s|🇬🇧|🇺🇸|\b(?:en|eng)\b/i.test(subTexto+' '+lenguas);
      const dv=/\b(?:DV|DoVi)\b|dolby[ ._]?vision/i.test(texto), hdr=dv||/\bHDR(?:10\+?)?\b/i.test(texto);
      // «AD+», «RD+»… en el nombre: el servicio de debrid ya lo tiene y se puede ver al momento
      const alInstante=/(?:^|[\s\[(])(?:AD|RD|PM|TB|DL|OC|ED|EN)\+|⚡/u.test(String(s.name||''));
      return {texto,es,cast,lat,en,multi,idiomaConocido:es||en||multi||/french|fran[cç][eé]s|german|alem[aá]n|italian|italiano|portugu[eê]s|russian|ruso|japanese|japon[eé]s/i.test(audioTexto),calidad,semillas,tamano,subs:subs.length>0||subLineas.length>0,subEs,subEn,hdr,dv,alInstante};
    }
    // Lo mismo para un resultado ya limpiado con _fuenteLimpia (por ejemplo, los de Cinecalidad)
    const _fteMetaLimpia = s => _fteMetadatos({...s, behaviorHints:{filename:s.filename}});

    // ── Carga y lista de resultados ──
    function _fteFiltrosGuardados(){
      try{ const f = JSON.parse(localStorage.getItem(FTE_FILTROS_LS)||'{}'); return {idioma:f.idioma||'todos', resolucion:f.resolucion||'todas', orden:f.orden||'recomendado'}; }
      catch(e){ return {idioma:'todos', resolucion:'todas', orden:'recomendado'}; }
    }
    function _fteGuardarFiltros(f){ try{ localStorage.setItem(FTE_FILTROS_LS, JSON.stringify({idioma:f.idioma, resolucion:f.resolucion, orden:f.orden})); }catch(e){} }

    // Qué resultados entran según para qué se ha abierto la hoja
    function _fteEntra(r, ctx){
      if(!ctx.nas) return true;
      if(!_hashDeFuente(r.s)) return false;                 // el NAS solo descarga torrents
      if(!ctx.serieNas) return true;
      const k = r.tipoT.clase;
      if(ctx.vista==='serie') return k==='serie';
      if(ctx.vista==='temporada') return k==='temporada' && (!r.tipoT.temporada || r.tipoT.temporada===ctx.season);
      return k==='episodio' || !!ctx.incluirPacks;           // capítulo elegido a mano
    }

    async function cargarFuentes(){
      const ctx = window._fte; if(!ctx) return;
      const body = document.getElementById('fte-body');
      const mi = (window._fteTurno = (window._fteTurno||0) + 1); // descarta respuestas de una petición anterior
      const vivo = ()=>mi===window._fteTurno && window._fte===ctx;
      if(ctx.serieNas && ctx.vista==='capitulos'){ _nasSerieCapitulos(ctx, body, vivo); return; }
      const intro = ctx.serieNas ? _nasSerieIntro(ctx) : ctx.nas ? _nasBloqueAuto() : null;
      const addons = addonsLeer();
      if(!addons.length){
        body.replaceChildren(...[intro].filter(Boolean), _fEl('div',{class:'fte-vacio'},
          _fEl('p',{class:'fte-msg',text:'Aún no has añadido addons. Necesitas al menos uno que ofrezca fuentes de vídeo, como Torrentio.'}),
          _fEl('button',{type:'button',class:'fte-btn fte-btn-prim',onclick:()=>{ cerrarFuentes(); abrirAddons(); }},'Añadir un addon')));
        return;
      }
      body.replaceChildren(...[intro].filter(Boolean), _fteCargando('Buscando en tus addons…'));
      let imdb;
      try{ imdb = await _imdbIdDe(ctx.tipo, ctx.tmdbId); }
      catch(e){ if(vivo()) body.replaceChildren(...[intro].filter(Boolean), _fEl('p',{class:'fte-msg fte-err',text:e.message})); return; }
      if(!vivo()) return;
      const tipoA = ctx.tipo==='tv' ? 'series' : 'movie';
      // Para buscar packs de una temporada se pregunta por su primer capítulo (los addons devuelven ahí los packs)
      const ep = ctx.serieNas && ctx.vista!=='episodio' ? 1 : ctx.episode;
      const temp = ctx.serieNas && ctx.vista==='serie' ? ctx.temporadas[0].n : ctx.season;
      const vid = ctx.tipo==='tv' ? `${imdb}:${temp}:${ep}` : imdb;
      const cands = addons.filter(a=>_addonManeja(a,'stream',tipoA,vid));
      if(!cands.length){ body.replaceChildren(...[intro].filter(Boolean), _fEl('p',{class:'fte-msg',text:'Ninguno de tus addons da fuentes de vídeo para '+(ctx.tipo==='tv'?'series':'películas')+'. Revisa «Mis addons».'})); return; }

      const resultados = [], estados = new Map(cands.map(a=>[a, {txt:'buscando…', ok:null}]));
      let pend = cands.length, mostrar = FTE_PAGINA, tmBuscar = null;
      const filtros = {..._fteFiltrosGuardados(), subtitulos:'todos', proveedor:'todos', buscar:''};

      // Controles: chips rápidos de idioma y calidad, orden, búsqueda y «Más filtros»
      const chips = (clave, titulo, opciones) => {
        const fila = _fEl('div',{class:'fte-chips',role:'group','aria-label':titulo});
        const pintarChips = ()=>fila.replaceChildren(...opciones.map(([v,t])=>_fEl('button',{type:'button',class:'fte-chip'+(filtros[clave]===v?' on':''),'aria-pressed':filtros[clave]===v?'true':'false',
          onclick:()=>{ filtros[clave]=v; _fteGuardarFiltros(filtros); mostrar=FTE_PAGINA; pintarChips(); pintar(); }},t)));
        pintarChips();
        return _fEl('div',{class:'fte-chips-fila'}, _fEl('span',{class:'fte-chips-tit',text:titulo}), fila);
      };
      const selOrden = _fEl('select',{'aria-label':'Ordenar',onchange:e=>{ filtros.orden=e.target.value; _fteGuardarFiltros(filtros); mostrar=FTE_PAGINA; pintar(); }},
        [['recomendado','Recomendado'],['calidad','Mejor calidad'],['semillas','Más semillas'],['tamano','Más ligero'],['original','Orden del addon']].map(([v,t])=>_fEl('option',{value:v,text:t,selected:filtros.orden===v})));
      const buscar = _fEl('input',{type:'search',placeholder:'Buscar en los nombres','aria-label':'Buscar en los resultados',
        oninput:e=>{ clearTimeout(tmBuscar); tmBuscar=setTimeout(()=>{ filtros.buscar=e.target.value.toLowerCase().trim(); mostrar=FTE_PAGINA; pintar(); },150); }});
      const sel = (clave, titulo, opciones) => _fEl('label',{},titulo,_fEl('select',{'aria-label':titulo,onchange:e=>{ filtros[clave]=e.target.value; mostrar=FTE_PAGINA; pintar(); }},opciones.map(([v,t])=>_fEl('option',{value:v,text:t}))));
      const mas = _fEl('details',{class:'fte-mas-filtros'}, _fEl('summary',{text:'Más filtros'}),
        _fEl('div',{class:'fte-filtros'},
          sel('subtitulos','Subtítulos',[['todos','Sin filtrar'],['es','En español'],['en','En inglés'],['indicados','Con alguno'],['desconocidos','Sin información']]),
          cands.length>1 ? sel('proveedor','Addon',[['todos','Todos'],...cands.map((a,i)=>[String(i),a.nombre])]) : null));
      const controles = _fEl('div',{class:'fte-controles'},
        chips('idioma','Idioma',[['todos','Todos'],['es','Español'],['cast','Castellano'],['lat','Latino'],['en','Inglés']]),
        chips('resolucion','Calidad',[['todas','Todas'],['2160','4K'],['1080','1080p'],['720','720p']]),
        _fEl('div',{class:'fte-fila-orden'}, buscar, selOrden), mas);
      const resumen = _fEl('div',{class:'fte-resumen',role:'status','aria-live':'polite'});
      const listaUI = _fEl('div',{class:'fte-lista'});
      const pie = _fEl('div',{class:'fte-pie'});
      body.replaceChildren(...[intro, controles, resumen, listaUI, pie,
        !ctx.nas && typeof _hostersSeccion==='function' ? _hostersSeccion(ctx) : null].filter(Boolean));

      const quitarFiltros = ()=>{ Object.assign(filtros,{idioma:'todos',resolucion:'todas',subtitulos:'todos',proveedor:'todos',buscar:''}); buscar.value=''; mas.querySelectorAll('select').forEach(s=>s.selectedIndex=0); _fteGuardarFiltros(filtros); mostrar=FTE_PAGINA; controles.querySelectorAll('.fte-chips').forEach(c=>c.querySelectorAll('.fte-chip').forEach((b,i)=>{ b.classList.toggle('on',i===0); b.setAttribute('aria-pressed',i===0?'true':'false'); })); pintar(); };

      function pasa(r){
        const m=r.meta,f=filtros;
        if(!_fteEntra(r, ctx)) return false;
        if(f.proveedor!=='todos'&&String(r.proveedor)!==f.proveedor)return false;
        if(f.buscar&&!m.texto.toLowerCase().includes(f.buscar))return false;
        if(f.idioma==='es'&&!m.es)return false;
        if(f.idioma==='cast'&&!m.cast)return false;
        if(f.idioma==='lat'&&!m.lat)return false;
        if(f.idioma==='en'&&!m.en)return false;
        if(f.idioma==='multi'&&!m.multi)return false;
        if(f.idioma==='desconocido'&&m.idiomaConocido)return false;
        if(/^\d+$/.test(f.resolucion)&&m.calidad!==Number(f.resolucion))return false;
        if(f.subtitulos==='indicados'&&!m.subs)return false;
        if(f.subtitulos==='es'&&!m.subEs)return false;
        if(f.subtitulos==='en'&&!m.subEn)return false;
        if(f.subtitulos==='desconocidos'&&m.subs)return false;
        return true;
      }
      // «Recomendado»: primero lo que se puede ver al momento, luego en español (castellano antes que latino),
      // luego 1080p/4K y más semillas
      const calidadRec = q => ({1080:5, 2160:4, 1440:4, 720:3}[q] || (q ? 1 : 2));
      function ordenar(lista){
        const o = filtros.orden;
        lista.sort((a,b)=>{
          if(o==='original') return a.proveedor-b.proveedor||a.pos-b.pos;
          let d = 0;
          if(o==='recomendado') d = (b.meta.alInstante-a.meta.alInstante) || (b.meta.es-a.meta.es) || (b.meta.cast-a.meta.cast) || (calidadRec(b.meta.calidad)-calidadRec(a.meta.calidad)) || (b.meta.semillas-a.meta.semillas);
          else if(o==='calidad') d = (b.meta.calidad-a.meta.calidad) || (b.meta.semillas-a.meta.semillas);
          else if(o==='semillas') d = (b.meta.semillas-a.meta.semillas) || (b.meta.calidad-a.meta.calidad);
          else if(o==='tamano') d = ((a.meta.tamano||Infinity)-(b.meta.tamano||Infinity)) || (b.meta.semillas-a.meta.semillas);
          return d || a.proveedor-b.proveedor || a.pos-b.pos;
        });
        return lista;
      }
      function pintar(){
        if(!vivo()) return;
        const entran = resultados.filter(r=>_fteEntra(r, ctx));
        const lista = ordenar(resultados.filter(pasa));
        const hayFiltro = filtros.idioma!=='todos'||filtros.resolucion!=='todas'||filtros.subtitulos!=='todos'||filtros.proveedor!=='todos'||!!filtros.buscar;
        // Resumen: cuántos hay y cómo ha ido cada addon, en una línea
        const estadoAddons = [...estados.entries()].map(([a,e])=>_fEl('span',{class:'fte-addon-est'+(e.ok===false?' mal':e.ok?' ok':''),title:e.txt}, a.nombre+' · '+e.txt));
        resumen.replaceChildren(...[
          _fEl('span',{class:'fte-cuenta'}, pend && !lista.length ? 'Buscando…' : `${lista.length} ${lista.length===1?'resultado':'resultados'}`+(hayFiltro&&lista.length!==entran.length?` de ${entran.length}`:'')),
          hayFiltro ? _fEl('button',{type:'button',class:'fte-link',onclick:quitarFiltros},'Quitar filtros') : null,
          _fEl('div',{class:'fte-addons'}, ...estadoAddons)].filter(Boolean));
        const vistos = lista.slice(0, mostrar);
        listaUI.replaceChildren(...vistos.map(r=>_fteTarjeta(r, ctx)));
        if(!lista.length) listaUI.append(_fEl('p',{class:'fte-msg fte-vacio'},
          pend ? 'Esperando a los addons…' :
          !entran.length ? (ctx.serieNas ? _nasSerieSinResultados(ctx) : ctx.nas ? 'Tus addons no han devuelto ningún torrent para este título.' : 'No se han encontrado fuentes.') :
          'Ningún resultado con estos filtros.'));
        // Una sola explicación para los torrents que no se pueden ver aquí (en vez de repetirla en cada tarjeta)
        const torrentsSolo = !ctx.nas && vistos.some(r=>r.clase.tipo==='no' && _hashDeFuente(r.s));
        pie.replaceChildren(...[
          lista.length>mostrar ? _fEl('button',{type:'button',class:'fte-btn fte-mostrar-mas',onclick:()=>{ mostrar+=FTE_PAGINA; pintar(); }},`Mostrar ${Math.min(FTE_PAGINA,lista.length-mostrar)} más · quedan ${lista.length-mostrar}`) : null,
          torrentsSolo ? _fEl('p',{class:'fte-nota-corta',text:'«Torrent» significa que no se puede ver aquí sin un servicio como AllDebrid configurado en el addon, pero sí puedes enviarlo al NAS.'}) : null].filter(Boolean));
      }
      pintar();
      cands.forEach((a,proveedor)=>{
        _fetchAddon(_addonUrl(a,'stream',tipoA,vid)).then(d=>{
          if(!vivo())return;
          const raw=Array.isArray(d&&d.streams)?d.streams:[];
          raw.slice(0,500).forEach((original,pos)=>{
            const s=_fuenteLimpia(original); if(!s) return;
            resultados.push({s,a,proveedor,pos,meta:_fteMetadatos(original),tipoT:ctx.tipo==='tv'?_fteTipoTorrent(s):{clase:'pelicula'},clase:_clasificarFuente(s)});
          });
          estados.set(a, {txt: raw.length ? raw.length+(raw.length>500?'+':'')+' resultados' : 'sin resultados', ok: raw.length>0});
        }).catch(e=>{ if(vivo()) estados.set(a, {txt: e.message.replace(/\.$/,''), ok:false}); })
          .finally(()=>{ if(vivo()){ pend--; pintar(); } });
      });
    }
    function _fteCargando(txt){ return _fEl('div',{class:'fte-cargando',role:'status'}, _fEl('span',{class:'fte-spin','aria-hidden':'true'}), _fEl('span',{text:txt})); }

    // ── Tarjeta de un resultado ──
    // Etiquetas con lo importante, el nombre del torrent o archivo, un botón principal y el resto en «⋯».
    function _fteEtiquetas(r, ctx){
      const m = r.meta, t = [];
      const add = (txt, cls) => t.push(_fEl('span',{class:'fte-tag'+(cls?' '+cls:''),text:txt}));
      if(m.alInstante) add('⚡ Al instante','ok');
      if(m.calidad) add(m.calidad>=2160?'4K':m.calidad+'p','q');
      if(m.dv) add('Dolby Vision'); else if(m.hdr) add('HDR');
      if(r.tipoT && r.tipoT.clase==='temporada') add('Temporada'+(r.tipoT.temporada?' '+r.tipoT.temporada:'')+' completa','pack');
      if(r.tipoT && r.tipoT.clase==='serie') add('Serie completa','pack');
      // En los packs, el tamaño que indica el addon suele ser el de un solo capítulo: mejor no mostrarlo
      if(m.tamano && !(r.tipoT && (r.tipoT.clase==='temporada'||r.tipoT.clase==='serie'))) add(_nasBytes(m.tamano));
      if(m.semillas>=0) add('👤 '+m.semillas.toLocaleString('es-ES'));
      const idioma = m.cast ? 'Castellano' : m.lat ? 'Latino' : m.es ? 'Español' : m.multi ? 'Multi' : m.en ? 'Inglés' : '';
      if(idioma) add(idioma, m.es ? 'es' : '');
      if(m.subEs) add('Subs ES');
      if(r.clase && r.clase.tipo==='no' && _hashDeFuente(r.s) && !ctx.nas) add('Torrent','tor');
      return _fEl('div',{class:'fte-tags'}, ...t);
    }
    function _fteTarjeta(r, ctx){
      const s = r.s, a = r.a;
      const nombre = _fteNombreTorrent(s), archivo = _fteArchivo(s);
      const sitio = (String(s.description||'').match(/⚙️?\s*([^\n👤💾]+)/u)||[])[1];
      const origen = [a.nombre, sitio && sitio.trim()].filter(Boolean).join(' · ');
      const estado = _fEl('p',{class:'fte-estado',role:'status','aria-live':'polite'});
      const tarjeta = _fEl('article',{class:'fte-card'},
        _fteEtiquetas(r, ctx),
        _fEl('h4',{class:'fte-card-tit',text:nombre, title:nombre}),
        archivo ? _fEl('p',{class:'fte-card-sub',text:'Archivo: '+archivo, title:archivo}) : null,
        _fEl('p',{class:'fte-card-origen',text:origen}));
      const acciones = ctx.nas ? _nasAccionTarjeta(r, ctx, estado) : _fteAcciones(r, ctx, estado);
      tarjeta.append(acciones, estado);
      return tarjeta;
    }
    // Compatibilidad: otras partes de la app (Cinecalidad) pintan un resultado suelto
    function _fteFila(s, a, ctx){
      return _fteTarjeta({s, a, meta:_fteMetaLimpia(s), tipoT: ctx.tipo==='tv' ? _fteTipoTorrent(s) : {clase:'pelicula'}, clase:_clasificarFuente(s)}, ctx);
    }

    // Acciones en «Ver»: la principal visible y las demás en un menú «⋯»
    function _fteAcciones(r, ctx, estado){
      const s = r.s, c = r.clase || _clasificarFuente(s), nombre = s.name || r.a.nombre;
      const fila = _fEl('div',{class:'fte-card-acc'}), menu = _fEl('div',{class:'fte-menu',hidden:true});
      const itemMenu = (txt, ico, props) => _fEl(props && props.href ? 'a' : 'button', {class:'fte-menu-item', type: props && props.href ? null : 'button', ...props}, _fEl('span',{class:'fte-menu-ico','aria-hidden':'true',text:ico}), txt);
      let principal = null;
      if(c.tipo==='play') principal = _fEl('button',{type:'button',class:'fte-btn fte-btn-prim',onclick:()=>reproducirFuente(s,{...ctx,fuente:nombre})},'▶ Reproducir');
      else if(c.tipo==='externa') principal = _fEl('a',{class:'fte-btn fte-btn-prim',href:c.href,target:'_blank',rel:'noopener noreferrer'},'Abrir ↗');
      const nas = _nasBotonEnVer(s, r.a, ctx, estado, r.tipoT);
      if(!principal && nas){ nas.className = 'fte-btn fte-btn-prim'; principal = nas; }
      else if(nas) menu.append(itemMenu(nas.textContent, '⇣', {onclick:()=>nas.click()}));
      // VLC, copiar y descargar (solo si hay un enlace directo)
      const vlc = !s.proxyHeaders && s.url && _vlcHref(s.url, 'stream', ctx.titulo);
      if(vlc){
        if(_esVLCiOS() || _esAndroid()) menu.append(itemMenu('Abrir en VLC','◉',{href:vlc,onclick:()=>{ _pausarParaVLC(); estado.textContent='Abriendo VLC… Si no se abre, comprueba que esté instalado o copia el enlace.'; }}));
        else menu.append(itemMenu('Abrir en VLC (.m3u)','◉',{onclick:()=>_guardarListaVLC(s.url,ctx.titulo,estado)}));
      }
      if(s.url && _urlStreamValida(s.url)){
        menu.append(itemMenu('Copiar enlace','⧉',{onclick:()=>_copiarFuenteVLC(s.url,estado)}));
        if(_esArchivoDescargable(s.url)) menu.append(_esVLCiOS()
          ? itemMenu('Descargar en VLC','⤓',{href:_vlcHref(s.url,'download'),onclick:()=>{ _pausarParaVLC(); estado.textContent='Descarga enviada a VLC. Mira allí el progreso y que haya espacio.'; }})
          : itemMenu('Descargar el archivo','⤓',{href:_urlSegura(s.url),download:'',target:'_blank',rel:'noopener noreferrer',referrerpolicy:'no-referrer',onclick:()=>{ estado.textContent='Se abrirá el archivo original. Si el navegador lo reproduce, usa su opción de descargar.'; }}));
      }
      if(c.tipo==='play' && c.aviso) menu.append(_fEl('p',{class:'fte-menu-nota',text:c.aviso}));
      if(principal) fila.append(principal);
      else fila.append(_fEl('span',{class:'fte-no-compat',title:c.motivo||''},'No compatible: '+(c.motivo||'formato desconocido')));
      if(menu.childNodes.length){
        const btnMas = _fEl('button',{type:'button',class:'fte-btn fte-btn-mas','aria-expanded':'false','aria-label':'Más opciones',
          onclick:()=>{ const abrir = menu.hidden; menu.hidden = !abrir; btnMas.setAttribute('aria-expanded', String(abrir)); btnMas.classList.toggle('on', abrir); }},'⋯');
        fila.append(btnMas);
      }
      return _fEl('div',{}, fila, menu);
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
