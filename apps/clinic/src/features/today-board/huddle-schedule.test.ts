import { describe, expect, it } from "vitest";

import {
  canDropOnBoard,
  carryoverLegendByDay,
  clinicMinutes,
  formatSlotLabel,
  groupRowsBySlot,
  huddleHoursOf,
  huddleTimeSlots,
  huddleWeekDays,
  isReverseBoardDrop,
  shiftClinicDate,
  slotStart,
  visitStatusForColumn
} from "./huddle-schedule";

describe("huddleHoursOf", () => {
  it("reads open and close from a clinic hours payload", () => {
    expect(
      huddleHoursOf({ days: [1, 2, 3], open: "08:30:00", close: "17:00" })
    ).toEqual({ open: "08:30", close: "17:00" });
  });

  it("rejects inverted hours", () => {
    expect(huddleHoursOf({ open: "18:00", close: "09:00" })).toBeNull();
  });
});

describe("clinicMinutes", () => {
  it("reads Manila wall time from an ISO instant", () => {
    expect(clinicMinutes("2026-09-12T00:00:00.000Z")).toBe(8 * 60);
    expect(clinicMinutes("2026-09-12T01:30:00.000Z")).toBe(9 * 60 + 30);
  });
});

describe("slotStart", () => {
  it("floors to 30-minute buckets", () => {
    expect(slotStart(8 * 60 + 14)).toBe(8 * 60);
    expect(slotStart(8 * 60 + 30)).toBe(8 * 60 + 30);
  });
});

describe("formatSlotLabel", () => {
  it("formats a slot in clinic time", () => {
    expect(formatSlotLabel(8 * 60)).toMatch(/8:00/i);
  });
});

describe("huddleTimeSlots", () => {
  const noon = new Date("2026-09-12T04:00:00.000Z");

  it("fills every slot from open through close", () => {
    expect(huddleTimeSlots([], noon, false, { open: "09:00", close: "11:00" })).toEqual([
      9 * 60,
      9 * 60 + 30,
      10 * 60,
      10 * 60 + 30,
      11 * 60
    ]);
  });

  it("includes the 6pm close on a 9-to-6 day", () => {
    const slots = huddleTimeSlots([], noon, false, {
      open: "09:00",
      close: "18:00"
    });

    expect(slots[0]).toBe(9 * 60);
    expect(slots.at(-1)).toBe(18 * 60);
  });

  it("includes a last partial hour when close is not on a slot", () => {
    expect(
      huddleTimeSlots([], noon, false, { open: "09:00", close: "10:15" })
    ).toEqual([9 * 60, 9 * 60 + 30, 10 * 60]);
  });

  it("keeps appointments that start outside clinic hours", () => {
    const slots = huddleTimeSlots(
      [{ startsAt: "2026-09-12T00:00:00.000Z" }],
      noon,
      false,
      { open: "09:00", close: "11:00" }
    );

    expect(slots[0]).toBe(8 * 60);
    expect(slots).toContain(9 * 60);
  });

  it("does not add now when it is outside clinic hours", () => {
    const early = new Date("2026-09-12T00:10:00.000Z");
    const slots = huddleTimeSlots([], early, true, {
      open: "09:00",
      close: "11:00"
    });

    expect(slots).not.toContain(8 * 60);
  });
});

describe("groupRowsBySlot", () => {
  it("buckets rows by start slot", () => {
    const groups = groupRowsBySlot([
      { id: "a", startsAt: "2026-09-12T00:00:00.000Z" },
      { id: "b", startsAt: "2026-09-12T00:10:00.000Z" },
      { id: "c", startsAt: "2026-09-12T01:30:00.000Z" }
    ]);

    expect(groups.get(8 * 60)?.map((row) => row.id)).toEqual(["a", "b"]);
    expect(groups.get(9 * 60 + 30)?.map((row) => row.id)).toEqual(["c"]);
  });
});

describe("canDropOnBoard", () => {
  it("allows forward and reverse pipeline columns", () => {
    expect(canDropOnBoard("confirmed", "waiting")).toBe(true);
    expect(canDropOnBoard("waiting", "confirmed")).toBe(true);
    expect(canDropOnBoard("complete", "in_chair")).toBe(true);
    expect(canDropOnBoard("complete", "waiting")).toBe(true);
  });

  it("rejects skipped forward moves, same column, and late", () => {
    expect(canDropOnBoard("confirmed", "in_chair")).toBe(false);
    expect(canDropOnBoard("confirmed", "confirmed")).toBe(false);
    expect(canDropOnBoard("confirmed", "late")).toBe(false);
    expect(visitStatusForColumn("late")).toBeNull();
  });
});

describe("isReverseBoardDrop", () => {
  it("flags earlier pipeline columns", () => {
    expect(isReverseBoardDrop("waiting", "confirmed")).toBe(true);
    expect(isReverseBoardDrop("complete", "in_chair")).toBe(true);
    expect(isReverseBoardDrop("confirmed", "waiting")).toBe(false);
    expect(isReverseBoardDrop("waiting", "late")).toBe(false);
  });
});

describe("huddleWeekDays", () => {
  it("centers seven days on the selected clinic date", () => {
    const days = huddleWeekDays("2026-09-13", "2026-09-13");

    expect(days.map((day) => day.date)).toEqual([
      "2026-09-10",
      "2026-09-11",
      "2026-09-12",
      "2026-09-13",
      "2026-09-14",
      "2026-09-15",
      "2026-09-16"
    ]);
    expect(days[3]?.isToday).toBe(true);
  });

  it("keeps today's mark when the strip is centered on another day", () => {
    const days = huddleWeekDays("2026-09-10", "2026-09-13");

    expect(days.map((day) => day.date)).toEqual([
      "2026-09-07",
      "2026-09-08",
      "2026-09-09",
      "2026-09-10",
      "2026-09-11",
      "2026-09-12",
      "2026-09-13"
    ]);
    expect(days[3]?.isToday).toBe(false);
    expect(days[6]?.isToday).toBe(true);
  });
});

describe("shiftClinicDate", () => {
  it("moves one clinic day at a time", () => {
    expect(shiftClinicDate("2026-09-13", -1)).toBe("2026-09-12");
    expect(shiftClinicDate("2026-09-13", 1)).toBe("2026-09-14");
  });
});

describe("carryoverLegendByDay", () => {
  const week = [
    "2026-09-10",
    "2026-09-11",
    "2026-09-12",
    "2026-09-13",
    "2026-09-14",
    "2026-09-15",
    "2026-09-16"
  ];

  it("groups leftovers onto their clinic day and pins older ones to today", () => {
    const legend = carryoverLegendByDay(
      {
        "2026-09-11": { waiting: 2 },
        "2026-09-08": { in_chair: 1 }
      },
      week,
      "2026-09-13"
    );

    expect(legend.get("2026-09-11")).toEqual([{ status: "waiting", count: 2 }]);
    expect(legend.get("2026-09-13")).toEqual([{ status: "in_chair", count: 1 }]);
    expect(legend.get("2026-09-12")).toEqual([]);
  });

  it("caps the legend at four pipeline statuses and folds late into confirmed", () => {
    const legend = carryoverLegendByDay(
      {
        "2026-09-11": {
          pending_review: 1,
          late: 1,
          waiting: 1,
          in_chair: 1,
          complete: 1
        }
      },
      week,
      "2026-09-13"
    );

    expect(legend.get("2026-09-11")).toEqual([
      { status: "pending_review", count: 1 },
      { status: "confirmed", count: 1 },
      { status: "waiting", count: 1 },
      { status: "in_chair", count: 1 }
    ]);
  });
});
