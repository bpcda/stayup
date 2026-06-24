-- ============================================================================
-- 20260627_waitlist_auto_promote
-- ----------------------------------------------------------------------------
-- Versione finale della waitlist: promozione AUTOMATICA.
--
-- Aggiunge a 20260626_waitlist:
--   - colonna `offer_email_sent_at` (outbox flag per il worker email)
--   - colonna `cancelled_at` (audit cancellazioni)
--   - tabella `waitlist_events` (log eventi)
--   - funzione interna `_waitlist_promote_locked(event_id)` con advisory
--     lock per evitare race / doppie offerte attive
--   - patch a `promote_next_waitlist` per:
--       * scadenza dinamica (48h / 24h / 6h) in base a starts_at
--       * lock transaction-level (advisory) sull'event_id
--       * idempotenza (non promuovere se esiste già un'offerta attiva)
--   - trigger su `bookings` AFTER UPDATE/DELETE che chiama l'interno se
--     un booking `confirmed` viene cancellato/eliminato (qualsiasi origine:
--     UI utente, UI admin, edge function, UPDATE SQL diretto)
--   - `expire_and_repromote_all()` per cron: scade offerte stantie e
--     promuove il successivo
--   - schedule pg_cron (best-effort, no-op se pg_cron non c'è)
--
-- Tutto idempotente: re-eseguibile.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Colonne extra
-- ----------------------------------------------------------------------------
alter table public.waitlist
  add column if not exists offer_email_sent_at timestamptz,
  add column if not exists cancelled_at        timestamptz;

create index if not exists waitlist_offer_pending_idx
  on public.waitlist(status, offer_email_sent_at)
  where status = 'offered' and offer_email_sent_at is null;

create index if not exists waitlist_offer_expiry_idx
  on public.waitlist(offer_expires_at)
  where status = 'offered';

-- ----------------------------------------------------------------------------
-- 2) Log eventi waitlist
-- ----------------------------------------------------------------------------
create table if not exists public.waitlist_events (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references public.events(id) on delete cascade,
  waitlist_id  uuid references public.waitlist(id)        on delete set null,
  kind         text not null check (kind in (
                 'joined','offered','accepted','expired','cancelled','skipped'
               )),
  payload      jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);
create index if not exists waitlist_events_event_idx
  on public.waitlist_events(event_id, created_at desc);

grant select on public.waitlist_events to authenticated;
grant all    on public.waitlist_events to service_role;

alter table public.waitlist_events enable row level security;
drop policy if exists "waitlist_events admin read"     on public.waitlist_events;
drop policy if exists "waitlist_events organizer read" on public.waitlist_events;
create policy "waitlist_events admin read" on public.waitlist_events
  for select to authenticated
  using (public.has_role(auth.uid(),'admin'));
create policy "waitlist_events organizer read" on public.waitlist_events
  for select to authenticated
  using (
    public.has_role(auth.uid(),'organizer') and exists (
      select 1 from public.events e
      where e.id = waitlist_events.event_id and e.organizer_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- 3) Funzione interna di promozione (con advisory lock + idempotenza)
--    Ritorna la riga waitlist promossa o NULL se nessuno da promuovere.
-- ----------------------------------------------------------------------------
create or replace function public._waitlist_compute_deadline(_starts_at timestamptz)
returns timestamptz language sql immutable as $$
  select case
    when _starts_at is null then now() + interval '24 hours'
    when _starts_at - now() < interval '72 hours'  then now() + interval '6 hours'
    when _starts_at - now() <= interval '7 days'   then now() + interval '24 hours'
    else                                                now() + interval '48 hours'
  end;
$$;

create or replace function public._waitlist_promote_locked(_event_id uuid)
returns public.waitlist
language plpgsql security definer set search_path = public as $$
declare
  v_lock_key  bigint := ('x' || substr(md5('waitlist:' || _event_id::text), 1, 16))::bit(64)::bigint;
  v_event     events%rowtype;
  v_confirmed int;
  v_row       waitlist%rowtype;
  v_token     uuid := gen_random_uuid();
  v_deadline  timestamptz;
begin
  -- Lock per (event_id) per evitare double-promote concorrenti.
  perform pg_advisory_xact_lock(v_lock_key);

  select * into v_event from events where id = _event_id;
  if not found or v_event.capacity is null then
    return null;
  end if;

  -- Idempotenza: se esiste già un'offerta attiva, non promuovere oltre.
  if exists (
    select 1 from waitlist
    where event_id = _event_id and status = 'offered'
      and (offer_expires_at is null or offer_expires_at > now())
  ) then
    return null;
  end if;

  select count(*) into v_confirmed
    from bookings where event_id = _event_id and status = 'confirmed';
  if v_confirmed >= v_event.capacity then
    return null;
  end if;

  v_deadline := public._waitlist_compute_deadline(v_event.starts_at);

  select * into v_row
    from waitlist
    where event_id = _event_id and status = 'waiting'
    order by position asc, created_at asc
    limit 1
    for update skip locked;
  if not found then
    return null;
  end if;

  -- Skip utenti già con booking attivo (race protection).
  while found and exists (
    select 1 from bookings
    where event_id = _event_id and user_id = v_row.user_id
      and status in ('pending','confirmed')
  ) loop
    update waitlist set status = 'cancelled', cancelled_at = now() where id = v_row.id;
    insert into waitlist_events(event_id, waitlist_id, kind, payload)
      values (_event_id, v_row.id, 'skipped', jsonb_build_object('reason','already_booked'));

    select * into v_row
      from waitlist
      where event_id = _event_id and status = 'waiting'
      order by position asc, created_at asc
      limit 1
      for update skip locked;
  end loop;
  if not found then return null; end if;

  update waitlist
     set status = 'offered',
         offer_token = v_token,
         offer_expires_at = v_deadline,
         offered_at = now(),
         offer_email_sent_at = null
   where id = v_row.id
   returning * into v_row;

  insert into waitlist_events(event_id, waitlist_id, kind, payload)
    values (_event_id, v_row.id, 'offered',
            jsonb_build_object('expires_at', v_deadline, 'position', v_row.position));

  return v_row;
end $$;

revoke all on function public._waitlist_promote_locked(uuid) from public, anon, authenticated;
grant execute on function public._waitlist_promote_locked(uuid) to service_role;

-- ----------------------------------------------------------------------------
-- 4) Patch alla RPC pubblica `promote_next_waitlist` (mantiene la stessa firma)
--    Ora delega all'interno con lock + scadenza dinamica.
-- ----------------------------------------------------------------------------
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
  v_row   waitlist;
  v_event events%rowtype;
begin
  perform public.expire_stale_waitlist_offers(_event_id);
  v_row := public._waitlist_promote_locked(_event_id);
  if v_row.id is null then return; end if;

  select * into v_event from events where id = v_row.event_id;
  return query
    select v_row.id, v_row.user_id,
      (select email from auth.users where id = v_row.user_id),
      v_row.offer_token, v_row.offer_expires_at, v_row.event_id,
      v_event.title, v_event.slug;
end $$;

revoke all on function public.promote_next_waitlist(uuid) from public, authenticated, anon;
grant execute on function public.promote_next_waitlist(uuid) to service_role;

-- ----------------------------------------------------------------------------
-- 5) Patch a `expire_stale_waitlist_offers`: registra anche in waitlist_events.
-- ----------------------------------------------------------------------------
create or replace function public.expire_stale_waitlist_offers(_event_id uuid default null)
returns int
language plpgsql security definer set search_path = public as $$
declare v_count int;
begin
  with upd as (
    update waitlist
       set status = 'expired', updated_at = now()
     where status = 'offered'
       and offer_expires_at is not null
       and offer_expires_at < now()
       and (_event_id is null or event_id = _event_id)
     returning id, event_id
  ), log as (
    insert into waitlist_events(event_id, waitlist_id, kind)
      select event_id, id, 'expired' from upd
      returning 1
  )
  select count(*) into v_count from upd;
  return coalesce(v_count, 0);
end $$;
grant execute on function public.expire_stale_waitlist_offers(uuid)
  to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 6) Cron worker: scade tutte le offerte stantie e ri-promuove per ogni evento.
--    Sicuro da chiamare ovunque, idempotente.
-- ----------------------------------------------------------------------------
create or replace function public.expire_and_repromote_all()
returns int
language plpgsql security definer set search_path = public as $$
declare
  r record;
  v_promoted int := 0;
  v_row waitlist;
begin
  perform public.expire_stale_waitlist_offers(null);

  -- Per ogni evento sold-out con waitlist 'waiting' senza offerta attiva,
  -- tenta una promozione.
  for r in
    select distinct w.event_id
      from waitlist w
     where w.status = 'waiting'
       and not exists (
         select 1 from waitlist w2
          where w2.event_id = w.event_id
            and w2.status = 'offered'
            and (w2.offer_expires_at is null or w2.offer_expires_at > now())
       )
  loop
    v_row := public._waitlist_promote_locked(r.event_id);
    if v_row.id is not null then
      v_promoted := v_promoted + 1;
    end if;
  end loop;

  return v_promoted;
end $$;
grant execute on function public.expire_and_repromote_all() to service_role;

-- ----------------------------------------------------------------------------
-- 7) Trigger su bookings: ogni cancellazione di booking 'confirmed' libera
--    un posto -> tenta promote automatico (qualsiasi origine).
-- ----------------------------------------------------------------------------
create or replace function public._waitlist_on_booking_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_event_id uuid; v_row waitlist;
begin
  if tg_op = 'UPDATE' then
    if old.status = 'confirmed' and new.status is distinct from 'confirmed' then
      v_event_id := old.event_id;
    else
      return null;
    end if;
  elsif tg_op = 'DELETE' then
    if old.status = 'confirmed' then
      v_event_id := old.event_id;
    else
      return null;
    end if;
  else
    return null;
  end if;

  begin
    perform public.expire_stale_waitlist_offers(v_event_id);
    v_row := public._waitlist_promote_locked(v_event_id);
    -- L'email viene mandata dal worker `process-waitlist-outbox` quando
    -- offer_email_sent_at is null (oppure best-effort sincrono dall'edge
    -- function `cancel-event-booking`).
  exception when others then
    -- Non blocchiamo MAI la cancellazione del booking per errori waitlist.
    raise warning '[waitlist trigger] promote failed: %', sqlerrm;
  end;

  return null;
end $$;

drop trigger if exists bookings_waitlist_auto_promote on public.bookings;
create trigger bookings_waitlist_auto_promote
  after update or delete on public.bookings
  for each row execute function public._waitlist_on_booking_change();

-- ----------------------------------------------------------------------------
-- 8) Log "joined" / "accepted" / "cancelled" lato applicativo
--    (patch leggere alle RPC esistenti via wrapper events).
-- ----------------------------------------------------------------------------
-- Log accepted: aggiunto come trigger sulle UPDATE → status='accepted'
create or replace function public._waitlist_log_status_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    if new.status in ('accepted','cancelled') then
      insert into waitlist_events(event_id, waitlist_id, kind)
        values (new.event_id, new.id, new.status::text);
    end if;
  end if;
  return null;
end $$;
drop trigger if exists waitlist_log_status_change on public.waitlist;
create trigger waitlist_log_status_change
  after update on public.waitlist
  for each row execute function public._waitlist_log_status_change();

-- joined: insert
create or replace function public._waitlist_log_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into waitlist_events(event_id, waitlist_id, kind, payload)
    values (new.event_id, new.id, 'joined',
            jsonb_build_object('position', new.position));
  return null;
end $$;
drop trigger if exists waitlist_log_insert on public.waitlist;
create trigger waitlist_log_insert
  after insert on public.waitlist
  for each row execute function public._waitlist_log_insert();

-- ----------------------------------------------------------------------------
-- 9) RPC "cancella waitlist" per utente / admin (mantiene RLS)
-- ----------------------------------------------------------------------------
create or replace function public.cancel_waitlist_entry(_waitlist_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_row waitlist%rowtype; v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'unauthorized'; end if;
  select * into v_row from waitlist where id = _waitlist_id;
  if not found then raise exception 'not_found'; end if;
  if v_row.user_id <> v_uid
     and not public.has_role(v_uid,'admin')
     and not exists (
       select 1 from events e where e.id = v_row.event_id and e.organizer_id = v_uid
     )
  then
    raise exception 'forbidden';
  end if;
  update waitlist set status = 'cancelled', cancelled_at = now()
   where id = _waitlist_id and status in ('waiting','offered');
end $$;
grant execute on function public.cancel_waitlist_entry(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- 10) Schedule pg_cron (best-effort, no-op se l'estensione non è abilitata).
--     Esegue expire+repromote ogni minuto. L'invio email è demandato a
--     `process-waitlist-outbox` (edge function), schedulabile dal dashboard
--     Supabase oppure tramite pg_cron + pg_net (vedi README).
-- ----------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    -- Idempotenza: cancella schedule precedente con lo stesso nome.
    perform cron.unschedule(jobid)
      from cron.job where jobname = 'waitlist_expire_and_repromote';
    perform cron.schedule(
      'waitlist_expire_and_repromote',
      '* * * * *',
      $cron$ select public.expire_and_repromote_all(); $cron$
    );
  end if;
end $$;
