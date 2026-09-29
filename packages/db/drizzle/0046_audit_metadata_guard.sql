-- KR-021: prevent authenticated clients from putting arbitrary SPI in audit metadata.

create or replace function private.validate_client_audit_metadata()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_row_count numeric;
begin
  if current_user <> 'authenticated' then
    return new;
  end if;

  if jsonb_typeof(new.metadata) <> 'object' then
    raise exception 'audit metadata must be an object' using errcode = '22023';
  end if;

  if new.event_type like 'export.%' then
    if new.metadata - array['kind', 'filter', 'row_count'] <> '{}'::jsonb
       or not (new.metadata ?& array['kind', 'filter', 'row_count'])
       or jsonb_typeof(new.metadata -> 'kind') <> 'string'
       or new.metadata ->> 'kind' not in ('patients', 'appointments', 'payments')
       or new.metadata ->> 'filter' <> 'all'
       or jsonb_typeof(new.metadata -> 'row_count') <> 'number' then
      raise exception 'invalid export audit metadata' using errcode = '22023';
    end if;

    v_row_count := (new.metadata ->> 'row_count')::numeric;
    if v_row_count <> trunc(v_row_count)
       or v_row_count not between 0 and 2147483647 then
      raise exception 'invalid export audit row count' using errcode = '22023';
    end if;
  elsif new.event_type = 'collections.viewed' then
    if new.metadata - array['day', 'timezone'] <> '{}'::jsonb
       or not (new.metadata ?& array['day', 'timezone'])
       or jsonb_typeof(new.metadata -> 'day') <> 'string'
       or new.metadata ->> 'day' !~ '^\d{4}-\d{2}-\d{2}$'
       or jsonb_typeof(new.metadata -> 'timezone') <> 'string'
       or char_length(new.metadata ->> 'timezone') not between 1 and 64 then
      raise exception 'invalid collections audit metadata' using errcode = '22023';
    end if;
  elsif new.metadata <> '{}'::jsonb then
    raise exception 'client audit metadata must be empty' using errcode = '22023';
  end if;

  return new;
end;
$$;

revoke all on function private.validate_client_audit_metadata() from public;

drop trigger if exists audit_events_validate_client_metadata
  on public.audit_events;
create trigger audit_events_validate_client_metadata
before insert on public.audit_events
for each row execute function private.validate_client_audit_metadata();

notify pgrst, 'reload schema';
