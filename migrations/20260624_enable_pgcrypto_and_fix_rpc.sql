-- =====================================================================
-- Fix: gen_random_bytes() richiede l'estensione pgcrypto.
-- Abilitiamo pgcrypto e ricreiamo la RPC in modo robusto: se pgcrypto
-- non fosse disponibile, fallback su gen_random_uuid() (built-in).
-- Idempotente.
-- =====================================================================

create extension if not exists pgcrypto with schema public;

create or replace function public.create_event_booking(p_event_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user_id  uuid := auth.uid();
  v_event    public.events%rowtype;
  v_existing public.bookings%rowtype;
  v_count    int;
  v_token    text;
  v_ref      text;
  v_now      timestamptz := now();
  v_row      public.bookings%rowtype;
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select * into v_event from public.events where id = p_event_id for update;
  if not found then
    raise exception 'event_not_found' using errcode = 'P0002';
  end if;

  if v_event.status is distinct from 'published' then
    raise exception 'event_not_bookable' using errcode = 'P0001';
  end if;

  select * into v_existing
  from public.bookings
  where event_id = p_event_id
    and user_id  = v_user_id
    and status in ('pending', 'confirmed')
  limit 1;
  if found then
    return v_existing;
  end if;

  if v_event.capacity is not null then
    select count(*) into v_count
    from public.bookings
    where event_id = p_event_id and status = 'confirmed';
    if v_count >= v_event.capacity then
      raise exception 'sold_out' using errcode = 'P0001';
    end if;
  end if;

  -- Genera token QR e reference code univoci usando gen_random_uuid() (built-in).
  -- Concateniamo due uuid per avere ~64 hex chars di entropia per il token.
  v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  v_ref   := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  insert into public.bookings (
    event_id, user_id, status, quantity, total_cents, currency,
    reference_code, qr_token, booked_at, created_at, updated_at
  ) values (
    p_event_id, v_user_id, 'confirmed', 1, coalesce(v_event.price_cents, 0),
    coalesce(v_event.currency, 'EUR'),
    v_ref, v_token, v_now, v_now, v_now
  )
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.create_event_booking(uuid) from public;
grant execute on function public.create_event_booking(uuid) to authenticated;
