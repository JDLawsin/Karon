-- KR-003: tenant-scoped patient projection derived only from clinic_events.

create table if not exists public.patients (
  id uuid not null,
  tenant_id uuid not null references public.clinics (id) on delete cascade,
  name text not null,
  mobile text not null,
  mobile_digits text not null,
  email text,
  source_event_id uuid not null,
  source_occurred_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, id),
  constraint patients_name_length check (char_length(btrim(name)) between 1 and 120),
  constraint patients_mobile_length check (char_length(btrim(mobile)) between 1 and 20),
  constraint patients_mobile_digits_length check (char_length(mobile_digits) between 7 and 15),
  constraint patients_email_length check (email is null or char_length(email) <= 254)
);

create index if not exists patients_tenant_name_idx
  on public.patients (tenant_id, lower(name));

create index if not exists patients_tenant_mobile_digits_idx
  on public.patients (tenant_id, mobile_digits);

alter table public.patients enable row level security;
alter table public.patients force row level security;

revoke all on table public.patients from public, anon, authenticated;
grant select on table public.patients to authenticated;
grant select, insert, update, delete on table public.patients to service_role;

create policy patients_select on public.patients
  for select
  to authenticated
  using (
    (select private.is_member(tenant_id))
    and (select private.can_use_clinic())
  );

create or replace function private.project_patient_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
  v_mobile text;
  v_mobile_digits text;
  v_email text;
begin
  if new.event_type not in ('patient.created', 'patient.updated') then
    return new;
  end if;

  if new.record_id is null then
    raise exception 'patient event requires record_id';
  end if;

  v_name := btrim(new.payload ->> 'name');
  v_mobile := btrim(new.payload ->> 'mobile');
  v_mobile_digits := regexp_replace(v_mobile, '[^0-9]', '', 'g');
  if v_mobile_digits like '0063%' and char_length(v_mobile_digits) = 14 then
    v_mobile_digits := '0' || substring(v_mobile_digits from 5);
  elsif v_mobile_digits like '63%' and char_length(v_mobile_digits) = 12 then
    v_mobile_digits := '0' || substring(v_mobile_digits from 3);
  end if;
  v_email := nullif(btrim(new.payload ->> 'email'), '');

  if v_name is null or char_length(v_name) not between 1 and 120 then
    raise exception 'patient event has invalid name';
  end if;

  if v_mobile is null
    or char_length(v_mobile) not between 1 and 20
    or char_length(v_mobile_digits) not between 7 and 15 then
    raise exception 'patient event has invalid mobile';
  end if;

  if v_email is not null and char_length(v_email) > 254 then
    raise exception 'patient event has invalid email';
  end if;

  insert into public.patients (
    id,
    tenant_id,
    name,
    mobile,
    mobile_digits,
    email,
    source_event_id,
    source_occurred_at
  )
  values (
    new.record_id,
    new.tenant_id,
    v_name,
    v_mobile,
    v_mobile_digits,
    v_email,
    new.id,
    new.occurred_at
  )
  on conflict (tenant_id, id) do update
  set
    name = excluded.name,
    mobile = excluded.mobile,
    mobile_digits = excluded.mobile_digits,
    email = excluded.email,
    source_event_id = excluded.source_event_id,
    source_occurred_at = excluded.source_occurred_at,
    updated_at = now()
  where (public.patients.source_occurred_at, public.patients.source_event_id)
    < (excluded.source_occurred_at, excluded.source_event_id);

  return new;
end;
$$;

revoke all on function private.project_patient_event() from public;

drop trigger if exists clinic_events_project_patient on public.clinic_events;
create trigger clinic_events_project_patient
after insert on public.clinic_events
for each row execute function private.project_patient_event();

insert into public.patients (
  id,
  tenant_id,
  name,
  mobile,
  mobile_digits,
  email,
  source_event_id,
  source_occurred_at,
  created_at,
  updated_at
)
select distinct on (event.tenant_id, event.record_id)
  event.record_id,
  event.tenant_id,
  btrim(event.payload ->> 'name'),
  btrim(event.payload ->> 'mobile'),
  case
    when regexp_replace(event.payload ->> 'mobile', '[^0-9]', '', 'g') like '0063%'
      and char_length(regexp_replace(event.payload ->> 'mobile', '[^0-9]', '', 'g')) = 14
      then '0' || substring(regexp_replace(event.payload ->> 'mobile', '[^0-9]', '', 'g') from 5)
    when regexp_replace(event.payload ->> 'mobile', '[^0-9]', '', 'g') like '63%'
      and char_length(regexp_replace(event.payload ->> 'mobile', '[^0-9]', '', 'g')) = 12
      then '0' || substring(regexp_replace(event.payload ->> 'mobile', '[^0-9]', '', 'g') from 3)
    else regexp_replace(event.payload ->> 'mobile', '[^0-9]', '', 'g')
  end,
  nullif(btrim(event.payload ->> 'email'), ''),
  event.id,
  event.occurred_at,
  event.received_at,
  event.received_at
from public.clinic_events as event
where event.event_type in ('patient.created', 'patient.updated')
  and event.record_id is not null
  and char_length(btrim(event.payload ->> 'name')) between 1 and 120
  and char_length(btrim(event.payload ->> 'mobile')) between 1 and 20
  and char_length(regexp_replace(event.payload ->> 'mobile', '[^0-9]', '', 'g')) between 7 and 15
  and (
    nullif(btrim(event.payload ->> 'email'), '') is null
    or char_length(nullif(btrim(event.payload ->> 'email'), '')) <= 254
  )
order by event.tenant_id, event.record_id, event.occurred_at desc, event.id desc
on conflict (tenant_id, id) do nothing;

notify pgrst, 'reload schema';
