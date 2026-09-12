-- Clinic profile collected during onboarding (name already exists).
-- Existing tenants keep working: timezone defaults; contact/hours/logo stay nullable.

alter table public.clinics
  add column if not exists timezone text not null default 'Asia/Manila',
  add column if not exists phone text,
  add column if not exists email text,
  add column if not exists address jsonb not null default '{}'::jsonb,
  add column if not exists hours jsonb,
  add column if not exists services jsonb not null default '[]'::jsonb,
  add column if not exists logo_path text;

alter table public.clinics
  drop constraint if exists clinics_timezone_length;

alter table public.clinics
  add constraint clinics_timezone_length
  check (char_length(btrim(timezone)) between 1 and 64);

drop function if exists public.create_clinic(text);

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
    hours,
    services
  )
  values (
    v_name,
    'ph',
    now(),
    v_timezone,
    nullif(btrim(coalesce(v_profile->>'phone', '')), ''),
    nullif(btrim(coalesce(v_profile->>'email', '')), ''),
    v_address,
    v_hours,
    v_services
  )
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

revoke all on function public.create_clinic(text, jsonb) from public, anon;
grant execute on function public.create_clinic(text, jsonb) to authenticated;

do $$
begin
  if to_regnamespace('storage') is not null then
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values (
    'clinic-branding',
    'clinic-branding',
    false,
    524288,
    array['image/png', 'image/jpeg', 'image/webp']
  )
  on conflict (id) do update
    set public = excluded.public,
        file_size_limit = excluded.file_size_limit,
        allowed_mime_types = excluded.allowed_mime_types;

  drop policy if exists clinic_branding_select on storage.objects;
  drop policy if exists clinic_branding_insert on storage.objects;
  drop policy if exists clinic_branding_update on storage.objects;
  drop policy if exists clinic_branding_delete on storage.objects;

  create policy clinic_branding_select on storage.objects
    for select
    to authenticated
    using (
      bucket_id = 'clinic-branding'
      and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/logo$'
      and (select private.is_member(split_part(name, '/', 1)::uuid))
      and (select private.can_use_clinic())
    );

  create policy clinic_branding_insert on storage.objects
    for insert
    to authenticated
    with check (
      bucket_id = 'clinic-branding'
      and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/logo$'
      and (select private.is_owner(split_part(name, '/', 1)::uuid))
      and (select private.can_use_clinic())
    );

  create policy clinic_branding_update on storage.objects
    for update
    to authenticated
    using (
      bucket_id = 'clinic-branding'
      and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/logo$'
      and (select private.is_owner(split_part(name, '/', 1)::uuid))
      and (select private.can_use_clinic())
    )
    with check (
      bucket_id = 'clinic-branding'
      and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/logo$'
      and (select private.is_owner(split_part(name, '/', 1)::uuid))
      and (select private.can_use_clinic())
    );

  create policy clinic_branding_delete on storage.objects
    for delete
    to authenticated
    using (
      bucket_id = 'clinic-branding'
      and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/logo$'
      and (select private.is_owner(split_part(name, '/', 1)::uuid))
      and (select private.can_use_clinic())
    );
  end if;
end;
$$;

notify pgrst, 'reload schema';
