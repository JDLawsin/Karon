import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import type { ClinicEvent } from "@/lib/sync/event-schema";

import { cancelMailTo } from "./cancel-mail";

const TENANT = "11111111-1111-4111-8111-111111111111";
const ACTOR = "22222222-2222-4222-8222-222222222222";
const PATIENT = "33333333-3333-4333-8333-333333333333";
const VISIT = "44444444-4444-4444-8444-444444444444";

const event = (
  type: ClinicEvent["type"],
  recordId: string,
  payload: ClinicEvent["payload"],
  occurredAt: string
): ClinicEvent => ({
  id: randomUUID(),
  tenantId: TENANT,
  actorUserId: ACTOR,
  recordId,
  occurredAt,
  type,
  payload
});

const notebook: ClinicEvent[] = [
  event("patient.created", PATIENT, {
    name: "Ana Cruz",
    mobile: "09171234567",
    email: "ana@example.com"
  }, "2026-09-12T03:00:00.000Z"),
  event("appointment.set", VISIT, {
    patientId: PATIENT,
    startsAt: "2026-09-12T04:00:00.000Z",
    status: "confirmed"
  }, "2026-09-12T03:01:00.000Z"),
  event(
    "visit.status_changed",
    VISIT,
    { status: "cancelled" },
    "2026-09-12T03:02:00.000Z"
  )
];

describe("cancelMailTo", () => {
  it("returns the patient email when the visit is cancelled", () => {
    expect(
      cancelMailTo(
        {
          channel: "email",
          template: "booking_cancelled",
          visitId: VISIT,
          to: "ana@example.com"
        },
        notebook
      )
    ).toBe("ana@example.com");
  });

  it("does not send to a different address or an open visit", () => {
    expect(
      cancelMailTo(
        {
          channel: "email",
          template: "booking_cancelled",
          visitId: VISIT,
          to: "other@example.com"
        },
        notebook
      )
    ).toBeNull();
    expect(
      cancelMailTo(
        {
          channel: "email",
          template: "booking_cancelled",
          visitId: VISIT,
          to: "ana@example.com"
        },
        notebook.filter((row) => row.type !== "visit.status_changed")
      )
    ).toBeNull();
  });
});
