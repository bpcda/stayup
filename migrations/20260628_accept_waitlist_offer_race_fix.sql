-- ============================================================================
-- 20260628_accept_waitlist_offer_race_fix
-- ----------------------------------------------------------------------------
-- Fix C2 (POST_WAITLIST_PRODUCTION_AUDIT):
--   * Race tra `select count(*)` e `insert` in accept_waitlist_offer.
--   * Possibili doppi booking attivi per stesso (event_id, user_id) sotto
--     accept concorrenti o doppio click sul link offerta.
--   * `ON CONFLICT (event_id, user_id)` non aveva un constraint corrispondente.
--
-- Strategia:
--   1) Indice UNIQUE parziale su bookings(event_id, user_id) per righe
--      "attive" (pending|confirmed). Permette ri-iscrizione dopo cancel.
--      Dedupe preventiva delle righe attive duplicate residue.
--   2) Riscrittura della RPC `accept_waitlist_offer`:
--        - advisory xact lock per (event_id) → serializza accept concorrenti
--        - SELECT ... FOR UPDATE su events
--        - SELECT ... FOR UPDATE sulla riga waitlist (token monouso)
--        - re-check capienza dopo i lock
--        - INSERT senza ON CONFLICT (gestita la dedupe via SELECT FOR UPDATE
--          preventiva sulla eventuale riga attiva esistente)
--        - genera qr_token + reference_code coerenti con create_event_booking
--          (fix M2 collaterale: l'utente promosso riceve un QR valido).
--
-- Idempotente: re-eseguibile.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Dedupe preventiva: se in storico esistono già più righe attive per
--    lo stesso (event_id, user_id), tieni la più recente per evitare
--    che la creazione dell'indice unique fallisca.
-- ----------------------------------------------------------------------------
with ranked as (
  select id,
         row_number() over (
           partition by event_id, user_id
           order by booked_at desc nulls last, created_at desc, id desc
         ) as rn
    from public.bookings
   where status in ('pending','confirmed')
)
update public.bookings b
   set status       = 'cancelled',
       cancelled_at = coalesce(b.cancelled_at, now()),
       updated_at   = now()
  from ranked r
 where b.id = r.id and r.rn > 1;

-- ----------------------------------------------------------------------------
-- 2) Indice UNIQUE parziale (un solo booking attivo per utente/evento).
-- ----------------------------------------------------------------------------
create unique index if not exists bookings_event_user_active_uq
  on public.bookings(event_id, user_id)
  where status in ('pending','confirmed');

-- ----------------------------------------------------------------------------
-- 3) Riscrittura accept_waitlist_offer con lock espliciti e re-check.
-- ----------------------------------------------------------------------------
create or replace function public.accept_waitlist_offer(_token uuid)
returns table(booking_id uuid, event_id uuid, event_slug text)
language plpgsql security definer set search_path = public as $$
declare
  v_user        uuid := auth.uid();
  v_row         waitlist%rowtype;
  v_event       events%rowtype;
  v_confirmed   int;
  v_existing    bookings%rowtype;
  v_booking_id  uuid;
  v_token_qr    text;
  v_ref         text;
  v_lock_key    bigint;
  v_now         timestamptz := now();
begin
  if v_user is null then raise exception 'unauthorized'; end if;

  -- 3.1) Carica la riga waitlist e bloccala (token monouso).
  --      FOR UPDATE serializza il doppio click sullo stesso link.
  select * into v_row from waitlist where offer_token = _token for update;
  if not found then raise exception 'invalid_token'; end if;
  if v_row.user_id <> v_user then raise exception 'forbidden'; end if;

  -- 3.2) Advisory xact lock per (event_id): serializza accept concorrenti
  --      di utenti DIVERSI con offerte attive sullo stesso evento.
  v_lock_key := ('x' || substr(md5('waitlist:' || v_row.event_id::text), 1, 16))::bit(64)::bigint;
  perform pg_advisory_xact_lock(v_lock_key);

  -- 3.3) Lock dell'evento per il calcolo capienza coerente.
  select * into v_event from events where id = v_row.event_id for update;
  if not found then raise exception 'event_not_found'; end if;
  if v_event.status = 'cancelled' then raise exception 'event_cancelled'; end if;

  -- 3.4) Re-check stato offerta DOPO i lock.
  if v_row.status = 'accepted' then
    -- Idempotenza doppio click: ritorna il booking esistente se c'è.
    select * into v_existing
      from bookings
     where event_id = v_row.event_id
       and user_id  = v_user
       and status in ('pending','confirmed')
     order by booked_at desc nulls last
     limit 1;
    if found then
      return query select v_existing.id, v_event.id, v_event.slug;
      return;
    end if;
    raise exception 'not_offered';
  end if;
  if v_row.status <> 'offered' then raise exception 'not_offered'; end if;
  if v_row.offer_expires_at is null or v_row.offer_expires_at < v_now then
    update waitlist set status = 'expired', updated_at = v_now where id = v_row.id;
    raise exception 'expired';
  end if;

  -- 3.5) Se l'utente ha GIÀ un booking attivo per questo evento (race con
  --      una prenotazione "normale" o doppio click), riusa quello.
  select * into v_existing
    from bookings
   where event_id = v_row.event_id
     and user_id  = v_user
     and status in ('pending','confirmed')
   order by booked_at desc nulls last
   limit 1
   for update;
  if found then
    update waitlist
       set status = 'accepted', accepted_at = v_now, updated_at = v_now
     where id = v_row.id;
    return query select v_existing.id, v_event.id, v_event.slug;
    return;
  end if;

  -- 3.6) Re-check capienza con il lock dell'evento attivo.
  if v_event.capacity is not null then
    select count(*) into v_confirmed
      from bookings
     where event_id = v_row.event_id and status = 'confirmed';
    if v_confirmed >= v_event.capacity then
      raise exception 'no_more_slots';
    end if;
  end if;

  -- 3.7) INSERT del booking. Niente ON CONFLICT: la dedupe è già gestita
  --      dal SELECT FOR UPDATE in 3.5. L'indice unique parziale resta come
  --      safety net (in caso estremo solleverà 23505 → mappato a no_more_slots
  --      dal client/edge function).
  v_token_qr := encode(gen_random_bytes(24), 'hex');
  v_ref      := upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8));

  insert into bookings(
    event_id, user_id, status, quantity, total_cents, currency,
    reference_code, qr_token, booked_at, created_at, updated_at
  ) values (
    v_row.event_id, v_user, 'confirmed', 1,
    coalesce(v_event.price_cents, 0), coalesce(v_event.currency, 'EUR'),
    v_ref, v_token_qr, v_now, v_now, v_now
  )
  returning id into v_booking_id;

  update waitlist
     set status = 'accepted', accepted_at = v_now, updated_at = v_now
   where id = v_row.id;

  return query select v_booking_id, v_event.id, v_event.slug;
end $$;

grant execute on function public.accept_waitlist_offer(uuid) to authenticated;
