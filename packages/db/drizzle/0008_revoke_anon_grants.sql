-- Defense-in-depth: drop leftover anon/public table and RPC privileges.
-- RLS already denied rows; this stops PostgREST from seeing the tables at all.

revoke all on table
  public.clinics,
  public.clinic_members,
  public.clinic_sessions,
  public.audit_events
from public, anon;

revoke all on table public.karon_schema_migrations from public, anon, authenticated;

revoke truncate, references, trigger on table
  public.clinics,
  public.clinic_members,
  public.clinic_sessions,
  public.audit_events,
  public.trusted_devices,
  public.karon_schema_migrations
from public, anon, authenticated;

alter table public.karon_schema_migrations enable row level security;
alter table public.karon_schema_migrations force row level security;

revoke all on function public.create_clinic(text) from public, anon;
revoke all on function public.current_membership() from public, anon;
revoke all on function public.register_my_session() from public, anon;
revoke all on function public.touch_my_session() from public, anon;
revoke all on function public.has_active_session() from public, anon;
revoke all on function public.session_mfa_ok() from public, anon;
revoke all on function public.issue_device_trust(text) from public, anon;
revoke all on function public.redeem_device_trust(text) from public, anon;
revoke all on function public.revoke_clinic_session(uuid) from public, anon;
revoke all on function public.revoke_removed_member_sessions(uuid) from public, anon;
revoke all on function public.revoke_other_devices() from public, anon;
revoke all on function public.revoke_trusts_after_password_change() from public, anon;

grant execute on function public.create_clinic(text) to authenticated;
grant execute on function public.current_membership() to authenticated;
grant execute on function public.register_my_session() to authenticated;
grant execute on function public.touch_my_session() to authenticated;
grant execute on function public.has_active_session() to authenticated;
grant execute on function public.session_mfa_ok() to authenticated;
grant execute on function public.issue_device_trust(text) to authenticated;
grant execute on function public.redeem_device_trust(text) to authenticated;
grant execute on function public.revoke_clinic_session(uuid) to authenticated;
grant execute on function public.revoke_removed_member_sessions(uuid) to authenticated;
grant execute on function public.revoke_other_devices() to authenticated;
grant execute on function public.revoke_trusts_after_password_change() to authenticated;

revoke all on function public.rls_auto_enable() from public, anon, authenticated;

create or replace function private.current_user_id()
returns uuid
language sql
stable
set search_path = ''
as $$
  select (select auth.uid());
$$;

alter default privileges in schema public
  revoke all on tables from public, anon;

alter default privileges in schema public
  revoke all on functions from public, anon;

notify pgrst, 'reload schema';
