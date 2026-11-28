// CineMood · Línea temporal y duración de las rutas de especiales
// (Parte de index.html; se carga como script clásico: todo comparte el mismo ámbito global.)

    // Época de cada título: datos propios (listas cronológicas), año de estreno (listas ordenadas por fecha) o nada (listas temáticas)
    function _tlCalcularEras(esp){
      const items = esp.items;
      const conEra = items.some(x=>x.era);
      const porEstreno = !conEra && items.length>1 && items.every((x,k,a)=>!k || (a[k-1].y||0) <= (x.y||0));
      let prev = null, prevCap = null;
      return items.map(it=>{
        if(!conEra && !porEstreno) return {era:null, cap:'', nota:it.tag||'', hito:false};
        let era, cap, nota;
        if(conEra){
          era = it.era || (prev ? prev.era : null);
          cap = it.era ? (it.eraCap||'') : (prev ? prev.cap : '');
          nota = it.era ? (it.nota||'') : (it.nota!==undefined ? it.nota : (it.tag||''));
        } else { era = String(it.y); cap = ''; nota = it.tag||''; }
        const hito = !!era && (!prev || era !== prev.era);
        const capMostrar = (hito && cap && cap !== prevCap) ? cap : '';
        if(hito && cap) prevCap = cap;
        prev = {era, cap};
        return {era, cap:capMostrar, nota, hito};
      });
    }
    // Oculta los hitos que se quedan sin títulos visibles al filtrar la ruta
    function _tlSincronizarHitos(){
      let hito = null, alguna = false;
      const cerrar = ()=>{ if(hito) hito.classList.toggle('tl-oculto', !alguna); };
      document.querySelectorAll('#especial-lista > .tl-hito, #especial-lista > .tl-row').forEach(el=>{
        if(el.classList.contains('tl-hito')){ cerrar(); hito = el; alguna = false; }
        else if(!el.classList.contains('tl-oculto')) alguna = true;
      });
      cerrar();
    }
    function _tlFilasVisibles(){ return [...document.querySelectorAll('#especial-lista .tl-row')].filter(r=>!r.classList.contains('tl-oculto')); }
    function _espRutaGuardada(id){ try{ return (JSON.parse(localStorage.getItem('cm:espRuta')||'{}')||{})[id] || null; }catch(e){ return null; } }
    function filtrarTimeline(modo, sinGuardar){
      window.tlFiltro = modo;
      if(!sinGuardar && window.especialActual){ try{ const o = JSON.parse(localStorage.getItem('cm:espRuta')||'{}')||{}; o[window.especialActual.id] = modo; localStorage.setItem('cm:espRuta', JSON.stringify(o)); }catch(e){} }
      document.querySelectorAll('#tl-filtros .punt-chip').forEach(ch=>ch.classList.toggle('active', ch.dataset.f===modo));
      const desc = document.getElementById('tl-filtros-desc');
      if(desc){
        const esp = window.especialActual, n = t => esp.items.filter(x=>x.imp===t).length;
        desc.innerHTML = modo==='todo'
          ? `Todo: <b>${n('c')} claves</b>, <b>${n('i')} importantes</b> y <b>${n('o')} opcionales</b>.`
          : modo==='esencial'
          ? `Te saltas las <b>${n('o')} opcionales</b>, que se pueden ver aparte, sin perder contexto.`
          : `La ruta mínima: solo las <b>${n('c')} imprescindibles</b> para seguir la historia principal.`;
      }
      document.querySelectorAll('#especial-lista .tl-row').forEach(r=>{
        const imp = r.dataset.imp;
        const ocultar = (modo==='esencial' && imp==='o') || (modo==='clave' && imp!=='c');
        r.classList.toggle('tl-oculto', ocultar);
      });
      _tlSincronizarHitos();
      actualizarTimeline();
    }
    // Estado de cada nodo (visto / siguiente) + barra "Siguiente". Se recalcula solo cuando cambia algún check.
    function actualizarTimeline(){
      const esp = window.especialActual; if(!esp) return;
      const filas = _tlFilasVisibles();
      let vistas = 0, siguiente = null;
      document.querySelectorAll('#especial-lista .tl-row').forEach(r=>{
        const btn = document.getElementById(`esp-visto-${r.dataset.idx}`);
        const visto = !!(btn && btn.classList.contains('activo'));
        r.classList.toggle('tl-visto', visto);
        r.classList.remove('tl-next');
      });
      // "Siguiente" = la primera pendiente DESPUÉS de la última vista (lo lógico para seguir la ruta);
      // si ya está todo visto a partir de ahí, se recuerda el primer hueco que quede antes.
      let ultimaVista = -1;
      filas.forEach((r,k)=>{ if(r.classList.contains('tl-visto')){ vistas++; ultimaVista = k; } });
      siguiente = filas.slice(ultimaVista+1).find(r=>!r.classList.contains('tl-visto')) || filas.find(r=>!r.classList.contains('tl-visto')) || null;
      window.tlSiguiente = siguiente;
      if(siguiente) siguiente.classList.add('tl-next');
      const tiempo = pintarTiempoRuta();
      const bar = document.getElementById('tl-siguiente');
      const total = filas.length;
      if(!total){ bar.style.display='none'; }
      else {
        const pct = Math.round(vistas/total*100);
        if(!siguiente){
          bar.innerHTML = `<div class="tl-sig-bar" style="width:100%"></div><div class="tl-sig-txt"><span class="tl-sig-k">Ruta completada · ${vistas}/${total}</span><span class="tl-sig-t">🎉 ¡Lo has visto todo!</span></div>`;
        } else {
          const it = esp.items[+siguiente.dataset.idx];
          bar.innerHTML = `<div class="tl-sig-bar" style="width:${pct}%"></div><div class="tl-sig-txt"><span class="tl-sig-k">${vistas?`Siguiente · ${vistas}/${total}`:`Empieza por aquí · 0/${total}`}${siguiente.dataset.era?` · ${siguiente.dataset.era}`:''}${tiempo&&tiempo.queda?` · quedan ~${formatoHoras(tiempo.queda)}`:''}</span><span class="tl-sig-t">${String(it.n).padStart(2,'0')} · ${it.t}</span></div><span class="tl-sig-btn" id="tl-sig-flecha">↓</span>`;
        }
        bar.style.display='flex';
      }
      _tlActualizarScroll();
    }
    function saltarATituloTimeline(n){
      const esp = window.especialActual; if(!esp) return;
      const idx = esp.items.findIndex(x=>x.n===n); if(idx<0) return;
      let r = document.getElementById(`esp-row-${idx}`); if(!r) return;
      if(r.classList.contains('tl-oculto')) filtrarTimeline('todo');
      r.classList.add('tl-in');
      r.scrollIntoView({behavior:_tlReduceMotion?'auto':'smooth', block:'center'});
      r.classList.remove('tl-pulse'); void r.offsetWidth; r.classList.add('tl-pulse');
      setTimeout(()=>r.classList.remove('tl-pulse'), 1800);
    }
    function irAlSiguienteTimeline(){
      const r = window.tlSiguiente; if(!r) return;
      r.scrollIntoView({behavior:_tlReduceMotion?'auto':'smooth', block:'center'});
      r.classList.remove('tl-pulse'); void r.offsetWidth; r.classList.add('tl-pulse');
      setTimeout(()=>r.classList.remove('tl-pulse'), 1800);
    }
    // Hilo rojo que avanza con el scroll + punto "estás aquí"
    let _tlRaf = null;
    function _tlActualizarScroll(){
      const pantalla = document.getElementById('p-especial');
      if(!pantalla || !pantalla.classList.contains('activa')) return;
      const lista = document.getElementById('especial-lista');
      const track = document.getElementById('tl-track'); if(!track) return;
      const marcas = [...lista.querySelectorAll(':scope > .tl-row:not(.tl-oculto), :scope > .tl-hito:not(.tl-oculto)')];
      if(!marcas.length){ track.style.height='0px'; return; }
      const centro = el => { const n = el.querySelector('.tl-node, .tl-hito-marca'); return el.offsetTop + n.offsetTop + n.offsetHeight/2; };
      const top = centro(marcas[0]), alto = Math.max(0, centro(marcas[marcas.length-1]) - top);
      track.style.top = top+'px'; track.style.height = alto+'px';
      const ancla = window.innerHeight*0.45 - lista.getBoundingClientRect().top;
      const lleno = Math.max(0, Math.min(alto, ancla - top));
      document.getElementById('tl-fill').style.height = lleno+'px';
      const head = document.getElementById('tl-head');
      head.style.top = lleno+'px';
      head.style.opacity = (lleno>0 && lleno<alto) ? '1' : '0';
      // Hitos que el hilo ya ha cruzado se encienden en rojo; el último cruzado es "Estás en"
      let actual = null;
      marcas.forEach(el=>{ if(!el.classList.contains('tl-hito')) return; const pasado = centro(el) - top <= lleno + 1; el.classList.toggle('tl-pasado', pasado); if(pasado) actual = el; });
      const flot = document.getElementById('tl-era-flotante');
      if(flot){
        const primerHito = lista.querySelector(':scope > .tl-hito:not(.tl-oculto)');
        const mostrar = !!(actual && primerHito && primerHito.getBoundingClientRect().top < 60);
        const era = actual ? actual.dataset.era : '';
        if(flot.dataset.era !== era){
          flot.dataset.era = era;
          flot.innerHTML = era ? `<span class="tl-ef-dot"></span><span class="tl-ef-k">Estás en</span><span class="tl-ef-v">${era}</span>` : '';
          if(era && flot.classList.contains('on')){ flot.classList.remove('tl-ef-cambio'); void flot.offsetWidth; flot.classList.add('tl-ef-cambio'); }
        }
        flot.classList.toggle('on', mostrar);
      }
      const flecha = document.getElementById('tl-sig-flecha');
      if(flecha && window.tlSiguiente){
        const rc = window.tlSiguiente.getBoundingClientRect();
        flecha.textContent = rc.top > window.innerHeight*0.8 ? '↓' : rc.bottom < window.innerHeight*0.15 ? '↑' : '•';
      }
    }
    // Fundido de entrada de cada tarjeta al aparecer en pantalla
    let _tlObservador = null;
    function _prepararAnimacionTimeline(){
      const filas = document.querySelectorAll('#especial-lista .tl-anim');
      if(_tlObservador) _tlObservador.disconnect();
      if(_tlReduceMotion || !('IntersectionObserver' in window)){ filas.forEach(f=>f.classList.add('tl-in')); return; }
      _tlObservador = new IntersectionObserver(entradas=>{
        entradas.forEach(en=>{ if(en.isIntersecting){ en.target.classList.add('tl-in'); _tlObservador.unobserve(en.target); } });
      }, {rootMargin:'0px 0px -6% 0px'});
      filas.forEach(f=>_tlObservador.observe(f));
    }

    // ══ DURACIÓN DE LAS RUTAS ════════════════════════════════════════════
    // Minutos por título (película: duración; serie: episodios × duración media). Se guarda en el dispositivo;
    // las series se refrescan cada 30 días por si salen episodios nuevos.
    const _DUR_KEY = 'duracionesTmdb_v1';
    function _durClave(tipo,id){ return `${tipo}:${id}`; }
    function _minutosDesdeDetalle(tipo, d){
      if(!d) return null;
      if(tipo==='movie') return d.runtime>0 ? d.runtime : null;
      const eps = d.number_of_episodes||0;
      const rts = (d.episode_run_time||[]).filter(x=>x>0);
      const media = rts.length ? rts.reduce((a,b)=>a+b,0)/rts.length : (d.last_episode_to_air&&d.last_episode_to_air.runtime) || null;
      return (eps>0 && media) ? Math.round(eps*media) : null;
    }
    function _guardarDuracionDesdeDetalle(tipo, id, d){
      const m = _minutosDesdeDetalle(tipo, d);
      if(m==null) return;
      window._duraciones[_durClave(tipo,id)] = {m, ts: Date.now()};
      try{ localStorage.setItem(_DUR_KEY, JSON.stringify(window._duraciones)); }catch(e){}
    }
    function _duracionVigente(tipo,id){
      const e = window._duraciones[_durClave(tipo,id)];
      if(!e) return null;
      if(tipo==='tv' && Date.now()-e.ts > 30*864e5) return null;
      return e.m;
    }
    function minutosDeFila(idx){
      let id, tipo;
      const obj = window.especialTmdbCache && window.especialTmdbCache[idx];
      if(obj){ id = obj.id; tipo = obj._tipo; }
      else {
        // Si el título aún no se ha resuelto en esta visita, usa el ID ya guardado en el dispositivo
        const it = window.especialActual && window.especialActual.items[idx];
        const r = it && window.especialIdsResueltos && window.especialIdsResueltos[_claveIdResuelto(it)];
        if(!r) return null; id = r.id; tipo = r.tipo;
      }
      const e = window._duraciones[_durClave(tipo, id)];
      return e ? e.m : null;
    }
    async function cargarDuracionesEspecial(esp){
      const pendientes = esp.items.map((it,idx)=>({idx, obj: window.especialTmdbCache[idx]}))
        .filter(x=>x.obj && _duracionVigente(x.obj._tipo, x.obj.id)==null);
      const CHUNK = 6;
      for(let i=0;i<pendientes.length;i+=CHUNK){
        if(window.especialActual!==esp) return;
        await Promise.all(pendientes.slice(i,i+CHUNK).map(async ({obj})=>{
          try{
            const d = await (await fetch(`${TMDB_PROXY}?path=/${obj._tipo}/${obj.id}&language=es-ES`)).json();
            _guardarDuracionDesdeDetalle(obj._tipo, obj.id, d);
          }catch(e){}
        }));
      }
      if(window.especialActual===esp){ window._duracionesListas = true; actualizarTimeline(); }
    }
    function formatoHoras(min){
      if(min < 60) return `${min} min`;
      const h = min/60;
      return h < 10 ? `${(Math.round(h*2)/2).toString().replace('.',',')} h` : `${Math.round(h)} h`;
    }
    // Total y restante de la ruta visible; devuelve también si falta algún dato
    function calcularTiempoRuta(){
      let total = 0, queda = 0, desconocidos = 0;
      _tlFilasVisibles().forEach(r=>{
        const m = minutosDeFila(+r.dataset.idx);
        if(m==null){ desconocidos++; return; }
        total += m;
        if(!r.classList.contains('tl-visto')) queda += m;
      });
      return {total, queda, desconocidos};
    }
    function pintarTiempoRuta(){
      const el = document.getElementById('tl-tiempo'); if(!el) return null;
      const filas = _tlFilasVisibles();
      if(!filas.length){ el.style.display='none'; return null; }
      const t = calcularTiempoRuta();
      el.style.display = 'flex';
      if(!t.total){
        el.innerHTML = `<span class="tl-tiempo-ico">⏱</span><span class="tl-tiempo-txt">Calculando cuánto dura esta ruta…</span>`;
        return null;
      }
      const aprox = t.desconocidos && window._duracionesListas ? ` <span class="tl-tiempo-nota">(sin contar ${t.desconocidos} sin datos)</span>` : '';
      if(t.queda===0){
        el.innerHTML = `<span class="tl-tiempo-ico">✓</span><span class="tl-tiempo-txt"><b>Ruta completada</b> · ~${formatoHoras(t.total)} vistas${aprox}</span>`;
      } else {
        const noches = Math.max(1, Math.ceil(t.queda/120));
        const pct = Math.round((1 - t.queda/t.total)*100);
        const ritmo = noches===1 ? 'una noche' : noches<=45 ? `unas ${noches} noches` : `unos ${Math.round(noches/30)} meses`;
        const titular = t.queda===t.total ? `Esta ruta dura ~${formatoHoras(t.total)}` : `Te quedan ~${formatoHoras(t.queda)}`;
        const detalle = t.queda===t.total ? '' : ` de ~${formatoHoras(t.total)}`;
        el.innerHTML = `<span class="tl-tiempo-ico">⏱</span>
          <span class="tl-tiempo-txt"><b>${titular}</b>${detalle}${aprox}<br>
          <span class="tl-tiempo-sub">A 2 h por noche, ${ritmo}</span></span>
          ${pct>0?`<span class="tl-tiempo-anillo" style="--p:${pct}"><span>${pct}%</span></span>`:''}`;
      }
      return t;
    }

    async function cargarPostersEspecial(esp){
      const CHUNK = 8;
      for(let i=0;i<esp.items.length;i+=CHUNK){
        if(window.especialActual!==esp) return;
        const trozo = esp.items.slice(i,i+CHUNK).map((it,j)=>({it,idx:i+j}));
        await Promise.all(trozo.map(({it,idx})=>buscarTituloTmdb(it,idx)));
      }
      cargarDuracionesEspecial(esp);
    }

    async function buscarTituloTmdb(it,idx,intento=0){
      const esp = window.especialActual;
      try{
        let resultado;
        if(it.tmdb_id){
          // ID directo — sin búsqueda, va directo al endpoint de detalle (con caché de la sesión)
          window._detalleIdCache = window._detalleIdCache || {};
          const kd = `${it.tipo}:${it.tmdb_id}`;
          const data = window._detalleIdCache[kd] || await (await fetch(`${TMDB_PROXY}?path=/${it.tipo}/${it.tmdb_id}&language=es-ES`)).json();
          if(data && data.id) window._detalleIdCache[kd] = data;
          resultado = (data && data.id) ? data : null; // si TMDB devolvió un error, se reintenta más abajo
          if(window.especialActual!==esp) return;
          const porque = document.getElementById(`esp-porque-${idx}`);
          if(porque && !it.p && data && data.overview) porque.textContent = data.overview;
          if(window.especialActual && window.especialActual.esColeccion && data && (data.release_date||data.first_air_date)) _colRellenarFecha(window.especialActual.colId, it.tipo, it.tmdb_id, data.release_date||data.first_air_date);
        } else {
          const campoAno = it.tipo==='movie' ? 'year' : 'first_air_date_year';
          let url = `${TMDB_PROXY}?path=/search/${it.tipo}&language=es-ES&query=${encodeURIComponent(it.t)}&${campoAno}=${it.y}`;
          let data = await (await fetch(url)).json();
          resultado = (data.results||[])[0];
          if(!resultado){
            url = `${TMDB_PROXY}?path=/search/${it.tipo}&language=es-ES&query=${encodeURIComponent(it.t)}`;
            data = await (await fetch(url)).json();
            resultado = (data.results||[]).sort((a,b)=>(b.popularity||0)-(a.popularity||0))[0];
          }
        }
        if(window.especialActual!==esp) return;
        if(!it.tmdb_id && !it.p && resultado && resultado.overview){
          const porque = document.getElementById(`esp-porque-${idx}`);
          if(porque) porque.textContent = resultado.overview;
        }
        if(!resultado){
          if(intento<2){ await new Promise(r=>setTimeout(r,400*(intento+1))); return buscarTituloTmdb(it,idx,intento+1); }
          document.getElementById(`esp-poster-${idx}`)?.classList.remove('skeleton');
          return;
        }
        const obj = {...resultado,_tipo:it.tipo,title:resultado.title||resultado.name,release_date:resultado.release_date||resultado.first_air_date};
        window.especialTmdbCache[idx] = obj;
        _guardarIdResuelto(it, obj.id, it.tipo);
        if(it.tmdb_id) _guardarDuracionDesdeDetalle(it.tipo, obj.id, resultado);
        const posterEl = document.getElementById(`esp-poster-${idx}`);
        if(posterEl){
          posterEl.classList.remove('skeleton');
          if(obj.poster_path) posterEl.src = 'https://image.tmdb.org/t/p/w200'+obj.poster_path;
        }
        const metaEl = document.getElementById(`esp-meta-${idx}`);
        if(metaEl) metaEl.innerHTML = `${obj.release_date?obj.release_date.substring(0,4):esp_items_year(idx)} · ${it.tipo==='tv'?'Serie':'Película'} · ★ ${obj.vote_average?obj.vote_average.toFixed(1):'-'}`;
        // Corrección definitiva del check: ahora que tenemos el ID real, usamos eso en vez del texto del título
        // (el texto guardado al marcar 'vista' puede no coincidir exactamente con el de esta lista, sobre todo
        // en franquicias con varias entregas de nombre casi idéntico, como esta).
        const btnVisto = document.getElementById(`esp-visto-${idx}`);
        if(btnVisto){
          const idsSet = window.idsVistosSet || new Set();
          const yaVista = idsSet.has(`${obj.id}-${it.tipo}`);
          btnVisto.classList.toggle('activo', yaVista);
          btnVisto.innerHTML = yaVista ? '<span>✅</span><span>Vista</span>' : '<span>⬜</span><span>Marcar vista</span>';
        }
      }catch(e){
        if(window.especialActual!==esp) return;
        if(intento<2){ await new Promise(r=>setTimeout(r,400*(intento+1))); return buscarTituloTmdb(it,idx,intento+1); }
        document.getElementById(`esp-poster-${idx}`)?.classList.remove('skeleton');
      }
    }
    function esp_items_year(idx){return window.especialActual?.items[idx]?.y||'';}

    // Datos del título n.º idx del especial abierto. Si el póster no llegó a cargar, se vuelve a pedir,
    // y si aun así falla pero el título tiene id fijo de TMDB, se usa ese id con los datos de la lista.
    async function _objEspecial(idx){
      const it = window.especialActual && window.especialActual.items[idx];
      let obj = window.especialTmdbCache[idx];
      if(it && (!obj || !obj.id)){
        await buscarTituloTmdb(it,idx);
        obj = window.especialTmdbCache[idx];
      }
      if((!obj || !obj.id) && it && it.tmdb_id) obj = {id:it.tmdb_id, _tipo:it.tipo, title:it.t, poster_path:it.poster||null, release_date:it.f||(it.y?`${it.y}-01-01`:'')};
      return (obj && obj.id) ? obj : null;
    }
    async function abrirDetalleDesdeEspecial(idx){
      const obj = await _objEspecial(idx);
      if(obj) await abrirDetalle(obj);
    }

    async function toggleVistoDesdeEspecial(idx){
      if(!sesionActual){ mostrarCuenta(); return; }
      const obj = await _objEspecial(idx);
      if(!obj) return;
      const btn = document.getElementById(`esp-visto-${idx}`);
      const nuevo = !(btn && btn.classList.contains('activo'));
      const base = {
        user_id: sesionActual.user.id, tmdb_id: obj.id, tipo: obj._tipo,
        titulo: obj.title, poster_path: obj.poster_path,
        anio: obj.release_date ? obj.release_date.substring(0,4) : ''
      };
      const { error } = await sb.from('mi_biblioteca').upsert({...base, visto:nuevo}, { onConflict: 'user_id,tmdb_id,tipo' });
      if(error){ console.error(error); return; }
      if(btn){
        btn.classList.toggle('activo', nuevo);
        btn.innerHTML = nuevo ? '<span>✅</span><span>Vista</span>' : '<span>⬜</span><span>Marcar vista</span>';
      }
      refrescarIdsVistos();
      await refrescarVistosNormalizados();
      renderEspecialesTiles();
      cargarParaTi();
      cargarContinuarViendo();
      cargarHoyEnCine();
      cargarLogroDestacado();
      cargarAvisosSeries(); cargarTuSemana(); cargarNocheInicio(); cargarOscarInicio();
    }

    async function sorprendemeEnEspecial(){
      const esp = window.especialActual;
      if(!esp) return;
      const btn = document.getElementById('esp-sorpresa-btn');
      const textoOriginal = btn ? btn.textContent : '';
      if(btn){ btn.textContent = 'Buscando...'; btn.style.pointerEvents = 'none'; }
      const pendientes = esp.items.map((it,i)=>({it,i})).filter(({i})=>!window.especialTmdbCache[i]);
      if(pendientes.length) await Promise.all(pendientes.map(({it,i})=>buscarTituloTmdb(it,i)));
      const idsSet = window.idsVistosSet || new Set();
      const idxsSinVer = esp.items.map((it,i)=>i).filter(i=>{
        const it = esp.items[i];
        const obj = window.especialTmdbCache[i];
        if(!obj) return false;
        const yaVista = idsSet.has(`${obj.id}-${it.tipo}`);
        return !yaVista;
      });
      const idxsConDatos = esp.items.map((_,i)=>i).filter(i=>window.especialTmdbCache[i]);
      const pool = (idxsSinVer.length ? idxsSinVer : idxsConDatos).map(i=>window.especialTmdbCache[i]);
      if(btn){ btn.textContent = textoOriginal; btn.style.pointerEvents = ''; }
      if(!pool.length) return;
      await lanzarRuleta(pool);
    }

    // ── CUENTA / AUTENTICACIÓN ──────────────────────────────────────────
    async function initAuth(){
      const espera = setTimeout(()=>{ if(!window._gateListo) document.getElementById('gate-cargando').textContent = 'No se pudo comprobar la sesión. Revisa tu conexión y recarga la página.'; }, 8000);
      let data; try{ ({data} = await sb.auth.getSession()); }catch(e){ data = {session:null}; }
      await _cmAplicarSesion(data?.session);
      clearTimeout(espera); window._gateListo = true;
      sb.auth.onAuthStateChange((event, session)=>{
        if(event === 'INITIAL_SESSION') return; // ya comprobada arriba con getSession()
        if(event === 'SIGNED_OUT'){ location.reload(); return; } // se limpia todo lo que hubiera en memoria
        if(event === 'TOKEN_REFRESHED' && sesionActual && session?.user?.id === sesionActual.user?.id){
          sesionActual = {...session, user: sesionActual.user};
          return;
        }
        // Guardar notas, ranking o «La dejé» actualiza tus datos de usuario: no hace falta recargar toda la app
        if(event === 'USER_UPDATED' && sesionActual && session?.user?.id === sesionActual.user?.id){
          sesionActual = {...session};
          return;
        }
        // Fuera del callback de Auth para evitar esperas dentro de su bloqueo.
        setTimeout(async()=>{
          await _cmAplicarSesion(session);
          if(event === 'PASSWORD_RECOVERY' && sesionActual) irA('p-nueva-password');
        },0);
      });
    }
    // Sin sesión solo se ve la pantalla de entrada; con sesión, la app. La sesión la recuerda Supabase en este dispositivo.
    function _gateAplicar(){
      const logged = !!sesionActual;
      document.body.classList.toggle('sin-sesion', !logged);
      document.getElementById('gate-cargando').hidden = true;
      document.getElementById('gate-form').hidden = logged;
      if(!logged){
        const em = document.getElementById('gate-email');
        if(!em.value){ try{ em.value = localStorage.getItem('cm:email') || ''; }catch(e){} }
        (em.value ? document.getElementById('gate-pass') : em).focus({preventScroll:true});
      } else if(!window._enlaceHecho){
        window._enlaceHecho = true;
        _abrirEnlaceDirecto(); // un enlace compartido se abre solo después de entrar
      }
    }
    async function gateLogin(ev){
      if(ev) ev.preventDefault();
      const email = document.getElementById('gate-email').value.trim(), pass = document.getElementById('gate-pass').value;
      const err = document.getElementById('gate-error'), btn = document.getElementById('gate-btn');
      err.style.color = '#b3261e'; err.textContent = '';
      if(!email || !pass){ err.textContent = 'Rellena email y contraseña.'; return false; }
      btn.disabled = true; btn.textContent = 'Entrando…';
      const { error } = await sb.auth.signInWithPassword({ email, password: pass });
      btn.disabled = false; btn.textContent = 'Entrar';
      if(error){ err.textContent = /invalid login credentials/i.test(error.message) ? 'Email o contraseña incorrectos.' : error.message; return false; }
      try{ localStorage.setItem('cm:email', email); }catch(e){}
      document.getElementById('gate-pass').value = '';
      return false; // al entrar, onAuthStateChange abre la app
    }
    async function gateOlvide(){
      const email = document.getElementById('gate-email').value.trim();
      const err = document.getElementById('gate-error'); err.style.color = '#b3261e'; err.textContent = '';
      if(!email){ err.textContent = 'Escribe tu email arriba y vuelve a pulsar aquí.'; return; }
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + window.location.pathname });
      if(error){ err.textContent = error.message; return; }
      err.style.color = '#3d6651';
      err.textContent = 'Si ese email tiene cuenta, te hemos enviado un enlace para crear una nueva contraseña.';
    }
    function actualizarUICuenta(){
      const logged = !!sesionActual;
      document.getElementById('cuenta-btn-mobile').classList.toggle('logged', logged);
      const pcBtn = document.getElementById('pc-cuenta-btn');
      if(pcBtn){ pcBtn.querySelector('.pc-txt').textContent = pcBtn.title = logged ? 'Tú' : 'Entrar'; }
      document.getElementById('cuenta-logged-out').style.display = logged ? 'none' : 'block';
      document.getElementById('cuenta-logged-in').style.display = logged ? 'block' : 'none';
      if(logged) document.getElementById('cuenta-email').textContent = sesionActual.user.email;
      _pintarSaludo();
      if(peliculaActual) cargarEstadoBiblioteca();
      enCursoDesdeCuenta();
      colOrdenDesdeCuenta();
      abandonadasDesdeCuenta();
      ocultasDesdeCuenta();
      notasTempDesdeCuenta(); motivosDesdeCuenta(); porraDesdeCuenta();
      setTimeout(()=>{ if(typeof _accesoRegistrar==='function') _accesoRegistrar(); }, 1500);
      rankingDesdeCuenta();
      Promise.all([refrescarIdsVistos(), refrescarVistosNormalizados()]).then(()=>{ renderEspecialesTiles(); refrescarChecksEspecialAbierto(); _enCursoPintarBoton(); cargarMaratonInicio(); });
      colSync().then(()=>{ renderEspecialesTiles(); colActualizarBotonFicha(); });
      cargarParaTi();
      cargarContinuarViendo();
      cargarHoyEnCine();
      cargarLogroDestacado();
      cargarAvisosSeries(); cargarTuSemana(); cargarNocheInicio(); cargarOscarInicio();
    }
    function mostrarCuenta(){
      irA('p-cuenta');
      document.getElementById('ml-gusto').checked=_usarPerfilDeGusto();
      _pintarTuNivel();
      _avisosPintar();
      _adminPintar();
    }
    // Tarjeta de nivel en «Tú» (con los datos ya guardados; si faltan, invita a abrir Logros)
    async function _pintarTuNivel(){
      const el = document.getElementById('tu-nivel'); if(!el || !sesionActual) return;
      if(!LOGROS_VISIBLES) return;
      try{
        const vistos = await _vistosConInfo(false);
        if(!vistos.length || vistos.filter(v=>v.info).length < vistos.length*0.85) return;
        const logros = _calcularLogros(vistos), nv = _nivelCinefilo(logros), con = logros.filter(l=>l.nivel>0).length;
        el.innerHTML = `<div class="lg-nivel-n">Nivel ${nv.nivel} · ${nv.xp} puntos</div><div class="lg-nivel-t">${nv.titulo}</div>
          <div class="lg-barra"><div style="width:${Math.round(nv.progreso*100)}%"></div></div>
          <div class="lg-meta">${con} de ${logros.length} logros con medalla · ${nv.falta ? `${nv.falta} puntos para el nivel ${nv.nivel+1}` : 'nivel máximo'} · ver logros ›</div>`;
      }catch(e){}
    }

    async function login(){
      const email = document.getElementById('login-email').value.trim();
      const pass = document.getElementById('login-pass').value;
      const errEl = document.getElementById('login-error'); errEl.style.color='#b3261e'; errEl.textContent='';
      if(!email||!pass){ errEl.textContent='Rellena email y contraseña.'; return; }
      const { error } = await sb.auth.signInWithPassword({ email, password: pass });
      if(error){ errEl.textContent = error.message; return; }
      irA('p-inicio');
    }
    async function olvideContrasena(){
      const email = document.getElementById('login-email').value.trim();
      const errEl = document.getElementById('login-error'); errEl.style.color='#b3261e'; errEl.textContent='';
      if(!email){ errEl.textContent='Escribe tu email arriba primero y vuelve a pulsar aquí.'; return; }
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + window.location.pathname });
      if(error){ errEl.textContent = error.message; return; }
      errEl.style.color = '#3d6651';
      errEl.textContent = 'Te hemos enviado un email con un enlace para crear una nueva contraseña.';
    }
    async function guardarNuevaPassword(){
      const pass = document.getElementById('nueva-pass').value;
      const errEl = document.getElementById('nueva-pass-error'); errEl.style.color='#b3261e'; errEl.textContent='';
      if(pass.length<6){ errEl.textContent='Mínimo 6 caracteres.'; return; }
      const { error } = await sb.auth.updateUser({ password: pass });
      if(error){ errEl.textContent = error.message; return; }
      errEl.style.color = '#3d6651';
      errEl.textContent = 'Contraseña actualizada. Redirigiendo...';
      setTimeout(()=>irA('p-cuenta'), 1500);
    }
    // No se depende del aviso SIGNED_OUT (si la petición al servidor falla o tarda, no llegaba y la app seguía abierta):
    // se cierra la sesión en este dispositivo, se tapa la app al momento y se recarga limpia.
    async function logout(){
      sesionActual = null;
      try{ _gateAplicar(); }catch(e){}
      try{ await Promise.race([sb.auth.signOut({scope:'local'}), new Promise(r=>setTimeout(r, 3000))]); }catch(e){}
      // Lo de esta cuenta guardado en el dispositivo (addons con claves de debrid, clave de AllDebrid, vídeos, notas…)
      // no puede quedarse para la siguiente persona que entre: se borra todo lo de CineMood salvo preferencias del aparato
      const deAparato = /^cm:(tema|tv|oled|acento|vista|busquedas|filtrosFte)/;
      try{ Object.keys(localStorage).filter(k=>/^sb-.*-auth-token/.test(k) || (k.startsWith('cm:') && !deAparato.test(k)) || /^perfilGusto_|^cm-logro|^li:/.test(k)).forEach(k=>localStorage.removeItem(k)); }catch(e){}
      location.replace(location.pathname);
    }

    // ── DESHACER: aviso de unos segundos tras marcar, quitar o puntuar ──
    function _avisoDeshacer(texto, deshacer){
      let t = document.getElementById('cm-deshacer');
      if(!t){ t = document.createElement('div'); t.id = 'cm-deshacer'; t.className = 'cm-deshacer'; t.setAttribute('role','status'); document.body.appendChild(t); }
      t.innerHTML = `<span>${_escHtml(texto)}</span>${deshacer ? '<button type="button">Deshacer</button>' : ''}`;
      clearTimeout(t._tm);
      if(deshacer) t.querySelector('button').onclick = async ()=>{
        clearTimeout(t._tm); t.querySelector('button').disabled = true;
        try{ await deshacer(); t.innerHTML = '<span>↩️ Deshecho</span>'; }catch(e){ t.innerHTML = '<span>No se ha podido deshacer</span>'; }
        t._tm = setTimeout(()=>t.classList.remove('on'), 1500);
      };
      t.classList.add('on');
      t._tm = setTimeout(()=>t.classList.remove('on'), 6000);
    }
    const _rkCopia = () => JSON.parse(JSON.stringify(rankingLeer()));
    async function _filaBiblio(tipo, id){
      const { data } = await sb.from('mi_biblioteca').select('*').eq('user_id', sesionActual.user.id).eq('tmdb_id', id).eq('tipo', tipo).maybeSingle();
      return data || null;
    }
    // Devuelve la fila a como estaba (o la quita si antes no existía) y refresca lo que depende de ella
    function _deshacerFila(tipo, id, antes, rkAntes){
      return async ()=>{
        const uid = sesionActual.user.id;
        let error;
        if(antes) ({ error } = await sb.from('mi_biblioteca').update({visto:antes.visto, pendiente:antes.pendiente, puntuacion:antes.puntuacion, episodios_vistos:antes.episodios_vistos}).eq('id', antes.id).eq('user_id', uid));
        else{
          ({ error } = await sb.from('mi_biblioteca').delete().eq('user_id', uid).eq('tmdb_id', id).eq('tipo', tipo));
          if(error) ({ error } = await sb.from('mi_biblioteca').update({visto:false, pendiente:false, puntuacion:null}).eq('user_id', uid).eq('tmdb_id', id).eq('tipo', tipo));
        }
        if(error) throw error;
        if(rkAntes) rankingGuardar(rkAntes);
        await refrescarIdsVistos(); refrescarVistosNormalizados();
        cargarParaTi(); cargarContinuarViendo();
        if(peliculaActual && peliculaActual.id==id && peliculaActual._tipo===tipo) cargarEstadoBiblioteca();
        if(document.getElementById('p-biblioteca')?.classList.contains('activa')) cargarBiblioteca();
      };
    }
    // ── BIBLIOTECA (para ver / vistas + puntuación) ──────────────────────
    async function obtenerFilaBiblioteca(tmdbId,tipo){
      if(!sesionActual) return null;
      const { data, error } = await sb.from('mi_biblioteca').select('*')
        .eq('user_id', sesionActual.user.id).eq('tmdb_id', tmdbId).eq('tipo', tipo).maybeSingle();
      if(error){ console.error(error); return null; }
      return data;
    }
    async function upsertBiblioteca(patch, deshacer){
      if(!sesionActual){ mostrarCuenta(); return; }
      const _antesVisto = !!document.getElementById('btn-visto')?.classList.contains('active');
      // Solo al marcar como visto, nunca como migración automática.
      // Una actualización parcial conserva notas, episodios y demás campos.
      if(patch.visto===true) patch={...patch,pendiente:false};
      const p = peliculaActual;
      let _antes = null; const _rk = deshacer ? (deshacer.rk || _rkCopia()) : null;
      if(deshacer){ try{ _antes = await _filaBiblio(p._tipo, p.id); }catch(e){} }
      const base = {
        user_id: sesionActual.user.id, tmdb_id: p.id, tipo: p._tipo,
        titulo: p.title, poster_path: p.poster_path,
        anio: p.release_date ? p.release_date.substring(0,4) : ''
      };
      const { error } = await sb.from('mi_biblioteca').upsert({...base,...patch}, { onConflict: 'user_id,tmdb_id,tipo' });
      if(error){ console.error(error); _aviso('No se ha podido guardar el cambio. Tus datos anteriores se mantienen.', true); return; }
      if(deshacer) _avisoDeshacer(deshacer.texto, _deshacerFila(p._tipo, p.id, _antes, _rk));
      // celebraciones: sello al marcar una película, confeti al terminar una serie o una saga
      if(patch.visto===true && !_antesVisto){
        if(p._tipo==='movie') _selloVista(); else _celebrar(`🎉 ¡Has terminado ${p.title}!`, true);
      }
      if(patch.visto===true && !_antesVisto && p._tipo==='movie' && window._sagaFicha && window._sagaFicha.p===p){
        const hoy = new Date().toISOString().slice(0,10), v = new Set([...(window.idsVistosSet||[]), `${p.id}-movie`]);
        const salidas = window._sagaFicha.partes.filter(x=>x.release_date && x.release_date<=hoy);
        if(salidas.length>1 && salidas.every(x=>v.has(`${x.id}-movie`))) setTimeout(()=>_celebrar(`🏆 ¡Saga completa! Has visto las ${salidas.length} películas`, true), 900);
      }
      if('visto' in patch && window._sagaFicha && window._sagaFicha.p===p){ if(patch.visto) (window.idsVistosSet = window.idsVistosSet || new Set()).add(`${p.id}-movie`); else window.idsVistosSet?.delete(`${p.id}-movie`); _pintarSiguienteSaga(); }
      await cargarEstadoBiblioteca();
      refrescarIdsVistos();
      refrescarVistosNormalizados().then(()=>{ renderEspecialesTiles(); refrescarChecksEspecialAbierto(); cargarMaratonInicio(); });
      if('visto' in patch || 'puntuacion' in patch) cargarParaTi();
      if('visto' in patch || 'episodios_vistos' in patch) cargarContinuarViendo();
      if(patch.visto===true || 'puntuacion' in patch) _comprobarLogrosNuevos(p);
    }
    async function cargarEstadoBiblioteca(){
      const box = document.getElementById('d-acciones');
      if(!box || !peliculaActual) return;
      if(!sesionActual){
        ['btn-pendiente','btn-visto'].forEach(id=>document.getElementById(id).classList.remove('active'));
        renderPuntuacionRow(false);
        window.episodiosVistosGuardado = {};
        renderProgresoTemporadas();
        return;
      }
      const p = peliculaActual;
      const fila = await obtenerFilaBiblioteca(p.id, p._tipo);
      if(peliculaActual!==p)return;
      document.getElementById('btn-pendiente').classList.toggle('active', !!fila?.pendiente && !fila?.visto);
      document.getElementById('btn-visto').classList.toggle('active', !!fila?.visto);
      renderPuntuacionRow(!!fila?.visto, fila?.puntuacion);
      _pintarBotonOcultar(!!fila?.visto);
      window.episodiosVistosGuardado = fila?.episodios_vistos || {};
      renderProgresoTemporadas();
      if(peliculaActual._tipo==='tv') Object.keys(window.episodiosVistosGuardado).forEach(sn=>actualizarContadorTemporadaUI(Number(sn)));
    }
    function renderPuntuacionRow(visible, valorActual){
      _pintarMasGustado(visible ? Number(valorActual)||0 : 0);
      _pintarNivelFicha(visible);
      _pintarMotivos(visible, valorActual);
      const row = document.getElementById('d-puntuacion-row');
      if(!visible){ row.style.display='none'; row.innerHTML=''; return; }
      row.style.display='block';
      row.innerHTML = `<div class="d-punt-tit" id="d-punt-tit">Tu nota</div><div class="d-punt-escala" role="radiogroup" aria-labelledby="d-punt-tit">`+Array.from({length:10},(_,i)=>i+1).map(n=>
        `<button type="button" class="d-punto ${valorActual==n?'active':''}" role="radio" aria-checked="${valorActual==n}" aria-label="${n} de 10" onclick="guardarPuntuacion(${n})">${n}</button>`).join('')+`</div>`;
    }
    async function togglePendiente(){
      const nuevo = !document.getElementById('btn-pendiente').classList.contains('active');
      await upsertBiblioteca({ pendiente: nuevo }, {texto: nuevo ? '＋ Añadida a «Para ver»' : 'Quitada de «Para ver»'});
    }
    async function toggleVisto(){
      const nuevo = !document.getElementById('btn-visto').classList.contains('active');
      await upsertBiblioteca({ visto: nuevo }, {texto: nuevo ? '✓ Marcada como vista' : 'Ya no está como vista'});
    }
    // Con un 8 o más, recomendaciones de TMDB a partir de ESA película o serie (sin lo que ya has visto)
    async function _pintarMasGustado(nota){
      const box = document.getElementById('d-mas-gustado'), p = peliculaActual;
      if(!box) return;
      if(!p || nota<8){ box.style.display='none'; box.innerHTML=''; box.dataset.de=''; return; }
      const clave = `${p._tipo}:${p.id}`;
      if(box.dataset.de===clave && box.innerHTML) return;
      box.dataset.de = clave;
      try{
        const res = (await _tmdbJson(`/${p._tipo}/${p.id}/recommendations&language=es-ES&page=1`)).results||[];
        if(peliculaActual!==p) return;
        const vistos = window.idsVistosSet || new Set();
        const lista = res.filter(r=>r.poster_path && !vistos.has(`${r.id}-${p._tipo}`) && !esOculta(r.id, p._tipo)).slice(0,8)
          .map(r=>({...r, _tipo:p._tipo, title:r.title||r.name, release_date:r.release_date||r.first_air_date}));
        if(!lista.length){ box.style.display='none'; return; }
        window._masGustado = lista;
        box.innerHTML = `<div class="detalle-box-label">Te ha encantado: prueba con estas</div><div class="similares-scroll">${lista.map((r,i)=>`<div class="similar-card" onclick="abrirDetalle(_masGustado[${i}])" ${_lp({id:r.id,tipo:r._tipo,t:r.title,poster:r.poster_path,f:r.release_date})}><img loading="lazy" src="https://image.tmdb.org/t/p/w200${r.poster_path}" alt="${_escHtml(r.title)}"><div class="similar-titulo">${_escHtml(r.title)}</div><div class="similar-meta">${r.release_date?r.release_date.substring(0,4):''} · ★${r.vote_average?r.vote_average.toFixed(1):'-'}</div></div>`).join('')}</div>`;
        box.style.display = 'block';
      }catch(e){ if(peliculaActual===p){ box.style.display='none'; box.dataset.de=''; } }
    }
    // ── Nivel del ranking (S–D) desde la ficha, debajo de la nota ──
    function _claveRk(p){ return `${p._tipo}:${p.id}`; }
    function _nivelDeTitulo(k){ const o = rankingLeer(); return (RK_NIVELES.find(([n])=>(o[n]||[]).includes(k))||[])[0] || null; }
    function _pintarNivelFicha(visible){
      const row = document.getElementById('d-nivel-row'), p = peliculaActual;
      if(!row) return;
      if(!visible || !p){ row.style.display='none'; row.innerHTML=''; return; }
      const actual = _nivelDeTitulo(_claveRk(p));
      row.innerHTML = `<span class="d-nivel-k">Ranking</span>` + RK_NIVELES.map(([n,c])=>
        `<button type="button" class="d-nivel${actual===n?' activo':''}" style="--c:${c}" onclick="ponerNivelFicha('${n}')" aria-pressed="${actual===n}">${n}</button>`).join('');
      row.style.display = 'flex';
    }
    function _colocarEnNivel(k, nivel){
      const o = rankingLeer();
      RK_NIVELES.forEach(([n])=>{ if(o[n]) o[n] = o[n].filter(x=>x!==k); });
      if(nivel) (o[nivel] = o[nivel] || []).push(k);
      rankingGuardar(o);
    }
    function ponerNivelFicha(nivel){
      const p = peliculaActual; if(!p) return;
      if(!sesionActual){ mostrarCuenta(); return; }
      const k = _claveRk(p);
      _colocarEnNivel(k, _nivelDeTitulo(k)===nivel ? null : nivel); // tocar el nivel activo lo quita
      _pintarNivelFicha(true);
    }
    async function guardarPuntuacion(n){
      // si aún no está en tu ranking, se coloca con el mismo criterio que «Colocar automáticamente»
      const p = peliculaActual, rk = sesionActual ? _rkCopia() : null;
      if(p && sesionActual && !_nivelDeTitulo(_claveRk(p))) _colocarEnNivel(_claveRk(p), n>=10 ? 'A' : n>=8 ? 'B' : n>=7 ? 'C' : 'D');
      const pv = window._previstaFicha && p && window._previstaFicha.k===`${p._tipo}:${p.id}` ? window._previstaFicha.nota : null;
      const dif = pv!=null ? Math.abs(pv-n) : null;
      const extra = pv==null ? '' : ` · predije ${_notaFmt(pv)}${dif<=0.5 ? ' 🎯' : ''}`;
      await upsertBiblioteca({ visto: true, puntuacion: n }, {texto: pv==null ? `⭐ Guardada con un ${n}` : `⭐ Un ${n}${extra}`, rk});
      window._modeloNota = null; window._previstaFicha = null;
      _pintarMotivos(true, n, true);
      const chip = document.getElementById('d-prevista'); if(chip){ chip.style.display = 'none'; document.getElementById('d-prevista-por').style.display = 'none'; }
    }

    let bibliotecaTabActual = 'pendiente';
    let bibliotecaTipoActual = 'todos';
    function selectBibliotecaTab(el){
      document.querySelectorAll('#biblioteca-tab-row .tipo-btn').forEach(b=>{b.classList.remove('active');b.setAttribute('aria-pressed','false');});
      el.classList.add('active');
      el.setAttribute('aria-pressed','true');
      bibliotecaTabActual = el.dataset.tab;
      cargarBiblioteca();
    }
    function selectBibliotecaTipo(el){
      document.querySelectorAll('#biblioteca-tipo-row .tipo-btn').forEach(b=>{b.classList.remove('active');b.setAttribute('aria-pressed','false');});
      el.classList.add('active');
      el.setAttribute('aria-pressed','true');
      bibliotecaTipoActual = el.dataset.tipo;
      cargarBiblioteca();
    }
    async function abrirBiblioteca(){
      if(!sesionActual){ mostrarCuenta(); return; }
      irA('p-biblioteca');
      document.querySelectorAll('#biblioteca-tab-row [data-tab]').forEach(b=>{const on=b.dataset.tab===bibliotecaTabActual;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});
      document.querySelectorAll('#biblioteca-tipo-row [data-tipo]').forEach(b=>{const on=b.dataset.tipo===bibliotecaTipoActual;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});
      await cargarBiblioteca();
    }
    async function cargarBiblioteca(){
      await _miListaCargar();
    }
    async function abrirDetalleDesdeBiblioteca(i, item){
      const it = item || window.bibliotecaActual[i]; if(!it) return;
      try{
        const d = await (await fetch(`${TMDB_PROXY}?path=/${it.tipo}/${it.tmdb_id}&language=es-ES`)).json();
        const obj = {...d, title: d.title||d.name, release_date: d.release_date||d.first_air_date, _tipo: it.tipo};
        await abrirDetalle(obj);
      }catch(e){}
    }
    async function borrarDeBiblioteca(id){
      // Compatibilidad con controles antiguos: quitar de pendientes, no borrar.
      await quitarDePendientes(id);
    }

    async function elegirPorMi(){
      await _miListaElegir();
    }

    // ── EVITAR REPETIDOS (excluir títulos ya marcados como vistos) ──────
    async function refrescarIdsVistos(){
      if(!sesionActual){ window.idsVistosSet = new Set(); return; }
      const { data, error } = await sb.from('mi_biblioteca').select('tmdb_id,tipo').eq('user_id', sesionActual.user.id).eq('visto', true);
      if(error){ window.idsVistosSet = new Set(); return; }
      window.idsVistosSet = new Set((data||[]).map(x=>`${x.tmdb_id}-${x.tipo}`));
    }
    function excluirVistos(lista){
      const v = window.idsVistosSet || new Set();
      return lista.filter(it=>!v.has(`${it.id}-${it._tipo}`) && !esOculta(it.id, it._tipo));
    }

    // ── PARA TI (recomendaciones según tus títulos mejor puntuados) ─────
    async function cargarParaTi(){
      const wrap = document.getElementById('para-ti-wrap');
      if(!sesionActual){ wrap.style.display='none'; return; }
      await Promise.all([refrescarParaTi('movie'), refrescarParaTi('tv')]);
      _perfilGustoEnSegundoPlano();
      const hayPelis = document.getElementById('para-ti-pelis-wrap').style.display !== 'none';
      const haySeries = document.getElementById('para-ti-series-wrap').style.display !== 'none';
      wrap.style.display = (hayPelis || haySeries) ? 'block' : 'none';
    }

    // ── CONTINUAR VIENDO (series a medias, discreto) ─────────────────────
    function calcularProgresoSerie(episodiosVistos){
      const temporadas = Object.keys(episodiosVistos||{}).map(Number).filter(n=>(episodiosVistos[n]||[]).length);
      if(!temporadas.length) return null;
      const maxTemp = Math.max(...temporadas);
      const maxEp = Math.max(...episodiosVistos[maxTemp]);
      return { temporada: maxTemp, episodio: maxEp };
    }
    // ── SERIES ABANDONADAS («La dejé»): dejan de salir en «Continuar viendo». Se guardan en tu cuenta ──
    const ABANDONADAS_LS = 'cm:abandonadas';
    let _abandonadasT = null;
    function abandonadasLeer(){ try{ const a = JSON.parse(localStorage.getItem(ABANDONADAS_LS)||'[]'); return Array.isArray(a) ? a.map(Number).filter(Boolean) : []; }catch(e){ return []; } }
    function abandonadasGuardar(a){
      try{ localStorage.setItem(ABANDONADAS_LS, JSON.stringify(a)); }catch(e){}
      if(!sesionActual) return;
      clearTimeout(_abandonadasT);
      _abandonadasT = setTimeout(async ()=>{ try{ await sb.auth.updateUser({ data: { cm_abandonadas: a } }); }catch(e){} }, 600);
    }
    function abandonadasDesdeCuenta(){
      const r = sesionActual && sesionActual.user && sesionActual.user.user_metadata && sesionActual.user.user_metadata.cm_abandonadas;
      if(Array.isArray(r)){ try{ localStorage.setItem(ABANDONADAS_LS, JSON.stringify(r)); }catch(e){} }
      else if(sesionActual){ const a = abandonadasLeer(); if(a.length) abandonadasGuardar(a); }
    }
    function esAbandonada(id){ return abandonadasLeer().includes(Number(id)); }
