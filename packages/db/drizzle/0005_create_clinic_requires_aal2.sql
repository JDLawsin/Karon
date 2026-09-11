-- First-time owners must already be aal2 before create_clinic (NFR-12).
-- audit_events.tenant_id is required, so auth.mfa_enrolled is written here
-- in the same transaction as clinic.created.

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
    select 1 from clinic_members where user_id = v_user
  ) then
    raise exception 'already a member';
  end if;

  insert into clinics (name, region, trial_started_at)
  values (v_name, 'ph', now())
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
  values
    (v_tenant, v_user, 'clinic.created', jsonb_build_object()),
    (v_tenant, v_user, 'auth.mfa_enrolled', jsonb_build_object());

  return v_tenant;
end;
$$;
