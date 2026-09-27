-- KR-016: required clinic currency, locale, and IANA timezone settings.

alter table public.clinics
  add column if not exists locale text not null default 'en-PH';

alter table public.clinics
  drop constraint if exists clinics_locale_format;

alter table public.clinics
  add constraint clinics_locale_format
  check (
    char_length(locale) between 2 and 35
    and locale ~ '^[A-Za-z]{2,8}(-[A-Za-z0-9]{1,8})*$'
  );

create or replace function private.is_iso_4217(p_currency text)
returns boolean
language sql
immutable
security invoker
set search_path = ''
as $$
  select p_currency = any (array[
    'AED','AFN','ALL','AMD','ANG','AOA','ARS','AUD','AWG','AZN','BAM','BBD',
    'BDT','BGN','BHD','BIF','BMD','BND','BOB','BRL','BSD','BTN','BWP','BYN',
    'BZD','CAD','CDF','CHF','CLP','CNY','COP','CRC','CUC','CUP','CVE','CZK',
    'DJF','DKK','DOP','DZD','EGP','ERN','ETB','EUR','FJD','FKP','GBP','GEL',
    'GHS','GIP','GMD','GNF','GTQ','GYD','HKD','HNL','HRK','HTG','HUF','IDR',
    'ILS','INR','IQD','IRR','ISK','JMD','JOD','JPY','KES','KGS','KHR','KMF',
    'KPW','KRW','KWD','KYD','KZT','LAK','LBP','LKR','LRD','LSL','LYD','MAD',
    'MDL','MGA','MKD','MMK','MNT','MOP','MRU','MUR','MVR','MWK','MXN','MYR',
    'MZN','NAD','NGN','NIO','NOK','NPR','NZD','OMR','PAB','PEN','PGK','PHP',
    'PKR','PLN','PYG','QAR','RON','RSD','RUB','RWF','SAR','SBD','SCR','SDG',
    'SEK','SGD','SHP','SLE','SLL','SOS','SRD','SSP','STN','SVC','SYP','SZL',
    'THB','TJS','TMT','TND','TOP','TRY','TTD','TWD','TZS','UAH','UGX','USD',
    'UYU','UZS','VES','VND','VUV','WST','XAF','XCD','XCG','XDR','XOF','XPF',
    'XSU','YER','ZAR','ZMW','ZWG','ZWL'
  ]::text[]);
$$;

revoke all on function private.is_iso_4217(text) from public;
grant execute on function private.is_iso_4217(text) to authenticated, service_role;

create or replace function private.validate_clinic_regional_settings()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not (select private.is_iso_4217(new.currency_code)) then
    raise exception 'invalid ISO 4217 currency' using errcode = '22023';
  end if;

  if tg_op = 'UPDATE'
     and old.currency_code is distinct from new.currency_code
     and exists (
       select 1
       from public.clinic_events as event
       where event.tenant_id = new.id
         and event.event_type in ('quote.created', 'payment.recorded')
     ) then
    raise exception 'clinic currency cannot change after financial activity'
      using errcode = '22023';
  end if;

  if new.locale is null
     or char_length(new.locale) not between 2 and 35
     or new.locale !~ '^[A-Za-z]{2,8}(-[A-Za-z0-9]{1,8})*$' then
    raise exception 'invalid locale' using errcode = '22023';
  end if;

  if new.timezone is null or not exists (
    select 1
    from pg_catalog.pg_timezone_names as zone
    where zone.name = new.timezone
  ) then
    raise exception 'invalid IANA timezone' using errcode = '22023';
  end if;

  return new;
end;
$$;

revoke all on function private.validate_clinic_regional_settings() from public;

create or replace function private.lock_financial_event_currency()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.event_type in ('quote.created', 'payment.recorded') then
    perform 1
    from public.clinics
    where id = new.tenant_id
    for key share;
  end if;

  return new;
end;
$$;

revoke all on function private.lock_financial_event_currency() from public;

drop trigger if exists clinic_events_financial_currency_lock
  on public.clinic_events;
create trigger clinic_events_financial_currency_lock
  before insert on public.clinic_events
  for each row
  execute function private.lock_financial_event_currency();

drop trigger if exists clinics_regional_settings_guard on public.clinics;
create trigger clinics_regional_settings_guard
  before insert or update of currency_code, locale, timezone
  on public.clinics
  for each row
  execute function private.validate_clinic_regional_settings();

create or replace function private.enforce_service_currency()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_currency text;
begin
  if new.price_minor is null then
    if new.currency_code is not null then
      raise exception 'unpriced services cannot have a currency'
        using errcode = '22023';
    end if;

    return new;
  end if;

  select currency_code
    into v_currency
    from public.clinics
    where id = new.tenant_id;

  if v_currency is null then
    raise exception 'clinic currency is required'
      using errcode = '22023';
  end if;

  if new.currency_code is distinct from v_currency then
    raise exception 'service currency must match clinic currency'
      using errcode = '22023';
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_service_currency() from public;
grant execute on function private.enforce_service_currency() to authenticated;
grant execute on function private.enforce_service_currency() to service_role;

create or replace function private.can_manage_clinic_profile(p_tenant_id uuid)
returns boolean
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if (select private.is_owner(p_tenant_id)) then
    return true;
  end if;

  if (select private.is_member(p_tenant_id)) then
    raise insufficient_privilege using message = 'clinic profile changes require owner access';
  end if;

  return false;
end;
$$;

revoke all on function private.can_manage_clinic_profile(uuid) from public;
grant execute on function private.can_manage_clinic_profile(uuid)
  to authenticated, service_role;

drop policy if exists clinics_update on public.clinics;
create policy clinics_update on public.clinics
  for update
  to authenticated
  using (
    (select private.can_manage_clinic_profile(id))
    and (select private.can_use_clinic())
  )
  with check (
    (select private.can_manage_clinic_profile(id))
    and (select private.can_use_clinic())
  );

alter table public.audit_events drop constraint if exists audit_events_type_check;

alter table public.audit_events
  add constraint audit_events_type_check
  check (event_type in (
    'clinic.created', 'clinic.profile_updated', 'auth.signup', 'auth.login',
    'auth.mfa_enrolled', 'auth.session_revoked', 'auth.idle_lock',
    'auth.outbox_discarded', 'auth.password_changed', 'member.invited',
    'member.removed', 'access.denied', 'service.created', 'service.updated',
    'service.deleted', 'booking.accepted', 'booking.declined', 'chart.appended',
    'quote.created', 'payment.recorded', 'collections.viewed'
  ));

create or replace function private.audit_clinic_regional_settings()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
begin
  if v_actor is null then
    return new;
  end if;

  insert into public.audit_events (
    tenant_id,
    actor_user_id,
    event_type,
    record_id,
    metadata
  )
  values (
    new.id,
    v_actor,
    'clinic.profile_updated',
    new.id,
    jsonb_build_object(
      'currency_from', old.currency_code,
      'currency_to', new.currency_code,
      'locale_from', old.locale,
      'locale_to', new.locale,
      'timezone_from', old.timezone,
      'timezone_to', new.timezone
    )
  );

  return new;
end;
$$;

revoke all on function private.audit_clinic_regional_settings() from public;

drop trigger if exists clinics_regional_settings_audit on public.clinics;
create trigger clinics_regional_settings_audit
  after update of currency_code, locale, timezone
  on public.clinics
  for each row
  when (
    old.currency_code is distinct from new.currency_code
    or old.locale is distinct from new.locale
    or old.timezone is distinct from new.timezone
  )
  execute function private.audit_clinic_regional_settings();

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
  v_currency text := btrim(coalesce(v_profile->>'currencyCode', ''));
  v_locale text := btrim(coalesce(v_profile->>'locale', ''));
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

  if not (select private.is_iso_4217(v_currency)) then
    raise exception 'invalid ISO 4217 currency' using errcode = '22023';
  end if;

  if v_locale = ''
     or char_length(v_locale) not between 2 and 35
     or v_locale !~ '^[A-Za-z]{2,8}(-[A-Za-z0-9]{1,8})*$' then
    raise exception 'invalid locale' using errcode = '22023';
  end if;

  if v_timezone = '' or not exists (
    select 1
    from pg_catalog.pg_timezone_names as zone
    where zone.name = v_timezone
  ) then
    raise exception 'invalid IANA timezone' using errcode = '22023';
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
    currency_code,
    locale,
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
    v_currency,
    v_locale,
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
