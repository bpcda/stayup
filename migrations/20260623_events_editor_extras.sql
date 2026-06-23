-- =====================================================================
-- Estensioni per l'editor eventi admin/organizer
-- Aggiunge: short_description, gallery_urls[], sponsor_ids[], stato 'ended'
-- Idempotente.
-- =====================================================================

-- 1) Aggiungi 'ended' all'enum event_status (se manca)
do $$
begin
  if exists (select 1 from pg_type where typname = 'event_status') then
    if not exists (
      select 1
      from pg_enum e
      join pg_type t on t.oid = e.enumtypid
      where t.typname = 'event_status' and e.enumlabel = 'ended'
    ) then
      alter type public.event_status add value 'ended';
    end if;
  end if;
end$$;

-- 2) Colonne aggiuntive su public.events
alter table public.events
  add column if not exists short_description text,
  add column if not exists gallery_urls      text[] not null default '{}'::text[],
  add column if not exists sponsor_ids       uuid[] not null default '{}'::uuid[];

-- 3) Indici utili (sponsor)
create index if not exists events_sponsor_ids_gin on public.events using gin (sponsor_ids);
