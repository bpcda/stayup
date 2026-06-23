-- 1) Aggiungi email a profiles (sincronizzata da auth.users)
alter table public.profiles
  add column if not exists email text;

-- Backfill email per profili esistenti
update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id and (p.email is null or p.email = '');

-- Aggiorna trigger handle_new_user per includere email
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, first_name, last_name, phone, city)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'city'
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

-- 2) [RIMOSSO 2026-06-23] La logica di presenza è stata spostata su public.checkins (modello v2).
--    Le colonne event_participations.attended / attended_at non esistono più e non vanno ricreate.
--    Vedi migrations/20260623_stayup_v2_schema.sql e 20260623_stayup_v2_shuttle.sql.
