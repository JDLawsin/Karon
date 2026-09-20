import { describe, expect, it } from "vitest";

import type { ClinicEvent } from "@/lib/sync/event-schema";

import { quoteHistoryForPatient } from "./quote-history";

const quoteEvent = (overrides: Partial<ClinicEvent> = {}): ClinicEvent => ({
  id: "11111111-1111-4111-8111-111111111111",
  tenantId: "22222222-2222-4222-8222-222222222222",
  actorUserId: "33333333-3333-4333-8333-333333333333",
  recordId: "44444444-4444-4444-8444-444444444444",
  occurredAt: "2026-09-20T01:00:00.000Z",
  type: "quote.created",
  payload: {
    patientId: "55555555-5555-4555-8555-555555555555",
    visitId: "66666666-6666-4666-8666-666666666666",
    status: "accepted",
    lines: [
      {
        serviceId: "77777777-7777-4777-8777-777777777777",
        serviceName: "Cleaning",
        qty: 1,
        amountMinor: 150_000,
        currency: "PHP"
      }
    ],
    totalMinor: 150_000,
    currency: "PHP"
  },
  ...overrides
});

describe("quote history", () => {
  it("returns newest-first accepted quotes for only the requested patient", () => {
    const older = quoteEvent();
    const newer = quoteEvent({
      id: "88888888-8888-4888-8888-888888888888",
      occurredAt: "2026-09-21T01:00:00.000Z"
    });
    const otherPatient = quoteEvent({
      id: "99999999-9999-4999-8999-999999999999",
      payload: { ...older.payload, patientId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" }
    });

    expect(
      quoteHistoryForPatient(
        [older, otherPatient, newer],
        "55555555-5555-4555-8555-555555555555"
      ).map((quote) => quote.id)
    ).toEqual([newer.id, older.id]);
  });
});
