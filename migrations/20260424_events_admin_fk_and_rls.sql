-- Allow PostgREST to embed profiles from event_participations.
-- Required for the admin "iscritti" dialog to load nome/cognome/telefono in one query.
-- Safe to re-run.

-- 1) Foreign key event_participations.user_id -> profiles.id
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'event_participations_user_id_fkey_profiles'
  ) then
    alter table public.event_participations
      add constraint event_participations_user_id_fkey_profiles
      foreign key (user_id) references public.profiles(id) on delete cascade;
  end if;
end $$;

-- 2) Cascade event deletion -> participations
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'event_participations_event_id_fkey'
  ) then
    alter table public.event_participations
      drop constraint event_participations_event_id_fkey;
  end if;

  alter table public.event_participations
    add constraint event_participations_event_id_fkey
    foreign key (event_id) references public.events(id) on delete cascade;
end $$;

-- 3) RLS: admin full access on events + event_participations
alter table public.events enable row level security;
alter table public.event_participations enable row level security;

drop policy if exists "Admins manage events" on public.events;
create policy "Admins manage events"
  on public.events for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins read all participations" on public.event_participations;
create policy "Admins read all participations"
  on public.event_participations for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin') or auth.uid() = user_id);

drop policy if exists "Admins delete any participation" on public.event_participations;
create policy "Admins delete any participation"
  on public.event_participations for delete
  to authenticated
  using (public.has_role(auth.uid(), 'admin') or auth.uid() = user_id);
