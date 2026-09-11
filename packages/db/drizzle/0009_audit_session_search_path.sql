-- Audit follows the same MFA gate as other tenant tables.
-- Idle lock can revoke this device's clinic session.
-- DEFINER RPCs: empty search_path + no CREATE on public.

drop policy if exists audit_events_select on public.audit_events;
create policy audit_events_select on public.audit_events
  for select
  to authenticated
  using (
    (select private.is_owner(tenant_id))
    and (select private.can_use_clinic())
  );

drop policy if exists audit_events_insert on public.audit_events;
create policy audit_events_insert on public.audit_events
  for insert
  to authenticated
  with check (
    actor_user_id = (select auth.uid())
    and (select private.is_member(tenant_id))
    and (select private.can_use_clinic())
  );

create or replace function public.revoke_my_session()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_session uuid;
begin
  if v_user is null then
    return false;
  end if;

  v_session := nullif((select auth.jwt() ->> 'session_id'), '')::uuid;

  if v_session is null then
    return false;
  end if;

  update public.clinic_sessions as sessions
  set revoked_at = now()
  where sessions.user_id = v_user
    and sessions.session_id = v_session
    and sessions.revoked_at is null;

  delete from auth.sessions
  where id = v_session
    and user_id = v_user;

  return true;
end;
$$;

revoke all on function public.revoke_my_session() from public, anon;
grant execute on function public.revoke_my_session() to authenticated;

revoke create on schema public from public, anon, authenticated;

create or replace function public.current_membership()
returns table (tenant_id uuid, role public.clinic_role)
language sql
stable
security definer
set search_path = ''
as $$
  select members.tenant_id, members.role
  from public.clinic_members as members
  where members.user_id = (select auth.uid());
$$;

create or replace function public.register_my_session()
returns table (tenant_id uuid, role public.clinic_role)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_session uuid;
  v_tenant uuid;
  v_role public.clinic_role;
begin
  if v_user is null then
    return;
  end if;

  select members.tenant_id, members.role
    into v_tenant, v_role
  from public.clinic_members as members
  where members.user_id = v_user;

  if v_tenant is null then
    return;
  end if;

  v_session := nullif((select auth.jwt() ->> 'session_id'), '')::uuid;

  if v_session is null then
    raise exception 'missing session';
  end if;

  if exists (
    select 1
    from public.clinic_sessions as sessions
    where sessions.session_id = v_session
      and sessions.revoked_at is not null
  ) then
    return;
  end if;

  insert into public.clinic_sessions (tenant_id, user_id, session_id)
  values (v_tenant, v_user, v_session)
  on conflict (session_id) do update
    set last_active_at = now()
    where public.clinic_sessions.revoked_at is null;

  tenant_id := v_tenant;
  role := v_role;
  return next;
end;
$$;

create or replace function public.touch_my_session()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_session uuid;
  v_updated int;
begin
  if v_user is null then
    return false;
  end if;

  v_session := nullif((select auth.jwt() ->> 'session_id'), '')::uuid;

  if v_session is null then
    return false;
  end if;

  update public.clinic_sessions as sessions
  set last_active_at = now()
  where sessions.user_id = v_user
    and sessions.session_id = v_session
    and sessions.revoked_at is null
    and sessions.last_active_at > now() - interval '30 minutes';

  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;

create or replace function public.create_clinic(p_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_tenant uuid;
  v_session uuid;
  v_name text := btrim(p_name);
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  if coalesce((select auth.jwt() ->> 'aal'), '') <> 'aal2' then
    raise exception 'owner mfa required';
  end if;

  if char_length(v_name) < 2 or char_length(v_name) > 80 then
    raise exception 'invalid clinic name';
  end if;

  if exists (
    select 1 from public.clinic_members where user_id = v_user
  ) then
    raise exception 'already a member';
  end if;

  insert into public.clinics (name, region, trial_started_at)
  values (v_name, 'ph', now())
  returning id into v_tenant;

  insert into public.clinic_members (tenant_id, user_id, role)
  values (v_tenant, v_user, 'owner');

  v_session := nullif((select auth.jwt() ->> 'session_id'), '')::uuid;

  if v_session is not null then
    insert into public.clinic_sessions (tenant_id, user_id, session_id)
    values (v_tenant, v_user, v_session)
    on conflict (session_id) do nothing;
  end if;

  insert into public.audit_events (tenant_id, actor_user_id, event_type, metadata)
  values
    (v_tenant, v_user, 'clinic.created', jsonb_build_object()),
    (v_tenant, v_user, 'auth.mfa_enrolled', jsonb_build_object());

  return v_tenant;
end;
$$;

create or replace function public.issue_device_trust(p_token_hash text)
returns boolean
language plpgsql
security definer
set search_path = ''
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
set search_path = ''
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
set search_path = ''
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
set search_path = ''
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
set search_path = ''
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

create or replace function public.revoke_trusts_after_password_change()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller uuid := (select auth.uid());
  v_session uuid;
begin
  if v_caller is null then
    raise exception 'not authenticated';
  end if;

  v_session := nullif((select auth.jwt() ->> 'session_id'), '')::uuid;

  if v_session is null then
    raise exception 'missing session';
  end if;

  update public.clinic_sessions
  set revoked_at = now()
  where user_id = v_caller
    and session_id is distinct from v_session
    and revoked_at is null;

  update public.trusted_devices
  set revoked_at = now()
  where user_id = v_caller
    and revoked_at is null;

  delete from auth.sessions
  where user_id = v_caller
    and id is distinct from v_session;

  return true;
end;
$$;

notify pgrst, 'reload schema';
