import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { applyBillingWebhook, createBillingStore } from "./billing-store";

describe("createBillingStore", () => {
  it("reserves checkout capacity through the service-only database function", async () => {
    const rpc = vi.fn(async () => ({
      data: "11111111-1111-4111-8111-111111111111",
      error: null
    }));
    const store = createBillingStore({ rpc } as unknown as SupabaseClient);

    await expect(
      store.reserve({
        tenantId: "22222222-2222-4222-8222-222222222222",
        actorUserId: "33333333-3333-4333-8333-333333333333",
        provider: "paymongo",
        interval: "monthly",
        amountMinor: 69_900,
        currency: "PHP",
        livemode: false
      })
    ).resolves.toBe("11111111-1111-4111-8111-111111111111");

    expect(rpc).toHaveBeenCalledWith("reserve_billing_checkout", {
      p_tenant_id: "22222222-2222-4222-8222-222222222222",
      p_actor_user_id: "33333333-3333-4333-8333-333333333333",
      p_provider: "paymongo",
      p_interval: "monthly",
      p_amount_minor: 69_900,
      p_currency_code: "PHP",
      p_livemode: false
    });
  });
});

describe("applyBillingWebhook", () => {
  it("stores only a payload hash and normalized event fields", async () => {
    const rpc = vi.fn(async () => ({ data: "processed", error: null }));
    const admin = { rpc } as unknown as SupabaseClient;

    await expect(
      applyBillingWebhook(admin, {
        provider: "paymongo",
        rawBody: '{"private":"payload"}',
        event: {
          id: "evt_123",
          providerEventType: "checkout_session.payment.paid",
          type: "payment_succeeded",
          checkoutId: "11111111-1111-4111-8111-111111111111",
          providerCheckoutId: "cs_123",
          occurredAt: "2026-09-28T00:00:00.000Z",
          livemode: false,
          amountMinor: 69_900,
          currency: "PHP"
        }
      })
    ).resolves.toBe("processed");

    expect(rpc).toHaveBeenCalledWith(
      "apply_billing_webhook",
      expect.objectContaining({
        p_provider: "paymongo",
        p_provider_event_id: "evt_123",
        p_event_type: "checkout_session.payment.paid",
        p_event_kind: "payment_succeeded",
        p_checkout_id: "11111111-1111-4111-8111-111111111111",
        p_payload_sha256:
          "c3502de1340e6115160646fc740545af0ce620c4c71fc5f4415a7d6cb9ae1f62"
      })
    );
    expect(JSON.stringify(rpc.mock.calls[0])).not.toContain("private");
  });
});
