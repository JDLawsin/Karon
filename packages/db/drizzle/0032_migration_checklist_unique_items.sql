-- KR-014 follow-up: prevent duplicate checklist identifiers at the Data API boundary.
update public.migration_checklists
set completed_items = (
  select coalesce(
    array_agg(unique_items.item order by unique_items.first_ordinality),
    '{}'::text[]
  )
  from (
    select item, min(ordinality) as first_ordinality
    from unnest(migration_checklists.completed_items) with ordinality as entries(item, ordinality)
    group by item
  ) as unique_items
)
where cardinality(completed_items) <> (
  select count(distinct item)
  from unnest(migration_checklists.completed_items) as entries(item)
);

alter table public.migration_checklists
  add constraint migration_checklists_completed_items_unique check (
    array_position(completed_items, null) is null
    and cardinality(array_positions(completed_items, 'export_old_system')) <= 1
    and cardinality(array_positions(completed_items, 'backup_created')) <= 1
    and cardinality(array_positions(completed_items, 'patients_imported')) <= 1
    and cardinality(array_positions(completed_items, 'services_imported')) <= 1
    and cardinality(array_positions(completed_items, 'balances_recorded')) <= 1
    and cardinality(array_positions(completed_items, 'privacy_reviewed')) <= 1
    and cardinality(array_positions(completed_items, 'records_spot_checked')) <= 1
    and cardinality(array_positions(completed_items, 'booking_enabled')) <= 1
  );
