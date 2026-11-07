-- CineMood · tablas de los avisos en el móvil (notificaciones push)
create table if not exists public.push_suscripciones (
  endpoint text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  p256dh text not null,
  auth text not null,
  creado_en timestamptz not null default now()
);
alter table public.push_suscripciones enable row level security;
drop policy if exists "suscripciones propias" on public.push_suscripciones;
create policy "suscripciones propias" on public.push_suscripciones for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Lo que el servidor necesita para decidir qué avisar: el modelo de «Le pondrías un…», tus plataformas y qué avisos quieres
create table if not exists public.push_perfil (
  user_id uuid primary key references auth.users(id) on delete cascade,
  modelo jsonb,
  plats text[] not null default '{}',
  tipos text[] not null default '{episodios,llegadas,estrenos}',
  estado jsonb not null default '{}'::jsonb,
  actualizado timestamptz not null default now()
);
alter table public.push_perfil enable row level security;
drop policy if exists "perfil propio" on public.push_perfil;
create policy "perfil propio" on public.push_perfil for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Avisos ya enviados (para no repetir). Solo lo usa el servidor
create table if not exists public.push_enviados (
  user_id uuid not null references auth.users(id) on delete cascade,
  clave text not null,
  enviado_en timestamptz not null default now(),
  primary key (user_id, clave)
);
alter table public.push_enviados enable row level security;

-- Cada día a las 17:00 UTC (18:00 en invierno / 19:00 en verano en España) se llama a la función.
-- La clave secreta se pone al aplicarlo (no se guarda en el repositorio):
-- create extension if not exists pg_cron; create extension if not exists pg_net;
-- select cron.schedule('cinemood-avisos', '0 17 * * *', $$ select net.http_post(
--   url := 'https://qdkoksbclukpdvhgrucg.supabase.co/functions/v1/cinemood-avisos',
--   headers := jsonb_build_object('Content-Type','application/json','x-cron-secret','<CRON_SECRET>'),
--   body := '{}'::jsonb) $$);
