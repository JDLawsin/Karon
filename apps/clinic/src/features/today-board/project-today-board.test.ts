import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import type { ClinicEvent } from "@/lib/sync/event-schema";

import {
  hasDuplicateMobile,
  nextVisitStatus,
  projectTodayBoard
} from "./project-today-board";

const TENANT = "11111111-1111-4111-8111-111111111111";
const ACTOR = "22222222-2222-4222-8222-222222222222";
const PATIENT = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const VISIT = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const event = (
  type: ClinicEvent["type"],
  payload: Record<string, unknown>,
  overrides: Partial<ClinicEvent> = {}
): ClinicEvent => ({
  id: randomUUID(),
  tenantId: TENANT,
  actorUserId: ACTOR,
  recordId: PATIENT,
  occurredAt: "2026-09-12T00:00:00.000Z",
  type,
  payload,
  ...overrides
});

const manilaNoon = new Date("2026-09-12T04:00:00.000Z");

describe("projectTodayBoard", () => {
  it("returns no rows for an empty morning", () => {
    expect(projectTodayBoard([], manilaNoon)).toEqual([]);
  });

  it("puts a walk-in in waiting", () => {
    const rows = projectTodayBoard(
      [
        event("patient.created", { name: "Ana Cruz", mobile: "09171234567" }),
        event(
          "appointment.set",
          {
            patientId: PATIENT,
            startsAt: "2026-09-12T04:00:00.000Z",
            status: "waiting"
          },
          { recordId: VISIT, occurredAt: "2026-09-12T04:00:00.000Z" }
        )
      ],
      manilaNoon
    );

    expect(rows).toEqual([
      expect.objectContaining({
        visitId: VISIT,
        name: "Ana Cruz",
        status: "waiting",
        storedStatus: "waiting"
      })
    ]);
  });

  it("shows booked as late after the start time", () => {
    const rows = projectTodayBoard(
      [
        event("patient.created", { name: "Ana Cruz", mobile: "09171234567" }),
        event(
          "appointment.set",
          { patientId: PATIENT, startsAt: "2026-09-12T01:00:00.000Z" },
          { recordId: VISIT }
        )
      ],
      manilaNoon
    );

    expect(rows[0]?.status).toBe("late");
    expect(rows[0]?.storedStatus).toBe("booked");
  });

  it("applies visit.status_changed after appointment.set", () => {
    const rows = projectTodayBoard(
      [
        event("patient.created", { name: "Ana Cruz", mobile: "09171234567" }),
        event(
          "appointment.set",
          { patientId: PATIENT, startsAt: "2026-09-12T01:00:00.000Z" },
          { recordId: VISIT }
        ),
        event(
          "visit.status_changed",
          { status: "in_chair" },
          { recordId: VISIT, occurredAt: "2026-09-12T04:05:00.000Z" }
        )
      ],
      manilaNoon
    );

    expect(rows[0]?.status).toBe("in_chair");
  });

  it("ignores visits on another clinic day", () => {
    const rows = projectTodayBoard(
      [
        event("patient.created", { name: "Ana Cruz", mobile: "09171234567" }),
        event(
          "appointment.set",
          {
            patientId: PATIENT,
            startsAt: "2026-09-11T04:00:00.000Z",
            status: "waiting"
          },
          { recordId: VISIT }
        )
      ],
      manilaNoon
    );

    expect(rows).toEqual([]);
  });
});

describe("hasDuplicateMobile", () => {
  it("matches a trimmed mobile already on file", () => {
    const events = [
      event("patient.created", { name: "Ana Cruz", mobile: "09171234567" })
    ];

    expect(hasDuplicateMobile(events, "09171234567")).toBe(true);
    expect(hasDuplicateMobile(events, " 09171234567 ")).toBe(true);
    expect(hasDuplicateMobile(events, "09170000000")).toBe(false);
  });
});

describe("nextVisitStatus", () => {
  it("moves booked and late to waiting, then in chair", () => {
    expect(nextVisitStatus("booked")).toBe("waiting");
    expect(nextVisitStatus("late")).toBe("waiting");
    expect(nextVisitStatus("waiting")).toBe("in_chair");
    expect(nextVisitStatus("in_chair")).toBeNull();
  });
});
