-- KR-018: provider-neutral checkout ledger, webhook idempotency, and paid restore.

create type public.billing_interval as enum ('monthly', 'yearly');
create type public.billing_checkout_status as enum (
  'pending',
  'open',
  'paid',
  'failed',
  'cancelled'
);
create type public.billing_webhook_status as enum (
  'received',
  'processed',
  'ignored'
);

create table public.billing_checkout_sessions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.clinics (id) on delete cascade,
  actor_user_id uuid not null references auth.users (id) on delete restrict,
  provider text not null,
  billing_interval public.billing_interval not null,
  amount_minor integer not null,
  currency_code text not null,
  status public.billing_checkout_status not null default 'pending',
  provider_checkout_id text,
  livemode boolean not null,
  last_provider_event_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint billing_checkout_provider_format check (
    provider ~ '^[a-z][a-z0-9_-]{0,39}$'
  ),
  constraint billing_checkout_amount_positive check (amount_minor > 0),
  constraint billing_checkout_currency_format check (
    currency_code ~ '^[A-Z]{3}$'
  ),
  constraint billing_checkout_provider_id_length check (
    provider_checkout_id is null
    or char_length(provider_checkout_id) between 1 and 255
  )
);

create index billing_checkout_tenant_created_idx
  on public.billing_checkout_sessions (tenant_id, created_at desc);
create unique index billing_checkout_provider_id_idx
  on public.billing_checkout_sessions (provider, provider_checkout_id)
  where provider_checkout_id is not null;

alter table public.billing_checkout_sessions enable row level security;
alter table public.billing_checkout_sessions force row level security;
revoke all on table public.billing_checkout_sessions
  from public, anon, authenticated;
grant select, insert, update, delete on table public.billing_checkout_sessions
  to service_role;

create table public.billing_webhook_events (
  provider text not null,
  provider_event_id text not null,
  tenant_id uuid references public.clinics (id) on delete set null,
  checkout_id uuid references public.billing_checkout_sessions (id) on delete set null,
  event_type text not null,
  processing_status public.billing_webhook_status not null default 'received',
  livemode boolean not null,
  payload_sha256 text not null,
  provider_occurred_at timestamptz not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  primary key (provider, provider_event_id),
  constraint billing_webhook_provider_format check (
    provider ~ '^[a-z][a-z0-9_-]{0,39}$'
  ),
  constraint billing_webhook_event_id_length check (
    char_length(provider_event_id) between 1 and 255
  ),
  constraint billing_webhook_event_type_length check (
    char_length(event_type) between 1 and 120
  ),
  constraint billing_webhook_payload_hash_format check (
    payload_sha256 ~ '^[a-f0-9]{64}$'
  )
);

create index billing_webhook_tenant_received_idx
  on public.billing_webhook_events (tenant_id, received_at desc)
  where tenant_id is not null;
create index billing_webhook_checkout_idx
  on public.billing_webhook_events (checkout_id)
  where checkout_id is not null;

alter table public.billing_webhook_events enable row level security;
alter table public.billing_webhook_events force row level security;
revoke all on table public.billing_webhook_events
  from public, anon, authenticated;
grant select, insert, update, delete on table public.billing_webhook_events
  to service_role;

alter table public.clinic_entitlements
  add column provider text,
  add column billing_checkout_id uuid
    references public.billing_checkout_sessions (id) on delete set null;

alter table public.clinic_entitlements
  drop constraint clinic_entitlements_source_check;

update public.clinic_entitlements
set source = 'billing', provider = 'paymongo'
where source = 'paymongo';

alter table public.clinic_entitlements
  add constraint clinic_entitlements_source_check
    check (source in ('manual', 'billing')),
  add constraint clinic_entitlements_provider_format check (
    provider is null or provider ~ '^[a-z][a-z0-9_-]{0,39}$'
  ),
  add constraint clinic_entitlements_source_provider_check check (
    (source = 'manual' and provider is null and billing_checkout_id is null)
    or
    (source = 'billing' and provider is not null)
  );

alter table public.audit_events drop constraint audit_events_type_check;
alter table public.audit_events
  add constraint audit_events_type_check
  check (event_type in (
    'clinic.created', 'clinic.profile_updated', 'auth.signup', 'auth.login',
    'auth.mfa_enrolled', 'auth.session_revoked', 'auth.idle_lock',
    'auth.outbox_discarded', 'auth.password_changed', 'member.invited',
    'member.removed', 'access.denied', 'service.created', 'service.updated',
    'service.deleted', 'booking.accepted', 'booking.declined', 'chart.appended',
    'quote.created', 'payment.recorded', 'opening_balance.noted',
    'collections.viewed', 'import.started', 'import.completed', 'import.failed',
    'import.checklist_updated', 'entitlement.trial_expired',
    'entitlement.grace_granted', 'entitlement.expired',
    'entitlement.past_due', 'entitlement.restored',
    'billing.checkout_started', 'billing.payment_succeeded',
    'billing.payment_failed'
  ));

create or replace function private.reject_client_entitlement_audit()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if (
    new.event_type like 'entitlement.%'
    or new.event_type like 'billing.%'
  ) and current_user in ('anon', 'authenticated') then
    raise exception 'billing audit events are server-only' using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function private.reject_client_entitlement_audit() from public;

create or replace function public.reserve_billing_checkout(
  p_tenant_id uuid,
  p_actor_user_id uuid,
  p_provider text,
  p_interval public.billing_interval,
  p_amount_minor integer,
  p_currency_code text,
  p_livemode boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_checkout_id uuid;
  v_recent_count integer;
begin
  if p_provider !~ '^[a-z][a-z0-9_-]{0,39}$'
     or p_amount_minor <= 0
     or p_currency_code !~ '^[A-Z]{3}$' then
    raise exception 'invalid billing checkout' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.clinic_members as members
    where members.tenant_id = p_tenant_id
      and members.user_id = p_actor_user_id
      and members.role = 'owner'
  ) then
    raise exception 'owner required' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_tenant_id::text, 0));

  select count(*)::integer
    into v_recent_count
  from public.billing_checkout_sessions as checkouts
  where checkouts.tenant_id = p_tenant_id
    and checkouts.created_at >= now() - interval '10 minutes';

  if v_recent_count >= 5 then
    raise exception 'billing checkout rate limited' using errcode = 'P0001';
  end if;

  insert into public.billing_checkout_sessions (
    tenant_id,
    actor_user_id,
    provider,
    billing_interval,
    amount_minor,
    currency_code,
    livemode
  ) values (
    p_tenant_id,
    p_actor_user_id,
    p_provider,
    p_interval,
    p_amount_minor,
    p_currency_code,
    p_livemode
  ) returning id into v_checkout_id;

  insert into public.audit_events (
    tenant_id,
    actor_user_id,
    event_type,
    record_id,
    metadata
  ) values (
    p_tenant_id,
    p_actor_user_id,
    'billing.checkout_started',
    v_checkout_id,
    jsonb_build_object('provider', p_provider, 'interval', p_interval)
  );

  return v_checkout_id;
end;
$$;

revoke all on function public.reserve_billing_checkout(
  uuid, uuid, text, public.billing_interval, integer, text, boolean
) from public, anon, authenticated;
grant execute on function public.reserve_billing_checkout(
  uuid, uuid, text, public.billing_interval, integer, text, boolean
) to service_role;

create or replace function public.complete_billing_checkout(
  p_checkout_id uuid,
  p_provider_checkout_id text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if char_length(p_provider_checkout_id) not between 1 and 255 then
    raise exception 'invalid provider checkout id' using errcode = '22023';
  end if;

  update public.billing_checkout_sessions
  set provider_checkout_id = p_provider_checkout_id,
      status = 'open',
      updated_at = now()
  where id = p_checkout_id
    and status = 'pending';

  return found;
end;
$$;

revoke all on function public.complete_billing_checkout(uuid, text)
  from public, anon, authenticated;
grant execute on function public.complete_billing_checkout(uuid, text)
  to service_role;

create or replace function public.fail_billing_checkout(p_checkout_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.billing_checkout_sessions
  set status = 'failed', updated_at = now()
  where id = p_checkout_id
    and status = 'pending';

  return found;
end;
$$;

revoke all on function public.fail_billing_checkout(uuid)
  from public, anon, authenticated;
grant execute on function public.fail_billing_checkout(uuid) to service_role;

create or replace function public.apply_billing_webhook(
  p_provider text,
  p_provider_event_id text,
  p_event_type text,
  p_event_kind text,
  p_checkout_id uuid,
  p_provider_checkout_id text,
  p_livemode boolean,
  p_amount_minor integer,
  p_currency_code text,
  p_provider_occurred_at timestamptz,
  p_payload_sha256 text,
  p_access_until timestamptz
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_checkout public.billing_checkout_sessions%rowtype;
  v_inserted integer;
  v_had_access boolean := false;
  v_access_until timestamptz;
begin
  insert into public.billing_webhook_events (
    provider,
    provider_event_id,
    event_type,
    livemode,
    payload_sha256,
    provider_occurred_at
  ) values (
    p_provider,
    p_provider_event_id,
    p_event_type,
    p_livemode,
    p_payload_sha256,
    p_provider_occurred_at
  ) on conflict (provider, provider_event_id) do nothing;

  get diagnostics v_inserted = row_count;

  if v_inserted = 0 then
    return 'duplicate';
  end if;

  if p_event_kind = 'ignored' or p_checkout_id is null then
    update public.billing_webhook_events
    set processing_status = 'ignored', processed_at = now()
    where provider = p_provider and provider_event_id = p_provider_event_id;
    return 'ignored';
  end if;

  select * into v_checkout
  from public.billing_checkout_sessions as checkouts
  where checkouts.id = p_checkout_id
    and checkouts.provider = p_provider
  for update;

  if v_checkout.id is null
     or v_checkout.livemode is distinct from p_livemode
     or (
       v_checkout.provider_checkout_id is not null
       and p_provider_checkout_id is not null
       and v_checkout.provider_checkout_id <> p_provider_checkout_id
     ) then
    update public.billing_webhook_events
    set processing_status = 'ignored', processed_at = now()
    where provider = p_provider and provider_event_id = p_provider_event_id;
    return 'ignored';
  end if;

  update public.billing_webhook_events
  set tenant_id = v_checkout.tenant_id,
      checkout_id = v_checkout.id
  where provider = p_provider and provider_event_id = p_provider_event_id;

  if p_event_kind = 'payment_succeeded' then
    if p_amount_minor is distinct from v_checkout.amount_minor
       or p_currency_code is distinct from v_checkout.currency_code then
      raise exception 'billing payment does not match checkout'
        using errcode = '22023';
    end if;

    if v_checkout.status = 'paid' then
      update public.billing_webhook_events
      set processing_status = 'ignored', processed_at = now()
      where provider = p_provider and provider_event_id = p_provider_event_id;
      return 'ignored';
    end if;

    select coalesce(entitlement.has_access, false)
      into v_had_access
    from private.entitlement_for(v_checkout.tenant_id) as entitlement;

    v_access_until := coalesce(
      p_access_until,
      case v_checkout.billing_interval
        when 'monthly' then greatest(
          now(),
          coalesce((
            select entitlements.access_until
            from public.clinic_entitlements as entitlements
            where entitlements.tenant_id = v_checkout.tenant_id
              and entitlements.source = 'billing'
          ), now())
        ) + interval '1 month'
        when 'yearly' then greatest(
          now(),
          coalesce((
            select entitlements.access_until
            from public.clinic_entitlements as entitlements
            where entitlements.tenant_id = v_checkout.tenant_id
              and entitlements.source = 'billing'
          ), now())
        ) + interval '1 year'
      end
    );

    if v_access_until <= now() then
      raise exception 'billing access period is not in the future'
        using errcode = '22023';
    end if;

    insert into public.clinic_entitlements (
      tenant_id,
      status,
      source,
      provider,
      billing_checkout_id,
      starts_at,
      access_until,
      updated_at
    ) values (
      v_checkout.tenant_id,
      'active',
      'billing',
      p_provider,
      v_checkout.id,
      now(),
      v_access_until,
      now()
    ) on conflict (tenant_id) do update
      set status = 'active',
          source = 'billing',
          provider = excluded.provider,
          billing_checkout_id = excluded.billing_checkout_id,
          starts_at = excluded.starts_at,
          access_until = excluded.access_until,
          updated_at = now();

    update public.billing_checkout_sessions
    set status = 'paid',
        provider_checkout_id = coalesce(
          provider_checkout_id,
          p_provider_checkout_id
        ),
        last_provider_event_at = greatest(
          coalesce(last_provider_event_at, p_provider_occurred_at),
          p_provider_occurred_at
        ),
        updated_at = now()
    where id = v_checkout.id;

    insert into public.audit_events (
      tenant_id,
      actor_user_id,
      event_type,
      record_id,
      metadata
    ) values (
      v_checkout.tenant_id,
      null,
      'billing.payment_succeeded',
      v_checkout.id,
      jsonb_build_object(
        'provider', p_provider,
        'interval', v_checkout.billing_interval
      )
    );

    if not v_had_access then
      insert into public.audit_events (
        tenant_id,
        actor_user_id,
        event_type,
        record_id,
        metadata
      ) values (
        v_checkout.tenant_id,
        null,
        'entitlement.restored',
        v_checkout.id,
        jsonb_build_object('provider', p_provider)
      );
    end if;
  elsif p_event_kind = 'payment_failed' then
    if v_checkout.status <> 'paid'
       and (
         v_checkout.last_provider_event_at is null
         or p_provider_occurred_at >= v_checkout.last_provider_event_at
       ) then
      update public.billing_checkout_sessions
      set status = 'failed',
          last_provider_event_at = p_provider_occurred_at,
          updated_at = now()
      where id = v_checkout.id;

      insert into public.audit_events (
        tenant_id,
        actor_user_id,
        event_type,
        record_id,
        metadata
      ) values (
        v_checkout.tenant_id,
        null,
        'billing.payment_failed',
        v_checkout.id,
        jsonb_build_object('provider', p_provider)
      );

      update public.clinic_entitlements
      set status = 'past_due',
          access_until = now() + interval '3 days',
          updated_at = now()
      where tenant_id = v_checkout.tenant_id
        and source = 'billing'
        and status <> 'past_due'
        and access_until <= now();

      if found then
        insert into public.audit_events (
          tenant_id,
          actor_user_id,
          event_type,
          record_id,
          metadata
        ) values (
          v_checkout.tenant_id,
          null,
          'entitlement.past_due',
          v_checkout.id,
          jsonb_build_object('provider', p_provider, 'grace_days', 3)
        );
      end if;
    end if;
  else
    update public.billing_webhook_events
    set processing_status = 'ignored', processed_at = now()
    where provider = p_provider and provider_event_id = p_provider_event_id;
    return 'ignored';
  end if;

  update public.billing_webhook_events
  set processing_status = 'processed', processed_at = now()
  where provider = p_provider and provider_event_id = p_provider_event_id;

  return 'processed';
end;
$$;

revoke all on function public.apply_billing_webhook(
  text, text, text, text, uuid, text, boolean, integer, text,
  timestamptz, text, timestamptz
) from public, anon, authenticated;
grant execute on function public.apply_billing_webhook(
  text, text, text, text, uuid, text, boolean, integer, text,
  timestamptz, text, timestamptz
) to service_role;

notify pgrst, 'reload schema';
