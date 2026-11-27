// CineMood · «Le pondrías un…»: predicción de tu nota
// (Parte de index.html; se carga como script clásico: todo comparte el mismo ámbito global.)

    // ══ «LE PONDRÍAS UN…»: predicción de tu nota a partir de las que ya has dado ══
    // Punto de partida: tu media, corregida por la nota del público (cuánto te dejas llevar por ella).
    // Encima, lo que te desvías de eso según géneros, director o creador, época, idioma, país, tipo y duración,
    // con contracción hacia cero (con pocos títulos, un rasgo apenas cuenta). Se calcula en el dispositivo.
    const _NOTA_K = {g:4, d:1.5, e:4, l:3, p:4, t:3, r:5}, _NOTA_W = {g:1, d:1, e:0.7, l:0.6, p:0.5, t:0.8, r:0.5};
    function _notaRasgos(tipo, info){
      const f = {g:[], d:[], e:[], l:[], p:[], t:['t'+tipo], r:[]};
      if(!info) return f;
      (info.g||[]).slice(0,3).forEach(g=>f.g.push('g'+g));
      if(info.d && info.d.id) f.d.push('d'+info.d.id);
      if(info.y) f.e.push('e'+Math.floor(info.y/10)*10);
      if(info.l) f.l.push('l'+info.l);
      (info.p||[]).slice(0,2).forEach(c=>f.p.push('p'+c));
      if(tipo==='movie' && info.r) f.r.push(info.r<95 ? 'rcorta' : info.r>140 ? 'rlarga' : 'rmedia');
      return f;
    }
    const _notaConPublico = info => !!(info && info.va>0 && info.vc>=20);
    function _notaEntrenar(muestras){
      const n = muestras.length; if(n<8) return null;
      const R = muestras.map(x=>Number(x.puntuacion)), media = R.reduce((a,b)=>a+b,0)/n;
      const cv = muestras.filter(x=>_notaConPublico(x.info));
      let mva = 7, s = 0.8;
      if(cv.length>=8){
        mva = cv.reduce((a,x)=>a+x.info.va,0)/cv.length;
        const mr = cv.reduce((a,x)=>a+Number(x.puntuacion),0)/cv.length;
        let cov = 0, vr = 0; cv.forEach(x=>{ cov += (x.info.va-mva)*(Number(x.puntuacion)-mr); vr += (x.info.va-mva)**2; });
        const bruta = vr>0 ? Math.max(0.2, Math.min(1.5, cov/vr)) : 0.8;
        s = (bruta*cv.length + 0.8*10)/(cv.length+10);
      }
      const base = info => media + (_notaConPublico(info) ? s*(info.va-mva) : 0);
      const rasgos = muestras.map(x=>_notaRasgos(x.tipo, x.info)), bases = muestras.map(x=>base(x.info));
      const ef = {}, grupos = Object.keys(_NOTA_K);
      const aporte = (f, g) => f[g].length ? _NOTA_W[g]*f[g].reduce((a,k)=>a+(ef[k]||0),0)/f[g].length : 0;
      for(let vuelta=0; vuelta<3; vuelta++){
        grupos.forEach(g=>{
          const suma = {}, cuenta = {};
          muestras.forEach((x,i)=>{
            const f = rasgos[i]; if(!f[g].length) return;
            const resto = R[i] - bases[i] - grupos.filter(h=>h!==g).reduce((a,h)=>a+aporte(f,h),0);
            f[g].forEach(k=>{ suma[k] = (suma[k]||0) + resto; cuenta[k] = (cuenta[k]||0) + 1; });
          });
          Object.keys(suma).forEach(k=>{ ef[k] = suma[k]/(cuenta[k]+_NOTA_K[g]) / _NOTA_W[g]; });
        });
      }
      const cuenta = {}; rasgos.forEach(f=>grupos.forEach(g=>f[g].forEach(k=>{ cuenta[k] = (cuenta[k]||0)+1; })));
      return {media, mva, s, ef, cuenta, n, base, aporte};
    }
    function _notaPredecir(fit, tipo, info){
      if(!fit) return null;
      const f = _notaRasgos(tipo, info), partes = [];
      let v = fit.base(info);
      Object.keys(_NOTA_K).forEach(g=>{ if(!f[g].length) return; f[g].forEach(k=>{ const a = _NOTA_W[g]*(fit.ef[k]||0)/f[g].length; v += a; if(fit.cuenta[k]) partes.push({k, a, n:fit.cuenta[k]}); }); });
      return {nota: Math.max(1, Math.min(10, v)), partes, publico: _notaConPublico(info) ? fit.s*(info.va-fit.mva) : 0};
    }
    // Puntería: se predice cada nota que ya diste como si no la conocieras (dejando ese título fuera)
    function _notaPunteria(m){
      if(m.punteria!==undefined) return m.punteria;
      const xs = m.muestras; if(xs.length<12){ m.punteria = null; return null; }
      let err = 0, errPub = 0, nPub = 0, cerca = 0;
      xs.forEach((x,i)=>{
        const fit = _notaEntrenar(xs.filter((_,j)=>j!==i)), pr = _notaPredecir(fit, x.tipo, x.info);
        const e = Math.abs(pr.nota - Number(x.puntuacion)); err += e; if(e<=1) cerca++;
        if(_notaConPublico(x.info)){ errPub += Math.abs(x.info.va - Number(x.puntuacion)); nPub++; }
      });
      m.punteria = {err: err/xs.length, cerca: cerca/xs.length, errPub: nPub ? errPub/nPub : null};
      return m.punteria;
    }
    async function _modeloNotaObtener(){
      if(!sesionActual) return null;
      const uid = sesionActual.user.id, m = window._modeloNota;
      if(m && m.uid===uid && Date.now()-m.t < 15*60e3) return m;
      if(window._modeloNotaCargando) return window._modeloNotaCargando;
      window._modeloNotaCargando = (async()=>{
        let vistos = await _vistosConInfo(false);
        let muestras = vistos.filter(v=>v.puntuacion!=null && v.info);
        const puntuados = vistos.filter(v=>v.puntuacion!=null).length;
        if(puntuados >= 8 && muestras.length < Math.max(8, puntuados*0.6)){ vistos = await _vistosConInfo(true); muestras = vistos.filter(v=>v.puntuacion!=null && v.info); }
        const nuevo = {uid, t:Date.now(), muestras, fit:_notaEntrenar(muestras)};
        if(sesionActual?.user.id===uid){ window._modeloNota = nuevo; setTimeout(_avisosQuizaSubirModelo, 0); }
        // los títulos puntuados sin datos guardados en este dispositivo se completan una vez, en segundo plano
        if(vistos.some(v=>v.puntuacion!=null && !v.info) && !window._modeloNotaCompletando){
          window._modeloNotaCompletando = true;
          _vistosConInfo(true).then(()=>{ window._modeloNota = null; }).catch(()=>{});
        }
        return nuevo;
      })().finally(()=>{ window._modeloNotaCargando = null; });
      return window._modeloNotaCargando;
    }
    const _notaFmt = v => v.toFixed(1).replace('.', ',');
    // Datos completos de títulos que no has visto (para que el póster diga lo mismo que la ficha). Caché limitada en el dispositivo
    let _piMapa = null, _piT = null;
    function _piLeer(){ if(!_piMapa){ try{ _piMapa = JSON.parse(localStorage.getItem('cm:prevInfo')||'{}') || {}; }catch(e){ _piMapa = {}; } } return _piMapa; }
    function _piGuardar(tipo, id, info){
      if(!info) return; const m = _piLeer(); m[`${tipo}:${id}`] = {...info, _t: Date.now()};
      const ks = Object.keys(m); if(ks.length > 700) ks.sort((a,b)=>(m[a]._t||0)-(m[b]._t||0)).slice(0, ks.length-550).forEach(k=>delete m[k]);
      clearTimeout(_piT); _piT = setTimeout(()=>{ try{ localStorage.setItem('cm:prevInfo', JSON.stringify(m)); }catch(e){} }, 800);
    }
    function _infoCompleta(tipo, id){ return _leerInfoLogro(tipo, id) || _piLeer()[`${tipo}:${id}`] || null; }
    function _prevInfo(p){
      const local = _infoCompleta(p._tipo, p.id); if(local) return local;
      const f = p.release_date || p.first_air_date || '';
      return {y: f ? Number(f.slice(0,4)) : null, l: p.original_language || null, p: (p.origin_country||[]).slice(0,2),
        g: p.genre_ids || (p.genres||[]).map(g=>g.id), va: p.vote_average || 0, vc: p.vote_count || 0, r: p.runtime || 0, d: null};
    }
    // La nota que se enseña: solo con los datos completos del título (los mismos que usa la ficha)
    function _notaExacta(p){
      const m = window._modeloNota; if(!p || !p.id || !p._tipo || !m || !m.fit || m.uid!==sesionActual?.user.id) return null;
      const k = `${p.id}-${p._tipo}`, c = window._prevCache.get(k);
      if(c && c.t===m.t) return c.v;
      const info = _infoCompleta(p._tipo, p.id); if(!info) return null;
      const pr = _notaPredecir(m.fit, p._tipo, info), v = pr ? pr.nota : null;
      window._prevCache.set(k, {t:m.t, v}); return v;
    }
    // Aproximada (con los datos de la lista) solo para ordenar y filtrar; si ya hay datos completos, la exacta
    function _notaRapida(p){
      const m = window._modeloNota; if(!p || !p.id || !p._tipo || !m || !m.fit || m.uid!==sesionActual?.user.id) return null;
      const v = _notaExacta(p); if(v!=null) return v;
      const pr = _notaPredecir(m.fit, p._tipo, _prevInfo(p)); return pr ? pr.nota : null;
    }
    // Pósters en pantalla sin datos completos: se piden (pocos a la vez) y se les pone la nota al llegar
    let _prevCola = [], _prevActivas = 0, _prevObsT = null;
    function _prevProgramarObservar(){ clearTimeout(_prevObsT); _prevObsT = setTimeout(_prevObservar, 120); }
    // los que están en pantalla (o casi) y aún no tienen nota: se piden sus datos completos
    function _prevObservar(){
      const vh = window.innerHeight, vw = window.innerWidth;
      document.querySelectorAll('.pantalla.activa .desc-card[data-k], .pantalla.activa .desc-rk[data-k]').forEach(c=>{
        if(c.querySelector('.prev-badge') || !window._prevItems.has(c.dataset.k)) return;
        const r = c.getBoundingClientRect();
        if(r.width && r.bottom > -150 && r.top < vh+150 && r.right > -100 && r.left < vw+250) _prevEncolar(c.dataset.k);
      });
    }
    function _prevEncolar(k){ if(!_prevCola.includes(k)) _prevCola.push(k); _prevSiguiente(); }
    async function _prevSiguiente(){
      while(_prevActivas < 4 && _prevCola.length){
        const k = _prevCola.shift(), p = window._prevItems.get(k); if(!p) continue;
        if(_infoCompleta(p._tipo, p.id)){ _prevPonerBadge(k); continue; }
        _prevActivas++;
        _fetchDetalleYCreditos(p._tipo, p.id).then(pak=>{ const info = _infoDesdePak(p._tipo, pak); if(info){ _piGuardar(p._tipo, p.id, info); _prevPonerBadge(k); } })
          .catch(()=>{}).finally(()=>{ _prevActivas--; _prevSiguiente(); });
      }
    }
    function _prevPonerBadge(k){
      const p = window._prevItems.get(k); if(!p) return;
      document.querySelectorAll(`.desc-card[data-k="${k}"], .desc-rk[data-k="${k}"]`).forEach(c=>{
        const pos = c.classList.contains('desc-rk') ? c : c.querySelector('.desc-poster');
        if(!pos || pos.querySelector('.prev-badge')) return;
        // «Solo lo bueno» en Descubre: si con la nota exacta baja de 7, la tarjeta se quita
        if(c.closest('#desc-filas') && _descSoloBueno()){ const v = _notaExacta(p); if(v!=null && v < 7){ c.remove(); return; } }
        const b = _prevBadge(p); if(b) pos.insertAdjacentHTML('beforeend', b);
      });
    }
    function _prevPrecargar(){
      if(!sesionActual || window._modeloNotaCargando || (window._modeloNota && window._modeloNota.uid===sesionActual.user.id)) return;
      _modeloNotaObtener().then(()=>_prevRefrescar()).catch(()=>{});
    }
    function _prevBadge(p){
      if(!sesionActual || !p || !p.id) return '';
      const k = `${p.id}-${p._tipo}`;
      if((window.idsVistosSet||new Set()).has(k)) return '';
      window._prevItems.set(k, p);
      if(!window._modeloNota){ _prevPrecargar(); return ''; }
      const v = _notaExacta(p);
      if(v==null){ _prevProgramarObservar(); return ''; }
      const m = window._modeloNota, alta = v >= Math.max(8, m.fit.media+1.2);
      return `<span class="prev-badge${alta?' alta':''}" title="Le pondrías un ${_notaFmt(v)}">🔮 ${_notaFmt(v)}</span>`;
    }
    // cuando llega el modelo, se añade la nota a los pósters que ya estaban pintados
    function _prevRefrescar(){
      document.querySelectorAll('.desc-card[data-k], .desc-rk[data-k]').forEach(c=>_prevPonerBadge(c.dataset.k));
      _prevProgramarObservar();
    }
    const _NOTA_GEN = {28:'acción',12:'aventura',16:'animación',35:'comedia',80:'crimen',99:'documental',18:'drama',10751:'familiar',14:'fantasía',36:'historia',27:'terror',10402:'música',9648:'misterio',10749:'romance',878:'ciencia ficción',10770:'película de TV',53:'thriller',10752:'bélico',37:'western',10759:'acción y aventura',10762:'infantil',10763:'noticias',10764:'reality',10765:'ciencia ficción y fantasía',10766:'telenovela',10767:'entrevistas',10768:'guerra y política'};
    async function _notaNombreRasgo(k, nombres){
      const t = k[0], v = k.slice(1);
      if(t==='g'){ let n = null; try{ n = (await _mapaGenerosGlobal())[v]; }catch(e){} n = n || _NOTA_GEN[v]; return n ? `el género ${n.toLowerCase()}` : 'este género'; }
      if(t==='d') return (nombres && nombres[v]) || 'su director';
      if(t==='e') return `el cine de los ${Number(v)<2000 ? String(v).slice(2) : v}`;
      if(t==='l') return `lo rodado en ${_idioma(v)}`;
      if(t==='p'){ try{ return `lo de ${new Intl.DisplayNames(['es'], {type:'region'}).of(v)}`; }catch(e){ return v; } }
      if(t==='t') return v==='tv' ? 'las series' : 'las películas';
      if(t==='r') return v==='corta' ? 'las pelis cortas' : v==='larga' ? 'las pelis largas' : 'las pelis de duración normal';
      return k;
    }
    async function _pintarNotaPrevista(p){
      const chip = document.getElementById('d-prevista'), por = document.getElementById('d-prevista-por');
      chip.style.display = 'none'; por.style.display = 'none'; chip.setAttribute('aria-expanded','false'); window._previstaFicha = null;
      if(!sesionActual || !p) return;
      try{
        const [m, fila] = await Promise.all([_modeloNotaObtener(), obtenerFilaBiblioteca(p.id, p._tipo).catch(()=>null)]);
        if(peliculaActual!==p || !m || !m.fit) return;
        if(fila && fila.visto && fila.puntuacion!=null) return; // ya tiene tu nota
        let info = _infoCompleta(p._tipo, p.id);
        if(!info){ const pak = await _fetchDetalleYCreditos(p._tipo, p.id); if(peliculaActual!==p) return; info = _infoDesdePak(p._tipo, pak); _piGuardar(p._tipo, p.id, info); }
        if(!info) return;
        // fuera el propio título si ya estaba entre tus notas (p. ej. tras quitarle la nota)
        const pr = _notaPredecir(m.fit, p._tipo, info); if(!pr) return;
        window._previstaFicha = {k:`${p._tipo}:${p.id}`, nota:pr.nota};
        window._prevCache.set(`${p.id}-${p._tipo}`, {t:m.t, v:pr.nota});
        chip.innerHTML = `🔮 Le pondrías un <b>${_notaFmt(pr.nota)}</b>`;
        chip.style.display = '';
        const fuertes = pr.partes.filter(x=>Math.abs(x.a)>=0.12).sort((a,b)=>Math.abs(b.a)-Math.abs(a.a)).slice(0,5);
        const dirs = {}; m.muestras.forEach(x=>{ if(x.info?.d?.id) dirs[x.info.d.id] = x.info.d.n; }); if(info.d?.id) dirs[info.d.id] = info.d.n;
        const nombres = await Promise.all(fuertes.map(x=>_notaNombreRasgo(x.k, dirs)));
        if(peliculaActual!==p) return;
        const linea = (x,i) => `${_escHtml(nombres[i])} <span class="${x.a>0?'np-mas':'np-menos'}">${x.a>0?'+':'−'}${_notaFmt(Math.abs(x.a))}</span>`;
        const mas = fuertes.map((x,i)=>x.a>0 ? linea(x,i) : null).filter(Boolean), menos = fuertes.map((x,i)=>x.a<0 ? linea(x,i) : null).filter(Boolean);
        const pub = Math.abs(pr.publico)>=0.15 ? `<div class="np-k">El público</div>Le da un ${_notaFmt(info.va)}: ${pr.publico>0 ? 'eso sube' : 'eso baja'} tu nota <span class="${pr.publico>0?'np-mas':'np-menos'}">${pr.publico>0?'+':'−'}${_notaFmt(Math.abs(pr.publico))}</span>` : '';
        por.innerHTML = `<div class="np-cab">🔮 Por qué le pondrías un <b>${_notaFmt(pr.nota)}</b></div><div class="np-k">Tu punto de partida</div>Tu nota media es un ${_notaFmt(m.fit.media)}${mas.length ? `<div class="np-k">Suma porque te suele gustar</div>${mas.join(' · ')}` : ''}${menos.length ? `<div class="np-k">Resta porque te suele gustar menos</div>${menos.join(' · ')}` : ''}${pub}
          <div class="np-pie" id="np-pie">Aprendido de tus ${m.fit.n} notas.</div>`;
        setTimeout(()=>{ // la puntería tarda un poco más: se calcula aparte, sin frenar la ficha
          if(peliculaActual!==p) return;
          const pt = _notaPunteria(m), pie = document.getElementById('np-pie');
          if(pt && pie) pie.textContent = `Aprendido de tus ${m.fit.n} notas. Acierta con ±1 punto el ${Math.round(pt.cerca*100)} % de las veces (se equivoca de media ${_notaFmt(pt.err)}${pt.errPub!=null && pt.errPub>pt.err+0.05 ? `; la nota del público, ${_notaFmt(pt.errPub)}` : ''}).`;
        }, 300);
      }catch(e){}
    }
    function alternarPorQuePrevista(){
      const chip = document.getElementById('d-prevista'), por = document.getElementById('d-prevista-por');
      const abrir = por.style.display==='none'; por.style.display = abrir ? 'block' : 'none'; chip.setAttribute('aria-expanded', String(abrir));
    }

    // ── PERFIL DE GUSTO ─────────────────────────────────────────────────
    function _perfilGustoStorageKey(){ return sesionActual ? `perfilGusto_v2_${sesionActual.user.id}` : null; }

    function _procesarPerfilDesdeDatos(vistos, paquetes, mapaGeneros){
      const generos = {}, personas = {}, decadas = {};
      let conNota = 0, sumaNota = 0;
      vistos.forEach((v,i)=>{
        const pak = paquetes[i];
        const peso = v.puntuacion!=null ? Number(v.puntuacion) : 6;
        if(v.puntuacion!=null){ conNota++; sumaNota += Number(v.puntuacion); }
        if(!pak || !pak.detalle){
          if(v.anio){ const dec = Math.floor(v.anio/10)*10; decadas[dec]=(decadas[dec]||0)+peso; }
          return;
        }
        const d = pak.detalle, cr = pak.creditos;
        (d.genres||[]).forEach(g=>{ generos[g.id] = (generos[g.id]||0) + peso; });
        let persona = null;
        if(v.tipo==='movie'){
          const dir = (cr?.crew||[]).find(c=>c.job==='Director');
          if(dir) persona = { id:'d'+dir.id, nombre:dir.name, rol:'Director' };
        } else {
          const cre = (d.created_by||[])[0];
          if(cre) persona = { id:'c'+cre.id, nombre:cre.name, rol:'Creador' };
        }
        if(persona){
          if(!personas[persona.id]) personas[persona.id] = { nombre:persona.nombre, rol:persona.rol, peso:0, n:0 };
          personas[persona.id].peso += peso; personas[persona.id].n += 1;
        }
        const fecha = d.release_date || d.first_air_date;
        const anio = fecha ? parseInt(fecha.substring(0,4),10) : v.anio;
        if(anio){ const dec = Math.floor(anio/10)*10; decadas[dec]=(decadas[dec]||0)+peso; }
      });
      const topGeneros = Object.entries(generos).sort((a,b)=>b[1]-a[1]).slice(0,6)
        .map(([id,peso])=>({ id:Number(id), nombre: mapaGeneros[id]||'—', peso }));
      const maxGenero = topGeneros[0]?.peso || 1;
      const topPersonas = Object.entries(personas).filter(([,p])=>p.n>=2).sort((a,b)=>b[1].peso-a[1].peso).slice(0,5)
        .map(([id,p])=>({ id, nombre:p.nombre, rol:p.rol, peso:p.peso, n:p.n }));
      const topDecadas = Object.entries(decadas).sort((a,b)=>b[1]-a[1]);
      const decadaFav = topDecadas.length ? Number(topDecadas[0][0]) : null;
      const notaMedia = conNota ? (sumaNota/conNota) : null;
      return { total: vistos.length, generosPeso: generos, topGeneros, maxGenero, topPersonas, decadaFav, notaMedia, calculadoEn: new Date().toISOString() };
    }

    async function construirPerfilGusto(forzar){
      if(!sesionActual) return null;
      const key = _perfilGustoStorageKey();
      const { data: vistos, error } = await sb.from('mi_biblioteca').select('tmdb_id,tipo,puntuacion,anio')
        .eq('user_id', sesionActual.user.id).eq('visto', true);
      if(error) throw new Error('red');
      if(!vistos || !vistos.length) return { vacio:true };
      if(!forzar && key){
        try{
          const cache = JSON.parse(localStorage.getItem(key)||'null');
          if(cache && cache.total===vistos.length) return cache;
        }catch(e){}
      }
      const mapaGeneros = await _mapaGenerosGlobal();
      const paquetes = await _fetchEnLotes(vistos, v=>_fetchDetalleYCreditos(v.tipo, v.tmdb_id));
      vistos.forEach((v,i)=>_guardarInfoLogro(v.tipo, v.tmdb_id, paquetes[i])); // para los logros
      const perfil = _procesarPerfilDesdeDatos(vistos, paquetes, mapaGeneros);
      if(key){ try{ localStorage.setItem(key, JSON.stringify(perfil)); }catch(e){} }
      window.perfilGustoActual = perfil;
      return perfil;
    }

    function _cargarPerfilGustoCache(){
      if(!_usarPerfilDeGusto()) return null;
      const key = _perfilGustoStorageKey();
      if(!key) return null;
      try{ return JSON.parse(localStorage.getItem(key)||'null'); }catch(e){ return null; }
    }

    function _fraseArquetipo(perfil){
      if(!perfil || perfil.vacio || !perfil.topGeneros.length) return '';
      const g1 = perfil.topGeneros[0]?.nombre;
      const g2 = perfil.topGeneros[1]?.nombre;
      const dec = perfil.decadaFav ? `de los ${perfil.decadaFav}` : '';
      let frase = `${g1||'Cine'}`;
      if(g2) frase += ` con toques de ${g2.toLowerCase()}`;
      if(dec) frase += `, con debilidad por el cine ${dec}`;
      return frase + '.';
    }

    async function abrirPerfilGusto(forzar){
      if(!sesionActual){ mostrarCuenta(); return; }
      irA('p-perfil-gusto');
      const cont = document.getElementById('perfil-gusto-cont');
      cont.innerHTML = '<span style="color:var(--k-767973);font-size:13px">Analizando tu biblioteca...</span>';
      let perfil;
      try{ perfil = await construirPerfilGusto(!!forzar); }
      catch(e){ cont.innerHTML = '<p style="color:#b3261e;font-size:13px">⚠️ No hemos podido calcular tu perfil ahora mismo. Comprueba tu conexión e inténtalo de nuevo.</p>'; return; }
      if(!perfil || perfil.vacio){ cont.innerHTML = '<p style="color:var(--k-61635e);font-size:13px">Todavía no tienes suficientes títulos vistos y puntuados para construir tu perfil. Marca y puntúa algunas películas o series primero.</p>'; return; }
      let pendientesFavoritos = [];
      try{ pendientesFavoritos = await _cruzarPendientesConPersonasFavoritas(perfil); }catch(e){ pendientesFavoritos = []; }
      const frase = _fraseArquetipo(perfil);
      cont.innerHTML = `
        ${frase?`<div class="wrapped-card wrapped-hero" style="margin-bottom:20px"><div class="wrapped-hero-emoji">🧭</div><div class="wrapped-hero-titulo">${frase}</div><div class="wrapped-hero-sub">Calculado a partir de ${perfil.total} título${perfil.total!==1?'s':''} visto${perfil.total!==1?'s':''}${perfil.notaMedia?` · nota media ${perfil.notaMedia.toFixed(1)}`:''}</div></div>`:''}
        <div class="section-label">Tus géneros, por peso real (puntuación incluida, no solo cantidad)</div>
        ${perfil.topGeneros.map(g=>`
          <div style="margin-bottom:10px">
            <div style="font-size:13px;color:var(--k-303330);margin-bottom:4px">${_escHtml(g.nombre)}</div>
            <div class="stats-bar"><div class="stats-bar-fill" style="width:${Math.max(6,Math.round(g.peso/perfil.maxGenero*100))}%"></div></div>
          </div>`).join('')}
        <div class="section-label" style="margin-top:14px">Directores y creadores que se repiten</div>
        ${perfil.topPersonas.length
          ? perfil.topPersonas.map(p=>`<div class="stats-genero-row"><span>${_escHtml(p.nombre)} <span style="color:var(--k-6b6e68)">· ${_escHtml(p.rol)}</span></span><span class="stats-genero-n">${p.n}×</span></div>`).join('')
          : '<p style="color:var(--k-6b6e68);font-size:12px">Todavía no se repite ningún director o creador 2 veces o más en tu biblioteca.</p>'}
        ${pendientesFavoritos.length?`
        <div class="section-label" style="margin-top:14px">Ya tienes pendientes de gente que te encanta</div>
        ${pendientesFavoritos.map(p=>`<div class="stats-genero-row"><span>${_escHtml(p.nombre)} <span style="color:var(--k-6b6e68)">· ${_escHtml(p.rol)}</span></span><span class="stats-genero-n">${p.titulos.length}×</span></div>`).join('')}
        `:''}
        <div style="margin-top:20px;text-align:center">
          <span class="link-sutil" onclick="abrirPerfilGusto(true)">🔄 Recalcular con mis últimos vistos</span>
        </div>
        <p style="color:var(--k-767973);font-size:11px;margin-top:14px;line-height:1.5">Este perfil se calcula solo con tus datos (títulos vistos, puntuaciones y metadatos públicos de TMDB) y se guarda en este dispositivo. No usa ningún servicio de IA externo. "Para ti" ya lo usa para ordenar mejor sus recomendaciones.</p>
      `;
    }

    function _normalizarMatchGenero(c, perfil){
      const genIds = c.genre_ids || [];
      if(!genIds.length || !perfil.maxGenero) return 0;
      let suma = 0;
      genIds.forEach(gid=>{ suma += (perfil.generosPeso[gid]||0); });
      return suma / (perfil.maxGenero * genIds.length); // 0–~1: cuánto coinciden tus géneros de peso, sin que ganar en 2 géneros valga el doble sin más
    }
    function _senalEpoca(c, perfil){
      if(!perfil.decadaFav || !c.release_date) return 0.5; // sin dato de década: neutro, ni penaliza ni beneficia
      const anio = parseInt(c.release_date.substring(0,4),10);
      if(!anio) return 0.5;
      const distancia = Math.abs(Math.floor(anio/10)*10 - perfil.decadaFav);
      return Math.max(0, 1 - distancia/80); // cae suavemente con la distancia a tu década favorita, sin corte duro
    }
    function _puntuarPorGusto(c, perfil){
      if(!perfil || !perfil.generosPeso) return Math.random();
      const matchGenero = _normalizarMatchGenero(c, perfil);
      const epoca = _senalEpoca(c, perfil);
      const calidad = (c.vote_average||0)/10;
      const novedad = Math.random()*0.4; // con peso real: garantiza variedad entre pulsaciones de "Ver otras"
      return matchGenero*0.45 + epoca*0.2 + calidad*0.15 + novedad;
    }

    // ── ORDENAR "PARA VER" POR GUSTO REAL ────────────────────────────────
    function _puntuarPorGustoEstable(c, perfil){
      if(!perfil || !perfil.generosPeso) return 0;
      const matchGenero = _normalizarMatchGenero(c, perfil);
      const epoca = _senalEpoca(c, perfil);
      const calidad = (c.vote_average||0)/10;
      return matchGenero*0.6 + epoca*0.25 + calidad*0.15; // sin aleatoriedad: el orden debe ser estable cada vez que abres la lista
    }
    function toggleOrdenBiblioteca(){
      window._ordenBibliotecaPendientes = window._ordenBibliotecaPendientes==='gusto' ? 'reciente' : 'gusto';
      try{ localStorage.setItem('ordenPendientes_v1', window._ordenBibliotecaPendientes); }catch(e){}
      cargarBiblioteca();
    }
    async function _puntuarPendientesPorGusto(data, perfil){
      const infos = await _fetchEnLotes(data, it=>_obtenerGenerosCached(it.tipo, it.tmdb_id));
      const scoreMap = {};
      data.forEach((it,i)=>{
        const info = infos[i];
        const candidato = info
          ? { genre_ids: info.genre_ids, release_date: info.release_date, vote_average: info.vote_average }
          : { genre_ids: [], release_date: it.anio?`${it.anio}-01-01`:null, vote_average: null };
        scoreMap[it.id] = _puntuarPorGustoEstable(candidato, perfil);
      });
      return scoreMap;
    }

    // ── PENDIENTES DE GENTE QUE TE ENCANTA (cruce con topPersonas) ───────
    function _procesarPendientesFavoritos(pendientes, infos, topPersonas){
      const favoritosPorId = {};
      topPersonas.forEach(p=>{ favoritosPorId[p.id] = p; });
      const resultado = {};
      pendientes.forEach((p,i)=>{
        const info = infos[i];
        const persona = info?.persona;
        if(!persona || !favoritosPorId[persona.id]) return;
        if(!resultado[persona.id]) resultado[persona.id] = { nombre: favoritosPorId[persona.id].nombre, rol: favoritosPorId[persona.id].rol, titulos: [] };
        resultado[persona.id].titulos.push(p.titulo);
      });
      return Object.values(resultado).sort((a,b)=>b.titulos.length-a.titulos.length);
    }
    async function _cruzarPendientesConPersonasFavoritas(perfil){
      if(!perfil || !perfil.topPersonas || !perfil.topPersonas.length || !sesionActual) return [];
      const { data: pendientes, error } = await sb.from('mi_biblioteca').select('tmdb_id,tipo,titulo')
        .eq('user_id', sesionActual.user.id).eq('pendiente', true);
      if(error || !pendientes || !pendientes.length) return [];
      const infos = await _fetchEnLotes(pendientes, p=>_obtenerGenerosCached(p.tipo, p.tmdb_id));
      return _procesarPendientesFavoritos(pendientes, infos, perfil.topPersonas);
    }

    // ── EVOLUCIÓN DE TU GUSTO EN EL TIEMPO ───────────────────────────────
    function _bucketPeriodo(fechaISO, granularidad){
      const d = new Date(fechaISO);
      if(granularidad==='trimestre'){
        const q = Math.floor(d.getMonth()/3)+1;
        return `${d.getFullYear()} T${q}`;
      }
      return `${d.getFullYear()}`;
    }
    function _procesarEvolucionDesdeDatos(vistos, infos, mapaGeneros){
      const anios = new Set(vistos.map(v=>new Date(v.creado_en).getFullYear()));
      const granularidad = anios.size<=1 ? 'trimestre' : 'anio';
      const buckets = {};
      vistos.forEach((v,i)=>{
        const info = infos[i];
        if(!info || !info.genre_ids || !info.genre_ids.length) return;
        const periodo = _bucketPeriodo(v.creado_en, granularidad);
        if(!buckets[periodo]) buckets[periodo] = {};
        info.genre_ids.forEach(gid=>{ buckets[periodo][gid] = (buckets[periodo][gid]||0)+1; });
      });
      const periodosOrdenados = Object.keys(buckets).sort();
      const periodos = periodosOrdenados.map(periodo=>{
        const conteo = buckets[periodo];
        const top = Object.entries(conteo).sort((a,b)=>b[1]-a[1]).slice(0,3)
          .map(([id,n])=>({nombre:mapaGeneros[id]||'—', n}));
        const total = Object.values(conteo).reduce((s,n)=>s+n,0);
        return { periodo, top, total };
      });
      return { granularidad, periodos };
    }
    async function construirEvolucionGusto(forzar){
      if(!sesionActual) return null;
      const key = `evolucionGusto_v1_${sesionActual.user.id}`;
      const { data: vistos, error } = await sb.from('mi_biblioteca').select('tmdb_id,tipo,creado_en')
        .eq('user_id', sesionActual.user.id).eq('visto', true).not('creado_en','is', null);
      if(error) throw new Error('red');
      if(!vistos || vistos.length<4) return { insuficiente:true, total: vistos?vistos.length:0 };
      if(!forzar){
        try{
          const cache = JSON.parse(localStorage.getItem(key)||'null');
          if(cache && cache.total===vistos.length) return cache;
        }catch(e){}
      }
      const mapaGeneros = await _mapaGenerosGlobal();
      const infos = await _fetchEnLotes(vistos, v=>_obtenerGenerosCached(v.tipo, v.tmdb_id));
      const evol = _procesarEvolucionDesdeDatos(vistos, infos, mapaGeneros);
      evol.total = vistos.length;
      if(evol.periodos.length<2) return { insuficiente:true, total: vistos.length };
      try{ localStorage.setItem(key, JSON.stringify(evol)); }catch(e){}
      return evol;
    }
    async function abrirEvolucionGusto(forzar){
      if(!sesionActual){ mostrarCuenta(); return; }
      irA('p-evolucion-gusto');
      const cont = document.getElementById('evolucion-gusto-cont');
      cont.innerHTML = '<span style="color:var(--k-767973);font-size:13px">Analizando tu historial...</span>';
      let evol;
      try{ evol = await construirEvolucionGusto(!!forzar); }
      catch(e){ cont.innerHTML = '<p style="color:#b3261e;font-size:13px">⚠️ No hemos podido calcular tu evolución ahora mismo. Comprueba tu conexión e inténtalo de nuevo.</p>'; return; }
      if(!evol || evol.insuficiente){ cont.innerHTML = `<p style="color:var(--k-61635e);font-size:13px">Necesitas títulos vistos repartidos en al menos 2 periodos distintos para ver una evolución${evol&&evol.total?` (tienes ${evol.total} vistos)`:''}.</p>`; return; }
      cont.innerHTML = `
        <p style="color:var(--k-61635e);font-size:12px;line-height:1.5;margin-bottom:14px">Cómo ha cambiado lo que ves, ${evol.granularidad==='trimestre'?'trimestre a trimestre':'año a año'}, según cuándo marcaste cada título como visto.</p>
        <div style="display:flex;gap:10px;overflow-x:auto;padding-bottom:8px;scrollbar-width:none">
          ${evol.periodos.map(p=>`
            <div style="flex-shrink:0;width:150px;background:var(--k-fffefb);border:1px solid var(--k-dedfd8);border-radius:6px;padding:12px">
              <div style="font-size:12px;color:var(--k-9c2723);font-weight:700;margin-bottom:10px">${p.periodo}</div>
              ${p.top.map(g=>`
                <div style="margin-bottom:8px">
                  <div style="font-size:11px;color:var(--k-303330);margin-bottom:3px">${_escHtml(g.nombre)}</div>
                  <div class="stats-bar" style="height:6px;margin-bottom:0"><div class="stats-bar-fill" style="width:${Math.max(8,Math.round(g.n/p.top[0].n*100))}%"></div></div>
                </div>`).join('')}
              <div style="font-size:10px;color:var(--k-767973);margin-top:6px">${p.total} vistas</div>
            </div>`).join('')}
        </div>
        <div style="margin-top:20px;text-align:center">
          <span class="link-sutil" onclick="abrirEvolucionGusto(true)">🔄 Recalcular</span>
        </div>
        <p style="color:var(--k-767973);font-size:11px;margin-top:14px;line-height:1.5">Calculado con la fecha en la que marcaste cada título como visto y sus géneros de TMDB. Se guarda en este dispositivo.</p>
      `;
    }

    // ── MAPA DE TU CINE ─────────────────────────────────────────────────
    function _procesarGrafoDesdeDatos(vistos, paquetes){
      const nodos = [];
      const personaIndice = {};
      vistos.forEach((v,i)=>{
        const pak = paquetes[i];
        const d = pak?.detalle, cr = pak?.creditos;
        let personas = [];
        if(d){
          if(v.tipo==='movie'){
            const dir = (cr?.crew||[]).find(c=>c.job==='Director');
            if(dir) personas.push({id:'d'+dir.id, nombre:dir.name, rol:'Director'});
          } else {
            (d.created_by||[]).slice(0,2).forEach(c=>personas.push({id:'c'+c.id, nombre:c.name, rol:'Creador'}));
          }
          (cr?.cast||[]).slice(0,3).forEach(a=>personas.push({id:'a'+a.id, nombre:a.name, rol:'Actor'}));
        }
        const idx = nodos.length;
        nodos.push({
          idx, id:v.tmdb_id, tipo:v.tipo,
          titulo: v.titulo || d?.title || d?.name || 'Sin título',
          poster_path: v.poster_path || d?.poster_path || null,
          release_date: d?.release_date || d?.first_air_date || (v.anio?`${v.anio}-01-01`:null),
          vote_average: d?.vote_average ?? null,
          puntuacion: v.puntuacion
        });
        personas.forEach(p=>{
          if(!personaIndice[p.id]) personaIndice[p.id] = { nombre:p.nombre, rol:p.rol, idxs:[] };
          personaIndice[p.id].idxs.push(idx);
        });
      });
      const mapaEnlaces = {};
      Object.values(personaIndice).forEach(info=>{
        if(info.idxs.length<2) return;
        for(let a=0;a<info.idxs.length;a++){
          for(let b=a+1;b<info.idxs.length;b++){
            const i1=info.idxs[a], i2=info.idxs[b];
            const k = i1<i2?`${i1}-${i2}`:`${i2}-${i1}`;
            if(!mapaEnlaces[k]) mapaEnlaces[k] = { a:i1, b:i2, personas:[], peso:0 };
            mapaEnlaces[k].personas.push(`${info.nombre} (${info.rol})`);
            mapaEnlaces[k].peso += (info.rol==='Director'||info.rol==='Creador') ? 2 : 1;
          }
        }
      });
      return { total: vistos.length, nodos, enlaces: Object.values(mapaEnlaces), calculadoEn: new Date().toISOString() };
    }

    async function construirGrafoCine(forzar){
      if(!sesionActual) return null;
      const { data: vistos, error } = await sb.from('mi_biblioteca').select('tmdb_id,tipo,titulo,poster_path,anio,puntuacion')
        .eq('user_id', sesionActual.user.id).eq('visto', true);
      if(error) throw new Error('red');
      if(!vistos || vistos.length<3) return { insuficiente:true, total: vistos?vistos.length:0 };
      const key = `mapaCine_v1_${sesionActual.user.id}`;
      if(!forzar){
        try{
          const cache = JSON.parse(localStorage.getItem(key)||'null');
          if(cache && cache.total===vistos.length) return cache;
        }catch(e){}
      }
      const paquetes = await _fetchEnLotes(vistos, v=>_fetchDetalleYCreditos(v.tipo, v.tmdb_id));
      const grafo = _procesarGrafoDesdeDatos(vistos, paquetes);
      try{ localStorage.setItem(key, JSON.stringify(grafo)); }catch(e){}
      window.grafoCineActual = grafo;
      return grafo;
    }

    function _layoutFuerzas(nodos, enlaces, ancho, alto){
      const n = nodos.length;
      const iteraciones = n>150 ? 90 : 180;
      const pos = nodos.map(()=>({
        x: ancho/2 + (Math.random()-0.5)*ancho*0.6,
        y: alto/2 + (Math.random()-0.5)*alto*0.6,
        vx:0, vy:0
      }));
      const repulsion = 2200, rigidez = 0.02, longitudDeseada = 60, amortiguacion = 0.82;
      for(let it=0; it<iteraciones; it++){
        for(let i=0;i<n;i++){
          for(let j=i+1;j<n;j++){
            let dx = pos[i].x-pos[j].x, dy = pos[i].y-pos[j].y;
            let distSq = dx*dx+dy*dy || 0.01;
            let dist = Math.sqrt(distSq);
            let fuerza = repulsion/distSq;
            let fx = (dx/dist)*fuerza, fy=(dy/dist)*fuerza;
            pos[i].vx += fx; pos[i].vy += fy;
            pos[j].vx -= fx; pos[j].vy -= fy;
          }
        }
        enlaces.forEach(e=>{
          const A = pos[e.a], B = pos[e.b];
          let dx = B.x-A.x, dy = B.y-A.y;
          let dist = Math.sqrt(dx*dx+dy*dy) || 0.01;
          let f = rigidez*(dist-longitudDeseada);
          let fx = (dx/dist)*f, fy=(dy/dist)*f;
          A.vx += fx; A.vy += fy;
          B.vx -= fx; B.vy -= fy;
        });
        for(let i=0;i<n;i++){
          pos[i].vx += (ancho/2-pos[i].x)*0.0015;
          pos[i].vy += (alto/2-pos[i].y)*0.0015;
          pos[i].vx *= amortiguacion; pos[i].vy *= amortiguacion;
          pos[i].x += pos[i].vx; pos[i].y += pos[i].vy;
          pos[i].x = Math.max(16, Math.min(ancho-16, pos[i].x));
          pos[i].y = Math.max(16, Math.min(alto-16, pos[i].y));
        }
      }
      return pos;
    }

    function _dibujarMapaCine(){
      const st = window._mapaCineEstado; if(!st) return;
      const {ctx, canvas, nodos, enlaces, pos, grados, maxGrado, seleccionado} = st;
      ctx.clearRect(0,0,canvas.width,canvas.height);
      enlaces.forEach(e=>{
        const A = pos[e.a], B = pos[e.b];
        const activo = seleccionado!=null && (e.a===seleccionado || e.b===seleccionado);
        ctx.strokeStyle = activo ? 'rgba(181,44,41,0.85)' : 'rgba(181,44,41,0.14)';
        ctx.lineWidth = activo ? 2 : Math.min(2.4, 0.6+e.peso*0.25);
        ctx.beginPath(); ctx.moveTo(A.x,A.y); ctx.lineTo(B.x,B.y); ctx.stroke();
      });
      nodos.forEach((n,i)=>{
        const p = pos[i];
        const r = 4 + (grados[i]/maxGrado)*8;
        const esSel = seleccionado===i;
        const conectadoASel = seleccionado!=null && enlaces.some(e=>(e.a===seleccionado&&e.b===i)||(e.b===seleccionado&&e.a===i));
        ctx.globalAlpha = (seleccionado==null || esSel || conectadoASel) ? 1 : 0.22;
        ctx.beginPath(); ctx.arc(p.x,p.y,esSel?r+3:r,0,Math.PI*2);
        ctx.fillStyle = n.tipo==='movie' ? '#b52c29' : '#3d6651';
        ctx.fill();
        if(esSel){ ctx.lineWidth=2; ctx.strokeStyle='#202221'; ctx.stroke(); }
      });
      ctx.globalAlpha = 1;
    }

    function _actualizarPanelMapaCine(){
      const st = window._mapaCineEstado;
      const panel = document.getElementById('mapa-cine-panel');
      if(!st || st.seleccionado==null){ panel.style.display='none'; return; }
      const n = st.nodos[st.seleccionado];
      const conex = st.enlaces.filter(e=>e.a===st.seleccionado||e.b===st.seleccionado)
        .map(e=>e.personas).flat();
      panel.style.display='block';
      panel.innerHTML = `
        <div style="display:flex;gap:10px;align-items:center;margin-bottom:8px">
          <img src="${n.poster_path?'https://image.tmdb.org/t/p/w92'+n.poster_path:''}" style="width:40px;height:60px;border-radius:3px;object-fit:cover;background:var(--k-e9e7e0);flex-shrink:0">
          <div style="min-width:0">
            <div style="font-size:13px;font-weight:700;line-height:1.2">${_escHtml(n.titulo)}</div>
            <div style="font-size:11px;color:var(--k-6b6e68)">${n.release_date?n.release_date.substring(0,4):''} · ${n.tipo==='tv'?'Serie':'Película'}${n.puntuacion!=null?' · ★'+n.puntuacion:''}</div>
          </div>
        </div>
        ${conex.length?`<div style="font-size:11px;color:var(--k-61635e);line-height:1.5;max-height:70px;overflow-y:auto">Conectado por: ${_escHtml([...new Set(conex)].slice(0,6).join(', '))}</div>`:'<div style="font-size:11px;color:var(--k-6b6e68)">Sin conexiones directas.</div>'}
        <div class="cta-btn" style="margin-top:10px;padding:9px;font-size:13px" onclick="_abrirDetalleDesdeMapa(${st.seleccionado})">Ver ficha →</div>
      `;
    }

    async function _abrirDetalleDesdeMapa(idx){
      const n = window._mapaCineEstado.nodos[idx];
      await abrirDetalle({ id:n.id, _tipo:n.tipo, title:n.titulo, poster_path:n.poster_path, release_date:n.release_date, vote_average:n.vote_average });
    }

    function _clicMapaCine(evt){
      const st = window._mapaCineEstado; if(!st) return;
      const rect = st.canvas.getBoundingClientRect();
      const x = evt.clientX-rect.left, y = evt.clientY-rect.top;
      let mejor=-1, mejorD = 24*24;
      st.pos.forEach((p,i)=>{ const d=(p.x-x)**2+(p.y-y)**2; if(d<mejorD){ mejorD=d; mejor=i; } });
      st.seleccionado = mejor>=0?mejor:null;
      _dibujarMapaCine(); _actualizarPanelMapaCine();
    }

    async function abrirMapaCine(forzar){
      if(!sesionActual){ mostrarCuenta(); return; }
      irA('p-mapa-cine');
      const cont = document.getElementById('mapa-cine-cont');
      cont.innerHTML = '<span style="color:var(--k-767973);font-size:13px">Construyendo tu mapa...</span>';
      let grafo;
      try{ grafo = await construirGrafoCine(!!forzar); }
      catch(e){ cont.innerHTML = '<p style="color:#b3261e;font-size:13px">⚠️ No hemos podido construir tu mapa ahora mismo. Comprueba tu conexión e inténtalo de nuevo.</p>'; return; }
      if(!grafo || grafo.insuficiente){ cont.innerHTML = `<p style="color:var(--k-61635e);font-size:13px">Necesitas al menos 3 títulos vistos para generar un mapa${grafo&&grafo.total?` (tienes ${grafo.total})`:''}.</p>`; return; }
      let nodos = grafo.nodos, enlaces = grafo.enlaces;
      const conectados = new Set(); enlaces.forEach(e=>{conectados.add(e.a);conectados.add(e.b);});
      const aislados = nodos.length - conectados.size;
      if(conectados.size < nodos.length){
        const reindex = {}; const nuevosNodos = [];
        nodos.forEach((n,i)=>{ if(conectados.has(i)){ reindex[i]=nuevosNodos.length; nuevosNodos.push(n); } });
        enlaces = enlaces.map(e=>({...e, a:reindex[e.a], b:reindex[e.b]}));
        nodos = nuevosNodos;
      }
      let limitado = false;
      if(nodos.length>300){
        const grados0 = nodos.map((n,i)=>enlaces.reduce((s,e)=>s+((e.a===i||e.b===i)?1:0),0));
        const orden = nodos.map((n,i)=>i).sort((a,b)=>grados0[b]-grados0[a]).slice(0,300);
        const ordenSet = new Set(orden);
        const reindex = {}; const nuevosNodos = [];
        orden.forEach(i=>{ reindex[i]=nuevosNodos.length; nuevosNodos.push(nodos[i]); });
        enlaces = enlaces.filter(e=>ordenSet.has(e.a)&&ordenSet.has(e.b)).map(e=>({...e,a:reindex[e.a],b:reindex[e.b]}));
        nodos = nuevosNodos; limitado = true;
      }
      if(!nodos.length){
        cont.innerHTML = '<p style="color:var(--k-61635e);font-size:13px">Ninguno de tus títulos vistos comparte todavía director, creador o reparto principal con otro. Cuantos más títulos veas, más conexiones aparecerán.</p><div style="text-align:center;margin-top:14px"><span class="link-sutil" onclick="abrirMapaCine(true)">🔄 Reconstruir mapa</span></div>';
        return;
      }
      cont.innerHTML = `
        <p style="color:var(--k-61635e);font-size:12px;line-height:1.5;margin-bottom:14px">Cada punto es un título que has visto. Las líneas conectan títulos que comparten director, creador o reparto principal. Toca un punto para ver de qué se trata.</p>
        <div style="display:flex;gap:14px;margin-bottom:12px;font-size:11px;color:var(--k-61635e)">
          <span>🟣 Película</span><span>🟢 Serie</span>
        </div>
        <div style="position:relative">
          <canvas id="mapa-cine-canvas" style="width:100%;height:60vh;min-height:380px;border-radius:6px;background:var(--k-fffefb);border:1px solid var(--k-dedfd8);display:block"></canvas>
          <div id="mapa-cine-panel" style="display:none;position:absolute;left:12px;right:12px;bottom:12px;background:rgba(255,254,251,0.97);border:1px solid var(--k-dedfd8);border-radius:6px;padding:12px"></div>
        </div>
        <p style="color:var(--k-6b6e68);font-size:11px;margin-top:10px">${enlaces.length} conexión${enlaces.length!==1?'es':''} entre ${nodos.length} título${nodos.length!==1?'s':''}${aislados>0?` · ${aislados} sin conexión directa (no se muestran)`:''}${limitado?' · mostrando tus 300 títulos más conectados':''}.</p>
        <div style="text-align:center;margin-top:10px"><span class="link-sutil" onclick="abrirMapaCine(true)">🔄 Reconstruir mapa</span></div>
      `;
      const canvas = document.getElementById('mapa-cine-canvas');
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(300, Math.round(rect.width));
      canvas.height = Math.max(300, Math.round(rect.height));
      const pos = _layoutFuerzas(nodos, enlaces, canvas.width, canvas.height);
      const grados = nodos.map((n,i)=>enlaces.reduce((s,e)=>s+((e.a===i||e.b===i)?1:0),0));
      const maxGrado = Math.max(1,...grados);
      window._mapaCineEstado = { canvas, ctx: canvas.getContext('2d'), nodos, enlaces, pos, grados, maxGrado, seleccionado:null };
      _dibujarMapaCine();
      canvas.addEventListener('click', _clicMapaCine);
    }

    // ── SESIÓN DOBLE / MARATÓN ────────────────────────────────────────────
    async function generarSesionDoble(){
      const original = peliculaActual;
      if(!original) return;
      const overlay = document.getElementById('maraton-overlay');
      document.getElementById('maraton-motivo').textContent = 'Buscando una buena pareja...';
      document.getElementById('maraton-duracion').style.display = 'none';
      document.getElementById('maraton-posterA').src = original.poster_path?'https://image.tmdb.org/t/p/w300'+original.poster_path:'';
      document.getElementById('maraton-posterB').src = '';
      overlay.style.display = 'flex';

      let candidata=null, motivo='';
      const hoyISO = new Date().toISOString().slice(0,10), vistosSD = window.idsVistosSet || new Set();
      // vale si ya se ha estrenado y no la has visto; entre las 3 más populares se elige una al azar
      const elegirSD = (lista, tipo) => {
        const ok = lista.filter(m=>{ const f = m.release_date || m.first_air_date || ''; return f && f<=hoyISO && !vistosSD.has(`${m.id}-${tipo}`); });
        return ok.length ? ok[Math.floor(Math.random()*Math.min(3, ok.length))] : null;
      };
      try{
        if(original._tipo==='movie'){
          const credits = await (await fetch(`${TMDB_PROXY}?path=/movie/${original.id}/credits&language=es-ES`)).json();
          const director = (credits.crew||[]).find(c=>c.job==='Director');
          if(director){
            const pc = await (await fetch(`${TMDB_PROXY}?path=/person/${director.id}/movie_credits&language=es-ES`)).json();
            const opciones = (pc.crew||[]).filter(m=>m.job==='Director' && m.id!==original.id && m.poster_path).sort((a,b)=>(b.popularity||0)-(a.popularity||0));
            const x = elegirSD(opciones, 'movie');
            if(x){ candidata={...x,_tipo:'movie',title:x.title,release_date:x.release_date}; motivo=`Mismo director: ${director.name}`; }
          }
        }else{
          const det = await (await fetch(`${TMDB_PROXY}?path=/tv/${original.id}&language=es-ES`)).json();
          const creador = (det.created_by||[])[0];
          if(creador){
            const pc = await (await fetch(`${TMDB_PROXY}?path=/person/${creador.id}/tv_credits&language=es-ES`)).json();
            const opciones = [...(pc.crew||[]),...(pc.cast||[])].filter(t=>t.id!==original.id && t.poster_path).sort((a,b)=>(b.popularity||0)-(a.popularity||0));
            const x = elegirSD(opciones, 'tv');
            if(x){ candidata={...x,_tipo:'tv',title:x.name||x.title,release_date:x.first_air_date}; motivo=`Del mismo creador: ${creador.name}`; }
          }
        }
      }catch(e){}

      if(!candidata){
        try{
          const rec = await (await fetch(`${TMDB_PROXY}?path=/${original._tipo}/${original.id}/recommendations&language=es-ES`)).json();
          const opciones=(rec.results||[]).filter(x=>x.poster_path).sort((a,b)=>(b.vote_average||0)-(a.vote_average||0));
          const x=elegirSD(opciones, original._tipo);
          if(x){
            candidata={...x,_tipo:original._tipo,title:x.title||x.name,release_date:x.release_date||x.first_air_date};
            motivo='Comparten estilo y género';
          }
        }catch(e){}
      }

      if(!candidata){
        document.getElementById('maraton-motivo').textContent='No hemos encontrado una buena pareja esta vez. ¡Prueba con otro título!';
        return;
      }
      window.maratonCandidata = candidata;
      document.getElementById('maraton-posterB').src = candidata.poster_path?'https://image.tmdb.org/t/p/w300'+candidata.poster_path:'';
      document.getElementById('maraton-motivo').textContent = motivo;

      if(original._tipo==='movie' && candidata._tipo==='movie'){
        try{
          const [da,db] = await Promise.all([
            fetch(`${TMDB_PROXY}?path=/movie/${original.id}&language=es-ES`).then(r=>r.json()),
            fetch(`${TMDB_PROXY}?path=/movie/${candidata.id}&language=es-ES`).then(r=>r.json())
          ]);
          const total = (da.runtime||0)+(db.runtime||0);
          if(total>0){
            const h=Math.floor(total/60), m=total%60;
            const el=document.getElementById('maraton-duracion');
            el.textContent = `⏱ ${h}h ${m}min en total`;
            el.style.display='inline-block';
          }
        }catch(e){}
      }
    }
    function abrirSegundaDesdeMaraton(){
      if(!window.maratonCandidata) return;
      document.getElementById('maraton-overlay').style.display='none';
      abrirDetalle(window.maratonCandidata);
    }
    function cerrarMaraton(){ document.getElementById('maraton-overlay').style.display='none'; }

    // ── PROPINA (☕ Invítame a algo) ──────────────────────────────────────
    let propinaMonto = 3;
    function abrirPropina(){ document.getElementById('propina-overlay').style.display='flex'; }
    function cerrarPropina(){ document.getElementById('propina-overlay').style.display='none'; }
    function seleccionarPropinaMonto(m){
      propinaMonto = m;
      document.querySelectorAll('#propina-chips .punt-chip').forEach(el=>el.classList.toggle('active', el.dataset.monto===String(m)));
      const input = document.getElementById('propina-custom');
      if(m==='otra'){ input.style.display='block'; input.focus(); }
      else { input.style.display='none'; }
    }
    function pagarPropina(metodo){
      let monto = propinaMonto;
      if(monto==='otra'){
        const val = parseFloat(document.getElementById('propina-custom').value);
        if(!val || val<=0){ document.getElementById('propina-custom').focus(); return; }
        monto = val;
      }
      const url = metodo==='paypal'
        ? `https://paypal.me/AlfredFD/${monto}EUR`
        : `https://revolut.me/alfred7t6q/${monto}EUR`;
      window.open(url, '_blank');
    }

    async function _abrirEnlaceDirecto(){
      const params = new URLSearchParams(location.search);
      // Accesos directos del icono de la app (manifest.json → shortcuts)
      const accion = params.get('accion');
      if(accion){
        history.replaceState(history.state, '', location.pathname);
        if(accion==='sorpresa') sorprendeme();
        else if(accion==='trailers') abrirFeedTrailers();
        else if(accion==='lista') tabIr('milista');
        else if(accion==='cines') abrirEspecial('cines-es');
        else if(accion==='descargas') abrirMisDescargas();
        return;
      }
      const id = params.get('id');
      const tipo = params.get('tipo');
      if(!id || (tipo!=='movie' && tipo!=='tv')) return;
      history.replaceState(history.state, '', location.pathname); // limpiamos la URL para no reabrir esto si se recarga después
      try{
        const d = await fetch(`${TMDB_PROXY}?path=/${tipo}/${id}&language=es-ES`).then(r=>r.json());
        if(!d || d.success===false) return;
        await abrirDetalle({
          id: Number(id), _tipo: tipo,
          title: d.title||d.name, poster_path: d.poster_path,
          release_date: d.release_date||d.first_air_date, vote_average: d.vote_average
        });
      }catch(e){ /* si falla, la app arranca en Inicio como siempre */ }
    }

    // ── Modo claro / oscuro: se cambia con el botón y se recuerda en este dispositivo ──
    function _temaOscuro(){ return document.documentElement.dataset.theme==='dark'; }
    function _pintarBotonTema(){
      document.querySelectorAll('.btn-tema').forEach(b=>{ b.textContent = _temaOscuro() ? '☀️' : '🌙'; b.title = _temaOscuro() ? 'Pasar a modo claro' : 'Pasar a modo oscuro'; });
      const meta = document.querySelector('meta[name="theme-color"]');
      if(meta && !window.acentoDetalleActual) meta.setAttribute('content', _temaOscuro() ? '#121413' : '#f5f3ef');
    }
    // Color de acento de la app (se guarda en este dispositivo y se aplica antes de pintar, en el <head>)
    const ACENTOS = [['rojo','Rojo cine','#b52c29','181,44,41','#9c2723','#e4675f'],['azul','Azul','#2f6fd6','47,111,214','#2558ad','#7aa7f0'],['verde','Verde','#2e8a57','46,138,87','#23704a','#6cc495'],
      ['morado','Morado','#7a4fd0','122,79,208','#6340ad','#a98be8'],['naranja','Naranja','#d4691c','212,105,28','#b05512','#f0a066'],['rosa','Rosa','#cf3f7a','207,63,122','#ab3063','#ec82ac'],['dorado','Dorado','#b08a2e','176,138,46','#8f6f22','#d9b763']];
    function _acentoActual(){ try{ return (JSON.parse(localStorage.getItem('cm:acento')||'null')||{}).k || 'rojo'; }catch(e){ return 'rojo'; } }
    function ponerAcento(k){
      const a = ACENTOS.find(x=>x[0]===k) || ACENTOS[0], r = document.documentElement;
      r.style.setProperty('--acento', a[2]); r.style.setProperty('--acento-rgb', a[3]); r.style.setProperty('--acento-osc', a[4]); r.style.setProperty('--acento-claro', a[5]);
      if(k==='rojo'){ delete r.dataset.acento; try{ localStorage.removeItem('cm:acento'); }catch(e){} }
      else{ r.dataset.acento = k; try{ localStorage.setItem('cm:acento', JSON.stringify({k, c:a[2], rgb:a[3], o:a[4], l:a[5]})); }catch(e){} }
      _pintarApariencia();
    }
    function ponerOled(on){
      const r = document.documentElement;
      if(on) r.dataset.oled = '1'; else delete r.dataset.oled;
      try{ localStorage.setItem('cm:oled', on ? '1' : '0'); }catch(e){}
      const m = document.querySelector('meta[name="theme-color"]'); if(m && _temaOscuro()) m.setAttribute('content', on ? '#000000' : '#121413');
    }
    function _pintarApariencia(){
      const el = document.getElementById('ap-colores'); if(!el) return;
      const act = _acentoActual();
      el.innerHTML = ACENTOS.map(([k,n,c])=>`<button type="button" class="ap-color${k===act?' activo':''}" style="--c:${c}" onclick="ponerAcento('${k}')" aria-label="${n}" title="${n}"><span></span></button>`).join('');
      const o = document.getElementById('ap-oled'); if(o) o.checked = document.documentElement.dataset.oled==='1';
    }
    function alternarTema(){
      const oscuro = !_temaOscuro();
      document.documentElement.dataset.theme = oscuro ? 'dark' : 'light';
      try{ localStorage.setItem('cm:tema', oscuro ? 'oscuro' : 'claro'); }catch(e){}
      _pintarBotonTema();
    }

    let _parallaxTicking = false;
    function _actualizarParallaxHero(){
      _parallaxTicking = false;
      const el = document.getElementById('d-hero-backdrop');
      if(!el || !document.getElementById('p-detalle').classList.contains('activa')) return;
      const y = Math.min(window.scrollY, 400);
      el.style.transform = `translateY(${y*0.3}px)`;
    }
