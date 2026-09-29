import { describe, expect, it } from "vitest";

import {
  parseBillingConfig,
  parsePayMongoWebhookConfig,
  publicBillingConfig
} from "./billing-config";

describe("parseBillingConfig", () => {
  it("keeps checkout closed when the release flag is not explicitly enabled", () => {
    expect(parseBillingConfig({})).toEqual({ checkoutEnabled: false });
  });

  it("fails closed when an enabled checkout is missing price or secrets", () => {
    expect(() =>
      parseBillingConfig({ BILLING_PUBLIC_CHECKOUT_ENABLED: "true" })
    ).toThrow("Invalid billing configuration");
  });

  it("parses one SKU without exposing gateway secrets to the UI", () => {
    const config = parseBillingConfig({
      BILLING_PUBLIC_CHECKOUT_ENABLED: "true",
      BILLING_PROVIDER: "paymongo",
      BILLING_SKU_NAME: "Karon clinic",
      BILLING_MONTHLY_PRICE_MINOR: "69900",
      BILLING_YEARLY_PRICE_MINOR: "699000",
      PAYMONGO_SECRET_KEY: "sk_test_secret",
      PAYMONGO_WEBHOOK_SECRET: "whsk_test_secret",
      PAYMONGO_PAYMENT_METHODS: "card,gcash"
    });

    expect(publicBillingConfig(config)).toEqual({
      checkoutEnabled: true,
      provider: "paymongo",
      skuName: "Karon clinic",
      prices: [
        { interval: "monthly", amountMinor: 69_900, currency: "PHP" },
        { interval: "yearly", amountMinor: 699_000, currency: "PHP" }
      ]
    });
    expect(JSON.stringify(publicBillingConfig(config))).not.toContain("secret");
  });

  it("keeps webhook verification independent from checkout rail settings", () => {
    expect(
      parsePayMongoWebhookConfig({
        PAYMONGO_SECRET_KEY: "sk_test_secret",
        PAYMONGO_WEBHOOK_SECRET: "whsk_test_secret"
      })
    ).toEqual({
      secretKey: "sk_test_secret",
      webhookSecret: "whsk_test_secret",
      livemode: false
    });
  });
});
