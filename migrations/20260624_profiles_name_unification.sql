-- Profiles: unify name fields.
-- Strategia: aggiunge first_name / last_name a public.profiles, mantiene
-- full_name come campo derivato e sincronizzato via trigger. Idempotente.
--
-- Riferimento Production Readiness Report — C-4 (schema mismatch).

-- 1) Aggiungi colonne mancanti -----------------------------------------------
alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name  text;

-- 2) Backfill ----------------------------------------------------------------
-- 2a) full_name presente, first_name vuoto → primo token in first_name,
--     resto in last_name (split sul primo spazio, safe per nomi singoli).
update public.profiles
   set first_name = split_part(full_name, ' ', 1),
       last_name  = nullif(
         btrim(substr(full_name, length(split_part(full_name, ' ', 1)) + 1)),
         ''
       )
 where full_name is not null
   and btrim(full_name) <> ''
   and (first_name is null or btrim(first_name) = '');

-- 2b) first_name / last_name presenti, full_name vuoto → ricostruisci.
update public.profiles
   set full_name = nullif(btrim(concat_ws(' ', first_name, last_name)), '')
 where (full_name is null or btrim(full_name) = '')
   and (
     (first_name is not null and btrim(first_name) <> '')
     or (last_name is not null and btrim(last_name) <> '')
   );

-- 3) Trigger di sincronizzazione --------------------------------------------
-- Mantiene full_name allineato quando vengono modificati first_name/last_name.
-- Non fa auto-split inverso (se l'app aggiorna solo full_name, lo lascia
-- intatto: i form dell'app aggiornano sempre first/last, non full_name).
create or replace function public.profiles_sync_full_name()
returns trigger
language plpgsql
as $$
declare
  v_first text := nullif(btrim(coalesce(new.first_name, '')), '');
  v_last  text := nullif(btrim(coalesce(new.last_name,  '')), '');
  v_full  text := nullif(btrim(concat_ws(' ', v_first, v_last)), '');
begin
  if v_full is not null then
    new.full_name := v_full;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_sync_full_name on public.profiles;
create trigger profiles_sync_full_name
  before insert or update of first_name, last_name on public.profiles
  for each row execute function public.profiles_sync_full_name();

-- 4) handle_new_user — supporta email signup + Google OAuth ------------------
-- Legge first_name / last_name / full_name / name / given_name / family_name
-- dal raw_user_meta_data (Supabase popola given_name/family_name per Google).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_meta            jsonb       := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_first           text        := nullif(btrim(coalesce(v_meta->>'first_name', v_meta->>'given_name', '')), '');
  v_last            text        := nullif(btrim(coalesce(v_meta->>'last_name',  v_meta->>'family_name', '')), '');
  v_full            text        := nullif(btrim(coalesce(v_meta->>'full_name',  v_meta->>'name', '')), '');
  v_privacy_version text        := nullif(v_meta->>'privacy_version', '');
  v_privacy_at      timestamptz := case
    when (v_meta->>'privacy_accepted') = 'true' then now()
    else null
  end;
  v_marketing       boolean     := coalesce((v_meta->>'marketing_consent')::boolean, false);
begin
  -- Se non abbiamo first/last ma c'è un full_name, split sul primo spazio.
  if v_first is null and v_full is not null then
    v_first := split_part(v_full, ' ', 1);
    v_last  := nullif(btrim(substr(v_full, length(split_part(v_full, ' ', 1)) + 1)), '');
  end if;

  -- Se non abbiamo full_name ma abbiamo first/last, ricostruiscilo.
  if v_full is null then
    v_full := nullif(btrim(concat_ws(' ', v_first, v_last)), '');
  end if;

  insert into public.profiles (
    id, email, first_name, last_name, full_name,
    privacy_version, privacy_accepted_at,
    marketing_consent, marketing_consent_at
  )
  values (
    new.id,
    new.email,
    v_first,
    v_last,
    v_full,
    v_privacy_version,
    v_privacy_at,
    v_marketing,
    case when v_marketing then now() else null end
  )
  on conflict (id) do nothing;

  if v_privacy_at is not null then
    insert into public.consent_log (user_id, consent_type, granted, policy_version, source)
    values (new.id, 'privacy', true, v_privacy_version, 'signup');
  end if;

  insert into public.consent_log (user_id, consent_type, granted, policy_version, source)
  values (new.id, 'marketing', v_marketing, v_privacy_version, 'signup');

  return new;
end;
$$;

-- Trigger già definito in 20260623_stayup_v2_schema.sql; ricreazione safe.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
