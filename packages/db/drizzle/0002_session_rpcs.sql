-- Session bootstrap without a chicken-egg RLS read, and append-only audit grants.

revoke update, delete on table audit_events from authenticated;

create or replace function public.current_membership()
returns table (tenant_id uuid, role public.clinic_role)
language sql
stable
security definer
set search_path = public
as $$
  select members.tenant_id, members.role
  from public.clinic_members as members
  where members.user_id = (select auth.uid());
$$;

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

  insert into public.clinic_sessions (tenant_id, user_id, session_id)
  values (v_tenant, v_user, v_session)
  on conflict (session_id) do update
    set last_active_at = now();

  tenant_id := v_tenant;
  role := v_role;
  return next;
end;
$$;

create or replace function public.touch_my_session()
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

revoke all on function public.current_membership() from public;
revoke all on function public.register_my_session() from public;
revoke all on function public.touch_my_session() from public;
grant execute on function public.current_membership() to authenticated;
grant execute on function public.register_my_session() to authenticated;
grant execute on function public.touch_my_session() to authenticated;
