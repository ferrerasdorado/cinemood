-- CineMood · «Seguir viendo» compartido entre la tele y el móvil
-- Por dónde vas en cada película o capítulo, en tu cuenta: empiezas en un aparato y sigues en otro.
-- Ejecutar una vez en Supabase → SQL Editor.

create table if not exists public.mi_progreso (
  user_id     uuid not null references auth.users(id) on delete cascade,
  clave       text not null check (char_length(clave) <= 60),          -- «movie-603» o «tv-1396-1-2»
  tmdb_id     integer not null,
  tipo        text not null check (tipo in ('movie','tv')),
  temporada   integer check (temporada is null or temporada >= 0),
  episodio    integer check (episodio is null or episodio >= 1),
  titulo      text check (char_length(titulo) <= 300),
  poster      text check (char_length(poster) <= 200),
  fondo       text check (char_length(fondo) <= 200),
  pos_seg     integer not null default 0 check (pos_seg >= 0),
  dur_seg     integer not null default 0 check (dur_seg >= 0),
  actualizado timestamptz not null default now(),
  primary key (user_id, clave)
);

create index if not exists mi_progreso_reciente on public.mi_progreso (user_id, actualizado desc);

alter table public.mi_progreso enable row level security;

drop policy if exists "progreso propio: ver"    on public.mi_progreso;
drop policy if exists "progreso propio: crear"  on public.mi_progreso;
drop policy if exists "progreso propio: cambiar" on public.mi_progreso;
drop policy if exists "progreso propio: borrar" on public.mi_progreso;
create policy "progreso propio: ver"     on public.mi_progreso for select using (auth.uid() = user_id);
create policy "progreso propio: crear"   on public.mi_progreso for insert with check (auth.uid() = user_id);
create policy "progreso propio: cambiar" on public.mi_progreso for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "progreso propio: borrar"  on public.mi_progreso for delete using (auth.uid() = user_id);

grant select, insert, update, delete on public.mi_progreso to authenticated;

notify pgrst, 'reload schema';
