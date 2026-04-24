-- =====================================================================
-- Migration: rendi `slug` opzionale su public.events e auto-generalo
-- Date: 2026-04-24
-- Idempotente.
-- =====================================================================

-- 1) Funzione di slugify semplice (lowercase, trattini, no accenti basilari)
create or replace function public.slugify(_input text)
returns text
language sql
immutable
as $$
  select trim(both '-' from
    regexp_replace(
      regexp_replace(
        lower(coalesce(_input, '')),
        '[^a-z0-9]+', '-', 'g'
      ),
      '-{2,}', '-', 'g'
    )
  );
$$;

-- 2) Trigger: se slug è null/vuoto, genera da title + suffisso random per unicità
create or replace function public.events_set_slug()
returns trigger
language plpgsql
as $$
declare
  base text;
  candidate text;
  i int := 0;
begin
  if NEW.slug is null or length(trim(NEW.slug)) = 0 then
    base := nullif(public.slugify(NEW.title), '');
    if base is null then
      base := 'evento';
    end if;
    candidate := base;
    while exists (select 1 from public.events where slug = candidate and id <> coalesce(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)) loop
      i := i + 1;
      candidate := base || '-' || i::text;
    end loop;
    NEW.slug := candidate;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_events_set_slug on public.events;
create trigger trg_events_set_slug
before insert or update on public.events
for each row execute function public.events_set_slug();

-- 3) Backfill eventuali righe senza slug (nessuna se NOT NULL già attivo, ma sicuro)
update public.events set slug = slug where slug is not null;
