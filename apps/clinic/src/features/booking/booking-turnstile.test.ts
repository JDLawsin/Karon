import { describe, expect, it, vi } from "vitest";

import { TURNSTILE_SITEVERIFY_URL, verifyTurnstileToken } from "./booking-turnstile";

describe("verifyTurnstileToken", () => {
  it("skips Siteverify only outside production when the secret is unset", async () => {
    await expect(
      verifyTurnstileToken({ token: undefined, secret: "", production: false })
    ).resolves.toBe(true);
    await expect(
      verifyTurnstileToken({ token: "tok", secret: "", production: true })
    ).resolves.toBe(false);
  });

  it("fails closed when Turnstile is configured and the token is missing", async () => {
    await expect(
      verifyTurnstileToken({ token: undefined, secret: "secret" })
    ).resolves.toBe(false);
  });

  it("returns Siteverify success", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ success: true }), { status: 200 })
    );

    await expect(
      verifyTurnstileToken({
        token: "tok",
        secret: "secret",
        fetchImpl
      })
    ).resolves.toBe(true);
    expect(fetchImpl).toHaveBeenCalledWith(
      TURNSTILE_SITEVERIFY_URL,
      expect.objectContaining({ method: "POST" })
    );
  });

  it("rejects a failed Siteverify response", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ success: false }), { status: 200 })
    );

    await expect(
      verifyTurnstileToken({
        token: "tok",
        secret: "secret",
        fetchImpl
      })
    ).resolves.toBe(false);
  });
});
