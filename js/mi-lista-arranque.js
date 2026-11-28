// CineMood · Mi lista: lo que se ejecuta al cargar
// (Parte de index.html; se carga como script clásico: todo comparte el mismo ámbito global.)

    // Gesto de deslizar sobre las filas de «Pendientes»
    (function(){
      let fila=null, card=null, x0=0, y0=0, dx=0, decidido=false;
      document.addEventListener('touchstart', e=>{
        const f = e.target.closest && e.target.closest('#biblioteca-lista .ml-swipe'); if(!f || e.touches.length!==1) return;
        if(e.touches[0].clientX < 24) return;   // desde el borde es el gesto de «atrás», no el de la fila
        fila = f; card = f.querySelector('.ml-fila'); x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; dx = 0; decidido = false;
      }, {passive:true});
      document.addEventListener('touchmove', e=>{
        if(!fila) return;
        const mx = e.touches[0].clientX-x0, my = e.touches[0].clientY-y0;
        if(!decidido){ if(Math.abs(mx)<10 && Math.abs(my)<10) return; if(Math.abs(my)>Math.abs(mx)){ fila = null; return; } decidido = true; card.style.transition = 'none'; }
        e.preventDefault(); dx = mx;
        card.style.transform = `translateX(${dx}px)`;
        fila.classList.toggle('a-vista', dx<0); fila.classList.toggle('a-quitar', dx>0);
      }, {passive:false});
      const fin = ()=>{
        if(!fila) return; const f = fila, c = card; fila = null;
        if(!decidido){ return; }
        const umbral = f.clientWidth*0.33;
        c.style.transition = 'transform 0.2s ease-out';
        if(Math.abs(dx) < umbral){ c.style.transform = ''; return; }
        c.style.transform = `translateX(${dx<0?'-':''}110%)`;
        const id = Number(c.dataset.id), d = dx;   // se fija ya: otro toque podría cambiar dx antes del temporizador
        setTimeout(async ()=>{
          try{ await (d<0 ? _mlCambiarEstado(id,{visto:true,pendiente:false}) : _mlCambiarEstado(id,{pendiente:false})); }
          catch(e){ c.style.transform = ''; f.classList.remove('a-vista','a-quitar'); }
        }, 180);
      };
      document.addEventListener('touchend', fin, {passive:true});
      document.addEventListener('touchcancel', fin, {passive:true});
    })();
