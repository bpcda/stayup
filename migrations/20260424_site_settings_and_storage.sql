-- =====================================================================
-- 1) TABELLA site_settings: chiave/valore globali modificabili dall'admin
-- =====================================================================
create table if not exists public.site_settings (
  key         text primary key,
  value       text,
  description text,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users(id) on delete set null
);

alter table public.site_settings enable row level security;

-- Lettura pubblica (servono al frontend, sono dati non sensibili tipo telefono/email)
drop policy if exists "Public read site_settings" on public.site_settings;
create policy "Public read site_settings"
  on public.site_settings for select
  to anon, authenticated
  using (true);

-- Solo admin può scrivere
drop policy if exists "Admins manage site_settings" on public.site_settings;
create policy "Admins manage site_settings"
  on public.site_settings for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- Trigger updated_at
create or replace function public.touch_site_settings()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

drop trigger if exists trg_touch_site_settings on public.site_settings;
create trigger trg_touch_site_settings
before update on public.site_settings
for each row execute function public.touch_site_settings();

-- Seed di chiavi note (idempotente)
insert into public.site_settings (key, value, description) values
  ('contact_phone', '+39 333 123 4567', 'Numero di telefono mostrato sulle pagine evento e contatti'),
  ('contact_email', 'info@stayup.it',   'Email di contatto principale'),
  ('contact_whatsapp', '',              'Numero WhatsApp (con prefisso, senza +)'),
  ('contact_instagram', '',             'Username Instagram senza @')
on conflict (key) do nothing;


-- =====================================================================
-- 2) STORAGE BUCKET event-covers: pubblico in lettura, admin in scrittura
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('event-covers', 'event-covers', true)
on conflict (id) do update set public = true;

-- Lettura pubblica
drop policy if exists "Public read event-covers" on storage.objects;
create policy "Public read event-covers"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'event-covers');

-- Upload solo admin
drop policy if exists "Admins upload event-covers" on storage.objects;
create policy "Admins upload event-covers"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'event-covers' and public.has_role(auth.uid(), 'admin'));

-- Update solo admin
drop policy if exists "Admins update event-covers" on storage.objects;
create policy "Admins update event-covers"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'event-covers' and public.has_role(auth.uid(), 'admin'))
  with check (bucket_id = 'event-covers' and public.has_role(auth.uid(), 'admin'));

-- Delete solo admin
drop policy if exists "Admins delete event-covers" on storage.objects;
create policy "Admins delete event-covers"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'event-covers' and public.has_role(auth.uid(), 'admin'));
