-- Native booking links (one per owner) and customer booking requests.

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'booking_request_status'
  ) then
    create type public.booking_request_status as enum (
      'pending',
      'accepted',
      'declined'
    );
  end if;
end;
$$;

create table if not exists public.booking_links (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.clinics (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  slug text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint booking_links_slug_format check (slug ~ '^[A-Za-z0-9_-]{8,32}$')
);

create unique index if not exists booking_links_slug_idx
  on public.booking_links (slug);

create unique index if not exists booking_links_tenant_user_idx
  on public.booking_links (tenant_id, user_id);

create table if not exists public.booking_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.clinics (id) on delete cascade,
  link_id uuid not null references public.booking_links (id) on delete cascade,
  name text not null,
  mobile text not null,
  service_id text not null,
  service_name text not null,
  note text,
  starts_at timestamptz not null,
  status public.booking_request_status not null default 'pending',
  visit_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint booking_requests_name_length
    check (char_length(btrim(name)) between 1 and 80),
  constraint booking_requests_mobile_length
    check (char_length(btrim(mobile)) between 1 and 20),
  constraint booking_requests_note_length
    check (note is null or char_length(note) <= 500)
);

create unique index if not exists booking_requests_link_slot_idx
  on public.booking_requests (link_id, starts_at)
  where status in ('pending', 'accepted');

create index if not exists booking_requests_tenant_status_idx
  on public.booking_requests (tenant_id, status);

alter table public.booking_links enable row level security;
alter table public.booking_links force row level security;
alter table public.booking_requests enable row level security;
alter table public.booking_requests force row level security;

revoke all on table public.booking_links from public, anon, authenticated;
revoke all on table public.booking_requests from public, anon, authenticated;

grant select, insert on table public.booking_links to authenticated;
grant select, update on table public.booking_requests to authenticated;
grant select, insert, update, delete on table public.booking_links to service_role;
grant select, insert, update, delete on table public.booking_requests to service_role;

drop policy if exists booking_links_select on public.booking_links;
drop policy if exists booking_links_insert on public.booking_links;
drop policy if exists booking_requests_select on public.booking_requests;
drop policy if exists booking_requests_update on public.booking_requests;

create policy booking_links_select on public.booking_links
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    and (select private.is_owner(tenant_id))
    and (select private.can_use_clinic())
  );

create policy booking_links_insert on public.booking_links
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and (select private.is_owner(tenant_id))
    and (select private.can_use_clinic())
  );

create policy booking_requests_select on public.booking_requests
  for select
  to authenticated
  using (
    (select private.is_member(tenant_id))
    and (select private.can_use_clinic())
  );

create policy booking_requests_update on public.booking_requests
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

notify pgrst, 'reload schema';
