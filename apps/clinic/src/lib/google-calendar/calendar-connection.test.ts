import { describe, expect, it } from "vitest";

import { nextConnectionRow } from "./calendar-connection";

const USER = "11111111-1111-4111-8111-111111111111";
const NOW = "2026-09-13T12:00:00.000Z";
const PAGE = {
  name: "Cleaning",
  url: "https://calendar.google.com/calendar/appointments/schedules/AcZssZ0abc123XYZ",
  scheduleKey: "AcZssZ0abc123XYZ"
};

describe("nextConnectionRow", () => {
  it("defaults primary calendar and no booking pages for a new connection", () => {
    expect(
      nextConnectionRow(null, {
        refreshToken: "enc-new",
        userId: USER,
        updatedAt: NOW
      })
    ).toEqual({
      calendar_id: "primary",
      booking_pages: [],
      connected_by: USER,
      encrypted_refresh_token: "enc-new",
      updated_at: NOW
    });
  });

  it("keeps the selected calendar and booking pages on reconnect", () => {
    expect(
      nextConnectionRow(
        {
          calendar_id: "clinic@group.calendar.google.com",
          booking_pages: [PAGE]
        },
        {
          refreshToken: "enc-again",
          userId: USER,
          updatedAt: NOW
        }
      )
    ).toEqual({
      calendar_id: "clinic@group.calendar.google.com",
      booking_pages: [PAGE],
      connected_by: USER,
      encrypted_refresh_token: "enc-again",
      updated_at: NOW
    });
  });
});
