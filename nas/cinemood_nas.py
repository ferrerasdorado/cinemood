"""CineMood · servicio del NAS

Lee la cola de descargas de Supabase (tabla solicitudes_descarga, ver supabase/nas.sql),
manda cada torrent a RDT-Client (que lo descarga con AllDebrid o Real-Debrid en las carpetas
que lee Plex) y va actualizando el estado de cada solicitud:

    pendiente → procesando → descargando → completada   (o error / sin_fuentes)

Mientras descarga, copia el progreso, la velocidad y el tiempo restante para verlos en «Mis descargas».
Si pides cancelar desde la app, borra el torrent de RDT-Client; si lo borras a mano en RDT-Client,
la solicitud pasa a «cancelada».

- Si en la app elegiste un torrent, la fila trae info_hash y se usa ese.
- Si no, busca el mejor torrent en tus addons (ADDON_HINTS) según calidad, idioma y semillas:
  un capítulo solo con torrents de ese capítulo (nunca un pack, que bajaría la temporada entera),
  una temporada con un pack de esa temporada y la serie con un pack de la serie.

Configuración: variables de entorno (ver nas/.env.example). Ninguna clave va en el código.
Uso:  pip install -r nas/requirements.txt  &&  python3 nas/cinemood_nas.py
"""

import os, re, time, json, requests
from urllib.parse import quote

SB = os.environ["SUPABASE_URL"].rstrip("/")
KEY = os.environ["SUPABASE_SERVICE_KEY"]
RDT = os.environ.get("RDT_URL", "http://192.168.1.172:6500").rstrip("/")
RDT_USER = os.environ["RDT_USER"]
RDT_PASS = os.environ["RDT_PASS"]
TMDB_KEY = os.environ.get("TMDB_API_KEY", "")
CAT_MOVIES = os.environ.get("RDT_CAT_MOVIES", "Peliculas")
CAT_SERIES = os.environ.get("RDT_CAT_SERIES", "Series")
# Addons en los que busca el modo automático (basta con que el nombre o la URL contenga
# alguna de estas palabras). Pon ADDON_HINTS=* para usar todos tus addons.
ADDON_HINTS = [h.strip().lower() for h in os.environ.get("ADDON_HINTS",
    "torrentio,comet,peerflix,pelis,stremthru,torz,mediafusion,knightcrawler,jackettio,annatar,orion").split(",") if h.strip()]
INTERVAL = int(os.environ.get("INTERVAL", "30"))
MAX_INTENTOS = int(os.environ.get("MAX_INTENTOS", "3"))
ATASCO_MIN = int(os.environ.get("ATASCO_MIN", "15"))                 # minutos sin avanzar para darla por atascada
AVISOS_DESCARGAS = os.environ.get("AVISOS_DESCARGAS", "1") != "0"   # aviso al móvil cuando termina una descarga

H = {"apikey": KEY, "Authorization": "Bearer " + KEY, "Content-Type": "application/json"}

def log(*a):
    print(time.strftime("%Y-%m-%d %H:%M:%S"), *a, flush=True)

def sb_get(path, params=None):
    r = requests.get(f"{SB}/rest/v1/{path}", headers=H, params=params, timeout=30)
    r.raise_for_status()
    return r.json()

def sb_patch(table, id_, data):
    data["actualizada_en"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    r = requests.patch(f"{SB}/rest/v1/{table}", headers={**H, "Prefer": "return=minimal"},
                       params={"id": f"eq.{id_}"}, data=json.dumps(data), timeout=30)
    r.raise_for_status()

class SesionCaducada(Exception):
    """RDT-Client ha cerrado la sesión: se vuelve a entrar en el siguiente ciclo."""

def sesion_valida(r):
    if r.status_code in (401, 403): raise SesionCaducada()

def rdt_session():
    s = requests.Session()
    r = s.post(f"{RDT}/api/v2/auth/login", data={"username": RDT_USER, "password": RDT_PASS}, timeout=20)
    if r.status_code != 200 or "Ok" not in r.text:
        raise RuntimeError(f"Login RDT-Client fallido ({r.status_code})")
    return s

def resolver_imdb(sol):
    if sol.get("imdb_id"): return sol["imdb_id"]
    if not TMDB_KEY: raise RuntimeError("Solicitud sin imdb_id y falta TMDB_API_KEY")
    kind = "movie" if sol["tipo"] == "movie" else "tv"
    r = requests.get(f"https://api.themoviedb.org/3/{kind}/{sol['tmdb_id']}/external_ids",
                     params={"api_key": TMDB_KEY}, timeout=20)
    r.raise_for_status()
    imdb = r.json().get("imdb_id")
    if not imdb: raise RuntimeError("TMDB no tiene imdb_id para este título")
    sb_patch("solicitudes_descarga", sol["id"], {"imdb_id": imdb})
    return imdb

def addon_bases(user_id):
    rows = sb_get("mis_addons", {"user_id": f"eq.{user_id}", "select": "transport_url,manifest"})
    out = []
    for row in rows:
        url = row["transport_url"]
        name = ((row.get("manifest") or {}).get("name") or "addon").lower()
        if "*" in ADDON_HINTS or any(h in name or h in url.lower() for h in ADDON_HINTS):
            out.append((name, re.sub(r"/manifest\.json.*$", "", url).rstrip("/")))
    return out

def parse_size(text):
    m = re.search(r"([\d.,]+)\s*(GB|MB)", text, re.I)
    if not m: return None
    v = float(m.group(1).replace(",", "."))
    return int(v * (1024**3 if m.group(2).upper() == "GB" else 1024**2))

def score(stream, prefs):
    t = (stream.get("name", "") + " " + stream.get("title", "") + " " +
         (stream.get("behaviorHints") or {}).get("filename", "")).lower()
    size = parse_size(t)
    mx = prefs.get("max_bytes")
    if mx and size and size > mx: return None
    s = 0
    cal = prefs.get("calidades", [])
    q = "4k_hdr" if (("2160" in t or "4k" in t) and ("hdr" in t or "dv" in t or "dolby" in t)) else \
        "4k" if ("2160" in t or "4k" in t) else "1080p" if "1080" in t else "720p" if "720" in t else None
    if q in cal: s += 100 - 10 * cal.index(q)
    elif q: s += 10
    if any(k in t for k in ["castellano", "spanish", "español", "🇪🇸", "es-es", "spa"]): s += 50
    m = re.search(r"👤\s*(\d+)", t)
    if m: s += min(int(m.group(1)), 100) / 10
    return s

def get_hash(st):
    h = st.get("infoHash")
    if h: return h.lower()
    for seg in re.split(r"[/?&=]", st.get("url") or ""):
        if re.fullmatch(r"[0-9a-fA-F]{40}", seg): return seg.lower()
    return None

# ── ¿Qué es cada torrent de una serie? Un capítulo, una temporada entera (pack) o varias temporadas ──
# Los addons ponen el nombre del torrent en la primera línea del título y, si es un pack, el archivo
# del capítulo en la segunda. Son las mismas reglas que usa la app (js/fuentes.js, _fteTipoTorrent).
_META_LINEA = re.compile(r"^(?:👤|💾|⚙️|⚙|🌱|📦|🔗|[\U0001F1E6-\U0001F1FF]|Multi|Dual)")
RE_EP = re.compile(r"\bS\d{1,2}[ ._-]?E\d{1,3}\b|\b\d{1,2}x\d{2}\b", re.I)
RE_RANGO_EP = re.compile(r"\bS?\d{0,2}[ ._-]?E\d{1,3}[ ._]?[-–][ ._]?E?\d{1,3}\b", re.I)
RE_VARIAS_TEMP = re.compile(
    r"\bS\d{1,2}[ ._]?[-–][ ._]?S?\d{1,2}\b|\bS\d{1,2}(?:[ ._-]S\d{1,2})+\b|\bseasons?[ ._]?\d{1,2}[ ._]?[-–][ ._]?\d{1,2}\b"
    r"|\btemporadas?[ ._]?\d{1,2}[ ._]?(?:[-–]|a|al)[ ._]?\d{1,2}\b|\bseason[ ._]1[ ._]2[ ._]3|\bcomplete[ ._]series\b"
    r"|\bserie[ ._]completa\b|\btodas[ ._]las[ ._]temporadas\b|\[S\d{2}[-–]\d{2}\]|\bseasons\b|\btemporadas\b"
    r"|\bint[eé]grale\b|\d{1,2}ª[ ._]*(?:a|al|-|y)?[ ._]*\d{1,2}ª", re.I)
RE_UNA_TEMP = re.compile(r"\bS(\d{1,2})\b(?![ ._-]?E\d)|\bseason[ ._]?(\d{1,2})\b|\btemporada[ ._]?(\d{1,2})\b"
                         r"|\b(\d{1,2})ª[ ._]temporada|сезон:?\s?(\d{1,2})", re.I)

def _lineas(st):
    return [l.strip() for l in str(st.get("title") or st.get("description") or "").split("\n") if l.strip()]

def nombre_torrent(st):
    utiles = [l for l in _lineas(st) if not _META_LINEA.match(l)]
    return utiles[0] if utiles else ((st.get("behaviorHints") or {}).get("filename") or str(st.get("name") or "").replace("\n", " "))

def tipo_torrent(st):
    """Devuelve (clase, temporada): clase es 'episodio', 'temporada' o 'serie'."""
    n = nombre_torrent(st)
    utiles = [l for l in _lineas(st) if not _META_LINEA.match(l)]
    arch = utiles[1] if len(utiles) > 1 and re.search(r"\.(mkv|mp4|m4v|avi|ts|webm)$|S\d{1,2}[ ._-]?E\d{1,3}", utiles[1], re.I) else ""
    if RE_VARIAS_TEMP.search(n): return "serie", None
    m = RE_UNA_TEMP.search(n)
    temp = int(next(g for g in m.groups() if g)) if m else None
    if RE_RANGO_EP.search(n): return "temporada", temp
    if RE_EP.search(n): return "episodio", None
    if m: return "temporada", temp
    if re.search(r"\bfull\b(?![ ._-]?hd)", n, re.I): return "serie", None
    if re.search(r"\b(complete|completa|pack)\b", n, re.I):
        return ("temporada" if re.search(r"\bseason\b|\btemporada\b", n, re.I) else "serie"), None
    if arch and RE_EP.search(arch): return "temporada", None
    return "episodio", None

def torrents_fallidos(sol):
    """Torrents que ya se probaron para lo mismo (título, temporada y capítulo) y acabaron cancelados o con error:
       al volver a pedirlo («Probar con otro torrent») no se vuelve a elegir ninguno de ellos."""
    try:
        filtro = {"user_id": f"eq.{sol['user_id']}", "tmdb_id": f"eq.{sol['tmdb_id']}", "tipo": f"eq.{sol['tipo']}",
                  "estado": "in.(cancelada,error)", "select": "cliente_id"}
        for campo in ("temporada", "episodio"):
            filtro[campo] = "is.null" if sol.get(campo) is None else f"eq.{sol[campo]}"
        return frozenset(str(f["cliente_id"]).lower() for f in sb_get("solicitudes_descarga", filtro) if f.get("cliente_id"))
    except Exception:
        return frozenset()

def find_stream(sol, imdb, bases, excluir=frozenset()):
    """Busca el mejor torrent para lo pedido. Devuelve (torrent, motivo si no hay ninguno).
       Película → cualquier torrent. Capítulo → solo torrents de ese capítulo (nunca un pack, que bajaría
       la temporada entera). Temporada sin capítulo → solo packs de esa temporada. Serie → solo packs de la serie."""
    t, e = sol.get("temporada"), sol.get("episodio")
    if sol["tipo"] == "movie":
        kind, sid, quiere = "movie", imdb, None
    elif t is not None and e:
        kind, sid, quiere = "series", f"{imdb}:{t}:{e}", "episodio"
    elif t is not None:
        kind, sid, quiere = "series", f"{imdb}:{t}:1", "temporada"      # los packs salen al pedir el primer capítulo
    else:
        kind, sid, quiere = "series", f"{imdb}:1:1", "serie"
    best, best_s, descartados = None, -1, 0
    for name, base in bases:
        try:
            r = requests.get(f"{base}/stream/{kind}/{quote(sid)}.json", timeout=25)
            r.raise_for_status()
            streams = r.json().get("streams", [])
        except Exception as ex:
            log("addon falló", name, type(ex).__name__); continue
        con_hash = []
        for x in streams:
            h = get_hash(x)
            if h:
                x["infoHash"] = h
                con_hash.append(x)
        log("addon", name, "->", len(streams), "streams,", len(con_hash), "con torrent")
        for st in con_hash:
            if st["infoHash"] in excluir: continue      # ya se probó y falló o se atascó
            if quiere:
                clase, temp = tipo_torrent(st)
                if clase != quiere or (quiere == "temporada" and temp and temp != t):
                    descartados += 1; continue
            sc = score(st, sol.get("preferencias") or {})
            if sc is not None and sc > best_s: best, best_s = st, sc
    if best: return best, None
    motivo = {
        None: "Ningún addon devolvió torrents válidos",
        "episodio": "Solo hay packs con la temporada entera: pídela como «Temporada completa»" if descartados else "Ningún addon devolvió torrents de este capítulo",
        "temporada": "No hay ningún pack con la temporada completa: pídela capítulo a capítulo",
        "serie": "No hay ningún pack con la serie entera: pídela por temporadas",
    }[quiere]
    return None, motivo

# Trackers públicos para cuando el torrent no trae ninguno (por ejemplo, cuando se
# eligió en la app y solo se guardó el hash). Sin trackers, Real-Debrid puede no
# encontrar a nadie que comparta el archivo y el torrent se queda «stalled».
TRACKERS_PUBLICOS = [t.strip() for t in os.environ.get("TRACKERS_PUBLICOS", ",".join([
    "udp://tracker.opentrackr.org:1337/announce",
    "udp://open.demonii.com:1337/announce",
    "udp://open.stealth.si:80/announce",
    "udp://tracker.torrent.eu.org:451/announce",
    "udp://exodus.desync.com:6969/announce",
    "udp://explodie.org:6969/announce",
    "udp://tracker.openbittorrent.com:6969/announce",
    "https://tracker.opentrackr.org:443/announce",
])).split(",") if t.strip()]

def magnet(st, title):
    m = f"magnet:?xt=urn:btih:{st['infoHash']}&dn={quote(title)}"
    trackers = [tr[8:] for tr in st.get("sources", []) if tr.startswith("tracker:")]
    for tr in (trackers or TRACKERS_PUBLICOS):
        m += "&tr=" + quote(tr, safe="")
    return m

def process(sol, sess):
    sb_patch("solicitudes_descarga", sol["id"], {"estado": "procesando", "intentos": sol["intentos"] + 1})
    try:
        if sol.get("info_hash"):
            # El usuario eligió el torrent en la app: se usa ese, sin buscar
            st = {"infoHash": sol["info_hash"].lower(), "sources": []}
            log("torrent elegido en la app:", sol["titulo"], "·", sol.get("fuente") or "")
        else:
            # Sin elección: el NAS busca el mejor torrent automáticamente
            imdb = resolver_imdb(sol)
            bases = addon_bases(sol["user_id"])
            if not bases: raise RuntimeError("Sin addons compatibles")
            st, motivo = find_stream(sol, imdb, bases, torrents_fallidos(sol))
            if not st:
                sb_patch("solicitudes_descarga", sol["id"], {"estado": "sin_fuentes", "error_mensaje": motivo})
                log("sin fuentes:", sol["titulo"], "·", motivo); return
        cat = CAT_MOVIES if sol["tipo"] == "movie" else CAT_SERIES
        r = sess.post(f"{RDT}/api/v2/torrents/add", data={"urls": magnet(st, sol["titulo"]), "category": cat}, timeout=30)
        sesion_valida(r)
        if r.status_code != 200: raise RuntimeError(f"RDT-Client respondió {r.status_code}")
        sb_patch("solicitudes_descarga", sol["id"], {"estado": "descargando", "cliente_id": st["infoHash"].lower(), "error_mensaje": None,
                                                   **({"progreso": 0} if CON_PROGRESO else {})})
        log("enviada a RDT-Client:", sol["titulo"], "categoría", cat)
    except SesionCaducada:
        sb_patch("solicitudes_descarga", sol["id"], {"estado": "pendiente"})   # se reintenta con sesión nueva
        raise
    except Exception as e:
        fin = sol["intentos"] + 1 >= MAX_INTENTOS
        sb_patch("solicitudes_descarga", sol["id"], {"estado": "error" if fin else "pendiente", "error_mensaje": str(e)[:300]})
        log("error:", sol["titulo"], e)

# ¿Existen ya las columnas de progreso y cancelar? (supabase/nas.sql, apartado 6)
# Si no, el servicio sigue funcionando como antes, sin progreso ni cancelaciones.
def columnas_nuevas():
    try:
        sb_get("solicitudes_descarga", {"select": "id,progreso,cancelar", "limit": "1"})
        return True
    except Exception:
        log("Aviso: faltan las columnas de progreso/cancelar; ejecuta supabase/nas.sql para activarlas")
        return False

CON_PROGRESO = False          # se decide al arrancar (columnas_nuevas)
ETA_INFINITA = 8640000          # qBittorrent (y RDT-Client) usan este valor para «sin estimación»
ESTADOS_ERROR = {"error", "missingFiles"}
# Estados de qBittorrent (los usa RDT-Client) que significan «descarga terminada»
ESTADOS_TERMINADO = {"uploading", "stalledUP", "pausedUP", "stoppedUP", "queuedUP", "forcedUP", "checkingUP"}
_ausencias = {}                 # id → revisiones seguidas en las que el torrent no aparece en RDT-Client

def avisar_descarga(sol):
    """Aviso al móvil (función cinemood-avisos de Supabase). Si falla, la descarga sigue igual."""
    if not AVISOS_DESCARGAS or sol.get("progreso") is None:   # las antiguas, sin seguimiento, no avisan
        return
    t, e = sol.get("temporada"), sol.get("episodio")
    detalle = "" if sol.get("tipo") == "movie" else ("serie completa" if t is None else f"temporada {t} completa" if e is None else f"T{t} · E{e}")
    try:
        requests.post(f"{SB}/functions/v1/cinemood-avisos", headers=H, timeout=15, data=json.dumps(
            {"descarga": {"user_id": sol.get("user_id"), "id": sol.get("id"), "titulo": sol.get("titulo"), "detalle": detalle}}))
    except Exception as ex:
        log("no se pudo mandar el aviso:", type(ex).__name__)

def _cambia(antes, ahora):
    """¿Merece la pena escribir el progreso? (si no, se evita una escritura cada 30 s por descarga)"""
    if abs((antes.get("progreso") or 0) - (ahora["progreso"] or 0)) >= 1: return True
    if (antes.get("eta") is None) != (ahora["eta"] is None) or abs((antes.get("eta") or 0) - (ahora["eta"] or 0)) >= 60: return True
    v0, v1 = antes.get("velocidad") or 0, ahora["velocidad"] or 0
    if (v0 == 0) != (v1 == 0) or abs(v1 - v0) > 0.25 * max(v0, 1): return True
    if (antes.get("error_mensaje") or None) != ahora.get("error_mensaje", antes.get("error_mensaje") or None): return True
    return antes.get("tamano") != ahora["tamano"]

_atasco = {}   # id → (progreso de referencia, desde cuándo no avanza)

def comprobar_descargas(sess, con_progreso):
    campos = "id,cliente_id,user_id,titulo,tipo,temporada,episodio,error_mensaje" + (",progreso,velocidad,eta,tamano" if con_progreso else "")
    filas = sb_get("solicitudes_descarga", {"estado": "eq.descargando", "select": campos})
    if not filas: return
    # Una sola petición con todos los torrents de RDT-Client (antes, una por descarga)
    r = sess.get(f"{RDT}/api/v2/torrents/info", timeout=20)
    sesion_valida(r); r.raise_for_status()
    en_rdt = {str(t.get("hash", "")).lower(): t for t in (r.json() or [])}
    for sol in filas:
        try:
            t = en_rdt.get(str(sol.get("cliente_id") or "").lower())
            if not t:
                # Ya no está en RDT-Client. Se espera a no verlo dos veces seguidas, por si RDT-Client
                # aún no lo había registrado justo después de añadirlo. Después:
                #  - RDT-Client suele quitar el torrent al terminar: si iba por el 95 % o más, está terminada.
                #  - Solicitudes antiguas (de antes de guardar el progreso: progreso vacío): no se puede saber
                #    cómo iban; si ya no están en RDT-Client, se dan por terminadas.
                #  - Si desaparece a medias, alguien la borró a mano: cancelada.
                _ausencias[sol["id"]] = _ausencias.get(sol["id"], 0) + 1
                if _ausencias[sol["id"]] >= 2:
                    _ausencias.pop(sol["id"], None)
                    prog = sol.get("progreso") if con_progreso else None
                    if prog is None or prog >= 95:
                        sb_patch("solicitudes_descarga", sol["id"], {"estado": "completada", "error_mensaje": None,
                                                                   **({"progreso": 100, "velocidad": None, "eta": None} if con_progreso else {})})
                        log("terminada (ya no está en RDT-Client):", sol["id"])
                        avisar_descarga(sol)
                    else:
                        sb_patch("solicitudes_descarga", sol["id"], {"estado": "cancelada", "error_mensaje": "Se borró en RDT-Client",
                                                                   "velocidad": None, "eta": None})
                        log("borrada en RDT-Client:", sol["id"])
                continue
            _ausencias.pop(sol["id"], None)
            progreso = max(0.0, min(100.0, float(t.get("progress", 0)) * 100))
            if progreso >= 100 or t.get("state") in ESTADOS_TERMINADO:
                sb_patch("solicitudes_descarga", sol["id"], {"estado": "completada", "error_mensaje": None,
                                                           **({"progreso": 100, "velocidad": None, "eta": None} if con_progreso else {})})
                _atasco.pop(sol["id"], None)
                avisar_descarga(sol)
            elif t.get("state") in ESTADOS_ERROR:
                sb_patch("solicitudes_descarga", sol["id"], {"estado": "error", "error_mensaje": f"RDT-Client: {t.get('state')}"})
            elif con_progreso:
                eta = t.get("eta")
                # ¿Atascada? Sin velocidad (o en «stalledDL») y sin avanzar durante ATASCO_MIN minutos
                moviendo = int(t.get("dlspeed") or 0) > 0 and t.get("state") not in ("stalledDL", "metaDL")
                ref = _atasco.get(sol["id"])
                if moviendo or ref is None or progreso > ref[0] + 0.1:
                    _atasco[sol["id"]] = ref = (progreso, time.time())
                atascada = not moviendo and time.time() - ref[1] >= ATASCO_MIN * 60
                previo = sol.get("error_mensaje") or None
                aviso_atasco = (previo if previo and previo.startswith("Atascada") else
                                "Atascada: no descarga nada desde las " + time.strftime("%H:%M", time.localtime(ref[1]))) if atascada else \
                               (None if previo and previo.startswith("Atascada") else previo)
                ahora = {
                    "progreso": round(progreso, 1),
                    "velocidad": max(0, int(t.get("dlspeed") or 0)),
                    "eta": int(eta) if isinstance(eta, (int, float)) and 0 <= eta < ETA_INFINITA else None,
                    "tamano": int(t["size"]) if t.get("size") else None,
                    "error_mensaje": aviso_atasco,
                }
                if _cambia(sol, ahora): sb_patch("solicitudes_descarga", sol["id"], ahora)
        except Exception as e:
            log("comprobación falló", type(e).__name__)

# Cancelaciones pedidas desde «Mis descargas»: se borra el torrent de RDT-Client
# (sin borrar archivos ya descargados) y la solicitud queda como «cancelada».
def atender_cancelaciones(sess):
    for sol in sb_get("solicitudes_descarga", {"cancelar": "is.true", "estado": "in.(pendiente,procesando,descargando)",
                                               "select": "id,titulo,cliente_id,estado"}):
        try:
            if sol.get("cliente_id"):
                r = sess.post(f"{RDT}/api/v2/torrents/delete", data={"hashes": sol["cliente_id"], "deleteFiles": "false"}, timeout=30)
                sesion_valida(r)
                if r.status_code != 200: raise RuntimeError(f"RDT-Client respondió {r.status_code}")
            sb_patch("solicitudes_descarga", sol["id"], {"estado": "cancelada", "cancelar": False, "velocidad": None, "eta": None,
                                                       "error_mensaje": "Cancelada desde la app"})
            log("cancelada:", sol["titulo"])
        except SesionCaducada:
            raise
        except Exception as e:
            log("no se pudo cancelar", sol.get("titulo"), e)

def main():
    log("CineMood NAS iniciado")
    global CON_PROGRESO
    con_progreso = CON_PROGRESO = columnas_nuevas()
    # Si el servicio se paró a medias, lo que quedó «procesando» vuelve a la cola
    # (las que ya estaban «descargando» siguen en RDT-Client y se vuelven a seguir solas)
    try:
        for sol in sb_get("solicitudes_descarga", {"estado": "eq.procesando", "select": "id,titulo"}):
            sb_patch("solicitudes_descarga", sol["id"], {"estado": "pendiente"})
            log("vuelve a la cola:", sol["titulo"])
    except Exception as e:
        log("no se pudo revisar lo que quedó a medias:", e)
    sess = None
    while True:
        try:
            if sess is None: sess = rdt_session()      # se entra una vez y se reutiliza la sesión
            if con_progreso: atender_cancelaciones(sess)
            filtro = {"estado": "eq.pendiente", "order": "creada_en.asc", "limit": "5", "select": "*"}
            if con_progreso: filtro["cancelar"] = "is.false"
            for sol in sb_get("solicitudes_descarga", filtro):
                process(sol, sess)
            comprobar_descargas(sess, con_progreso)
        except SesionCaducada:
            log("la sesión de RDT-Client ha caducado: se vuelve a entrar"); sess = None; continue
        except Exception as e:
            log("ciclo falló:", e); sess = None      # por si RDT-Client se ha reiniciado
        time.sleep(INTERVAL)

if __name__ == "__main__":
    main()
