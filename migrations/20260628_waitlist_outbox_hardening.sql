-- ============================================================================
-- 20260628_waitlist_outbox_hardening
-- ----------------------------------------------------------------------------
-- Production hardening per process-waitlist-outbox:
--   1) Colonne retry/audit su waitlist:
--        - offer_email_attempts        int  default 0
--        - offer_email_last_attempt_at timestamptz
--        - offer_email_last_error      text
--   2) Tabella `waitlist_alerts` per offerte non notificate da > 5 minuti.
--   3) Funzione `check_waitlist_outbox_health()` → conta/registra stale.
--   4) View `v_waitlist_outbox_stale` per dashboard admin.
--   5) Schedule pg_cron:
--        - waitlist_expire_and_repromote: ogni minuto (già esistente)
--        - waitlist_outbox_dispatch: ogni minuto via pg_net → invoca
--          l'edge function `process-waitlist-outbox` con service_role JWT.
--        - waitlist_outbox_health: ogni 5 minuti → popola alerts.
--      Le schedule pg_net sono best-effort: no-op se pg_net non è installato.
--
-- Idempotente.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Colonne retry/audit
-- ----------------------------------------------------------------------------
alter table public.waitlist
  add column if not exists offer_email_attempts        int          not null default 0,
  add column if not exists offer_email_last_attempt_at timestamptz,
  add column if not exists offer_email_last_error      text;

-- ----------------------------------------------------------------------------
-- 2) Tabella alert
-- ----------------------------------------------------------------------------
create table if not exists public.waitlist_alerts (
  id            uuid primary key default gen_random_uuid(),
  waitlist_id   uuid not null references public.waitlist(id) on delete cascade,
  event_id      uuid not null references public.events(id)   on delete cascade,
  kind          text not null check (kind in ('stale_offer','max_attempts_exceeded')),
  details       jsonb not null default '{}'::jsonb,
  acknowledged  boolean not null default false,
  created_at    timestamptz not null default now()
);
create index if not exists waitlist_alerts_open_idx
  on public.waitlist_alerts(acknowledged, created_at desc) where acknowledged = false;
create unique index if not exists waitlist_alerts_open_uq
  on public.waitlist_alerts(waitlist_id, kind) where acknowledged = false;

grant select, update on public.waitlist_alerts to authenticated;
grant all on public.waitlist_alerts to service_role;

alter table public.waitlist_alerts enable row level security;

drop policy if exists "waitlist_alerts admin read"     on public.waitlist_alerts;
drop policy if exists "waitlist_alerts admin update"   on public.waitlist_alerts;
drop policy if exists "waitlist_alerts organizer read" on public.waitlist_alerts;

create policy "waitlist_alerts admin read" on public.waitlist_alerts
  for select to authenticated
  using (public.has_role(auth.uid(),'admin'));

create policy "waitlist_alerts admin update" on public.waitlist_alerts
  for update to authenticated
  using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));

create policy "waitlist_alerts organizer read" on public.waitlist_alerts
  for select to authenticated
  using (
    public.has_role(auth.uid(),'organizer') and exists (
      select 1 from public.events e
      where e.id = waitlist_alerts.event_id and e.organizer_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- 3) Health check: registra alert per offerte non notificate da > 5 min
--    e per quelle che hanno superato MAX_ATTEMPTS (default 5).
-- ----------------------------------------------------------------------------
create or replace function public.check_waitlist_outbox_health(_threshold_seconds int default 300, _max_attempts int default 5)
returns table(stale_count int, max_attempts_count int)
language plpgsql security definer set search_path = public as $$
declare
  v_stale int := 0;
  v_max   int := 0;
begin
  with stale as (
    select w.id, w.event_id
      from waitlist w
     where w.status = 'offered'
       and w.offer_email_sent_at is null
       and w.offered_at < now() - make_interval(secs => _threshold_seconds)
  ), ins_stale as (
    insert into waitlist_alerts(waitlist_id, event_id, kind, details)
    select s.id, s.event_id, 'stale_offer',
           jsonb_build_object('threshold_seconds', _threshold_seconds, 'detected_at', now())
      from stale s
      on conflict (waitlist_id, kind) where acknowledged = false do nothing
    returning 1
  )
  select count(*) into v_stale from stale;

  with maxed as (
    select w.id, w.event_id, w.offer_email_attempts
      from waitlist w
     where w.status = 'offered'
       and w.offer_email_sent_at is null
       and w.offer_email_attempts >= _max_attempts
  ), ins_max as (
    insert into waitlist_alerts(waitlist_id, event_id, kind, details)
    select m.id, m.event_id, 'max_attempts_exceeded',
           jsonb_build_object('attempts', m.offer_email_attempts, 'detected_at', now())
      from maxed m
      on conflict (waitlist_id, kind) where acknowledged = false do nothing
    returning 1
  )
  select count(*) into v_max from maxed;

  return query select v_stale, v_max;
end $$;

revoke all on function public.check_waitlist_outbox_health(int, int) from public, anon, authenticated;
grant execute on function public.check_waitlist_outbox_health(int, int) to service_role;

-- ----------------------------------------------------------------------------
-- 4) Vista admin: offerte "in attesa di invio email" (stale o no).
-- ----------------------------------------------------------------------------
create or replace view public.v_waitlist_outbox_stale as
select
  w.id                          as waitlist_id,
  w.event_id,
  e.title                       as event_title,
  e.slug                        as event_slug,
  w.user_id,
  w.position,
  w.offered_at,
  w.offer_expires_at,
  w.offer_email_attempts        as attempts,
  w.offer_email_last_attempt_at as last_attempt_at,
  w.offer_email_last_error      as last_error,
  extract(epoch from (now() - w.offered_at))::int as pending_seconds
from public.waitlist w
join public.events  e on e.id = w.event_id
where w.status = 'offered' and w.offer_email_sent_at is null
order by w.offered_at asc;

grant select on public.v_waitlist_outbox_stale to authenticated;

-- ----------------------------------------------------------------------------
-- 5) Schedule pg_cron + pg_net (best-effort).
--    NB: richiede di settare prima:
--       select set_config('app.settings.functions_base_url', 'https://<ref>.functions.supabase.co', false);
--       select set_config('app.settings.service_role_key',   '<SERVICE_ROLE_KEY>', false);
--    oppure sostituire le costanti sotto e re-eseguire la migration.
--    Quando le settings non sono presenti, il job NON viene creato.
-- ----------------------------------------------------------------------------
do $$
declare
  v_base text := current_setting('app.settings.functions_base_url', true);
  v_key  text := current_setting('app.settings.service_role_key',   true);
  v_has_cron boolean := exists (select 1 from pg_extension where extname = 'pg_cron');
  v_has_net  boolean := exists (select 1 from pg_extension where extname = 'pg_net');
begin
  if not v_has_cron then
    raise notice '[waitlist outbox] pg_cron non installato → schedule saltati';
    return;
  end if;

  -- 5.1) expire + repromote ogni minuto (idempotente).
  perform cron.unschedule(jobid)
    from cron.job where jobname = 'waitlist_expire_and_repromote';
  perform cron.schedule(
    'waitlist_expire_and_repromote',
    '* * * * *',
    $cron$ select public.expire_and_repromote_all(); $cron$
  );

  -- 5.2) health check ogni 5 minuti.
  perform cron.unschedule(jobid)
    from cron.job where jobname = 'waitlist_outbox_health';
  perform cron.schedule(
    'waitlist_outbox_health',
    '*/5 * * * *',
    $cron$ select public.check_waitlist_outbox_health(300, 5); $cron$
  );

  -- 5.3) dispatch dell'edge function ogni minuto (richiede pg_net + settings).
  perform cron.unschedule(jobid)
    from cron.job where jobname = 'waitlist_outbox_dispatch';

  if v_has_net and v_base is not null and v_key is not null
     and length(v_base) > 0 and length(v_key) > 0 then
    perform cron.schedule(
      'waitlist_outbox_dispatch',
      '* * * * *',
      format(
        $cron$
          select net.http_post(
            url     := %L,
            headers := jsonb_build_object(
              'Content-Type',  'application/json',
              'Authorization', 'Bearer ' || %L
            ),
            body    := '{}'::jsonb,
            timeout_milliseconds := 25000
          );
        $cron$,
        rtrim(v_base, '/') || '/process-waitlist-outbox',
        v_key
      )
    );
  else
    raise notice '[waitlist outbox] pg_net o settings mancanti → dispatch via cron disabilitato. Usa Supabase Scheduled Functions dal dashboard.';
  end if;
end $$;
