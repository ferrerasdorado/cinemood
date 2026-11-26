// CineMood · Modo TV: navegación con las flechas del mando
// (Parte de index.html; se carga como script clásico: todo comparte el mismo ámbito global.)

  // ══ MODO TV: navegación espacial rápida con las flechas del mando (OK = pulsar, Atrás = volver) ══
  (function(){
    if(!document.documentElement.classList.contains('modo-tv')) return;
    const SEL = 'a[href], button, input, select, textarea, [onclick], [role="button"], .desc-card, .similar-card, .especial-tile';
    const HSCROLL_SEL = '.desc-scroll, .similares-scroll, .reparto-scroll, .especiales-scroll, .sem-fila, .hoy-cine-fila, .videos-tira, .galeria-tira, .d-puntuacion-row, .pc-nav, .exp-chips, .sim-filtros, .osc-ediciones, .desc-plataformas, .desc-gen-scroll, .fm-top, .fm-generos, .colab-fila, #continuar-viendo-scroll';
    const VSCROLL_SEL = '.fte-sheet, #cm-subtitles, .juntos-hoja, #col-overlay, #maraton-overlay, #propina-overlay, #gate';

    // Comprobación rápida sin recalcular estilos de cada nodo
    function esVisibleRapido(el){
      if(!el || el.disabled || el.hidden) return null;
      if(el.offsetParent === null){
        const pos = el.style.position || getComputedStyle(el).position;
        if(pos !== 'fixed' && pos !== 'sticky') return null;
      }
      const r = el.getBoundingClientRect();
      return (r.width > 2 && r.height > 2) ? r : null;
    }

    // Capa modal superior abierta en este instante (evita buscar en diálogos cerrados)
    function capaActiva(){
      if(document.body.classList.contains('sin-sesion')){
        const g = document.getElementById('gate');
        if(g && esVisibleRapido(g)) return g;
      }
      const visor = document.getElementById('visor');
      if(visor && visor.classList.contains('activo')) return visor;
      const fte = document.getElementById('fuentes-modal');
      if(fte && fte.classList.contains('activo')) return fte.querySelector('.fte-sheet') || fte;
      const lp = document.getElementById('lp-menu');
      if(lp && lp.classList.contains('on')) return lp;
      for(const id of ['video-visor','juntos-hoja','galeria-visor','feed-overlay','col-overlay','maraton-overlay','propina-overlay','nas-modal']){
        const el = document.getElementById(id);
        if(el && el.style.display && el.style.display !== 'none' && esVisibleRapido(el)) return el;
      }
      return null;
    }

    // Devuelve [{el, r}] midiendo cada rectángulo una sola vez
    function candidatosConRect(){
      const capa = capaActiva();
      const zonas = capa ? [capa] : [
        document.getElementById('aviso-version'),
        document.querySelector('.pc-nav'),
        document.querySelector('.pantalla.activa')
      ].filter(z=>z && esVisibleRapido(z));
      const vistos = new Set(), out = [];
      for(const z of zonas){
        const nodos = z.querySelectorAll(SEL);
        for(let i = 0; i < nodos.length; i++){
          const el = nodos[i];
          if(vistos.has(el)) continue;
          const esControlDirecto = el.matches('button, input, select, textarea, a[href], summary');
          if(!esControlDirecto && el.parentElement && el.parentElement.closest('.desc-card, .similar-card, .especial-tile, [onclick]:not(body)')) continue;
          const r = esVisibleRapido(el);
          if(!r) continue;
          vistos.add(el);
          out.push({el, r});
        }
      }
      return out;
    }

    let actual = null;
    function desplazarContenedor(el){
      const hs = el.closest(HSCROLL_SEL);
      if(hs && hs.scrollWidth > hs.clientWidth + 4){
        const er = el.getBoundingClientRect(), hr = hs.getBoundingClientRect(), pad = 36;
        if(er.left < hr.left + pad) hs.scrollLeft -= (hr.left + pad - er.left);
        else if(er.right > hr.right - pad) hs.scrollLeft += (er.right - (hr.right - pad));
      }
      const vs = el.closest(VSCROLL_SEL);
      const r = el.getBoundingClientRect();
      if(vs && vs.scrollHeight > vs.clientHeight + 4){
        const vr = vs.getBoundingClientRect(), pad = 48;
        if(r.top < vr.top + pad) vs.scrollTop -= (vr.top + pad - r.top);
        else if(r.bottom > vr.bottom - pad) vs.scrollTop += (r.bottom - (vr.bottom - pad));
      } else {
        if(r.top < 86) window.scrollBy(0, r.top - 106);
        else if(r.bottom > innerHeight - 64) window.scrollBy(0, r.bottom - innerHeight + 96);
      }
    }

    function enfocar(el){
      if(!el) return;
      if(actual && actual !== el) actual.classList.remove('tv-foco');
      actual = el; el.classList.add('tv-foco');
      if(!el.hasAttribute('tabindex') && !el.matches('a[href], button, input, select, textarea, summary')) el.setAttribute('tabindex','-1');
      if(el.matches('input:not([type=button]):not([type=checkbox]):not([type=radio]):not([type=range]), textarea')){
        if(document.activeElement && document.activeElement !== el) document.activeElement.blur();
      } else {
        try{ el.focus({preventScroll:true}); }catch(e){}
      }
      desplazarContenedor(el);
    }

    function elegirInicial(cs){
      if(!cs.length) return null;
      const capa = capaActiva();
      const pref = capa ? cs : cs.filter(c=>c.el.closest('.pantalla.activa'));
      const lista = pref.length ? pref : cs;
      const enVista = lista.find(c=>c.r.top >= 40 && c.r.top < innerHeight - 40);
      return (enVista || lista[0]).el;
    }

    function mover(dir){
      const cs = candidatosConRect();
      if(!cs.length) return;
      const itemActual = actual && document.contains(actual) ? cs.find(c=>c.el === actual) : null;
      if(!itemActual){ enfocar(elegirInicial(cs)); return; }
      const a = itemActual.r, ax = a.left + a.width/2, ay = a.top + a.height/2;
      const filaActual = actual.closest(HSCROLL_SEL);
      // la barra fija de arriba: desde ella, «arriba» no tiene a dónde ir (se vuelve al principio de la página);
      // desde el contenido, solo se llega a ella cuando no queda nada más arriba
      const enBarra = !!actual.closest('.pc-nav');
      if(enBarra && dir === 'arriba'){ window.scrollTo(0, 0); return; }
      const finBarra = enBarra ? (actual.closest('.pc-nav').getBoundingClientRect().bottom - 2) : 0;
      let mejor = null, md = Infinity;
      for(let i = 0; i < cs.length; i++){
        const {el, r} = cs[i];
        if(el === actual || actual.contains(el) || el.contains(actual)) continue;
        const x = r.left + r.width/2, y = r.top + r.height/2, dx = x - ax, dy = y - ay;
        let ok = false, d = Infinity;
        // izquierda/derecha: solo dentro de la misma franja de altura (antes saltaba a la barra de arriba desde el final de una fila)
        const solapaY = r.top < a.bottom - 4 && r.bottom > a.top + 4;
        if(dir === 'derecha'){
          ok = solapaY && (r.left >= a.right - 6 || dx > 10);
          const penalFila = (filaActual && el.closest(HSCROLL_SEL) === filaActual) ? 0 : Math.abs(dy) * 1.5;
          d = Math.abs(dx) + Math.abs(dy) * 2.8 + penalFila;
        } else if(dir === 'izquierda'){
          ok = solapaY && (r.right <= a.left + 6 || dx < -10);
          const penalFila = (filaActual && el.closest(HSCROLL_SEL) === filaActual) ? 0 : Math.abs(dy) * 1.5;
          d = Math.abs(dx) + Math.abs(dy) * 2.8 + penalFila;
        } else if(dir === 'abajo'){
          const solapaX = r.left < a.right && r.right > a.left;
          ok = r.top >= a.bottom - 6 || (dy > a.height * 0.6 && !solapaX && Math.abs(dy) > Math.abs(dx) * 0.35);
          d = Math.max(0, r.top - a.bottom) * 1.4 + (solapaX ? Math.abs(dx) * 0.15 : Math.abs(dx) * 0.65);
        } else if(dir === 'arriba'){
          const solapaX = r.left < a.right && r.right > a.left;
          ok = r.bottom <= a.top + 6 || (dy < -a.height * 0.6 && !solapaX && Math.abs(dy) > Math.abs(dx) * 0.35);
          d = Math.max(0, a.top - r.bottom) * 1.4 + (solapaX ? Math.abs(dx) * 0.15 : Math.abs(dx) * 0.65);
        }
        if(ok && !enBarra && el.closest('.pc-nav')) d += 100000;
        else if(ok && enBarra && dir === 'abajo' && r.top < finBarra) ok = false;
        if(ok && d < md){ md = d; mejor = el; }
      }
      if(mejor) enfocar(mejor);
    }

    // Si la tele va justa, las pulsaciones no se encolan (antes seguía moviéndose al soltar la flecha):
    // como mucho un movimiento por fotograma, y con la flecha mantenida uno cada 110 ms
    let dirPend = null, rafMover = 0, ultMover = 0;
    function pedirMover(dir, repetida){
      if(repetida && performance.now() - ultMover < 110) return;
      dirPend = dir;
      if(rafMover) return;
      rafMover = requestAnimationFrame(()=>{ rafMover = 0; const d = dirPend; dirPend = null; ultMover = performance.now(); if(d) mover(d); });
    }

    document.addEventListener('keydown', e=>{
      const k = e.key, kc = e.keyCode;
      const ae = document.activeElement;
      const enTexto = ae && /^(INPUT|TEXTAREA)$/.test(ae.tagName) && !/^(button|checkbox|radio|range)$/.test(ae.type||'');
      const enSelect = ae && ae.tagName === 'SELECT';
      // Si el visor web HTML5 está abierto y el foco está en el <video>, dejar controles de vídeo salvo Atrás
      if(document.getElementById('visor')?.classList.contains('activo') && ae && ae.id === 'visor-video' && k !== 'Escape' && k !== 'GoBack' && k !== 'BrowserBack'){
        if(k === 'ArrowUp'){ e.preventDefault(); mover('arriba'); }
        return;
      }
      const dirs = {ArrowRight:'derecha', ArrowLeft:'izquierda', ArrowDown:'abajo', ArrowUp:'arriba'};
      if(dirs[k]){
        if(enSelect && (k === 'ArrowUp' || k === 'ArrowDown')) return;
        if(enTexto && (k === 'ArrowLeft' || k==='ArrowRight')) return;
        if(enTexto) ae.blur();
        e.preventDefault();
        pedirMover(dirs[k], e.repeat);
        return;
      }
      const esOk = (k === 'Enter' || k === ' ' || kc === 23 || kc === 66);
      if(esOk && actual){
        if(e.repeat){ e.preventDefault(); return; }
        if(!enTexto && actual.matches('input:not([type=button]):not([type=checkbox]):not([type=radio]):not([type=range]), textarea')){
          e.preventDefault();
          actual.focus();
          if(window.CineMoodTV && typeof window.CineMoodTV.mostrarTeclado === 'function') window.CineMoodTV.mostrarTeclado();
          return;
        }
        if(actual.tagName === 'SELECT'){
          if(actual.showPicker){ e.preventDefault(); try{ actual.showPicker(); }catch(err){} }
          return;
        }
        if(!enTexto && !actual.matches('a[href], button, summary, input[type=checkbox], input[type=radio]')){
          e.preventDefault();
          actual.click();
          return;
        }
      }
      if(k === 'Escape' || k === 'GoBack' || k === 'BrowserBack' || kc === 4){
        if(window._cmCerrarCapaOAtras && window._cmCerrarCapaOAtras()){
          e.preventDefault();
          e.stopPropagation();
        }
      }
    }, true);

    // Revalidar foco tras cambios reales en pantallas o modales (agrupado por fotograma, sin saturar CPU)
    let rafFoco = 0, timerFoco = 0;
    function programarRevisionFoco(){
      if(rafFoco) return;
      rafFoco = setTimeout(()=>{
        rafFoco = 0;
        const capa = capaActiva();
        const perdido = !actual || !document.contains(actual) || !esVisibleRapido(actual) || (capa && !capa.contains(actual));
        if(perdido){
          if(actual) actual.classList.remove('tv-foco');
          actual = null;
          clearTimeout(timerFoco);
          timerFoco = setTimeout(()=>{ if(!actual){ const cs = candidatosConRect(); if(cs.length) enfocar(elegirInicial(cs)); } }, 90);
        }
      }, 250);
    }
    new MutationObserver(muts=>{
      for(let i = 0; i < muts.length; i++){
        const m = muts[i];
        if(m.type === 'childList'){ programarRevisionFoco(); return; }
        if(m.type === 'attributes' && m.target !== actual){ programarRevisionFoco(); return; }
      }
    }).observe(document.body, {subtree:true, childList:true, attributes:true, attributeFilter:['class','hidden','style']});
    window.addEventListener('load', ()=>setTimeout(()=>{ if(!actual) mover('abajo'); }, 450));
  })();
