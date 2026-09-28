-- Keep clinic currency changes serialized with financial event inserts without
-- requiring assistants to pass the owner-only clinics UPDATE policy.

create or replace function private.lock_financial_event_currency()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.event_type in ('quote.created', 'payment.recorded') then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(new.tenant_id::text, 1263682126)
    );
  end if;

  return new;
end;
$$;

revoke all on function private.lock_financial_event_currency() from public;

create or replace function private.validate_clinic_regional_settings()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not (select private.is_iso_4217(new.currency_code)) then
    raise exception 'invalid ISO 4217 currency' using errcode = '22023';
  end if;

  if tg_op = 'UPDATE' and old.currency_code is distinct from new.currency_code then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(new.id::text, 1263682126)
    );

    if exists (
      select 1
      from public.clinic_events as event
      where event.tenant_id = new.id
        and event.event_type in ('quote.created', 'payment.recorded')
    ) then
      raise exception 'clinic currency cannot change after financial activity'
        using errcode = '22023';
    end if;
  end if;

  if new.locale is null
     or char_length(new.locale) not between 2 and 35
     or new.locale !~ '^[A-Za-z]{2,8}(-[A-Za-z0-9]{1,8})*$' then
    raise exception 'invalid locale' using errcode = '22023';
  end if;

  if new.timezone is null or not exists (
    select 1
    from pg_catalog.pg_timezone_names as zone
    where zone.name = new.timezone
  ) then
    raise exception 'invalid IANA timezone' using errcode = '22023';
  end if;

  return new;
end;
$$;

revoke all on function private.validate_clinic_regional_settings() from public;
