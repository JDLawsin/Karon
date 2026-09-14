import { describe, expect, it } from "vitest";

import { clinicLocalParts } from "@/features/today-board/project-today-board";
import type { ClinicEvent } from "@/lib/sync/event-schema";

import {
  bookableDates,
  bookingSlotsForDate,
  clinicHoursOf,
  instantFromClinicLocal,
  occupiedVisitStarts,
  offeredBookingSlot,
  visitOccupiesSlot
} from "./booking-slots";

const WEEKDAY_HOURS = {
  days: [1, 2, 3, 4, 5],
  open: "09:00",
  close: "12:00"
};

const visitEvent = (
  visitId: string,
  startsAt: string,
  status: "confirmed" | "cancelled" = "confirmed"
): ClinicEvent => ({
  id: "11111111-1111-4111-8111-111111111111",
  tenantId: "22222222-2222-4222-8222-222222222222",
  actorUserId: "33333333-3333-4333-8333-333333333333",
  recordId: visitId,
  occurredAt: startsAt,
  type: "appointment.set",
  payload: {
    patientId: "44444444-4444-4444-8444-444444444444",
    startsAt,
    status
  }
});

describe("clinicHoursOf", () => {
  it("reads working days with the huddle open/close window", () => {
    expect(clinicHoursOf({ days: [1, 6, 1], open: "09:00", close: "18:00" })).toEqual({
      days: [1, 6],
      open: "09:00",
      close: "18:00"
    });
  });

  it("rejects hours without a working day", () => {
    expect(clinicHoursOf({ days: [], open: "09:00", close: "18:00" })).toBeNull();
  });
});

describe("instantFromClinicLocal", () => {
  it("maps Manila wall time to UTC", () => {
    expect(instantFromClinicLocal("2026-09-14", "09:00", "Asia/Manila").toISOString()).toBe(
      "2026-09-14T01:00:00.000Z"
    );
  });

  it("keeps an explicit offset guess on a DST spring-forward date", () => {
    const instant = instantFromClinicLocal("2026-03-08", "03:30", "America/New_York");
    const parts = clinicLocalParts(instant, "America/New_York");

    expect(Number.isNaN(instant.getTime())).toBe(false);
    // ponytail: offset-guess is not Temporal; this pins today's mapping so DST drift is visible
    expect(`${parts.date} ${parts.time}`).toBe("2026-03-08 04:30");
  });
});

describe("bookingSlotsForDate", () => {
  it("lists 30-minute slots that end at close, skipping past and occupied times", () => {
    const now = new Date("2026-09-14T02:15:00.000Z");
    const occupied = [instantFromClinicLocal("2026-09-14", "11:00", "Asia/Manila").toISOString()];
    const slots = bookingSlotsForDate({
      date: "2026-09-14",
      hours: WEEKDAY_HOURS,
      timeZone: "Asia/Manila",
      occupied,
      now
    });

    expect(slots.map((slot) => slot.clock)).toEqual(["10:30", "11:30"]);
  });

  it("hides a grid slot when a walk-in falls inside it", () => {
    const now = new Date("2026-09-14T01:00:00.000Z");
    const occupied = [instantFromClinicLocal("2026-09-14", "10:15", "Asia/Manila").toISOString()];
    const slots = bookingSlotsForDate({
      date: "2026-09-14",
      hours: WEEKDAY_HOURS,
      timeZone: "Asia/Manila",
      occupied,
      now
    });

    expect(slots.map((slot) => slot.clock)).not.toContain("10:00");
    expect(slots.map((slot) => slot.clock)).toContain("10:30");
  });

  it("returns no slots on a closed weekday", () => {
    expect(
      bookingSlotsForDate({
        date: "2026-09-13",
        hours: WEEKDAY_HOURS,
        timeZone: "Asia/Manila",
        occupied: [],
        now: new Date("2026-09-13T01:00:00.000Z")
      })
    ).toEqual([]);
  });
});

describe("bookableDates", () => {
  it("lists working days in the 14-day horizon", () => {
    const dates = bookableDates(
      WEEKDAY_HOURS,
      "Asia/Manila",
      new Date("2026-09-12T16:00:00.000Z")
    );

    expect(dates[0]).toBe("2026-09-14");
    expect(dates).not.toContain("2026-09-13");
    expect(dates).not.toContain("2026-09-19");
    expect(dates).toHaveLength(10);
  });
});

describe("offeredBookingSlot", () => {
  it("rejects a working-day slot outside the 14-day window", () => {
    const now = new Date("2026-09-14T01:00:00.000Z");
    const past = instantFromClinicLocal("2026-09-07", "09:00", "Asia/Manila");
    const future = instantFromClinicLocal("2026-10-05", "09:00", "Asia/Manila");

    expect(
      offeredBookingSlot({
        startsAt: past,
        hours: WEEKDAY_HOURS,
        timeZone: "Asia/Manila",
        occupied: [],
        now
      })
    ).toBeNull();
    expect(
      offeredBookingSlot({
        startsAt: future,
        hours: WEEKDAY_HOURS,
        timeZone: "Asia/Manila",
        occupied: [],
        now
      })
    ).toBeNull();
  });

  it("returns the matching open slot inside the window", () => {
    const now = new Date("2026-09-14T01:00:00.000Z");
    const startsAt = instantFromClinicLocal("2026-09-14", "10:00", "Asia/Manila");
    const slot = offeredBookingSlot({
      startsAt,
      hours: WEEKDAY_HOURS,
      timeZone: "Asia/Manila",
      occupied: [],
      now
    });

    expect(slot?.startsAt).toBe(startsAt.toISOString());
  });

  it("rejects a past clock time on a bookable day", () => {
    const now = new Date("2026-09-14T02:15:00.000Z");
    const startsAt = instantFromClinicLocal("2026-09-14", "09:00", "Asia/Manila");

    expect(
      offeredBookingSlot({
        startsAt,
        hours: WEEKDAY_HOURS,
        timeZone: "Asia/Manila",
        occupied: [],
        now
      })
    ).toBeNull();
  });
});

describe("visitOccupiesSlot", () => {
  it("treats a non-cancelled visit as occupying its huddle slot", () => {
    const startsAt = instantFromClinicLocal("2026-09-14", "10:15", "Asia/Manila").toISOString();
    const slot = instantFromClinicLocal("2026-09-14", "10:00", "Asia/Manila").toISOString();
    const events = [visitEvent("55555555-5555-4555-8555-555555555555", startsAt)];

    expect(occupiedVisitStarts(events)).toEqual([startsAt]);
    expect(visitOccupiesSlot(events, slot, "Asia/Manila")).toBe(true);
  });

  it("ignores cancelled visits", () => {
    const startsAt = instantFromClinicLocal("2026-09-14", "10:00", "Asia/Manila").toISOString();
    const events = [
      visitEvent("55555555-5555-4555-8555-555555555555", startsAt, "cancelled")
    ];

    expect(occupiedVisitStarts(events)).toEqual([]);
    expect(visitOccupiesSlot(events, startsAt, "Asia/Manila")).toBe(false);
  });
});
