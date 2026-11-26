// CineMood · Estado de ánimo, tono e inicio
// (Parte de index.html; se carga como script clásico: todo comparte el mismo ámbito global.)

    // ══ ESTADO DE ÁNIMO Y TONO ══════════════════════════════════════════════
    // Cada estado de ánimo es una intención: géneros que valen (cualquiera de ellos), géneros que se excluyen
    // y, si hace falta, una nota mínima. «Quiero algo…» añade un requisito obligatorio.
    // TMDB: en with_genres la coma significa «todos a la vez» y la barra «cualquiera».
    const ANIMOS = {
      movie: {
        aburrido:  {con:[28,12,878,53],        sin:[99,10749,10402]},       // que enganche
        triste:    {con:[35,16,10751,10402],   sin:[27,10752,53]},          // que te levante
        contento:  {con:[35,12,14,10402],      sin:[27,10752]},             // seguir arriba
        estresado: {con:[35,16,10751,12],      sin:[27,53,80,10752]},       // desconectar
        romantico: {con:[10749],               sin:[27,10752]},             // romance obligatorio
        pensativo: {con:[18,878,9648,36,99],   sin:[28,12,16,10751,35], voto:7}   // para pensar, bien valoradas
      },
      tv: {   // TMDB no tiene «terror», «thriller» ni «romance» para series: se usan sus equivalentes
        aburrido:  {con:[10759,10765,80,9648], sin:[99]},
        triste:    {con:[35,16,10751],         sin:[10768,80]},
        contento:  {con:[35,10759,10765,16],   sin:[10768,80]},
        estresado: {con:[35,16,10751],         sin:[80,9648,10768]},
        romantico: {con:[18,35],               sin:[80,10768], palabra:'romance', voto:7},
        pensativo: {con:[18,10765,9648,99],    sin:[35,16,10751,10759], voto:7.5}
      }
    };
    // «Quiero algo…»: cada uno es un grupo obligatorio (cualquiera de sus géneros)
    const TONOS = {
      movie: {'divertido':[35], 'de llorar':[18], 'de acción':[28], 'dramático':[18], 'que me haga pensar':[9648,878], 'romántico':[10749]},
      tv:    {'divertido':[35], 'de llorar':[18], 'de acción':[10759], 'dramático':[18], 'que me haga pensar':[9648,10765], 'romántico':[18,35]}
    };
    const TONO_SIN = {'divertido':[27,10752], 'de llorar':[35,28,12,878,27,53,80], 'romántico':[27]};
    const TONO_PALABRA = {tv:{'romántico':'romance'}};
    // Lo que nunca debe salir en una recomendación de series (infantil, realities, noticias, talk shows, culebrones)
    const TV_FUERA = [10762,10763,10764,10766,10767];
    // id de una palabra clave de TMDB («romance»), guardado en el dispositivo
    async function _idPalabraClave(nombre){
      const k = 'cm:kw:'+nombre;
      try{ const c = localStorage.getItem(k); if(c) return Number(c)||null; }catch(e){}
      try{
        const r = (await _tmdbJson(`/search/keyword&query=${encodeURIComponent(nombre)}&page=1`)).results||[];
        const x = r.find(y=>String(y.name).toLowerCase()===nombre) || r[0];
        if(x){ try{ localStorage.setItem(k, String(x.id)); }catch(e){} return x.id; }
      }catch(e){}
      return null;
    }
    // Plan de búsqueda para un tipo (movie/tv) a partir de lo marcado en Inicio
    function _planBusqueda(t){
      const moods = [...document.querySelectorAll('.mood-btn.active')].map(b=>b.dataset.mood);
      const tonos = [...document.querySelectorAll('#tones .tone-pill.active')].map(b=>b.textContent.trim());
      const chips = [...document.querySelectorAll('.genre-chip.active')];
      if(chips.length){
        // géneros elegidos a mano: todos a la vez y, si no hay bastante, cualquiera de ellos
        const ids = [...new Set(chips.flatMap(el=>el.dataset.id.split(',').map(Number)))];
        return {manual:true, ids, con:[], grupos:[], sin:[], voto:0, palabras:[], animacion:ids.includes(16)};
      }
      const defs = moods.map(m=>ANIMOS[t][m]).filter(Boolean);
      const con = [...new Set(defs.flatMap(d=>d.con))];
      const grupos = tonos.map(x=>TONOS[t][x]).filter(Boolean);
      const sin = [...new Set([...defs.flatMap(d=>d.sin), ...tonos.flatMap(x=>TONO_SIN[x]||[])])]
        .filter(g=>!con.includes(g) && !grupos.flat().includes(g));
      const palabras = [...new Set([...moods.map(m=>ANIMOS[t][m]?.palabra), ...tonos.map(x=>(TONO_PALABRA[t]||{})[x])].filter(Boolean))];
      const voto = Math.max(0, ...defs.map(d=>d.voto||0));
      const vacio = !con.length && !grupos.length;
      return {manual:false, con: vacio ? (t==='tv' ? [18,35,80] : [18,35,28]) : con, grupos, sin, voto, palabras,
              animacion: con.includes(16) || grupos.flat().includes(16)};
    }
    // ¿Cumple el plan un título ya descargado? (se usa para afinar lo que TMDB no permite expresar en una sola consulta)
    function _cumplePlan(item, plan, nivel){
      const g = new Set((item.genre_ids||[]).map(Number));
      if(plan.manual) return nivel>=2 || plan.ids.every(x=>g.has(x));
      if(nivel<2 && plan.grupos.some(gr=>!gr.some(x=>g.has(x)))) return false;
      if(plan.con.length && !plan.con.some(x=>g.has(x))) return false;
      if(nivel<1 && plan.sin.some(x=>g.has(x))) return false;
      return true;
    }
    function animacionSeleccionada() { return [...document.querySelectorAll('.genre-chip.active')].some(el=>el.dataset.id==='16'); }


    async function buscar(reset=false) {
      const btn=document.getElementById('btnBuscar');
      btn.classList.add('loading'); btn.textContent='Buscando...';
      try{
      const tipo=getTipo(), punt=getPuntuacion();
      const desde=yearActivo?document.getElementById('year-desde').value:'1990';
      const hasta=yearActivo?document.getElementById('year-hasta').value:ANIO_ACTUAL;
      const plataformas=[...document.querySelectorAll('.platform-chip.active')].map(el=>el.dataset.id);
      const tipos=tipo==='ambos'?['movie','tv']:tipo==='pelicula'?['movie']:['tv'];
      // Para cada tipo se prueba de lo más fiel a lo más flexible hasta tener al menos 8 títulos:
      // nivel 0 = todo lo marcado · 1 = sin las exclusiones · 2 = sin el tono · 3 = cualquier año y menos votos
      const porTipo=await Promise.all(tipos.map(async t=>{
        const plan=_planBusqueda(t);
        const campo=t==='movie'?'primary_release_date':'first_air_date';
        const palabras=(await Promise.all(plan.palabras.map(_idPalabraClave))).filter(Boolean);
        const recogidos=new Map();
        for(let nivel=0; nivel<=3 && recogidos.size<8; nivel++){
          // qué se le pide a TMDB en este nivel (lo que no se puede pedir de una vez se filtra después)
          let generos;
          if(plan.manual) generos = plan.ids.join(nivel>=2 ? '|' : ',');
          else if(nivel<2 && plan.grupos.length) generos = plan.grupos.length===1 ? plan.grupos[0].join('|') : plan.grupos.filter(gr=>gr.length===1).map(gr=>gr[0]).join(',') || plan.grupos[0].join('|');
          else generos = plan.con.join('|');
          const fuera=[...(nivel<1 ? plan.sin : []), ...(plan.animacion ? [] : [16]), ...(t==='tv' ? TV_FUERA : [10770])]; // 10770: telefilmes
          let base=`/discover/${t}&language=es-ES&sort_by=popularity.desc&vote_count.gte=${nivel<3?100:40}&with_genres=${generos}`;
          if(nivel<3) base+=`&${campo}.gte=${desde}-01-01&${campo}.lte=${hasta}-12-31`;
          if(t==='movie') base+='&with_runtime.gte=60'; // fuera cortos y conciertos
          const minimo=Math.max(punt.min, nivel<3 ? plan.voto : 0);
          if(minimo>0) base+=`&vote_average.gte=${minimo}`;
          if(punt.max<10) base+=`&vote_average.lte=${punt.max}`;
          if(fuera.length) base+=`&without_genres=${[...new Set(fuera)].join(',')}`;
          if(palabras.length && nivel<2) base+=`&with_keywords=${palabras.join('|')}`;
          if(plataformas.length && nivel<3) base+=`&with_watch_providers=${plataformas.join('|')}&watch_region=ES`;
          try{
            // primero la página 1 (para saber cuántas hay) y luego una al azar entre las que existen
            const p1=await _tmdbJson(base+'&page=1');
            const total=Math.min(p1.total_pages||1, 15);
            const otra=total>1 ? await _tmdbJson(base+`&page=${2+Math.floor(Math.random()*(total-1))}`) : {results:[]};
            [...(otra.results||[]), ...(p1.results||[])].forEach(item=>{
              if(!recogidos.has(item.id) && _cumplePlan(item, plan, nivel))
                recogidos.set(item.id, {...item,_tipo:t,title:item.title||item.name,release_date:item.release_date||item.first_air_date});
            });
          }catch(e){}
        }
        return [...recogidos.values()];
      }));
      const todos=porTipo.flat().filter(it=>!esOculta(it.id,it._tipo));
      const sinVistos=excluirVistos(todos);
      const filtrados=sinVistos.length>=4?sinVistos:todos;
      mostrarResultados(barajar(filtrados).slice(0,8),reset);
      }finally{ btn.classList.remove('loading'); btn.textContent='Buscar →'; }
    }
    // Fisher–Yates: copia barajada en la que todos los órdenes son igual de probables
    function barajar(lista){
      const a=[...lista];
      for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
      return a;
    }

    async function buscarDesdeNav(){const titulo=document.getElementById('pc-busqueda-input').value.trim();if(!titulo)return;const btn=document.getElementById('btnBuscar');btn.classList.add('loading');btn.textContent='Buscando...';try{irA('p-inicio');await buscarPorTitulo(titulo,true);}finally{btn.classList.remove('loading');btn.textContent='Buscar →';}}
    async function buscarPorTituloRapido(){const titulo=document.getElementById('busqueda-rapida-input').value.trim();if(!titulo)return;const btn=document.getElementById('btnBuscar');btn.classList.add('loading');btn.textContent='Buscando...';try{await buscarPorTitulo(titulo,true);}finally{btn.classList.remove('loading');btn.textContent='Buscar →';}setTimeout(()=>document.getElementById('resultados').scrollIntoView({behavior:'smooth'}),100);}

    async function sorprendeme(){
      const dado=document.querySelector('.sorpresa-btn');
      dado.classList.remove('rodando'); void dado.offsetWidth; dado.classList.add('rodando');
      const btn=document.getElementById('btnBuscar');btn.classList.add('loading');btn.textContent='Buscando...';
      let pool=[];
      try{
      const tipo=getTipo();const tipos=tipo==='ambos'?['movie','tv']:tipo==='pelicula'?['movie']:['tv'];
      const pagina=Math.floor(Math.random()*15)+1;let todos=[];
      for(const t of tipos){const campo=t==='movie'?'primary_release_date':'first_air_date';const excluir=t==='tv'?'16,10762':'16';
        const url=`${TMDB_PROXY}?path=/discover/${t}&language=es-ES&sort_by=popularity.desc&vote_count.gte=500&vote_average.gte=7.5&without_genres=${excluir}&${campo}.gte=1990-01-01&page=${pagina}`;
        try{const data=await(await fetch(url)).json();(data.results||[]).forEach(item=>todos.push({...item,_tipo:t,title:item.title||item.name,release_date:item.release_date||item.first_air_date}));}catch(e){}
      }
      const candidatos=excluirVistos(todos);
      pool=candidatos.length?candidatos:todos.filter(it=>!esOculta(it.id,it._tipo));
      }finally{ btn.classList.remove('loading');btn.textContent='Buscar →'; }
      let poolPonderado = pool;
      const perfil = _cargarPerfilGustoCache();
      if(perfil && perfil.generosPeso){
        poolPonderado = pool.flatMap(p=>{
          const candidato = { genre_ids: p.genre_ids||[], release_date: p.release_date, vote_average: p.vote_average };
          const score = _puntuarPorGustoEstable(candidato, perfil);
          const boletos = Math.max(1, Math.min(5, 1 + Math.round(score*4))); // más encaje con tu gusto = más papeletas, nunca cero
          return Array(boletos).fill(p);
        });
      }
      if(poolPonderado.length)await lanzarRuleta(poolPonderado);
    }

    async function lanzarRuleta(pool){
      const conPoster = pool.filter(p=>p.poster_path);
      const usados = conPoster.length ? conPoster : pool;
      const ganador = usados[Math.floor(Math.random()*usados.length)];
      const overlay=document.getElementById('ruleta-overlay');
      const track=document.getElementById('ruleta-track');
      const ITEM_W=130, REPES=4;
      let tira=[];
      for(let i=0;i<REPES;i++){ tira=tira.concat(barajar(usados)); }
      tira.push(ganador);
      overlay.style.display='flex';
      document.body.style.overflow='hidden';
      track.style.transition='none';
      track.style.transform='translateX(0)';
      track.innerHTML=tira.map(p=>`<div class="ruleta-item"><img src="${p.poster_path?'https://image.tmdb.org/t/p/w200'+p.poster_path:''}" alt=""></div>`).join('');
      void track.offsetWidth;
      const ventana=document.getElementById('ruleta-ventana');
      const offsetCentro=ventana.clientWidth/2-ITEM_W/2;
      const destino=-((tira.length-1)*ITEM_W-offsetCentro);
      requestAnimationFrame(()=>{
        track.style.transition='transform 3.2s cubic-bezier(0.12,0.85,0.15,1)';
        track.style.transform=`translateX(${destino}px)`;
      });
      await new Promise(res=>setTimeout(res,3300));
      overlay.style.display='none';
      document.body.style.overflow='';
      await abrirDetalle(ganador);
    }

    async function buscarPorTitulo(titulo,reset){
      const {q:_qTexto, anio:_qAnio}=_separarAnio(titulo);
      const personasP=_buscarPersonas(_qTexto);
      const resultados=[];
      await Promise.all(['movie','tv'].map(async t=>{
        try{const res=await fetch(`${TMDB_PROXY}?path=/search/${t}&language=es-ES&query=${encodeURIComponent(_qTexto)}${_qAnio?(t==='movie'?`&year=${_qAnio}`:`&first_air_date_year=${_qAnio}`):''}&page=1`);const data=await res.json();(data.results||[]).slice(0,5).forEach(item=>resultados.push({...item,_tipo:t,title:item.title||item.name,release_date:item.release_date||item.first_air_date}));}catch(e){}
      }));
      const ordenados=resultados.sort((a,b)=>(b.popularity||0)-(a.popularity||0));
      const idsVistos=new Set(ordenados.map(r=>`${r._tipo}-${r.id}`));const original=ordenados[0];
      if(original){
        let det=original;
        try{const r=await fetch(`${TMDB_PROXY}?path=/${original._tipo}/${original.id}&language=es-ES`);det={...(await r.json()),_tipo:original._tipo};det.title=det.title||det.name;}catch(e){}
        const gOrig=(det.genres||[]).map(g=>g.id);const esAnim=gOrig.includes(16);
        const fecha=det.release_date||det.first_air_date||'';const ano=fecha?parseInt(fecha.substring(0,4)):2000;
        const gStr=gOrig.slice(0,2).join(',');
        const tipos2=original._tipo==='movie'?['movie']:['tv','movie'];
        // todas las páginas a la vez; se procesan en el orden de siempre (tipo, página)
        const pedidas=tipos2.flatMap(t=>[1,2,3].map(p=>({t,p})));
        const respuestas=await Promise.all(pedidas.map(async({t,p})=>{const campo=t==='movie'?'primary_release_date':'first_air_date';
            try{let url=`${TMDB_PROXY}?path=/discover/${t}&language=es-ES&sort_by=vote_average.desc&vote_count.gte=100&vote_average.gte=6&with_genres=${gStr}&${campo}.gte=${Math.max(1990,ano-15)}-01-01&${campo}.lte=${Math.min(ANIO_ACTUAL,ano+15)}-12-31&page=${p}`;
              if(!esAnim)url+=`&without_genres=16${t==='tv'?',10762':''}`;else if(t==='tv')url+=`&without_genres=10762`;
              return (await(await fetch(url)).json()).results||[];
            }catch(e){return [];}
        }));
        respuestas.forEach((res,k)=>{const t=pedidas[k].t;res.filter(s=>s.poster_path&&!idsVistos.has(`${t}-${s.id}`)).forEach(item=>{idsVistos.add(`${t}-${item.id}`);ordenados.push({...item,_tipo:t,title:item.title||item.name,release_date:item.release_date||item.first_air_date});});});
      }
      mostrarResultados(ordenados.slice(0,20),reset,`Resultados para «${titulo}» y parecidas`);
      _pintarPersonasBuscadas(await personasP);
    }
