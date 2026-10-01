import { describe, expect, it, vi } from "vitest";
import { MarketingLeadRateLimitedError } from "@karon/db";

import { handleLeadPost } from "./lead-request";

const body = {
  submissionId: "4cf7f7e0-aa10-4fd8-bfff-a4c45d2ec112",
  intent: "application",
  name: "Dr Ana Cruz",
  clinicName: "Cruz Dental",
  country: "PH",
  province: "Cebu",
  city: "Cebu City",
  email: "ana@example.test",
  clinicSize: "1_chair",
  role: "owner_dentist",
  mobile: "09171234567",
  message: "",
  privacyAcknowledged: true,
  marketingOptIn: false,
  privacyNoticeVersion: "2026-09-30",
  marketingWordingVersion: "2026-09-30",
  sourcePage: "/demo",
  renderedAt: 1_000,
  turnstileToken: "valid-token",
  website: "",
  attribution: {}
};

const requestFor = (value: unknown, headers: Record<string, string> = {}) =>
  new Request("https://www.example.test/api/leads", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://www.example.test",
      "x-vercel-forwarded-for": "203.0.113.8",
      ...headers
    },
    body: JSON.stringify(value)
  });

const dependencies = () => ({
  now: () => new Date(10_000),
  origin: "https://www.example.test",
  rateLimitSecret: "rate-limit-secret",
  verifyTurnstile: vi.fn(async () => true),
  submitLead: vi.fn(async () => ({
    created: true,
    id: "725b524a-cc20-447b-b0cb-18cf1f093549",
    intent: "application" as const,
    clinic_size: "1_chair" as const
  })),
  notify: vi.fn(async () => undefined)
});

describe("POST /api/leads", () => {
  it("rejects cross-origin requests before writing", async () => {
    const deps = dependencies();
    const response = await handleLeadPost(
      requestFor(body, { origin: "https://attacker.example" }),
      deps
    );

    expect(response.status).toBe(403);
    expect(deps.submitLead).not.toHaveBeenCalled();
  });

  it("fails closed when Turnstile rejects the token", async () => {
    const deps = dependencies();
    deps.verifyTurnstile.mockResolvedValue(false);
    const response = await handleLeadPost(requestFor(body), deps);

    expect(response.status).toBe(400);
    expect(deps.submitLead).not.toHaveBeenCalled();
  });

  it("returns generic success without writing for honeypot and fast-fill bots", async () => {
    for (const value of [
      { ...body, website: "spam.example" },
      { ...body, renderedAt: 9_500 }
    ]) {
      const deps = dependencies();
      const response = await handleLeadPost(requestFor(value), deps);

      expect(response.status).toBe(200);
      expect(deps.submitLead).not.toHaveBeenCalled();
      expect(deps.notify).not.toHaveBeenCalled();
    }
  });

  it("writes once and returns the saved enums, never the URL intent", async () => {
    const deps = dependencies();
    const response = await handleLeadPost(
      new Request("https://www.example.test/api/leads?intent=demo", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://www.example.test",
          "x-vercel-forwarded-for": "203.0.113.8"
        },
        body: JSON.stringify(body)
      }),
      deps
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      submissionId: body.submissionId,
      intent: "application",
      clinicSize: "1_chair"
    });
    expect(deps.submitLead).toHaveBeenCalledOnce();
    expect(deps.notify).toHaveBeenCalledOnce();
  });

  it("retries notification delivery when the stored lead is replayed", async () => {
    const deps = dependencies();
    deps.submitLead
      .mockResolvedValueOnce({
        created: true,
        id: "725b524a-cc20-447b-b0cb-18cf1f093549",
        intent: "application",
        clinic_size: "1_chair"
      })
      .mockResolvedValueOnce({
        created: false,
        id: "725b524a-cc20-447b-b0cb-18cf1f093549",
        intent: "application",
        clinic_size: "1_chair",
        name: body.name,
        clinic_name: body.clinicName,
        city: body.city
      });
    deps.notify.mockRejectedValueOnce(new Error("Notification unavailable"));

    await expect(handleLeadPost(requestFor(body), deps)).resolves.toMatchObject({ status: 503 });
    await expect(handleLeadPost(requestFor(body), deps)).resolves.toMatchObject({ status: 200 });

    expect(deps.notify).toHaveBeenCalledTimes(2);
  });

  it("rejects payloads larger than 10 KB", async () => {
    const deps = dependencies();
    const response = await handleLeadPost(
      requestFor({ ...body, message: "x".repeat(11_000) }),
      deps
    );

    expect(response.status).toBe(413);
    expect(deps.submitLead).not.toHaveBeenCalled();
  });

  it("returns retry guidance when the shared limiter rejects the request", async () => {
    const deps = dependencies();
    deps.submitLead.mockRejectedValue(new MarketingLeadRateLimitedError());
    const response = await handleLeadPost(requestFor(body), deps);

    expect(response.status).toBe(429);
    expect(deps.notify).not.toHaveBeenCalled();
  });

  it("ignores spoofed X-Forwarded-For values when deriving limiter keys", async () => {
    const first = dependencies();
    const second = dependencies();
    await handleLeadPost(requestFor(body, { "x-forwarded-for": "198.51.100.1" }), first);
    await handleLeadPost(requestFor(body, { "x-forwarded-for": "192.0.2.10" }), second);

    expect(first.submitLead.mock.calls[0]?.[1]).toEqual(second.submitLead.mock.calls[0]?.[1]);
  });
});
