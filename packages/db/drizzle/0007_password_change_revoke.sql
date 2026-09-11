-- Password change: any signed-in user can drop their device trusts and other
-- sessions without aal2 (recovery is aal1). Keep the current GoTrue session.

alter table public.audit_events drop constraint audit_events_type_check;

alter table public.audit_events
  add constraint audit_events_type_check check (
    event_type in (
      'clinic.created',
      'auth.signup',
      'auth.login',
      'auth.mfa_enrolled',
      'auth.session_revoked',
      'auth.idle_lock',
      'auth.password_changed',
      'member.invited',
      'member.removed',
      'access.denied'
    )
  );

create or replace function public.revoke_trusts_after_password_change()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := (select auth.uid());
  v_session uuid;
begin
  if v_caller is null then
    raise exception 'not authenticated';
  end if;

  v_session := nullif((select auth.jwt() ->> 'session_id'), '')::uuid;

  if v_session is null then
    raise exception 'missing session';
  end if;

  update public.clinic_sessions
  set revoked_at = now()
  where user_id = v_caller
    and session_id is distinct from v_session
    and revoked_at is null;

  update public.trusted_devices
  set revoked_at = now()
  where user_id = v_caller
    and revoked_at is null;

  delete from auth.sessions
  where user_id = v_caller
    and id is distinct from v_session;

  return true;
end;
$$;

revoke all on function public.revoke_trusts_after_password_change() from public;
grant execute on function public.revoke_trusts_after_password_change() to authenticated;

notify pgrst, 'reload schema';
