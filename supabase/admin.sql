-- CineMood · panel de usuarios (solo para la cuenta administradora) y registro de uso de la app

-- Quién puede gestionar usuarios. Cada uno solo puede ver si él mismo está en la lista.
create table if not exists public.cm_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.cm_admins enable row level security;
drop policy if exists "ver si soy admin" on public.cm_admins;
create policy "ver si soy admin" on public.cm_admins for select using (auth.uid() = user_id);

-- La cuenta de ferrerasdorado es la administradora
insert into public.cm_admins (user_id)
  select id from auth.users where email ilike 'ferrerasdorado@%'
  on conflict do nothing;

-- Nombres para el saludo «Hola, …» (se mezclan con lo que ya guarda cada cuenta)
update auth.users set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || '{"nombre":"Alfred"}'::jsonb
  where email ilike 'ferrerasdorado@%';
update auth.users set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || '{"nombre":"MalosPelos"}'::jsonb
  where email ilike 'joharicci%';

-- Último uso real de la app (Supabase solo apunta cuándo se escribió la contraseña;
-- como la sesión se recuerda, eso no dice si alguien la sigue usando)
create table if not exists public.cm_accesos (
  user_id uuid primary key references auth.users(id) on delete cascade,
  ultimo timestamptz not null default now(),
  veces integer not null default 1,
  dispositivo text
);
alter table public.cm_accesos enable row level security;
-- sin políticas: nadie lo lee ni lo escribe directamente; se apunta con la función de abajo y lo lee el panel (servidor)

create or replace function public.cm_registrar_acceso(disp text)
returns void language sql security definer set search_path = public as $$
  insert into public.cm_accesos (user_id, ultimo, veces, dispositivo)
  values (auth.uid(), now(), 1, left(disp, 40))
  on conflict (user_id) do update set ultimo = now(), veces = cm_accesos.veces + 1, dispositivo = left(disp, 40);
$$;
revoke all on function public.cm_registrar_acceso(text) from public, anon;
grant execute on function public.cm_registrar_acceso(text) to authenticated;

-- Comprobación: debe salir tu email como administrador, y los nombres puestos
select u.email, 'administrador' as que from public.cm_admins a join auth.users u on u.id = a.user_id
union all
select email, 'Hola, ' || (raw_user_meta_data->>'nombre') from auth.users where raw_user_meta_data ? 'nombre';
