-- Owner device trust: skip TOTP for 30 days after aal2 (F-03, NFR-12, NFR-13).

create table if not exists public.trusted_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  tenant_id uuid references public.clinics (id) on delete cascade,
  token_hash text not null,
  auth_session_id uuid,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint trusted_devices_token_hash_format
    check (token_hash ~ '^[a-f0-9]{64}$')
);

alter table public.trusted_devices enable row level security;
alter table public.trusted_devices force row level security;

create unique index if not exists trusted_devices_token_hash_idx
  on public.trusted_devices (token_hash);
create index if not exists trusted_devices_user_session_idx
  on public.trusted_devices (user_id, auth_session_id);

alter table public.trusted_devices
  add constraint trusted_devices_user_id_fk
  foreign key (user_id) references auth.users (id) on delete cascade;

revoke all on table public.trusted_devices from public, anon, authenticated;
grant select, insert, update, delete on table public.trusted_devices to service_role;

create or replace function private.session_mfa_ok()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2'
    or exists (
      select 1
      from public.trusted_devices as devices
      where devices.user_id = (select auth.uid())
        and devices.auth_session_id = nullif(
          (select auth.jwt() ->> 'session_id'),
          ''
        )::uuid
        and devices.revoked_at is null
        and devices.expires_at > now()
    );
$$;

create or replace function private.owner_mfa_ok()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    not exists (
      select 1
      from public.clinic_members as members
      where members.user_id = (select auth.uid())
        and members.role = 'owner'
    )
    or (select private.session_mfa_ok());
$$;

create or replace function public.session_mfa_ok()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.session_mfa_ok();
$$;

revoke all on function private.session_mfa_ok() from public;
revoke all on function public.session_mfa_ok() from public;
grant execute on function private.session_mfa_ok() to authenticated;
grant execute on function public.session_mfa_ok() to authenticated;

create or replace function public.issue_device_trust(p_token_hash text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := (select auth.uid());
  v_session uuid;
  v_tenant uuid;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  if coalesce((select auth.jwt() ->> 'aal'), '') <> 'aal2' then
    raise exception 'owner mfa required';
  end if;

  if p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid token hash';
  end if;

  v_session := nullif((select auth.jwt() ->> 'session_id'), '')::uuid;

  if v_session is null then
    raise exception 'missing session';
  end if;

  select members.tenant_id
    into v_tenant
  from public.clinic_members as members
  where members.user_id = v_user;

  insert into public.trusted_devices (
    user_id,
    tenant_id,
    token_hash,
    auth_session_id,
    expires_at
  )
  values (
    v_user,
    v_tenant,
    p_token_hash,
    v_session,
    now() + interval '30 days'
  );

  return true;
end;
$$;

create or replace function public.redeem_device_trust(p_token_hash text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := (select auth.uid());
  v_session uuid;
  v_updated int;
begin
  if v_user is null then
    return false;
  end if;

  if p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$' then
    return false;
  end if;

  v_session := nullif((select auth.jwt() ->> 'session_id'), '')::uuid;

  if v_session is null then
    return false;
  end if;

  update public.trusted_devices as devices
  set auth_session_id = v_session
  where devices.token_hash = p_token_hash
    and devices.user_id = v_user
    and devices.revoked_at is null
    and devices.expires_at > now();

  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;

create or replace function public.revoke_clinic_session(p_id uuid)
returns table (session_id uuid, user_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := (select auth.uid());
  v_tenant uuid;
  v_session uuid;
  v_target uuid;
begin
  if v_caller is null then
    raise exception 'not authenticated';
  end if;

  if not (select private.session_mfa_ok()) then
    raise exception 'owner mfa required';
  end if;

  select sessions.tenant_id, sessions.session_id, sessions.user_id
    into v_tenant, v_session, v_target
  from public.clinic_sessions as sessions
  where sessions.id = p_id
    and sessions.revoked_at is null;

  if v_tenant is null then
    return;
  end if;

  if not (select private.is_owner(v_tenant)) then
    raise exception 'not owner';
  end if;

  update public.clinic_sessions
  set revoked_at = now()
  where id = p_id
    and revoked_at is null;

  update public.trusted_devices
  set revoked_at = now()
  where auth_session_id = v_session
    and revoked_at is null;

  delete from auth.sessions where id = v_session;

  session_id := v_session;
  user_id := v_target;
  return next;
end;
$$;

create or replace function public.revoke_removed_member_sessions(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := (select auth.uid());
  v_tenant uuid;
begin
  if v_caller is null then
    raise exception 'not authenticated';
  end if;

  if not (select private.session_mfa_ok()) then
    raise exception 'owner mfa required';
  end if;

  select members.tenant_id
    into v_tenant
  from public.clinic_members as members
  where members.user_id = v_caller
    and members.role = 'owner';

  if v_tenant is null then
    raise exception 'not owner';
  end if;

  if exists (
    select 1
    from public.clinic_members as members
    where members.user_id = p_user_id
      and members.tenant_id = v_tenant
  ) then
    raise exception 'member still present';
  end if;

  update public.clinic_sessions
  set revoked_at = now()
  where user_id = p_user_id
    and tenant_id = v_tenant
    and revoked_at is null;

  update public.trusted_devices
  set revoked_at = now()
  where user_id = p_user_id
    and (tenant_id = v_tenant or tenant_id is null)
    and revoked_at is null;

  delete from auth.sessions where user_id = p_user_id;
  return true;
end;
$$;

create or replace function public.revoke_other_devices()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := (select auth.uid());
  v_session uuid;
  v_tenant uuid;
begin
  if v_caller is null then
    raise exception 'not authenticated';
  end if;

  if not (select private.session_mfa_ok()) then
    raise exception 'owner mfa required';
  end if;

  select members.tenant_id
    into v_tenant
  from public.clinic_members as members
  where members.user_id = v_caller
    and members.role = 'owner';

  if v_tenant is null then
    raise exception 'not owner';
  end if;

  v_session := nullif((select auth.jwt() ->> 'session_id'), '')::uuid;

  if v_session is null then
    raise exception 'missing session';
  end if;

  update public.clinic_sessions
  set revoked_at = now()
  where user_id = v_caller
    and tenant_id = v_tenant
    and session_id is distinct from v_session
    and revoked_at is null;

  update public.trusted_devices
  set revoked_at = now()
  where user_id = v_caller
    and revoked_at is null
    and auth_session_id is distinct from v_session;

  delete from auth.sessions
  where user_id = v_caller
    and id is distinct from v_session;

  return true;
end;
$$;

revoke all on function public.issue_device_trust(text) from public;
revoke all on function public.redeem_device_trust(text) from public;
revoke all on function public.revoke_other_devices() from public;
grant execute on function public.issue_device_trust(text) to authenticated;
grant execute on function public.redeem_device_trust(text) to authenticated;
grant execute on function public.revoke_other_devices() to authenticated;
grant execute on function public.revoke_clinic_session(uuid) to authenticated;
grant execute on function public.revoke_removed_member_sessions(uuid) to authenticated;
