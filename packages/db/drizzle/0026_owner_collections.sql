-- KR-007: owner-only daily collections in the clinic's IANA timezone.

alter table public.audit_events drop constraint if exists audit_events_type_check;

alter table public.audit_events
  add constraint audit_events_type_check
  check (event_type in (
    'clinic.created', 'auth.signup', 'auth.login', 'auth.mfa_enrolled',
    'auth.session_revoked', 'auth.idle_lock', 'auth.password_changed',
    'member.invited', 'member.removed', 'access.denied', 'service.created',
    'service.updated', 'service.deleted', 'booking.accepted', 'booking.declined',
    'chart.appended', 'quote.created', 'payment.recorded', 'collections.viewed'
  ));

create index if not exists clinic_events_payment_day_idx
  on public.clinic_events (tenant_id, occurred_at)
  where event_type = 'payment.recorded';

create or replace function public.get_owner_daily_collections(
  p_tenant_id uuid,
  p_day date default null
)
returns table (
  day date,
  clinic_today date,
  timezone text,
  currency text,
  payment_count bigint,
  paid_minor bigint,
  outstanding_minor bigint,
  cash_minor bigint,
  gcash_minor bigint,
  maya_minor bigint,
  card_minor bigint,
  other_minor bigint
)
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_timezone text;
  v_currency text;
  v_today date;
  v_day date;
begin
  if v_user is null
     or not (select private.is_owner(p_tenant_id))
     or not (select private.can_use_clinic()) then
    raise exception 'collections access denied' using errcode = '42501';
  end if;

  select clinic.timezone, clinic.currency_code
    into v_timezone, v_currency
  from public.clinics as clinic
  where clinic.id = p_tenant_id;

  if v_timezone is null then
    raise exception 'collections access denied' using errcode = '42501';
  end if;

  v_today := pg_catalog.timezone(v_timezone, statement_timestamp())::date;
  v_day := coalesce(p_day, v_today);

  if v_day < date '2000-01-01' or v_day > v_today then
    raise exception 'collections day is out of range' using errcode = '22023';
  end if;

  insert into public.audit_events (
    tenant_id, actor_user_id, event_type, metadata
  )
  values (
    p_tenant_id,
    v_user,
    'collections.viewed',
    jsonb_build_object('day', v_day, 'timezone', v_timezone)
  );

  return query
  with day_events as (
    select event.id, event.payload, event.received_at
    from public.clinic_events as event
    where event.tenant_id = p_tenant_id
      and event.event_type = 'payment.recorded'
      and event.occurred_at >= (v_day::timestamp at time zone v_timezone)
      and event.occurred_at < ((v_day + 1)::timestamp at time zone v_timezone)
  ), latest_unpaid as (
    select distinct on (
      event.payload ->> 'patientId', event.payload ->> 'visitId'
    ) event.id, event.payload, event.received_at
    from day_events as event
    where event.payload ->> 'method' = 'unpaid'
    order by
      event.payload ->> 'patientId',
      event.payload ->> 'visitId',
      event.received_at desc,
      event.id desc
  ), unpaid_remaining as (
    select greatest(
      (unpaid.payload ->> 'amountMinor')::bigint
        - coalesce(sum((paid.payload ->> 'amountMinor')::bigint), 0),
      0
    )::bigint as amount_minor
    from latest_unpaid as unpaid
    left join day_events as paid
      on paid.payload ->> 'patientId' = unpaid.payload ->> 'patientId'
      and paid.payload ->> 'visitId' = unpaid.payload ->> 'visitId'
      and paid.payload ->> 'method' <> 'unpaid'
      and (paid.received_at, paid.id) > (unpaid.received_at, unpaid.id)
    group by unpaid.id, unpaid.payload, unpaid.received_at
  ), totals as (
    select
      count(event.id)::bigint as payment_count,
      coalesce(sum((event.payload ->> 'amountMinor')::bigint)
        filter (where event.payload ->> 'method' <> 'unpaid'), 0)::bigint
        as paid_minor,
      coalesce(sum((event.payload ->> 'amountMinor')::bigint)
        filter (where event.payload ->> 'method' = 'cash'), 0)::bigint
        as cash_minor,
      coalesce(sum((event.payload ->> 'amountMinor')::bigint)
        filter (where event.payload ->> 'method' = 'gcash'), 0)::bigint
        as gcash_minor,
      coalesce(sum((event.payload ->> 'amountMinor')::bigint)
        filter (where event.payload ->> 'method' = 'maya'), 0)::bigint
        as maya_minor,
      coalesce(sum((event.payload ->> 'amountMinor')::bigint)
        filter (where event.payload ->> 'method' = 'card'), 0)::bigint
        as card_minor,
      coalesce(sum((event.payload ->> 'amountMinor')::bigint)
        filter (where event.payload ->> 'method' = 'other'), 0)::bigint
        as other_minor
    from day_events as event
  ), outstanding as (
    select coalesce(sum(amount_minor), 0)::bigint as outstanding_minor
    from unpaid_remaining
  )
  select
    v_day,
    v_today,
    v_timezone,
    v_currency,
    totals.payment_count,
    totals.paid_minor,
    outstanding.outstanding_minor,
    totals.cash_minor,
    totals.gcash_minor,
    totals.maya_minor,
    totals.card_minor,
    totals.other_minor
  from totals
  cross join outstanding;
end;
$$;

revoke all on function public.get_owner_daily_collections(uuid, date)
  from public, anon, authenticated;
grant execute on function public.get_owner_daily_collections(uuid, date)
  to authenticated;

notify pgrst, 'reload schema';
