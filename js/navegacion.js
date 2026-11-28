// CineMood · Cabecera fija y navegación entre pantallas (historial, atrás)
// (Parte de index.html; se carga como script clásico: todo comparte el mismo ámbito global.)

    // ══ CABECERA FIJA ══════════════════════════════════════════════════
    // Mide la barra de PC y la cabecera para colocar elementos fijos debajo, y activa el "cristal" al hacer scroll
    function _medirCabeceras(){
      const nav = document.querySelector('.pc-nav');
      const navH = (nav && nav.offsetParent !== null) ? nav.offsetHeight : 0;
      document.documentElement.style.setProperty('--nav-h', navH + 'px');
      const cab = document.querySelector('.pantalla.activa .pantalla-header');
      if(cab) document.documentElement.style.setProperty('--cab-h', cab.offsetHeight + 'px');
    }
    function _actualizarCabeceraFija(){
      const cab = document.querySelector('.pantalla.activa .pantalla-header');
      if(cab) cab.classList.toggle('cab-fija', window.scrollY > 6);
    }
    let _cabRaf = null;
    const _TAB_DE_PANTALLA = {'p-descubre':'descubre','p-descubre-todo':'descubre','p-buscar':'buscar','p-inicio':'inicio','p-comparador':'inicio','p-biblioteca':'milista','p-resumen':'cuenta','p-especiales-hub':'descubre','p-explorar':'descubre','p-especial':'descubre','p-escaner':'buscar','p-mundial':'inicio','p-noche':'inicio',
      'p-cuenta':'cuenta','p-puntuar':'cuenta','p-logros':'cuenta','p-ranking':'cuenta','p-addons':'cuenta','p-videos':'cuenta','p-nas':'cuenta','p-acerca':'cuenta','p-estadisticas':'cuenta','p-wrapped':'cuenta','p-actividad':'cuenta','p-perfil-gusto':'cuenta','p-evolucion-gusto':'cuenta','p-mapa-cine':'cuenta','p-nueva-password':'cuenta'};
    function _tabActualizar(id){
      const t = _TAB_DE_PANTALLA[id]; if(!t) return;   // en fichas y personas se mantiene la pestaña de la que vienes
      document.querySelectorAll('#tabbar .tab').forEach(b=>b.classList.toggle('activo', b.dataset.tab===t));
    }
    function tabIr(tab){
      window._navRaiz = true; // las pestañas empiezan un camino nuevo: «atrás» desde ellas solo lleva a Inicio
      setTimeout(()=>{ window._navRaiz = false; }, 0);
      const actual = document.querySelector('.pantalla.activa');
      const raiz = {inicio:'p-inicio', milista:'p-biblioteca', descubre:'p-descubre', buscar:'p-buscar', especiales:'p-especiales-hub', cuenta:'p-cuenta'}[tab];
      if(actual && actual.id===raiz){ window.scrollTo({top:0, behavior:'smooth'}); if(tab==='buscar') document.getElementById('buscar-input').focus(); return; }
      if(tab==='buscar'){ abrirBuscar(); return; }
      if(tab==='descubre'){ abrirDescubre(); return; }
      if(tab==='inicio') irA('p-inicio', true);
      else if(tab==='milista') abrirBiblioteca();
      else if(tab==='especiales'){ irA('p-especiales-hub', true); renderEspecialesTiles(); }
      else if(tab==='trailers') abrirFeedTrailers();
      else mostrarCuenta();
    }
    function irA(id, restaurar, desdeHistorial) {
      if(id!=='p-escaner' && window._escStream) pararEscanerVivo(); // la cámara se apaga al salir del escáner
      const _esRaiz = !!window._navRaiz;
      // los botones «‹ Atrás» que llevan a la pantalla anterior retroceden en el historial (así no se acumulan pasos)
      if(!desdeHistorial && window._navRaiz){ window._navRaiz = false; if(_navIrARaiz(id, restaurar)) return; }
      if(!desdeHistorial && _navEsAtras(id)){ history.back(); return; }
      const actual = document.querySelector('.pantalla.activa');
      if(actual && actual.id !== id) window.__posPantalla[actual.id] = window.scrollY;
      if(actual && actual.id==='p-descubre' && id!=='p-descubre' && typeof _descHeroParar==='function') _descHeroParar();
      document.querySelectorAll('.pantalla').forEach(p=>p.classList.remove('activa'));
      const nueva = document.getElementById(id);
      nueva.classList.add('activa');
      // animación: entra por la derecha al avanzar, por la izquierda al volver y con fundido entre pestañas
      if(actual && actual.id!==id){
        const anim = window._animForzada || (window._sinAnim ? '' : desdeHistorial ? 'anim-atras' : _esRaiz ? 'anim-fundido' : 'anim-adelante');
        window._animForzada = ''; window._sinAnim = false;
        nueva.classList.remove('anim-adelante','anim-atras','anim-fundido');
        if(anim){ void nueva.offsetWidth; nueva.classList.add(anim); clearTimeout(nueva._animT); nueva._animT = setTimeout(()=>nueva.classList.remove(anim), 400); }
      }
      _tabActualizar(id);
      window.scrollTo(0, restaurar ? (window.__posPantalla[id] || 0) : 0);
      if(id==='p-especial' && typeof _tlActualizarScroll==='function') requestAnimationFrame(_tlActualizarScroll);
      requestAnimationFrame(()=>{ _medirCabeceras(); _actualizarCabeceraFija(); });
      _navRegistrar(id, desdeHistorial);
    }
    function _claveFicha(){ return peliculaActual ? `${peliculaActual._tipo}:${peliculaActual.id}` : ''; }
    function _navEstado(){ return window._nav || (window._nav = {i:0, pila:[{p:'p-inicio', f:''}]}); }
    function _navEsAtras(id){
      const n = _navEstado(), previa = n.pila[n.i-1];
      return !!previa && previa.p===id && previa.f===_navClave(id);
    }
    // Fichas y páginas de persona llevan su propia clave: así «atrás» vuelve de una película a otra, o de una persona a otra
    function _navClave(id){ return id==='p-detalle' ? _claveFicha() : id==='p-persona' && window._personaArgs ? `persona:${window._personaArgs.id}` : ''; }
    function _navRegistrar(id, desdeHistorial){
      if(desdeHistorial) return;
      const f = _navClave(id);
      if(f) (window._fichasHist = window._fichasHist || {})[f] = id==='p-persona' ? {...window._personaArgs} : peliculaActual;
      const n = _navEstado(), cur = n.pila[n.i];
      if(cur && cur.p===id && cur.f===f) return;
      n.pila.length = n.i+1; n.pila.push({p:id, f}); n.i++;
      try{ history.pushState({cm:1, p:id, f, i:n.i}, ''); }catch(e){}
    }
    // Lo que se abre encima de la pantalla (reproductor, fuentes, tráilers, menús, ventanas): «atrás» lo cierra primero
    function _navCapaAbierta(){
      const vis = id => { const el = document.getElementById(id); return el && el.style.display && el.style.display!=='none' ? el : null; };
      if(document.getElementById('visor')?.classList.contains('activo')) return {el:document.getElementById('visor'), cerrar:cerrarVisor};
      if(document.getElementById('fuentes-modal')?.classList.contains('activo')) return {el:document.getElementById('fuentes-modal'), cerrar:cerrarFuentes};
      const dlg = document.querySelector('.cm-dlg-fondo');   // ventana de confirmar o escribir: atrás la cancela
      if(dlg && dlg._cerrar) return {el:dlg, cerrar:()=>dlg._cerrar()};
      if(document.getElementById('lp-menu')?.classList.contains('on')) return {el:document.getElementById('lp-menu'), cerrar:cerrarMenuLp};
      for(const [id,cerrar] of [['video-visor',()=>cerrarVideo()],['juntos-hoja',()=>cerrarJuntos()],['galeria-visor',()=>cerrarGaleria()],['feed-overlay',()=>cerrarFeedTrailers()],['col-overlay',()=>cerrarColOverlay()],['maraton-overlay',()=>cerrarMaraton()],['propina-overlay',()=>cerrarPropina()]]){
        const el = vis(id); if(el) return {el, cerrar};
      }
      return null;
    }
    // Pestañas de abajo: el historial se queda en «Inicio → pestaña», así «atrás» no recorre todo lo que has visitado
    function _navIrARaiz(id, restaurar){
      const n = _navEstado();
      if(id==='p-inicio'){ if(n.i>0){ window._navPend = {p:id}; history.go(-n.i); return true; } return false; }
      if(n.i===0) return false; // desde Inicio: se añade como un paso normal
      if(n.i===1){
        irA(id, restaurar, true);
        n.pila.length = 2; n.pila[1] = {p:id, f:''};
        try{ history.replaceState({cm:1, p:id, f:'', i:1}, ''); }catch(e){}
        return true;
      }
      window._navPend = {p:id}; history.go(-(n.i-1)); return true;
    }
    function selectTipo(el) { document.querySelectorAll('.tipo-btn').forEach(b=>b.classList.remove('active')); el.classList.add('active'); renderGeneros(); actualizarContador(); }
    function selectMood(el) {
      el.classList.toggle('active');
      document.querySelectorAll('.genre-chip.active').forEach(c=>c.classList.remove('active'));
      actualizarContador();
    }
    function selectTono(el) {
      el.classList.toggle('active');
      document.querySelectorAll('.genre-chip.active').forEach(c=>c.classList.remove('active'));
      actualizarContador();
    }
    function toggleChip(el) {
      el.classList.toggle('active');
      document.querySelectorAll('.mood-btn.active, #tones .tone-pill.active').forEach(c=>c.classList.remove('active'));
      actualizarContador();
    }
    function togglePlataforma(el) { el.classList.toggle('active'); actualizarContador(); }
    function togglePunt(el) { el.classList.toggle('active'); actualizarContador(); }
    function toggleYear() {
      yearActivo = !yearActivo;
      document.getElementById('year-section').style.display = yearActivo ? 'block' : 'none';
      document.getElementById('year-toggle-label').textContent = yearActivo ? '▾ filtrar por año' : '▸ desde 1990';
      actualizarContador();
    }
    function actualizarAnos() {
      document.getElementById('val-desde').textContent = document.getElementById('year-desde').value;
      document.getElementById('val-hasta').textContent = document.getElementById('year-hasta').value;
    }
    function actualizarContador() {
      const total = document.querySelectorAll('.mood-btn.active, #tones .tone-pill.active, .genre-chip.active, .platform-chip.active, .punt-chip.active').length + (yearActivo?1:0);
      const div = document.getElementById('filtros-count');
      div.innerHTML = total > 0 ? `<span>${total}</span> filtro${total!==1?'s':''} activo${total!==1?'s':''}` : '';
    }
    function limpiarTodo() {
      document.querySelectorAll('.mood-btn,.tone-pill,.platform-chip,.punt-chip').forEach(el=>el.classList.remove('active'));
      document.querySelectorAll('.genre-chip').forEach(el=>el.classList.remove('active'));
      document.querySelector('.tipo-btn[data-tipo="ambos"]').classList.add('active');
      if (yearActivo) toggleYear();
      document.getElementById('year-desde').value = 1990;
      document.getElementById('year-hasta').value = ANIO_ACTUAL;
      actualizarAnos(); actualizarContador();
    }
    function getTipo() { const a=document.querySelector('.tipo-btn.active'); return a?a.dataset.tipo:'ambos'; }
    function getPuntuacion() {
      const activos=[...document.querySelectorAll('.punt-chip.active')];
      if(!activos.length) return {min:0,max:10};
      return {min:Math.min(...activos.map(a=>parseFloat(a.dataset.min))),max:Math.max(...activos.map(a=>parseFloat(a.dataset.max)))};
    }
