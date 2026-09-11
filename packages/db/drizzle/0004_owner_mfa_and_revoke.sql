-- Owner MFA at the Data API (NFR-12) and irreversible device revoke (F-03, NFR-13).

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
    or coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2';
$$;

create or replace function private.can_use_clinic()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select private.has_active_session())
     and (select private.owner_mfa_ok());
$$;

revoke all on function private.owner_mfa_ok() from public;
revoke all on function private.can_use_clinic() from public;
grant execute on function private.owner_mfa_ok() to authenticated;
grant execute on function private.can_use_clinic() to authenticated;

create or replace function public.has_active_session()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_active_session();
$$;

revoke all on function public.has_active_session() from public;
grant execute on function public.has_active_session() to authenticated;

drop policy if exists clinics_select on clinics;
create policy clinics_select on clinics
  for select
  to authenticated
  using (
    (select private.is_member(id))
    and (select private.can_use_clinic())
  );

drop policy if exists clinics_update on clinics;
create policy clinics_update on clinics
  for update
  to authenticated
  using (
    (select private.is_owner(id))
    and (select private.can_use_clinic())
  )
  with check (
    (select private.is_owner(id))
    and (select private.can_use_clinic())
  );

drop policy if exists clinic_members_select on clinic_members;
create policy clinic_members_select on clinic_members
  for select
  to authenticated
  using (
    (select private.is_member(tenant_id))
    and (select private.can_use_clinic())
  );

drop policy if exists clinic_members_insert on clinic_members;
create policy clinic_members_insert on clinic_members
  for insert
  to authenticated
  with check (
    role = 'assistant'
    and (select private.is_owner(tenant_id))
    and (select private.can_use_clinic())
  );

drop policy if exists clinic_members_delete on clinic_members;
create policy clinic_members_delete on clinic_members
  for delete
  to authenticated
  using (
    role = 'assistant'
    and (select private.is_owner(tenant_id))
    and (select private.can_use_clinic())
  );

drop policy if exists clinic_sessions_select on clinic_sessions;
create policy clinic_sessions_select on clinic_sessions
  for select
  to authenticated
  using (
    (select private.is_member(tenant_id))
    and (select private.can_use_clinic())
    and (
      user_id = (select auth.uid())
      or (select private.is_owner(tenant_id))
    )
  );

drop policy if exists clinic_sessions_update on clinic_sessions;

revoke update, delete on table clinic_sessions from authenticated;

create or replace function public.register_my_session()
returns table (tenant_id uuid, role public.clinic_role)
language plpgsql
security definer
set search_path = public
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

  if coalesce((select auth.jwt() ->> 'aal'), '') <> 'aal2' then
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

  if coalesce((select auth.jwt() ->> 'aal'), '') <> 'aal2' then
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

  delete from auth.sessions where user_id = p_user_id;
  return true;
end;
$$;

revoke all on function public.revoke_clinic_session(uuid) from public;
revoke all on function public.revoke_removed_member_sessions(uuid) from public;
grant execute on function public.revoke_clinic_session(uuid) to authenticated;
grant execute on function public.revoke_removed_member_sessions(uuid) to authenticated;
