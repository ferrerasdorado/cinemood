// CineMood · Núcleo: configuración, Supabase, sesión y utilidades comunes
// (Parte de index.html; se carga como script clásico: todo comparte el mismo ámbito global.)

    const TMDB_PROXY = 'https://qdkoksbclukpdvhgrucg.supabase.co/functions/v1/tmdb-proxy';
    const SUPABASE_URL = 'https://qdkoksbclukpdvhgrucg.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_mEC3C3ZxRmSk8EKSm0HTSw_73a4bOMt';
    let sesionActual = null;
    // Comodidad de interfaz, no autorización: el servidor verifica la sesión y la lista.
    const CM_USUARIOS = new Set([
      'ad47446f-0c28-475f-8b74-362b908bec24',
      '9ccf2e37-6c4e-495b-a5bf-5542d95fa895'
    ]);
    // Las cuentas creadas desde el panel de usuarios están en la tabla cm_permitidos (cada cuenta solo puede ver su propia fila)
    const _cmPermitidoCache = new Map();
    async function _cmPermitido(uid){
      if(!uid) return false;
      if(CM_USUARIOS.has(uid)) return true;
      if(_cmPermitidoCache.has(uid)) return _cmPermitidoCache.get(uid);
      const p = sb.from('cm_permitidos').select('user_id').eq('user_id', uid).maybeSingle()
        .then(({data, error})=>{ if(error) throw error; return !!data; });
      _cmPermitidoCache.set(uid, p);
      try{ return await p; }catch(e){ _cmPermitidoCache.delete(uid); return false; }
    }
    let _cmTurnoSesion = 0;
    async function _cmAplicarSesion(session){
      const turno = ++_cmTurnoSesion;
      if(!session?.access_token){
        sesionActual = null;
        _gateAplicar();
        return;
      }
      try{
        // Comprueba la identidad en Auth; no basta el objeto guardado en el navegador.
        const { data, error } = await sb.auth.getUser(session.access_token);
        const permitido = !error && data?.user && data.user.id === session.user?.id && await _cmPermitido(data.user.id);
        if(turno !== _cmTurnoSesion) return;
        if(!permitido){
          sesionActual = null;
          _gateAplicar();
          document.getElementById('gate-error').textContent='Esta sesión no permite acceder a CineMood. Inicia sesión con una cuenta autorizada.';
          return;
        }
        sesionActual = {...session,user:data.user};
        _gateAplicar();
        actualizarUICuenta();
      }catch(e){
        if(turno !== _cmTurnoSesion) return;
        sesionActual = null;
        _gateAplicar();
        document.getElementById('gate-error').textContent='No se pudo verificar la sesión. Revisa tu conexión y vuelve a entrar.';
      }
    }
    let peliculaActual = null;
    let yearActivo = false;

    // Géneros PELÍCULA
    const GENEROS_PELI = [
      {id:'28',n:'Acción'},{id:'12',n:'Aventura'},{id:'35',n:'Comedia'},
      {id:'80',n:'Crimen'},{id:'99',n:'Documental'},{id:'18',n:'Drama'},
      {id:'36',n:'Historia'},{id:'27',n:'Terror'},{id:'9648',n:'Misterio'},
      {id:'10749',n:'Romance'},{id:'878',n:'Ciencia ficción'},{id:'53',n:'Thriller'},
      {id:'16',n:'Animación'}
    ];
    // Géneros SERIE — verificados con API real (Thriller 53=0, se mapea a 9648,80)
    const GENEROS_SERIE = [
      {id:'10759',n:'Acción & Aventura'},{id:'35',n:'Comedia'},{id:'80',n:'Crimen'},
      {id:'99',n:'Documental'},{id:'18',n:'Drama'},{id:'9648',n:'Misterio'},
      {id:'10765',n:'Sci-Fi & Fantasy'},{id:'9648,80',n:'Thriller'},
      {id:'10768',n:'Guerra & Política'},{id:'37',n:'Western'},{id:'16',n:'Animación'}
    ];

    function renderGeneros() {
      const tipo = getTipo();
      const lista = tipo === 'serie' ? GENEROS_SERIE : GENEROS_PELI;
      document.getElementById('genre-grid').innerHTML = lista.map(g =>
        `<div class="genre-chip" data-id="${g.id}" onclick="toggleChip(this)"><span class="genre-dot"></span>${g.n}</div>`
      ).join('');
    }
