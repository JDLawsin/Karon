-- KR-033: owner-controlled booking-page indexing with database completeness guards.

alter table public.clinics
  add column booking_page_indexable boolean not null default false;

alter table public.audit_events drop constraint if exists audit_events_type_check;

alter table public.audit_events
  add constraint audit_events_type_check
  check (event_type in (
    'clinic.created', 'clinic.profile_updated', 'auth.signup', 'auth.login',
    'auth.mfa_enrolled', 'auth.session_revoked', 'auth.idle_lock',
    'auth.outbox_discarded', 'auth.password_changed', 'member.invited',
    'member.removed', 'access.denied', 'service.created', 'service.updated',
    'service.deleted', 'booking.accepted', 'booking.declined',
    'booking.indexing_changed', 'patient.created', 'patient.updated',
    'appointment.set', 'chart.appended', 'quote.created', 'payment.recorded',
    'opening_balance.noted', 'collections.viewed', 'import.started',
    'import.completed', 'import.failed', 'import.checklist_updated',
    'entitlement.trial_expired', 'entitlement.grace_granted',
    'entitlement.expired', 'entitlement.past_due', 'entitlement.restored',
    'billing.checkout_started', 'billing.payment_succeeded',
    'billing.payment_failed', 'export.started', 'export.completed',
    'export.failed'
  ));

create or replace function private.booking_page_profile_complete(
  p_tenant_id uuid,
  p_name text,
  p_phone text,
  p_address jsonb,
  p_hours jsonb
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    nullif(btrim(p_name), '') is not null
    and nullif(btrim(p_phone), '') is not null
    and jsonb_typeof(p_address) = 'object'
    and nullif(btrim(p_address ->> 'city'), '') is not null
    and jsonb_typeof(p_hours) = 'object'
    and case
      when jsonb_typeof(p_hours -> 'days') = 'array'
        then jsonb_array_length(p_hours -> 'days') > 0
      else false
    end
    and case
      when (p_hours ->> 'open') ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
       and (p_hours ->> 'close') ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
        then (
          substring(p_hours ->> 'close', 1, 2)::integer * 60
          + substring(p_hours ->> 'close', 4, 2)::integer
          - substring(p_hours ->> 'open', 1, 2)::integer * 60
          - substring(p_hours ->> 'open', 4, 2)::integer
        ) >= 30
      else false
    end
    and exists (
      select 1
      from public.clinic_services as services
      where services.tenant_id = p_tenant_id
    );
$$;

revoke all on function private.booking_page_profile_complete(
  uuid, text, text, jsonb, jsonb
) from public, anon, authenticated;

create or replace function private.guard_booking_page_indexing()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.booking_page_indexable
     and not private.booking_page_profile_complete(
       new.id, new.name, new.phone, new.address, new.hours
     ) then
    if not old.booking_page_indexable then
      raise exception 'booking page profile is incomplete' using errcode = '22023';
    end if;

    new.booking_page_indexable := false;
  end if;

  return new;
end;
$$;

revoke all on function private.guard_booking_page_indexing() from public;

create trigger clinics_booking_page_indexing_guard
before update of booking_page_indexable, name, phone, address, hours
on public.clinics
for each row execute function private.guard_booking_page_indexing();

create or replace function private.disable_incomplete_booking_page()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.clinics as clinics
  set booking_page_indexable = false,
      updated_at = now()
  where clinics.id = old.tenant_id
    and clinics.booking_page_indexable
    and not private.booking_page_profile_complete(
      clinics.id, clinics.name, clinics.phone, clinics.address, clinics.hours
    );

  return old;
end;
$$;

revoke all on function private.disable_incomplete_booking_page() from public;

create trigger clinic_services_disable_incomplete_booking_page
after delete on public.clinic_services
for each row execute function private.disable_incomplete_booking_page();

create or replace function private.audit_booking_page_indexing()
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
    tenant_id, actor_user_id, event_type, record_id, metadata
  ) values (
    new.id,
    v_actor,
    'booking.indexing_changed',
    new.id,
    jsonb_build_object('indexable', new.booking_page_indexable)
  );

  return new;
end;
$$;

revoke all on function private.audit_booking_page_indexing() from public;

create trigger clinics_booking_page_indexing_audit
after update of booking_page_indexable on public.clinics
for each row
when (old.booking_page_indexable is distinct from new.booking_page_indexable)
execute function private.audit_booking_page_indexing();

notify pgrst, 'reload schema';
