-- Append-only clinical events for Dexie outbox drain (F-02, NFR-06).

create table if not exists public.clinic_events (
  id uuid primary key,
  tenant_id uuid not null references public.clinics (id) on delete cascade,
  actor_user_id uuid not null,
  event_type text not null,
  record_id uuid,
  payload jsonb not null,
  occurred_at timestamptz not null,
  received_at timestamptz not null default now(),
  constraint clinic_events_type_check check (
    event_type in (
      'patient.created',
      'patient.updated',
      'chart.appended',
      'quote.created',
      'payment.recorded',
      'appointment.set',
      'visit.status_changed',
      'reminder.queued'
    )
  )
);

alter table public.clinic_events enable row level security;
alter table public.clinic_events force row level security;

create index if not exists clinic_events_tenant_received_idx
  on public.clinic_events (tenant_id, received_at, id);

revoke all on table public.clinic_events from public, anon, authenticated;
grant select, insert on table public.clinic_events to authenticated;
grant select, insert, update, delete on table public.clinic_events to service_role;
revoke truncate, references, trigger on table public.clinic_events
  from public, anon, authenticated;

create policy clinic_events_select on public.clinic_events
  for select
  to authenticated
  using (
    (select private.is_member(tenant_id))
    and (select private.can_use_clinic())
  );

create policy clinic_events_insert on public.clinic_events
  for insert
  to authenticated
  with check (
    actor_user_id = (select auth.uid())
    and (select private.is_member(tenant_id))
    and (select private.can_use_clinic())
  );

notify pgrst, 'reload schema';
