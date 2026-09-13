import { describe, expect, it } from "vitest";

import { parseBookingPageUrl, shouldImportGoogleEvent } from "./booking-page";

const SCHEDULE_KEY = "AcZssZ0abc123XYZ";
const LONG_URL = `https://calendar.google.com/calendar/appointments/schedules/${SCHEDULE_KEY}`;
const USER_URL = `https://calendar.google.com/calendar/u/0/appointments/schedules/${SCHEDULE_KEY}`;

describe("parseBookingPageUrl", () => {
  it("reads the schedule key from a long booking-page URL", () => {
    expect(parseBookingPageUrl(LONG_URL)).toEqual({
      url: LONG_URL,
      scheduleKey: SCHEDULE_KEY
    });
  });

  it("reads the schedule key from a /u/0/ booking-page URL", () => {
    expect(parseBookingPageUrl(USER_URL)).toEqual({
      url: USER_URL,
      scheduleKey: SCHEDULE_KEY
    });
  });

  it("rejects other hosts and paths that are not a booking page", () => {
    expect(
      parseBookingPageUrl(
        `https://example.com/appointments/schedules/${SCHEDULE_KEY}`
      )
    ).toBeNull();
    expect(parseBookingPageUrl("https://calendar.google.com/calendar/r")).toBeNull();
    expect(
      parseBookingPageUrl("https://calendar.google.com/calendar/appointments/schedules/")
    ).toBeNull();
  });
});

const CLEANING_PAGE = {
  name: "Cleaning",
  url: LONG_URL,
  scheduleKey: SCHEDULE_KEY
};
const OTHER_PAGE = {
  name: "Consult",
  url: "https://calendar.google.com/calendar/appointments/schedules/AcZssZ9otherKEY",
  scheduleKey: "AcZssZ9otherKEY"
};
const guest = [
  { email: "clinic@example.com", organizer: true, self: true },
  { email: "patient@example.com" }
];

describe("shouldImportGoogleEvent", () => {
  it("imports nothing when no booking pages are selected", () => {
    expect(
      shouldImportGoogleEvent(
        {
          eventType: "default",
          attendees: guest,
          description: `Booked from ${LONG_URL}`
        },
        []
      )
    ).toBe(false);
  });

  it("imports a guest booking whose description contains the selected schedule key", () => {
    expect(
      shouldImportGoogleEvent(
        {
          eventType: "default",
          attendees: guest,
          description: `Booked appointment\n${LONG_URL}`
        },
        [CLEANING_PAGE]
      )
    ).toBe(true);
  });

  it("skips a guest booking from a different booking page", () => {
    expect(
      shouldImportGoogleEvent(
        {
          eventType: "default",
          attendees: guest,
          description: `Booked appointment\n${OTHER_PAGE.url}`
        },
        [CLEANING_PAGE]
      )
    ).toBe(false);
  });

  it("skips availability blocks that mention the schedule but have no guest", () => {
    expect(
      shouldImportGoogleEvent(
        {
          eventType: "default",
          description: `Appointment schedule ${LONG_URL}`
        },
        [CLEANING_PAGE]
      )
    ).toBe(false);
  });

  it("imports a cancelled booking from a selected page so sync can drop it", () => {
    expect(
      shouldImportGoogleEvent(
        {
          eventType: "default",
          status: "cancelled",
          description: LONG_URL
        },
        [CLEANING_PAGE]
      )
    ).toBe(true);
  });

  it("does not import a keyword-only event once pages are configured", () => {
    expect(
      shouldImportGoogleEvent(
        {
          eventType: "default",
          description: "This event was created from a booking page"
        },
        [CLEANING_PAGE]
      )
    ).toBe(false);
  });
});
