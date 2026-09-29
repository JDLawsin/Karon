import { createHmac } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import {
  createPayMongoGateway,
  parsePayMongoWebhook,
  verifyPayMongoSignature
} from "./paymongo";

const webhookSecret = "whsk_test_secret";
const nowSeconds = 1_796_000_000;

const sign = (rawBody: string, timestamp = nowSeconds) =>
  createHmac("sha256", webhookSecret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");

describe("verifyPayMongoSignature", () => {
  it("accepts a current test-mode signature over the untouched body", () => {
    const rawBody = '{"data":{"id":"evt_123"}}';

    expect(
      verifyPayMongoSignature({
        rawBody,
        signatureHeader: `t=${nowSeconds},te=${sign(rawBody)},li=`,
        secret: webhookSecret,
        mode: "test",
        now: nowSeconds * 1000
      })
    ).toBe(true);
  });

  it("rejects forged, stale, and wrong-mode signatures", () => {
    const rawBody = '{"data":{"id":"evt_123"}}';
    const signature = sign(rawBody);

    expect(
      verifyPayMongoSignature({
        rawBody,
        signatureHeader: `t=${nowSeconds},te=${"0".repeat(64)},li=`,
        secret: webhookSecret,
        mode: "test",
        now: nowSeconds * 1000
      })
    ).toBe(false);
    expect(
      verifyPayMongoSignature({
        rawBody,
        signatureHeader: `t=${nowSeconds - 301},te=${sign(rawBody, nowSeconds - 301)},li=`,
        secret: webhookSecret,
        mode: "test",
        now: nowSeconds * 1000
      })
    ).toBe(false);
    expect(
      verifyPayMongoSignature({
        rawBody,
        signatureHeader: `t=${nowSeconds},te=${signature},li=`,
        secret: webhookSecret,
        mode: "live",
        now: nowSeconds * 1000
      })
    ).toBe(false);
  });
});

describe("parsePayMongoWebhook", () => {
  it("normalizes a paid checkout without retaining billing details", () => {
    const rawBody = JSON.stringify({
      data: {
        id: "evt_paid_123",
        type: "event",
        attributes: {
          type: "checkout_session.payment.paid",
          livemode: false,
          created_at: nowSeconds,
          data: {
            id: "cs_123",
            type: "checkout_session",
            attributes: {
              reference_number: "11111111-1111-4111-8111-111111111111",
              billing: {
                email: "owner@example.com",
                name: "Clinic owner"
              },
              payment_intent: {
                attributes: { amount: 69_900, currency: "PHP" }
              }
            }
          }
        }
      }
    });

    expect(parsePayMongoWebhook(rawBody)).toEqual({
      id: "evt_paid_123",
      providerEventType: "checkout_session.payment.paid",
      type: "payment_succeeded",
      checkoutId: "11111111-1111-4111-8111-111111111111",
      providerCheckoutId: "cs_123",
      occurredAt: new Date(nowSeconds * 1000).toISOString(),
      livemode: false,
      amountMinor: 69_900,
      currency: "PHP"
    });
  });

  it("ignores event types outside Karon billing", () => {
    expect(
      parsePayMongoWebhook(
        JSON.stringify({
          data: {
            id: "evt_refund_123",
            type: "event",
            attributes: {
              type: "refund.succeeded",
              livemode: false,
              created_at: nowSeconds,
              data: { id: "ref_123", type: "refund", attributes: {} }
            }
          }
        })
      )
    ).toEqual({
      id: "evt_refund_123",
      providerEventType: "refund.succeeded",
      type: "ignored",
      occurredAt: new Date(nowSeconds * 1000).toISOString(),
      livemode: false
    });
  });

  it("normalizes a failed renewal only when it carries Karon correlation", () => {
    const rawBody = JSON.stringify({
      data: {
        id: "evt_failed_123",
        type: "event",
        attributes: {
          type: "payment.failed",
          livemode: false,
          created_at: nowSeconds,
          data: {
            id: "pay_123",
            type: "payment",
            attributes: {
              metadata: {
                karon_checkout_id: "11111111-1111-4111-8111-111111111111"
              }
            }
          }
        }
      }
    });

    expect(parsePayMongoWebhook(rawBody)).toEqual({
      id: "evt_failed_123",
      providerEventType: "payment.failed",
      type: "payment_failed",
      checkoutId: "11111111-1111-4111-8111-111111111111",
      occurredAt: new Date(nowSeconds * 1000).toISOString(),
      livemode: false
    });
  });
});

describe("createPayMongoGateway", () => {
  it("creates a V2 hosted checkout from trusted server inputs", async () => {
    const fetcher = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: {
            id: "cs_123",
            type: "checkout_session",
            attributes: {
              checkout_url: "https://checkout.paymongo.com/cs_123",
              livemode: false
            }
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    const gateway = createPayMongoGateway({
      secretKey: "sk_test_secret",
      webhookSecret,
      paymentMethodTypes: ["card", "gcash"],
      fetcher
    });

    await expect(
      gateway.createCheckout({
        checkoutId: "11111111-1111-4111-8111-111111111111",
        interval: "monthly",
        amountMinor: 69_900,
        currency: "PHP",
        skuName: "Karon clinic",
        successUrl: "https://clinic.example/billing?checkout=returned",
        cancelUrl: "https://clinic.example/billing?checkout=cancelled"
      })
    ).resolves.toEqual({
      providerCheckoutId: "cs_123",
      checkoutUrl: "https://checkout.paymongo.com/cs_123",
      livemode: false
    });

    expect(fetcher).toHaveBeenCalledWith(
      "https://api.paymongo.com/v2/checkout_sessions",
      expect.objectContaining({
        method: "POST",
        signal: expect.any(AbortSignal),
        headers: expect.objectContaining({
          Authorization: `Basic ${Buffer.from("sk_test_secret:").toString("base64")}`,
          "Idempotency-Key": "karon-checkout-11111111-1111-4111-8111-111111111111"
        })
      })
    );
    const request = fetcher.mock.calls[0]?.[1];
    const body = JSON.parse(String(request?.body));
    expect(body.data.attributes).toEqual(
      expect.objectContaining({
        reference_number: "11111111-1111-4111-8111-111111111111",
        metadata: {
          karon_checkout_id: "11111111-1111-4111-8111-111111111111",
          karon_interval: "monthly"
        }
      })
    );
  });
});
