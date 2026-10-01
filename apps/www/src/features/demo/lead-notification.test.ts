import { afterEach, describe, expect, it, vi } from "vitest";

import { notifyLead } from "./lead-notification";

describe("lead notification", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses a stable record-derived idempotency key", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-key");
    vi.stubEnv("LEAD_NOTIFICATION_TO", "joshua@example.test");
    vi.stubEnv("LEAD_NOTIFICATION_FROM", "Karon <leads@example.test>");
    vi.stubEnv("LEAD_RECORDS_URL", "https://records.example.test/leads/");
    const fetchImpl = vi.fn(async () => new Response(null, { status: 202 }));

    await notifyLead({
      id: "725b524a-cc20-447b-b0cb-18cf1f093549",
      name: "Dr Ana Cruz",
      clinicName: "Cruz Dental",
      city: "Cebu City"
    }, fetchImpl);

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        headers: expect.objectContaining({
          "Idempotency-Key": "lead/725b524a-cc20-447b-b0cb-18cf1f093549"
        })
      })
    );
  });
});
