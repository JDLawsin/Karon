-- KR-015: owner-only, append-only opening balance notes. These are not payments or AR.

alter table public.patient_import_jobs
  add column include_opening_balances boolean not null default false;

alter table public.patient_import_jobs
  alter column mapping set default '{"name":null,"mobile":null,"email":null,"openingBalanceAmount":null,"openingBalanceNote":null}'::jsonb;

alter table public.clinic_events drop constraint if exists clinic_events_type_check;
alter table public.clinic_events
  add constraint clinic_events_type_check
  check (event_type in (
    'patient.created', 'patient.updated', 'chart.appended', 'quote.created',
    'payment.recorded', 'opening_balance.noted', 'appointment.set',
    'visit.status_changed', 'reminder.queued'
  ));

alter table public.audit_events drop constraint if exists audit_events_type_check;
alter table public.audit_events
  add constraint audit_events_type_check
  check (event_type in (
    'clinic.created', 'clinic.profile_updated', 'auth.signup', 'auth.login',
    'auth.mfa_enrolled', 'auth.session_revoked', 'auth.idle_lock',
    'auth.outbox_discarded', 'auth.password_changed', 'member.invited',
    'member.removed', 'access.denied', 'service.created', 'service.updated',
    'service.deleted', 'booking.accepted', 'booking.declined', 'chart.appended',
    'quote.created', 'payment.recorded', 'opening_balance.noted',
    'collections.viewed', 'import.started', 'import.completed', 'import.failed',
    'import.checklist_updated'
  ));

create or replace function private.validate_opening_balance_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_amount_minor numeric;
  v_currency text;
  v_clinic_currency text;
begin
  if new.event_type <> 'opening_balance.noted' then
    return new;
  end if;

  if (select auth.uid()) is not null
     and (
       new.actor_user_id <> (select auth.uid())
       or not (select private.is_owner(new.tenant_id))
       or not (select private.can_use_clinic())
     ) then
    raise exception 'opening balance write denied' using errcode = '42501';
  end if;

  if new.record_id is null
     or jsonb_typeof(new.payload) <> 'object'
     or new.payload - array['patientId', 'amountMinor', 'currency', 'note'] <> '{}'::jsonb
     or not (new.payload ?& array['patientId', 'amountMinor', 'currency', 'note'])
     or jsonb_typeof(new.payload -> 'patientId') <> 'string'
     or jsonb_typeof(new.payload -> 'amountMinor') <> 'number'
     or jsonb_typeof(new.payload -> 'currency') <> 'string'
     or jsonb_typeof(new.payload -> 'note') <> 'string' then
    raise exception 'invalid opening balance event shape' using errcode = '22023';
  end if;

  if (new.payload ->> 'patientId')::uuid <> new.record_id then
    raise exception 'opening balance patient does not match record' using errcode = '22023';
  end if;

  v_amount_minor := (new.payload ->> 'amountMinor')::numeric;
  if v_amount_minor <> trunc(v_amount_minor)
     or v_amount_minor not between 1 and 2147483647 then
    raise exception 'opening balance must be a positive integer' using errcode = '22023';
  end if;

  if char_length(btrim(new.payload ->> 'note')) not between 1 and 500 then
    raise exception 'opening balance note is invalid' using errcode = '22023';
  end if;

  v_currency := new.payload ->> 'currency';
  select currency_code into v_clinic_currency
    from public.clinics
   where id = new.tenant_id;

  if v_currency !~ '^[A-Z]{3}$' or v_currency <> v_clinic_currency then
    raise exception 'opening balance currency must match clinic currency' using errcode = '22023';
  end if;

  if not exists (
    select 1
      from public.patients
     where tenant_id = new.tenant_id
       and id = new.record_id
  ) then
    raise exception 'opening balance patient not found' using errcode = '22023';
  end if;

  return new;
end;
$$;

revoke all on function private.validate_opening_balance_event() from public;

create or replace function private.audit_opening_balance_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.event_type <> 'opening_balance.noted' then
    return new;
  end if;

  insert into public.audit_events (
    tenant_id, actor_user_id, event_type, record_id, metadata
  )
  values (
    new.tenant_id,
    new.actor_user_id,
    'opening_balance.noted',
    new.record_id,
    jsonb_build_object(
      'patient_id', new.payload ->> 'patientId',
      'currency', new.payload ->> 'currency'
    )
  );

  return new;
end;
$$;

revoke all on function private.audit_opening_balance_event() from public;

create trigger clinic_events_validate_opening_balance
before insert on public.clinic_events
for each row execute function private.validate_opening_balance_event();

create trigger clinic_events_audit_opening_balance
after insert on public.clinic_events
for each row execute function private.audit_opening_balance_event();

notify pgrst, 'reload schema';
