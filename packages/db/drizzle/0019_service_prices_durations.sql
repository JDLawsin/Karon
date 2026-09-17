alter table public.clinics
  add column currency_code text not null default 'PHP';

alter table public.clinics
  add constraint clinics_currency_code_format
  check (currency_code ~ '^[A-Z]{3}$');

alter table public.clinic_services
  add column price_minor integer,
  add column currency_code text,
  add column duration_minutes integer;

alter table public.clinic_services
  add constraint clinic_services_price_non_negative
    check (price_minor is null or price_minor >= 0),
  add constraint clinic_services_currency_code_format
    check (currency_code is null or currency_code ~ '^[A-Z]{3}$'),
  add constraint clinic_services_duration_bounds
    check (duration_minutes is null or duration_minutes between 1 and 1440),
  add constraint clinic_services_pricing_complete
    check (
      (price_minor is null and currency_code is null)
      or (
        price_minor is not null
        and currency_code is not null
        and duration_minutes is not null
      )
    );

create or replace function private.enforce_service_currency()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_currency text;
begin
  if new.price_minor is null then
    if new.currency_code is not null then
      raise exception 'unpriced services cannot have a currency'
        using errcode = '22023';
    end if;

    return new;
  end if;

  select currency_code
    into v_currency
    from public.clinics
    where id = new.tenant_id;

  if v_currency is null then
    raise exception 'clinic currency is required'
      using errcode = '22023';
  end if;

  if tg_op = 'INSERT' or new.price_minor is distinct from old.price_minor then
    if new.currency_code is distinct from v_currency then
      raise exception 'service currency must match clinic currency'
        using errcode = '22023';
    end if;
  elsif new.currency_code is distinct from old.currency_code then
    raise exception 'service currency cannot change without a price change'
      using errcode = '22023';
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_service_currency() from public;
grant execute on function private.enforce_service_currency() to authenticated;
grant execute on function private.enforce_service_currency() to service_role;

create or replace function private.can_manage_services(_tenant_id uuid)
returns boolean
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if (select private.is_owner(_tenant_id)) then
    return true;
  end if;

  if (select private.is_member(_tenant_id)) then
    raise insufficient_privilege using message = 'service changes require owner access';
  end if;

  return false;
end;
$$;

revoke all on function private.can_manage_services(uuid) from public;
grant execute on function private.can_manage_services(uuid) to authenticated;
grant execute on function private.can_manage_services(uuid) to service_role;

create trigger clinic_services_currency_guard
  before insert or update of tenant_id, price_minor, currency_code
  on public.clinic_services
  for each row
  execute function private.enforce_service_currency();

drop policy if exists clinic_services_insert on public.clinic_services;
drop policy if exists clinic_services_update on public.clinic_services;
drop policy if exists clinic_services_delete on public.clinic_services;

create policy clinic_services_insert on public.clinic_services
  for insert
  to authenticated
  with check (
    (select private.can_manage_services(tenant_id))
    and (select private.can_use_clinic())
    and created_by = (select auth.uid())
    and updated_by = (select auth.uid())
  );

create policy clinic_services_update on public.clinic_services
  for update
  to authenticated
  using (
    (select private.can_manage_services(tenant_id))
    and (select private.can_use_clinic())
  )
  with check (
    (select private.can_manage_services(tenant_id))
    and (select private.can_use_clinic())
    and updated_by = (select auth.uid())
  );

create policy clinic_services_delete on public.clinic_services
  for delete
  to authenticated
  using (
    (select private.can_manage_services(tenant_id))
    and (select private.can_use_clinic())
  );
