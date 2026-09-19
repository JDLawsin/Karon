import { describe, expect, it } from "vitest";

import type { ClinicEvent } from "@/lib/sync/event-schema";

import { chartHistoryForPatient } from "./chart-history";

const chartEvent = (overrides: Partial<ClinicEvent> = {}): ClinicEvent => ({
  id: "11111111-1111-4111-8111-111111111111",
  tenantId: "22222222-2222-4222-8222-222222222222",
  actorUserId: "33333333-3333-4333-8333-333333333333",
  recordId: "44444444-4444-4444-8444-444444444444",
  occurredAt: "2026-09-19T01:00:00.000Z",
  type: "chart.appended",
  payload: {
    patientId: "55555555-5555-4555-8555-555555555555",
    visitId: "66666666-6666-4666-8666-666666666666",
    toothCode: "16",
    finding: { kind: "condition", code: "caries" },
    note: "Occlusal lesion noted."
  },
  ...overrides
});

describe("chart history", () => {
  it("returns newest-first entries for only the requested patient", () => {
    const older = chartEvent();
    const newer = chartEvent({
      id: "77777777-7777-4777-8777-777777777777",
      occurredAt: "2026-09-20T01:00:00.000Z",
      payload: { ...older.payload, toothCode: "26" }
    });
    const otherPatient = chartEvent({
      id: "88888888-8888-4888-8888-888888888888",
      payload: {
        ...older.payload,
        patientId: "99999999-9999-4999-8999-999999999999"
      }
    });

    expect(
      chartHistoryForPatient([older, otherPatient, newer], "55555555-5555-4555-8555-555555555555")
        .map((entry) => entry.toothCode)
    ).toEqual(["26", "16"]);
  });
});
