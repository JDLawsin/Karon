import { describe, expect, it } from "vitest";

import {
  chartAppendedPayloadSchema,
  clinicEventSchema,
  quoteCreatedPayloadSchema
} from "./event-schema";

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

const VALID_QUOTE = {
  patientId: "11111111-1111-4111-8111-111111111111",
  visitId: "22222222-2222-4222-8222-222222222222",
  status: "accepted",
  lines: [
    {
      serviceId: "33333333-3333-4333-8333-333333333333",
      serviceName: "Composite filling",
      qty: 2,
      amountMinor: 250_000,
      currency: "PHP"
    }
  ],
  totalMinor: 500_000,
  currency: "PHP"
} as const;

describe("quote.created payload", () => {
  it("accepts an itemized accepted quote whose total matches its lines", () => {
    expect(quoteCreatedPayloadSchema.parse(VALID_QUOTE)).toEqual(VALID_QUOTE);
  });

  it.each([
    [{ ...VALID_QUOTE, lines: [] }, "empty quote"],
    [{ ...VALID_QUOTE, totalMinor: 499_999 }, "incorrect total"],
    [
      {
        ...VALID_QUOTE,
        lines: [{ ...VALID_QUOTE.lines[0], currency: "USD" }]
      },
      "mixed currency"
    ],
    [{ ...VALID_QUOTE, extra: true }, "unknown key"]
  ])("rejects %s (%s)", (payload) => {
    expect(quoteCreatedPayloadSchema.safeParse(payload).success).toBe(false);
  });

  it("rejects a quote event whose record id is missing", () => {
    expect(
      clinicEventSchema.safeParse({
        id: "44444444-4444-4444-8444-444444444444",
        tenantId: "55555555-5555-4555-8555-555555555555",
        actorUserId: "66666666-6666-4666-8666-666666666666",
        recordId: null,
        occurredAt: "2026-09-20T01:00:00.000Z",
        type: "quote.created",
        payload: VALID_QUOTE
      }).success
    ).toBe(false);
  });
});
