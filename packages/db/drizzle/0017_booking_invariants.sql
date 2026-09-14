-- Tenant slot uniqueness, idempotency keys, and booking_request status transitions.

alter table public.booking_requests
  add column if not exists idempotency_key text;

drop index if exists public.booking_requests_link_slot_idx;

create unique index if not exists booking_requests_tenant_slot_idx
  on public.booking_requests (tenant_id, starts_at)
  where status in ('pending', 'accepted');

create unique index if not exists booking_requests_tenant_idempotency_idx
  on public.booking_requests (tenant_id, idempotency_key)
  where idempotency_key is not null;

create or replace function private.booking_request_status_guard()
returns trigger
language plpgsql
set search_path = private, public
as $$
begin
  if old.status is not distinct from new.status then
    return new;
  end if;

  if old.status = 'pending'::public.booking_request_status
     and new.status in (
       'accepted'::public.booking_request_status,
       'declined'::public.booking_request_status
     ) then
    return new;
  end if;

  if old.status = 'accepted'::public.booking_request_status
     and new.status = 'pending'::public.booking_request_status then
    return new;
  end if;

  raise exception 'invalid booking_request status transition'
    using errcode = '22023';
end;
$$;

revoke all on function private.booking_request_status_guard() from public;

drop trigger if exists booking_requests_status_guard on public.booking_requests;

create trigger booking_requests_status_guard
  before update of status on public.booking_requests
  for each row
  execute function private.booking_request_status_guard();

notify pgrst, 'reload schema';
