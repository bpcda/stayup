-- =============================================================================
-- StayUp — schema base v2 (Supabase Cloud, esterno)
-- File: 20260623_stayup_v2_schema.sql
--
-- Crea schema PostgreSQL completo per la piattaforma StayUp:
--   profiles, event_categories, events, bookings, checkins,
--   email_logs, newsletter_subscribers, sponsors, user_interests
--
-- Convenzioni:
--   - Idempotente (if not exists / drop ... if exists).
--   - Ogni tabella pubblica include: GRANT espliciti, RLS abilitata, policy
--     per user / organizer / admin tramite has_role().
--   - Timestamp created_at + updated_at gestiti da trigger.
--   - I ruoli vivono in public.user_roles (no role su profiles per evitare
--     privilege escalation). has_role() è SECURITY DEFINER.
--
-- NOTA: non tocca dati. Per i seed di test vedi
--       20260623_stayup_v2_seed.sql (eseguire DOPO questa migration).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. Estensioni e helper generali
-- -----------------------------------------------------------------------------
create extension if not exists "pgcrypto"; -- gen_random_uuid()
create extension if not exists "citext";   -- email case-insensitive

-- Trigger generico: aggiorna updated_at a NOW() su ogni UPDATE.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- 1. Ruoli applicativi (app_role + user_roles + has_role)
--    Pattern obbligatorio per evitare ricorsioni RLS e privilege escalation.
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('admin', 'organizer', 'user');
  end if;
end$$;

create table if not exists public.user_roles (
  id       uuid primary key default gen_random_uuid(),
  user_id  uuid not null references auth.users(id) on delete cascade,
  role     public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

create index if not exists user_roles_user_id_idx on public.user_roles(user_id);

grant select on public.user_roles to authenticated;
grant all    on public.user_roles to service_role;

alter table public.user_roles enable row level security;

drop policy if exists "user_roles self read"   on public.user_roles;
drop policy if exists "user_roles admin read"  on public.user_roles;
drop policy if exists "user_roles admin write" on public.user_roles;

-- has_role deve esistere PRIMA delle policy che la usano: la creiamo ora.
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  );
$$;

create policy "user_roles self read" on public.user_roles
  for select to authenticated
  using (user_id = auth.uid());

create policy "user_roles admin read" on public.user_roles
  for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "user_roles admin write" on public.user_roles
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- -----------------------------------------------------------------------------
-- 2. profiles — anagrafica utente collegata 1:1 ad auth.users
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        citext unique,
  full_name    text,
  phone        text,
  avatar_url   text,
  birthdate    date,
  city         text,
  marketing_opt_in boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists profiles_email_idx on public.profiles(email);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;

alter table public.profiles enable row level security;

drop policy if exists "profiles self read"   on public.profiles;
drop policy if exists "profiles self upsert" on public.profiles;
drop policy if exists "profiles self update" on public.profiles;
drop policy if exists "profiles admin all"   on public.profiles;

create policy "profiles self read" on public.profiles
  for select to authenticated using (id = auth.uid());

create policy "profiles self upsert" on public.profiles
  for insert to authenticated with check (id = auth.uid());

create policy "profiles self update" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles admin all" on public.profiles
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- Autocreate profile alla registrazione di un auth.user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- 3. event_categories — tassonomia eventi
-- -----------------------------------------------------------------------------
create table if not exists public.event_categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  description text,
  color       text,
  icon        text,
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists event_categories_sort_idx on public.event_categories(sort_order);

drop trigger if exists event_categories_set_updated_at on public.event_categories;
create trigger event_categories_set_updated_at
  before update on public.event_categories
  for each row execute function public.set_updated_at();

grant select on public.event_categories to anon, authenticated;
grant all on public.event_categories to service_role;

alter table public.event_categories enable row level security;

drop policy if exists "event_categories public read" on public.event_categories;
drop policy if exists "event_categories admin write" on public.event_categories;

create policy "event_categories public read" on public.event_categories
  for select to anon, authenticated using (true);

create policy "event_categories admin write" on public.event_categories
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- -----------------------------------------------------------------------------
-- 4. events — eventi pubblicabili
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'event_status') then
    create type public.event_status as enum ('draft', 'published', 'cancelled', 'archived');
  end if;
end$$;

create table if not exists public.events (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  title         text not null,
  description   text,
  cover_image_url text,
  location      text,
  venue         text,
  category_id   uuid references public.event_categories(id) on delete set null,
  organizer_id  uuid references auth.users(id) on delete set null,
  starts_at     timestamptz not null,
  ends_at       timestamptz,
  capacity      int check (capacity is null or capacity >= 0),
  price_cents   int not null default 0 check (price_cents >= 0),
  currency      text not null default 'EUR',
  status        public.event_status not null default 'draft',
  published_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint events_dates_chk check (ends_at is null or ends_at >= starts_at)
);

create index if not exists events_starts_at_idx  on public.events(starts_at);
create index if not exists events_status_idx     on public.events(status);
create index if not exists events_category_idx   on public.events(category_id);
create index if not exists events_organizer_idx  on public.events(organizer_id);

drop trigger if exists events_set_updated_at on public.events;
create trigger events_set_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

grant select on public.events to anon, authenticated;
grant insert, update, delete on public.events to authenticated;
grant all on public.events to service_role;

alter table public.events enable row level security;

drop policy if exists "events public read published" on public.events;
drop policy if exists "events organizer read own"   on public.events;
drop policy if exists "events organizer write own"  on public.events;
drop policy if exists "events organizer insert"     on public.events;
drop policy if exists "events admin all"            on public.events;

-- Chiunque vede solo gli eventi pubblicati.
create policy "events public read published" on public.events
  for select to anon, authenticated
  using (status = 'published');

-- L'organizer vede i propri eventi anche se draft/archived.
create policy "events organizer read own" on public.events
  for select to authenticated
  using (organizer_id = auth.uid() and public.has_role(auth.uid(), 'organizer'));

create policy "events organizer insert" on public.events
  for insert to authenticated
  with check (
    public.has_role(auth.uid(), 'organizer')
    and organizer_id = auth.uid()
  );

create policy "events organizer write own" on public.events
  for update to authenticated
  using (organizer_id = auth.uid() and public.has_role(auth.uid(), 'organizer'))
  with check (organizer_id = auth.uid());

create policy "events admin all" on public.events
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- -----------------------------------------------------------------------------
-- 5. bookings — prenotazioni di un utente a un evento
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'booking_status') then
    create type public.booking_status as enum ('pending', 'confirmed', 'cancelled', 'refunded');
  end if;
end$$;

create table if not exists public.bookings (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references public.events(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  status        public.booking_status not null default 'pending',
  quantity      int  not null default 1 check (quantity > 0),
  total_cents   int  not null default 0 check (total_cents >= 0),
  currency      text not null default 'EUR',
  notes         text,
  reference_code text unique,
  booked_at     timestamptz not null default now(),
  cancelled_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (event_id, user_id)  -- un utente: una prenotazione per evento
);

create index if not exists bookings_event_idx  on public.bookings(event_id);
create index if not exists bookings_user_idx   on public.bookings(user_id);
create index if not exists bookings_status_idx on public.bookings(status);

drop trigger if exists bookings_set_updated_at on public.bookings;
create trigger bookings_set_updated_at
  before update on public.bookings
  for each row execute function public.set_updated_at();

grant select, insert, update on public.bookings to authenticated;
grant all on public.bookings to service_role;

alter table public.bookings enable row level security;

drop policy if exists "bookings user read own"     on public.bookings;
drop policy if exists "bookings user insert own"   on public.bookings;
drop policy if exists "bookings user cancel own"   on public.bookings;
drop policy if exists "bookings organizer read"    on public.bookings;
drop policy if exists "bookings admin all"         on public.bookings;

create policy "bookings user read own" on public.bookings
  for select to authenticated using (user_id = auth.uid());

create policy "bookings user insert own" on public.bookings
  for insert to authenticated with check (user_id = auth.uid());

create policy "bookings user cancel own" on public.bookings
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- L'organizer dell'evento può leggere le prenotazioni dei propri eventi.
create policy "bookings organizer read" on public.bookings
  for select to authenticated
  using (
    public.has_role(auth.uid(), 'organizer')
    and exists (
      select 1 from public.events e
      where e.id = bookings.event_id
        and e.organizer_id = auth.uid()
    )
  );

create policy "bookings admin all" on public.bookings
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- -----------------------------------------------------------------------------
-- 6. checkins — registrazione presenza all'evento
-- -----------------------------------------------------------------------------
create table if not exists public.checkins (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null references public.bookings(id) on delete cascade,
  event_id    uuid not null references public.events(id)   on delete cascade,
  user_id     uuid not null references auth.users(id)      on delete cascade,
  checked_in_at timestamptz not null default now(),
  checked_in_by uuid references auth.users(id) on delete set null,
  method      text not null default 'manual', -- manual | qr | nfc
  notes       text,
  created_at  timestamptz not null default now(),
  unique (booking_id)
);

create index if not exists checkins_event_idx on public.checkins(event_id);
create index if not exists checkins_user_idx  on public.checkins(user_id);

grant select, insert on public.checkins to authenticated;
grant all on public.checkins to service_role;

alter table public.checkins enable row level security;

drop policy if exists "checkins user read own"   on public.checkins;
drop policy if exists "checkins organizer rw"    on public.checkins;
drop policy if exists "checkins admin all"       on public.checkins;

create policy "checkins user read own" on public.checkins
  for select to authenticated using (user_id = auth.uid());

create policy "checkins organizer rw" on public.checkins
  for all to authenticated
  using (
    public.has_role(auth.uid(), 'organizer')
    and exists (
      select 1 from public.events e
      where e.id = checkins.event_id and e.organizer_id = auth.uid()
    )
  )
  with check (
    public.has_role(auth.uid(), 'organizer')
    and exists (
      select 1 from public.events e
      where e.id = checkins.event_id and e.organizer_id = auth.uid()
    )
  );

create policy "checkins admin all" on public.checkins
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- -----------------------------------------------------------------------------
-- 7. email_logs — audit trail invii Resend
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'email_status') then
    create type public.email_status as enum ('queued', 'sent', 'failed', 'bounced', 'complained');
  end if;
end$$;

create table if not exists public.email_logs (
  id            uuid primary key default gen_random_uuid(),
  to_email      citext not null,
  from_email    citext,
  subject       text not null,
  template      text,
  status        public.email_status not null default 'queued',
  provider_id   text,                   -- es. id ritornato da Resend
  error_message text,
  related_user_id    uuid references auth.users(id)      on delete set null,
  related_event_id   uuid references public.events(id)   on delete set null,
  related_booking_id uuid references public.bookings(id) on delete set null,
  payload       jsonb,
  sent_at       timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists email_logs_to_idx      on public.email_logs(to_email);
create index if not exists email_logs_status_idx  on public.email_logs(status);
create index if not exists email_logs_event_idx   on public.email_logs(related_event_id);
create index if not exists email_logs_booking_idx on public.email_logs(related_booking_id);

-- Solo service_role (Edge Functions) e admin scrivono qui.
grant select on public.email_logs to authenticated;
grant all on public.email_logs to service_role;

alter table public.email_logs enable row level security;

drop policy if exists "email_logs admin read" on public.email_logs;
drop policy if exists "email_logs admin all"  on public.email_logs;

create policy "email_logs admin all" on public.email_logs
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- -----------------------------------------------------------------------------
-- 8. newsletter_subscribers
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'newsletter_status') then
    create type public.newsletter_status as enum ('pending', 'confirmed', 'unsubscribed');
  end if;
end$$;

create table if not exists public.newsletter_subscribers (
  id              uuid primary key default gen_random_uuid(),
  email           citext not null unique,
  status          public.newsletter_status not null default 'pending',
  source          text,
  user_id         uuid references auth.users(id) on delete set null,
  confirmation_token text,
  confirmed_at    timestamptz,
  unsubscribed_at timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists newsletter_status_idx on public.newsletter_subscribers(status);

drop trigger if exists newsletter_set_updated_at on public.newsletter_subscribers;
create trigger newsletter_set_updated_at
  before update on public.newsletter_subscribers
  for each row execute function public.set_updated_at();

-- Iscrizione disponibile anche ad utenti non autenticati (form pubblico).
grant insert on public.newsletter_subscribers to anon;
grant select, insert, update on public.newsletter_subscribers to authenticated;
grant all on public.newsletter_subscribers to service_role;

alter table public.newsletter_subscribers enable row level security;

drop policy if exists "newsletter anon insert"     on public.newsletter_subscribers;
drop policy if exists "newsletter user read own"   on public.newsletter_subscribers;
drop policy if exists "newsletter user update own" on public.newsletter_subscribers;
drop policy if exists "newsletter admin all"       on public.newsletter_subscribers;

create policy "newsletter anon insert" on public.newsletter_subscribers
  for insert to anon, authenticated
  with check (true);

create policy "newsletter user read own" on public.newsletter_subscribers
  for select to authenticated
  using (user_id = auth.uid());

create policy "newsletter user update own" on public.newsletter_subscribers
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "newsletter admin all" on public.newsletter_subscribers
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- -----------------------------------------------------------------------------
-- 9. sponsors — partner / sponsor mostrati nel sito
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'sponsor_tier') then
    create type public.sponsor_tier as enum ('platinum', 'gold', 'silver', 'bronze', 'partner');
  end if;
end$$;

create table if not exists public.sponsors (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  description text,
  logo_url    text,
  website_url text,
  tier        public.sponsor_tier not null default 'partner',
  is_active   boolean not null default true,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists sponsors_active_idx on public.sponsors(is_active);
create index if not exists sponsors_tier_idx   on public.sponsors(tier);

drop trigger if exists sponsors_set_updated_at on public.sponsors;
create trigger sponsors_set_updated_at
  before update on public.sponsors
  for each row execute function public.set_updated_at();

grant select on public.sponsors to anon, authenticated;
grant all on public.sponsors to service_role;

alter table public.sponsors enable row level security;

drop policy if exists "sponsors public read" on public.sponsors;
drop policy if exists "sponsors admin all"   on public.sponsors;

create policy "sponsors public read" on public.sponsors
  for select to anon, authenticated using (is_active = true);

create policy "sponsors admin all" on public.sponsors
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- -----------------------------------------------------------------------------
-- 10. user_interests — categorie d'interesse selezionate dall'utente
-- -----------------------------------------------------------------------------
create table if not exists public.user_interests (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id)            on delete cascade,
  category_id uuid not null references public.event_categories(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (user_id, category_id)
);

create index if not exists user_interests_user_idx on public.user_interests(user_id);

grant select, insert, delete on public.user_interests to authenticated;
grant all on public.user_interests to service_role;

alter table public.user_interests enable row level security;

drop policy if exists "user_interests self rw" on public.user_interests;
drop policy if exists "user_interests admin all" on public.user_interests;

create policy "user_interests self rw" on public.user_interests
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "user_interests admin all" on public.user_interests
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- =============================================================================
-- FINE migration.
-- =============================================================================
