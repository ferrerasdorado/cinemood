// CineMood · avisos diarios en el móvil (Web Push).
// - Episodio nuevo hoy de tus series.
// - Algo nuevo en tus plataformas que, según «Le pondrías un…», te va a encantar.
// - Los viernes: el estreno de cine de la semana que más te va a gustar.
// La llama pg_cron una vez al día (cabecera x-cron-secret). Con {"prueba":true} y la sesión del usuario, manda solo un aviso de prueba a ese usuario.
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PROXY = `${SB_URL}/functions/v1/tmdb-proxy`;
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-cron-secret", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const PLATS: Record<string, string> = { "8": "Netflix", "119": "Prime Video", "337": "Disney+", "1899": "Max", "149": "Movistar+", "350": "Apple TV+", "76": "SkyShowtime", "63": "Filmin" };
const W: Record<string, number> = { g: 1, d: 1, e: 0.7, l: 0.6, p: 0.5, t: 0.8, r: 0.5 };
const MAX_AVISOS = 3;

webpush.setVapidDetails("https://ferrerasdorado.github.io/cinemood/", Deno.env.get("VAPID_PUBLICO")!, Deno.env.get("VAPID_PRIVADO")!);

const hoyMadrid = (d = new Date()) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Madrid" }).format(d);
const fmt = (v: number) => v.toFixed(1).replace(".", ",");
async function tmdb(path: string): Promise<any> {
  try { const r = await fetch(`${PROXY}?path=${path}`); return r.ok ? await r.json() : {}; } catch { return {}; }
}
// Mismo cálculo que la app (con los datos de una lista de TMDB: sin director ni duración)
function predecir(m: any, tipo: string, x: any): number {
  const f = x.release_date || x.first_air_date || "", y = f ? Number(f.slice(0, 4)) : 0;
  const r: Record<string, string[]> = {
    g: (x.genre_ids || []).slice(0, 3).map((g: number) => "g" + g), e: y ? ["e" + Math.floor(y / 10) * 10] : [],
    l: x.original_language ? ["l" + x.original_language] : [], p: (x.origin_country || []).slice(0, 2).map((c: string) => "p" + c), t: ["t" + tipo],
  };
  let v = m.media + (x.vote_average > 0 && x.vote_count >= 20 ? m.s * (x.vote_average - m.mva) : 0);
  for (const g in r) if (r[g].length) v += W[g] * r[g].reduce((a, k) => a + (m.ef[k] || 0), 0) / r[g].length;
  return Math.max(1, Math.min(10, v));
}

async function avisosDe(sb: any, uid: string, perfil: any) {
  const tipos: string[] = perfil?.tipos || ["episodios", "llegadas", "estrenos"], hoy = hoyMadrid(), avisos: any[] = [];
  const { data: filas } = await sb.from("mi_biblioteca").select("tmdb_id,tipo,titulo,visto,pendiente,episodios_vistos").eq("user_id", uid);
  const vistos = new Set((filas || []).filter((x: any) => x.visto).map((x: any) => `${x.tmdb_id}-${x.tipo}`));
  // 1 · episodios que salen hoy
  if (tipos.includes("episodios")) {
    const series = (filas || []).filter((x: any) => x.tipo === "tv" && (x.visto || x.pendiente || (x.episodios_vistos && Object.keys(x.episodios_vistos).length))).slice(0, 60);
    for (let i = 0; i < series.length; i += 6) {
      const lote = await Promise.all(series.slice(i, i + 6).map((x: any) => tmdb(`/tv/${x.tmdb_id}&language=es-ES`)));
      lote.forEach((d: any) => {
        const ep = d?.next_episode_to_air;
        if (ep && ep.air_date === hoy) avisos.push({ clave: `ep:${d.id}:${ep.season_number}:${ep.episode_number}`, prio: 3,
          title: `📺 Hoy hay episodio nuevo de ${d.name}`, body: `T${ep.season_number} · E${ep.episode_number}${ep.name && !/^Episodio \d+$/i.test(ep.name) ? ` · ${ep.name}` : ""}`, url: `./?id=${d.id}&tipo=tv`, tag: `ep-${d.id}` });
      });
    }
  }
  const m = perfil?.modelo, umbral = m ? Math.max(8, m.media + 1.2) : 99;
  const estado = perfil?.estado || {};
  // 2 · novedades en tus plataformas que te van a encantar (se compara con lo que había ayer)
  if (m && tipos.includes("llegadas") && perfil.plats?.length) {
    const nuevoEstado: Record<string, number[]> = {};
    for (const prov of perfil.plats.slice(0, 4)) for (const t of ["movie", "tv"]) {
      const sin = t === "movie" ? "99,10770" : "10763,10764,10767,99";
      const pags = await Promise.all([1, 2, 3].map((pg) => tmdb(`/discover/${t}&language=es-ES&watch_region=ES&with_watch_providers=${prov}&with_watch_monetization_types=flatrate&without_genres=${sin}&sort_by=popularity.desc&vote_count.gte=${t === "movie" ? 80 : 40}&page=${pg}`)));
      const lista = pags.flatMap((d: any) => d.results || []), clave = `${prov}:${t}`, antes = estado.catalogo?.[clave];
      nuevoEstado[clave] = lista.map((x: any) => x.id);
      if (!antes) continue; // primera vez: solo se guarda lo que hay
      const ya = new Set(antes);
      const mejor = lista.filter((x: any) => !ya.has(x.id) && !vistos.has(`${x.id}-${t}`)).map((x: any) => ({ x, v: predecir(m, t, x) })).sort((a: any, b: any) => b.v - a.v)[0];
      if (mejor && mejor.v >= umbral) avisos.push({ clave: `llega:${t}:${mejor.x.id}`, prio: mejor.v,
        title: `🔮 Llega a ${PLATS[prov] || "tu plataforma"} algo que le pondrías un ${fmt(mejor.v)}`, body: `${mejor.x.title || mejor.x.name}${(mejor.x.release_date || mejor.x.first_air_date || "").slice(0, 4) ? ` (${(mejor.x.release_date || mejor.x.first_air_date).slice(0, 4)})` : ""} · ${t === "tv" ? "serie" : "película"}`, url: `./?id=${mejor.x.id}&tipo=${t}`, tag: `llega-${mejor.x.id}` });
    }
    estado.catalogo = nuevoEstado;
  }
  // 3 · los viernes: el estreno de cine de la semana que más te va a gustar
  const diaSemana = new Date(hoy + "T12:00:00Z").getUTCDay();
  if (m && tipos.includes("estrenos") && diaSemana === 5) {
    const fin = hoyMadrid(new Date(Date.now() + 6 * 864e5)), ini = hoyMadrid(new Date(Date.now() - 2 * 864e5));
    const d = await tmdb(`/discover/movie&language=es-ES&region=ES&with_release_type=3&release_date.gte=${ini}&release_date.lte=${fin}&sort_by=popularity.desc`);
    const mejor = (d.results || []).filter((x: any) => !vistos.has(`${x.id}-movie`)).map((x: any) => ({ x, v: predecir(m, "movie", x) })).sort((a: any, b: any) => b.v - a.v)[0];
    if (mejor && mejor.v >= Math.max(7.5, m.media + 0.8)) avisos.push({ clave: `cine:${mejor.x.id}`, prio: mejor.v - 1,
      title: `🍿 Este finde en cines: ${mejor.x.title}`, body: `Le pondrías un ${fmt(mejor.v)}. Es el estreno de la semana que más encaja contigo.`, url: `./?id=${mejor.x.id}&tipo=movie`, tag: `cine-${mejor.x.id}` });
  }
  return { avisos, estado };
}

async function enviar(sb: any, subs: any[], payload: any) {
  let ok = 0;
  for (const s of subs) {
    try { await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), { TTL: 6 * 3600 }); ok++; }
    catch (e: any) { if (e?.statusCode === 404 || e?.statusCode === 410) await sb.from("push_suscripciones").delete().eq("endpoint", s.endpoint); }
  }
  return ok;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const sb = createClient(SB_URL, SB_KEY);
  const cuerpo = await req.json().catch(() => ({}));
  const json = (o: any, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...CORS, "Content-Type": "application/json" } });
  // Aviso de prueba, pedido desde la app por el propio usuario
  if (cuerpo.prueba) {
    const token = (req.headers.get("authorization") || "").replace(/^Bearer /, "");
    const { data } = await sb.auth.getUser(token);
    if (!data?.user) return json({ error: "sin sesión" }, 401);
    const { data: subs } = await sb.from("push_suscripciones").select("*").eq("user_id", data.user.id);
    const n = await enviar(sb, subs || [], { title: "🎬 CineMood", body: "¡Listo! Así te llegarán los avisos.", url: "./" });
    return json({ enviados: n });
  }
  if (req.headers.get("x-cron-secret") !== Deno.env.get("CRON_SECRET")) return json({ error: "no autorizado" }, 401);
  const { data: todas } = await sb.from("push_suscripciones").select("*");
  const porUsuario: Record<string, any[]> = {};
  (todas || []).forEach((s: any) => (porUsuario[s.user_id] = porUsuario[s.user_id] || []).push(s));
  const resumen: any[] = [];
  for (const [uid, subs] of Object.entries(porUsuario)) {
    try {
      const { data: perfil } = await sb.from("push_perfil").select("*").eq("user_id", uid).maybeSingle();
      const { avisos, estado } = await avisosDe(sb, uid, perfil);
      if (perfil) await sb.from("push_perfil").update({ estado }).eq("user_id", uid);
      const { data: ya } = await sb.from("push_enviados").select("clave").eq("user_id", uid).in("clave", avisos.map((a) => a.clave).concat(["-"]));
      const yaSet = new Set((ya || []).map((x: any) => x.clave));
      const nuevos = avisos.filter((a) => !yaSet.has(a.clave)).sort((a, b) => b.prio - a.prio).slice(0, MAX_AVISOS);
      for (const a of nuevos) { await enviar(sb, subs, { title: a.title, body: a.body, url: a.url, tag: a.tag }); await sb.from("push_enviados").insert({ user_id: uid, clave: a.clave }); }
      resumen.push({ uid: uid.slice(0, 8), avisos: nuevos.length });
    } catch (e) { resumen.push({ uid: uid.slice(0, 8), error: String(e) }); }
  }
  return json({ ok: true, resumen });
});
