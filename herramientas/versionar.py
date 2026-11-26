#!/usr/bin/env python3
"""Actualiza el ?v=<huella> de cada css/ y js/ en index.html.

Ejecútalo después de cambiar cualquier archivo de css/ o js/ y antes de subirlo:

    python3 herramientas/versionar.py

La huella cambia solo si cambia el archivo. Así el navegador y el service worker
descargan la versión nueva en vez de usar la que tenían guardada.
"""
import hashlib, pathlib, re

raiz = pathlib.Path(__file__).resolve().parent.parent
index = raiz / 'index.html'
html = index.read_text(encoding='utf-8')

def huella(m):
    ruta = m.group(2)
    archivo = raiz / ruta
    if not archivo.is_file():
        raise SystemExit(f'No existe {ruta}, que aparece en index.html')
    return f'{m.group(1)}{ruta}?v={hashlib.sha1(archivo.read_bytes()).hexdigest()[:8]}{m.group(3)}'

nuevo, n = re.subn(r'((?:src|href)=")((?:js|css)/[\w.-]+\.(?:js|css))(?:\?v=[0-9a-f]*)?(")', huella, html)
if nuevo != html:
    index.write_text(nuevo, encoding='utf-8')
    print(f'index.html actualizado ({n} archivos revisados).')
else:
    print(f'Todo al día ({n} archivos revisados).')
