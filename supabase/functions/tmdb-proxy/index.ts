// CineMood · tmdb-proxy: pasa las peticiones de la app a TMDB sin que la clave de TMDB salga del servidor.
// Uso: GET /functions/v1/tmdb-proxy?path=/movie/603&language=es-ES  (todo lo que no es «path» se manda tal cual a TMDB)
// Solo responde a cuentas que estén en la tabla cm_permitidos (el panel de usuarios las añade al crearlas).
import { createClient } from "npm:@supabase/supabase-js@2";

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
// La clave de TMDB se busca por nombre entre los secretos (vale el «token de lectura» eyJ… o la api_key corta)
const TMDB_SECRETO = (() => { const e = Deno.env.toObject(); const k = Object.keys(e).filter((k) => /TMDB/i.test(k) && e[k]).sort((a, b) => (e[b].startsWith("eyJ") ? 1 : 0) - (e[a].startsWith("eyJ") ? 1 : 0))[0]; return k ? e[k] : ""; })();
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Access-Control-Allow-Methods": "GET, OPTIONS" };
const resp = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const permitidos = new Map<string, number>(); // user_id → hasta cuándo se recuerda (5 min)

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "GET") return resp({ error: "Método no permitido." }, 405);
  try {
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: quien, error } = await sb.auth.getUser(token);
    const uid = quien?.user?.id;
    if (error || !uid) return resp({ error: "Inicia sesión en CineMood." }, 401);
    if (!((permitidos.get(uid) || 0) > Date.now())) {
      const { data: fila } = await sb.from("cm_permitidos").select("user_id").eq("user_id", uid).maybeSingle();
      if (!fila) return resp({ error: "Esta cuenta no tiene acceso al catálogo." }, 403);
      permitidos.set(uid, Date.now() + 5 * 60_000);
    }

    const entrada = new URL(req.url);
    const ruta = entrada.searchParams.get("path") || "";
    if (!/^\/[A-Za-z0-9_\-\/]+$/.test(ruta)) return resp({ error: "Ruta no válida." }, 400);
    const url = new URL("https://api.themoviedb.org/3" + ruta);
    entrada.searchParams.forEach((v, k) => { if (k !== "path" && k !== "api_key") url.searchParams.set(k, v); });
    const h: Record<string, string> = { accept: "application/json" };
    if (TMDB_SECRETO.startsWith("eyJ")) h.Authorization = `Bearer ${TMDB_SECRETO}`; else url.searchParams.set("api_key", TMDB_SECRETO);
    const r = await fetch(url, { headers: h });
    return new Response(await r.text(), { status: r.status, headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "private, max-age=300" } });
  } catch (e) {
    return resp({ error: String((e as Error)?.message || e) }, 500);
  }
});
