import { describe, expect, it } from "vitest";

import {
  BOOKING_POST_IP_LIMIT,
  BOOKING_POST_WINDOW_MS,
  isPublicBookingPostLimited
} from "./booking-rate-limit";

const requestFor = (ip: string) =>
  new Request("http://localhost/api/book/demo", {
    headers: { "x-forwarded-for": ip }
  });

describe("isPublicBookingPostLimited", () => {
  it("allows a burst then blocks the same IP and slug", () => {
    const start = 1_000_000;
    const slug = `slug-${start}`;
    const request = requestFor(`203.0.113.${start % 200}`);

    for (let i = 0; i < BOOKING_POST_IP_LIMIT; i += 1) {
      expect(isPublicBookingPostLimited(request, slug, start + i)).toBe(false);
    }

    expect(isPublicBookingPostLimited(request, slug, start + BOOKING_POST_IP_LIMIT)).toBe(
      true
    );
  });

  it("allows the same IP again after the window", () => {
    const start = 2_000_000;
    const slug = `slug-${start}`;
    const request = requestFor("198.51.100.9");

    for (let i = 0; i < BOOKING_POST_IP_LIMIT; i += 1) {
      isPublicBookingPostLimited(request, slug, start);
    }

    expect(isPublicBookingPostLimited(request, slug, start + BOOKING_POST_WINDOW_MS)).toBe(
      false
    );
  });
});
