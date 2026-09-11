-- F-11 / NFR-10: assistants collect (insert) but cannot SELECT payment.recorded
-- to reconstruct owner daily totals. Chair event types stay member-readable.

drop policy if exists clinic_events_select on public.clinic_events;

create policy clinic_events_select on public.clinic_events
  for select
  to authenticated
  using (
    (select private.is_member(tenant_id))
    and (select private.can_use_clinic())
    and (
      event_type <> 'payment.recorded'
      or (select private.is_owner(tenant_id))
    )
  );

notify pgrst, 'reload schema';
