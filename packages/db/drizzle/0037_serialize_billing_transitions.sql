-- KR-018 follow-up: serialize entitlement changes for concurrent checkouts.

alter function public.apply_billing_webhook(
  text, text, text, text, uuid, text, boolean, integer, text,
  timestamptz, text, timestamptz
) rename to apply_billing_webhook_transition;

revoke all on function public.apply_billing_webhook_transition(
  text, text, text, text, uuid, text, boolean, integer, text,
  timestamptz, text, timestamptz
) from public, anon, authenticated, service_role;

create function public.apply_billing_webhook(
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
begin
  if p_checkout_id is not null then
    select * into v_checkout
    from public.billing_checkout_sessions as checkouts
    where checkouts.id = p_checkout_id
      and checkouts.provider = p_provider;

    if v_checkout.id is not null then
      perform pg_advisory_xact_lock(
        hashtextextended(v_checkout.tenant_id::text, 0)
      );

      if p_event_kind = 'payment_succeeded'
         and v_checkout.status <> 'paid'
         and v_checkout.livemode is not distinct from p_livemode
         and not (
           v_checkout.provider_checkout_id is not null
           and p_provider_checkout_id is not null
           and v_checkout.provider_checkout_id <> p_provider_checkout_id
         ) then
        update public.clinic_entitlements
        set source = 'billing',
            provider = p_provider,
            billing_checkout_id = p_checkout_id,
            updated_at = now()
        where tenant_id = v_checkout.tenant_id
          and source = 'manual';
      end if;
    end if;
  end if;

  return public.apply_billing_webhook_transition(
    p_provider,
    p_provider_event_id,
    p_event_type,
    p_event_kind,
    p_checkout_id,
    p_provider_checkout_id,
    p_livemode,
    p_amount_minor,
    p_currency_code,
    p_provider_occurred_at,
    p_payload_sha256,
    p_access_until
  );
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
