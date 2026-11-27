// CineMood · Arranque de la app
// (Parte de index.html; se carga como script clásico: todo comparte el mismo ámbito global.)
// Aquí solo está lo que se ejecuta al cargar, en el mismo orden que antes.
// Las funciones y datos están en los demás archivos de js/, que se cargan antes que este.

    const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    const _cmFetchOriginal = window.fetch.bind(window);
    const _cmProxyURL = new URL(TMDB_PROXY);
    // TMDB no traduce al español algunos géneros de series: se traducen aquí, en un único sitio,
    // y solo en el campo "name" de esos géneros (nunca en títulos ni sinopsis)
    const _CM_GENEROS_ES = {10759:'Acción y aventura',10762:'Infantil',10763:'Noticias',10764:'Reality',10765:'Ciencia ficción y fantasía',10766:'Telenovela',10767:'Entrevistas',10768:'Bélica y política'};
    const _CM_RE_GENEROS = /"id":(1076[2-8]|10759),"name":"[^"]*"/g;
    async function _cmTraducirGeneros(r){
      if(!r.ok || !/json/.test(r.headers.get('content-type')||'')) return r;
      const txt = await r.clone().text();
      if(!_CM_RE_GENEROS.test(txt)) return r;
      _CM_RE_GENEROS.lastIndex = 0;
      return new Response(txt.replace(_CM_RE_GENEROS, (_, id)=>'"id":'+id+',"name":"'+_CM_GENEROS_ES[id]+'"'), {status:r.status, statusText:r.statusText, headers:r.headers});
    }
    // Solo intercepta nuestro catálogo. No altera peticiones a addons, AllDebrid o VLC.
    window.fetch = async function(input, init){
      const destino = new URL(input instanceof Request ? input.url : String(input), location.href);
      if(destino.origin !== _cmProxyURL.origin || destino.pathname !== _cmProxyURL.pathname){
        return _cmFetchOriginal(input, init);
      }
      const { data, error } = await sb.auth.getSession();
      const session = data && data.session;
      if(error || !session?.access_token || !(await _cmPermitido(session.user?.id))){
        throw new Error('Debes iniciar sesión con una cuenta autorizada para consultar el catálogo.');
      }
      const headers = new Headers(input instanceof Request ? input.headers : undefined);
      new Headers(init?.headers).forEach((value,key)=>headers.set(key,value));
      headers.set('Authorization','Bearer '+session.access_token);
      headers.set('apikey',SUPABASE_KEY);
      // Si el servidor corta por exceso de peticiones (429) o falla un momento (5xx / sin red), espera y reintenta:
      // en el móvil, al abrir listas largas, algunas peticiones fallaban y la ficha se quedaba vacía.
      for(let intento=0;;intento++){
        try{
          const r = await _cmFetchOriginal(input,{...init,headers,cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',redirect:'error'});
          if((r.status===429 || r.status>=500) && intento<3){ await new Promise(res=>setTimeout(res, 700*2**intento + Math.random()*300)); continue; }
          return _cmTraducirGeneros(r);
        }catch(e){
          if(intento>=3 || init?.signal?.aborted) throw e;
          await new Promise(res=>setTimeout(res, 700*2**intento + Math.random()*300));
        }
      }
    };
    // Año en curso: límite superior de las búsquedas y del selector de años
    const ANIO_ACTUAL = new Date().getFullYear();
    ['year-desde','year-hasta'].forEach(id=>{ document.getElementById(id).max = ANIO_ACTUAL; });
    document.getElementById('year-hasta').value = ANIO_ACTUAL;
    document.getElementById('val-hasta').textContent = ANIO_ACTUAL;
    document.querySelectorAll('.year-row .year-label:last-child').forEach(el=>{ el.textContent = ANIO_ACTUAL; });
    window.addEventListener('scroll', ()=>{ if(_cabRaf) return; _cabRaf = requestAnimationFrame(()=>{ _cabRaf = null; _actualizarCabeceraFija(); }); }, {passive:true});
    window.addEventListener('resize', _medirCabeceras);
    window.addEventListener('load', ()=>{ _medirCabeceras(); _actualizarCabeceraFija(); });
    _medirCabeceras();

    // Recuerda la posición de scroll de cada pantalla; al volver con "Atrás" (restaurar=true) se recupera
    window.__posPantalla = {};
    // La pantalla inicial no pasa por irA: marcar su pestaña al arrancar
    requestAnimationFrame(()=>{ const a = document.querySelector('.pantalla.activa'); if(a) _tabActualizar(a.id); });
    // ══ NAVEGACIÓN HACIA ATRÁS: cada pantalla queda en el historial del navegador, así funcionan el deslizar
    //    de Safari, el botón atrás de Android y el del navegador. Con la app instalada en el iPhone, iOS no trae
    //    ese gesto, así que se añade uno propio desde el borde izquierdo (más abajo) ══
    window._nav = window._nav || {i:0, pila:[{p:'p-inicio', f:''}]};
    window._fichasHist = window._fichasHist || {};
    try{ history.replaceState({cm:1, p:'p-inicio', f:'', i:0}, ''); }catch(e){}
    // la posición de cada pantalla la recuerda la app (__posPantalla); si la restaura también el navegador, la pisa
    try{ if('scrollRestoration' in history) history.scrollRestoration = 'manual'; }catch(e){}
    window._cmCerrarCapaOAtras = function(){
      const ae = document.activeElement;
      if(ae && /^(INPUT|TEXTAREA)$/.test(ae.tagName) && !/^(button|checkbox|radio|range)$/.test(ae.type||'')){ ae.blur(); return true; }
      const capa = _navCapaAbierta();
      if(capa){ capa.cerrar(); return true; }
      if(window._nav && window._nav.i > 0){ history.back(); return true; }
      return false;
    };
    window.addEventListener('popstate', e=>{
      const pend = window._navPend;
      if(pend && e.state && e.state.cm){
        window._navPend = null;
        const n = _navEstado(); n.i = e.state.i; n.pila.length = n.i+1;
        if(!(n.i===0 && pend.p==='p-inicio')){ n.pila[n.i] = {p:pend.p, f:''}; try{ history.replaceState({cm:1, p:pend.p, f:'', i:n.i}, ''); }catch(err){} }
        window._animForzada = 'anim-fundido';
        irA(pend.p, true, true);
        return;
      }
      const capa = _navCapaAbierta(), n = window._nav;
      if(capa){ capa.cerrar(); const cur = n.pila[n.i]; try{ history.pushState({cm:1, p:cur.p, f:cur.f, i:n.i}, ''); }catch(err){} return; }
      const st = e.state; if(!st || !st.cm) return;
      n.i = Math.min(st.i, n.pila.length-1);
      if(st.p==='p-detalle' && st.f && st.f!==_claveFicha() && window._fichasHist[st.f]) abrirDetalle(window._fichasHist[st.f], true);
      else if(st.p==='p-persona' && st.f && st.f!==_navClave('p-persona') && window._fichasHist[st.f]){ const a = window._fichasHist[st.f]; mostrarFilmografia(a.id, a.nombre, a.foto, a.rol, true); }
      else irA(st.p, true, true);
      document.querySelectorAll('.pantalla').forEach(x=>{ x.style.transform=''; x.style.boxShadow=''; x.style.transition=''; });
    });
    // Gesto desde el borde izquierdo (solo con la app instalada: en Safari ya lo hace el propio navegador)
    (function(){
      const instalada = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone===true;
      if(!instalada) return;
      let x0=0, y0=0, dx=0, t0=0, activo=false, decidido=false, el=null, capa=null;
      const limpiar = e2 => { if(!e2) return; e2.style.transition=''; e2.style.transform=''; e2.style.boxShadow=''; e2.style.willChange=''; };
      document.addEventListener('touchstart', e=>{
        if(e.touches.length!==1) return;
        const t = e.touches[0]; if(t.clientX>24) return;
        capa = _navCapaAbierta();
        if(!capa && window._nav.i<=0) return;
        el = capa ? capa.el : document.querySelector('.pantalla.activa'); if(!el) return;
        activo = true; decidido = false; x0 = t.clientX; y0 = t.clientY; dx = 0; t0 = Date.now();
      }, {passive:true});
      document.addEventListener('touchmove', e=>{
        if(!activo) return;
        const t = e.touches[0], mx = t.clientX-x0, my = t.clientY-y0;
        if(!decidido){
          if(Math.abs(mx)<8 && Math.abs(my)<8) return;
          if(Math.abs(my)>Math.abs(mx) || mx<0){ activo = false; return; } // era un desplazamiento vertical
          decidido = true; el.style.transition = 'none'; el.style.willChange = 'transform';
        }
        e.preventDefault();
        dx = Math.max(0, mx);
        el.style.transform = `translateX(${dx}px)`; el.style.boxShadow = '-10px 0 30px rgba(0,0,0,0.18)';
      }, {passive:false});
      const fin = ()=>{
        if(!activo) return; activo = false;
        if(!decidido || !el) return;
        const rapido = dx/Math.max(1, Date.now()-t0) > 0.5 && dx>40, volver = dx>innerWidth*0.33 || rapido, e2 = el;
        e2.style.transition = 'transform 0.2s ease-out';
        e2.style.transform = volver ? `translateX(${innerWidth}px)` : 'translateX(0)';
        setTimeout(()=>{
          if(!volver){ limpiar(e2); return; }
          if(capa){ capa.cerrar(); limpiar(e2); }
          else{ window._sinAnim = true; history.back(); setTimeout(()=>limpiar(e2), 400); }
        }, 200);
      };
      document.addEventListener('touchend', fin, {passive:true});
      document.addEventListener('touchcancel', fin, {passive:true});
    })();
    window._descCache = window._descCache || {};
    window._descF = window._descF || {ep:'', nota:''};
    window._descExtra = window._descExtra || {};
    window._simFiltros = window._simFiltros || new Set();
    window._simProv = window._simProv || new Map();

    // ── TRÁILERS: en español o, si no hay, en inglés con los subtítulos activados ──
    // Se reproducen embebidos (youtube-nocookie /embed). YouTube exige saber desde qué web se pide el vídeo:
    // sin esa información (p. ej. abriendo el .html como archivo local) muestra el «Error 153».
    window._trailerCache = window._trailerCache || {};
    window.addEventListener('message', e=>{
      if(!/youtube(-nocookie)?\.com$/.test(String(e.origin||'').replace(/^https?:\/\//,''))) return;
      let d; try{ d = typeof e.data==='string' ? JSON.parse(e.data) : e.data; }catch(err){ return; }
      if(!d || d.event!=='onError') return;
      const f = [...document.querySelectorAll('iframe[data-yt]')].find(x=>x.contentWindow===e.source); if(!f) return;
      f.outerHTML = _ytAlternativa(f.dataset.yt, 'Este vídeo no se puede reproducir dentro de la app');
    });
    window._omdbCache = window._omdbCache || {};

    // ── DÓNDE VERLA en España: suscripción (incluida), alquiler y compra, con todas las plataformas que da TMDB ──
    // ── ¿DE QUÉ ME SUENA? Bajo cada actor del reparto, en qué títulos que ya has visto aparece ──
    window._suenaCache = window._suenaCache || {};
    const ESPECIALES = [
      {id:'ucm',categoria:'saga',emoji:'🦸',titulo:'Universo Marvel (UCM)',sub:'65 títulos · orden cronológico',
       icono:'📍',color:'#E62429',colorBg:'#2a1113',colorSoft:'#ff8a8f',
       bannerTitulo:'Universo <span>Marvel</span> — orden cronológico',
       bannerSub:'Los 65 títulos del UCM ordenados por línea temporal interna, no por fecha de estreno. Ideal para verlo todo desde cero sin spoilers.',
       items:MARVEL_UCM},
      {id:'oscars',categoria:'genero',emoji:'🏆',titulo:'Óscar a Mejor Película',sub:'1980–2026 · un ganador por año',
       icono:'🏆',color:'#D4AF37',colorBg:'#2a2510',colorSoft:'#f0d878',
       bannerTitulo:'Óscar a <span>Mejor Película</span> — 1980-2026',
       bannerSub:'La ganadora de cada gala, año a año, desde los Óscar de 1980 (por "Kramer contra Kramer") hasta los de 2026 (por "Una batalla tras otra"). El año indica el de la ceremonia, no siempre el del estreno.',
       items:OSCARS_MEJOR_PELICULA},
      {id:'bond',categoria:'saga',emoji:'🕶️',titulo:'James Bond · 007',sub:'25 películas · orden de estreno',
       icono:'🎬',color:'#C9A227',colorBg:'#221d0f',colorSoft:'#e6c869',
       bannerTitulo:'<span>James Bond</span> · saga 007',
       bannerSub:'Las 25 películas oficiales de Eon Productions en orden de estreno, de "Agente 007 contra el Dr. No" (1962) a "Sin tiempo para morir" (2021). No incluye versiones no oficiales como "Nunca digas nunca jamás".',
       items:BOND_007},
      {id:'dc',categoria:'saga',emoji:'🦇',titulo:'Universo DC',sub:'DCEU + nuevo DCU · orden cronológico',
       icono:'📍',color:'#0476F2',colorBg:'#0d1b2a',colorSoft:'#8ec4ff',
       bannerTitulo:'Universo <span>DC</span> — orden cronológico',
       bannerSub:'El DCEU clásico (2013-2023) por línea temporal interna, seguido del nuevo DCU que arrancó James Gunn desde 2024. No incluye películas de DC fuera de estos universos compartidos (Nolan, Joker, The Batman de Reeves...), igual que en Marvel dejamos fuera X-Men.',
       items:DC_UNIVERSO},
      {id:'tarantino',categoria:'director',emoji:'🎥',titulo:'Quentin Tarantino',sub:'10 películas · filmografía completa',
       icono:'🎬',color:'#E8272A',colorBg:'#2a0e0f',colorSoft:'#ff9a9c',
       bannerTitulo:'<span>Tarantino</span> — filmografía completa',
       bannerSub:'Las 10 películas de Quentin Tarantino en orden de estreno, desde el debut de "Reservoir Dogs" (1992) hasta "Érase una vez en... Hollywood" (2019).',
       items:TARANTINO},
      {id:'coen',categoria:'director',emoji:'🎩',titulo:'Hermanos Coen',sub:'15 películas · filmografía completa',
       icono:'🎬',color:'#7B68EE',colorBg:'#16132a',colorSoft:'#b8b0ff',
       bannerTitulo:'<span>Hermanos Coen</span> — filmografía completa',
       bannerSub:'Las 15 películas de Joel y Ethan Coen en orden de estreno, de "Sangre fácil" (1984) a "La balada de Buster Scruggs" (2018). Noir, comedia negra y western como nadie.',
       items:COEN},
      {id:'nolan',categoria:'director',emoji:'⏳',titulo:'Christopher Nolan',sub:'13 películas · filmografía completa',
       icono:'🎬',color:'#00BFFF',colorBg:'#001a2a',colorSoft:'#80dfff',
       bannerTitulo:'<span>Christopher Nolan</span> — filmografía completa',
       bannerSub:'Las 13 películas de Christopher Nolan en orden de estreno, de "Following" (1998) a "La Odisea" (2025). El director que reinventó el blockbuster de autor.',
       items:NOLAN},
      {id:'terror',categoria:'genero',emoji:'👻',titulo:'Pelis de miedo',sub:'25 títulos · terror imprescindible',
       icono:'🩸',color:'#8B0000',colorBg:'#2a0d0d',colorSoft:'#ff9b9b',
       bannerTitulo:'<span>Pelis de miedo</span> imprescindibles',
       bannerSub:'Del terror clásico al moderno: 15 películas que todo aficionado al género debería haber visto al menos una vez, a poder ser de noche.',
       items:TERROR},
      {id:'thriller-psicologico',categoria:'genero',emoji:'🧠',titulo:'Thrillers psicológicos',sub:'25 títulos · mentes al límite',
       icono:'🧩',color:'#6B5B95',colorBg:'#1c1830',colorSoft:'#c9bff0',
       bannerTitulo:'<span>Thrillers</span> psicológicos',
       bannerSub:'Manipulación, identidad y narradores en los que no puedes confiar del todo. Para ver con la mente despierta.',
       items:THRILLER_PSICOLOGICO},
      {id:'thriller-accion',categoria:'genero',emoji:'💥',titulo:'Thrillers de acción',sub:'25 títulos · pulso y adrenalina',
       icono:'🔫',color:'#FF6B35',colorBg:'#2a1508',colorSoft:'#ffb088',
       bannerTitulo:'<span>Thrillers</span> de acción',
       bannerSub:'Persecuciones, atracos y venganzas: doce películas que no te van a dejar respirar.',
       items:THRILLER_ACCION},
      {id:'giros-guion',categoria:'genero',emoji:'🔀',titulo:'Giros de guión imposibles',sub:'18 títulos · nada es lo que parece',
       icono:'🔀',color:'#17A398',colorBg:'#0a1f1d',colorSoft:'#7fe0d4',
       bannerTitulo:'<span>Giros de guión</span> imposibles',
       bannerSub:'Películas con un final o un punto de inflexión que te obliga a replantearte todo lo que acabas de ver. Ojo con los "por qué verla aquí": algunos avisan del giro sin desvelarlo del todo.',
       items:GIROS_GUION},
      {id:'para-pareja',categoria:'genero',emoji:'💕',titulo:'Para ver en pareja',sub:'24 títulos · noche de sofá a dos',
       icono:'💕',color:'#E85D9C',colorBg:'#2a0f1d',colorSoft:'#ffb3d9',
       bannerTitulo:'<span>Para ver</span> en pareja',
       bannerSub:'Comedia, romance y algún drama con corazón: doce películas pensadas para gustar a los dos por igual.',
       items:PARA_PAREJA},
      {id:'clasicos-siempre',categoria:'genero',emoji:'🎞️',titulo:'Clásicos de siempre',sub:'25 títulos · el canon del cine',
       icono:'🎞️',color:'#B8860B',colorBg:'#241d0a',colorSoft:'#e8cf7a',
       bannerTitulo:'<span>Clásicos</span> de siempre',
       bannerSub:'El canon que todo cinéfilo debería ver al menos una vez: de "Ciudadano Kane" a "El padrino", pasando por Hitchcock y Kubrick.',
       items:CLASICOS_SIEMPRE},
      {id:'joyas-ocultas',categoria:'genero',emoji:'💎',titulo:'Joyas ocultas',sub:'18 títulos · infravaloradas',
       icono:'💎',color:'#2E8B57',colorBg:'#0d2018',colorSoft:'#8fd6ae',
       bannerTitulo:'<span>Joyas ocultas</span> del cine',
       bannerSub:'Grandes películas que mucha gente todavía no ha descubierto — con dos españolas de las buenas incluidas.',
       items:JOYAS_OCULTAS},
      {id:'cine-culto',categoria:'genero',emoji:'📼',titulo:'Cine de culto',sub:'21 títulos · las que hay que conocer',
       icono:'🎭',color:'#5FBF3D',colorBg:'#10200a',colorSoft:'#a8e88a',
       bannerTitulo:'<span>Cine de culto</span>',
       bannerSub:'Las películas que, más allá de la taquilla, se han convertido en referencia obligada — con permiso de Tarantino, que aparece más de una vez.',
       items:CINE_CULTO},
      {id:'star-wars',categoria:'saga',emoji:'🌌',titulo:'Star Wars',sub:'20 títulos · orden cronológico',
       icono:'⭐',color:'#F4C430',colorBg:'#2a2508',colorSoft:'#ffe98a',
       bannerTitulo:'<span>Star Wars</span> — orden cronológico',
       bannerSub:'Películas y series en orden de línea temporal galáctica, de "La amenaza fantasma" a "El ascenso de Skywalker". Un catálogo cerrado, como Marvel o Bond.',
       items:STAR_WARS},
      {id:'series-imprescindibles',categoria:'genero',emoji:'📺',titulo:'Series imprescindibles',sub:'20 títulos · lo mejor de la TV',
       icono:'📺',color:'#00C2CB',colorBg:'#08262a',colorSoft:'#8ff0f5',
       bannerTitulo:'<span>Series</span> imprescindibles',
       bannerSub:'De "Los Soprano" a "The Bear": veinte series que definen lo mejor que ha dado la televisión moderna, sin importar el género.',
       items:SERIES_IMPRESCINDIBLES},
      {id:'scorsese',categoria:'director',emoji:'🗽',titulo:'Martin Scorsese',sub:'13 películas · lo esencial',
       icono:'🎬',color:'#B22222',colorBg:'#2a0d0d',colorSoft:'#ff9a9a',
       bannerTitulo:'<span>Martin Scorsese</span> — lo esencial',
       bannerSub:'Selección de la filmografía más determinante de Scorsese, de "Malas calles" (1973) a "Los asesinos de la luna" (2023).',
       items:SCORSESE},
      {id:'kubrick',categoria:'director',emoji:'👁️',titulo:'Stanley Kubrick',sub:'11 películas · filmografía completa',
       icono:'🎬',color:'#E30000',colorBg:'#2a0808',colorSoft:'#ff8a8a',
       bannerTitulo:'<span>Stanley Kubrick</span> — filmografía completa',
       bannerSub:'Los 11 largometrajes de Kubrick reconocidos oficialmente, de "Atraco perfecto" (1956) a "Eyes Wide Shut" (1999). Un catálogo cerrado, como el de Bond.',
       items:KUBRICK},
      {id:'spielberg',categoria:'director',emoji:'🎟️',titulo:'Steven Spielberg',sub:'20 películas · lo esencial',
       icono:'🎬',color:'#4682B4',colorBg:'#0d1a2a',colorSoft:'#a8d0f0',
       bannerTitulo:'<span>Steven Spielberg</span> — lo esencial',
       bannerSub:'Selección de la extensa filmografía de Spielberg, de "Tiburón" (1975) a "Disclosure Day" (2026).',
       items:SPIELBERG},
      {id:'cine-espanol',categoria:'genero',emoji:'🇪🇸',titulo:'Cine español imprescindible',sub:'25 títulos · lo mejor de casa',
       icono:'🎬',color:'#FFC400',colorBg:'#2a2308',colorSoft:'#ffe58a',
       bannerTitulo:'<span>Cine español</span> imprescindible',
       bannerSub:'Almodóvar, Amenábar, Álex de la Iglesia y mucho más: veinticinco películas que representan lo mejor del cine hecho en España.',
       items:CINE_ESPANOL},
      {id:'comedia',categoria:'genero',emoji:'😂',titulo:'Comedia imprescindible',sub:'17 títulos · para reírse sin más',
       icono:'😂',color:'#FFB300',colorBg:'#2a2008',colorSoft:'#ffd980',
       bannerTitulo:'<span>Comedia</span> imprescindible',
       bannerSub:'Diecisiete comedias, de clásicas a modernas, pensadas solo para pasar un buen rato sin complicarse la vida.',
       items:COMEDIA},
      {id:'ciencia-ficcion',categoria:'genero',emoji:'🛸',titulo:'Ciencia ficción imprescindible',sub:'20 títulos · más allá de las sagas',
       icono:'🛸',color:'#2DD4BF',colorBg:'#08201c',colorSoft:'#8ff5e8',
       bannerTitulo:'<span>Ciencia ficción</span> imprescindible',
       bannerSub:'Veinte películas de ciencia ficción independientes de las grandes sagas (Marvel, DC, Star Wars), de "2001" a "Dune".',
       items:CIENCIA_FICCION},
      {id:'documentales',categoria:'genero',emoji:'🎦',titulo:'Documentales imprescindibles',sub:'15 títulos · realidad que engancha',
       icono:'📽️',color:'#8A8D91',colorBg:'#1c1e20',colorSoft:'#c8cbd0',
       bannerTitulo:'<span>Documentales</span> imprescindibles',
       bannerSub:'Historias reales contadas con el ritmo de un buen thriller: de crímenes reales a naturaleza, pasando por tecnología y música.',
       items:DOCUMENTALES},
      {id:'alien',categoria:'saga',emoji:'👽',titulo:'Alien',sub:'8 títulos · orden cronológico',
       icono:'👽',color:'#6B8E23',colorBg:'#12160a',colorSoft:'#c3d98f',
       bannerTitulo:'<span>Alien</span> — orden cronológico',
       bannerSub:'Las 8 películas y series de la saga en orden de línea temporal interna, de "Prometheus" (~2089) a "Alien: Resurrección" (~2381).',
       items:ALIEN},
      {id:'terminator',categoria:'saga',emoji:'🤖',titulo:'Terminator',sub:'6 películas · orden de estreno',
       icono:'🤖',color:'#C0392B',colorBg:'#240a08',colorSoft:'#ff9a8a',
       bannerTitulo:'<span>Terminator</span> — saga completa',
       bannerSub:'Las 6 películas en orden de estreno. Ojo: la propia saga reinicia su continuidad varias veces, así que no hay un único orden "interno" posible.',
       items:TERMINATOR},
      {id:'stargate',categoria:'saga',emoji:'🌀',titulo:'Stargate',sub:'7 títulos · franquicia completa',
       icono:'🌀',color:'#4FA8D8',colorBg:'#0a1c26',colorSoft:'#a8dcf5',
       bannerTitulo:'<span>Stargate</span> — franquicia completa',
       bannerSub:'Película, series y secuelas directas en orden cronológico, desde la precuela "Stargate Origins" hasta "Stargate Universe".',
       items:STARGATE},
      {id:'comedia-europea',categoria:'genero',emoji:'🥐',titulo:'Comedia europea',sub:'20 títulos · Francia, Italia y Reino Unido',
       icono:'🇪🇺',color:'#F2A65A',colorBg:'#2a1d0a',colorSoft:'#ffd9a0',
       bannerTitulo:'<span>Comedia europea</span>',
       bannerSub:'Tres tradiciones de humor muy distintas en una sola lista: comedia francesa, italiana y británica, marcada país a país.',
       items:COMEDIA_EUROPEA},
      {id:'xmen',categoria:'saga',emoji:'🧬',titulo:'X-Men',sub:'13 películas · orden recomendado',
       icono:'🧬',color:'#F2C230',colorBg:'#1f1a08',colorSoft:'#f8df8a',
       bannerTitulo:'<span>X-Men</span> — en el orden recomendado',
       bannerSub:'La saga mutante de Fox de 2000 a 2024, en orden de estreno: es el recomendado, porque «Días del futuro pasado» reescribe la historia a mitad de saga. En cada una ves en qué año transcurre. Termina en «Deadpool y Lobezno», el salto al Universo Marvel.',
       items:XMEN_SAGA},
      {id:'fast-furious',categoria:'saga',emoji:'🏎️',titulo:'Fast & Furious',sub:'11 películas · orden cronológico',
       icono:'🏎️',color:'#E8541E',colorBg:'#2a1308',colorSoft:'#ffb08a',
       bannerTitulo:'<span>Fast & Furious</span> — orden cronológico',
       bannerSub:'Toda la saga en orden de historia, no de estreno. La gran trampa: “Tokyo Race” se estrenó tercera, pero sucede después de la sexta.',
       items:FAST_FURIOUS},
      {id:'tierra-media',categoria:'saga',emoji:'💍',titulo:'La Tierra Media',sub:'8 títulos · orden cronológico',
       icono:'💍',color:'#C9A227',colorBg:'#1d1808',colorSoft:'#ead48a',
       bannerTitulo:'<span>La Tierra Media</span> — orden cronológico',
       bannerSub:'De la forja de los anillos en la Segunda Edad a la caída de Sauron: series, anime y las dos trilogías de Peter Jackson.',
       items:TIERRA_MEDIA},
      {id:'mundo-magico',categoria:'saga',emoji:'⚡',titulo:'Mundo mágico de Harry Potter',sub:'11 títulos · orden cronológico',
       icono:'⚡',color:'#B8292F',colorBg:'#260808',colorSoft:'#f0a8a8',
       bannerTitulo:'<span>Mundo mágico</span> — orden cronológico',
       bannerSub:'Animales fantásticos va décadas antes que Harry: así queda todo en orden de historia, de 1926 a 1998.',
       items:HARRY_POTTER},
      {id:'monsterverse',categoria:'saga',emoji:'🦖',titulo:'MonsterVerse',sub:'6 títulos · orden cronológico',
       icono:'🦖',color:'#2E8B57',colorBg:'#0a1f14',colorSoft:'#9fe0bd',
       bannerTitulo:'<span>MonsterVerse</span> — orden cronológico',
       bannerSub:'Godzilla, Kong y Monarch en orden de historia, desde la isla Calavera en 1973.',
       items:MONSTERVERSE},
      {id:'john-wick',categoria:'saga',emoji:'🪙',titulo:'John Wick',sub:'6 títulos · orden cronológico',
       icono:'🪙',color:'#C8A15A',colorBg:'#1c160c',colorSoft:'#e9d3a8',
       bannerTitulo:'<span>John Wick</span> — orden cronológico',
       bannerSub:'Las cuatro películas, la precuela “The Continental” y “Ballerina”, en su orden de historia.',
       items:JOHN_WICK},
      {id:'fincher',categoria:'director',emoji:'🔍',titulo:'David Fincher',sub:'13 títulos · filmografía esencial',
       icono:'🔍',color:'#7A9E7E',colorBg:'#111a12',colorSoft:'#bdd8c0',
       bannerTitulo:'<span>David Fincher</span> — filmografía esencial',
       bannerSub:'De “Alien 3” a “El asesino”, en orden de estreno: el director más meticuloso y oscuro de Hollywood, con “Mindhunter” incluida.',
       items:FINCHER},
      {id:'villeneuve',categoria:'director',emoji:'🏜️',titulo:'Denis Villeneuve',sub:'9 películas · filmografía esencial',
       icono:'🏜️',color:'#D9A441',colorBg:'#22180a',colorSoft:'#f0d29a',
       bannerTitulo:'<span>Denis Villeneuve</span> — filmografía esencial',
       bannerSub:'De su etapa canadiense a “Dune”, en orden de estreno: la ciencia ficción y el thriller adulto de los últimos quince años.',
       items:VILLENEUVE},
      {id:'hitchcock',categoria:'director',emoji:'🐦',titulo:'Alfred Hitchcock',sub:'15 películas · lo esencial',
       icono:'🐦',color:'#9B9B9B',colorBg:'#161616',colorSoft:'#d6d6d6',
       bannerTitulo:'<span>Alfred Hitchcock</span> — lo esencial',
       bannerSub:'El maestro del suspense en orden de estreno, de su etapa británica a sus grandes clásicos de Hollywood.',
       items:HITCHCOCK},
      {id:'viajes-tiempo',categoria:'genero',emoji:'🕰️',titulo:'Viajes en el tiempo',sub:'19 títulos · películas y series',
       icono:'🕰️',color:'#4FC3F7',colorBg:'#0a1c26',colorSoft:'#a6e3fb',
       bannerTitulo:'<span>Viajes en el tiempo</span>',
       bannerSub:'Bucles, paradojas y máquinas del tiempo, de 1960 a hoy. Incluye “El ministerio del tiempo” y “Dark”.',
       items:VIAJES_TIEMPO},
      {id:'atracos',categoria:'genero',emoji:'💰',titulo:'Atracos',sub:'16 títulos · golpes maestros',
       icono:'💰',color:'#43A047',colorBg:'#0c1d0d',colorSoft:'#a5d6a7',
       bannerTitulo:'<span>Atracos</span> — golpes maestros',
       bannerSub:'El cine de atracos de “Rififí” a “La casa de papel”: planes perfectos que casi nunca salen como estaba previsto.',
       items:ATRACOS},
      {id:'belico',categoria:'genero',emoji:'🪖',titulo:'Cine bélico',sub:'19 títulos · películas y series',
       icono:'🪖',color:'#8D6E63',colorBg:'#1b1411',colorSoft:'#d7c0b6',
       bannerTitulo:'<span>Cine bélico</span>',
       bannerSub:'De las trincheras de la Primera Guerra Mundial a Vietnam y Somalia: las películas que mejor han contado la guerra.',
       items:BELICO},
      {id:'western',categoria:'genero',emoji:'🤠',titulo:'Western',sub:'18 títulos · del clásico al moderno',
       icono:'🤠',color:'#D2691E',colorBg:'#24140a',colorSoft:'#f2b98a',
       bannerTitulo:'<span>Western</span> — del clásico al moderno',
       bannerSub:'De John Ford a “El poder del perro”, pasando por Sergio Leone y Clint Eastwood.',
       items:WESTERN}
      ,
      {id:'pixar',categoria:'estudio',emoji:'🧸',titulo:'Pixar',sub:'31 películas · orden de estreno',
       icono:'🧸',color:'#3A86FF',colorBg:'#0d1626',colorSoft:'#a8c8ff',
       bannerTitulo:'<span>Pixar</span> — todas sus películas',
       bannerSub:'De “Toy Story” a hoy: todos los largos del estudio, en el orden en que se estrenaron.',
       items:PIXAR},
      {id:'ghibli',categoria:'estudio',emoji:'🍃',titulo:'Studio Ghibli',sub:'25 películas · orden de estreno',
       icono:'🍃',color:'#5FA35F',colorBg:'#0f1c10',colorSoft:'#b9e0b0',
       bannerTitulo:'<span>Studio Ghibli</span> — todas sus películas',
       bannerSub:'Miyazaki, Takahata y compañía, de “Nausicaä” a “El chico y la garza”.',
       items:GHIBLI},
      {id:'almodovar',categoria:'director',emoji:'🌹',titulo:'Pedro Almodóvar',sub:'23 películas · filmografía completa',
       icono:'🌹',color:'#E63946',colorBg:'#260d10',colorSoft:'#f6a9b0',personas:['Pedro Almodóvar'],
       bannerTitulo:'<span>Pedro Almodóvar</span> — filmografía',
       bannerSub:'Sus 23 películas, de la Movida madrileña al León de Oro de Venecia.',
       items:ALMODOVAR},
      {id:'mision-imposible',categoria:'saga',emoji:'🧨',titulo:'Misión Imposible',sub:'8 películas · orden de estreno',
       icono:'🧨',color:'#D62828',colorBg:'#220b0b',colorSoft:'#f2a1a1',
       bannerTitulo:'<span>Misión Imposible</span> — la saga completa',
       bannerSub:'Las 8 misiones de Ethan Hunt, cada vez con acrobacias más locas de Tom Cruise.',
       items:MISION_IMPOSIBLE},
      {id:'indiana-jones',categoria:'saga',emoji:'🎩',titulo:'Indiana Jones',sub:'6 títulos · orden cronológico',
       icono:'🎩',color:'#B5813C',colorBg:'#1f160b',colorSoft:'#e6c597',
       bannerTitulo:'<span>Indiana Jones</span> — orden cronológico',
       bannerSub:'Las cinco películas y la serie del joven Indy, ordenadas según la vida del arqueólogo.',
       items:INDIANA_JONES},
      {id:'jurassic',categoria:'saga',emoji:'🦕',titulo:'Parque Jurásico',sub:'9 títulos · orden cronológico',
       icono:'🦕',color:'#C9A227',colorBg:'#1d180a',colorSoft:'#ecd98f',
       bannerTitulo:'<span>Parque Jurásico</span> — orden cronológico',
       bannerSub:'Las siete películas y las dos series animadas, en el orden de la historia.',
       items:JURASSIC},
      {id:'matrix',categoria:'saga',emoji:'💊',titulo:'Matrix',sub:'5 títulos · orden de estreno',
       icono:'💊',color:'#22B14C',colorBg:'#07170c',colorSoft:'#93e6ab',
       bannerTitulo:'<span>Matrix</span> — la saga completa',
       bannerSub:'Las cuatro películas y “Animatrix”, el puente entre ellas.',
       items:MATRIX},
      {id:'mad-max',categoria:'saga',emoji:'🔥',titulo:'Mad Max',sub:'5 películas · orden cronológico',
       icono:'🔥',color:'#E07A1F',colorBg:'#221307',colorSoft:'#f5c08f',
       bannerTitulo:'<span>Mad Max</span> — orden cronológico',
       bannerSub:'Con “Furiosa” colocada antes de “Furia en la carretera”, que es donde va en la historia.',
       items:MAD_MAX},
      {id:'batman',categoria:'saga',emoji:'🦇',titulo:'Batman',sub:'14 títulos · orden de estreno',
       icono:'🦇',color:'#F5C518',colorBg:'#14130c',colorSoft:'#f7e08a',
       bannerTitulo:'<span>Batman</span> — todas las versiones',
       bannerSub:'De Adam West a Robert Pattinson, pasando por la serie animada y la trilogía de Nolan.',
       items:BATMAN},
      {id:'pesadillas',categoria:'genero',emoji:'🔪',titulo:'Pesadillas en serie',sub:'30 películas · Halloween, Scream y Saw',
       icono:'🔪',color:'#B00020',colorBg:'#1c070b',colorSoft:'#f19aa8',
       bannerTitulo:'<span>Pesadillas</span> en serie',
       bannerSub:'Las tres grandes sagas del slasher, completas: Michael Myers, Ghostface y Jigsaw.',
       items:PESADILLAS},
      // ── Especiales que se generan solos con datos de TMDB (no tienen lista fija) ──
      {id:'estrenos-mes',categoria:'actual',emoji:'🎟️',titulo:'Estrenos del mes',sub:'Se actualiza solo · España',
       icono:'🎟️',color:'#FF6B35',colorBg:'#24120a',colorSoft:'#ffbfa3',
       bannerTitulo:'<span>Estrenos</span> del mes',
       bannerSub:'Películas que se estrenan este mes en España (cine o plataformas) y series nuevas en plataformas, por popularidad.',
       dinamico:()=>_espEstrenosMes(), items:[]},
      {id:'popular-es',categoria:'actual',emoji:'📈',titulo:'Popular en plataformas · España',sub:'Se actualiza solo · TMDB',
       icono:'📈',color:'#C1121F',colorBg:'#220a0c',colorSoft:'#f4a3a9',limite:50,ranking:true,
       bannerTitulo:'<span>Popular</span> en plataformas · España',
       bannerSub:'Lo más popular estos días en TMDB entre lo que está incluido en las principales plataformas de España. TMDB no da audiencias por país: la popularidad es mundial y lo que cambia es el catálogo de cada país.',
       dinamico:()=>_espPopular('ES'), items:[]},
      {id:'popular-us',categoria:'actual',emoji:'🗽',titulo:'Popular en plataformas · EE. UU.',sub:'Se actualiza solo · TMDB',
       icono:'🗽',color:'#3C6E9F',colorBg:'#0c1520',colorSoft:'#a9c6e4',limite:50,ranking:true,
       bannerTitulo:'<span>Popular</span> en plataformas · EE. UU.',
       bannerSub:'Lo más popular estos días en TMDB entre lo que está incluido en las principales plataformas de Estados Unidos. TMDB no da audiencias por país: la popularidad es mundial y lo que cambia es el catálogo de cada país.',
       dinamico:()=>_espPopular('US'), items:[]},
      {id:'cines-es',categoria:'actual',emoji:'🍿',titulo:'En cines ahora · España',sub:'Cartelera · se actualiza sola',
       icono:'🍿',color:'#F4A261',colorBg:'#24170c',colorSoft:'#f8cfa9',soloPeliculas:true,
       bannerTitulo:'En <span>cines</span> ahora · España',
       bannerSub:'Las películas que están en cartelera en España estas semanas, de la más a la menos popular.',
       dinamico:()=>_espEnCines('ES'), items:[]},
      {id:'cines-us',categoria:'actual',emoji:'🎬',titulo:'En cines ahora · EE. UU.',sub:'Cartelera · se actualiza sola',
       icono:'🎬',color:'#7B6CF6',colorBg:'#131126',colorSoft:'#c4bcfb',soloPeliculas:true,
       bannerTitulo:'En <span>cines</span> ahora · EE. UU.',
       bannerSub:'Las películas que están en cartelera en Estados Unidos estas semanas, de la más a la menos popular.',
       dinamico:()=>_espEnCines('US'), items:[]}

      // Futuros especiales se añaden aquí.
    ];

    ESPECIALES.forEach(e=>{
      if(_ESP_PERSONAS[e.id]) e.personas = _ESP_PERSONAS[e.id];
      e.items.forEach(it=>{
        const r = ESPECIALES_TMDB_IDS[_claveIdResuelto(it)];
        if(r && !it.tmdb_id){ it.tmdb_id = r[0]; if(r[1] && !it.f) it.f = r[1]; }
      });
      if(e.dinamico) return;
      // El número de títulos sale de la lista, no del texto
      const m = e.sub.match(/^(\d+)(?= (títulos|películas))/);
      if(m && Number(m[1])!==e.items.length){
        e.sub = e.sub.replace(m[1], e.items.length);
        e.bannerSub = e.bannerSub.replace(new RegExp(`\\b${m[1]}(?= (títulos|películas))`), e.items.length);
      }
      e.cronologico = /orden cronológico/.test(e.sub);
    });
    window.especialIdsResueltos = (function(){
      try{ return JSON.parse(localStorage.getItem('especialIdsResueltos_v2')||'{}'); }catch(e){ return {}; }
    })();
    window.misColecciones = colLeer();
    window._colNube = null;

    // ══ LÍNEA TEMPORAL DE ESPECIALES ══════════════════════════════════════
    const _tlReduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.addEventListener('scroll', ()=>{ if(_tlRaf) return; _tlRaf = requestAnimationFrame(()=>{ _tlRaf=null; _tlActualizarScroll(); }); }, {passive:true});
    window.addEventListener('resize', ()=>_tlActualizarScroll());
    // Cualquier cambio en un botón de "vista" (desde la lista, desde la ficha o al resolver el ID) repinta la línea
    (function(){
      const lista = document.getElementById('especial-lista');
      if(!lista || !('MutationObserver' in window)) return;
      let pendiente = false;
      new MutationObserver(muts=>{
        if(pendiente) return;
        if(!muts.some(m=>m.target.classList && m.target.classList.contains('especial-visto-btn'))) return;
        pendiente = true;
        requestAnimationFrame(()=>{ pendiente=false; actualizarTimeline(); });
      }).observe(lista, {attributes:true, attributeFilter:['class'], subtree:true});
    })();
    window._duraciones = (function(){ try{ return JSON.parse(localStorage.getItem(_DUR_KEY)||'{}'); }catch(e){ return {}; } })();
    document.documentElement.classList.toggle('sin-logros', !LOGROS_VISIBLES);
    try{ Object.keys(localStorage).filter(k=>k.startsWith('cm:li:')).forEach(k=>localStorage.removeItem(k)); }catch(e){}
    const _NOMBRE_IDIOMA = (()=>{ try{ return new Intl.DisplayNames(['es'], {type:'language'}); }catch(e){ return null; } })();
    window._logrosSug = window._logrosSug || {};
    (function(){
      let tm = null, x0 = 0, y0 = 0;
      const cancelar = ()=>{ clearTimeout(tm); tm = null; };
      document.addEventListener('pointerdown', e=>{
        const c = e.target.closest && e.target.closest('[data-lp]'); if(!c || e.button>0) return;
        x0 = e.clientX; y0 = e.clientY; cancelar();
        tm = setTimeout(()=>{ tm = null; window._lpDisparado = Date.now(); if(navigator.vibrate) navigator.vibrate(15); _abrirMenuLp(c); }, 500);
      }, {passive:true});
      document.addEventListener('pointermove', e=>{ if(tm && Math.hypot(e.clientX-x0, e.clientY-y0)>10) cancelar(); }, {passive:true});
      ['pointerup','pointercancel'].forEach(ev=>document.addEventListener(ev, cancelar, {passive:true}));
      document.addEventListener('scroll', cancelar, {passive:true, capture:true});
      // el clic que llega al soltar tras un toque largo no abre la ficha
      document.addEventListener('click', e=>{ if(window._lpDisparado && Date.now()-window._lpDisparado<800){ e.stopPropagation(); e.preventDefault(); window._lpDisparado = 0; } }, true);
      document.addEventListener('contextmenu', e=>{ const c = e.target.closest && e.target.closest('[data-lp]'); if(!c) return; e.preventDefault(); _abrirMenuLp(c); });
    })();

    // ══ SIGUIENTE EPISODIO en «Continuar viendo» ═══════════════════════════
    window._cacheSeries = window._cacheSeries || {};

    // ── MAPA DE CALOR DE ACTIVIDAD ───────────────────────────────────────

    // ── PERFIL DE GUSTO Y MAPA DE CINE: helpers compartidos ───────────────
    // Ninguna de las dos funciones de aquí abajo usa IA externa: todo se
    // calcula localmente a partir de tu biblioteca (Supabase) + metadatos
    // públicos de TMDB (géneros, director/creador, reparto principal).
    window._paraTiHistorial = window._paraTiHistorial || { movie: [], tv: [] };
    const MONTAJES = {
      78:{r:2, por:'The Final Cut: es la única que Ridley Scott supervisó entera, está restaurada y corrige errores. La del estreno tiene una voz en off y un final feliz que el director nunca quiso.',
        v:[['Estreno', 1982, 117, 'Voz en off de Deckard explicándolo todo y final feliz con paisajes de montaña.'], ['Montaje del director', 1992, 116, 'Sin voz en off ni final feliz; añade el sueño del unicornio, que cambia cómo entiendes a Deckard.'], ['The Final Cut', 2007, 117, 'La definitiva: imagen restaurada, escenas corregidas y el unicornio.']]},
      348:{r:0, por:'La del estreno. El montaje de 2003 se hizo para su reedición y el propio Ridley Scott dice que prefiere la original.',
        v:[['Estreno', 1979, 117, 'La original.'], ['Montaje del director', 2003, 116, 'Algo más rápida: quita momentos y recupera la escena del nido, que explica qué hace el alien con la tripulación.']]},
      679:{r:1, por:'La edición especial: es la que prefiere James Cameron y la escena de la hija de Ripley explica toda su relación con Newt.',
        v:[['Estreno', 1986, 137, 'La de cines.'], ['Edición especial', 1990, 154, 'Añade la colonia antes del ataque, las torretas automáticas y que Ripley tuvo una hija.']]},
      8077:{r:1, por:'El Assembly Cut. Fincher no reconoce ninguna de las dos, pero esta se acerca más a lo que rodó y la historia se entiende mejor.',
        v:[['Estreno', 1992, 114, 'La que impuso el estudio.'], ['Assembly Cut', 2003, 145, 'Otro principio, más peso a los presos (sobre todo a Golic) y un final ligeramente distinto.']]},
      120:_ESDLA(178, 208, 'Más Comarca, los regalos de Galadriel (que importan después) y un viaje más pausado.'),
      121:_ESDLA(179, 235, 'Más Faramir y Boromir, la relación entre los dos hermanos y su padre, y más Rohan.'),
      122:_ESDLA(201, 263, 'El final de Saruman, la Boca de Sauron y más Éowyn y Faramir.'),
      49051:_HOBBIT(169, 182, 'Unos 13 minutos más, sobre todo en Rivendel y la Comarca.'),
      57158:_HOBBIT(161, 186, 'Unos 25 minutos más, con más del padre de Thorin y del Bosque Negro.'),
      122917:{r:1, por:'Aquí sí, la extendida: la batalla tiene más sentido y cierra mejor algunos personajes.',
        v:[['Versión de cines', 0, 144, 'La que se estrenó.'], ['Versión extendida', 0, 164, 'Unos 20 minutos más de batalla y cierres de personajes secundarios. Es más violenta.']]},
      28:{r:2, por:'Final Cut: es la que prefiere Coppola. Quita lo que sobraba de Redux y se queda con lo bueno.',
        v:[['Estreno', 1979, 147, 'La original, la más directa.'], ['Redux', 2001, 196, 'Añade la plantación francesa y una segunda escena con las chicas del espectáculo; se hace larga.'], ['Final Cut', 2019, 183, 'El equilibrio entre las dos, restaurada.']]},
      1495:{r:1, por:'El montaje del director, sin duda: es prácticamente otra película, mucho mejor. Se entienden los personajes y la historia de Sibila.',
        v:[['Estreno', 2005, 144, 'Recortada por el estudio; quedan huecos en la historia.'], ['Montaje del director', 2006, 190, 'Recupera la trama del hijo de Sibila y el pasado de Balian. La que hay que ver.']]},
      209112:{r:1, por:'Ultimate Edition: la trama de Lois tiene sentido y se entiende por qué la gente culpa a Superman.',
        v:[['Estreno', 2016, 151, 'La de cines.'], ['Ultimate Edition', 2016, 182, 'Media hora más que explica la investigación de Lois y lo que pasa en África. Más violenta.']]},
      141052:{r:1, ir:791373, irTxt:'Ver ficha de la de Zack Snyder', por:'La Liga de la Justicia de Zack Snyder (2021). Es la que el director tenía pensada: más larga, pero mucho más coherente. La de 2017 la terminó otro director con muchos cambios.',
        v:[['Liga de la Justicia', 2017, 120, 'Terminada por Joss Whedon tras salir Snyder: más humor y muy recortada.'], ["Zack Snyder's Justice League", 2021, 242, 'La versión de Snyder, en 4 horas y en formato cuadrado. Cyborg y Flash tienen historia propia.']]},
      791373:{r:0, ir:141052, irTxt:'Ver ficha de la de 2017', por:'Esta. Es la versión del director original de la película que se estrenó en 2017.',
        v:[["Zack Snyder's Justice League", 2021, 242, 'La de Snyder, en formato cuadrado y por capítulos.'], ['Liga de la Justicia', 2017, 120, 'La de cines, terminada por Joss Whedon y muy distinta.']]},
      141:{r:0, por:'La de cines para una primera vez: el misterio funciona mejor. El montaje del director, después, si te quedas con ganas de entenderla.',
        v:[['Estreno', 2001, 113, 'La original, más ambigua.'], ['Montaje del director', 2004, 133, 'Añade textos que explican las reglas del viaje en el tiempo y cambia algunas canciones.']]},
      279:{r:0, por:'Las dos son buenas. La de cines tiene mejor ritmo; la del director añade una escena importante entre Salieri y Constanze.',
        v:[['Estreno', 1984, 160, 'La que ganó los Óscar.'], ['Montaje del director', 2002, 180, 'Veinte minutos más, con más de Constanze y la ruina de Mozart.']]},
      11216:{r:0, por:'La de cines primero. La versión larga añade la historia de Elena adulta y cambia por completo el tono del final: para una segunda vez.',
        v:[['Versión de cines', 1988, 124, 'La que conquistó a todo el mundo.'], ['Versión del director', 2002, 174, 'Casi una hora más: Salvatore reencuentra a Elena.']]},
      68:{r:1, por:'El montaje de Terry Gilliam (europeo). Nunca la versión de 94 minutos con final feliz que preparó el estudio.',
        v:[['Love Conquers All', 1985, 94, 'Montada por el estudio para la tele, con final feliz. Evitar.'], ['Montaje europeo del director', 1985, 142, 'La de Gilliam, con su final.']]},
      2756:{r:1, por:'La edición especial: el final de la de cines queda cojo; esta lo completa y se entiende qué quieren los seres del fondo.',
        v:[['Estreno', 1989, 140, 'La de cines.'], ['Edición especial', 1993, 171, 'Añade la ola gigante y el mensaje del final.']]},
      280:{r:1, por:'La edición especial: añade escenas que explican cómo el Terminator aprende a ser humano y que Sarah está al límite.',
        v:[['Estreno', 1991, 137, 'La de cines.'], ['Edición especial', 1993, 154, 'Kyle Reese en sueños, el chip de aprendizaje y más de la T-1000. Existe un final alternativo con Sarah anciana que se puede ver aparte.']]},
      840:{r:2, por:'El montaje del director de 1998: Spielberg se quedó con lo mejor de cada una y quitó el interior de la nave, que no le gustaba.',
        v:[['Estreno', 1977, 135, 'La original.'], ['Edición especial', 1980, 132, 'Enseña el interior de la nave, algo de lo que Spielberg se arrepintió.'], ['Montaje del director', 1998, 137, 'La definitiva.']]},
      11:{r:0, por:'Hoy solo se distribuye la edición especial, con retoques digitales (Disney+). La original de 1977 solo existe en un DVD antiguo de imagen pobre.',
        v:[['Original', 1977, 121, 'Tal como se estrenó. Muy difícil de encontrar.'], ['Edición especial', 1997, 125, 'Efectos digitales nuevos, Jabba en Mos Eisley y el famoso cambio de quién dispara primero entre Han y Greedo. Se ha retocado más en ediciones posteriores.']]},
      1891:{r:0, por:'La disponible hoy (Disney+) es la edición especial; los cambios son pequeños.',
        v:[['Original', 1980, 124, 'Tal como se estrenó.'], ['Edición especial', 1997, 127, 'Ciudad de las Nubes más amplia y retoques del Emperador.']]},
      1892:{r:0, por:'La disponible hoy (Disney+) es la edición especial; la original solo en un DVD antiguo.',
        v:[['Original', 1983, 131, 'Tal como se estrenó.'], ['Edición especial', 1997, 135, 'Canción nueva en el palacio de Jabba, celebraciones en otros planetas y, desde 2004, Hayden Christensen como fantasma al final.']]},
      601:{r:0, por:'La original. En 2002 Spielberg cambió las pistolas por walkie-talkies, pero después se arrepintió y hoy se vuelve a distribuir la de siempre.',
        v:[['Original', 1982, 115, 'La de siempre.'], ['Edición 20.º aniversario', 2002, 120, 'Pistolas cambiadas por walkie-talkies, E.T. digital y una escena de baño. Retirada.']]},
      101:{r:0, por:'La de cines. La versión íntegra añade escenas de Mathilda acompañando a Léon en sus encargos que hacen su relación bastante más incómoda.',
        v:[['Estreno', 1994, 110, 'La de cines.'], ['Versión íntegra', 1996, 133, 'Mathilda aprende el oficio con Léon y hay más tensión entre los dos.']]},
      13183:{r:1, por:'El montaje del director: más escenas de los personajes sin hacerla eterna. El Ultimate Cut mete un cómic de piratas animado que corta el ritmo.',
        v:[['Estreno', 2009, 162, 'La de cines.'], ['Montaje del director', 2009, 186, 'Más pasado de los personajes, incluida la muerte de Búho Nocturno original.'], ['Ultimate Cut', 2009, 215, 'Añade el cómic animado de piratas de la novela gráfica, intercalado.']]},
      9480:{r:1, por:'El montaje del director: es más adulto y recupera una trama de juicio que da sentido al Matt abogado.',
        v:[['Estreno', 2003, 103, 'La de cines.'], ['Montaje del director', 2004, 133, 'Media hora más, con un caso judicial y menos romance.']]},
      1966:{r:3, por:'The Ultimate Cut: Oliver Stone la rehizo cuatro veces y esta es la que él considera definitiva.',
        v:[['Estreno', 2004, 175, 'La de cines.'], ['Montaje del director', 2005, 167, 'Más corta, reordenada.'], ['Revisited', 2007, 214, 'En dos partes con intermedio.'], ['The Ultimate Cut', 2014, 206, 'La que prefiere Stone.']]},
      311:{r:1, por:'La europea de 229 minutos. Nunca la de 139 que se estrenó en Estados Unidos, reordenada en orden cronológico y destrozada.',
        v:[['Estreno en EE. UU.', 1984, 139, 'Recortada y en orden cronológico. Evitar.'], ['Versión europea', 1984, 229, 'La de Leone, con los saltos en el tiempo.'], ['Versión extendida', 2012, 251, 'Recupera escenas restauradas, con algunas diferencias de imagen.']]},
      387:{r:1, por:'El montaje del director: más claustrofóbico y con más tiempo con la tripulación, sin hacerse largo.',
        v:[['Estreno', 1981, 149, 'La de cines.'], ['Montaje del director', 1997, 208, 'Casi una hora más.'], ['Serie de televisión', 1985, 293, 'La versión más larga, en capítulos.']]},
      8536:{r:0, por:'La de cines para seguir la saga. El montaje de Richard Donner es interesante, pero está hecho con pruebas de cámara y escenas sin terminar.',
        v:[['Estreno (Richard Lester)', 1980, 127, 'La que se estrenó, con más humor.'], ['The Richard Donner Cut', 2006, 116, 'Lo que había rodado Donner antes de que lo despidieran. Más Marlon Brando.']]},
      581:{r:0, por:'La de cines: tiene mejor ritmo. La extendida se hizo después para televisión y Costner no la considera la suya.',
        v:[['Estreno', 1990, 181, 'La que ganó los Óscar.'], ['Edición extendida', 1991, 236, 'Casi una hora más, con más vida en el poblado sioux.']]},
      9552:{r:0, por:'La original primero. La de 2000 añade la famosa escena de la niña bajando las escaleras como una araña y un final más amable.',
        v:[['Estreno', 1973, 122, 'La original.'], ['La versión que nunca has visto', 2000, 132, 'La escena de la araña, más efectos y otro cierre.']]},
      530385:{r:0, por:'La de cines para una primera vez. El montaje del director, si te gustó: más ritual y más pelea de pareja, explica mejor el final.',
        v:[['Estreno', 2019, 147, 'La de cines.'], ['Montaje del director', 2019, 171, 'Un ritual nocturno más y la relación de la pareja más deteriorada.']]},
      19995:{r:0, por:'La de cines. La extendida de coleccionista empieza en la Tierra y amplía Pandora, para fans.',
        v:[['Estreno', 2009, 162, 'La de cines.'], ['Edición especial', 2010, 170, 'Ocho minutos más en Pandora.'], ['Edición extendida de coleccionista', 2010, 178, 'Con un principio nuevo en la Tierra.']]},
      98:{r:0, por:'La de cines: Ridley Scott la prefiere. La extendida añade escenas que él mismo quitó porque frenaban la historia.',
        v:[['Estreno', 2000, 155, 'La que ganó el Óscar.'], ['Versión extendida', 2005, 171, 'Más Roma y más de Cómodo.']]},
      1480:{r:2, por:'La reconstrucción de 1998, hecha siguiendo las notas de Orson Welles: el famoso plano del principio por fin sin títulos encima.',
        v:[['Estreno', 1958, 93, 'Recortada por el estudio.'], ['Versión preestreno', 1976, 108, 'Encontrada años después.'], ['Reconstrucción', 1998, 111, 'Siguiendo el memorando de 58 páginas que escribió Welles.']]},
      10776:{r:1, por:'El montaje del director, si quieres el final original del musical: completamente distinto y mucho más oscuro. Si no, la de cines tiene final feliz.',
        v:[['Estreno', 1986, 94, 'Con final feliz, cambiado tras unos pases de prueba.'], ['Montaje del director', 2012, 102, 'Recupera el final original: 20 minutos de plantas gigantes.']]},
      841:{r:0, por:'La de cines. La versión larga de televisión la montaron sin David Lynch y él quitó su nombre.',
        v:[['Estreno', 1984, 137, 'La de Lynch.'], ['Versión extendida de TV', 1988, 177, 'Con un prólogo de dibujos y firmada como «Alan Smithee». Lynch la repudió.']]},
      242:{r:1, por:'Coda: es la versión que Coppola y Mario Puzo querían. Cambia el principio y el final, y mejora mucho la película.',
        v:[['Estreno', 1990, 162, 'La de cines.'], ['Coda: la muerte de Michael Corleone', 2020, 158, 'Remontada por Coppola: otro principio, otro final y mejor ritmo.']]},
      652:{r:1, por:'El montaje del director: más épica, más cruda y con una banda sonora distinta.',
        v:[['Estreno', 2004, 163, 'La de cines.'], ['Montaje del director', 2007, 196, 'Media hora más, más violenta y con más de los dioses y la caída de Troya.']]},
      11976:{r:2, por:'El montaje del director, con la música de Jerry Goldsmith y la historia más completa.',
        v:[['Estreno en Europa', 1985, 94, 'Música de Jerry Goldsmith.'], ['Estreno en EE. UU.', 1986, 89, 'Más corta y con música de Tangerine Dream.'], ['Montaje del director', 2002, 113, 'La más completa.']]},
      16307:{r:1, por:'The Final Cut: la que aprobó el director, entre la recortada de cines y la extendida.',
        v:[['Estreno', 1973, 88, 'Recortada.'], ['The Final Cut', 2013, 94, 'Restaurada y aprobada por Robin Hardy.'], ['Versión extendida', 1979, 99, 'La más larga, con imagen peor.']]},
      19:{r:1, por:'La restaurada de 2010: en 2008 apareció en Buenos Aires una copia con casi media hora que se creía perdida.',
        v:[['Versiones antiguas', 1927, 0, 'Recortadas, con distintas músicas y duraciones.'], ['Versión restaurada completa', 2010, 148, 'Con las escenas recuperadas y la música original.']]},
      947:{r:1, por:'La restaurada de 1989, que es la que circula hoy: recupera escenas que se habían ido cortando.',
        v:[['Estreno', 1962, 222, 'La de cines, luego recortada en sucesivas reposiciones.'], ['Versión restaurada', 1989, 228, 'Supervisada por David Lean.']]},
      76341:_BN('Mad Max: Furia en la carretera', 2015, 'Black & Chrome'),
      263115:_BN('Logan', 2017, 'Logan Noir'),
      496243:_BN('Parásitos', 2019, 'Versión en blanco y negro'),
      940721:_BN('Godzilla Minus One', 2023, 'Minus Color'),
    };
    window._montajesCache = window._montajesCache || {};
    document.addEventListener('visibilitychange', ()=>{ if(document.hidden && window._escStream) pararEscanerVivo(); });



    // ══ SEIS GRADOS: el camino más corto entre dos actores, película a película (y un juego para encontrarlo tú) ══
    // Se busca desde los dos lados a la vez. Para no hacer cientos de consultas se tiran por las películas conocidas
    // y los actores populares (los «puentes» habituales); entre los caminos más cortos, primero los que pasan por películas que has visto.
    window._sgCred = window._sgCred || new Map(); window._sgRep = window._sgRep || new Map();

    // ══ PANEL DE USUARIOS (solo cuentas administradoras): crear cuentas, ver quién entra y cuándo ══
    const _ADMIN_FN = SUPABASE_URL + '/functions/v1/cinemood-admin';
    const _AVISOS_FN = TMDB_PROXY.replace('tmdb-proxy', 'cinemood-avisos');
    window._prevCache = window._prevCache || new Map(); window._prevItems = window._prevItems || new Map();
    document.addEventListener('scroll', _prevProgramarObservar, {capture:true, passive:true});
    window._ordenBibliotecaPendientes = (function(){
      try{ return localStorage.getItem('ordenPendientes_v1') || 'gusto'; }catch(e){ return 'gusto'; }
    })();
    _pintarBotonTema();
    _pintarApariencia();
    if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches && !document.documentElement.classList.contains('modo-tv')){
      window.addEventListener('scroll', ()=>{
        if(!_parallaxTicking){ _parallaxTicking = true; requestAnimationFrame(_actualizarParallaxHero); }
      }, { passive:true });
    }
    window._cmGuardarProgresoDesdeTV = function(key, posSeg, durSeg){
      if(!key) return;
      try{
        const p = Number(posSeg)||0, d = Number(durSeg)||0;
        if(d > 30 && p >= d * 0.92) localStorage.removeItem(key);
        else if(p > 3) localStorage.setItem(key, String(Math.floor(p)));
      }catch(e){}
    };
    addEventListener('pagehide', ()=>{ if(window._visorGuardar && document.getElementById('visor').classList.contains('activo')) window._visorGuardar(); });
    document.addEventListener('keydown', e=>{
      if(e.key!=='Escape') return;
      if(document.getElementById('feed-overlay').style.display!=='none'){ cerrarFeedTrailers(); return; }
      if(document.getElementById('visor').classList.contains('activo')) cerrarVisor();
      else if(document.getElementById('fuentes-modal').classList.contains('activo')) cerrarFuentes();
    });

    renderGeneros();
    renderEspecialesTiles();
    window.addEventListener('DOMContentLoaded',()=>initAuth(),{once:true});
    _a11yIniciar();
    ['para-ti-pelis-scroll','para-ti-series-scroll','continuar-viendo-scroll','d-similares','d-reparto','d-puntuacion-row'].forEach(habilitarDragScroll);
