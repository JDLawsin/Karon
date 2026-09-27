-- KR-013: owner-only service catalog imports with private staging and explicit removals.

alter table public.clinic_services add column service_code text;
alter table public.clinic_services
  add constraint clinic_services_code_length
  check (service_code is null or char_length(btrim(service_code)) between 1 and 40);
create unique index clinic_services_tenant_code_idx
  on public.clinic_services (tenant_id, lower(btrim(service_code)))
  where service_code is not null;

create type public.service_import_status as enum (
  'awaiting_upload', 'uploaded', 'preview_ready', 'committing', 'completed', 'failed'
);

create table public.service_import_jobs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.clinics (id) on delete cascade,
  created_by uuid not null references auth.users (id) on delete restrict,
  status public.service_import_status not null default 'awaiting_upload',
  file_name text not null,
  storage_path text not null,
  content_type text not null,
  file_size integer not null,
  columns jsonb not null default '[]'::jsonb,
  mapping jsonb not null default '{"name":null,"price":null,"duration":null,"code":null,"currency":null}'::jsonb,
  rows jsonb not null default '[]'::jsonb,
  existing_service_ids jsonb not null default '[]'::jsonb,
  total_rows integer not null default 0,
  imported_rows integer not null default 0,
  failed_rows integer not null default 0,
  removed_rows integer not null default 0,
  last_error text,
  expires_at timestamptz not null default now() + interval '24 hours',
  object_deleted_at timestamptz,
  data_purged_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint service_import_jobs_file_size_bounds check (file_size between 1 and 5000000),
  constraint service_import_jobs_counts_non_negative check (
    total_rows >= 0 and imported_rows >= 0 and failed_rows >= 0 and removed_rows >= 0
  ),
  constraint service_import_jobs_error_length check (last_error is null or char_length(last_error) <= 280),
  constraint service_import_jobs_file_name_length check (char_length(file_name) between 1 and 255),
  constraint service_import_jobs_content_type check (content_type in (
    'text/csv', 'application/csv', 'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  )),
  constraint service_import_jobs_storage_path check (
    storage_path = tenant_id::text || '/' || id::text || '/source.' ||
      case when content_type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        then 'xlsx' else 'csv' end
  )
);

create unique index service_import_jobs_storage_path_idx on public.service_import_jobs (storage_path);
create index service_import_jobs_tenant_created_idx on public.service_import_jobs (tenant_id, created_at desc);
create index service_import_jobs_expiry_idx on public.service_import_jobs (expires_at)
  where object_deleted_at is null or data_purged_at is null;

alter table public.service_import_jobs enable row level security;
alter table public.service_import_jobs force row level security;
revoke all on table public.service_import_jobs from public, anon, authenticated;
grant select, insert, update on table public.service_import_jobs to authenticated;
grant select, insert, update, delete on table public.service_import_jobs to service_role;

create policy service_import_jobs_select on public.service_import_jobs for select to authenticated
  using (created_by = (select auth.uid()) and (select private.is_owner(tenant_id)) and (select private.can_use_clinic()));
create policy service_import_jobs_insert on public.service_import_jobs for insert to authenticated
  with check (created_by = (select auth.uid()) and status = 'awaiting_upload' and (select private.is_owner(tenant_id)) and (select private.can_use_clinic()));
create policy service_import_jobs_update on public.service_import_jobs for update to authenticated
  using (created_by = (select auth.uid()) and (select private.is_owner(tenant_id)) and (select private.can_use_clinic()))
  with check (created_by = (select auth.uid()) and (select private.is_owner(tenant_id)) and (select private.can_use_clinic()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('service-import-staging', 'service-import-staging', false, 5000000, array[
  'text/csv', 'application/csv', 'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy service_import_staging_insert on storage.objects for insert to authenticated
with check (
  bucket_id = 'service-import-staging'
  and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/source\.(csv|xlsx)$'
  and owner_id = (select auth.uid())::text
  and (select private.is_owner(split_part(name, '/', 1)::uuid))
  and (select private.can_use_clinic())
  and exists (
    select 1 from public.service_import_jobs job
    where job.id = split_part(name, '/', 2)::uuid
      and job.tenant_id = split_part(name, '/', 1)::uuid
      and job.created_by = (select auth.uid())
      and job.storage_path = name and job.status = 'awaiting_upload' and job.expires_at > now()
  )
);
create policy service_import_staging_select on storage.objects for select to authenticated
using (
  bucket_id = 'service-import-staging' and owner_id = (select auth.uid())::text
  and (select private.is_owner(split_part(name, '/', 1)::uuid))
  and (select private.can_use_clinic())
  and exists (select 1 from public.service_import_jobs job where job.id = split_part(name, '/', 2)::uuid and job.tenant_id = split_part(name, '/', 1)::uuid and job.created_by = (select auth.uid()) and job.storage_path = name)
);
create policy service_import_staging_delete on storage.objects for delete to authenticated
using (
  bucket_id = 'service-import-staging' and owner_id = (select auth.uid())::text
  and (select private.is_owner(split_part(name, '/', 1)::uuid))
  and (select private.can_use_clinic())
  and exists (select 1 from public.service_import_jobs job where job.id = split_part(name, '/', 2)::uuid and job.tenant_id = split_part(name, '/', 1)::uuid and job.created_by = (select auth.uid()) and job.storage_path = name)
);

create or replace function private.audit_service_import_job()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_event_type text; v_metadata jsonb;
begin
  if tg_op = 'INSERT' then
    v_event_type := 'import.started';
    v_metadata := jsonb_build_object('kind', 'services', 'format', case when new.content_type like '%spreadsheet%' then 'xlsx' else 'csv' end, 'bytes', new.file_size, 'ttl_hours', 24);
  elsif old.status is distinct from new.status and new.status = 'completed' then
    v_event_type := 'import.completed';
    v_metadata := jsonb_build_object('kind', 'services', 'total', new.total_rows, 'imported', new.imported_rows, 'failed', new.failed_rows, 'removed', new.removed_rows, 'raw_file_deleted', new.object_deleted_at is not null);
  elsif old.status is distinct from new.status and new.status = 'failed' then
    v_event_type := 'import.failed';
    v_metadata := jsonb_build_object('kind', 'services', 'total', new.total_rows, 'imported', new.imported_rows);
  else return new;
  end if;
  insert into public.audit_events (tenant_id, actor_user_id, event_type, record_id, metadata)
  values (new.tenant_id, new.created_by, v_event_type, new.id, v_metadata);
  return new;
end; $$;
revoke all on function private.audit_service_import_job() from public;
create trigger service_import_jobs_audit after insert or update of status on public.service_import_jobs
  for each row execute function private.audit_service_import_job();

notify pgrst, 'reload schema';
