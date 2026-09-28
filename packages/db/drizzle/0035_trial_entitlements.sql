-- KR-017: server-clock trial enforcement with manual design-partner grace.

create type public.clinic_entitlement_status as enum (
  'trialing',
  'active',
  'past_due',
  'expired'
);

create table public.clinic_entitlements (
  tenant_id uuid primary key references public.clinics (id) on delete cascade,
  status public.clinic_entitlement_status not null,
  source text not null,
  starts_at timestamptz not null default now(),
  access_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clinic_entitlements_status_check check (status <> 'trialing'),
  constraint clinic_entitlements_source_check check (source in ('manual', 'paymongo')),
  constraint clinic_entitlements_window_check check (
    access_until is null or access_until > starts_at
  ),
  constraint clinic_entitlements_manual_expiry_check check (
    source <> 'manual' or access_until is not null
  ),
  constraint clinic_entitlements_past_due_expiry_check check (
    status <> 'past_due' or access_until is not null
  )
);

alter table public.clinic_entitlements enable row level security;
alter table public.clinic_entitlements force row level security;

revoke all on table public.clinic_entitlements from public, anon, authenticated;
grant select, insert, update, delete on table public.clinic_entitlements to service_role;
revoke truncate, references, trigger on table public.clinic_entitlements
  from public, anon, authenticated;

alter table public.audit_events drop constraint if exists audit_events_type_check;
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
    'entitlement.grace_granted', 'entitlement.expired'
  ));

create unique index audit_events_entitlement_expiry_once_idx
  on public.audit_events (tenant_id, event_type)
  where event_type in ('entitlement.trial_expired', 'entitlement.expired');

create or replace function private.reject_client_entitlement_audit()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.event_type in (
    'entitlement.trial_expired',
    'entitlement.grace_granted',
    'entitlement.expired'
  ) and current_user in ('anon', 'authenticated') then
    raise exception 'entitlement audit events are server-only' using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function private.reject_client_entitlement_audit() from public;

create trigger audit_events_reject_client_entitlement
before insert on public.audit_events
for each row execute function private.reject_client_entitlement_audit();

create or replace function private.entitlement_for(_tenant_id uuid)
returns table (
  status public.clinic_entitlement_status,
  source text,
  starts_at timestamptz,
  ends_at timestamptz,
  days_remaining integer,
  has_access boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  with snapshot as (
    select
      clinics.trial_started_at,
      entitlements.status as granted_status,
      entitlements.source as granted_source,
      entitlements.starts_at as granted_starts_at,
      entitlements.access_until,
      now() as checked_at
    from public.clinics as clinics
    left join public.clinic_entitlements as entitlements
      on entitlements.tenant_id = clinics.id
    where clinics.id = _tenant_id
  ), resolved as (
    select
      case
        when granted_status = 'active'
          and (access_until is null or access_until > checked_at)
          then 'active'::public.clinic_entitlement_status
        when granted_status = 'past_due' and access_until > checked_at
          then 'past_due'::public.clinic_entitlement_status
        when trial_started_at + interval '7 days' > checked_at
          then 'trialing'::public.clinic_entitlement_status
        else 'expired'::public.clinic_entitlement_status
      end as status,
      case
        when granted_status in ('active', 'past_due')
          and (access_until is null or access_until > checked_at)
          then granted_source
        when trial_started_at + interval '7 days' > checked_at then 'trial'
        when granted_status is not null then granted_source
        else 'trial'
      end as source,
      case
        when granted_status in ('active', 'past_due')
          and (access_until is null or access_until > checked_at)
          then granted_starts_at
        when trial_started_at + interval '7 days' > checked_at then trial_started_at
        else coalesce(granted_starts_at, trial_started_at)
      end as starts_at,
      case
        when granted_status in ('active', 'past_due')
          and (access_until is null or access_until > checked_at)
          then access_until
        when trial_started_at + interval '7 days' > checked_at
          then trial_started_at + interval '7 days'
        else coalesce(access_until, trial_started_at + interval '7 days')
      end as ends_at,
      checked_at
    from snapshot
  )
  select
    resolved.status,
    resolved.source,
    resolved.starts_at,
    resolved.ends_at,
    case
      when resolved.ends_at is null then null
      else greatest(
        0,
        ceil(extract(epoch from (resolved.ends_at - resolved.checked_at)) / 86400)::integer
      )
    end as days_remaining,
    resolved.status in ('trialing', 'active', 'past_due') as has_access
  from resolved;
$$;

revoke all on function private.entitlement_for(uuid) from public;

create or replace function private.has_entitlement()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select entitlement.has_access
    from public.clinic_members as members
    cross join lateral private.entitlement_for(members.tenant_id) as entitlement
    where members.user_id = (select auth.uid())
  ), false);
$$;

revoke all on function private.has_entitlement() from public;

create or replace function private.can_use_clinic()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select private.has_active_session())
     and (select private.owner_mfa_ok())
     and (select private.has_entitlement());
$$;

revoke all on function private.can_use_clinic() from public;
grant execute on function private.can_use_clinic() to authenticated;

create or replace function private.audit_manual_entitlement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.source = 'manual'
     and new.status = 'active'
     and new.access_until > now()
     and (
       tg_op = 'INSERT'
       or old.status is distinct from new.status
       or old.access_until is distinct from new.access_until
     ) then
    insert into public.audit_events (
      tenant_id,
      actor_user_id,
      event_type,
      record_id,
      metadata
    ) values (
      new.tenant_id,
      (select auth.uid()),
      'entitlement.grace_granted',
      new.tenant_id,
      jsonb_build_object('access_until', new.access_until)
    );
  end if;

  return new;
end;
$$;

revoke all on function private.audit_manual_entitlement() from public;

create trigger clinic_entitlements_audit_manual
after insert or update on public.clinic_entitlements
for each row execute function private.audit_manual_entitlement();

create or replace function public.current_entitlement()
returns table (
  status public.clinic_entitlement_status,
  source text,
  starts_at timestamptz,
  ends_at timestamptz,
  days_remaining integer,
  has_access boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_tenant uuid;
  v_snapshot record;
  v_event_type text;
begin
  if v_user is null then
    return;
  end if;

  select members.tenant_id
    into v_tenant
  from public.clinic_members as members
  where members.user_id = v_user;

  if v_tenant is null then
    return;
  end if;

  select *
    into v_snapshot
  from private.entitlement_for(v_tenant);

  if v_snapshot.status = 'expired' then
    v_event_type := case
      when v_snapshot.source = 'trial' then 'entitlement.trial_expired'
      else 'entitlement.expired'
    end;

    insert into public.audit_events (
      tenant_id,
      actor_user_id,
      event_type,
      record_id,
      metadata
    ) values (
      v_tenant,
      v_user,
      v_event_type,
      v_tenant,
      jsonb_build_object()
    ) on conflict (tenant_id, event_type)
      where event_type in ('entitlement.trial_expired', 'entitlement.expired')
      do nothing;
  end if;

  return query select
    v_snapshot.status,
    v_snapshot.source,
    v_snapshot.starts_at,
    v_snapshot.ends_at,
    v_snapshot.days_remaining,
    v_snapshot.has_access;
end;
$$;

revoke all on function public.current_entitlement() from public, anon;
grant execute on function public.current_entitlement() to authenticated;

notify pgrst, 'reload schema';
