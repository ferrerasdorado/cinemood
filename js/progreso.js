// CineMood · «Seguir viendo» compartido entre aparatos
// (Se carga como script clásico: todo comparte el mismo ámbito global.)
//
// Por dónde vas en cada película o capítulo se guarda también en tu cuenta (tabla mi_progreso, supabase/progreso.sql):
// empiezas en la tele, sigues en el móvil en el mismo minuto, y al revés. Si la tabla aún no existe,
// el reproductor sigue funcionando como siempre, recordando solo en este aparato.

    let _progSinTabla = false, _progUltimaSubida = {};
    const _progClave = ctx => ctx.tipo==='tv' ? `tv-${ctx.tmdbId}-${ctx.season}-${ctx.episode}` : `movie-${ctx.tmdbId}`;
    const _progEsFaltaTabla = e => e && (e.code==='42P01' || e.code==='PGRST205' || /mi_progreso/.test(String(e.message||'')));

    // Se sube como mucho cada 30 s (y siempre al pausar o cerrar)
    async function progresoSubir(ctx, pos, dur, forzar){
      if(_progSinTabla || !sesionActual || !ctx || !(pos>5)) return;
      const k = _progClave(ctx), ahora = Date.now();
      if(!forzar && ahora - (_progUltimaSubida[k]||0) < 30000) return;
      _progUltimaSubida[k] = ahora;
      const p = (typeof peliculaActual!=='undefined' && peliculaActual && peliculaActual.id===ctx.tmdbId) ? peliculaActual : {};
      const {error} = await sb.from('mi_progreso').upsert({
        user_id: sesionActual.user.id, clave: k, tmdb_id: ctx.tmdbId, tipo: ctx.tipo,
        temporada: ctx.tipo==='tv' ? ctx.season : null, episodio: ctx.tipo==='tv' ? ctx.episode : null,
        titulo: String(p.title||p.name||ctx.titulo||'').slice(0,300), poster: String(p.poster_path||'').slice(0,200), fondo: String(p.backdrop_path||'').slice(0,200),
        pos_seg: Math.floor(pos), dur_seg: isFinite(dur) ? Math.floor(dur) : 0, actualizado: new Date().toISOString()
      }, {onConflict:'user_id,clave'});
      if(_progEsFaltaTabla(error)) _progSinTabla = true;
    }

    // Terminado: fuera de «Seguir viendo» (en series, también los capítulos anteriores que quedaran a medias)
    async function progresoTerminado(ctx){
      if(_progSinTabla || !sesionActual || !ctx) return;
      let q = sb.from('mi_progreso').delete().eq('user_id', sesionActual.user.id).eq('tmdb_id', ctx.tmdbId).eq('tipo', ctx.tipo);
      if(ctx.tipo==='tv') q = q.or(`temporada.lt.${ctx.season},and(temporada.eq.${ctx.season},episodio.lte.${ctx.episode})`);
      const {error} = await q; if(_progEsFaltaTabla(error)) _progSinTabla = true;
      cargarSeguirViendo();
    }

    // Antes de reproducir: si en otro aparato llegaste más lejos, se sigue desde ahí (espera como mucho 1,2 s)
    async function progresoTraerPos(ctx, claveLocal){
      if(_progSinTabla || !sesionActual) return;
      try{
        const r = await Promise.race([
          sb.from('mi_progreso').select('pos_seg,dur_seg').eq('user_id', sesionActual.user.id).eq('clave', _progClave(ctx)).maybeSingle(),
          new Promise(res=>setTimeout(()=>res(null), 1200))]);
        if(!r) return;
        if(_progEsFaltaTabla(r.error)){ _progSinTabla = true; return; }
        const local = parseFloat(localStorage.getItem(claveLocal)||'0') || 0;
        if(r.data && r.data.pos_seg > local + 5) localStorage.setItem(claveLocal, String(r.data.pos_seg));
      }catch(e){}
    }

    async function quitarSeguirViendo(clave, ev){
      if(ev) ev.stopPropagation();
      if(!sesionActual) return;
      await sb.from('mi_progreso').delete().eq('user_id', sesionActual.user.id).eq('clave', clave);
      cargarSeguirViendo();
    }

    // Fila «Seguir viendo» de Inicio, con la barra de progreso y lo que queda
    async function cargarSeguirViendo(){
      const wrap = document.getElementById('seguir-viendo-wrap'); if(!wrap) return;
      if(!sesionActual || _progSinTabla){ wrap.style.display='none'; return; }
      const {data, error} = await sb.from('mi_progreso').select('*').eq('user_id', sesionActual.user.id).order('actualizado', {ascending:false}).limit(40);
      if(_progEsFaltaTabla(error)){ _progSinTabla = true; wrap.style.display='none'; return; }
      if(error || !data){ wrap.style.display='none'; return; }
      const vistos = new Set(), filas = data.filter(r=>{ const k = r.tipo+'-'+r.tmdb_id; if(vistos.has(k) || !(r.pos_seg>5)) return false; vistos.add(k); return true; }).slice(0,15);
      if(!filas.length){ wrap.style.display='none'; return; }
      window._seguirViendo = filas;
      const quedan = r => r.dur_seg>0 ? Math.max(1, Math.round((r.dur_seg-r.pos_seg)/60)) : null;
      const img = r => r.fondo ? 'https://image.tmdb.org/t/p/w500'+r.fondo : r.poster ? 'https://image.tmdb.org/t/p/w342'+r.poster : '';
      document.getElementById('seguir-viendo-scroll').replaceChildren(...filas.map((r,i)=>{
        const pct = r.dur_seg>0 ? Math.min(100, Math.max(2, r.pos_seg/r.dur_seg*100)) : 5;
        const sub = [r.tipo==='tv' ? `T${r.temporada} · E${r.episodio}` : 'Película', quedan(r) ? `quedan ${quedan(r)} min` : ''].filter(Boolean).join(' · ');
        return _fEl('div',{class:'sv-card',role:'button',tabindex:'0',onclick:()=>abrirDesdeSeguirViendo(i),'aria-label':`Seguir viendo ${r.titulo||''}, ${sub}`},
          _fEl('div',{class:'sv-img'}, img(r) ? _fEl('img',{loading:'lazy',src:img(r),alt:''}) : null,
            _fEl('div',{class:'sv-barra'}, _fEl('i',{style:`width:${pct}%`})),
            _fEl('button',{type:'button',class:'sv-quitar','aria-label':'Quitar de Seguir viendo',onclick:e=>quitarSeguirViendo(r.clave, e)},'✕')),
          _fEl('div',{class:'similar-titulo',text:r.titulo||''}),
          _fEl('div',{class:'similar-meta',text:sub}));
      }));
      wrap.style.display = 'block';
    }
    async function abrirDesdeSeguirViendo(i){
      const r = (window._seguirViendo||[])[i]; if(!r) return;
      try{
        const d = await (await fetch(`${TMDB_PROXY}?path=/${r.tipo}/${r.tmdb_id}&language=es-ES`)).json();
        await abrirDetalle({...d, title: d.title||d.name, release_date: d.release_date||d.first_air_date, _tipo: r.tipo});
      }catch(e){}
    }
