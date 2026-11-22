// Autenticación verificada en el servidor; solo cuentas autorizadas.
// Autorizadas: las dos de siempre y las que estén en la tabla cm_permitidos (el panel de usuarios las añade al crearlas).
// No se almacena ni se registra el token del usuario.
const ALLOWED_USERS = new Set([
  "ad47446f-0c28-475f-8b74-362b908bec24",
  "9ccf2e37-6c4e-495b-a5bf-5542d95fa895",
]);
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Max-Age": "600",
  "Access-Control-Expose-Headers": "X-CineMood-Auth",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "X-CineMood-Auth": "required",
};
function reply(status: number, error: string): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
// Cuentas ya comprobadas en cm_permitidos (se recuerdan 5 minutos para no consultar en cada petición)
const permitidosCache = new Map<string, number>();
export function createHandler(deps: {
  env: (key: string) => string | undefined;
  fetch: typeof fetch;
}) {
  // La propia cuenta consulta su fila con su sesión: la tabla solo deja ver la fila de uno mismo.
  async function estaPermitido(supabaseURL: string, authKey: string, authorization: string, id: string): Promise<boolean> {
    if (ALLOWED_USERS.has(id)) return true;
    if ((permitidosCache.get(id) || 0) > Date.now()) return true;
    try {
      const r = await deps.fetch(`${supabaseURL}/rest/v1/cm_permitidos?select=user_id&user_id=eq.${encodeURIComponent(id)}`, {
        headers: { authorization, apikey: authKey, accept: "application/json" },
        signal: AbortSignal.timeout(10000),
        redirect: "error",
        cache: "no-store",
      });
      if (!r.ok) return false;
      const filas = await r.json();
      const si = Array.isArray(filas) && filas.some((f: { user_id?: string }) => f?.user_id === id);
      if (si) permitidosCache.set(id, Date.now() + 5 * 60_000);
      return si;
    } catch {
      return false;
    }
  }
  return async function handler(req: Request): Promise<Response> {
    // OPTIONS no devuelve datos: solo permite el preflight del navegador.
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
    if (req.method !== "GET") return reply(405, "Método no permitido.");
    const authorization = req.headers.get("authorization") || "";
    if (!/^Bearer [A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(authorization)) {
      return reply(401, "Debes iniciar sesión.");
    }
    const supabaseURL = deps.env("SUPABASE_URL");
    const authKey = deps.env("SUPABASE_ANON_KEY");
    if (!supabaseURL || !authKey) return reply(503, "Servicio de autenticación no disponible.");
    let user;
    try {
      // Auth verifica la firma, validez y usuario del token. No se confía en decodificarlo.
      const check = await deps.fetch(`${supabaseURL}/auth/v1/user`, {
        headers: { authorization, apikey: authKey },
        signal: AbortSignal.timeout(10000),
        redirect: "error",
        cache: "no-store",
      });
      if (check.status === 401 || check.status === 403) return reply(401, "Sesión no válida.");
      if (!check.ok) return reply(503, "No se pudo comprobar la sesión.");
      user = await check.json();
    } catch {
      return reply(503, "No se pudo comprobar la sesión.");
    }
    if (!user?.id || user.is_anonymous === true || !(await estaPermitido(supabaseURL, authKey, authorization, user.id))) {
      return reply(403, "Esta cuenta no tiene acceso a CineMood.");
    }
    const url = new URL(req.url);
    const path = url.searchParams.get("path") || "";
    if (url.search.length > 8192 ||
        !/^\/(?:movie|tv|person|collection|search|discover|genre|trending)\/[a-zA-Z0-9_/-]+$/.test(path)) {
      return reply(400, "Ruta de catálogo no permitida.");
    }
    const tmdbKey = deps.env("TMDB_API_KEY");
    if (!tmdbKey) return reply(503, "Catálogo no disponible.");
    const params = new URLSearchParams(url.searchParams);
    params.delete("path");
    params.delete("api_key");
    params.delete("access_token");
    params.set("api_key", tmdbKey);
    try {
      const upstream = await deps.fetch(`https://api.themoviedb.org/3${path}?${params}`, {
        signal: AbortSignal.timeout(15000),
        redirect: "error",
        cache: "no-store",
      });
      if (!upstream.headers.get("content-type")?.includes("application/json")) {
        return reply(502, "Respuesta de catálogo no válida.");
      }
      // No se reenvía el token de Supabase a TMDB.
      return new Response(JSON.stringify(await upstream.json()), {
        status: upstream.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch {
      return reply(502, "No se pudo contactar con el catálogo.");
    }
  };
}
