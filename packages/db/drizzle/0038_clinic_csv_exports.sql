-- KR-019: owner-only, audited clinic CSV exports.

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
    'import.checklist_updated', 'entitlement.trial_expired',
    'entitlement.grace_granted', 'entitlement.expired',
    'entitlement.past_due', 'entitlement.restored',
    'billing.checkout_started', 'billing.payment_succeeded',
    'billing.payment_failed', 'export.started', 'export.completed',
    'export.failed'
  ));

create index audit_events_export_rate_limit_idx
  on public.audit_events (tenant_id, actor_user_id, created_at)
  where event_type = 'export.started';

create or replace function private.validate_client_export_audit()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.event_type like 'export.%'
     and current_user in ('anon', 'authenticated')
     and (
       (select auth.uid()) is null
       or new.actor_user_id <> (select auth.uid())
       or not (select private.is_owner(new.tenant_id))
       or not (select private.can_use_clinic())
     ) then
    raise exception 'clinic export audit denied' using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function private.validate_client_export_audit() from public;

create trigger audit_events_validate_client_export
before insert on public.audit_events
for each row execute function private.validate_client_export_audit();

notify pgrst, 'reload schema';
