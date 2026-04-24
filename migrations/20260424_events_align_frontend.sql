-- =====================================================================
-- Migration: align `events` table with frontend (Eventi page)
-- Date: 2026-04-24
-- Idempotente: si può rieseguire senza errori.
-- =====================================================================

-- 1) Colonne attese dal frontend su public.events
alter table public.events
  add column if not exists title       text,
  add column if not exists description text,
  add column if not exists location    text,
  add column if not exists starts_at   timestamptz,
  add column if not exists ends_at     timestamptz,
  add column if not exists is_active   boolean not null default true,
  add column if not exists is_public   boolean not null default true,
  add column if not exists created_at  timestamptz not null default now(),
  add column if not exists updated_at  timestamptz not null default now();

-- 2) title obbligatorio (solo se non già NOT NULL)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='events'
      and column_name='title' and is_nullable='YES'
  ) then
    -- backfill di sicurezza per eventuali righe esistenti
    update public.events set title = coalesce(title, 'Evento senza titolo');
    alter table public.events alter column title set not null;
  end if;
end $$;

-- 3) Indici utili per i filtri usati dal frontend
create index if not exists events_starts_at_idx on public.events (starts_at);
create index if not exists events_active_public_idx on public.events (is_active, is_public);

-- 4) RLS: lettura pubblica degli eventi attivi e pubblici
alter table public.events enable row level security;

drop policy if exists "Public can read active public events" on public.events;
create policy "Public can read active public events"
  on public.events
  for select
  to anon, authenticated
  using (is_active = true and is_public = true);

-- 5) RLS event_participations: l'utente gestisce solo le proprie iscrizioni
alter table public.event_participations enable row level security;

drop policy if exists "Users read own participations" on public.event_participations;
create policy "Users read own participations"
  on public.event_participations
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users insert own participations" on public.event_participations;
create policy "Users insert own participations"
  on public.event_participations
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users delete own participations" on public.event_participations;
create policy "Users delete own participations"
  on public.event_participations
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- 6) Evita doppia iscrizione stesso utente / stesso evento
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'event_participations_user_event_unique'
  ) then
    alter table public.event_participations
      add constraint event_participations_user_event_unique
      unique (user_id, event_id);
  end if;
end $$;
