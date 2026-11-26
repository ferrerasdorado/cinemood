-- CineMood · cola de descargas del NAS
--
-- La app guarda aquí lo que quieres descargar (botón «NAS» de la ficha o «Enviar al NAS» en «Ver»).
-- El script del NAS (nas/cinemood_nas.py) lee las filas en «pendiente», manda el torrent a RDT-Client
-- (que lo descarga con AllDebrid o Real-Debrid) y va actualizando «estado».
--
--   pendiente → procesando → descargando → completada
--                         ↘ error / sin_fuentes (se pueden reintentar desde «Mis descargas»)
--   cancelada: la cancelaste desde «Mis descargas» o se borró a mano en RDT-Client
--
-- Se puede ejecutar entero en el SQL Editor de Supabase tantas veces como haga falta:
-- lo que ya existe no se duplica ni se borra.

-- 1) Tabla (si ya existe, no se toca)
create table if not exists public.solicitudes_descarga (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  tmdb_id        integer not null check (tmdb_id > 0),
  imdb_id        text,
  tipo           text not null check (tipo in ('movie', 'tv')),
  titulo         text not null check (length(titulo) between 1 and 500),
  temporada      integer,
  episodio       integer,
  preferencias   jsonb not null default '{}'::jsonb,
  estado         text not null default 'pendiente'
                 check (estado in ('pendiente', 'procesando', 'descargando', 'completada', 'error', 'sin_fuentes')),
  intentos       integer not null default 0 check (intentos >= 0),
  cliente_id     text,
  error_mensaje  text,
  creada_en      timestamptz not null default now(),
  actualizada_en timestamptz not null default now()
);

-- 2) Torrent elegido en la app (si se deja vacío, el NAS elige uno automáticamente)
--    info_hash: el identificador del torrent (40 caracteres hexadecimales o 32 en base32)
--    fuente:    proveedor y nombre del archivo, solo para mostrarlo; nunca el enlace,
--               que puede llevar la clave privada del servicio de debrid
alter table public.solicitudes_descarga
  add column if not exists info_hash text
    check (info_hash is null or info_hash ~* '^([a-f0-9]{40}|[a-z2-7]{32})$'),
  add column if not exists fuente text
    check (fuente is null or length(fuente) <= 300);

-- 3) Qué combinaciones de temporada y capítulo son válidas
--    Película: sin temporada ni capítulo.
--    Serie:    un capítulo (temporada + capítulo). También se admiten «temporada completa»
--              (solo temporada) y «serie completa» (nada) por compatibilidad, aunque la app
--              actual las convierte en una fila por capítulo.
--    Los «is not null» son necesarios: en un CHECK, una comparación con NULL da NULL y la fila se aceptaría.
alter table public.solicitudes_descarga drop constraint if exists solicitudes_descarga_check;
alter table public.solicitudes_descarga add constraint solicitudes_descarga_check check (
  (tipo = 'movie' and temporada is null and episodio is null)
  or
  (tipo = 'tv' and (
       (temporada is null and episodio is null)
    or (temporada is not null and temporada >= 0 and episodio is null)
    or (temporada is not null and temporada >= 0 and episodio is not null and episodio >= 1)
  ))
);

-- 4) Seguridad: cada usuario solo ve y toca sus propias filas
alter table public.solicitudes_descarga enable row level security;

drop policy if exists "nas: crear las mías" on public.solicitudes_descarga;
create policy "nas: crear las mías" on public.solicitudes_descarga
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "nas: ver las mías" on public.solicitudes_descarga;
create policy "nas: ver las mías" on public.solicitudes_descarga
  for select to authenticated using (user_id = auth.uid());

-- Solo se pueden quitar las que no está procesando el NAS en ese momento
drop policy if exists "nas: quitar las mías" on public.solicitudes_descarga;
create policy "nas: quitar las mías" on public.solicitudes_descarga
  for delete to authenticated
  using (user_id = auth.uid() and estado in ('pendiente', 'completada', 'error', 'sin_fuentes'));

-- Permisos por columna: la app solo puede escribir lo que pide el usuario.
-- estado, intentos, error_mensaje… solo los cambia el NAS (con la clave de servicio).
grant insert (tmdb_id, tipo, titulo, temporada, episodio, info_hash, fuente)
  on public.solicitudes_descarga to authenticated;
grant select (id, user_id, tmdb_id, tipo, titulo, temporada, episodio, estado, fuente,
              error_mensaje, info_hash, creada_en, actualizada_en)
  on public.solicitudes_descarga to authenticated;
grant delete on public.solicitudes_descarga to authenticated;

-- 5) Índices para que «Mis descargas» y el NAS vayan rápidos
create index if not exists solicitudes_descarga_usuario_idx
  on public.solicitudes_descarga (user_id, creada_en desc);
create index if not exists solicitudes_descarga_estado_idx
  on public.solicitudes_descarga (estado, creada_en);

-- 6) Progreso de la descarga y cancelar desde la app
--    El NAS copia aquí lo que le dice RDT-Client cada vez que revisa (cada INTERVAL segundos).
alter table public.solicitudes_descarga
  add column if not exists progreso  real    check (progreso is null or progreso between 0 and 100),
  add column if not exists velocidad bigint  check (velocidad is null or velocidad >= 0),  -- bytes por segundo
  add column if not exists eta       integer check (eta is null or eta >= 0),              -- segundos que faltan
  add column if not exists tamano    bigint  check (tamano is null or tamano >= 0),        -- bytes
  add column if not exists cancelar  boolean not null default false;                      -- lo marca la app; lo atiende el NAS

-- Nuevo estado «cancelada»: la cancelaste desde la app o se borró a mano en RDT-Client.
-- «not valid»: no revisa las filas que ya existen, solo las nuevas y las que cambien.
alter table public.solicitudes_descarga drop constraint if exists solicitudes_descarga_estado_check;
alter table public.solicitudes_descarga add constraint solicitudes_descarga_estado_check
  check (estado in ('pendiente', 'procesando', 'descargando', 'completada', 'error', 'sin_fuentes', 'cancelada')) not valid;

-- La app puede leer el progreso y pedir que se cancele (solo esa columna, y solo en sus filas)
grant select (progreso, velocidad, eta, tamano, cancelar) on public.solicitudes_descarga to authenticated;
grant update (cancelar) on public.solicitudes_descarga to authenticated;

drop policy if exists "nas: cancelar las mías" on public.solicitudes_descarga;
create policy "nas: cancelar las mías" on public.solicitudes_descarga
  for update to authenticated
  using (user_id = auth.uid() and estado in ('pendiente', 'procesando', 'descargando'))
  with check (user_id = auth.uid());

-- Las canceladas también se pueden quitar de la lista
drop policy if exists "nas: quitar las mías" on public.solicitudes_descarga;
create policy "nas: quitar las mías" on public.solicitudes_descarga
  for delete to authenticated
  using (user_id = auth.uid() and estado in ('pendiente', 'completada', 'error', 'sin_fuentes', 'cancelada'));

-- 7) Que la API de Supabase vea los cambios al momento
notify pgrst, 'reload schema';
