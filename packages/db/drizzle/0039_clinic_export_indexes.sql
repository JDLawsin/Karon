-- KR-019: keep paged appointment exports predictable as event history grows.

create index clinic_events_appointment_export_idx
  on public.clinic_events (tenant_id, occurred_at, received_at, id)
  where event_type = 'appointment.set';

create index clinic_events_visit_status_export_idx
  on public.clinic_events (tenant_id, record_id, occurred_at, received_at, id)
  where event_type = 'visit.status_changed';
