import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createAdminSupabase: vi.fn(),
  createBillingStore: vi.fn(),
  createConfiguredPaymentGateway: vi.fn(),
  getBillingConfig: vi.fn(),
  getClinicAccess: vi.fn(),
  startBillingCheckout: vi.fn(),
  writeAuditEvent: vi.fn()
}));

vi.mock("@/lib/auth/clinic-access", () => ({
  getClinicAccess: mocks.getClinicAccess
}));

vi.mock("@/lib/auth/audit", () => ({
  writeAuditEvent: mocks.writeAuditEvent
}));

vi.mock("@/lib/billing/billing-config", () => ({
  createConfiguredPaymentGateway: mocks.createConfiguredPaymentGateway,
  getBillingConfig: mocks.getBillingConfig
}));

vi.mock("@/lib/billing/billing-store", () => ({
  BillingCheckoutRateLimitedError: class extends Error {},
  createBillingStore: mocks.createBillingStore
}));

vi.mock("@/lib/billing/checkout-service", () => ({
  startBillingCheckout: mocks.startBillingCheckout
}));

vi.mock("@/lib/server-env", () => ({
  clinicAppOrigin: () => "https://clinic.example",
  clinicAppUrl: (path: string) => new URL(path, "https://clinic.example")
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminSupabase: mocks.createAdminSupabase
}));

import { POST } from "./route";

const request = (
  origin = "https://clinic.example",
  body: BodyInit = new URLSearchParams({ interval: "monthly" }),
  contentType = "application/x-www-form-urlencoded"
) =>
  new Request("https://clinic.example/api/billing/checkout", {
    method: "POST",
    headers: {
      "Content-Type": contentType,
      Origin: origin
    },
    body
  });

describe("POST /api/billing/checkout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.writeAuditEvent.mockResolvedValue({ error: null });
  });

  it("returns 403 and audits when an assistant opens Pay Karon", async () => {
    const supabase = {};
    mocks.getClinicAccess.mockResolvedValue({
      userId: "assistant-1",
      aal: "aal1",
      mfaOk: true,
      sessionActive: true,
      membership: { tenantId: "clinic-1", role: "assistant" },
      supabase
    });

    const response = await POST(request());

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Forbidden" });
    expect(mocks.writeAuditEvent).toHaveBeenCalledWith(supabase, {
      tenantId: "clinic-1",
      actorUserId: "assistant-1",
      eventType: "access.denied"
    });
  });

  it("returns 401 before exposing checkout to an anonymous caller", async () => {
    mocks.getClinicAccess.mockResolvedValue({
      userId: null,
      aal: null,
      mfaOk: false,
      sessionActive: false,
      membership: null,
      supabase: {}
    });

    const response = await POST(request());

    expect(response.status).toBe(401);
    expect(mocks.writeAuditEvent).not.toHaveBeenCalled();
  });

  it("rejects a cross-origin owner request", async () => {
    mocks.getClinicAccess.mockResolvedValue({
      userId: "owner-1",
      aal: "aal2",
      mfaOk: true,
      sessionActive: true,
      membership: { tenantId: "clinic-1", role: "owner" },
      supabase: {}
    });

    const response = await POST(request("https://attacker.example"));

    expect(response.status).toBe(403);
  });

  it("rejects an owner whose Karon session is no longer active", async () => {
    mocks.getClinicAccess.mockResolvedValue({
      userId: "owner-1",
      aal: "aal2",
      mfaOk: true,
      sessionActive: false,
      membership: { tenantId: "clinic-1", role: "owner" },
      supabase: {}
    });

    const response = await POST(request());

    expect(response.status).toBe(403);
    expect(mocks.getBillingConfig).not.toHaveBeenCalled();
    expect(mocks.createAdminSupabase).not.toHaveBeenCalled();
    expect(mocks.startBillingCheckout).not.toHaveBeenCalled();
  });

  it("rejects an oversized checkout body before billing work", async () => {
    mocks.getClinicAccess.mockResolvedValue({
      userId: "owner-1",
      aal: "aal2",
      mfaOk: true,
      sessionActive: true,
      membership: { tenantId: "clinic-1", role: "owner" },
      supabase: {}
    });

    const response = await POST(request("https://clinic.example", "x".repeat(1_024)));

    expect(response.status).toBe(413);
    expect(mocks.getBillingConfig).not.toHaveBeenCalled();
    expect(mocks.createAdminSupabase).not.toHaveBeenCalled();
    expect(mocks.startBillingCheckout).not.toHaveBeenCalled();
  });

  it("rejects a content type with a URL-encoded lookalike suffix", async () => {
    mocks.getClinicAccess.mockResolvedValue({
      userId: "owner-1",
      aal: "aal2",
      mfaOk: true,
      sessionActive: true,
      membership: { tenantId: "clinic-1", role: "owner" },
      supabase: {}
    });

    const response = await POST(
      request(
        "https://clinic.example",
        new URLSearchParams({ interval: "monthly" }),
        "application/x-www-form-urlencoded-malformed"
      )
    );

    expect(response.status).toBe(415);
    expect(mocks.getBillingConfig).not.toHaveBeenCalled();
    expect(mocks.createAdminSupabase).not.toHaveBeenCalled();
    expect(mocks.startBillingCheckout).not.toHaveBeenCalled();
  });
});
