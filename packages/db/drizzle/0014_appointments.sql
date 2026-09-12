-- Appointment pipeline settings, Google Calendar sync, cancel-mail send ledger.

alter table public.clinics
  add column if not exists auto_confirm_bookings boolean not null default true;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'calendar_import_status'
  ) then
    create type public.calendar_import_status as enum (
      'unmatched',
      'matched',
      'cancelled_on_google',
      'cancel_pending'
    );
  end if;
end;
$$;

create table if not exists public.google_calendar_connections (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.clinics (id) on delete cascade,
  encrypted_refresh_token text not null,
  calendar_id text not null default 'primary',
  sync_token text,
  connected_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists google_calendar_connections_tenant_idx
  on public.google_calendar_connections (tenant_id);

alter table public.google_calendar_connections enable row level security;
alter table public.google_calendar_connections force row level security;

revoke all on table public.google_calendar_connections from public, anon, authenticated;
grant select (id, tenant_id, calendar_id, connected_by, created_at, updated_at)
  on public.google_calendar_connections to authenticated;
grant delete on public.google_calendar_connections to authenticated;
grant select, insert, update, delete on public.google_calendar_connections to service_role;

create policy google_calendar_connections_select on public.google_calendar_connections
  for select
  to authenticated
  using (
    (select private.is_owner(tenant_id))
    and (select private.can_use_clinic())
  );

create policy google_calendar_connections_delete on public.google_calendar_connections
  for delete
  to authenticated
  using (
    (select private.is_owner(tenant_id))
    and (select private.can_use_clinic())
  );

create table if not exists public.calendar_imports (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.clinics (id) on delete cascade,
  google_event_id text not null,
  attendee_name text not null,
  attendee_email text,
  starts_at timestamptz not null,
  description text,
  status public.calendar_import_status not null default 'unmatched',
  visit_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists calendar_imports_tenant_event_idx
  on public.calendar_imports (tenant_id, google_event_id);

create index if not exists calendar_imports_tenant_status_idx
  on public.calendar_imports (tenant_id, status);

alter table public.calendar_imports enable row level security;
alter table public.calendar_imports force row level security;

revoke all on table public.calendar_imports from public, anon, authenticated;
grant select, update on public.calendar_imports to authenticated;
grant select, insert, update, delete on public.calendar_imports to service_role;

create policy calendar_imports_select on public.calendar_imports
  for select
  to authenticated
  using (
    (select private.is_member(tenant_id))
    and (select private.can_use_clinic())
  );

create policy calendar_imports_update on public.calendar_imports
  for update
  to authenticated
  using (
    (select private.is_member(tenant_id))
    and (select private.can_use_clinic())
  )
  with check (
    (select private.is_member(tenant_id))
    and (select private.can_use_clinic())
  );

create table if not exists public.reminder_sends (
  event_id uuid primary key references public.clinic_events (id) on delete cascade,
  sent_at timestamptz not null default now()
);

alter table public.reminder_sends enable row level security;
alter table public.reminder_sends force row level security;

revoke all on table public.reminder_sends from public, anon, authenticated;
grant select, insert, update, delete on public.reminder_sends to service_role;

notify pgrst, 'reload schema';
