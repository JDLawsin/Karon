import { describe, expect, it, vi } from "vitest";

import {
  BOOKING_GET_IP_LIMIT,
  BOOKING_POST_IP_LIMIT,
  bookingClientKey,
  bookingRateLimitKeys,
  isPublicBookingLimited,
  type RateLimitHit
} from "./booking-rate-limit";

const requestFor = (vercelIp: string, spoofedIp = "198.51.100.99") =>
  new Request("http://localhost/api/book/demo", {
    headers: {
      "x-forwarded-for": spoofedIp,
      "x-real-ip": spoofedIp,
      "x-vercel-forwarded-for": vercelIp
    }
  });

const sharedHit = (): RateLimitHit => {
  const hits = new Map<string, number>();

  return async (key, _windowMinutes, limit) => {
    const next = (hits.get(key) ?? 0) + 1;
    hits.set(key, next);
    return next > limit;
  };
};

describe("public booking shared rate limit", () => {
  it("holds across callers that share the database-backed hit function", async () => {
    const hit = sharedHit();
    const request = requestFor("203.0.113.9");

    for (let index = 0; index < BOOKING_POST_IP_LIMIT; index += 1) {
      await expect(
        isPublicBookingLimited(request, "happytee1", "post", "secret", hit)
      ).resolves.toBe(false);
    }

    await expect(
      isPublicBookingLimited(request, "happytee1", "post", "secret", hit)
    ).resolves.toBe(true);
  });

  it("uses only Vercel's trusted forwarding header for the client key", () => {
    const first = requestFor("203.0.113.10", "1.1.1.1");
    const second = requestFor("203.0.113.10", "8.8.8.8");

    expect(bookingClientKey(first)).toBe("203.0.113.10");
    expect(bookingClientKey(second)).toBe("203.0.113.10");
    expect(bookingRateLimitKeys(first, "happytee1", "post", "secret")).toEqual(
      bookingRateLimitKeys(second, "happytee1", "post", "secret")
    );
  });

  it("keeps raw client IPs out of stored keys", () => {
    const keys = bookingRateLimitKeys(
      requestFor("203.0.113.11"),
      "happytee1",
      "post",
      "secret"
    );

    expect(keys.ip).not.toContain("203.0.113.11");
    expect(keys.slug).not.toContain("happytee1");
  });

  it("allows a larger read budget and propagates limiter errors", async () => {
    const request = requestFor("203.0.113.12");
    const hit = vi.fn<RateLimitHit>().mockRejectedValue(new Error("database unavailable"));

    expect(BOOKING_GET_IP_LIMIT).toBeGreaterThan(BOOKING_POST_IP_LIMIT);
    await expect(
      isPublicBookingLimited(request, "happytee1", "get", "secret", hit)
    ).rejects.toThrow("database unavailable");
  });
});
