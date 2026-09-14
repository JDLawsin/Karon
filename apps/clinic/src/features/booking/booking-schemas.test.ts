import { describe, expect, it } from "vitest";

import {
  bookableServicesOf,
  bookingIdempotencyKeySchema,
  bookingReplayMatches,
  bookingTurnstileTokenOf,
  isBookingHoneypotFilled,
  publicBookingPageSchema
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

describe("bookableServicesOf", () => {
  it("keeps valid clinic_services rows and drops invalid ones", () => {
    expect(
      bookableServicesOf([
        {
          id: "11111111-1111-4111-8111-111111111111",
          name: "  Cleaning "
        },
        { id: "bad", name: "Skip" },
        { name: "No id" }
      ])
    ).toEqual([
      {
        id: "11111111-1111-4111-8111-111111111111",
        name: "Cleaning"
      }
    ]);
  });
});

describe("publicBookingPageSchema", () => {
  it("accepts clinic card fields", () => {
    const parsed = publicBookingPageSchema.safeParse({
      clinicName: "Happy Teeth",
      timezone: "Asia/Manila",
      hoursLabel: "Mon–Sat, 9:00 am – 6:00 pm",
      phone: "09171234567",
      address: "123 Osmena Blvd, Cebu City",
      logoUrl: "https://example.com/logo.png",
      services: [{ id: "clean", name: "Cleaning" }],
      dates: ["2026-09-14"],
      date: "2026-09-14",
      slots: [
        {
          clock: "09:00",
          startsAt: "2026-09-14T01:00:00.000Z",
          label: "9:00 AM"
        }
      ]
    });

    expect(parsed.success).toBe(true);
  });

  it("allows a clinic with no address", () => {
    const parsed = publicBookingPageSchema.safeParse({
      clinicName: "Happy Teeth",
      timezone: "Asia/Manila",
      hoursLabel: "Mon–Fri, 9:00 am – 5:00 pm",
      phone: null,
      address: null,
      logoUrl: null,
      services: [],
      dates: [],
      date: null,
      slots: []
    });

    expect(parsed.success).toBe(true);
  });
});
