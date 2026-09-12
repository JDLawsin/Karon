-- Align clinic-branding storage with clinic table MFA (NFR-12).
-- 0012 already applied on existing DBs with has_active_session() only.

do $$
begin
  if to_regnamespace('storage') is not null then
    drop policy if exists clinic_branding_select on storage.objects;
    drop policy if exists clinic_branding_insert on storage.objects;
    drop policy if exists clinic_branding_update on storage.objects;
    drop policy if exists clinic_branding_delete on storage.objects;

    create policy clinic_branding_select on storage.objects
      for select
      to authenticated
      using (
        bucket_id = 'clinic-branding'
        and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/logo$'
        and (select private.is_member(split_part(name, '/', 1)::uuid))
        and (select private.can_use_clinic())
      );

    create policy clinic_branding_insert on storage.objects
      for insert
      to authenticated
      with check (
        bucket_id = 'clinic-branding'
        and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/logo$'
        and (select private.is_owner(split_part(name, '/', 1)::uuid))
        and (select private.can_use_clinic())
      );

    create policy clinic_branding_update on storage.objects
      for update
      to authenticated
      using (
        bucket_id = 'clinic-branding'
        and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/logo$'
        and (select private.is_owner(split_part(name, '/', 1)::uuid))
        and (select private.can_use_clinic())
      )
      with check (
        bucket_id = 'clinic-branding'
        and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/logo$'
        and (select private.is_owner(split_part(name, '/', 1)::uuid))
        and (select private.can_use_clinic())
      );

    create policy clinic_branding_delete on storage.objects
      for delete
      to authenticated
      using (
        bucket_id = 'clinic-branding'
        and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/logo$'
        and (select private.is_owner(split_part(name, '/', 1)::uuid))
        and (select private.can_use_clinic())
      );
  end if;
end;
$$;

notify pgrst, 'reload schema';
