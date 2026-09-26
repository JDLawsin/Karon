import { describe, expect, it } from "vitest";

import type { ClinicEvent } from "@/lib/sync/event-schema";

import {
  applyPendingPayments,
  collectBalanceForVisit,
  parseCollectBalance,
  parseCollectBalanceSnapshot
} from "./payment-balance";

const PATIENT = "11111111-1111-4111-8111-111111111111";
const VISIT = "22222222-2222-4222-8222-222222222222";
const ACTOR = "33333333-3333-4333-8333-333333333333";
const TENANT = "44444444-4444-4444-8444-444444444444";

const event = (overrides: Partial<ClinicEvent>): ClinicEvent => ({
  id: crypto.randomUUID(),
  tenantId: TENANT,
  actorUserId: ACTOR,
  recordId: crypto.randomUUID(),
  occurredAt: "2026-09-20T01:00:00.000Z",
  type: "quote.created",
  payload: {
    patientId: PATIENT,
    visitId: VISIT,
    status: "accepted",
    lines: [
      {
        serviceId: "55555555-5555-4555-8555-555555555555",
        serviceName: "Cleaning",
        qty: 1,
        amountMinor: 250_000,
        currency: "PHP"
      }
    ],
    totalMinor: 250_000,
    currency: "PHP"
  },
  ...overrides
});

describe("payment balance response", () => {
  it("maps the protected aggregate without exposing payment rows", () => {
    expect(
      parseCollectBalance({
        quote_id: "11111111-1111-4111-8111-111111111111",
        quote_total_minor: 280_000,
        paid_minor: 200_000,
        remaining_minor: 80_000,
        currency: "PHP"
      })
    ).toEqual({
      quoteId: "11111111-1111-4111-8111-111111111111",
      quoteTotalMinor: 280_000,
      paidMinor: 200_000,
      remainingMinor: 80_000,
      currency: "PHP"
    });
  });

  it("rejects malformed or expanded responses at the network boundary", () => {
    expect(() =>
      parseCollectBalance({
        quote_id: "11111111-1111-4111-8111-111111111111",
        quote_total_minor: 280_000,
        paid_minor: 200_000,
        remaining_minor: 80_000,
        currency: "PHP",
        payment_rows: []
      })
    ).toThrow();
  });

  it("projects the latest quote and local payments while offline", () => {
    const quote = event({});
    const paid = event({
      occurredAt: "2026-09-20T02:00:00.000Z",
      type: "payment.recorded",
      payload: {
        patientId: PATIENT,
        visitId: VISIT,
        amountMinor: 100_000,
        currency: "PHP",
        method: "gcash"
      }
    });
    const unpaid = event({
      occurredAt: "2026-09-20T03:00:00.000Z",
      type: "payment.recorded",
      payload: {
        patientId: PATIENT,
        visitId: VISIT,
        amountMinor: 150_000,
        currency: "PHP",
        method: "unpaid"
      }
    });

    expect(collectBalanceForVisit([quote, paid, unpaid], PATIENT, VISIT)).toEqual({
      quoteId: quote.recordId,
      quoteTotalMinor: 250_000,
      paidMinor: 100_000,
      remainingMinor: 150_000,
      currency: "PHP"
    });
  });

  it("adds only undrained local payments to the protected server aggregate", () => {
    const pending = event({
      id: "66666666-6666-4666-8666-666666666666",
      type: "payment.recorded",
      payload: {
        patientId: PATIENT,
        visitId: VISIT,
        amountMinor: 50_000,
        currency: "PHP",
        method: "cash"
      }
    });
    const alreadySynced = event({
      id: "77777777-7777-4777-8777-777777777777",
      type: "payment.recorded",
      payload: {
        patientId: PATIENT,
        visitId: VISIT,
        amountMinor: 100_000,
        currency: "PHP",
        method: "gcash"
      }
    });

    expect(
      applyPendingPayments(
        {
          quoteId: "88888888-8888-4888-8888-888888888888",
          quoteTotalMinor: 300_000,
          paidMinor: 100_000,
          remainingMinor: 200_000,
          currency: "PHP"
        },
        [pending, alreadySynced],
        new Set([pending.id]),
        PATIENT,
        VISIT
      )
    ).toEqual({
      quoteId: "88888888-8888-4888-8888-888888888888",
      quoteTotalMinor: 300_000,
      paidMinor: 150_000,
      remainingMinor: 150_000,
      currency: "PHP"
    });
  });

  it("accepts only validated cached balance snapshots", () => {
    const balance = {
      quoteId: "88888888-8888-4888-8888-888888888888",
      quoteTotalMinor: 300_000,
      paidMinor: 100_000,
      remainingMinor: 200_000,
      currency: "PHP"
    };

    expect(parseCollectBalanceSnapshot(JSON.stringify(balance))).toEqual(balance);
    expect(parseCollectBalanceSnapshot('{"paidMinor":"100000"}')).toBeNull();
    expect(parseCollectBalanceSnapshot(undefined)).toBeNull();
  });
});
