-- =====================================================================
-- public.site_settings (v2): chiave/valore jsonb con visibilità pubblica
-- Idempotente: sicura da rieseguire.
-- =====================================================================

-- Funzione generica updated_at (riutilizzabile)
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Se esiste una versione legacy della tabella (key text PK, value text),
-- la sostituiamo. Nessun dato di produzione presente: l'errore originale
-- era "table not found in schema cache".
do $$
declare
  has_id_col boolean;
begin
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'site_settings') then
    select exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'site_settings' and column_name = 'id'
    ) into has_id_col;
    if not has_id_col then
      drop table public.site_settings cascade;
    end if;
  end if;
end$$;

create table if not exists public.site_settings (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique,
  value       jsonb not null default '{}'::jsonb,
  description text,
  is_public   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Grants (Data API)
grant select on public.site_settings to anon;
grant select, insert, update, delete on public.site_settings to authenticated;
grant all on public.site_settings to service_role;

-- Trigger updated_at
drop trigger if exists trg_site_settings_updated_at on public.site_settings;
create trigger trg_site_settings_updated_at
before update on public.site_settings
for each row execute function public.update_updated_at_column();

-- RLS
alter table public.site_settings enable row level security;

drop policy if exists "site_settings public read"    on public.site_settings;
drop policy if exists "site_settings staff read"     on public.site_settings;
drop policy if exists "site_settings admin write"    on public.site_settings;
drop policy if exists "site_settings admin update"   on public.site_settings;
drop policy if exists "site_settings admin delete"   on public.site_settings;

-- Anon + authenticated: leggono solo le righe con is_public = true
create policy "site_settings public read"
  on public.site_settings for select
  to anon, authenticated
  using (is_public = true);

-- Admin e organizer: lettura completa
create policy "site_settings staff read"
  on public.site_settings for select
  to authenticated
  using (
    public.has_role(auth.uid(), 'admin')
    or public.has_role(auth.uid(), 'organizer')
  );

-- Admin: insert/update/delete
create policy "site_settings admin write"
  on public.site_settings for insert
  to authenticated
  with check (public.has_role(auth.uid(), 'admin'));

create policy "site_settings admin update"
  on public.site_settings for update
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create policy "site_settings admin delete"
  on public.site_settings for delete
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- =====================================================================
-- Seed iniziale (idempotente)
-- =====================================================================
insert into public.site_settings (key, value, description, is_public) values
  ('site_identity',
   '{"name":"StayUp All Night","logo_url":null,"default_language":"it"}'::jsonb,
   'Identità del sito (nome, logo, lingua di default)', true),
  ('contact_info',
   '{"email":"info@stayupallnight.it","phone":null,"address":null}'::jsonb,
   'Informazioni di contatto principali', true),
  ('social_links',
   '{"instagram":null,"tiktok":null,"website":"https://stayupallnight.it"}'::jsonb,
   'Link ai canali social', true),
  ('feature_flags',
   '{"bookings_enabled":true,"newsletter_enabled":true,"checkin_enabled":true}'::jsonb,
   'Flag di attivazione delle funzionalità', true),
  ('email_settings',
   '{"from_name":"StayUp","reply_to":"info@stayupallnight.it"}'::jsonb,
   'Configurazione mittenti email transazionali', false)
on conflict (key) do nothing;

-- Compatibilità retro con UI esistente (contatti come stringhe JSON)
insert into public.site_settings (key, value, description, is_public) values
  ('contact_phone',     '""'::jsonb, 'Numero di telefono mostrato sulle pagine evento e contatti', true),
  ('contact_email',     '"info@stayupallnight.it"'::jsonb, 'Email di contatto principale', true),
  ('contact_whatsapp',  '""'::jsonb, 'Numero WhatsApp (con prefisso, senza +)', true),
  ('contact_instagram', '""'::jsonb, 'Username Instagram senza @', true)
on conflict (key) do nothing;
