-- =============================================================================
-- StayUp — schema v2 / shuttle + participations (Supabase Cloud, esterno)
-- File: 20260623_stayup_v2_shuttle.sql
--
-- Aggiunge le tabelle specifiche StayUp non presenti nello schema v2 base:
--   - shuttle_slots          (slot navetta andata)
--   - shuttle_return_slots   (slot navetta ritorno)
--   - shuttle_bookings       (prenotazioni navetta — sostituiscono il flusso Appwrite)
--   - event_participations   (RSVP semplice a un evento)
--
-- Estende public.events con i campi richiesti dall'admin UI (legacy Appwrite):
--   is_active, is_public, has_shuttle, price_one_way, price_round_trip.
--
-- Crea il bucket Storage `event-images` (public read, write admin).
--
-- Idempotente. Eseguire DOPO 20260623_stayup_v2_schema.sql.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. Estensione events con campi legacy (admin Appwrite usa questi nomi)
-- -----------------------------------------------------------------------------
alter table public.events add column if not exists is_active        boolean not null default true;
alter table public.events add column if not exists is_public        boolean not null default true;
alter table public.events add column if not exists has_shuttle      boolean not null default false;
alter table public.events add column if not exists price_one_way    numeric not null default 0;
alter table public.events add column if not exists price_round_trip numeric not null default 0;

-- -----------------------------------------------------------------------------
-- 1. shuttle_slots — slot di andata
-- -----------------------------------------------------------------------------
create table if not exists public.shuttle_slots (
  id              uuid primary key default gen_random_uuid(),
  event_id        uuid references public.events(id) on delete cascade,
  giorno          text not null,
  fermata         text not null,
  orario          text not null,
  capienza        int  not null default 50 check (capienza >= 0),
  trip_group_id   uuid,
  price_override  numeric,
  nascosto        boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists shuttle_slots_giorno_idx     on public.shuttle_slots(giorno);
create index if not exists shuttle_slots_event_idx      on public.shuttle_slots(event_id);
create index if not exists shuttle_slots_trip_group_idx on public.shuttle_slots(trip_group_id);

drop trigger if exists shuttle_slots_set_updated_at on public.shuttle_slots;
create trigger shuttle_slots_set_updated_at
  before update on public.shuttle_slots
  for each row execute function public.set_updated_at();

grant select on public.shuttle_slots to anon, authenticated;
grant insert, update, delete on public.shuttle_slots to authenticated;
grant all on public.shuttle_slots to service_role;

alter table public.shuttle_slots enable row level security;

drop policy if exists "shuttle_slots public read" on public.shuttle_slots;
drop policy if exists "shuttle_slots admin write" on public.shuttle_slots;

create policy "shuttle_slots public read" on public.shuttle_slots
  for select to anon, authenticated using (true);

create policy "shuttle_slots admin write" on public.shuttle_slots
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- -----------------------------------------------------------------------------
-- 2. shuttle_return_slots — slot di ritorno
-- -----------------------------------------------------------------------------
create table if not exists public.shuttle_return_slots (
  id              uuid primary key default gen_random_uuid(),
  event_id        uuid references public.events(id) on delete cascade,
  giorno          text not null,
  orario          text not null,
  capienza        int  not null default 50 check (capienza >= 0),
  price_override  numeric,
  nascosto        boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists shuttle_return_slots_giorno_idx on public.shuttle_return_slots(giorno);
create index if not exists shuttle_return_slots_event_idx  on public.shuttle_return_slots(event_id);

drop trigger if exists shuttle_return_slots_set_updated_at on public.shuttle_return_slots;
create trigger shuttle_return_slots_set_updated_at
  before update on public.shuttle_return_slots
  for each row execute function public.set_updated_at();

grant select on public.shuttle_return_slots to anon, authenticated;
grant insert, update, delete on public.shuttle_return_slots to authenticated;
grant all on public.shuttle_return_slots to service_role;

alter table public.shuttle_return_slots enable row level security;

drop policy if exists "shuttle_return_slots public read" on public.shuttle_return_slots;
drop policy if exists "shuttle_return_slots admin write" on public.shuttle_return_slots;

create policy "shuttle_return_slots public read" on public.shuttle_return_slots
  for select to anon, authenticated using (true);

create policy "shuttle_return_slots admin write" on public.shuttle_return_slots
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- -----------------------------------------------------------------------------
-- 3. shuttle_bookings — prenotazioni navetta (sostituiscono Appwrite bookings)
-- -----------------------------------------------------------------------------
create table if not exists public.shuttle_bookings (
  id               uuid primary key default gen_random_uuid(),
  event_id         uuid references public.events(id) on delete set null,
  user_id          uuid references auth.users(id)   on delete set null,
  nome             text not null,
  email            citext not null,
  telefono         text not null,
  tipo_viaggio     text not null check (tipo_viaggio in ('andata','ritorno','andata_ritorno')),
  giorno           text not null,
  fermata          text,
  orario           text,
  orario_ritorno   text,
  stato            text not null default 'pending',
  pagato           boolean not null default false,
  price_paid       numeric not null default 0,
  reference_code   text unique,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists shuttle_bookings_event_idx  on public.shuttle_bookings(event_id);
create index if not exists shuttle_bookings_user_idx   on public.shuttle_bookings(user_id);
create index if not exists shuttle_bookings_email_idx  on public.shuttle_bookings(email);
create index if not exists shuttle_bookings_giorno_idx on public.shuttle_bookings(giorno);
create index if not exists shuttle_bookings_pagato_idx on public.shuttle_bookings(pagato);

drop trigger if exists shuttle_bookings_set_updated_at on public.shuttle_bookings;
create trigger shuttle_bookings_set_updated_at
  before update on public.shuttle_bookings
  for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.shuttle_bookings to authenticated;
grant insert on public.shuttle_bookings to anon;   -- prenotazione anche da utente non loggato
grant all on public.shuttle_bookings to service_role;

alter table public.shuttle_bookings enable row level security;

drop policy if exists "shuttle_bookings anon insert"   on public.shuttle_bookings;
drop policy if exists "shuttle_bookings user insert"   on public.shuttle_bookings;
drop policy if exists "shuttle_bookings user read own" on public.shuttle_bookings;
drop policy if exists "shuttle_bookings admin all"     on public.shuttle_bookings;

-- anon può creare una booking, ma la insert vera passa dalla Edge Function
-- (service_role bypassa comunque RLS). La policy esiste per consentire fallback diretto.
create policy "shuttle_bookings anon insert" on public.shuttle_bookings
  for insert to anon
  with check (user_id is null);

create policy "shuttle_bookings user insert" on public.shuttle_bookings
  for insert to authenticated
  with check (user_id is null or user_id = auth.uid());

create policy "shuttle_bookings user read own" on public.shuttle_bookings
  for select to authenticated
  using (user_id = auth.uid());

create policy "shuttle_bookings admin all" on public.shuttle_bookings
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- -----------------------------------------------------------------------------
-- 4. event_participations — RSVP semplice a un evento
-- -----------------------------------------------------------------------------
create table if not exists public.event_participations (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events(id) on delete cascade,
  user_id     uuid not null references auth.users(id)   on delete cascade,
  status      text not null default 'registered',
  created_at  timestamptz not null default now(),
  unique (event_id, user_id)
);

create index if not exists event_participations_event_idx on public.event_participations(event_id);
create index if not exists event_participations_user_idx  on public.event_participations(user_id);

grant select, insert, delete on public.event_participations to authenticated;
grant all on public.event_participations to service_role;

alter table public.event_participations enable row level security;

drop policy if exists "event_participations user read own"   on public.event_participations;
drop policy if exists "event_participations user insert own" on public.event_participations;
drop policy if exists "event_participations user delete own" on public.event_participations;
drop policy if exists "event_participations admin all"       on public.event_participations;

create policy "event_participations user read own" on public.event_participations
  for select to authenticated
  using (user_id = auth.uid());

create policy "event_participations user insert own" on public.event_participations
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "event_participations user delete own" on public.event_participations
  for delete to authenticated
  using (user_id = auth.uid());

create policy "event_participations admin all" on public.event_participations
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- -----------------------------------------------------------------------------
-- 5. Storage bucket: event-images (public read, admin write)
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('event-images', 'event-images', true)
on conflict (id) do nothing;

drop policy if exists "event-images public read"  on storage.objects;
drop policy if exists "event-images admin write"  on storage.objects;
drop policy if exists "event-images admin update" on storage.objects;
drop policy if exists "event-images admin delete" on storage.objects;

create policy "event-images public read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'event-images');

create policy "event-images admin write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'event-images' and public.has_role(auth.uid(), 'admin'));

create policy "event-images admin update" on storage.objects
  for update to authenticated
  using (bucket_id = 'event-images' and public.has_role(auth.uid(), 'admin'));

create policy "event-images admin delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'event-images' and public.has_role(auth.uid(), 'admin'));
