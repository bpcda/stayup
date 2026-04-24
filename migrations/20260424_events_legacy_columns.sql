-- =====================================================================
-- Migration: rendi nullable / auto-popolate colonne legacy NOT NULL su events
-- Date: 2026-04-24
-- Idempotente.
-- =====================================================================

-- 1) Sincronizza colonne legacy (name, ecc.) con title via trigger.
create or replace function public.events_sync_legacy()
returns trigger
language plpgsql
as $$
begin
  -- name (legacy) <- title
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='events' and column_name='name'
  ) then
    if NEW.name is null or length(trim(NEW.name)) = 0 then
      NEW.name := NEW.title;
    end if;
  end if;

  -- event_date (legacy) <- starts_at
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='events' and column_name='event_date'
  ) then
    if NEW.event_date is null and NEW.starts_at is not null then
      NEW.event_date := NEW.starts_at;
    end if;
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_events_sync_legacy on public.events;
create trigger trg_events_sync_legacy
before insert or update on public.events
for each row execute function public.events_sync_legacy();

-- 2) Rendi nullable eventuali colonne legacy che bloccano gli insert
do $$
declare
  col text;
begin
  for col in
    select column_name
    from information_schema.columns
    where table_schema='public' and table_name='events'
      and is_nullable='NO'
      and column_name not in ('id','title','slug','is_active','is_public','created_at','updated_at')
  loop
    execute format('alter table public.events alter column %I drop not null', col);
  end loop;
end $$;
