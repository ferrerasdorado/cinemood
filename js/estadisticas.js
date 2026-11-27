// CineMood · Estadísticas, tu año y actividad
// (Parte de index.html; se carga como script clásico: todo comparte el mismo ámbito global.)

    // ── TU AÑO EN CINE (Wrapped) ─────────────────────────────────────────

    // ══ TUS DATOS: estadísticas, tu año y actividad con los mismos cálculos ══
    // Las fechas son las de cuando apuntaste cada título como visto. Los días en que apuntaste más de 20 de golpe
    // se tratan como una importación (no como visionados) en Actividad, Evolución y Tu año.
    const IMPORTACION_MIN = 20;
    function _diasImportacion(filas){
      const c = {}; filas.forEach(x=>{ const d = (x.creado_en||'').slice(0,10); if(d) c[d] = (c[d]||0)+1; });
      return new Set(Object.entries(c).filter(([,n])=>n>IMPORTACION_MIN).map(([d])=>d));
    }
    function _notaImportacion(filas, dias){
      if(!dias.size) return '';
      const n = filas.filter(x=>dias.has((x.creado_en||'').slice(0,10))).length;
      const fechas = [...dias].sort().map(d=>new Date(d+'T12:00:00').toLocaleDateString('es-ES',{day:'numeric', month:'long', year:'numeric'}));
      return `No se cuentan los ${n} títulos que apuntaste de golpe el ${fechas.join(' y el ')}: es cuando los añadiste, no cuando los viste.`;
    }
    function _episodiosVistos(x){ return Object.values(x.episodios_vistos||{}).reduce((s,a)=>s+(Array.isArray(a)?a.length:0),0); }
    function _horasDe(vistos){ // películas: duración real · series: episodios marcados × 45 min (aprox.)
      const min = vistos.reduce((t,x)=>t + (x.tipo==='movie' ? (x.info?.r||0) : _episodiosVistos(x)*45), 0);
      return Math.round(min/60);
    }
    function _contar(lista, fn){ const c = {}; lista.forEach(x=>(fn(x)||[]).forEach(k=>{ if(k!=null) c[k] = (c[k]||0)+1; })); return Object.entries(c).sort((a,b)=>b[1]-a[1]); }
    // Filas de tu biblioteca con los datos de cada título (los mismos que usan los Logros)
    async function _filasConInfo(progreso){
      const { data, error } = await sb.from('mi_biblioteca').select('*').eq('user_id', sesionActual.user.id);
      if(error) throw error;
      await _vistosConInfo(true, progreso); // completa los datos que falten (se guardan en el dispositivo)
      return (data||[]).map(x=>({...x, info: x.visto ? _leerInfoLogro(x.tipo, x.tmdb_id) : null}));
    }

    // ── TUS ESTADÍSTICAS (antes: Estadísticas, Tu resumen y Perfil de gusto) ──
    let _estFilas = null, _estGeneros = {}, _estPerfil = null;
    async function abrirEstadisticas(){
      if(!sesionActual){ mostrarCuenta(); return; }
      irA('p-estadisticas');
      const cont = document.getElementById('estadisticas-cont');
      cont.innerHTML = '<p class="rk-ayuda">Calculando…</p>';
      try{
        _estFilas = await _filasConInfo((h,t)=>{ cont.innerHTML = `<p class="rk-ayuda">Analizando lo que has visto… ${h} de ${t}</p>`; });
        _estGeneros = await _mapaGenerosGlobal();
        _estPerfil = _cargarPerfilGustoCache();
        if(!_estPerfil && _usarPerfilDeGusto()) _estPerfil = await construirPerfilGusto(false).catch(()=>null);
        const anos = [...new Set(_estFilas.filter(x=>x.visto).map(x=>(x.creado_en||'').slice(0,4)).filter(Boolean))].sort().reverse();
        cont.innerHTML = `<div class="ml-herramientas"><label for="est-periodo">Periodo</label>
          <select id="est-periodo" onchange="pintarEstadisticas()"><option value="todos">Todo</option>${anos.map(a=>`<option value="${a}">Apuntados en ${a}</option>`).join('')}</select></div>
          <div id="est-cuerpo"></div>`;
        pintarEstadisticas();
      }catch(e){ cont.innerHTML = '<p class="rk-ayuda">No se pudieron calcular tus estadísticas. Comprueba tu conexión e inténtalo de nuevo.</p>'; }
    }
    function pintarEstadisticas(){
      const cuerpo = document.getElementById('est-cuerpo'); if(!cuerpo || !_estFilas) return;
      const periodo = document.getElementById('est-periodo').value;
      const filas = _estFilas.filter(x=>periodo==='todos' || (x.creado_en||'').startsWith(periodo));
      const vistos = filas.filter(x=>x.visto), pendientes = filas.filter(x=>x.pendiente && !x.visto);
      setTimeout(()=>{ _pintarActoresVistos(vistos); _pintarMapaCine(vistos); }, 0);
      if(!vistos.length){ cuerpo.innerHTML = '<p class="rk-ayuda">Todavía no hay títulos vistos en este periodo.</p>'; return; }
      const conNota = vistos.filter(x=>x.puntuacion!=null);
      const media = conNota.length ? conNota.reduce((s,x)=>s+Number(x.puntuacion),0)/conNota.length : null;
      const pelis = vistos.filter(x=>x.tipo==='movie').length, series = vistos.length - pelis;
      const generos = _contar(vistos, x=>x.info?.g).slice(0,8).map(([id,n])=>[_estGeneros[id]||'—', n]);
      const decadas = _contar(vistos, x=>x.info?.y ? [Math.floor(x.info.y/10)*10] : []).sort((a,b)=>a[0]-b[0]).map(([d,n])=>[`Años ${String(d).slice(2)}`, n]);
      const autores = _contar(vistos, x=>x.info?.d ? [x.info.d.n] : []).filter(([,n])=>n>=2).slice(0,8);
      const mejores = conNota.slice().sort((a,b)=>b.puntuacion-a.puntuacion || (b.info?.va||0)-(a.info?.va||0)).slice(0,10);
      window._estMejores = mejores;
      const barras = lista => { const max = Math.max(1, ...lista.map(([,n])=>n)); return lista.map(([k,n])=>`<div class="est-fila"><span class="est-k">${_escHtml(String(k))}</span><div class="est-barra"><div style="width:${Math.round(n/max*100)}%"></div></div><span class="est-n">${n}</span></div>`).join(''); };
      const frase = periodo==='todos' ? _fraseArquetipo(_estPerfil) : '';
      cuerpo.innerHTML = `
        ${frase ? `<div class="est-perfil"><div class="est-perfil-k">🧭 Tu perfil de gusto</div><div class="est-perfil-t">${_escHtml(frase)}</div></div>` : ''}
        <div class="stats-grid">
          <div class="stats-card"><div class="stats-valor">${vistos.length}</div><div class="stats-label">Vistos</div></div>
          <div class="stats-card"><div class="stats-valor">${media ? media.toFixed(1) : '—'}</div><div class="stats-label">Nota media</div></div>
          <div class="stats-card"><div class="stats-valor">${pendientes.length}</div><div class="stats-label">Para ver</div></div>
          <div class="stats-card"><div class="stats-valor">${pelis}</div><div class="stats-label">Películas</div></div>
          <div class="stats-card"><div class="stats-valor">${series}</div><div class="stats-label">Series</div></div>
          <div class="stats-card"><div class="stats-valor">${_horasDe(vistos)}h</div><div class="stats-label">De pantalla*</div></div>
        </div>
        <p class="rk-ayuda">${conNota.length} de ${vistos.length} títulos con tu nota${conNota.length<vistos.length ? ` · <a href="#" onclick="event.preventDefault();abrirPuntuar()">puntuar los que faltan</a>` : ''}. *Películas por su duración; series, por episodios marcados (45 min cada uno).</p>
        ${generos.length ? `<div class="section-label">Tus géneros</div>${barras(generos)}` : ''}
        ${decadas.length ? `<div class="section-label" style="margin-top:18px">Por décadas</div>${barras(decadas)}` : ''}
        ${autores.length ? `<div class="section-label" style="margin-top:18px">Directores y creadores que repites</div>${barras(autores)}` : ''}
        ${mejores.length ? `<div class="section-label" style="margin-top:18px">Tus mejor valoradas</div>
          ${mejores.map((x,i)=>`<div class="est-mejor" onclick="abrirDetalle({id:_estMejores[${i}].tmdb_id,_tipo:_estMejores[${i}].tipo,title:_estMejores[${i}].titulo,poster_path:_estMejores[${i}].poster_path})">
            ${x.poster_path ? `<img loading="lazy" src="https://image.tmdb.org/t/p/w92${x.poster_path}" alt="">` : '<span class="est-mejor-sin"></span>'}
            <div class="est-mejor-info"><div class="est-mejor-t">${_escHtml(x.titulo||'')}</div><div class="est-mejor-m">${x.tipo==='tv' ? 'Serie' : 'Película'}${x.info?.y ? ' · '+x.info.y : ''}</div></div>
            <div class="est-mejor-n">${x.puntuacion}<span>/10</span></div></div>`).join('')}` : ''}
        <div id="est-actores"></div>
        <div id="est-mapa"></div>
        ${_htmlImpopulares(conNota)}
        <p class="rk-ayuda" style="margin-top:16px">${periodo==='todos' ? '' : 'El periodo se basa en la fecha en que apuntaste cada título. '}Calculado con tus títulos y los datos públicos de TMDB, en este dispositivo.</p>`;
    }

    // Tus opiniones impopulares: dónde tu nota más se aleja de la del público (TMDB, con votos suficientes)
    // Con quién más te has encontrado en pantalla: reparto principal de cada título visto (se guarda en el dispositivo)
    async function _pintarActoresVistos(vistos){
      const el = document.getElementById('est-actores'); if(!el) return;
      const turno = (window._estActTurno = (window._estActTurno||0)+1);
      const leer = x => { try{ return JSON.parse(localStorage.getItem(`cm:rep:${x.tipo}:${x.tmdb_id}`)||'null'); }catch(e){ return null; } };
      const faltan = vistos.filter(x=>!leer(x));
      if(faltan.length){
        let h = 0;
        el.innerHTML = `<div class="section-label" style="margin-top:18px">Tus actores y actrices más vistos</div><p class="rk-ayuda">Calculando… 0 de ${faltan.length}</p>`;
        await _fetchEnLotes(faltan, async x=>{
          try{
            const d = await _tmdbJson(x.tipo==='tv' ? `/tv/${x.tmdb_id}/aggregate_credits&language=es-ES` : `/movie/${x.tmdb_id}/credits&language=es-ES`);
            const cast = (d.cast||[]).slice().sort((a,b)=>x.tipo==='tv' ? (b.total_episode_count||0)-(a.total_episode_count||0) : (a.order??99)-(b.order??99)).slice(0,8).map(c=>[c.id, c.name, c.profile_path||'']);
            try{ localStorage.setItem(`cm:rep:${x.tipo}:${x.tmdb_id}`, JSON.stringify(cast)); }catch(e){}
          }catch(e){}
          if(turno===window._estActTurno){ const p = el.querySelector('.rk-ayuda'); if(p) p.textContent = `Calculando… ${++h} de ${faltan.length}`; }
        }, 6);
        if(turno!==window._estActTurno) return;
      }
      const m = new Map();
      vistos.forEach(x=>(leer(x)||[]).forEach(([id,n,f])=>{ const a = m.get(id) || {id, n, f, c:0, t:[]}; a.c++; a.t.push(x.titulo); if(f && !a.f) a.f = f; m.set(id, a); }));
      const top = [...m.values()].filter(a=>a.c>=2).sort((a,b)=>b.c-a.c || a.n.localeCompare(b.n)).slice(0,15);
      window._estActores = top;
      el.innerHTML = top.length ? `<div class="section-label" style="margin-top:18px">Tus actores y actrices más vistos</div><div class="colab-fila">${top.map((a,i)=>`
        <button type="button" class="colab" onclick="mostrarFilmografia(_estActores[${i}].id,_estActores[${i}].n,_estActores[${i}].f,'Actor')" title="${_escHtml(a.t.join(', '))}">
          <span class="colab-img">${a.f ? `<img loading="lazy" src="https://image.tmdb.org/t/p/w185${a.f}" alt="">` : `<span>${_escHtml(a.n.charAt(0))}</span>`}<i>×${a.c}</i></span>
          <span class="colab-n">${_escHtml(a.n)}</span><span class="colab-r">${a.c} títulos</span></button>`).join('')}</div>` : '';
    }
    // Mapamundi con los países de lo que has visto (país de producción). El mapa se descarga solo al abrir esta pantalla
    function _cargarScript(src){ return new Promise((res,rej)=>{ if(document.querySelector(`script[src="${src}"]`)){ const t = setInterval(()=>{ if(window.topojson){ clearInterval(t); res(); } }, 50); setTimeout(()=>{ clearInterval(t); res(); }, 6000); return; } const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }
    async function _pintarMapaCine(vistos){
      const el = document.getElementById('est-mapa'); if(!el) return;
      const turno = (window._mapaTurno = (window._mapaTurno||0)+1);
      const porPais = {};
      vistos.forEach(x=>(x.info?.p||[]).slice(0,2).forEach(c=>{ if(c) (porPais[c] = porPais[c] || []).push(x); }));
      const paises = Object.keys(porPais);
      if(paises.length<2){ el.innerHTML = ''; return; }
      const nombre = c => { try{ return new Intl.DisplayNames(['es'], {type:'region'}).of(c); }catch(e){ return c; } };
      el.innerHTML = `<div class="section-label" style="margin-top:18px">🌍 Tu mapa del cine · ${paises.length} países</div><div class="mapa-cine" id="mapa-cine"></div><div class="mapa-leyenda"><span>1</span><i></i><span>${Math.max(...paises.map(c=>porPais[c].length))}</span></div><div id="mapa-pais"></div>`;
      window._mapaPorPais = porPais;
      try{
        const L = await _cargarLeaflet();
        await _cargarScript('https://cdn.jsdelivr.net/npm/topojson-client@3.1.0/dist/topojson-client.min.js');
        if(!window._mundo){
          const [topo, codes] = await Promise.all([fetch('https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json').then(r=>r.json()), fetch('https://cdn.jsdelivr.net/npm/i18n-iso-countries@7.11.0/codes.json').then(r=>r.json())]);
          const num2a2 = {}; codes.forEach(([a2,,num])=>{ num2a2[String(Number(num))] = a2; });
          const geo = window.topojson.feature(topo, topo.objects.countries);
          // fuera la Antártida y arreglo de los países que cruzan el antimeridiano (Rusia, Fiyi…), que si no salen como franjas
          geo.features = geo.features.filter(f=>String(Number(f.id))!=='10');
          const arreglaAnillo = r => r.some(c=>c[0]>150) && r.some(c=>c[0]<-150) ? r.map(c=>c[0]<0 ? [c[0]+360, c[1]] : c) : r;
          geo.features.forEach(f=>{ const g = f.geometry; if(!g) return; if(g.type==='Polygon') g.coordinates = g.coordinates.map(arreglaAnillo); else if(g.type==='MultiPolygon') g.coordinates = g.coordinates.map(pl=>pl.map(arreglaAnillo)); });
          window._mundo = {geo, num2a2};
        }
        if(turno!==window._mapaTurno) return;
        const cont = document.getElementById('mapa-cine'); if(!cont) return;
        if(window._mapaCineL){ window._mapaCineL.remove(); window._mapaCineL = null; }
        const m = window._mapaCineL = L.map(cont, {zoomControl:false, attributionControl:false, scrollWheelZoom:false, zoomSnap:0.25, minZoom:0, maxZoom:5, maxBounds:[[-70,-200],[88,200]]});
        const max = Math.max(...paises.map(c=>porPais[c].length));
        const acento = getComputedStyle(document.documentElement).getPropertyValue('--acento').trim() || '#b52c29';
        const css = getComputedStyle(document.documentElement), tierra = css.getPropertyValue('--k-e4e1d9').trim() || '#e4e1d9', mar = css.getPropertyValue('--k-fffefb').trim() || '#fffefb';
        L.geoJSON(window._mundo.geo, {
          style: f=>{ const a2 = window._mundo.num2a2[String(Number(f.id))], n = (porPais[a2]||[]).length;
            return {weight:0.6, color: mar, fillColor: n ? acento : tierra, fillOpacity: n ? 0.3 + 0.7*Math.sqrt(n/max) : 1}; },
          onEachFeature: (f, capa)=>{ const a2 = window._mundo.num2a2[String(Number(f.id))], n = (porPais[a2]||[]).length;
            if(n){ capa.bindTooltip(`${nombre(a2)} · ${n}`); capa.on('click', ()=>_mapaPais(a2)); } }
        }).addTo(m);
        m.fitBounds([[-56,-168],[78,190]], {padding:[0,0]});
        const top = paises.sort((a,b)=>porPais[b].length-porPais[a].length)[0];
        _mapaPais(top);
      }catch(e){ const c = document.getElementById('mapa-cine'); if(c) c.style.display = 'none'; }
    }
    function _mapaPais(a2){
      const el = document.getElementById('mapa-pais'), l = (window._mapaPorPais||{})[a2] || []; if(!el) return;
      const nombre = (()=>{ try{ return new Intl.DisplayNames(['es'], {type:'region'}).of(a2); }catch(e){ return a2; } })();
      window._mapaLista = l.slice().sort((a,b)=>(b.puntuacion||0)-(a.puntuacion||0));
      el.innerHTML = `<div class="mapa-pais-cab"><b>${_escHtml(nombre)}</b> · ${l.length} ${l.length===1?'título':'títulos'}<button type="button" class="d-saga-link" onclick="abrirMejoresPais('${a2}')">Lo mejor de ${_escHtml(nombre)} ›</button></div>
        <div class="colab-fila">${window._mapaLista.slice(0,12).map((x,i)=>`<button type="button" class="mapa-peli" onclick="abrirDetalle({id:_mapaLista[${i}].tmdb_id,_tipo:_mapaLista[${i}].tipo,title:_mapaLista[${i}].titulo,poster_path:_mapaLista[${i}].poster_path})">${x.poster_path ? `<img loading="lazy" src="https://image.tmdb.org/t/p/w154${x.poster_path}" alt="">` : ''}<span>${_escHtml(x.titulo||'')}</span></button>`).join('')}</div>`;
    }
    function abrirMejoresPais(a2){
      const nombre = (()=>{ try{ return new Intl.DisplayNames(['es'], {type:'region'}).of(a2); }catch(e){ return a2; } })();
      const k = `pais-${a2}`;
      window._descExtra[k] = {k, n:`Cine de ${nombre}`, e:'', movie:`with_origin_country=${a2}`, tv:`with_origin_country=${a2}`};
      window._descF = {ep:'', nota:''}; window._descFKey = k;
      descAbrirGenero(k, 'movie', 'nota');
    }
    function _htmlImpopulares(conNota){
      const comp = conNota.filter(x=>x.info && x.info.va>0 && x.info.vc>=50).map(x=>({...x, dif:Number(x.puntuacion)-x.info.va}));
      if(comp.length<5) return '';
      const f = v => (v>0?'+':'−')+Math.abs(v).toFixed(1).replace('.', ',');
      const media = comp.reduce((t,x)=>t+x.dif,0)/comp.length;
      const arriba = comp.filter(x=>x.dif>=1.5).sort((a,b)=>b.dif-a.dif).slice(0,5);
      const abajo = comp.filter(x=>x.dif<=-1.5).sort((a,b)=>a.dif-b.dif).slice(0,5);
      const porGenero = {}; comp.forEach(x=>(x.info.g||[]).forEach(g=>{ (porGenero[g] = porGenero[g] || []).push(x.dif); }));
      const gen = Object.entries(porGenero).filter(([,l])=>l.length>=4).map(([g,l])=>[_estGeneros[g]||'', l.reduce((t,v)=>t+v,0)/l.length]).filter(([n,v])=>n && Math.abs(v)>=0.5).sort((a,b)=>b[1]-a[1]);
      const blando = gen.filter(([,v])=>v>0).slice(0,2), duro = gen.filter(([,v])=>v<0).slice(-2).reverse();
      window._estImpop = [...arriba, ...abajo];
      const fila = (x,i) => `<div class="est-mejor" onclick="abrirDetalle({id:_estImpop[${i}].tmdb_id,_tipo:_estImpop[${i}].tipo,title:_estImpop[${i}].titulo,poster_path:_estImpop[${i}].poster_path})">
        ${x.poster_path ? `<img loading="lazy" src="https://image.tmdb.org/t/p/w92${x.poster_path}" alt="">` : '<span class="est-mejor-sin"></span>'}
        <div class="est-mejor-info"><div class="est-mejor-t">${_escHtml(x.titulo||'')}</div><div class="est-mejor-m">Tú ${x.puntuacion} · público ${x.info.va.toFixed(1).replace('.', ',')}</div></div>
        <div class="est-mejor-n impop ${x.dif>0?'mas':'menos'}">${f(x.dif)}</div></div>`;
      const tono = Math.abs(media)<0.3 ? 'Puntúas casi igual que el público' : media>0 ? `De media puntúas ${Math.abs(media).toFixed(1).replace('.', ',')} por encima del público` : `De media puntúas ${Math.abs(media).toFixed(1).replace('.', ',')} por debajo del público`;
      return `<div class="section-label" style="margin-top:18px">🌶️ Tus opiniones impopulares</div>
        <p class="impop-frase">${tono}${blando.length ? `. Eres más generoso que la media con ${blando.map(([n,v])=>`<b>${_escHtml(n.toLowerCase())}</b> (${f(v)})`).join(' y ')}` : ''}${duro.length ? `${blando.length ? ', y' : '. Eres'} más duro con ${duro.map(([n,v])=>`<b>${_escHtml(n.toLowerCase())}</b> (${f(v)})`).join(' y ')}` : ''}.</p>
        ${arriba.length ? `<div class="impop-k">Te gustaron mucho más que a la gente</div>${arriba.map((x,i)=>fila(x,i)).join('')}` : ''}
        ${abajo.length ? `<div class="impop-k">Te gustaron mucho menos que a la gente</div>${abajo.map((x,i)=>fila(x,arriba.length+i)).join('')}` : ''}
        ${!arriba.length && !abajo.length ? '<p class="rk-ayuda">No hay ningún título en el que te separes más de 1,5 puntos del público.</p>' : ''}`;
    }
    // ── TU AÑO EN CINE (últimos 12 meses, sin importaciones) ──
    async function abrirWrapped(){
      if(!sesionActual){ mostrarCuenta(); return; }
      irA('p-wrapped');
      const cont = document.getElementById('wrapped-cont');
      cont.innerHTML = '<span style="color:var(--k-767973);font-size:13px">Generando tu resumen...</span>';
      let filas;
      try{ filas = await _filasConInfo(); }
      catch(e){ cont.innerHTML = '<p style="color:#b3261e;font-size:13px">⚠️ No hemos podido generar tu resumen ahora mismo. Comprueba tu conexión e inténtalo de nuevo.</p>'; return; }
      const desde = new Date(); desde.setDate(desde.getDate()-365);
      const vistosAnio = filas.filter(x=>x.visto && x.creado_en && new Date(x.creado_en)>=desde);
      const imp = _diasImportacion(filas);
      const data = vistosAnio.filter(x=>!imp.has(x.creado_en.slice(0,10)));
      const nota = _notaImportacion(vistosAnio, imp);
      if(!data.length){
        cont.innerHTML = `<p style="color:var(--k-61635e);font-size:13px">Tu año en cine se irá llenando con lo que marques como visto a partir de ahora.</p>${nota ? `<p class="rk-ayuda">${nota}</p>` : ''}`;
        return;
      }
      const mapa = await _mapaGenerosGlobal();
      const horas = _horasDe(data);
      const generoTop = mapa[(_contar(data, x=>x.info?.g)[0]||[])[0]] || '—';
      const conNota = data.filter(x=>x.puntuacion!=null);
      const notaMedia = conNota.length ? (conNota.reduce((s,x)=>s+Number(x.puntuacion),0)/conNota.length) : null;
      const mejor = [...data].sort((a,b)=>(b.puntuacion||0)-(a.puntuacion||0) || (b.info?.va||0)-(a.info?.va||0))[0];
      window.wrappedData = { total:data.length, horas, generoTop, notaMedia, mejor };
      cont.innerHTML = `
        <div class="wrapped-card wrapped-hero">
          <div class="wrapped-hero-emoji">🎬</div>
          <div class="wrapped-hero-titulo">Tu año en CineMood</div>
          <div class="wrapped-hero-sub">Últimos 12 meses</div>
        </div>
        <div class="wrapped-card"><div class="wrapped-num">${data.length}</div><div class="wrapped-label">títulos vistos</div></div>
        <div class="wrapped-card wrapped-verde"><div class="wrapped-num">${horas}h</div><div class="wrapped-label">de pantalla (aprox.)</div></div>
        <div class="wrapped-card"><div class="wrapped-num">${_escHtml(generoTop)}</div><div class="wrapped-label">tu género dominante</div></div>
        <div class="wrapped-card wrapped-verde"><div class="wrapped-num">${notaMedia?notaMedia.toFixed(1):'—'}</div><div class="wrapped-label">tu nota media</div></div>
        ${mejor?`<div class="wrapped-card wrapped-destacado">
          <img class="wrapped-poster" src="${mejor.poster_path?'https://image.tmdb.org/t/p/w300'+mejor.poster_path:''}" alt="${_escHtml(mejor.titulo)}">
          <div class="wrapped-destacado-label">Tu título mejor puntuado</div>
          <div class="wrapped-destacado-titulo">${_escHtml(mejor.titulo)}</div>
          ${mejor.puntuacion?`<div class="wrapped-destacado-nota">★ ${mejor.puntuacion}</div>`:''}
        </div>`:''}
        ${nota ? `<p class="rk-ayuda">${nota}</p>` : ''}
        <div class="cta-btn" style="margin-top:8px" onclick="descargarWrapped()">📥 Descargar para compartir</div>
      `;
    }

    // ── ACTIVIDAD (y evolución de tu gusto), sin importaciones ──
    async function abrirActividad(){
      if(!sesionActual){ mostrarCuenta(); return; }
      irA('p-actividad');
      const cont = document.getElementById('actividad-cont');
      cont.innerHTML = '<span style="color:var(--k-767973);font-size:13px">Cargando...</span>';
      let filas;
      try{ filas = await _filasConInfo(); }
      catch(e){ cont.innerHTML='<p style="color:var(--k-61635e);font-size:13px">No se pudo cargar tu actividad.</p>'; return; }
      const vistosTodos = filas.filter(x=>x.visto && x.creado_en);
      const imp = _diasImportacion(vistosTodos);
      const vistos = vistosTodos.filter(x=>!imp.has(x.creado_en.slice(0,10)));
      const nota = _notaImportacion(vistosTodos, imp);
      const conteoPorDia = {};
      vistos.forEach(x=>{ const dia = x.creado_en.substring(0,10); conteoPorDia[dia] = (conteoPorDia[dia]||0)+1; });
      const hoy = new Date(), dias = [];
      for(let i=363;i>=0;i--){ const d = new Date(hoy); d.setDate(hoy.getDate()-i); const key = d.toISOString().substring(0,10); dias.push({key, n:conteoPorDia[key]||0}); }
      const primerDia = new Date(hoy); primerDia.setDate(hoy.getDate()-363);
      const celdas = Array(primerDia.getDay()).fill(null).concat(dias), semanas = [];
      for(let i=0;i<celdas.length;i+=7) semanas.push(celdas.slice(i,i+7));
      const enAnio = dias.reduce((t,d)=>t+d.n,0), diasActivos = dias.filter(d=>d.n).length, maxDia = Math.max(0, ...dias.map(d=>d.n));
      const nivelColor = n => !n ? 'var(--k-e9e7e0)' : n===1 ? '#f0c4bb' : n===2 ? '#d6675c' : '#b52c29';
      // Evolución: títulos (no géneros) por trimestre o por año, con sus 3 géneros más vistos
      const mapa = await _mapaGenerosGlobal();
      const anios = new Set(vistos.map(x=>x.creado_en.slice(0,4)));
      const porAnio = anios.size>1;
      const bucket = x => porAnio ? x.creado_en.slice(0,4) : `${x.creado_en.slice(0,4)} · T${Math.floor((Number(x.creado_en.slice(5,7))-1)/3)+1}`;
      const grupos = {}; vistos.forEach(x=>{ (grupos[bucket(x)] = grupos[bucket(x)] || []).push(x); });
      const evol = Object.keys(grupos).sort().reverse().map(k=>({k, n:grupos[k].length, top:_contar(grupos[k], x=>x.info?.g).slice(0,3).map(([id])=>mapa[id]||'—')}));
      cont.innerHTML = `
        <div class="stats-grid" style="margin-bottom:20px">
          <div class="stats-card"><div class="stats-valor">${enAnio}</div><div class="stats-label">Vistas (365 días)</div></div>
          <div class="stats-card"><div class="stats-valor">${diasActivos}</div><div class="stats-label">Días activos</div></div>
          <div class="stats-card"><div class="stats-valor">${maxDia}</div><div class="stats-label">Máx. en un día</div></div>
        </div>
        <div class="section-label">Últimos 12 meses</div>
        <div class="scroll-wrap">
          <div class="scroll-arrow left" aria-label="Desplazar hacia la izquierda" onclick="scrollCarrusel('actividad-heatmap',-1)">‹</div>
          <div class="actividad-heatmap" id="actividad-heatmap">
            ${semanas.map(semana=>`<div class="actividad-columna">${semana.map(dia=>
              dia ? `<div class="actividad-celda" style="background:${nivelColor(dia.n)}" title="${dia.n} vista${dia.n!==1?'s':''} · ${dia.key}"></div>`
                  : `<div class="actividad-celda actividad-vacia"></div>`).join('')}</div>`).join('')}
          </div>
          <div class="scroll-arrow right" aria-label="Desplazar hacia la derecha" onclick="scrollCarrusel('actividad-heatmap',1)">›</div>
        </div>
        <div class="actividad-leyenda"><span>Menos</span>
          <div class="actividad-celda" style="background:var(--k-e9e7e0)"></div><div class="actividad-celda" style="background:#f0c4bb"></div>
          <div class="actividad-celda" style="background:#d6675c"></div><div class="actividad-celda" style="background:#b52c29"></div><span>Más</span></div>
        <div class="section-label" style="margin-top:22px">Evolución de tu gusto</div>
        ${evol.length ? evol.map(e=>`<div class="est-evol"><div class="est-evol-k">${e.k}</div><div class="est-evol-g">${e.top.map(_escHtml).join(' · ')||'—'}</div><div class="est-evol-n">${e.n} ${e.n===1?'título':'títulos'}</div></div>`).join('')
          : '<p class="rk-ayuda">Se irá llenando con lo que marques como visto a partir de ahora.</p>'}
        ${nota ? `<p class="rk-ayuda" style="margin-top:12px">${nota}</p>` : ''}
      `;
      habilitarDragScroll('actividad-heatmap');
      const track = document.getElementById('actividad-heatmap');
      track.scrollLeft = track.scrollWidth;
    }

    function roundRect(ctx,x,y,w,h,r){
      ctx.beginPath();
      ctx.moveTo(x+r,y);
      ctx.arcTo(x+w,y,x+w,y+h,r);
      ctx.arcTo(x+w,y+h,x,y+h,r);
      ctx.arcTo(x,y+h,x,y,r);
      ctx.arcTo(x,y,x+w,y,r);
      ctx.closePath();
    }

    async function descargarWrapped(){
      const d = window.wrappedData;
      if(!d) return;
      const canvas = document.createElement('canvas');
      canvas.width = 1080; canvas.height = 1920;
      const ctx = canvas.getContext('2d');
      const grad = ctx.createLinearGradient(0,0,1080,1920);
      grad.addColorStop(0,'#2b1a18'); grad.addColorStop(0.5,'#0a0a0a'); grad.addColorStop(1,'#0e1a12');
      ctx.fillStyle = grad; ctx.fillRect(0,0,1080,1920);

      ctx.textAlign='center';
      ctx.fillStyle='#e4675f'; ctx.font='700 44px sans-serif'; ctx.fillText('CineMood', 540, 150);
      ctx.fillStyle='#fff'; ctx.font='800 62px sans-serif'; ctx.fillText('Tu año en cine', 540, 250);
      ctx.fillStyle='#999'; ctx.font='400 30px sans-serif'; ctx.fillText('Últimos 12 meses', 540, 296);

      let posterImg=null;
      if(d.mejor && d.mejor.poster_path){
        try{
          posterImg = await new Promise((res,rej)=>{
            const img=new Image(); img.crossOrigin='anonymous';
            img.onload=()=>res(img); img.onerror=rej;
            img.src='https://image.tmdb.org/t/p/w500'+d.mejor.poster_path;
          });
        }catch(e){ posterImg=null; }
      }
      if(posterImg){
        const pw=340, ph=510, px=540-pw/2, py=370;
        ctx.save();
        ctx.shadowColor='rgba(0,0,0,0.6)'; ctx.shadowBlur=40; ctx.shadowOffsetY=20;
        roundRect(ctx,px,py,pw,ph,20); ctx.clip();
        ctx.drawImage(posterImg,px,py,pw,ph);
        ctx.restore();
      }

      let y = posterImg ? 960 : 420;
      const stats = [
        [`${d.total}`, 'títulos vistos'],
        [`${d.horas}h`, 'de pantalla'],
        [`${d.generoTop}`, 'género dominante'],
        [`${d.notaMedia?d.notaMedia.toFixed(1):'—'}`, 'nota media']
      ];
      stats.forEach(([num,label],i)=>{
        ctx.fillStyle = i%2===0 ? '#e4675f':'#8fd6ae';
        ctx.font='800 74px sans-serif'; ctx.fillText(num, 540, y);
        ctx.fillStyle='#888'; ctx.font='400 28px sans-serif'; ctx.fillText(label.toUpperCase(), 540, y+42);
        y += 145;
      });

      ctx.fillStyle='#555'; ctx.font='400 24px sans-serif';
      ctx.fillText('ferrerasdorado.github.io/cinemood', 540, 1870);

      canvas.toBlob(blob=>{
        const url=URL.createObjectURL(blob);
        const a=document.createElement('a');
        a.href=url; a.download='mi-año-en-cinemood.png'; a.click();
        URL.revokeObjectURL(url);
      });
    }

    function _envolverTexto(ctx, texto, x, y, maxWidth, lineHeight){
      const palabras = (texto||'').split(' ');
      let linea = '';
      const lineas = [];
      palabras.forEach(palabra=>{
        const prueba = linea ? linea+' '+palabra : palabra;
        if(ctx.measureText(prueba).width > maxWidth && linea){ lineas.push(linea); linea = palabra; }
        else linea = prueba;
      });
      if(linea) lineas.push(linea);
      const finales = lineas.slice(0,2); // como mucho 2 líneas, para no desbordar la tarjeta
      if(lineas.length>2) finales[1] = finales[1].replace(/\s+\S*$/,'') + '…';
      finales.forEach((l,i)=>ctx.fillText(l, x, y+i*lineHeight));
      return finales.length;
    }

    async function compartirFicha(){
      const p = peliculaActual;
      if(!p) return;
      const btn = document.getElementById('btn-compartir');
      const original = btn.innerHTML;
      btn.innerHTML = '<span>⏳</span><span>Generando...</span>';
      try{
        const fila = sesionActual ? await obtenerFilaBiblioteca(p.id, p._tipo) : null;
        const rgb = window.acentoDetalleActual;
        const colorAcento = rgb ? `rgb(${rgb.r},${rgb.g},${rgb.b})` : '#b52c29';
        const canvas = document.createElement('canvas');
        canvas.width = 1080; canvas.height = 1350;
        const ctx = canvas.getContext('2d');
        const grad = ctx.createLinearGradient(0,0,1080,1350);
        grad.addColorStop(0, rgb?`rgb(${rgb.r},${rgb.g},${rgb.b})`:'#2b1a18'); grad.addColorStop(0.5,'#0a0a0a'); grad.addColorStop(1,'#0a0a0a');
        ctx.fillStyle = grad; ctx.fillRect(0,0,1080,1350);
        ctx.textAlign='center';
        ctx.fillStyle='#e4675f'; ctx.font='700 34px sans-serif'; ctx.fillText('CineMood', 540, 100);

        let posterImg=null;
        if(p.poster_path){
          try{
            posterImg = await new Promise((res,rej)=>{
              const img=new Image(); img.crossOrigin='anonymous';
              img.onload=()=>res(img); img.onerror=rej;
              img.src='https://image.tmdb.org/t/p/w500'+p.poster_path;
            });
          }catch(e){ posterImg=null; }
        }
        if(posterImg){
          const pw=380,ph=570,px=540-pw/2,py=150;
          ctx.save();
          ctx.shadowColor='rgba(0,0,0,0.6)'; ctx.shadowBlur=40; ctx.shadowOffsetY=20;
          roundRect(ctx,px,py,pw,ph,20); ctx.clip();
          ctx.drawImage(posterImg,px,py,pw,ph);
          ctx.restore();
        }

        let y = posterImg ? 800 : 320;
        ctx.fillStyle='#fff'; ctx.font='800 50px sans-serif';
        const numLineas = _envolverTexto(ctx, p.title||'', 540, y, 900, 58);
        y += numLineas*58 + 22;

        const anio = p.release_date?p.release_date.substring(0,4):'';
        ctx.fillStyle='#999'; ctx.font='400 30px sans-serif';
        ctx.fillText(`${anio}${anio?' · ':''}${p._tipo==='tv'?'Serie':'Película'}`, 540, y);
        y += 55;

        const taglineEl = document.getElementById('d-tagline');
        if(taglineEl && taglineEl.style.display!=='none' && taglineEl.textContent){
          ctx.fillStyle='#777'; ctx.font='italic 400 26px sans-serif';
          y += _envolverTexto(ctx, taglineEl.textContent, 540, y, 850, 34)*34 + 10;
        }

        const nivelRk = fila && fila.visto ? _nivelDeTitulo(`${p._tipo}:${p.id}`) : null;
        if(fila && (fila.puntuacion || nivelRk)){
          y += 20;
          ctx.fillStyle = colorAcento; ctx.font='800 60px sans-serif';
          ctx.fillText(fila.puntuacion ? `★ Mi nota: ${fila.puntuacion}/10` : 'Mi ranking', 540, y);
          if(nivelRk){
            y += 50;
            const c = (RK_NIVELES.find(([n])=>n===nivelRk)||[])[1] || colorAcento;
            ctx.fillStyle = c; roundRect(ctx, 540-60, y, 120, 120, 24); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.font = '900 80px sans-serif'; ctx.fillText(nivelRk, 540, y+90);
            y += 150;
            ctx.fillStyle = '#999'; ctx.font = '400 26px sans-serif'; ctx.fillText('Nivel en mi ranking', 540, y);
          }
        } else if(fila && fila.visto){
          y += 20; ctx.fillStyle = colorAcento; ctx.font = '800 48px sans-serif'; ctx.fillText('✓ Vista', 540, y);
        }

        ctx.fillStyle='#555'; ctx.font='400 24px sans-serif';
        ctx.fillText('ferrerasdorado.github.io/cinemood', 540, 1300);

        const nombreArchivo = `${(p.title||'pelicula').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-')}-cinemood.png`;
        const blob = await new Promise(res=>canvas.toBlob(res,'image/png'));
        const urlCineMood = `https://ferrerasdorado.github.io/cinemood/?id=${p.id}&tipo=${p._tipo}`;
        const texto = `${p.title}${anio?` (${anio})`:''} — descúbrela en CineMood`;

        let compartido = false;
        if(navigator.canShare){
          try{
            const file = new File([blob], nombreArchivo, { type:'image/png' });
            if(navigator.canShare({ files:[file] })){
              await navigator.share({ files:[file], title:p.title, text:texto, url:urlCineMood });
              compartido = true;
            }
          }catch(e){ compartido = true; } // el usuario canceló el share nativo: no forzamos una descarga encima
        }
        if(!compartido){
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = nombreArchivo; a.click();
          URL.revokeObjectURL(url);
          try{ await navigator.clipboard.writeText(`${texto}\n${urlCineMood}`); }catch(e){}
        }
      }catch(e){
        _aviso('⚠️ No se pudo generar la tarjeta ahora mismo. Inténtalo de nuevo.', true);
      }finally{
        btn.innerHTML = original;
      }
    } // qué te hemos enseñado ya en esta sesión, para no repetirlo en la siguiente tanda
    function _marcarMostradosParaTi(tipo, lista){
      const hist = window._paraTiHistorial[tipo];
      lista.forEach(c=>hist.push(`${c.id}-${c._tipo}`));
      while(hist.length>36) hist.shift(); // conservamos solo las últimas 3 tandas, para no agotar bibliotecas pequeñas
    }
    async function _mapaGenerosGlobal(){
      if(window._mapaGenerosCache) return window._mapaGenerosCache;
      try{
        const [gm,gt] = await Promise.all([
          fetch(`${TMDB_PROXY}?path=/genre/movie/list&language=es-ES`).then(r=>r.json()),
          fetch(`${TMDB_PROXY}?path=/genre/tv/list&language=es-ES`).then(r=>r.json())
        ]);
        const mapa = {};
        [...(gm.genres||[]),...(gt.genres||[])].forEach(g=>mapa[g.id]=g.name);
        window._mapaGenerosCache = mapa;
        return mapa;
      }catch(e){ return {}; }
    }
    async function _fetchEnLotes(items, fn, tamanoLote){
      tamanoLote = tamanoLote || 20;
      const resultados = new Array(items.length);
      for(let i=0;i<items.length;i+=tamanoLote){
        const lote = items.slice(i,i+tamanoLote);
        const r = await Promise.all(lote.map(fn));
        r.forEach((v,j)=>resultados[i+j]=v);
      }
      return resultados;
    }
    async function _obtenerGenerosCached(tipo, id){
      const key = `generoCache_v2_${tipo}_${id}`;
      try{
        const cached = localStorage.getItem(key);
        if(cached) return JSON.parse(cached);
      }catch(e){}
      try{
        const [d, cr] = await Promise.all([
          fetch(`${TMDB_PROXY}?path=/${tipo}/${id}&language=es-ES`).then(r=>r.json()),
          fetch(`${TMDB_PROXY}?path=/${tipo}/${id}/credits&language=es-ES`).then(r=>r.json()).catch(()=>null)
        ]);
        let persona = null;
        if(tipo==='movie'){
          const dir = (cr?.crew||[]).find(c=>c.job==='Director');
          if(dir) persona = { id:'d'+dir.id, nombre:dir.name };
        } else {
          const cre = (d.created_by||[])[0];
          if(cre) persona = { id:'c'+cre.id, nombre:cre.name };
        }
        const info = {
          genre_ids: (d.genres||[]).map(g=>g.id),
          release_date: d.release_date || d.first_air_date || null,
          vote_average: d.vote_average!=null ? d.vote_average : null,
          persona
        };
        try{ localStorage.setItem(key, JSON.stringify(info)); }catch(e){}
        return info;
      }catch(e){ return null; }
    }
    async function _fetchDetalleYCreditos(tipo, id){
      try{
        const [d, cr] = await Promise.all([
          fetch(`${TMDB_PROXY}?path=/${tipo}/${id}&language=es-ES`).then(r=>r.json()),
          fetch(`${TMDB_PROXY}?path=/${tipo}/${id}/credits&language=es-ES`).then(r=>r.json())
        ]);
        return { detalle:d, creditos:cr };
      }catch(e){ return null; }
    }
