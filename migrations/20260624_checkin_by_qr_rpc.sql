-- =============================================================================
-- StayUp — Check-in by QR token (RPC sicura)
-- File: 20260624_checkin_by_qr_rpc.sql
--
-- Crea public.checkin_by_qr_token(text) -> jsonb
-- - SECURITY DEFINER: bypassa RLS in modo controllato
-- - Riceve SOLO il qr_token (no event_id, no user_id dal client)
-- - Risolve booking/event/profile dal database
-- - Verifica permessi caller (admin oppure organizer dell'evento)
-- - Verifica stato evento e prenotazione
-- - Idempotente: se esiste già un checkin per il booking, ritorna already_used
-- - Crea il checkin e ritorna risultato strutturato
--
-- Risposta JSON (ok=true|false, code, message, previous_status, new_status,
--   checked_in_at, event{...}, booking{...}, profile{...}).
-- =============================================================================

create or replace function public.checkin_by_qr_token(_qr_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller       uuid := auth.uid();
  v_token        text := nullif(trim(_qr_token), '');
  v_booking      public.bookings%rowtype;
  v_event        public.events%rowtype;
  v_profile_full text;
  v_profile_mail text;
  v_existing     public.checkins%rowtype;
  v_new          public.checkins%rowtype;
begin
  if v_caller is null then
    return jsonb_build_object('ok', false, 'code', 'unauthorized',
                              'message', 'Non autenticato');
  end if;

  if not (public.has_role(v_caller, 'admin')
          or public.has_role(v_caller, 'organizer')) then
    return jsonb_build_object('ok', false, 'code', 'forbidden',
                              'message', 'Permessi insufficienti');
  end if;

  if v_token is null then
    return jsonb_build_object('ok', false, 'code', 'invalid_token',
                              'message', 'QR non valido');
  end if;

  select * into v_booking
  from public.bookings
  where qr_token = v_token
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'not_found',
                              'message', 'QR non riconosciuto');
  end if;

  select * into v_event
  from public.events
  where id = v_booking.event_id;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'event_missing',
                              'message', 'Evento non trovato');
  end if;

  -- Un organizer non admin può fare check-in solo per i propri eventi
  if not public.has_role(v_caller, 'admin')
     and v_event.organizer_id is distinct from v_caller then
    return jsonb_build_object('ok', false, 'code', 'forbidden_event',
                              'message', 'Non sei l''organizer di questo evento');
  end if;

  select full_name, email into v_profile_full, v_profile_mail
  from public.profiles
  where id = v_booking.user_id;

  if v_event.status = 'cancelled' then
    return jsonb_build_object(
      'ok', false, 'code', 'event_cancelled',
      'message', 'Evento annullato',
      'previous_status', v_booking.status::text,
      'event',   jsonb_build_object('id', v_event.id, 'title', v_event.title,
                                    'starts_at', v_event.starts_at, 'status', v_event.status),
      'booking', jsonb_build_object('id', v_booking.id, 'reference_code', v_booking.reference_code,
                                    'status', v_booking.status),
      'profile', jsonb_build_object('id', v_booking.user_id,
                                    'full_name', v_profile_full, 'email', v_profile_mail));
  end if;

  if v_booking.status in ('cancelled', 'refunded') then
    return jsonb_build_object(
      'ok', false, 'code', 'booking_cancelled',
      'message', 'Prenotazione annullata',
      'previous_status', v_booking.status::text,
      'event',   jsonb_build_object('id', v_event.id, 'title', v_event.title,
                                    'starts_at', v_event.starts_at, 'status', v_event.status),
      'booking', jsonb_build_object('id', v_booking.id, 'reference_code', v_booking.reference_code,
                                    'status', v_booking.status),
      'profile', jsonb_build_object('id', v_booking.user_id,
                                    'full_name', v_profile_full, 'email', v_profile_mail));
  end if;

  -- Idempotenza: se esiste già un check-in, non ne creare un altro
  select * into v_existing
  from public.checkins
  where booking_id = v_booking.id
  limit 1;

  if found then
    return jsonb_build_object(
      'ok', false, 'code', 'already_used',
      'message', 'QR già utilizzato',
      'previous_status', 'checked_in',
      'new_status',      'checked_in',
      'checked_in_at',   v_existing.checked_in_at,
      'event',   jsonb_build_object('id', v_event.id, 'title', v_event.title,
                                    'starts_at', v_event.starts_at, 'status', v_event.status),
      'booking', jsonb_build_object('id', v_booking.id, 'reference_code', v_booking.reference_code,
                                    'status', v_booking.status),
      'profile', jsonb_build_object('id', v_booking.user_id,
                                    'full_name', v_profile_full, 'email', v_profile_mail));
  end if;

  insert into public.checkins (booking_id, event_id, user_id, checked_in_by, method)
  values (v_booking.id, v_booking.event_id, v_booking.user_id, v_caller, 'qr')
  returning * into v_new;

  return jsonb_build_object(
    'ok', true, 'code', 'checked_in',
    'message', 'Check-in registrato',
    'previous_status', v_booking.status::text,
    'new_status',      'checked_in',
    'checked_in_at',   v_new.checked_in_at,
    'event',   jsonb_build_object('id', v_event.id, 'title', v_event.title,
                                  'starts_at', v_event.starts_at, 'status', v_event.status),
    'booking', jsonb_build_object('id', v_booking.id, 'reference_code', v_booking.reference_code,
                                  'status', v_booking.status),
    'profile', jsonb_build_object('id', v_booking.user_id,
                                  'full_name', v_profile_full, 'email', v_profile_mail));

exception when others then
  return jsonb_build_object('ok', false, 'code', 'server_error',
                            'message', SQLERRM);
end;
$$;

revoke all on function public.checkin_by_qr_token(text) from public, anon;
grant execute on function public.checkin_by_qr_token(text) to authenticated;
