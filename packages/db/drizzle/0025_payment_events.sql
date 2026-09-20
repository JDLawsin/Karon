-- KR-006: strict provider-neutral payment events with metadata-only audit.

alter table public.audit_events drop constraint if exists audit_events_type_check;

alter table public.audit_events
  add constraint audit_events_type_check
  check (event_type in (
    'clinic.created', 'auth.signup', 'auth.login', 'auth.mfa_enrolled',
    'auth.session_revoked', 'auth.idle_lock', 'auth.password_changed',
    'member.invited', 'member.removed', 'access.denied', 'service.created',
    'service.updated', 'service.deleted', 'booking.accepted', 'booking.declined',
    'chart.appended', 'quote.created', 'payment.recorded'
  ));

create or replace function private.validate_payment_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_amount_minor numeric;
  v_currency text;
  v_clinic_currency text;
  v_quote_total numeric;
  v_paid_total numeric;
begin
  if new.event_type <> 'payment.recorded' then
    return new;
  end if;

  if (select auth.uid()) is not null
     and (
       new.actor_user_id <> (select auth.uid())
       or not (select private.is_member(new.tenant_id))
       or not (select private.can_use_clinic())
     ) then
    raise exception 'payment write denied' using errcode = '42501';
  end if;

  if new.record_id is null
     or jsonb_typeof(new.payload) <> 'object'
     or new.payload - array[
       'patientId', 'visitId', 'amountMinor', 'currency', 'method'
     ] <> '{}'::jsonb
     or not (new.payload ?& array[
       'patientId', 'visitId', 'amountMinor', 'currency', 'method'
     ])
     or jsonb_typeof(new.payload -> 'patientId') <> 'string'
     or jsonb_typeof(new.payload -> 'visitId') <> 'string'
     or jsonb_typeof(new.payload -> 'amountMinor') <> 'number'
     or jsonb_typeof(new.payload -> 'currency') <> 'string'
     or jsonb_typeof(new.payload -> 'method') <> 'string' then
    raise exception 'invalid payment event shape' using errcode = '22023';
  end if;

  perform (new.payload ->> 'patientId')::uuid;
  perform (new.payload ->> 'visitId')::uuid;

  v_amount_minor := (new.payload ->> 'amountMinor')::numeric;
  if v_amount_minor <> trunc(v_amount_minor)
     or v_amount_minor not between 1 and 2147483647 then
    raise exception 'payment amount must be a positive integer' using errcode = '22023';
  end if;

  if new.payload ->> 'method' not in (
    'cash', 'gcash', 'maya', 'card', 'other', 'unpaid'
  ) then
    raise exception 'invalid payment method' using errcode = '22023';
  end if;

  v_currency := new.payload ->> 'currency';
  select currency_code
    into v_clinic_currency
    from public.clinics
   where id = new.tenant_id;

  if v_currency !~ '^[A-Z]{3}$' or v_currency <> v_clinic_currency then
    raise exception 'payment currency must match clinic currency' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      new.tenant_id::text || ':' || (new.payload ->> 'visitId'),
      0
    )
  );

  if exists (
    select 1 from public.clinic_events as event where event.id = new.id
  ) then
    return new;
  end if;

  select (event.payload ->> 'totalMinor')::numeric
    into v_quote_total
    from public.clinic_events as event
   where event.tenant_id = new.tenant_id
     and event.event_type = 'quote.created'
     and event.payload ->> 'patientId' = new.payload ->> 'patientId'
     and event.payload ->> 'visitId' = new.payload ->> 'visitId'
     and event.payload ->> 'currency' = v_currency
   order by event.occurred_at desc, event.received_at desc, event.id desc
   limit 1;

  if v_quote_total is null then
    raise exception 'payment requires an accepted quote' using errcode = '22023';
  end if;

  select coalesce(sum((event.payload ->> 'amountMinor')::numeric), 0)
    into v_paid_total
    from public.clinic_events as event
   where event.tenant_id = new.tenant_id
     and event.event_type = 'payment.recorded'
     and event.payload ->> 'patientId' = new.payload ->> 'patientId'
     and event.payload ->> 'visitId' = new.payload ->> 'visitId'
     and event.payload ->> 'currency' = v_currency
     and event.payload ->> 'method' <> 'unpaid';

  if v_amount_minor > v_quote_total - v_paid_total then
    raise exception 'payment exceeds remaining balance' using errcode = '22023';
  end if;

  return new;
end;
$$;

revoke all on function private.validate_payment_event() from public;

create or replace function public.get_visit_balance(
  p_tenant_id uuid,
  p_patient_id uuid,
  p_visit_id uuid
)
returns table (
  quote_id uuid,
  quote_total_minor bigint,
  paid_minor bigint,
  remaining_minor bigint,
  currency text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null
     or not (select private.is_member(p_tenant_id))
     or not (select private.can_use_clinic()) then
    raise exception 'visit balance access denied' using errcode = '42501';
  end if;

  return query
  with latest_quote as (
    select
      event.record_id as quote_id,
      (event.payload ->> 'totalMinor')::bigint as quote_total_minor,
      event.payload ->> 'currency' as currency
    from public.clinic_events as event
    where event.tenant_id = p_tenant_id
      and event.event_type = 'quote.created'
      and event.payload ->> 'patientId' = p_patient_id::text
      and event.payload ->> 'visitId' = p_visit_id::text
    order by event.occurred_at desc, event.received_at desc, event.id desc
    limit 1
  ), paid as (
    select coalesce(sum((event.payload ->> 'amountMinor')::bigint), 0)::bigint as paid_minor
    from public.clinic_events as event
    cross join latest_quote as quote
    where event.tenant_id = p_tenant_id
      and event.event_type = 'payment.recorded'
      and event.payload ->> 'patientId' = p_patient_id::text
      and event.payload ->> 'visitId' = p_visit_id::text
      and event.payload ->> 'currency' = quote.currency
      and event.payload ->> 'method' <> 'unpaid'
  )
  select
    quote.quote_id,
    quote.quote_total_minor,
    paid.paid_minor,
    greatest(quote.quote_total_minor - paid.paid_minor, 0)::bigint,
    quote.currency
  from latest_quote as quote
  cross join paid;
end;
$$;

revoke all on function public.get_visit_balance(uuid, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.get_visit_balance(uuid, uuid, uuid)
  to authenticated;

create or replace function private.audit_payment_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.event_type <> 'payment.recorded' then
    return new;
  end if;

  insert into public.audit_events (
    tenant_id, actor_user_id, event_type, record_id, metadata
  )
  values (
    new.tenant_id,
    new.actor_user_id,
    'payment.recorded',
    new.record_id,
    jsonb_build_object(
      'patient_id', new.payload ->> 'patientId',
      'visit_id', new.payload ->> 'visitId',
      'method', new.payload ->> 'method',
      'currency', new.payload ->> 'currency'
    )
  );

  return new;
end;
$$;

revoke all on function private.audit_payment_event() from public;

drop trigger if exists clinic_events_validate_payment on public.clinic_events;
create trigger clinic_events_validate_payment
before insert on public.clinic_events
for each row execute function private.validate_payment_event();

drop trigger if exists clinic_events_audit_payment on public.clinic_events;
create trigger clinic_events_audit_payment
after insert on public.clinic_events
for each row execute function private.audit_payment_event();

notify pgrst, 'reload schema';
