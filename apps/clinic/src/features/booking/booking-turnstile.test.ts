import { describe, expect, it, vi } from "vitest";

import { TURNSTILE_SITEVERIFY_URL, verifyTurnstileToken } from "./booking-turnstile";

describe("verifyTurnstileToken", () => {
  it("skips Siteverify when the secret is unset outside production", async () => {
    await expect(
      verifyTurnstileToken({ token: undefined, secret: "", production: false })
    ).resolves.toBe(true);
  });

  it("fails closed in production when the secret or token is missing", async () => {
    await expect(
      verifyTurnstileToken({ token: "tok", secret: "", production: true })
    ).resolves.toBe(false);
    await expect(
      verifyTurnstileToken({ token: undefined, secret: "secret", production: true })
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
        production: true,
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
        production: true,
        fetchImpl
      })
    ).resolves.toBe(false);
  });
});
