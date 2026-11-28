// CineMood · Avisos y diálogos propios de la app (en lugar de alert, confirm y prompt del navegador)
// (Se carga como script clásico: todo comparte el mismo ámbito global.)
//
//   _aviso(texto, esError)                      → aviso flotante abajo, se cierra solo
//   await _confirmar(texto, {aceptar, peligro}) → true / false
//   await _pedirTexto(texto, {valor, ...})      → el texto escrito, o null si se cancela
//   _mostrarParaCopiar(texto, contenido)        → cuando el portapapeles no deja copiar

    function _aviso(texto, esError){
      let t = document.getElementById('cm-aviso');
      if(!t){
        t = document.createElement('div'); t.id = 'cm-aviso'; t.className = 'cm-deshacer cm-aviso';
        t.setAttribute('role','status'); t.setAttribute('aria-live','polite');
        document.body.appendChild(t);
      }
      t.classList.toggle('error', !!esError);
      t.replaceChildren(_fEl('span',{text:texto}), _fEl('button',{type:'button','aria-label':'Cerrar aviso',onclick:()=>t.classList.remove('on')},'✕'));
      clearTimeout(t._tm);
      t.classList.add('on');
      t._tm = setTimeout(()=>t.classList.remove('on'), esError ? 9000 : 5000);
    }

    // Ventana modal común: devuelve una promesa que se resuelve al aceptar o cancelar.
    // Se cierra con Escape o tocando fuera, y el foco vuelve a donde estaba.
    function _dialogo({titulo, texto, campo, botones}){
      return new Promise(resolver=>{
        const antes = document.activeElement;
        const fondo = _fEl('div',{class:'cm-dlg-fondo'});
        const caja = _fEl('div',{class:'cm-dlg',role:'alertdialog','aria-modal':'true','aria-labelledby':'cm-dlg-tit'});
        const cerrar = valor=>{
          document.removeEventListener('keydown', teclas, true);
          fondo.remove();
          if(antes && antes.focus) try{ antes.focus(); }catch(e){}
          resolver(valor);
        };
        const teclas = e=>{
          if(e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); cerrar(botones.find(b=>b.cancelar)?.valor ?? null); }
          else if(e.key==='Enter' && campo && document.activeElement===campo && campo.tagName==='INPUT'){ e.preventDefault(); cerrar(botones.find(b=>b.principal).valor()); }
          else if(e.key==='Tab'){   // el foco no sale de la ventana
            const f = [...caja.querySelectorAll('button,input,textarea')]; if(!f.length) return;
            const i = f.indexOf(document.activeElement);
            if(e.shiftKey && i<=0){ e.preventDefault(); f[f.length-1].focus(); }
            else if(!e.shiftKey && i===f.length-1){ e.preventDefault(); f[0].focus(); }
          }
        };
        fondo._cerrar = ()=>cerrar(botones.find(b=>b.cancelar)?.valor ?? null);
        caja.append(
          titulo ? _fEl('h3',{id:'cm-dlg-tit',class:'cm-dlg-tit',text:titulo}) : null,
          texto ? _fEl('p',{id:titulo?null:'cm-dlg-tit',class:'cm-dlg-txt',text:texto}) : null,
          campo || null,
          _fEl('div',{class:'cm-dlg-botones'}, ...botones.map(b=>_fEl('button',{type:'button',class:'cm-dlg-btn'+(b.principal?' prim':'')+(b.peligro?' peligro':''),
            onclick:()=>cerrar(typeof b.valor==='function' ? b.valor() : b.valor)}, b.texto))));
        fondo.append(caja);
        fondo.addEventListener('click', e=>{ if(e.target===fondo) cerrar(botones.find(b=>b.cancelar)?.valor ?? null); });
        document.addEventListener('keydown', teclas, true);
        document.body.appendChild(fondo);
        (campo || caja.querySelector('.cm-dlg-btn.prim') || caja.querySelector('button')).focus();
        if(campo && campo.select) campo.select();
      });
    }
    function _confirmar(texto, opciones){
      const o = opciones || {};
      return _dialogo({titulo:o.titulo, texto, botones:[
        {texto:o.cancelar||'Cancelar', valor:false, cancelar:true},
        {texto:o.aceptar||'Aceptar', valor:true, principal:true, peligro:!!o.peligro}]});
    }
    function _pedirTexto(texto, opciones){
      const o = opciones || {};
      const campo = _fEl('input',{type:o.tipo||'text',class:'cm-dlg-campo',value:o.valor??'',placeholder:o.placeholder||'','aria-label':texto,autocomplete:'off'});
      return _dialogo({titulo:o.titulo, texto, campo, botones:[
        {texto:'Cancelar', valor:null, cancelar:true},
        {texto:o.aceptar||'Aceptar', valor:()=>campo.value, principal:true}]});
    }
    function _mostrarParaCopiar(texto, contenido){
      const campo = _fEl('textarea',{class:'cm-dlg-campo',readonly:true,rows:Math.min(8, String(contenido).split('\n').length+1),'aria-label':texto});
      campo.value = contenido;
      return _dialogo({texto, campo, botones:[{texto:'Hecho', valor:null, principal:true, cancelar:true}]});
    }
