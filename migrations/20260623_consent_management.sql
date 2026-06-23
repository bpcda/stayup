-- Consent management: privacy (required) + marketing (optional) with audit log.
-- Idempotente.

-- 1) Colonne sul profilo
alter table public.profiles
  add column if not exists privacy_accepted_at   timestamptz,
  add column if not exists privacy_version       text,
  add column if not exists marketing_consent     boolean not null default false,
  add column if not exists marketing_consent_at  timestamptz;

-- 2) Tabella audit dei consensi
create table if not exists public.consent_log (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  consent_type    text not null check (consent_type in ('privacy','marketing')),
  granted         boolean not null,
  policy_version  text,
  source          text,
  user_agent      text,
  created_at      timestamptz not null default now()
);

create index if not exists consent_log_user_idx
  on public.consent_log (user_id, created_at desc);

grant select, insert on public.consent_log to authenticated;
grant all on public.consent_log to service_role;

alter table public.consent_log enable row level security;

drop policy if exists "consent_log own insert"  on public.consent_log;
drop policy if exists "consent_log own select"  on public.consent_log;
drop policy if exists "consent_log admin read"  on public.consent_log;

create policy "consent_log own insert" on public.consent_log
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "consent_log own select" on public.consent_log
  for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

-- 3) Estensione handle_new_user: legge consensi dal raw_user_meta_data
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_privacy_version text := nullif(new.raw_user_meta_data->>'privacy_version', '');
  v_privacy_at      timestamptz := case
    when (new.raw_user_meta_data->>'privacy_accepted') = 'true' then now()
    else null
  end;
  v_marketing       boolean := coalesce((new.raw_user_meta_data->>'marketing_consent')::boolean, false);
begin
  insert into public.profiles (
    id, email, full_name,
    privacy_version, privacy_accepted_at,
    marketing_consent, marketing_consent_at
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
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
