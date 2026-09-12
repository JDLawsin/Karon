import { describe, expect, it } from "vitest";

import { isGoogleBookingEvent } from "./google-booking-event";

describe("isGoogleBookingEvent", () => {
  it("accepts appointment bookings with a guest attendee", () => {
    expect(
      isGoogleBookingEvent({
        eventType: "default",
        attendees: [
          { email: "clinic@example.com", organizer: true, self: true },
          { email: "patient@example.com", displayName: "Pat" }
        ]
      })
    ).toBe(true);
  });

  it("rejects personal events without guest attendees", () => {
    expect(
      isGoogleBookingEvent({
        eventType: "default",
        summary: "Team lunch",
        attendees: [{ email: "clinic@example.com", organizer: true, self: true }]
      })
    ).toBe(false);
  });

  it("rejects automatic out-of-office blocks", () => {
    expect(
      isGoogleBookingEvent({
        eventType: "outOfOffice",
        summary: "OOO"
      })
    ).toBe(false);
  });
});
