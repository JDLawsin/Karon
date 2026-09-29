import { describe, expect, it, vi } from "vitest";

import { PaymentGatewayUnavailableError } from "./payment-gateway";
import { startBillingCheckout } from "./checkout-service";

const checkoutId = "11111111-1111-4111-8111-111111111111";

describe("startBillingCheckout", () => {
  it("persists correlation before returning the provider URL", async () => {
    const reserve = vi.fn(async () => checkoutId);
    const complete = vi.fn(async () => true);
    const fail = vi.fn();
    const createCheckout = vi.fn(async () => ({
      providerCheckoutId: "cs_123",
      checkoutUrl: "https://checkout.paymongo.com/cs_123",
      livemode: false
    }));

    await expect(
      startBillingCheckout({
        tenantId: "22222222-2222-4222-8222-222222222222",
        actorUserId: "33333333-3333-4333-8333-333333333333",
        interval: "monthly",
        price: { interval: "monthly", amountMinor: 69_900, currency: "PHP" },
        skuName: "Karon clinic",
        successUrl: "https://clinic.example/billing?checkout=returned",
        cancelUrl: "https://clinic.example/billing?checkout=cancelled",
        gateway: { provider: "paymongo", createCheckout, parseWebhook: vi.fn() },
        livemode: false,
        store: { reserve, complete, fail }
      })
    ).resolves.toBe("https://checkout.paymongo.com/cs_123");

    expect(reserve).toHaveBeenCalledOnce();
    expect(createCheckout).toHaveBeenCalledWith(
      expect.objectContaining({ checkoutId, amountMinor: 69_900 })
    );
    expect(complete).toHaveBeenCalledWith(checkoutId, "cs_123");
    expect(fail).not.toHaveBeenCalled();
  });

  it("marks the reserved attempt failed when the gateway is unavailable", async () => {
    const reserve = vi.fn(async () => checkoutId);
    const complete = vi.fn();
    const fail = vi.fn(async () => true);

    await expect(
      startBillingCheckout({
        tenantId: "22222222-2222-4222-8222-222222222222",
        actorUserId: "33333333-3333-4333-8333-333333333333",
        interval: "monthly",
        price: { interval: "monthly", amountMinor: 69_900, currency: "PHP" },
        skuName: "Karon clinic",
        successUrl: "https://clinic.example/billing?checkout=returned",
        cancelUrl: "https://clinic.example/billing?checkout=cancelled",
        gateway: {
          provider: "paymongo",
          createCheckout: vi.fn(async () => {
            throw new PaymentGatewayUnavailableError("provider unavailable");
          }),
          parseWebhook: vi.fn()
        },
        livemode: false,
        store: { reserve, complete, fail }
      })
    ).rejects.toThrow(PaymentGatewayUnavailableError);

    expect(fail).toHaveBeenCalledWith(checkoutId);
    expect(complete).not.toHaveBeenCalled();
  });
});
