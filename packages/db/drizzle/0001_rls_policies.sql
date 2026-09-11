-- Auth / tenant isolation helpers, grants, and policies (F-03, F-13).

create schema if not exists private;

create or replace function private.current_user_id()
returns uuid
language sql
stable
as $$
  select (select auth.uid());
$$;

create or replace function private.is_member(_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.clinic_members as members
    where members.tenant_id = _tenant_id
      and members.user_id = (select auth.uid())
  );
$$;

create or replace function private.is_owner(_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.clinic_members as members
    where members.tenant_id = _tenant_id
      and members.user_id = (select auth.uid())
      and members.role = 'owner'
  );
$$;

create or replace function private.has_active_session()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.clinic_sessions as sessions
    where sessions.user_id = (select auth.uid())
      and sessions.session_id = nullif(
        (select auth.jwt() ->> 'session_id'),
        ''
      )::uuid
      and sessions.revoked_at is null
      and sessions.last_active_at > now() - interval '30 minutes'
  );
$$;

revoke all on function private.current_user_id() from public;
revoke all on function private.is_member(uuid) from public;
revoke all on function private.is_owner(uuid) from public;
revoke all on function private.has_active_session() from public;
grant execute on function private.current_user_id() to authenticated;
grant execute on function private.is_member(uuid) to authenticated;
grant execute on function private.is_owner(uuid) to authenticated;
grant execute on function private.has_active_session() to authenticated;

create or replace function public.create_clinic(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := (select auth.uid());
  v_tenant uuid;
  v_session uuid;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  if exists (
    select 1 from clinic_members where user_id = v_user
  ) then
    raise exception 'already a member';
  end if;

  insert into clinics (name, region, trial_started_at)
  values (trim(p_name), 'ph', now())
  returning id into v_tenant;

  insert into clinic_members (tenant_id, user_id, role)
  values (v_tenant, v_user, 'owner');

  v_session := nullif((select auth.jwt() ->> 'session_id'), '')::uuid;

  if v_session is not null then
    insert into clinic_sessions (tenant_id, user_id, session_id)
    values (v_tenant, v_user, v_session)
    on conflict (session_id) do nothing;
  end if;

  insert into audit_events (tenant_id, actor_user_id, event_type, metadata)
  values (
    v_tenant,
    v_user,
    'clinic.created',
    jsonb_build_object()
  );

  return v_tenant;
end;
$$;

revoke all on function public.create_clinic(text) from public;
grant execute on function public.create_clinic(text) to authenticated;

alter table clinics force row level security;
alter table clinic_members force row level security;
alter table clinic_sessions force row level security;
alter table audit_events force row level security;

grant usage on schema public to authenticated, anon;
grant select, insert, update, delete on table clinics to authenticated;
grant select, insert, update, delete on table clinic_members to authenticated;
grant select, insert, update, delete on table clinic_sessions to authenticated;
grant select, insert, update, delete on table audit_events to authenticated;

create policy clinics_select on clinics
  for select
  to authenticated
  using (
    (select private.is_member(id))
    and (select private.has_active_session())
  );

create policy clinics_update on clinics
  for update
  to authenticated
  using (
    (select private.is_owner(id))
    and (select private.has_active_session())
  )
  with check (
    (select private.is_owner(id))
    and (select private.has_active_session())
  );

create policy clinic_members_select on clinic_members
  for select
  to authenticated
  using (
    (select private.is_member(tenant_id))
    and (select private.has_active_session())
  );

create policy clinic_members_insert on clinic_members
  for insert
  to authenticated
  with check (
    role = 'assistant'
    and (select private.is_owner(tenant_id))
    and (select private.has_active_session())
  );

create policy clinic_members_delete on clinic_members
  for delete
  to authenticated
  using (
    role = 'assistant'
    and (select private.is_owner(tenant_id))
    and (select private.has_active_session())
  );

create policy clinic_sessions_select on clinic_sessions
  for select
  to authenticated
  using (
    (select private.is_member(tenant_id))
    and (select private.has_active_session())
    and (
      user_id = (select auth.uid())
      or (select private.is_owner(tenant_id))
    )
  );

create policy clinic_sessions_insert on clinic_sessions
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and session_id = nullif((select auth.jwt() ->> 'session_id'), '')::uuid
    and (select private.is_member(tenant_id))
  );

create policy clinic_sessions_update on clinic_sessions
  for update
  to authenticated
  using (
    (select private.is_member(tenant_id))
    and (
      user_id = (select auth.uid())
      or (select private.is_owner(tenant_id))
    )
  )
  with check (
    user_id = (select auth.uid())
    or (select private.is_owner(tenant_id))
  );

create policy audit_events_select on audit_events
  for select
  to authenticated
  using (
    (select private.is_owner(tenant_id))
    and (select private.has_active_session())
  );

create policy audit_events_insert on audit_events
  for insert
  to authenticated
  with check (
    actor_user_id = (select auth.uid())
    and (select private.is_member(tenant_id))
    and (select private.has_active_session())
  );
