-- KR-004: strict adult-FDI chart events with note-safe audit metadata.

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
    'booking.declined',
    'chart.appended'
  ));

create or replace function private.validate_and_audit_chart_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_finding jsonb;
  v_kind text;
  v_code text;
  v_note text;
begin
  if new.event_type <> 'chart.appended' then
    return new;
  end if;

  if new.record_id is null
     or jsonb_typeof(new.payload) <> 'object'
     or new.payload - array['patientId', 'visitId', 'toothCode', 'finding', 'note'] <> '{}'::jsonb
     or not (new.payload ?& array['patientId', 'visitId', 'toothCode', 'finding', 'note'])
     or jsonb_typeof(new.payload -> 'patientId') <> 'string'
     or jsonb_typeof(new.payload -> 'visitId') <> 'string'
     or jsonb_typeof(new.payload -> 'toothCode') <> 'string'
     or jsonb_typeof(new.payload -> 'note') <> 'string' then
    raise exception 'invalid chart event shape' using errcode = '22023';
  end if;

  perform (new.payload ->> 'patientId')::uuid;
  perform (new.payload ->> 'visitId')::uuid;

  if (new.payload ->> 'toothCode') not in (
    '18', '17', '16', '15', '14', '13', '12', '11',
    '21', '22', '23', '24', '25', '26', '27', '28',
    '48', '47', '46', '45', '44', '43', '42', '41',
    '31', '32', '33', '34', '35', '36', '37', '38'
  ) then
    raise exception 'invalid adult FDI tooth code' using errcode = '22023';
  end if;

  v_finding := new.payload -> 'finding';
  if jsonb_typeof(v_finding) <> 'object'
     or v_finding - array['kind', 'code'] <> '{}'::jsonb
     or not (v_finding ?& array['kind', 'code'])
     or jsonb_typeof(v_finding -> 'kind') <> 'string'
     or jsonb_typeof(v_finding -> 'code') <> 'string' then
    raise exception 'invalid chart finding shape' using errcode = '22023';
  end if;

  v_kind := v_finding ->> 'kind';
  v_code := v_finding ->> 'code';
  if not (
    (v_kind = 'condition' and v_code in ('caries', 'missing', 'impacted'))
    or
    (v_kind = 'procedure' and v_code in (
      'filling', 'crown', 'extraction', 'root_canal', 'implant'
    ))
  ) then
    raise exception 'invalid chart finding code' using errcode = '22023';
  end if;

  v_note := btrim(new.payload ->> 'note');
  if v_note is null
     or char_length(v_note) not between 1 and 500
     or char_length(new.payload ->> 'note') > 500 then
    raise exception 'invalid chart note' using errcode = '22023';
  end if;

  insert into public.audit_events (
    tenant_id,
    actor_user_id,
    event_type,
    record_id,
    metadata
  )
  values (
    new.tenant_id,
    new.actor_user_id,
    'chart.appended',
    new.record_id,
    jsonb_build_object(
      'patient_id', new.payload ->> 'patientId',
      'visit_id', new.payload ->> 'visitId',
      'note_length', char_length(v_note)
    )
  );

  return new;
end;
$$;

revoke all on function private.validate_and_audit_chart_event() from public;

drop trigger if exists clinic_events_validate_chart on public.clinic_events;
create trigger clinic_events_validate_chart
before insert on public.clinic_events
for each row execute function private.validate_and_audit_chart_event();

notify pgrst, 'reload schema';
