-- Ensure every auth user has a matching profiles row.
-- Fixes FK violation on event_participations.user_id -> profiles.id when subscribing to events.
-- Safe to re-run.

-- 1) Backfill missing profiles for existing users
insert into public.profiles (id, first_name, last_name, phone, city)
select u.id,
       coalesce(u.raw_user_meta_data->>'first_name', null),
       coalesce(u.raw_user_meta_data->>'last_name', null),
       coalesce(u.raw_user_meta_data->>'phone', null),
       coalesce(u.raw_user_meta_data->>'city', null)
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

-- 2) Trigger function to auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, first_name, last_name, phone, city)
  values (
    new.id,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'city'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 3) Attach trigger on auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
