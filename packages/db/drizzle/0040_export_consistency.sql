-- KR-019 follow-up: serialize rate reservations and keyset-page a fixed snapshot.

drop index if exists public.clinic_events_appointment_export_idx;

create index clinic_events_appointment_export_idx
  on public.clinic_events (tenant_id, id)
  where event_type = 'appointment.set';

create index clinic_events_payment_export_idx
  on public.clinic_events (tenant_id, id)
  where event_type = 'payment.recorded';

create or replace function public.reserve_clinic_export(
  p_tenant_id uuid,
  p_actor_user_id uuid,
  p_kind text,
  p_row_count integer
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_recent_count integer;
begin
  if (select auth.uid()) is distinct from p_actor_user_id then
    raise exception 'clinic export actor denied' using errcode = '42501';
  end if;

  if p_kind not in ('patients', 'appointments', 'payments')
     or p_row_count < 0 then
    raise exception 'invalid clinic export reservation' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_tenant_id::text || ':' || p_actor_user_id::text, 0)
  );

  select count(*)
  into v_recent_count
  from public.audit_events
  where tenant_id = p_tenant_id
    and actor_user_id = p_actor_user_id
    and event_type = 'export.started'
    and created_at >= pg_catalog.now() - interval '1 hour';

  if v_recent_count >= 10 then
    return false;
  end if;

  insert into public.audit_events (
    tenant_id,
    actor_user_id,
    event_type,
    metadata
  ) values (
    p_tenant_id,
    p_actor_user_id,
    'export.started',
    pg_catalog.jsonb_build_object(
      'kind', p_kind,
      'filter', 'all',
      'row_count', p_row_count
    )
  );

  return true;
end;
$$;

revoke all on function public.reserve_clinic_export(uuid, uuid, text, integer)
  from public, anon, authenticated;
grant execute on function public.reserve_clinic_export(uuid, uuid, text, integer)
  to authenticated;

notify pgrst, 'reload schema';
