// CineMood · Registro del service worker y aviso de nueva versión
// (Parte de index.html; se carga como script clásico: todo comparte el mismo ámbito global.)

    if('serviceWorker' in navigator && window.isSecureContext){
      navigator.serviceWorker.register('sw.js').catch(()=>{});
      // hay una versión nueva descargada: se ofrece actualizar (la app se abre siempre al instante con la guardada)
      navigator.serviceWorker.addEventListener('message', e=>{
        if(!e.data || e.data.tipo!=='nueva-version' || document.getElementById('aviso-version')) return;
        const d = document.createElement('div'); d.id = 'aviso-version'; d.className = 'aviso-version';
        d.innerHTML = '<span>✨ Hay una versión nueva de CineMood</span><button type="button" onclick="location.reload()">Actualizar</button>';
        document.body.appendChild(d);
      });
    }
