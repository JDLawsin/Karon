-- Tenant-scoped services catalog (replaces clinics.services JSONB).

create table if not exists public.clinic_services (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.clinics (id) on delete cascade,
  name text not null,
  description text,
  icon text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references auth.users (id) on delete restrict,
  updated_by uuid not null references auth.users (id) on delete restrict,
  constraint clinic_services_name_length
    check (char_length(btrim(name)) between 1 and 80),
  constraint clinic_services_description_length
    check (description is null or char_length(description) <= 280),
  constraint clinic_services_icon_length
    check (icon is null or char_length(icon) <= 64)
);

create unique index if not exists clinic_services_tenant_name_idx
  on public.clinic_services (tenant_id, lower(btrim(name)));

create index if not exists clinic_services_tenant_name_sort_idx
  on public.clinic_services (tenant_id, name);

-- Pre-deploy only: drop legacy JSONB without backfill (no production data yet).
alter table public.clinics drop column if exists services;

alter table public.clinic_services enable row level security;
alter table public.clinic_services force row level security;

revoke all on table public.clinic_services from public, anon, authenticated;
grant select, insert, update, delete on table public.clinic_services to authenticated;
grant select, insert, update, delete on table public.clinic_services to service_role;

drop policy if exists clinic_services_select on public.clinic_services;
drop policy if exists clinic_services_insert on public.clinic_services;
drop policy if exists clinic_services_update on public.clinic_services;
drop policy if exists clinic_services_delete on public.clinic_services;

create policy clinic_services_select on public.clinic_services
  for select
  to authenticated
  using (
    (select private.is_member(tenant_id))
    and (select private.can_use_clinic())
  );

create policy clinic_services_insert on public.clinic_services
  for insert
  to authenticated
  with check (
    (select private.is_member(tenant_id))
    and (select private.can_use_clinic())
    and created_by = (select auth.uid())
    and updated_by = (select auth.uid())
  );

create policy clinic_services_update on public.clinic_services
  for update
  to authenticated
  using (
    (select private.is_member(tenant_id))
    and (select private.can_use_clinic())
  )
  with check (
    (select private.is_member(tenant_id))
    and (select private.can_use_clinic())
    and updated_by = (select auth.uid())
  );

create policy clinic_services_delete on public.clinic_services
  for delete
  to authenticated
  using (
    (select private.is_member(tenant_id))
    and (select private.can_use_clinic())
  );

-- Extend audit event types for service CRUD.
alter table public.audit_events drop constraint if exists audit_events_type_check;

alter table public.audit_events
  add constraint audit_events_type_check
  check (event_type in (
    'clinic.created',
    'auth.signup',
    'auth.login',
    'auth.mfa_enrolled',
    'auth.session_revoked',
    'auth.idle_lock',
    'auth.password_changed',
    'member.invited',
    'member.removed',
    'access.denied',
    'service.created',
    'service.updated',
    'service.deleted'
  ));

-- Seed services into clinic_services during onboarding (not JSONB).
create or replace function public.create_clinic(p_name text, p_profile jsonb)
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
  v_profile jsonb := coalesce(p_profile, '{}'::jsonb);
  v_timezone text := btrim(coalesce(v_profile->>'timezone', ''));
  v_hours jsonb := coalesce(v_profile->'hours', '{}'::jsonb);
  v_address jsonb := coalesce(v_profile->'address', '{}'::jsonb);
  v_services jsonb := coalesce(v_profile->'services', '[]'::jsonb);
  v_service jsonb;
  v_service_id uuid;
  v_service_name text;
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

  if v_timezone = '' or char_length(v_timezone) > 64 then
    raise exception 'invalid timezone';
  end if;

  if jsonb_typeof(v_hours->'days') is distinct from 'array'
    or jsonb_array_length(v_hours->'days') < 1 then
    raise exception 'invalid hours';
  end if;

  if jsonb_typeof(v_address) is distinct from 'object' then
    v_address := '{}'::jsonb;
  end if;

  if jsonb_typeof(v_services) is distinct from 'array' then
    v_services := '[]'::jsonb;
  end if;

  if exists (
    select 1 from public.clinic_members where user_id = v_user
  ) then
    raise exception 'already a member';
  end if;

  insert into public.clinics (
    name,
    region,
    trial_started_at,
    timezone,
    phone,
    email,
    address,
    hours
  )
  values (
    v_name,
    'ph',
    now(),
    v_timezone,
    nullif(btrim(coalesce(v_profile->>'phone', '')), ''),
    nullif(btrim(coalesce(v_profile->>'email', '')), ''),
    v_address,
    v_hours
  )
  returning id into v_tenant;

  for v_service in
    select value
    from jsonb_array_elements(v_services)
  loop
    if jsonb_typeof(v_service) <> 'object' then
      continue;
    end if;

    v_service_name := btrim(coalesce(v_service->>'name', ''));

    if v_service_name = '' or char_length(v_service_name) > 80 then
      continue;
    end if;

    begin
      v_service_id := (v_service->>'id')::uuid;
    exception
      when others then
        v_service_id := gen_random_uuid();
    end;

    insert into public.clinic_services (
      id,
      tenant_id,
      name,
      created_by,
      updated_by
    )
    values (
      v_service_id,
      v_tenant,
      v_service_name,
      v_user,
      v_user
    )
    on conflict (tenant_id, lower(btrim(name))) do nothing
    returning id into v_service_id;

    if found then
      insert into public.audit_events (tenant_id, actor_user_id, event_type, record_id)
      values (v_tenant, v_user, 'service.created', v_service_id);
    end if;
  end loop;

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

revoke all on function public.create_clinic(text, jsonb) from public, anon;
grant execute on function public.create_clinic(text, jsonb) to authenticated;

notify pgrst, 'reload schema';
