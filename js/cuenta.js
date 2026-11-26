// CineMood · Cuenta: saludo, uso, panel de usuarios, avisos push y tu ADN de cine
// (Parte de index.html; se carga como script clásico: todo comparte el mismo ámbito global.)

    // ══ SALUDO: «Hola, Alfred 👋» bajo la marca (el nombre se pone desde el panel de usuarios) ══
    function _saludoPoner(nombre){
      const t = nombre ? `Hola, ${nombre} 👋` : '';
      ['saludo-movil','saludo-pc'].forEach(id=>{ const e = document.getElementById(id); if(e) e.textContent = t; });
    }
    async function _pintarSaludo(){
      if(!sesionActual){ _saludoPoner(''); return; }
      const uid = sesionActual.user.id;
      _saludoPoner(String(sesionActual.user.user_metadata?.nombre || '').trim());
      // la sesión guardada puede traer el nombre antiguo: se pregunta al servidor el actual
      try{ const {data} = await sb.auth.getUser(); if(data?.user && sesionActual?.user.id===uid) _saludoPoner(String(data.user.user_metadata?.nombre || '').trim()); }catch(e){}
    }
    // ══ USO DE LA APP: se apunta cuándo se abre (como mucho cada 30 min por aparato) para el panel de usuarios ══
    function _dispositivo(){
      const ua = navigator.userAgent;
      if(/CineMoodTV/.test(ua) || document.documentElement.classList.contains('modo-tv')) return 'Tele';
      if(/iPhone/.test(ua)) return 'iPhone'; if(/iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'iPad';
      if(/Android/.test(ua)) return /Mobile/.test(ua) ? 'Android' : 'Tablet Android';
      if(/Macintosh/.test(ua)) return 'Mac'; if(/Windows/.test(ua)) return 'Windows'; return 'Ordenador';
    }
    async function _accesoRegistrar(){
      if(!sesionActual) return;
      const k = 'cm:accesoApuntado:' + sesionActual.user.id;
      try{ if(Date.now() - (Number(localStorage.getItem(k))||0) < 30*60e3) return; }catch(e){}
      try{ const {error} = await sb.rpc('cm_registrar_acceso', {disp: _dispositivo()}); if(!error) localStorage.setItem(k, String(Date.now())); }catch(e){}
    }
    async function _adminApi(body){
      const {data} = await sb.auth.getSession(); if(!data.session) throw Error('Inicia sesión en CineMood.');
      const r = await fetch(_ADMIN_FN, {method:'POST', headers:{Authorization:'Bearer '+data.session.access_token, apikey:SUPABASE_KEY, 'Content-Type':'application/json'}, credentials:'omit', body:JSON.stringify(body)});
      let d = null; try{ d = await r.json(); }catch(e){}
      if(r.status===404) throw Error('Falta subir la función «cinemood-admin» a Supabase.');
      if(!r.ok || !d) throw Error((d && d.error) || 'No se ha podido conectar (' + r.status + ').');
      return d;
    }
    async function _esAdmin(){
      if(!sesionActual) return false;
      const k = 'cm:admin:' + sesionActual.user.id;
      try{ const c = localStorage.getItem(k); if(c==='1') return true; }catch(e){}
      try{ const {data, error} = await sb.from('cm_admins').select('user_id').eq('user_id', sesionActual.user.id).maybeSingle(); if(!error && data){ localStorage.setItem(k, '1'); return true; } }catch(e){}
      return false;
    }
    function _admHace(f){
      if(!f) return null;
      const s = (Date.now() - new Date(f).getTime())/1000;
      if(s < 90) return 'ahora mismo';
      if(s < 3600) return `hace ${Math.round(s/60)} min`;
      if(s < 86400) { const h = Math.round(s/3600); return `hace ${h} ${h===1?'hora':'horas'}`; }
      const d = Math.round(s/86400);
      if(d === 1) return 'ayer';
      if(d < 30) return `hace ${d} días`;
      return new Date(f).toLocaleDateString('es-ES', {day:'numeric', month:'short', year:'numeric'});
    }
    function _admFecha(f){ return f ? new Date(f).toLocaleString('es-ES', {day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit'}) : '—'; }
    function _admClaveNueva(){
      const sil = ['ba','be','bi','bo','ca','ce','ci','co','da','de','di','do','fa','fe','fi','la','le','li','lo','ma','me','mi','mo','na','ne','no','pa','pe','pi','po','ra','re','ri','ro','sa','se','si','so','ta','te','ti','to','va','ve','vi','vo'];
      const r = n => { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % n; };
      let p = ''; for(let i=0;i<4;i++) p += sil[r(sil.length)];
      return p.charAt(0).toUpperCase() + p.slice(1) + '-' + (10 + r(90));
    }
    let _admUsuarios = [];
    async function _adminPintar(){
      const box = document.getElementById('admin-caja'); if(!box) return;
      if(!(await _esAdmin())){ box.style.display = 'none'; box.innerHTML = ''; return; }
      box.style.display = 'block';
      if(!box.dataset.listo){
        box.dataset.listo = '1';
        box.innerHTML = `<div class="section-label">👥 Usuarios de CineMood</div>
          <div class="adm-resumen">Solo lo ves tú. Crea cuentas para que otros puedan entrar y mira quién la usa.</div>
          <div class="adm-form">
            <input class="auth-input" id="adm-email" type="email" placeholder="Email" autocomplete="off" autocapitalize="off">
            <input class="auth-input" id="adm-nombre" type="text" placeholder="Nombre (opcional)" autocomplete="off">
            <div class="adm-clave"><input class="auth-input" id="adm-clave" type="text" placeholder="Contraseña (mín. 8)" autocomplete="new-password" autocapitalize="off" spellcheck="false"><button type="button" class="adm-btn" onclick="document.getElementById('adm-clave').value=_admClaveNueva()">🎲 Inventar</button></div>
            <button type="button" class="adm-btn prim" id="adm-crear" onclick="adminCrear(this)">Crear usuario</button>
          </div>
          <div id="adm-msg" class="adm-msg" role="status"></div>
          <div id="adm-lista"><div class="adm-msg">Cargando usuarios…</div></div>
          <hr class="section-divider">`;
      }
      adminCargar();
    }
    async function adminCargar(){
      const lista = document.getElementById('adm-lista'); if(!lista) return;
      try{
        const d = await _adminApi({accion:'listar'});
        _admUsuarios = d.usuarios || [];
        const activos = _admUsuarios.filter(u=>u.ultimo_uso && Date.now()-new Date(u.ultimo_uso) < 7*864e5).length;
        lista.innerHTML = `<div class="adm-resumen">${_admUsuarios.length} ${_admUsuarios.length===1?'cuenta':'cuentas'} · ${activos} ${activos===1?'la ha usado':'la han usado'} esta semana <button type="button" class="adm-btn peq" style="margin-left:6px" onclick="adminCargar()">↻</button></div>` +
          _admUsuarios.map((u,i)=>{
            const uso = u.ultimo_uso ? `🕒 Último uso: <b>${_admHace(u.ultimo_uso)}</b>${u.dispositivo ? ' · en ' + _escHtml(u.dispositivo) : ''}${u.veces ? ` · ${u.veces} ${u.veces===1?'vez':'veces'}` : ''}`
              : u.ultimo_login ? `🕒 Último inicio de sesión: <b>${_admHace(u.ultimo_login)}</b>` : '🕒 Todavía no ha entrado';
            const tags = (u.yo ? '<span class="adm-tag verde">Tú</span>' : '') + (u.bloqueado ? '<span class="adm-tag rojo">Bloqueado</span>' : '') + (!u.ultimo_login && !u.ultimo_uso ? '<span class="adm-tag">Nuevo</span>' : '');
            return `<div class="adm-usu"><b>${_escHtml(u.nombre || u.email.split('@')[0])}</b>${tags}
              <div class="adm-sub">${_escHtml(u.email)}</div>
              <div class="adm-uso">${uso}</div>
              <div class="adm-sub">Inició sesión por última vez: <span style="white-space:nowrap">${_admFecha(u.ultimo_login)}</span> · Cuenta creada: <span style="white-space:nowrap">${_admFecha(u.creado)}</span></div>
              ${u.yo ? `<div class="adm-acc"><button type="button" class="adm-btn peq" onclick="adminNombre(${i}, this)">✏️ Nombre</button></div>` : `<div class="adm-acc">
                <button type="button" class="adm-btn peq" onclick="adminCopiarDatos(${i}, this)">📋 Copiar datos</button>
                <button type="button" class="adm-btn peq" onclick="adminNombre(${i}, this)">✏️ Nombre</button>
                <button type="button" class="adm-btn peq" onclick="adminClave(${i}, this)">🔑 Cambiar contraseña</button>
                <button type="button" class="adm-btn peq" onclick="adminBloquear(${i}, this)">${u.bloqueado ? '✅ Desbloquear' : '⛔ Bloquear'}</button>
                <button type="button" class="adm-btn peq peligro" onclick="adminBorrar(${i}, this)">🗑️ Borrar</button></div>`}
            </div>`;
          }).join('');
      }catch(e){ lista.innerHTML = `<div class="adm-msg mal">${_escHtml(e.message)}</div>`; }
    }
    function _admMsg(html, tipo){ const m = document.getElementById('adm-msg'); if(m){ m.className = 'adm-msg' + (tipo ? ' ' + tipo : ''); m.innerHTML = html; } }
    async function adminCrear(btn){
      const email = document.getElementById('adm-email').value.trim(), nombre = document.getElementById('adm-nombre').value.trim(), clave = document.getElementById('adm-clave').value;
      if(!email || !clave){ _admMsg('Pon el email y la contraseña.', 'mal'); return; }
      if(clave.length < 8){ _admMsg('La contraseña tiene que tener al menos 8 caracteres.', 'mal'); return; }
      btn.disabled = true; btn.textContent = 'Creando…';
      try{
        await _adminApi({accion:'crear', email, password:clave, nombre});
        const texto = _admTextoDatos(email.toLowerCase(), clave);
        window._admTexto = texto;
        _admMsg(`✅ <b>${_escHtml(nombre || email)}</b> ya puede entrar con ese email y esa contraseña. <button type="button" class="adm-btn peq" onclick="adminCopiar(this)">📋 Copiar datos para enviárselos</button>`, 'ok');
        ['adm-email','adm-nombre','adm-clave'].forEach(id=>document.getElementById(id).value='');
        adminCargar();
      }catch(e){ _admMsg(_escHtml(e.message), 'mal'); }
      btn.disabled = false; btn.textContent = 'Crear usuario';
    }
    // Texto para enviar a alguien: página, usuario, contraseña y cómo recuperarla
    function _admTextoDatos(email, clave, cab){
      return `${cab || 'Ya puedes entrar en CineMood:'}\n${location.origin + location.pathname}\nUsuario (email): ${email}\nContraseña: ${clave || 'la que te pasé'}\n\nSi no la recuerdas: en la pantalla de entrar escribe tu email y pulsa «¿Olvidaste tu contraseña?». Te llegará un correo para poner una nueva.`;
    }
    // Las contraseñas no se guardan legibles en ningún sitio: para mandar una concreta, usa «Cambiar contraseña»
    async function adminCopiarDatos(i, btn){
      const u = _admUsuarios[i]; if(!u) return;
      window._admTexto = _admTextoDatos(u.email);
      await adminCopiar(btn);
      setTimeout(()=>{ btn.textContent = '📋 Copiar datos'; }, 2000);
    }
    async function adminCopiar(btn){
      try{ await navigator.clipboard.writeText(window._admTexto || ''); btn.textContent = '✓ Copiado'; }
      catch(e){ prompt('Copia estos datos:', window._admTexto || ''); }
    }
    async function adminClave(i, btn){
      const u = _admUsuarios[i]; if(!u) return;
      const nueva = prompt(`Nueva contraseña para ${u.email} (mín. 8 caracteres):`, _admClaveNueva());
      if(nueva==null) return;
      if(nueva.length < 8){ _admMsg('La contraseña tiene que tener al menos 8 caracteres.', 'mal'); return; }
      btn.disabled = true;
      try{
        await _adminApi({accion:'clave', id:u.id, password:nueva});
        window._admTexto = _admTextoDatos(u.email, nueva, 'Tu nueva contraseña de CineMood:');
        _admMsg(`✅ Contraseña cambiada para <b>${_escHtml(u.email)}</b>. <button type="button" class="adm-btn peq" onclick="adminCopiar(this)">📋 Copiar para enviársela</button>`, 'ok');
      }catch(e){ _admMsg(_escHtml(e.message), 'mal'); }
      btn.disabled = false;
    }
    async function adminNombre(i, btn){
      const u = _admUsuarios[i]; if(!u) return;
      const nuevo = prompt(`Nombre para ${u.email} (sale como «Hola, …» al entrar). Déjalo vacío para quitarlo:`, u.nombre || '');
      if(nuevo==null) return;
      btn.disabled = true;
      try{
        await _adminApi({accion:'nombre', id:u.id, nombre:nuevo.trim()});
        _admMsg(nuevo.trim() ? `✅ Ahora a ${_escHtml(u.email)} le saldrá «Hola, ${_escHtml(nuevo.trim())} 👋».` : `✅ Nombre quitado.`, 'ok');
        if(u.yo) _pintarSaludo();
        adminCargar();
      }catch(e){ _admMsg(_escHtml(e.message), 'mal'); btn.disabled = false; }
    }
    async function adminBloquear(i, btn){
      const u = _admUsuarios[i]; if(!u) return;
      if(!u.bloqueado && !confirm(`¿Bloquear a ${u.email}? No podrá volver a iniciar sesión hasta que lo desbloquees.`)) return;
      btn.disabled = true;
      try{ await _adminApi({accion:'bloquear', id:u.id, si:!u.bloqueado}); _admMsg(u.bloqueado ? `✅ ${_escHtml(u.email)} ya puede volver a entrar.` : `⛔ ${_escHtml(u.email)} está bloqueado.`, 'ok'); adminCargar(); }
      catch(e){ _admMsg(_escHtml(e.message), 'mal'); btn.disabled = false; }
    }
    async function adminBorrar(i, btn){
      const u = _admUsuarios[i]; if(!u) return;
      if(!confirm(`¿Borrar la cuenta de ${u.email}? Se pierden sus listas y notas, y no se puede deshacer.`)) return;
      btn.disabled = true;
      try{ await _adminApi({accion:'borrar', id:u.id}); _admMsg(`🗑️ Cuenta de ${_escHtml(u.email)} borrada.`, 'ok'); adminCargar(); }
      catch(e){ _admMsg(_escHtml(e.message), 'mal'); btn.disabled = false; }
    }
    // ══ AVISOS EN EL MÓVIL (Web Push): episodios de hoy, novedades que te van a encantar y el estreno del finde ══
    const VAPID_PUBLICO = 'BInIGCCADygEMmBV-jFsbqkZV4vjoBmt2Yg6aacYn5Ts6d_MsKhWZLQk7j2uAA2c7XYWgphnU5wx1ZT3GGx7Css';
    const _avisosTipos = [['episodios','📺 Cuando salga un episodio nuevo de tus series'],['llegadas','🔮 Cuando llegue a una plataforma algo que te va a encantar'],['estrenos','🍿 Los viernes, el estreno de cine que más encaja contigo']];
    const _avisosOn = () => { try{ return localStorage.getItem('cm:avisosOn')==='1'; }catch(e){ return false; } };
    const _esIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent);
    const _instalada = () => (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone===true;
    function _b64aU8(b){ const p = '='.repeat((4 - b.length % 4) % 4), r = atob((b + p).replace(/-/g,'+').replace(/_/g,'/')); return Uint8Array.from([...r].map(c=>c.charCodeAt(0))); }
    async function _avisosPerfilLeer(){ try{ const {data} = await sb.from('push_perfil').select('plats,tipos').eq('user_id', sesionActual.user.id).maybeSingle(); return data; }catch(e){ return null; } }
    async function _avisosSubirPerfil(extra){
      if(!sesionActual) return;
      const m = window._modeloNota, fila = {user_id: sesionActual.user.id, actualizado: new Date().toISOString(), ...(extra||{})};
      if(m && m.fit) fila.modelo = {media: m.fit.media, mva: m.fit.mva, s: m.fit.s, ef: m.fit.ef};
      try{ await sb.from('push_perfil').upsert(fila, {onConflict:'user_id'}); localStorage.setItem('cm:avisosSubido', String(Date.now())); }catch(e){}
    }
    // el servidor usa tu modelo de «Le pondrías un…»: se le manda actualizado como mucho una vez cada 12 h
    function _avisosQuizaSubirModelo(){
      if(!_avisosOn() || !sesionActual) return;
      let t = 0; try{ t = Number(localStorage.getItem('cm:avisosSubido'))||0; }catch(e){}
      if(Date.now()-t > 12*3600e3) _avisosSubirPerfil();
    }
    async function _avisosPintar(){
      const box = document.getElementById('avisos-caja'); if(!box) return;
      if(!sesionActual){ box.innerHTML = ''; return; }
      const soporta = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
      if(_esIOS() && !_instalada()){ box.innerHTML = `<p>Para recibir avisos en el iPhone, CineMood tiene que estar en tu pantalla de inicio: ábrela en Safari, toca <b>Compartir</b> → <b>Añadir a pantalla de inicio</b>, y entra desde ese icono.</p>`; return; }
      if(!soporta){ box.innerHTML = '<p>Este navegador no admite avisos. En el iPhone, entra desde el icono de CineMood en tu pantalla de inicio.</p>'; return; }
      let sub = null; try{ const reg = await navigator.serviceWorker.getRegistration(); sub = reg ? await reg.pushManager.getSubscription() : null; }catch(e){}
      if(!sub || Notification.permission!=='granted'){
        try{ localStorage.removeItem('cm:avisosOn'); }catch(e){}
        box.innerHTML = `<p>Te aviso solo de lo que te interesa: cuando sale un episodio de tus series, cuando llega a cualquier plataforma (o solo a las que elijas) algo que le pondrías un 8 o más, y el estreno del finde que más encaja contigo. Como mucho, 3 avisos al día.</p>
          ${Notification.permission==='denied' ? '<p><b>Los avisos están bloqueados.</b> Actívalos en Ajustes del iPhone → Notificaciones → CineMood.</p>' : '<button type="button" class="cta-btn" onclick="activarAvisos(this)">🔔 Activar avisos</button>'}`;
        return;
      }
      const perfil = await _avisosPerfilLeer() || {}, tipos = perfil.tipos || _avisosTipos.map(x=>x[0]), plats = perfil.plats || [];
      box.innerHTML = `<div class="avisos-ok">✓ Avisos activados en este móvil</div>
        ${_avisosTipos.map(([k,t])=>`<label class="ml-preferencia"><input type="checkbox" ${tipos.includes(k)?'checked':''} onchange="avisosTipo('${k}', this.checked)"> ${t}</label>`).join('')}
        <div class="section-label" style="margin-top:12px">¿De qué plataformas? <span style="text-transform:none;letter-spacing:0;font-weight:500">(sin marcar ninguna: de cualquiera)</span></div>
        <div class="noche-chips">${DESC_PLATAFORMAS.filter(([id])=>id).map(([id,n])=>`<button type="button" class="noche-chip${plats.includes(id)?' activo':''}" onclick="avisosPlat('${id}', this)">${_escHtml(n)}</button>`).join('')}</div>
        <div class="avisos-btns"><button type="button" class="ml-secundario" onclick="avisosPrueba(this)">Enviarme uno de prueba</button><button type="button" class="ml-secundario" onclick="desactivarAvisos(this)">Desactivar</button></div>`;
    }
    async function activarAvisos(btn){
      if(!sesionActual){ mostrarCuenta(); return; }
      btn.disabled = true; btn.textContent = 'Activando…';
      try{
        const permiso = await Notification.requestPermission();
        if(permiso!=='granted'){ _avisosPintar(); return; }
        if(!(await navigator.serviceWorker.getRegistration())) await navigator.serviceWorker.register('sw.js');
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.subscribe({userVisibleOnly:true, applicationServerKey:_b64aU8(VAPID_PUBLICO)});
        const j = sub.toJSON();
        const {error} = await sb.from('push_suscripciones').upsert({endpoint:j.endpoint, user_id:sesionActual.user.id, p256dh:j.keys.p256dh, auth:j.keys.auth}, {onConflict:'endpoint'});
        if(error) throw error;
        try{ localStorage.setItem('cm:avisosOn','1'); }catch(e){}
        await _modeloNotaObtener().catch(()=>null);
        await _avisosSubirPerfil(); // sin plataformas marcadas = avisos de cualquiera
      }catch(e){ alert('No se pudieron activar los avisos. Inténtalo de nuevo.'); }
      _avisosPintar();
    }
    async function avisosTipo(k, on){
      const p = await _avisosPerfilLeer() || {}; let t = p.tipos || _avisosTipos.map(x=>x[0]);
      t = on ? [...new Set([...t, k])] : t.filter(x=>x!==k);
      try{ await sb.from('push_perfil').upsert({user_id:sesionActual.user.id, tipos:t}, {onConflict:'user_id'}); }catch(e){}
    }
    async function avisosPlat(id, btn){
      const p = await _avisosPerfilLeer() || {}; let pl = p.plats || [];
      pl = pl.includes(id) ? pl.filter(x=>x!==id) : [...pl, id];
      btn.classList.toggle('activo', pl.includes(id));
      try{ await sb.from('push_perfil').upsert({user_id:sesionActual.user.id, plats:pl}, {onConflict:'user_id'}); }catch(e){}
    }
    async function avisosPrueba(btn){
      btn.disabled = true; const o = btn.textContent; btn.textContent = 'Enviando…';
      try{
        const {data} = await sb.auth.getSession();
        const r = await fetch(_AVISOS_FN, {method:'POST', headers:{'Content-Type':'application/json', Authorization:`Bearer ${data.session.access_token}`}, body:JSON.stringify({prueba:true})});
        const j = await r.json();
        btn.textContent = j.enviados ? '✓ Enviado: mira tus avisos' : 'No ha llegado a ningún móvil';
      }catch(e){ btn.textContent = 'No se pudo enviar'; }
      setTimeout(()=>{ btn.textContent = o; btn.disabled = false; }, 4000);
    }
    async function desactivarAvisos(btn){
      btn.disabled = true;
      try{
        const reg = await navigator.serviceWorker.getRegistration(), sub = reg ? await reg.pushManager.getSubscription() : null;
        if(sub){ await sb.from('push_suscripciones').delete().eq('endpoint', sub.endpoint); await sub.unsubscribe(); }
      }catch(e){}
      try{ localStorage.removeItem('cm:avisosOn'); }catch(e){}
      _avisosPintar();
    }
    // ══ POR QUÉ TE GUSTÓ (O NO): motivos al puntuar, en tu cuenta. Alimentan «Tu ADN de cine» ══
    const MOTIVOS_MAS = [['g','✍️ Guion'],['a','🎭 Actores'],['p','🧩 Personajes'],['t','😰 Tensión'],['e','🥹 Emoción'],['h','😂 Humor'],['v','🎨 Visual'],['m','🎵 Música'],['f','🎯 El final'],['r','⚡ Ritmo']];
    const MOTIVOS_MENOS = [['L','🐢 Lenta'],['D','⏳ Larga'],['P','🙄 Predecible'],['F','🫠 Final flojo'],['G','📝 Guion flojo'],['A','🎭 Actores flojos'],['X','😑 Sin emoción']];
    const MOTIVOS_LS = 'cm:motivos';
    let _motivosT = null;
    function _motivosLeer(){ try{ return JSON.parse(localStorage.getItem(MOTIVOS_LS)||'{}') || {}; }catch(e){ return {}; } }
    function _motivosGuardar(o){
      try{ localStorage.setItem(MOTIVOS_LS, JSON.stringify(o)); }catch(e){}
      if(!sesionActual) return;
      clearTimeout(_motivosT);
      _motivosT = setTimeout(async ()=>{ try{ await sb.auth.updateUser({ data: { cm_motivos: o } }); }catch(e){} }, 700);
    }
    function motivosDesdeCuenta(){
      const r = sesionActual?.user?.user_metadata?.cm_motivos;
      if(r && typeof r==='object'){ try{ localStorage.setItem(MOTIVOS_LS, JSON.stringify(r)); }catch(e){} }
      else if(sesionActual){ const o = _motivosLeer(); if(Object.keys(o).length) _motivosGuardar(o); }
    }
    function _pintarMotivos(visible, nota, abierto){
      const box = document.getElementById('d-motivos'), p = peliculaActual; if(!box) return;
      if(!visible || !p || !nota){ box.style.display = 'none'; box.innerHTML = ''; return; }
      const k = `${p._tipo}:${p.id}`, sel = _motivosLeer()[k] || '';
      window._motivosNota = nota;
      if(!abierto){ // plegado: resumen de lo marcado, o un botón para añadirlo
        const nom = c => ([...MOTIVOS_MAS, ...MOTIVOS_MENOS].find(x=>x[0]===c)||[])[1]?.split(' ').slice(1).join(' ') || '';
        const mas = [...sel].filter(c=>c===c.toLowerCase()).map(nom), menos = [...sel].filter(c=>c!==c.toLowerCase()).map(nom);
        box.innerHTML = sel ? `<button type="button" class="mot-resumen" onclick="_pintarMotivos(true, window._motivosNota, true)">💬 ${mas.length ? `Te gustó: <b>${_escHtml(mas.join(', '))}</b>` : ''}${mas.length && menos.length ? ' · ' : ''}${menos.length ? `No: <b>${_escHtml(menos.join(', '))}</b>` : ''} <span>✎</span></button>`
          : `<button type="button" class="mot-resumen vacio" onclick="_pintarMotivos(true, window._motivosNota, true)">💬 ¿Por qué esta nota? Añade qué te gustó y qué no <span>›</span></button>`;
        box.classList.add('plegado'); box.style.display = 'block'; return;
      }
      box.classList.remove('plegado');
      const chip = ([c,t]) => `<button type="button" class="mot-chip${sel.includes(c)?' activo':''}${c===c.toUpperCase()?' menos':''}" onclick="alternarMotivo('${c}', this)" aria-pressed="${sel.includes(c)}">${t}</button>`;
      const bien = `<div class="mot-k">¿Qué te ha gustado?</div><div class="mot-fila">${MOTIVOS_MAS.map(chip).join('')}</div>`;
      const mal = `<div class="mot-k">¿Y lo que menos?</div><div class="mot-fila">${MOTIVOS_MENOS.map(chip).join('')}</div>`;
      box.innerHTML = (Number(nota) <= 5 ? mal + bien : bien + mal) + `<div class="mot-pie">Opcional. Con esto tu ADN de cine sabe qué valoras de verdad.</div>`;
      box.style.display = 'block';
    }
    function alternarMotivo(c, btn){
      const p = peliculaActual; if(!p || !sesionActual) return;
      const o = _motivosLeer(), k = `${p._tipo}:${p.id}`; let v = o[k] || '';
      v = v.includes(c) ? v.replace(c, '') : v + c;
      if(v) o[k] = v; else delete o[k];
      _motivosGuardar(o);
      btn.classList.toggle('activo', v.includes(c)); btn.setAttribute('aria-pressed', String(v.includes(c)));
    }
    // Para Tu ADN: qué motivos marcas más y con qué nota
    function _adnMotivos(m){
      const o = _motivosLeer(), notas = {}; (m?.muestras||[]).forEach(x=>{ notas[`${x.tipo}:${x.tmdb_id}`] = Number(x.puntuacion); });
      const cuenta = {}, suma = {}; let titulos = 0;
      Object.entries(o).forEach(([k,v])=>{ titulos++; [...v].forEach(c=>{ cuenta[c] = (cuenta[c]||0)+1; if(notas[k]!=null) suma[c] = (suma[c]||[]).concat(notas[k]); }); });
      const nombre = c => ([...MOTIVOS_MAS, ...MOTIVOS_MENOS].find(x=>x[0]===c)||[])[1] || c;
      const media = c => suma[c] && suma[c].length ? suma[c].reduce((a,b)=>a+b,0)/suma[c].length : null;
      const mas = MOTIVOS_MAS.map(([c])=>c).filter(c=>cuenta[c]).sort((a,b)=>cuenta[b]-cuenta[a]).slice(0,4).map(c=>({c, t:nombre(c), n:cuenta[c], media:media(c)}));
      const menos = MOTIVOS_MENOS.map(([c])=>c).filter(c=>cuenta[c]).sort((a,b)=>cuenta[b]-cuenta[a]).slice(0,3).map(c=>({c, t:nombre(c), n:cuenta[c], media:media(c)}));
      return {titulos, mas, menos};
    }
    // ══ TU ADN DE CINE: lo que ha aprendido «Le pondrías un…» de tus notas, en claro ══
    async function abrirADN(){
      if(!sesionActual){ mostrarCuenta(); return; }
      irA('p-adn');
      const cont = document.getElementById('adn-cont');
      cont.innerHTML = '<p class="rk-ayuda">Analizando tus notas…</p>';
      try{
        const m = await _modeloNotaObtener();
        if(!m || !m.fit){ cont.innerHTML = `<div class="noche-vacia" onclick="abrirPuntuar()" role="button"><b>🧬 Aún no tengo bastante</b><span>Puntúa al menos 8 títulos que hayas visto (llevas ${m ? m.muestras.length : 0}) y aquí verás tu ADN de cine. Toca para puntuar rápido ›</span></div>`; return; }
        await new Promise(r=>setTimeout(r, 30)); // deja pintar el «Analizando…» antes del cálculo de puntería
        const d = window._adn = await _adnCalcular(m);
        const fila = (x, max) => `<div class="adn-fila"><div>${_escHtml(x.nombre)}<small>${x.n} ${x.n===1?'título':'títulos'} con tu nota</small></div><div class="adn-barra${x.a<0?' menos':''}"><i style="width:${Math.round(Math.abs(x.a)/max*100)}%"></i></div><div class="adn-v ${x.a<0?'menos':'mas'}">${x.a>0?'+':'−'}${_notaFmt(Math.abs(x.a))}</div></div>`;
        const max = Math.max(0.5, ...[...d.mas, ...d.menos, ...d.deberias].map(x=>Math.abs(x.a)));
        cont.innerHTML = `
          <div class="adn-hero"><div class="k">🧬 Tu ADN de cine · ${m.fit.n} notas</div>
            ${d.pct!=null ? `<div class="n">${d.pct} %</div><div class="t">${_escHtml(d.tituloPred)}</div><div class="m">Es lo que acierto tu nota con ±1 punto antes de que veas algo. ${_escHtml(d.textoPred)}</div>` : `<div class="t" style="margin-top:8px">Tu nota media: ${_notaFmt(m.fit.media)}</div><div class="m">Con 12 notas o más te diré lo predecible que eres.</div>`}
          </div>
          <div class="adn-caja"><h3>Tú y el público</h3>
            <div class="adn-dato"><span>${d.sesgo>0.4?'🎁':d.sesgo<-0.4?'🧐':'⚖️'}</span><div>${_escHtml(d.textoSesgo)}</div></div>
            <div class="adn-dato"><span>${m.fit.s<0.45?'🧭':m.fit.s<0.85?'🤝':'👥'}</span><div>${_escHtml(d.textoPublico)}</div></div>
            <div class="adn-dato"><span>⭐</span><div>Tu nota media es un <b>${_notaFmt(m.fit.media)}</b>.</div></div>
          </div>
          ${(()=>{ const mo = _adnMotivos(m); if(mo.titulos<3) return `<div class="adn-caja"><h3>Lo que valoras de verdad</h3><p>Cuando puntúes algo, marca qué te gustó y qué no (guion, actores, final…). Con unos pocos títulos aquí verás lo que de verdad valoras. Llevas ${mo.titulos}.</p></div>`;
            const lin = x => `<div class="adn-dato"><span>${x.t.split(' ')[0]}</span><div><b>${_escHtml(x.t.split(' ').slice(1).join(' '))}</b> · lo marcas en ${x.n} ${x.n===1?'título':'títulos'}${x.media!=null ? ` (nota media ${_notaFmt(x.media)})` : ''}</div></div>`;
            return `<div class="adn-caja"><h3>Lo que valoras de verdad</h3><p>Según lo que marcas al puntuar (${mo.titulos} títulos).</p>${mo.mas.map(lin).join('')}${mo.menos.length ? `<div class="mot-k" style="margin-top:10px">Lo que no perdonas</div>${mo.menos.map(lin).join('')}` : ''}</div>`; })()}
          ${d.mas.length ? `<div class="adn-caja"><h3>Lo que más te tira</h3><p>Cuánto sube tu nota, de media, cuando una película o serie tiene esto.</p>${d.mas.map(x=>fila(x,max)).join('')}</div>` : ''}
          ${d.menos.length ? `<div class="adn-caja"><h3>Lo que no va contigo</h3><p>Aquí sueles poner menos nota de lo que esperarías.</p>${d.menos.map(x=>fila(x,max)).join('')}</div>` : ''}
          ${d.deberias.length ? `<div class="adn-caja"><h3>Deberías ver más…</h3><p>Has visto poco de esto, pero lo que has visto te ha gustado mucho.</p>${d.deberias.map(x=>fila(x,max)).join('')}</div>` : ''}
          ${d.decada ? `<div class="adn-caja"><h3>Tu época</h3><div class="adn-dato"><span>📼</span><div>Donde mejor te va es con <b>${_escHtml(d.decada.nombre)}</b> (${d.decada.a>0?'+':'−'}${_notaFmt(Math.abs(d.decada.a))} de media).</div></div></div>` : ''}
          <button type="button" class="cta-btn" id="adn-compartir" onclick="compartirADN(this)">📤 Compartir mi ADN</button>
          <p class="rk-ayuda" style="margin-top:12px">Se calcula en este dispositivo con tus notas y los datos públicos de TMDB, y cambia cada vez que puntúas. Es lo mismo que usa «Le pondrías un…».</p>`;
      }catch(e){ cont.innerHTML = '<p class="rk-ayuda">No se pudo calcular. Comprueba tu conexión e inténtalo de nuevo.</p>'; }
    }
    async function _adnCalcular(m){
      const f = m.fit, pt = _notaPunteria(m), dirs = {};
      m.muestras.forEach(x=>{ if(x.info?.d?.id) dirs[x.info.d.id] = x.info.d.n; });
      let todos = Object.entries(f.ef).map(([k,v])=>({k, a:v*_NOTA_W[k[0]], n:f.cuenta[k]||0})).filter(x=>x.n>=2);
      await Promise.all(todos.map(async x=>{ x.nombre = await _notaNombreRasgo(x.k, dirs); x.nombre = x.nombre.charAt(0).toUpperCase()+x.nombre.slice(1); }));
      const deberias = todos.filter(x=>x.a>=0.35 && x.n<=4 && x.k[0]!=='t').sort((a,b)=>b.a-a.a).slice(0,3);
      const ya = new Set(deberias.map(x=>x.k));
      const mas = todos.filter(x=>x.a>=0.2 && !ya.has(x.k)).sort((a,b)=>b.a-a.a).slice(0,6);
      const menos = todos.filter(x=>x.a<=-0.2).sort((a,b)=>a.a-b.a).slice(0,5);
      const decada = todos.filter(x=>x.k[0]==='e' && x.n>=3).sort((a,b)=>b.a-a.a)[0] || null;
      const cv = m.muestras.filter(x=>_notaConPublico(x.info));
      const sesgo = cv.length ? cv.reduce((t,x)=>t+Number(x.puntuacion)-x.info.va,0)/cv.length : 0;
      const pct = pt ? Math.round(pt.cerca*100) : null;
      return {pct, mas, menos, deberias, decada, sesgo,
        tituloPred: pct==null ? '' : pct>=80 ? 'Eres muy predecible' : pct>=60 ? 'Eres bastante predecible' : 'Eres difícil de encasillar',
        textoPred: pct==null ? '' : pct>=80 ? 'Sé muy bien lo que te va a gustar.' : pct>=60 ? 'Casi siempre sé por dónde vas, pero a veces me sorprendes.' : 'Tu gusto se sale de los patrones: te sorprende lo que no esperas.',
        textoSesgo: sesgo>0.4 ? `Eres generoso: pones de media ${_notaFmt(sesgo)} puntos más que el público.` : sesgo<-0.4 ? `Eres exigente: pones de media ${_notaFmt(-sesgo)} puntos menos que el público.` : 'Puntúas, de media, casi igual que el público.',
        textoPublico: f.s<0.45 ? 'Vas a tu aire: que algo le guste a todo el mundo apenas dice si te gustará a ti.' : f.s<0.85 ? 'Escuchas al público, pero con criterio propio.' : 'Sueles coincidir con el público: si gusta a la mayoría, te gustará.'};
    }
    async function compartirADN(btn){
      const d = window._adn, m = window._modeloNota; if(!d || !m || !m.fit) return;
      const original = btn.textContent; btn.textContent = 'Preparando la imagen…';
      try{
        const W = 1080, H = 1350, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
        const ctx = cv.getContext('2d'), ac = getComputedStyle(document.documentElement).getPropertyValue('--acento').trim() || '#b52c29';
        const g = ctx.createLinearGradient(0,0,W,H); g.addColorStop(0,'#141615'); g.addColorStop(1,'#26201f'); ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
        ctx.fillStyle = ac; ctx.fillRect(80, 92, 90, 10);
        ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.font = '800 76px sans-serif'; ctx.fillText('Mi ADN de cine', 80, 200);
        let y = 300;
        if(d.pct!=null){ ctx.font = '800 150px sans-serif'; ctx.fillStyle = ac; ctx.fillText(d.pct+' %', 80, y+110); ctx.fillStyle = '#fff'; ctx.font = '700 40px sans-serif'; ctx.fillText(d.pct>=80 ? 'Soy muy predecible' : d.pct>=60 ? 'Soy bastante predecible' : 'Soy difícil de encasillar', 80, y+170); y += 250; }
        const bloque = (titulo, xs, color) => {
          if(!xs.length) return; ctx.fillStyle = '#9a9e98'; ctx.font = '800 30px sans-serif'; ctx.fillText(titulo.toUpperCase(), 80, y); y += 52;
          xs.slice(0,4).forEach(x=>{ ctx.fillStyle = '#fff'; ctx.font = '600 38px sans-serif'; ctx.fillText(x.nombre.length>34 ? x.nombre.slice(0,33)+'…' : x.nombre, 80, y); ctx.fillStyle = color; ctx.textAlign = 'right'; ctx.fillText((x.a>0?'+':'−')+_notaFmt(Math.abs(x.a)), W-80, y); ctx.textAlign = 'left'; y += 54; });
          y += 34;
        };
        bloque('Lo que más me tira', d.mas, '#8fd3a6');
        bloque('Lo que no va conmigo', d.menos.slice(0,3), '#f0978f');
        if(y < H-220) bloque('Debería ver más', d.deberias.slice(0,2), '#8fd3a6');
        ctx.fillStyle = '#c6c8c1'; ctx.font = '500 32px sans-serif'; ctx.fillText((d.sesgo>0.4 ? 'Generoso con las notas' : d.sesgo<-0.4 ? 'Exigente con las notas' : 'Puntúo como el público') + ` · nota media ${_notaFmt(m.fit.media)}`, 80, H-120);
        ctx.fillStyle = '#6b6e68'; ctx.font = '400 26px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('CineMood · ferrerasdorado.github.io/cinemood', W/2, H-46);
        const blob = await new Promise(res=>cv.toBlob(res, 'image/png'));
        const archivo = new File([blob], 'mi-adn-de-cine.png', {type:'image/png'});
        if(navigator.canShare && navigator.canShare({files:[archivo]})){ try{ await navigator.share({files:[archivo], title:'Mi ADN de cine · CineMood'}); }catch(e){} }
        else { const u = URL.createObjectURL(blob), a = document.createElement('a'); a.href = u; a.download = archivo.name; a.click(); setTimeout(()=>URL.revokeObjectURL(u), 3000); }
      }catch(e){ alert('No se pudo generar la imagen. Inténtalo de nuevo.'); }
      finally{ btn.textContent = original; }
    }
