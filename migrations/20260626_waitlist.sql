-- ============================================================================
-- 20260626_waitlist
-- ----------------------------------------------------------------------------
-- Lista d'attesa eventi sold-out.
--   - tabella `waitlist`
--   - dedupe per (event_id, user_id) via unique partial index su righe attive
--   - RPC: event_capacity_status, join_waitlist, promote_next_waitlist,
--          accept_waitlist_offer, expire_stale_waitlist_offers
--   - promote_next_waitlist è callabile SOLO da service_role: l'edge function
--     "cancel-event-booking" la invoca e poi manda l'email di offerta.
-- ============================================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'waitlist_status') then
    create type public.waitlist_status as enum
      ('waiting','offered','accepted','expired','cancelled');
  end if;
end $$;

create table if not exists public.waitlist (
  id               uuid primary key default gen_random_uuid(),
  event_id         uuid not null references public.events(id) on delete cascade,
  user_id          uuid not null references auth.users(id)   on delete cascade,
  position         int  not null check (position > 0),
  status           public.waitlist_status not null default 'waiting',
  offer_token      uuid,
  offer_expires_at timestamptz,
  offered_at       timestamptz,
  accepted_at      timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists waitlist_event_status_idx
  on public.waitlist(event_id, status, position);
create index if not exists waitlist_user_idx on public.waitlist(user_id);
-- Un utente non può avere più di una riga "attiva" sullo stesso evento.
create unique index if not exists waitlist_event_user_active_uq
  on public.waitlist(event_id, user_id)
  where status in ('waiting','offered');
create unique index if not exists waitlist_offer_token_uq
  on public.waitlist(offer_token) where offer_token is not null;

drop trigger if exists waitlist_set_updated_at on public.waitlist;
create trigger waitlist_set_updated_at
  before update on public.waitlist
  for each row execute function public.set_updated_at();

grant select, update on public.waitlist to authenticated;
grant all on public.waitlist to service_role;

alter table public.waitlist enable row level security;

drop policy if exists "waitlist user read own"      on public.waitlist;
drop policy if exists "waitlist user cancel own"    on public.waitlist;
drop policy if exists "waitlist organizer read"     on public.waitlist;
drop policy if exists "waitlist admin all"          on public.waitlist;

create policy "waitlist user read own" on public.waitlist
  for select to authenticated using (user_id = auth.uid());

-- L'utente può solo "cancellare" la propria riga (status → cancelled).
create policy "waitlist user cancel own" on public.waitlist
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "waitlist organizer read" on public.waitlist
  for select to authenticated
  using (
    public.has_role(auth.uid(),'organizer')
    and exists (
      select 1 from public.events e
      where e.id = waitlist.event_id and e.organizer_id = auth.uid()
    )
  );

create policy "waitlist admin all" on public.waitlist
  for all to authenticated
  using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));

-- ============================================================================
-- RPC
-- ============================================================================

-- Stato capienza evento + se l'utente corrente è in waitlist.
create or replace function public.event_capacity_status(_event_id uuid)
returns table (
  capacity         int,
  confirmed_count  int,
  sold_out         boolean,
  waitlist_count   int,
  my_position      int,
  my_status        public.waitlist_status
)
language sql stable security definer set search_path = public as $$
  select
    e.capacity,
    coalesce((
      select count(*)::int from bookings b
      where b.event_id = e.id and b.status = 'confirmed'
    ), 0) as confirmed_count,
    case when e.capacity is null then false
         else coalesce((
           select count(*)::int from bookings b
           where b.event_id = e.id and b.status = 'confirmed'
         ), 0) >= e.capacity
    end as sold_out,
    coalesce((
      select count(*)::int from waitlist w
      where w.event_id = e.id and w.status in ('waiting','offered')
    ), 0) as waitlist_count,
    (select w.position from waitlist w
       where w.event_id = e.id and w.user_id = auth.uid()
         and w.status in ('waiting','offered')
       limit 1) as my_position,
    (select w.status from waitlist w
       where w.event_id = e.id and w.user_id = auth.uid()
         and w.status in ('waiting','offered')
       limit 1) as my_status
  from events e
  where e.id = _event_id;
$$;
grant execute on function public.event_capacity_status(uuid) to anon, authenticated;

-- L'utente entra in lista. Errori controllati (eccezioni con codice nel msg).
create or replace function public.join_waitlist(_event_id uuid)
returns public.waitlist
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_event events%rowtype;
  v_confirmed int;
  v_pos int;
  v_row waitlist%rowtype;
begin
  if v_user is null then raise exception 'unauthorized'; end if;

  select * into v_event from events where id = _event_id;
  if not found then raise exception 'event_not_found'; end if;
  if v_event.status <> 'published' then raise exception 'event_not_available'; end if;
  if v_event.capacity is null then raise exception 'no_capacity_limit'; end if;

  select count(*) into v_confirmed
    from bookings where event_id = _event_id and status = 'confirmed';
  if v_confirmed < v_event.capacity then raise exception 'not_sold_out'; end if;

  if exists (
    select 1 from bookings
    where event_id = _event_id and user_id = v_user
      and status in ('pending','confirmed')
  ) then
    raise exception 'already_booked';
  end if;

  if exists (
    select 1 from waitlist
    where event_id = _event_id and user_id = v_user
      and status in ('waiting','offered')
  ) then
    raise exception 'already_in_waitlist';
  end if;

  select coalesce(max(position), 0) + 1 into v_pos
    from waitlist
    where event_id = _event_id and status in ('waiting','offered');

  insert into waitlist(event_id, user_id, position)
    values (_event_id, v_user, v_pos)
    returning * into v_row;
  return v_row;
end $$;
grant execute on function public.join_waitlist(uuid) to authenticated;

-- Marca come 'expired' le offerte con deadline scaduta.
create or replace function public.expire_stale_waitlist_offers(_event_id uuid default null)
returns int
language sql security definer set search_path = public as $$
  with upd as (
    update waitlist set status = 'expired', updated_at = now()
    where status = 'offered'
      and offer_expires_at is not null
      and offer_expires_at < now()
      and (_event_id is null or event_id = _event_id)
    returning 1
  ) select count(*)::int from upd;
$$;
grant execute on function public.expire_stale_waitlist_offers(uuid)
  to authenticated, service_role;

-- Promuove il primo utente in attesa. Solo service_role (chiamata dall'edge
-- function `cancel-event-booking`). Ritorna riga vuota se non c'è nessuno da
-- promuovere o non ci sono posti.
create or replace function public.promote_next_waitlist(_event_id uuid)
returns table(
  waitlist_id      uuid,
  user_id          uuid,
  user_email       text,
  offer_token      uuid,
  offer_expires_at timestamptz,
  event_id         uuid,
  event_title      text,
  event_slug       text
)
language plpgsql security definer set search_path = public as $$
declare
  v_capacity  int;
  v_confirmed int;
  v_row       waitlist%rowtype;
  v_token     uuid := gen_random_uuid();
  v_deadline  timestamptz := now() + interval '24 hours';
  v_event     events%rowtype;
begin
  perform expire_stale_waitlist_offers(_event_id);

  select * into v_event from events where id = _event_id;
  if not found or v_event.capacity is null then return; end if;

  select count(*) into v_confirmed
    from bookings where event_id = _event_id and status = 'confirmed';
  if v_confirmed >= v_event.capacity then return; end if;

  select * into v_row
    from waitlist
    where event_id = _event_id and status = 'waiting'
    order by position asc, created_at asc
    limit 1
    for update skip locked;
  if not found then return; end if;

  update waitlist
    set status = 'offered',
        offer_token = v_token,
        offer_expires_at = v_deadline,
        offered_at = now()
    where id = v_row.id;

  return query
    select v_row.id, v_row.user_id,
      (select email from auth.users where id = v_row.user_id),
      v_token, v_deadline, v_row.event_id,
      v_event.title, v_event.slug;
end $$;
revoke all on function public.promote_next_waitlist(uuid) from public, authenticated, anon;
grant execute on function public.promote_next_waitlist(uuid) to service_role;

-- L'utente accetta l'offerta: crea booking confermato + marca riga 'accepted'.
create or replace function public.accept_waitlist_offer(_token uuid)
returns table(booking_id uuid, event_id uuid, event_slug text)
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_row  waitlist%rowtype;
  v_event events%rowtype;
  v_confirmed int;
  v_booking_id uuid;
begin
  if v_user is null then raise exception 'unauthorized'; end if;

  select * into v_row from waitlist where offer_token = _token for update;
  if not found then raise exception 'invalid_token'; end if;
  if v_row.user_id <> v_user then raise exception 'forbidden'; end if;
  if v_row.status <> 'offered' then raise exception 'not_offered'; end if;
  if v_row.offer_expires_at is null or v_row.offer_expires_at < now() then
    update waitlist set status = 'expired' where id = v_row.id;
    raise exception 'expired';
  end if;

  select * into v_event from events where id = v_row.event_id;
  if v_event.status = 'cancelled' then raise exception 'event_cancelled'; end if;

  select count(*) into v_confirmed
    from bookings where event_id = v_row.event_id and status = 'confirmed';
  if v_event.capacity is not null and v_confirmed >= v_event.capacity then
    raise exception 'no_more_slots';
  end if;

  insert into bookings(event_id, user_id, status, quantity, total_cents, currency, booked_at)
    values (v_row.event_id, v_user, 'confirmed', 1, v_event.price_cents, v_event.currency, now())
    on conflict (event_id, user_id) do update
      set status = 'confirmed', cancelled_at = null, updated_at = now()
    returning id into v_booking_id;

  update waitlist set status = 'accepted', accepted_at = now() where id = v_row.id;

  return query select v_booking_id, v_row.event_id, v_event.slug;
end $$;
grant execute on function public.accept_waitlist_offer(uuid) to authenticated;
