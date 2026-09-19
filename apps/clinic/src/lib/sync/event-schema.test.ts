import { describe, expect, it } from "vitest";

import { chartAppendedPayloadSchema, clinicEventSchema } from "./event-schema";

const VALID_PAYLOAD = {
  patientId: "11111111-1111-4111-8111-111111111111",
  visitId: "22222222-2222-4222-8222-222222222222",
  toothCode: "16",
  finding: { kind: "condition", code: "caries" },
  note: "Occlusal lesion noted."
} as const;

describe("chart.appended payload", () => {
  it("accepts an adult FDI tooth and controlled finding", () => {
    expect(chartAppendedPayloadSchema.parse(VALID_PAYLOAD)).toEqual(VALID_PAYLOAD);
  });

  it.each([
    [{ ...VALID_PAYLOAD, toothCode: "51" }, "unknown tooth"],
    [
      { ...VALID_PAYLOAD, finding: { kind: "condition", code: "mystery" } },
      "unknown condition"
    ],
    [{ ...VALID_PAYLOAD, extra: true }, "unknown key"]
  ])("rejects %s (%s)", (payload) => {
    expect(chartAppendedPayloadSchema.safeParse(payload).success).toBe(false);
  });

  it("rejects a chart event whose record id is missing", () => {
    expect(
      clinicEventSchema.safeParse({
        id: "33333333-3333-4333-8333-333333333333",
        tenantId: "44444444-4444-4444-8444-444444444444",
        actorUserId: "55555555-5555-4555-8555-555555555555",
        recordId: null,
        occurredAt: "2026-09-19T01:00:00.000Z",
        type: "chart.appended",
        payload: VALID_PAYLOAD
      }).success
    ).toBe(false);
  });
});
