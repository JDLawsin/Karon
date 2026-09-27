-- KR-014: one owner-managed weekend migration checklist per clinic.
create table public.migration_checklists (
  tenant_id uuid primary key references public.clinics(id) on delete cascade,
  completed_items text[] not null default '{}',
  updated_by uuid not null references auth.users(id) on delete restrict,
  updated_at timestamptz not null default now(),
  constraint migration_checklists_completed_items_allowed check (
    completed_items <@ array[
      'export_old_system',
      'backup_created',
      'patients_imported',
      'services_imported',
      'balances_recorded',
      'privacy_reviewed',
      'records_spot_checked',
      'booking_enabled'
    ]::text[]
  )
);

alter table public.migration_checklists enable row level security;
alter table public.migration_checklists force row level security;
revoke all on table public.migration_checklists from public, anon, authenticated;
grant select, insert, update on table public.migration_checklists to authenticated;
grant select, insert, update, delete on table public.migration_checklists to service_role;

create policy migration_checklists_select on public.migration_checklists
  for select to authenticated
  using ((select private.is_owner(tenant_id)) and (select private.can_use_clinic()));

create policy migration_checklists_insert on public.migration_checklists
  for insert to authenticated
  with check (
    updated_by = (select auth.uid())
    and (select private.is_owner(tenant_id))
    and (select private.can_use_clinic())
  );

create policy migration_checklists_update on public.migration_checklists
  for update to authenticated
  using ((select private.is_owner(tenant_id)) and (select private.can_use_clinic()))
  with check (
    updated_by = (select auth.uid())
    and (select private.is_owner(tenant_id))
    and (select private.can_use_clinic())
  );

alter table public.audit_events drop constraint if exists audit_events_type_check;
alter table public.audit_events
  add constraint audit_events_type_check
  check (event_type in (
    'clinic.created', 'clinic.profile_updated', 'auth.signup', 'auth.login',
    'auth.mfa_enrolled', 'auth.session_revoked', 'auth.idle_lock',
    'auth.outbox_discarded', 'auth.password_changed', 'member.invited',
    'member.removed', 'access.denied', 'service.created', 'service.updated',
    'service.deleted', 'booking.accepted', 'booking.declined', 'chart.appended',
    'quote.created', 'payment.recorded', 'collections.viewed',
    'import.started', 'import.completed', 'import.failed',
    'import.checklist_updated'
  ));

create or replace function private.audit_migration_checklist()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.audit_events (
    tenant_id,
    actor_user_id,
    event_type,
    record_id,
    metadata
  )
  values (
    new.tenant_id,
    new.updated_by,
    'import.checklist_updated',
    new.tenant_id,
    jsonb_build_object(
      'completed_count', cardinality(new.completed_items),
      'total_count', 8
    )
  );

  return new;
end;
$$;

revoke all on function private.audit_migration_checklist() from public;

create trigger migration_checklists_audit
  after insert or update of completed_items on public.migration_checklists
  for each row
  execute function private.audit_migration_checklist();

-- Upload token creation requires each INSERT policy. If either policy is absent,
-- Supabase Storage denies the signed upload URL and the API returns 503.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'patient_import_staging_insert'
  ) or not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'service_import_staging_insert'
  ) then
    raise exception 'Import staging upload policies are required';
  end if;

  if exists (
    select 1 from storage.buckets
    where id in ('patient-import-staging', 'service-import-staging')
      and public
  ) or (
    select count(*) from storage.buckets
    where id in ('patient-import-staging', 'service-import-staging')
  ) <> 2 then
    raise exception 'Import staging buckets must exist and remain private';
  end if;
end;
$$;

notify pgrst, 'reload schema';
