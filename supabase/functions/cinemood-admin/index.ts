// CineMood · panel de usuarios. Solo responde a cuentas que estén en la tabla cm_admins.
// Acciones (POST con JSON): listar · crear {email, password, nombre?} · clave {id, password} · bloquear {id, si} · borrar {id}
// La clave maestra (service role) solo existe aquí, en el servidor: nunca va dentro de la app.
import { createClient } from "npm:@supabase/supabase-js@2";

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const resp = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return resp({ error: "Método no permitido." }, 405);
  try {
    const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: quien, error: errQuien } = await sb.auth.getUser(token);
    const yo = quien?.user;
    if (errQuien || !yo) return resp({ error: "Inicia sesión en CineMood." }, 401);
    const { data: esAdmin } = await sb.from("cm_admins").select("user_id").eq("user_id", yo.id).maybeSingle();
    if (!esAdmin) return resp({ error: "Esta cuenta no puede gestionar usuarios." }, 403);

    const b = await req.json().catch(() => ({}));
    const id = typeof b.id === "string" ? b.id : "";
    const clave = typeof b.password === "string" ? b.password : "";
    if (["clave", "bloquear", "borrar"].includes(b.accion) && !id) return resp({ error: "Falta el usuario." }, 400);
    if (["bloquear", "borrar"].includes(b.accion) && id === yo.id) return resp({ error: "No puedes hacerte eso a ti mismo." }, 400);
    if (["crear", "clave"].includes(b.accion) && clave.length < 8) return resp({ error: "La contraseña tiene que tener al menos 8 caracteres." }, 400);

    switch (b.accion) {
      case "listar": {
        const todos: any[] = [];
        for (let page = 1; page <= 20; page++) {
          const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 200 });
          if (error) throw error;
          todos.push(...data.users);
          if (data.users.length < 200) break;
        }
        const [{ data: accesos }, { data: admins }] = await Promise.all([
          sb.from("cm_accesos").select("user_id, ultimo, veces, dispositivo"),
          sb.from("cm_admins").select("user_id"),
        ]);
        const acc = new Map((accesos || []).map((a: any) => [a.user_id, a]));
        const adm = new Set((admins || []).map((a: any) => a.user_id));
        const usuarios = todos.map((u: any) => {
          const a: any = acc.get(u.id) || {};
          return {
            id: u.id, email: u.email, nombre: u.user_metadata?.nombre || "", creado: u.created_at,
            ultimo_login: u.last_sign_in_at || null, ultimo_uso: a.ultimo || null, veces: a.veces || 0, dispositivo: a.dispositivo || "",
            bloqueado: !!(u.banned_until && new Date(u.banned_until) > new Date()), admin: adm.has(u.id), yo: u.id === yo.id,
          };
        }).sort((x, y) => String(y.ultimo_uso || y.ultimo_login || y.creado).localeCompare(String(x.ultimo_uso || x.ultimo_login || x.creado)));
        return resp({ usuarios });
      }
      case "crear": {
        const email = String(b.email || "").trim().toLowerCase();
        if (!EMAIL.test(email)) return resp({ error: "Ese email no parece válido." }, 400);
        const nombre = String(b.nombre || "").trim().slice(0, 40);
        const { data, error } = await sb.auth.admin.createUser({ email, password: clave, email_confirm: true, user_metadata: nombre ? { nombre } : {} });
        if (error) return resp({ error: /already|registered|exists/i.test(error.message) ? "Ya hay una cuenta con ese email." : error.message }, 400);
        return resp({ ok: true, id: data.user?.id });
      }
      case "clave": {
        const { error } = await sb.auth.admin.updateUserById(id, { password: clave });
        if (error) return resp({ error: error.message }, 400);
        return resp({ ok: true });
      }
      case "bloquear": {
        const { error } = await sb.auth.admin.updateUserById(id, { ban_duration: b.si ? "876000h" : "none" });
        if (error) return resp({ error: error.message }, 400);
        return resp({ ok: true });
      }
      case "borrar": {
        const { error } = await sb.auth.admin.deleteUser(id);
        if (error) return resp({ error: "No se ha podido borrar (puede que tenga datos enlazados). Puedes bloquearlo en su lugar." }, 400);
        return resp({ ok: true });
      }
      default:
        return resp({ error: "Acción desconocida." }, 400);
    }
  } catch (e) {
    return resp({ error: String((e as Error)?.message || e) }, 500);
  }
});
