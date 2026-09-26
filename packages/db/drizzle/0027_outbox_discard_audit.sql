-- KR-010: audit explicit destructive discard of protected offline work.

alter table public.audit_events drop constraint if exists audit_events_type_check;

alter table public.audit_events
  add constraint audit_events_type_check
  check (event_type in (
    'clinic.created', 'auth.signup', 'auth.login', 'auth.mfa_enrolled',
    'auth.session_revoked', 'auth.idle_lock', 'auth.outbox_discarded',
    'auth.password_changed', 'member.invited', 'member.removed', 'access.denied',
    'service.created', 'service.updated', 'service.deleted', 'booking.accepted',
    'booking.declined', 'chart.appended', 'quote.created', 'payment.recorded',
    'collections.viewed'
  ));

notify pgrst, 'reload schema';
