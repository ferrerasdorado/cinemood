// CineMood · Premios y festivales
// (Parte de index.html; se carga como script clásico: todo comparte el mismo ámbito global.)

    // ══ PREMIOS Y FESTIVALES: Óscar, Goya y Cannes desde Wikipedia (se actualiza al momento), enlazados a TMDB por Wikidata ══
    const _ordinal = n => n + (n%100>=11 && n%100<=13 ? 'th' : ({1:'st',2:'nd',3:'rd'})[n%10] || 'th');
    const PREMIOS = {
      oscar: {n:'Óscar', emoji:'🏆', pagina: y=>`${_ordinal(y-1928)}_Academy_Awards`, temporada:[115,331],
        cats: [['Picture','Mejor película'],['Director','Mejor dirección',1],['Actor','Mejor actor',1],['Actress','Mejor actriz',1],['Supporting Actor','Mejor actor de reparto',1],['Supporting Actress','Mejor actriz de reparto',1],['Original Screenplay','Mejor guion original'],['Adapted Screenplay','Mejor guion adaptado'],['International','Mejor película internacional'],['Animated','Mejor película de animación']],
        cat: h => {
          if(/Documentary|Short|Live Action|Song|Score|Sound|Effects|Editing|Cinematography|Makeup|Costume|Production Design|Casting/i.test(h)) return null;
          if(/Picture/i.test(h)) return 'Picture'; if(/Direct/i.test(h)) return 'Director';
          if(/Supporting Actor|Actor in a Supporting/i.test(h)) return 'Supporting Actor'; if(/Supporting Actress|Actress in a Supporting/i.test(h)) return 'Supporting Actress';
          if(/Actress/i.test(h)) return 'Actress'; if(/Actor/i.test(h)) return 'Actor';
          if(/Original Screenplay/i.test(h)) return 'Original Screenplay'; if(/Adapted Screenplay/i.test(h)) return 'Adapted Screenplay';
          if(/International Feature|Foreign Language/i.test(h)) return 'International'; if(/Animated Feature/i.test(h)) return 'Animated';
          return null; }},
      goya: {n:'Goya', emoji:'🇪🇸', pagina: y=>`${_ordinal(y-1986)}_Goya_Awards`, temporada:[1201,310],
        cats: [['Film','Mejor película'],['Director','Mejor dirección',1],['New Director','Mejor dirección novel',1],['Actor','Mejor actor',1],['Actress','Mejor actriz',1],['Supporting Actor','Mejor actor de reparto',1],['Supporting Actress','Mejor actriz de reparto',1],['Original Screenplay','Mejor guion original'],['Adapted Screenplay','Mejor guion adaptado'],['Animated','Mejor película de animación'],['Ibero','Mejor película iberoamericana'],['European','Mejor película europea']],
        cat: h => {
          if(/Short|Documentary|Cinematography|Editing|Art Direction|Production|Sound|Effects|Costume|Makeup|Score|Song|New Actor|New Actress/i.test(h)) return null;
          if(/New Director/i.test(h)) return 'New Director'; if(/Animated/i.test(h)) return 'Animated';
          if(/Ibero|Spanish Language Foreign/i.test(h)) return 'Ibero'; if(/European/i.test(h)) return 'European';
          if(/Director/i.test(h)) return 'Director'; if(/Supporting Actor/i.test(h)) return 'Supporting Actor'; if(/Supporting Actress/i.test(h)) return 'Supporting Actress';
          if(/Actress/i.test(h)) return 'Actress'; if(/Actor/i.test(h)) return 'Actor';
          if(/Original Screenplay/i.test(h)) return 'Original Screenplay'; if(/Adapted Screenplay/i.test(h)) return 'Adapted Screenplay';
          if(/Best Film/i.test(h)) return 'Film'; return null; }},
      cannes: {n:'Cannes', emoji:'🌴', pagina: y=>`${y}_Cannes_Film_Festival`, temporada:[410,610], festival:true, top:'Palma de Oro',
        palm: [[/Palme d/i,'Palma de Oro'],[/Grand Prix/i,'Gran Premio'],[/Jury Prize/i,'Premio del Jurado'],[/Best Director/i,'Mejor dirección'],[/Best Actress/i,'Mejor interpretación femenina'],[/Best Actor/i,'Mejor interpretación masculina'],[/Best Screenplay/i,'Mejor guion'],[/Special Award|Special Prize/i,'Premio especial']]},
      // ── solo en el perfil de Madait (ver _premExtra) ──
      bafta: {n:'BAFTA', emoji:'🎭', extra:true, desde:2000, pagina: y=>`${_ordinal(y-1947)}_British_Academy_Film_Awards`, temporada:[1201,220],
        cats: [['Film','Mejor película'],['British','Mejor película británica'],['Director','Mejor dirección',1],['Actor','Mejor actor',1],['Actress','Mejor actriz',1],['Supporting Actor','Mejor actor de reparto',1],['Supporting Actress','Mejor actriz de reparto',1],['Original Screenplay','Mejor guion original'],['Adapted Screenplay','Mejor guion adaptado'],['International','Mejor película de habla no inglesa'],['Animated','Mejor película de animación']],
        cat: h => {
          if(/Documentary|Short|Song|Score|Music|Sound|Effects|Editing|Cinematography|Make ?up|Costume|Production Design|Casting|Debut|Rising Star|Children|Outstanding British Contribution|Fellowship/i.test(h)) return null;
          if(/Outstanding British Film/i.test(h)) return 'British'; if(/Not in the English|Foreign|Non-English/i.test(h)) return 'International'; if(/Animated/i.test(h)) return 'Animated';
          if(/Direct/i.test(h)) return 'Director';
          if(/Actor in a Supporting/i.test(h)) return 'Supporting Actor'; if(/Actress in a Supporting/i.test(h)) return 'Supporting Actress';
          if(/Actress/i.test(h)) return 'Actress'; if(/Actor/i.test(h)) return 'Actor';
          if(/Original Screenplay/i.test(h)) return 'Original Screenplay'; if(/Adapted Screenplay/i.test(h)) return 'Adapted Screenplay';
          if(/Best Film/i.test(h)) return 'Film'; return null; }},
      globos: {n:'Globos', emoji:'🌐', extra:true, desde:2000, pagina: y=>`${_ordinal(y-1943)}_Golden_Globe_Awards`, temporada:[1201,115],
        cats: [['Drama','Mejor película dramática'],['Comedy','Mejor película musical o comedia'],['Director','Mejor dirección',1],['Actor Drama','Mejor actor de drama',1],['Actress Drama','Mejor actriz de drama',1],['Actor Comedy','Mejor actor de comedia o musical',1],['Actress Comedy','Mejor actriz de comedia o musical',1],['Supporting Actor','Mejor actor de reparto',1],['Supporting Actress','Mejor actriz de reparto',1],['Screenplay','Mejor guion'],['International','Mejor película de habla no inglesa'],['Animated','Mejor película de animación']],
        cat: h => {
          if(/Television|Series|Stand-Up|Song|Score|Box Office|Podcast|Cecil|Carol Burnett/i.test(h)) return null;
          if(/Animated/i.test(h)) return 'Animated'; if(/Non-English|Foreign Language/i.test(h)) return 'International';
          if(/Supporting Actor/i.test(h)) return 'Supporting Actor'; if(/Supporting Actress/i.test(h)) return 'Supporting Actress';
          const com = /Musical or Comedy|Comedy or Musical/i.test(h);
          if(/Actress/i.test(h)) return com ? 'Actress Comedy' : 'Actress Drama'; if(/Actor/i.test(h)) return com ? 'Actor Comedy' : 'Actor Drama';
          if(/Director/i.test(h)) return 'Director'; if(/Screenplay/i.test(h)) return 'Screenplay';
          if(/Motion Picture/i.test(h)) return com ? 'Comedy' : /Drama/i.test(h) ? 'Drama' : null; return null; }},
      venecia: {n:'Venecia', emoji:'🦁', extra:true, desde:2000, pagina: y=>`${_ordinal(y-1943)}_Venice_International_Film_Festival`, temporada:[720,915], festival:true, top:'León de Oro', topArt:'El',
        palm: [[/Golden Lion/i,'León de Oro'],[/Grand Jury/i,'Gran Premio del Jurado'],[/Special Jury/i,'Premio Especial del Jurado'],[/Silver Lion/i,'León de Plata · mejor dirección'],[/Volpi.*Actress|Best Actress/i,'Copa Volpi · mejor actriz'],[/Volpi.*Actor|Best Actor/i,'Copa Volpi · mejor actor'],[/Screenplay/i,'Mejor guion'],[/Mastroianni/i,'Premio Marcello Mastroianni']]},
      berlin: {n:'Berlín', emoji:'🐻', extra:true, desde:2000, pagina: y=>`${_ordinal(y-1950)}_Berlin_International_Film_Festival`, temporada:[115,305], festival:true, top:'Oso de Oro', topArt:'El',
        palm: [[/Golden Bear/i,'Oso de Oro'],[/Grand Jury/i,'Gran Premio del Jurado'],[/Jury Prize/i,'Premio del Jurado'],[/Best Director/i,'Oso de Plata · mejor dirección'],[/Supporting Performance/i,'Oso de Plata · mejor interpretación de reparto'],[/Leading Performance/i,'Oso de Plata · mejor interpretación'],[/Best Actress/i,'Oso de Plata · mejor actriz'],[/Best Actor/i,'Oso de Plata · mejor actor'],[/Screenplay/i,'Oso de Plata · mejor guion'],[/Artistic Contribution/i,'Oso de Plata · contribución artística']]}
    };
    // Más festivales y más años: solo en el perfil de Madait
    function _premExtra(){ return /^madait$/i.test(String(sesionActual?.user?.user_metadata?.nombre || '').trim()); }
    const _premVisible = k => !!PREMIOS[k] && (!PREMIOS[k].extra || _premExtra());
    async function _premWikitexto(pagina){
      const d = await (await fetch(`https://en.wikipedia.org/w/api.php?action=parse&page=${pagina}&prop=wikitext&format=json&origin=*&redirects=1`)).json();
      return d?.parse?.wikitext?.['*'] || '';
    }
    const _premSinNotas = wt => wt.replace(/<ref[^>]*\/>/g,'').replace(/<ref[\s\S]*?<\/ref>/g,'');
    const _premLinkCursiva = /''\[\[([^\]|]+)(?:\|([^\]]+))?\]\]''/;
    function _premEnlaces(wt){ const e = {}; wt.replace(/''\[\[([^\]|]+)(?:\|([^\]]+))?\]\]''/g, (m, dst, txt)=>{ e[(txt||dst).trim()] = dst.trim(); return m; }); return e; }
    function _premPeli(linea, enlaces){
      let p = linea.match(_premLinkCursiva);
      if(!p){ const pl = linea.replace(/'{3}/g,'').match(/''([^'\[\]]+)''/); if(pl) p = [pl[0], enlaces[pl[1].trim()] || pl[1].trim(), pl[1].trim()]; }
      return p;
    }
    const _premTitulo = (p) => (p[2]||p[1]).replace(/\s*\((?:\d{4} )?film\)/,'').trim();
    // Óscar y Goya: bloques {{Award category}} con * ganadora (‡) y ** nominadas
    // Páginas antiguas (Globos de Oro hasta ~2022): tablas con la categoría en la cabecera (!) y las nominadas en la celda de debajo.
    // Se convierten al formato {{Award category}} para leerlas igual.
    function _premTablaACategorias(wt){
      const out = []; let cola = [], prefijo = '';
      wt.split('\n').forEach(l=>{
        if(/^\{\|/.test(l)){ cola = []; prefijo = ''; }
        const h = l.match(/^!(.*)$/);
        if(h){ const txt = h[1].replace(/^[^|\[]*\|(?!\|)/, '').trim(); if(/colspan/i.test(h[1])) prefijo = txt; else cola.push(txt); return; }
        if(/^\|\s*(valign|style)[^|]*\|\s*$/.test(l) && cola.length){ out.push(`{{Award category|x|${prefijo} ${cola.shift()}}}`); return; }
        if(/^'{3,5}.*\[\[/.test(l)){ out.push('* ' + l); return; } // la ganadora, en negrita y sin viñeta
        out.push(l);
      });
      return out.join('\n');
    }
    function _premParsearCategorias(wt, def){
      if(!/\{\{Award category/.test(wt)) wt = _premTablaACategorias(wt);
      wt = _premSinNotas(wt); const cats = [], enlaces = _premEnlaces(wt);
      const trozos = wt.split(/\{\{Award category\|(?:\{\{[^}]*\}\}|[^|\n]*)\|/);
      for(let i=1; i<trozos.length; i++){
        const salto = trozos[i].indexOf('\n'), cab = trozos[i].slice(0, salto<0 ? undefined : salto);
        const clave = def.cat(cab), c = def.cats.find(([k])=>k===clave); if(!c || cats.some(x=>x.k===c[0])) continue;
        const lineas = []; for(const l of (salto<0 ? '' : trozos[i].slice(salto)).split('\n')){ if(/^\*/.test(l)) lineas.push(l); else if(lineas.length && l.trim()) break; }
        const anidada = lineas.some(l=>/^\*\*/.test(l)), conDaga = lineas.some(l=>l.includes('‡'));
        const noms = [];
        lineas.forEach(l=>{
          const m = l.match(/^(\*{1,2})\s*(.*)$/); if(!m) return;
          // fuera la negrita (tres comillas) para no confundirla con la cursiva de los títulos (dos comillas)
          const linea = m[2].replace(/'{5}/g, "''").replace(/'{3}/g, ''), gana = conDaga ? linea.includes('‡') : anidada ? m[1]==='*' : /'{3}/.test(m[2]);
          const p = _premPeli(linea, enlaces); if(!p) return;
          const antes = linea.slice(0, linea.indexOf(p[0])).replace(/'{3}/g,'').replace(/\{\{ill\|([^|}]+)[^}]*\}\}/g, '$1');
          const pers = c[2] ? (antes.match(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/) || antes.match(/^\s*([^–—\-\[{]+?)\s+[–—-]\s*$/) || []) : [];
          noms.push({wiki:p[1].trim(), titulo:_premTitulo(p), persona: pers[0] ? (pers[2]||pers[1]).trim() : null, gana});
        });
        if(noms.length) cats.push({k:c[0], n:c[1], persona:!!c[2], noms});
      }
      def.cats.forEach(([k],i)=>{}); cats.sort((a,b)=>def.cats.findIndex(c=>c[0]===a.k)-def.cats.findIndex(c=>c[0]===b.k));
      return {cats, palmares:[]};
    }
    // Festivales (Cannes, Venecia, Berlín): películas a concurso (tabla) y, al acabar, el palmarés
    function _premParsearFestival(wt, def){
      wt = _premSinNotas(wt); const enlaces = _premEnlaces(wt);
      // «In Competition» / «Main Competition» dentro de la selección oficial, y otra vez dentro de los premios oficiales
      const re = /^={2,3}(?!=)\s*(?:In|Main) Competition\b[^=\n]*={2,3}\s*$/gmi;
      const tras = (cab) => { const m = wt.search(cab); if(m<0) return -1; re.lastIndex = m; const x = re.exec(wt); return x ? x.index : -1; };
      let sel = tras(/^==\s*Official Se\w*\s*==\s*$/mi), prem = tras(/^==\s*Official Awards\s*==\s*$/mi);
      // la de «Juries» (el jurado de la competición) no vale
      const enJurado = i => { if(wt[i+2]!=='=') return false; const cabs = [...wt.slice(0, i).matchAll(/^==(?!=)\s*([^=\n]+?)\s*==\s*$/gm)]; return cabs.length && /jur/i.test(cabs[cabs.length-1][1]); };
      re.lastIndex = 0; const todas = [...wt.matchAll(re)].map(m=>m.index).filter(i=>!enJurado(i));
      // palmarés escrito directamente bajo «Official Awards», sin subsección
      const oa = wt.search(/^==\s*Official Awards\s*==\s*$/mi);
      if(oa>=0){ const sig = wt.slice(oa+5).search(/\n==(?!=)/), finOa = sig<0 ? wt.length : oa+5+sig; if(prem<0 || prem>finOa) prem = oa; }
      if(sel<0) sel = todas[0] ?? -1; if(prem<0 && todas.length>1) prem = todas.find(i=>i>sel) ?? -1;
      if(sel<0) return {cats:[], palmares:[]};
      const pos = [sel, prem].filter(i=>i>=0);
      const seccion = i => { const ini = pos[i], fin = wt.indexOf('\n==', ini+10); return wt.slice(ini, fin<0 ? undefined : fin); };
      const compet = [], ya = new Set();
      seccion(0).split('\n').forEach(l=>{ if(!/^\|/.test(l)) return; l = l.replace(/'{5}/g, "''").replace(/'{3}/g, ''); const p = l.match(_premLinkCursiva); if(p && !ya.has(p[1])){ ya.add(p[1]); compet.push({wiki:p[1].trim(), titulo:_premTitulo(p), persona:null, gana:false}); } });
      const palmares = []; let premio = null;
      if(pos.length>1) seccion(1).split('\n').forEach(l=>{
        const m = l.match(/^(\*{1,2})\s*(.*)$/); if(!m) return;
        if(m[1]==='*'){ const cab = m[2].split(':')[0]; premio = (def.palm.find(([re])=>re.test(cab))||[])[1] || null; }
        if(!premio) return;
        let ini = 0;
        if(m[1]==='*'){ let prof = 0; for(let k=0; k<m[2].length; k++){ const ch = m[2][k]; if(ch==='[') prof++; else if(ch===']') prof--; else if(ch===':' && prof<=0){ ini = k+1; break; } } }
        const resto = m[2].slice(ini), p = _premPeli(resto, enlaces); if(!p) return;
        const antes = resto.slice(0, resto.indexOf(p[0]));
        const pers = antes.match(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/);
        palmares.push({premio, wiki:p[1].trim(), titulo:_premTitulo(p), persona: pers ? (pers[2]||pers[1]).trim() : null});
      });
      const palma = palmares.find(x=>x.premio===def.top);
      compet.forEach(n=>{ n.gana = !!palma && palma.wiki===n.wiki; });
      return {cats: compet.length ? [{k:'Palme', n:`${def.top} · películas a concurso`, persona:false, noms:compet}] : [], palmares};
    }
    // título de Wikipedia → Wikidata → id de TMDB
    async function _premIdsTmdb(titulos){
      const res = {};
      for(let i=0; i<titulos.length; i+=40){
        const lote = titulos.slice(i, i+40);
        const q = await (await fetch(`https://en.wikipedia.org/w/api.php?action=query&prop=pageprops&ppprop=wikibase_item&redirects=1&format=json&origin=*&titles=${encodeURIComponent(lote.join('|'))}`)).json();
        const norm = {}; (q.query?.normalized||[]).concat(q.query?.redirects||[]).forEach(x=>{ norm[x.to] = (norm[x.from] || x.from); });
        const qid = {}; Object.values(q.query?.pages||{}).forEach(pg=>{ if(pg.pageprops?.wikibase_item){ let t = pg.title, n = 0; while(norm[t] && norm[t]!==t && n++<5) t = norm[t]; qid[pg.pageprops.wikibase_item] = t; } });
        const ids = Object.keys(qid); if(!ids.length) continue;
        const w = await (await fetch(`https://www.wikidata.org/w/api.php?action=wbgetentities&props=claims&format=json&origin=*&ids=${ids.join('|')}`)).json();
        Object.entries(w.entities||{}).forEach(([id,e])=>{ const c = e.claims?.P4947?.[0]?.mainsnak?.datavalue?.value; if(c) res[qid[id]] = Number(c); });
      }
      return res;
    }
    // Carga con caché: lo guardado se enseña al momento y, si es viejo, se actualiza por detrás (alAvanzar se llama según llegan datos)
    async function _premCargar(fest, anio, alAvanzar){
      const clave = `cm:premios:${fest}:${anio}`;
      let guardado = null; try{ guardado = JSON.parse(localStorage.getItem(clave)||'null'); }catch(e){}
      const viejo = !guardado || Date.now()-guardado.t > (guardado.final ? 7*864e5 : 3*3600e3);
      if(guardado && !viejo) return guardado;
      const nuevo = (async()=>{
        const wt = await _premWikitexto(PREMIOS[fest].pagina(anio));
        const {cats, palmares} = PREMIOS[fest].festival ? _premParsearFestival(wt, PREMIOS[fest]) : _premParsearCategorias(wt, PREMIOS[fest]);
        if(!cats.length) return null;
        const titulos = [...new Set([...cats.flatMap(c=>c.noms.map(n=>n.wiki)), ...palmares.map(p=>p.wiki)])];
        const ids = await _premIdsTmdb(titulos);
        const datos = {t: Date.now(), fest, anio, cats, palmares, pelis: {}, final: cats.some(c=>c.noms.some(n=>n.gana)) || palmares.length>0};
        // las pelis ya conocidas se reaprovechan; las nuevas se piden (ficha + reparto, que sirve también para tu nota, y plataformas)
        Object.assign(datos.pelis, guardado?.pelis || {});
        if(!guardado && alAvanzar) alAvanzar(datos);
        let ultimo = 0;
        await _fetchEnLotes(titulos.filter(t=>ids[t] && !datos.pelis[t]), async t=>{
          try{
            const [pak, pv] = await Promise.all([_fetchDetalleYCreditos('movie', ids[t]), _tmdbJson(`/movie/${ids[t]}/watch/providers`).catch(()=>({}))]);
            const d = pak && pak.detalle; if(!d || !d.id) return;
            _piGuardar('movie', d.id, _infoDesdePak('movie', pak));
            datos.pelis[t] = {id:d.id, t:d.title || t, poster:d.poster_path, f:d.release_date || '', donde:(((pv.results||{}).ES||{}).flatrate||[]).map(x=>x.provider_name).slice(0,2)};
            if(alAvanzar && Date.now()-ultimo > 500){ ultimo = Date.now(); alAvanzar(datos); }
          }catch(e){}
        }, 6);
        datos.completo = true;
        try{ localStorage.setItem(clave, JSON.stringify(datos)); }catch(e){}
        return datos;
      })();
      if(guardado){ nuevo.then(d=>{ if(d && alAvanzar) alAvanzar(d); }).catch(()=>{}); return guardado; }
      return nuevo;
    }
    async function _premAnioActual(fest){
      const y = new Date().getFullYear();
      for(const a of [y, y-1]){ try{ const d = await _premCargar(fest, a); if(d) return a; }catch(e){} }
      return y-1;
    }
    // porra: en tu cuenta (como tus notas por temporada). Óscar con la clave del año (como antes); el resto, «festival:año»
    const PORRA_LS = 'cm:porra'; let _porraT = null;
    function _porraLeer(){ try{ return JSON.parse(localStorage.getItem(PORRA_LS)||'{}') || {}; }catch(e){ return {}; } }
    function _porraGuardar(o){ try{ localStorage.setItem(PORRA_LS, JSON.stringify(o)); }catch(e){} if(!sesionActual) return; clearTimeout(_porraT); _porraT = setTimeout(async ()=>{ try{ await sb.auth.updateUser({ data: { cm_porra: o } }); }catch(e){} }, 700); }
    function porraDesdeCuenta(){ const r = sesionActual?.user?.user_metadata?.cm_porra; if(r && typeof r==='object'){ try{ localStorage.setItem(PORRA_LS, JSON.stringify(r)); }catch(e){} } else if(sesionActual){ const o = _porraLeer(); if(Object.keys(o).length) _porraGuardar(o); } }
    const _porraClave = (fest, anio) => fest==='oscar' ? String(anio) : `${fest}:${anio}`;
    function abrirOscar(anio){ return abrirPremios('oscar', anio); }
    async function abrirPremios(fest, anio){
      if(!sesionActual){ mostrarCuenta(); return; }
      if(document.querySelector('.pantalla.activa')?.id!=='p-oscar') irA('p-oscar');
      fest = fest || window._premFest || 'oscar'; if(!_premVisible(fest)) fest = 'oscar'; window._premFest = fest;
      const cont = document.getElementById('osc-cont'), turno = (window._premTurno = (window._premTurno||0)+1);
      document.getElementById('osc-titulo').textContent = 'Premios y festivales';
      cont.innerHTML = _premPestanas(fest) + '<p class="rk-ayuda">Cargando…</p>';
      try{
        window._premAnios = window._premAnios || {};
        anio = anio || window._premAnios[fest] || await _premAnioActual(fest);
        if(turno!==window._premTurno) return;
        window._premAnios[fest] = anio;
        if(sesionActual && !(window.idsVistosSet && window.idsVistosSet.size)){ try{ await refrescarIdsVistos(); }catch(e){} }
        _modeloNotaObtener().then(()=>{ if(turno===window._premTurno && window._premDatos) _premPintar(); }).catch(()=>{});
        const d = await _premCargar(fest, anio, dd=>{ if(turno===window._premTurno){ window._premDatos = dd; _premPintar(); } });
        if(turno!==window._premTurno) return;
        if(!d){ cont.innerHTML = _premPestanas(fest) + _premAnios(fest, anio) + '<p class="rk-ayuda">Todavía no hay datos publicados de esa edición.</p>'; return; }
        window._premDatos = d; _premPintar();
      }catch(e){ if(turno===window._premTurno) cont.innerHTML = _premPestanas(fest) + '<p class="rk-ayuda">No se pudieron cargar. Comprueba tu conexión e inténtalo de nuevo.</p>'; }
    }
    const _premPestanas = fest => `<div class="osc-ediciones prem-pestanas">${Object.entries(PREMIOS).filter(([k])=>_premVisible(k)).map(([k,v])=>`<button type="button" class="noche-chip${k===fest?' activo':''}" onclick="abrirPremios('${k}')">${v.emoji} ${v.n}</button>`).join('')}</div>`;
    const _premAnios = (fest, anio) => {
      const y = new Date().getFullYear(), recientes = [y, y-1, y-2, y-3];
      const chips = recientes.map(a=>`<button type="button" class="noche-chip${a===anio?' activo':''}" onclick="abrirPremios('${fest}', ${a})">${a}</button>`).join('');
      if(!_premExtra()) return `<div class="osc-ediciones">${chips}</div>`;
      // más años: desde 2000 (lo que la Wikipedia tiene con el mismo formato)
      const desde = PREMIOS[fest].desde || 2000, otros = []; for(let a=y-4; a>=desde; a--) otros.push(a);
      const sel = `<select class="noche-chip prem-mas-anios${recientes.includes(anio) ? '' : ' activo'}" onchange="if(this.value) abrirPremios('${fest}', Number(this.value))" aria-label="Más años">
          ${recientes.includes(anio) ? '<option value="">Más años ▾</option>' : ''}${otros.map(a=>`<option value="${a}"${a===anio?' selected':''}>${a}${a===anio?' ▾':''}</option>`).join('')}</select>`;
      return `<div class="osc-ediciones">${chips}${sel}</div>`;
    };
    function _premPintar(){
      const d = window._premDatos, cont = document.getElementById('osc-cont'); if(!d) return;
      const def = PREMIOS[d.fest], vistos = window.idsVistosSet || new Set(), porra = (_porraLeer()[_porraClave(d.fest, d.anio)] || {});
      const y = window.scrollY;
      const pelisNom = [...new Set(d.cats.flatMap(c=>c.noms.map(n=>n.wiki)))].map(w=>d.pelis[w]).filter(Boolean), nVistas = pelisNom.filter(x=>vistos.has(`${x.id}-movie`)).length, total = [...new Set(d.cats.flatMap(c=>c.noms.map(n=>n.wiki)))].length;
      const elegidas = d.cats.filter(c=>porra[c.k]!=null).length, aciertos = d.final ? d.cats.filter(c=>porra[c.k]!=null && c.noms[porra[c.k]]?.gana).length : 0;
      const cargando = !d.completo;
      window._oscFilas = [];
      const fila = (n, c, i, mia, g) => {
        const x = d.pelis[n.wiki], idx = window._oscFilas.push(x ? {id:x.id, _tipo:'movie', title:x.t, poster_path:x.poster, release_date:x.f} : null) - 1;
        const visto = x && vistos.has(`${x.id}-movie`), nota = x && !visto ? _notaExacta({id:x.id, _tipo:'movie'}) : null;
        const porPersona = c.persona && n.persona;
        const sub = [porPersona ? (x ? x.t : n.titulo) : n.persona, visto ? '✓ Vista' : nota!=null ? `🔮 ${_notaFmt(nota)}` : '', x && x.donde.length ? `En ${x.donde.join(', ')}` : ''].filter(Boolean).map(_escHtml).join(' · ');
        const abrir = x ? `onclick="abrirDetalle(_oscFilas[${idx}])"` : '';
        return `<div class="osc-fila${n.gana?' gana':''}">${x && x.poster ? `<img src="https://image.tmdb.org/t/p/w92${x.poster}" alt="" ${abrir}>` : '<img alt="">'}<div class="i" ${abrir}><b>${_escHtml(porPersona ? n.persona : (x ? x.t : n.titulo))}</b><small>${sub}</small></div>${d.final ? (mia===i ? `<span class="osc-acierto">${n.gana ? '✅' : '❌'}</span>` : '') : `<button type="button" class="osc-voto${mia===i?' activo':''}" onclick="oscVotar('${c.k}', ${i})" aria-label="Mi porra">🗳️</button>`}</div>`;
      };
      const palm = d.palmares.length ? `<div class="osc-cat"><h3>Palmarés</h3>${d.palmares.map(p=>{ const x = d.pelis[p.wiki], idx = window._oscFilas.push(x ? {id:x.id, _tipo:'movie', title:x.t, poster_path:x.poster, release_date:x.f} : null) - 1;
          return `<div class="osc-fila"${x ? ` onclick="abrirDetalle(_oscFilas[${idx}])"` : ''}>${x && x.poster ? `<img src="https://image.tmdb.org/t/p/w92${x.poster}" alt="">` : '<img alt="">'}<div class="i"><small style="margin:0 0 2px;color:#b08a2e;font-weight:800">${_escHtml(p.premio)}</small><b>${_escHtml(x ? x.t : p.titulo)}</b>${p.persona ? `<small>${_escHtml(p.persona)}</small>` : ''}</div></div>`; }).join('')}</div>` : '';
      cont.innerHTML = _premPestanas(d.fest) + _premAnios(d.fest, d.anio) + `
        <div class="osc-hero"><div class="k">${def.emoji} ${def.n} ${d.anio} · ${d.final ? (def.festival ? 'palmarés' : 'ya celebrado') : (def.festival ? 'a concurso' : 'nominadas')}</div>
          <div class="t">Has visto ${nVistas} de las ${total} películas ${def.festival ? 'a concurso' : 'nominadas'}</div>
          <div class="barra"><i style="width:${total ? Math.round(nVistas/total*100) : 0}%"></i></div>
          <div class="m">${d.final ? (elegidas ? `Tu porra: <b>acertaste ${aciertos} de ${elegidas}</b>.` : (def.festival ? `${def.topArt || 'La'} ${def.top} lleva 🏆.` : 'Las ganadoras llevan 🏆.')) : `Tu porra: ${elegidas} de ${d.cats.length} elegidas. Toca 🗳️ en ${d.fest==='cannes' ? 'la que crees que ganará la Palma de Oro' : 'tu favorita de cada categoría'}.`}${cargando ? '<br><span style="opacity:.7">Completando pósters y dónde verlas…</span>' : ''}</div></div>
        ${palm}
        ${d.cats.map(c=>{ const g = c.noms.findIndex(n=>n.gana), mia = porra[c.k];
          return `<div class="osc-cat"><h3>${_escHtml(c.n)}${mia!=null ? `<small>${d.final && g>=0 ? (c.noms[mia]?.gana ? '✅ acertaste' : '❌ fallaste') : '🗳️ elegida'}</small>` : ''}</h3>${c.noms.map((n,i)=>fila(n, c, i, mia, g)).join('')}</div>`; }).join('')}
        <p class="esc-pie">Datos de la Wikipedia en inglés, que se actualiza al momento; títulos y dónde verlas, de TMDB.</p>`;
      window.scrollTo(0, y);
    }
    function oscVotar(cat, i){
      const d = window._premDatos; if(!d || d.final) return;
      const o = _porraLeer(), k = _porraClave(d.fest, d.anio); o[k] = o[k] || {};
      if(o[k][cat]===i) delete o[k][cat]; else o[k][cat] = i;
      _porraGuardar(o); _premPintar();
    }
    // Inicio: en temporada de cada festival, una tarjeta con lo que has visto
    async function cargarOscarInicio(){
      const box = document.getElementById('inicio-oscar'); if(!box) return;
      const h = new Date(), md = (h.getMonth()+1)*100 + h.getDate();
      const enTemp = ([a,b]) => a<=b ? (md>=a && md<=b) : (md>=a || md<=b);
      const fest = Object.keys(PREMIOS).find(k=>_premVisible(k) && enTemp(PREMIOS[k].temporada));
      if(!sesionActual || !fest){ box.innerHTML = ''; return; }
      const anio = md>=1201 ? h.getFullYear()+1 : h.getFullYear(); // los Goya de febrero se anuncian en diciembre
      try{
        const d = await _premCargar(fest, anio); if(!d){ box.innerHTML = ''; return; }
        const vistos = window.idsVistosSet || new Set(), ps = Object.values(d.pelis), n = ps.filter(x=>vistos.has(`${x.id}-movie`)).length, def = PREMIOS[fest];
        box.innerHTML = `<button type="button" class="inicio-trailers osc-entrada" style="margin-bottom:18px" onclick="abrirPremios('${fest}', ${anio})"><span class="inicio-trailers-ic">${def.emoji}</span><span class="inicio-trailers-t"><b>${def.n} ${anio}${d.final ? (fest==='cannes' ? ' · palmarés' : ' · ganadoras') : ''}</b><span>Has visto ${n} de ${ps.length} ${fest==='cannes' ? 'a concurso' : 'nominadas'}${d.final ? '' : ' · haz tu porra'}</span></span><span class="inicio-trailers-f">›</span></button>`;
      }catch(e){ box.innerHTML = ''; }
    }
