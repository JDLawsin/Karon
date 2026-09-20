-- KR-005: strict clinic-currency quotes with totals integrity and metadata-only audit.

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
    'service.deleted',
    'booking.accepted',
    'booking.declined',
    'chart.appended',
    'quote.created'
  ));

create or replace function private.validate_quote_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_currency text;
  v_clinic_currency text;
  v_line jsonb;
  v_line_count integer;
  v_qty numeric;
  v_amount_minor numeric;
  v_expected_total numeric := 0;
  v_total_minor numeric;
begin
  if new.event_type <> 'quote.created' then
    return new;
  end if;

  if new.record_id is null
     or jsonb_typeof(new.payload) <> 'object'
     or new.payload - array[
       'patientId', 'visitId', 'status', 'lines', 'totalMinor', 'currency'
     ] <> '{}'::jsonb
     or not (new.payload ?& array[
       'patientId', 'visitId', 'status', 'lines', 'totalMinor', 'currency'
     ])
     or jsonb_typeof(new.payload -> 'patientId') <> 'string'
     or jsonb_typeof(new.payload -> 'visitId') <> 'string'
     or jsonb_typeof(new.payload -> 'status') <> 'string'
     or new.payload ->> 'status' <> 'accepted'
     or jsonb_typeof(new.payload -> 'lines') <> 'array'
     or jsonb_typeof(new.payload -> 'totalMinor') <> 'number'
     or jsonb_typeof(new.payload -> 'currency') <> 'string' then
    raise exception 'invalid quote event shape' using errcode = '22023';
  end if;

  perform (new.payload ->> 'patientId')::uuid;
  perform (new.payload ->> 'visitId')::uuid;

  v_currency := new.payload ->> 'currency';
  select currency_code
    into v_clinic_currency
    from public.clinics
   where id = new.tenant_id;

  if v_currency !~ '^[A-Z]{3}$' or v_currency <> v_clinic_currency then
    raise exception 'quote currency must match clinic currency' using errcode = '22023';
  end if;

  v_line_count := jsonb_array_length(new.payload -> 'lines');
  if v_line_count not between 1 and 50 then
    raise exception 'quote must contain between 1 and 50 lines' using errcode = '22023';
  end if;

  for v_line in select value from jsonb_array_elements(new.payload -> 'lines') loop
    if jsonb_typeof(v_line) <> 'object'
       or v_line - array[
         'serviceId', 'serviceName', 'qty', 'amountMinor', 'currency'
       ] <> '{}'::jsonb
       or not (v_line ?& array[
         'serviceId', 'serviceName', 'qty', 'amountMinor', 'currency'
       ])
       or jsonb_typeof(v_line -> 'serviceId') <> 'string'
       or jsonb_typeof(v_line -> 'serviceName') <> 'string'
       or jsonb_typeof(v_line -> 'qty') <> 'number'
       or jsonb_typeof(v_line -> 'amountMinor') <> 'number'
       or jsonb_typeof(v_line -> 'currency') <> 'string' then
      raise exception 'invalid quote line shape' using errcode = '22023';
    end if;

    perform (v_line ->> 'serviceId')::uuid;

    if char_length(btrim(v_line ->> 'serviceName')) not between 1 and 80
       or v_line ->> 'currency' <> v_currency then
      raise exception 'invalid quote line value' using errcode = '22023';
    end if;

    if not exists (
      select 1
       from public.clinic_services
       where id = (v_line ->> 'serviceId')::uuid
         and tenant_id = new.tenant_id
         and name = btrim(v_line ->> 'serviceName')
    ) then
      raise exception 'quote service does not belong to clinic' using errcode = '22023';
    end if;

    v_qty := (v_line ->> 'qty')::numeric;
    v_amount_minor := (v_line ->> 'amountMinor')::numeric;

    if v_qty <> trunc(v_qty)
       or v_qty not between 1 and 99
       or v_amount_minor <> trunc(v_amount_minor)
       or v_amount_minor not between 0 and 2147483647 then
      raise exception 'invalid quote quantity or amount' using errcode = '22023';
    end if;

    v_expected_total := v_expected_total + (v_qty * v_amount_minor);
  end loop;

  v_total_minor := (new.payload ->> 'totalMinor')::numeric;
  if v_total_minor <> trunc(v_total_minor)
     or v_total_minor not between 0 and 2147483647
     or v_total_minor <> v_expected_total then
    raise exception 'quote total does not match lines' using errcode = '22023';
  end if;

  return new;
end;
$$;

revoke all on function private.validate_quote_event() from public;

create or replace function private.audit_quote_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.event_type <> 'quote.created' then
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
    new.tenant_id,
    new.actor_user_id,
    'quote.created',
    new.record_id,
    jsonb_build_object(
      'patient_id', new.payload ->> 'patientId',
      'visit_id', new.payload ->> 'visitId',
      'line_count', jsonb_array_length(new.payload -> 'lines'),
      'currency', new.payload ->> 'currency'
    )
  );

  return new;
end;
$$;

revoke all on function private.audit_quote_event() from public;

drop trigger if exists clinic_events_validate_quote on public.clinic_events;
create trigger clinic_events_validate_quote
before insert on public.clinic_events
for each row execute function private.validate_quote_event();

drop trigger if exists clinic_events_audit_quote on public.clinic_events;
create trigger clinic_events_audit_quote
after insert on public.clinic_events
for each row execute function private.audit_quote_event();

notify pgrst, 'reload schema';
