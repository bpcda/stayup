-- =============================================================================
-- StayUp — seed minimo per test (v2)
-- File: 20260623_stayup_v2_seed.sql
--
-- Inserisce dati di test:
--   - 1 categoria evento (Concerti)
--   - 1 evento futuro (pubblicato)
--   - 1 evento passato (archiviato)
--
-- NON crea utenti né prenotazioni: lo stato di auth.users è dell'ambiente.
-- Eseguire DOPO 20260623_stayup_v2_schema.sql.
-- Idempotente: usa ON CONFLICT su slug.
-- =============================================================================

-- 1) Categoria
insert into public.event_categories (slug, name, description, color, icon, sort_order)
values
  ('concerti', 'Concerti', 'Live music ed eventi musicali', '#e11d48', 'music', 10)
on conflict (slug) do nothing;

-- 2) Evento futuro (published) — fra 30 giorni
insert into public.events (
  slug, title, description, location, venue,
  category_id, starts_at, ends_at,
  capacity, price_cents, currency, status, published_at
)
select
  'seed-evento-futuro',
  'Seed — Evento Futuro',
  'Evento di test futuro generato dal seed v2.',
  'Piacenza',
  'Piazza Cavalli',
  c.id,
  now() + interval '30 days',
  now() + interval '30 days' + interval '3 hours',
  200, 1500, 'EUR',
  'published'::public.event_status,
  now()
from public.event_categories c
where c.slug = 'concerti'
on conflict (slug) do nothing;

-- 3) Evento passato (archived) — 60 giorni fa
insert into public.events (
  slug, title, description, location, venue,
  category_id, starts_at, ends_at,
  capacity, price_cents, currency, status, published_at
)
select
  'seed-evento-passato',
  'Seed — Evento Passato',
  'Evento di test passato generato dal seed v2.',
  'Piacenza',
  'Spazio Rotative',
  c.id,
  now() - interval '60 days',
  now() - interval '60 days' + interval '4 hours',
  150, 1000, 'EUR',
  'archived'::public.event_status,
  now() - interval '90 days'
from public.event_categories c
where c.slug = 'concerti'
on conflict (slug) do nothing;
