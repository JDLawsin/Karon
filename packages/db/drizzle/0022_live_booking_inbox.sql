-- KR-009: publish tenant-filtered booking changes and guard staff actions.

alter table public.audit_events drop constraint if exists audit_events_type_check;

alter table public.audit_events
  add constraint audit_events_type_check
  check (event_type in (
    'clinic.created',
    'auth.signup',
    'auth.login',
    'auth.mfa_enrolled',
    'auth.session_revoked',
    'auth.idle_lock',
    'auth.password_changed',
    'member.invited',
    'member.removed',
    'access.denied',
    'service.created',
    'service.updated',
    'service.deleted',
    'booking.accepted',
    'booking.declined'
  ));

create or replace function private.booking_request_status_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_event_type text;
  v_recent_actions integer;
begin
  if old.status is not distinct from new.status then
    return new;
  end if;

  if old.status = 'accepted'::public.booking_request_status
     and new.status = 'pending'::public.booking_request_status then
    return new;
  end if;

  if old.status <> 'pending'::public.booking_request_status
     or new.status not in (
       'accepted'::public.booking_request_status,
       'declined'::public.booking_request_status
     ) then
    raise exception 'invalid booking_request status transition'
      using errcode = '22023';
  end if;

  if v_actor is null
     or not (select private.is_member(new.tenant_id))
     or not (select private.can_use_clinic()) then
    raise exception 'booking request access denied'
      using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('booking-request-action:' || v_actor::text, 0)
  );

  select count(*)::integer
    into v_recent_actions
  from public.audit_events as events
  where events.actor_user_id = v_actor
    and events.event_type in ('booking.accepted', 'booking.declined')
    and events.created_at >= statement_timestamp() - interval '1 minute';

  if v_recent_actions >= 30 then
    raise exception 'booking request action rate limit exceeded'
      using errcode = 'P0001';
  end if;

  v_event_type := case new.status
    when 'accepted'::public.booking_request_status then 'booking.accepted'
    else 'booking.declined'
  end;

  insert into public.audit_events (
    tenant_id,
    actor_user_id,
    event_type,
    record_id,
    metadata
  )
  values (
    new.tenant_id,
    v_actor,
    v_event_type,
    new.id,
    jsonb_build_object()
  );

  new.updated_at := statement_timestamp();
  return new;
end;
$$;

revoke all on function private.booking_request_status_guard() from public;

do $$
begin
  if not exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) then
    execute 'create publication supabase_realtime';
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'booking_requests'
  ) then
    execute 'alter publication supabase_realtime add table public.booking_requests';
  end if;
end;
$$;

notify pgrst, 'reload schema';
