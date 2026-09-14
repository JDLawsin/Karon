import { describe, expect, it } from "vitest";

import {
  bookingIdempotencyKeySchema,
  bookingReplayMatches,
  bookingTurnstileTokenOf,
  isBookingHoneypotFilled
} from "./booking-schemas";

describe("isBookingHoneypotFilled", () => {
  it("rejects a filled website field", () => {
    expect(isBookingHoneypotFilled({ website: "https://spam.example" })).toBe(true);
    expect(isBookingHoneypotFilled({ website: "  " })).toBe(false);
    expect(isBookingHoneypotFilled({ name: "Ana" })).toBe(false);
    expect(isBookingHoneypotFilled({ website: 1 })).toBe(true);
  });
});

describe("bookingTurnstileTokenOf", () => {
  it("reads a string token and ignores other shapes", () => {
    expect(bookingTurnstileTokenOf({ turnstileToken: "tok" })).toBe("tok");
    expect(bookingTurnstileTokenOf({ turnstileToken: 1 })).toBeUndefined();
    expect(bookingTurnstileTokenOf({})).toBeUndefined();
  });
});

describe("bookingReplayMatches", () => {
  it("matches the same slot, service, and mobile", () => {
    const existing = {
      starts_at: "2026-09-14T01:00:00.000Z",
      service_id: "prophy",
      mobile: "09171234567"
    };

    expect(
      bookingReplayMatches(existing, {
        startsAt: "2026-09-14T01:00:00.000Z",
        serviceId: "prophy",
        mobile: "09171234567"
      })
    ).toBe(true);
    expect(
      bookingReplayMatches(existing, {
        startsAt: "2026-09-14T01:30:00.000Z",
        serviceId: "prophy",
        mobile: "09171234567"
      })
    ).toBe(false);
  });
});

describe("bookingIdempotencyKeySchema", () => {
  it("accepts a uuid", () => {
    expect(bookingIdempotencyKeySchema.safeParse("not-a-uuid").success).toBe(false);
    expect(
      bookingIdempotencyKeySchema.safeParse("11111111-1111-4111-8111-111111111111").success
    ).toBe(true);
  });
});
