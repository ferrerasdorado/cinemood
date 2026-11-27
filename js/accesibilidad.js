// CineMood · Accesibilidad con teclado y lector de pantalla
// (Se carga como script clásico: todo comparte el mismo ámbito global.)
//
// Parte de la app usa <div onclick> o <span onclick> como botones. Con el ratón o el dedo funcionan,
// pero con el teclado no se pueden alcanzar y un lector de pantalla no sabe que son botones.
// Aquí se les da el papel de botón y el foco, y se pulsan con Intro o Espacio, también a los que
// la app crea más tarde. Los <button>, enlaces y campos de formulario ya lo traen de serie.

    const _A11Y_NATIVOS = 'button, a[href], input, select, textarea, label, summary, video, audio';

    function _a11yMarcar(raiz){
      const els = raiz.querySelectorAll ? raiz.querySelectorAll('[onclick]') : [];
      const lista = raiz.matches && raiz.matches('[onclick]') ? [raiz, ...els] : els;
      for(const el of lista){
        if(el.matches(_A11Y_NATIVOS) || el.closest('[aria-hidden="true"]')) continue;
        if(!el.hasAttribute('role')) el.setAttribute('role','button');
        if(!el.hasAttribute('tabindex')) el.tabIndex = 0;
      }
    }
    function _a11yIniciar(){
      _a11yMarcar(document.body);
      new MutationObserver(cambios=>{
        for(const c of cambios) for(const n of c.addedNodes) if(n.nodeType===1) _a11yMarcar(n);
      }).observe(document.body, {childList:true, subtree:true});
      // Intro o Espacio pulsan un «botón» que no es <button> (salvo que ya tenga su propio manejo)
      document.addEventListener('keydown', e=>{
        if(e.key!=='Enter' && e.key!==' ') return;
        const el = e.target;
        if(!(el instanceof Element) || el.matches(_A11Y_NATIVOS) || el.getAttribute('role')!=='button' || el.hasAttribute('onkeydown')) return;
        e.preventDefault();
        el.click();
      });
    }
