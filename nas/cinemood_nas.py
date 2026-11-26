"""CineMood · servicio del NAS

Lee la cola de descargas de Supabase (tabla solicitudes_descarga, ver supabase/nas.sql),
manda cada torrent a RDT-Client (que lo descarga con AllDebrid o Real-Debrid en las carpetas
que lee Plex) y va actualizando el estado de cada solicitud:

    pendiente → procesando → descargando → completada   (o error / sin_fuentes)

Mientras descarga, copia el progreso, la velocidad y el tiempo restante para verlos en «Mis descargas».
Si pides cancelar desde la app, borra el torrent de RDT-Client; si lo borras a mano en RDT-Client,
la solicitud pasa a «cancelada».

- Si en la app elegiste un torrent, la fila trae info_hash y se usa ese.
- Si no, busca el mejor torrent en tus addons (ADDON_HINTS) según calidad, idioma y semillas.

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

def find_stream(sol, imdb, bases):
    if sol["tipo"] == "movie":
        kind, sid = "movie", imdb
    else:
        if sol.get("temporada") is None or not sol.get("episodio"):
            # Peticiones antiguas de «serie/temporada completa»: la app actual las manda capítulo a capítulo
            raise RuntimeError("Falta el capítulo: vuelve a pedirla desde la app, que ahora la envía capítulo a capítulo")
        kind, sid = "series", f"{imdb}:{sol['temporada']}:{sol['episodio']}"
    best, best_s = None, -1
    for name, base in bases:
        try:
            r = requests.get(f"{base}/stream/{kind}/{quote(sid)}.json", timeout=25)
            r.raise_for_status()
            streams = r.json().get("streams", [])
        except Exception as e:
            log("addon falló", name, type(e).__name__); continue
        con_hash = []
        for x in streams:
            h = get_hash(x)
            if h:
                x["infoHash"] = h
                con_hash.append(x)
        log("addon", name, "->", len(streams), "streams,", len(con_hash), "con torrent")
        for st in con_hash:
            sc = score(st, sol["preferencias"])
            if sc is not None and sc > best_s: best, best_s = st, sc
    return best

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
            st = find_stream(sol, imdb, bases)
        if not st:
            sb_patch("solicitudes_descarga", sol["id"], {"estado": "sin_fuentes", "error_mensaje": "Ningún addon devolvió torrents válidos"})
            log("sin fuentes:", sol["titulo"]); return
        cat = CAT_MOVIES if sol["tipo"] == "movie" else CAT_SERIES
        r = sess.post(f"{RDT}/api/v2/torrents/add", data={"urls": magnet(st, sol["titulo"]), "category": cat}, timeout=30)
        if r.status_code != 200: raise RuntimeError(f"RDT-Client respondió {r.status_code}")
        sb_patch("solicitudes_descarga", sol["id"], {"estado": "descargando", "cliente_id": st["infoHash"].lower(), "error_mensaje": None})
        log("enviada a RDT-Client:", sol["titulo"], "categoría", cat)
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

ETA_INFINITA = 8640000          # qBittorrent (y RDT-Client) usan este valor para «sin estimación»
ESTADOS_ERROR = {"error", "missingFiles"}
_ausencias = {}                 # id → revisiones seguidas en las que el torrent no aparece en RDT-Client

def comprobar_descargas(sess, con_progreso):
    campos = "id,cliente_id" + (",progreso" if con_progreso else "")
    for sol in sb_get("solicitudes_descarga", {"estado": "eq.descargando", "select": campos}):
        try:
            r = sess.get(f"{RDT}/api/v2/torrents/info", params={"hashes": sol["cliente_id"]}, timeout=20)
            r.raise_for_status()
            info = r.json()
            if not info:
                # No está en RDT-Client: se borró a mano. Se espera a no verlo dos veces seguidas
                # por si RDT-Client aún no lo había registrado justo después de añadirlo.
                _ausencias[sol["id"]] = _ausencias.get(sol["id"], 0) + 1
                if _ausencias[sol["id"]] >= 2:
                    _ausencias.pop(sol["id"], None)
                    sb_patch("solicitudes_descarga", sol["id"], {"estado": "cancelada", "error_mensaje": "Se borró en RDT-Client",
                                                               **({"velocidad": None, "eta": None} if con_progreso else {})})
                    log("borrada en RDT-Client:", sol["id"])
                continue
            _ausencias.pop(sol["id"], None)
            t = info[0]
            progreso = max(0.0, min(100.0, float(t.get("progress", 0)) * 100))
            if progreso >= 100:
                sb_patch("solicitudes_descarga", sol["id"], {"estado": "completada",
                                                           **({"progreso": 100, "velocidad": None, "eta": None} if con_progreso else {})})
            elif t.get("state") in ESTADOS_ERROR:
                sb_patch("solicitudes_descarga", sol["id"], {"estado": "error", "error_mensaje": f"RDT-Client: {t.get('state')}"})
            elif con_progreso:
                eta = t.get("eta")
                sb_patch("solicitudes_descarga", sol["id"], {
                    "progreso": round(progreso, 1),
                    "velocidad": max(0, int(t.get("dlspeed") or 0)),
                    "eta": int(eta) if isinstance(eta, (int, float)) and 0 <= eta < ETA_INFINITA else None,
                    "tamano": int(t["size"]) if t.get("size") else None,
                })
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
                if r.status_code != 200: raise RuntimeError(f"RDT-Client respondió {r.status_code}")
            sb_patch("solicitudes_descarga", sol["id"], {"estado": "cancelada", "cancelar": False, "velocidad": None, "eta": None,
                                                       "error_mensaje": "Cancelada desde la app"})
            log("cancelada:", sol["titulo"])
        except Exception as e:
            log("no se pudo cancelar", sol.get("titulo"), e)

def main():
    log("CineMood NAS iniciado")
    con_progreso = columnas_nuevas()
    # Si el servicio se paró a medias, lo que quedó «procesando» vuelve a la cola
    # (las que ya estaban «descargando» siguen en RDT-Client y se vuelven a seguir solas)
    try:
        for sol in sb_get("solicitudes_descarga", {"estado": "eq.procesando", "select": "id,titulo"}):
            sb_patch("solicitudes_descarga", sol["id"], {"estado": "pendiente"})
            log("vuelve a la cola:", sol["titulo"])
    except Exception as e:
        log("no se pudo revisar lo que quedó a medias:", e)
    while True:
        try:
            sess = rdt_session()
            if con_progreso: atender_cancelaciones(sess)
            filtro = {"estado": "eq.pendiente", "order": "creada_en.asc", "limit": "5", "select": "*"}
            if con_progreso: filtro["cancelar"] = "is.false"
            for sol in sb_get("solicitudes_descarga", filtro):
                process(sol, sess)
            comprobar_descargas(sess, con_progreso)
        except Exception as e:
            log("ciclo falló:", e)
        time.sleep(INTERVAL)

if __name__ == "__main__":
    main()
