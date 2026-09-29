import { createHmac } from "node:crypto";

import { afterEach, describe, expect, it, vi } from "vitest";

import { MAX_WEBHOOK_BYTES, POST } from "./route";

const webhookSecret = "whsk_test_route_secret";

const webhookRequest = (rawBody: string, signature?: string) =>
  new Request("https://clinic.example/api/webhooks/paymongo", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(signature ? { "Paymongo-Signature": signature } : {})
    },
    body: rawBody
  });

const sign = (rawBody: string, timestamp: number) =>
  createHmac("sha256", webhookSecret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");

describe("POST /api/webhooks/paymongo", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects a forged PayMongo signature", async () => {
    vi.stubEnv("PAYMONGO_SECRET_KEY", "sk_test_route_secret");
    vi.stubEnv("PAYMONGO_WEBHOOK_SECRET", webhookSecret);
    const now = Math.floor(Date.now() / 1000);
    const response = await POST(
      webhookRequest(
        '{"data":{"id":"evt_forged"}}',
        `t=${now},te=${"0".repeat(64)},li=`
      )
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid signature."
    });
  });

  it("rejects a missing signature before reading billing configuration", async () => {
    const response = await POST(webhookRequest("{}"));

    expect(response.status).toBe(401);
  });

  it("rejects an oversized body before parsing it", async () => {
    const response = await POST(
      webhookRequest("x".repeat(MAX_WEBHOOK_BYTES + 1), "t=0,te=invalid,li=")
    );

    expect(response.status).toBe(413);
  });

  it("rejects a signed malformed event envelope", async () => {
    vi.stubEnv("PAYMONGO_SECRET_KEY", "sk_test_route_secret");
    vi.stubEnv("PAYMONGO_WEBHOOK_SECRET", webhookSecret);
    const rawBody = '{"unexpected":true}';
    const now = Math.floor(Date.now() / 1000);
    const response = await POST(
      webhookRequest(rawBody, `t=${now},te=${sign(rawBody, now)},li=`)
    );

    expect(response.status).toBe(400);
  });
});
