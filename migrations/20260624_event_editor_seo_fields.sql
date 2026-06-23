-- =============================================================================
-- Event Editor — campi SEO + published_at
-- File: 20260624_event_editor_seo_fields.sql
--
-- Aggiunge a public.events:
--   - seo_title         text  (override del meta title per /eventi/:slug)
--   - seo_description   text  (meta description)
--   - og_image_url      text  (immagine social condivisione)
--   - published_at      timestamptz (popolato dal frontend alla prima pubblicazione)
--
-- Idempotente. Nessun side-effect su dati esistenti.
-- =============================================================================

alter table public.events
  add column if not exists seo_title       text,
  add column if not exists seo_description text,
  add column if not exists og_image_url    text,
  add column if not exists published_at    timestamptz;

-- Vincoli di lunghezza (best-practice SEO):
--   - seo_title:        <=  70 caratteri
--   - seo_description:  <= 200 caratteri
-- I check sono lenient (null sempre permesso) e non bloccano contenuto vuoto.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'events_seo_title_len'
  ) then
    alter table public.events
      add constraint events_seo_title_len
      check (seo_title is null or char_length(seo_title) <= 70);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'events_seo_description_len'
  ) then
    alter table public.events
      add constraint events_seo_description_len
      check (seo_description is null or char_length(seo_description) <= 200);
  end if;
end$$;

-- Backfill: per eventi già 'published' senza published_at, usa created_at
update public.events
   set published_at = coalesce(published_at, created_at)
 where status = 'published'
   and published_at is null;
