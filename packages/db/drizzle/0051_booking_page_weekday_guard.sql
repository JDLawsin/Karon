-- KR-033: keep the database indexing guard aligned with booking-hours parsing.

create or replace function private.booking_page_profile_complete(
  p_tenant_id uuid,
  p_name text,
  p_phone text,
  p_address jsonb,
  p_hours jsonb
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    nullif(btrim(p_name), '') is not null
    and nullif(btrim(p_phone), '') is not null
    and jsonb_typeof(p_address) = 'object'
    and nullif(btrim(p_address ->> 'city'), '') is not null
    and jsonb_typeof(p_hours) = 'object'
    and case
      when jsonb_typeof(p_hours -> 'days') = 'array'
        then jsonb_array_length(p_hours -> 'days') > 0
          and not exists (
            select 1
            from jsonb_array_elements(p_hours -> 'days') as day(value)
            where case
              when jsonb_typeof(day.value) = 'number' then
                (day.value #>> '{}')::numeric not between 0 and 6
                or (day.value #>> '{}')::numeric
                  <> trunc((day.value #>> '{}')::numeric)
              else true
            end
          )
      else false
    end
    and case
      when (p_hours ->> 'open') ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
       and (p_hours ->> 'close') ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
        then (
          substring(p_hours ->> 'close', 1, 2)::integer * 60
          + substring(p_hours ->> 'close', 4, 2)::integer
          - substring(p_hours ->> 'open', 1, 2)::integer * 60
          - substring(p_hours ->> 'open', 4, 2)::integer
        ) >= 30
      else false
    end
    and exists (
      select 1
      from public.clinic_services as services
      where services.tenant_id = p_tenant_id
    );
$$;

revoke all on function private.booking_page_profile_complete(
  uuid, text, text, jsonb, jsonb
) from public, anon, authenticated;
