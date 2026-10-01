import { describe, expect, it, vi } from "vitest";

import { TURNSTILE_SITEVERIFY_URL, verifyLeadTurnstile } from "./lead-turnstile";

describe("lead Turnstile verification", () => {
  it("allows an unset secret only in a local environment", async () => {
    await expect(verifyLeadTurnstile({ secret: "", local: true })).resolves.toBe(true);
    await expect(verifyLeadTurnstile({ secret: "", local: false })).resolves.toBe(false);
  });

  it("fails closed and sends the trusted remote address to Siteverify", async () => {
    const fetchImpl = vi.fn(async (input: string, init?: RequestInit) => {
      void input;
      void init;
      return new Response(JSON.stringify({ success: true }));
    });

    await expect(verifyLeadTurnstile({
      token: "valid-token",
      remoteIp: "203.0.113.8",
      secret: "secret",
      local: false,
      fetchImpl
    })).resolves.toBe(true);
    expect(fetchImpl).toHaveBeenCalledWith(
      TURNSTILE_SITEVERIFY_URL,
      expect.objectContaining({
        body: expect.objectContaining({})
      })
    );
    const requestBody = fetchImpl.mock.calls[0]?.[1]?.body;
    expect(requestBody).toBeInstanceOf(URLSearchParams);
    expect((requestBody as URLSearchParams).get("remoteip")).toBe("203.0.113.8");

    fetchImpl.mockRejectedValueOnce(new Error("offline"));
    await expect(verifyLeadTurnstile({
      token: "valid-token",
      secret: "secret",
      local: false,
      fetchImpl
    })).resolves.toBe(false);
  });
});
