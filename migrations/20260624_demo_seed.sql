-- =============================================================================
-- StayUp — DEMO SEED dati di test piattaforma
-- File: 20260624_demo_seed.sql
--
-- Inserisce in modo IDEMPOTENTE:
--   - 2 categorie evento (concerti, festival)
--   - 1 sponsor demo
--   - 3 eventi futuri (published)
--   - 2 eventi passati (ended/archived)
--   - 3 prenotazioni confirmed
--   - 1 check-in registrato
--   - Ruoli per utenti demo (organizer + admin) se gli account auth esistono
--
-- ── SICUREZZA ─────────────────────────────────────────────────────────────────
-- Non crea utenti in auth.users (sarebbe insicuro: niente password hashing
-- corretto da SQL). Gli account vanno creati prima via /auth oppure dal pannello
-- Supabase con queste email (modificabili sotto):
--     demo_admin_email     := 'admin@stayup.demo'
--     demo_organizer_email := 'organizer@stayup.demo'
-- Se gli utenti non esistono, le sezioni dipendenti vengono skippate con
-- NOTICE (la migration NON fallisce). Le prenotazioni usano l'organizer come
-- prenotante demo, e in mancanza saltano i blocchi correlati.
--
-- Eseguire DOPO le migration di schema v2.
-- =============================================================================

do $$
declare
  demo_admin_email      text := 'admin@stayup.demo';
  demo_organizer_email  text := 'organizer@stayup.demo';
  v_admin_id            uuid;
  v_organizer_id        uuid;
  v_cat_concerti        uuid;
  v_cat_festival        uuid;
  v_sponsor_id          uuid;
  v_evt_f1              uuid;
  v_evt_f2              uuid;
  v_evt_f3              uuid;
  v_evt_p1              uuid;
  v_evt_p2              uuid;
  v_booking_1           uuid;
  v_booking_2           uuid;
  v_booking_3           uuid;
begin
  ---------------------------------------------------------------------------
  -- 0) Utenti demo (lookup, no insert in auth.users)
  ---------------------------------------------------------------------------
  select id into v_admin_id     from auth.users where email = demo_admin_email     limit 1;
  select id into v_organizer_id from auth.users where email = demo_organizer_email limit 1;

  if v_admin_id is null then
    raise notice '[seed] Admin demo (%) non trovato in auth.users — assegnazione ruolo admin skippata.', demo_admin_email;
  end if;
  if v_organizer_id is null then
    raise notice '[seed] Organizer demo (%) non trovato in auth.users — eventi/prenotazioni demo che richiedono organizer/user verranno comunque seedati ma senza organizer_id/bookings reali.', demo_organizer_email;
  end if;

  ---------------------------------------------------------------------------
  -- 1) Categorie (2)
  ---------------------------------------------------------------------------
  insert into public.event_categories (slug, name, description, color, icon, sort_order)
  values
    ('concerti', 'Concerti',  'Live music ed eventi musicali', '#e11d48', 'music',     10),
    ('festival', 'Festival',  'Festival e rassegne',           '#7c3aed', 'sparkles',  20)
  on conflict (slug) do nothing;

  select id into v_cat_concerti from public.event_categories where slug = 'concerti';
  select id into v_cat_festival from public.event_categories where slug = 'festival';

  ---------------------------------------------------------------------------
  -- 2) Sponsor demo (1)
  ---------------------------------------------------------------------------
  insert into public.sponsors (slug, name, description, logo_url, website_url, tier, is_active, sort_order)
  values
    ('seed-sponsor-demo', 'Demo Sponsor SRL',
     'Sponsor di test per la piattaforma StayUp.',
     null, 'https://example.com', 'gold'::public.sponsor_tier, true, 10)
  on conflict (slug) do nothing;

  select id into v_sponsor_id from public.sponsors where slug = 'seed-sponsor-demo';

  ---------------------------------------------------------------------------
  -- 3) Eventi futuri (3 published)
  ---------------------------------------------------------------------------
  insert into public.events (
    slug, title, short_description, description, location, venue,
    category_id, organizer_id, starts_at, ends_at,
    capacity, price_cents, currency, status, published_at, sponsor_ids
  ) values
    ('seed-futuro-1', 'Demo — Concerto Estivo',
     'Live in piazza con headliner italiano.',
     'Evento demo: concerto estivo in piazza con band locali e ospite nazionale.',
     'Piacenza', 'Piazza Cavalli',
     v_cat_concerti, v_organizer_id,
     now() + interval '14 days',  now() + interval '14 days' + interval '3 hours',
     500, 2500, 'EUR', 'published'::public.event_status, now(),
     case when v_sponsor_id is not null then array[v_sponsor_id] else '{}'::uuid[] end),

    ('seed-futuro-2', 'Demo — Festival Indie',
     'Tre palchi, dieci artisti.',
     'Evento demo: festival indie con tre palchi e area food.',
     'Piacenza', 'Parco delle Mura',
     v_cat_festival, v_organizer_id,
     now() + interval '30 days', now() + interval '32 days',
     2000, 4500, 'EUR', 'published'::public.event_status, now(),
     case when v_sponsor_id is not null then array[v_sponsor_id] else '{}'::uuid[] end),

    ('seed-futuro-3', 'Demo — DJ Set Rooftop',
     'Tramonto + house music.',
     'Evento demo: dj set su rooftop con vista città.',
     'Piacenza', 'Rooftop XYZ',
     v_cat_concerti, v_organizer_id,
     now() + interval '7 days',  now() + interval '7 days' + interval '5 hours',
     120, 1500, 'EUR', 'published'::public.event_status, now(),
     '{}'::uuid[])
  on conflict (slug) do nothing;

  select id into v_evt_f1 from public.events where slug = 'seed-futuro-1';
  select id into v_evt_f2 from public.events where slug = 'seed-futuro-2';
  select id into v_evt_f3 from public.events where slug = 'seed-futuro-3';

  ---------------------------------------------------------------------------
  -- 4) Eventi passati (2)
  ---------------------------------------------------------------------------
  insert into public.events (
    slug, title, short_description, description, location, venue,
    category_id, organizer_id, starts_at, ends_at,
    capacity, price_cents, currency, status, published_at
  ) values
    ('seed-passato-1', 'Demo — Opening Party',
     'Serata di apertura stagione.',
     'Evento demo passato: opening party.',
     'Piacenza', 'Spazio Rotative',
     v_cat_concerti, v_organizer_id,
     now() - interval '30 days', now() - interval '30 days' + interval '4 hours',
     300, 1000, 'EUR', 'ended'::public.event_status, now() - interval '60 days'),

    ('seed-passato-2', 'Demo — Festival Inverno',
     'Edizione invernale.',
     'Evento demo passato: festival invernale.',
     'Piacenza', 'Palazzetto',
     v_cat_festival, v_organizer_id,
     now() - interval '90 days', now() - interval '89 days',
     800, 2000, 'EUR', 'archived'::public.event_status, now() - interval '120 days')
  on conflict (slug) do nothing;

  select id into v_evt_p1 from public.events where slug = 'seed-passato-1';
  select id into v_evt_p2 from public.events where slug = 'seed-passato-2';

  ---------------------------------------------------------------------------
  -- 5) Ruoli demo (user_roles)
  ---------------------------------------------------------------------------
  if v_admin_id is not null then
    insert into public.user_roles (user_id, role)
    values (v_admin_id, 'admin'::public.app_role)
    on conflict (user_id, role) do nothing;
  end if;

  if v_organizer_id is not null then
    insert into public.user_roles (user_id, role)
    values (v_organizer_id, 'organizer'::public.app_role)
    on conflict (user_id, role) do nothing;
  end if;

  ---------------------------------------------------------------------------
  -- 6) Prenotazioni (3) — usano l'organizer come "utente di test" demo.
  --    Se manca, skip.
  ---------------------------------------------------------------------------
  if v_organizer_id is not null then
    -- booking 1: evento futuro 1
    insert into public.bookings (
      event_id, user_id, status, quantity, total_cents, currency,
      reference_code, qr_token, booked_at
    )
    select v_evt_f1, v_organizer_id, 'confirmed'::public.booking_status, 1, 2500, 'EUR',
           'SEEDB001', 'seed-qr-token-0001', now() - interval '2 days'
    where v_evt_f1 is not null
    on conflict (event_id, user_id) do nothing;

    -- booking 2: evento futuro 2
    insert into public.bookings (
      event_id, user_id, status, quantity, total_cents, currency,
      reference_code, qr_token, booked_at
    )
    select v_evt_f2, v_organizer_id, 'confirmed'::public.booking_status, 2, 9000, 'EUR',
           'SEEDB002', 'seed-qr-token-0002', now() - interval '1 day'
    where v_evt_f2 is not null
    on conflict (event_id, user_id) do nothing;

    -- booking 3: evento passato 1 (verrà usato per il check-in)
    insert into public.bookings (
      event_id, user_id, status, quantity, total_cents, currency,
      reference_code, qr_token, booked_at
    )
    select v_evt_p1, v_organizer_id, 'confirmed'::public.booking_status, 1, 1000, 'EUR',
           'SEEDB003', 'seed-qr-token-0003', now() - interval '35 days'
    where v_evt_p1 is not null
    on conflict (event_id, user_id) do nothing;

    select id into v_booking_1 from public.bookings where reference_code = 'SEEDB001';
    select id into v_booking_2 from public.bookings where reference_code = 'SEEDB002';
    select id into v_booking_3 from public.bookings where reference_code = 'SEEDB003';

    -------------------------------------------------------------------------
    -- 7) Check-in (1) sulla booking dell'evento passato
    -------------------------------------------------------------------------
    if v_booking_3 is not null then
      insert into public.checkins (
        booking_id, event_id, user_id, checked_in_at, checked_in_by, method, notes
      )
      values (
        v_booking_3, v_evt_p1, v_organizer_id,
        now() - interval '30 days' + interval '1 hour',
        coalesce(v_admin_id, v_organizer_id),
        'manual', 'Seed demo check-in'
      )
      on conflict (booking_id) do nothing;
    end if;
  else
    raise notice '[seed] Skip prenotazioni/check-in: utente organizer demo non presente in auth.users.';
  end if;
end$$;

-- =============================================================================
-- FINE seed demo.
-- =============================================================================
