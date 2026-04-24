-- Aggiungi colonna cover_image_url su public.events (idempotente)
alter table public.events
  add column if not exists cover_image_url text;
