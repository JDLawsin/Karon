-- Owner-selected Google Calendar booking pages (pasted appointment-schedule URLs).

alter table public.google_calendar_connections
  add column if not exists booking_pages jsonb not null default '[]'::jsonb;

grant select (booking_pages)
  on public.google_calendar_connections to authenticated;

notify pgrst, 'reload schema';
