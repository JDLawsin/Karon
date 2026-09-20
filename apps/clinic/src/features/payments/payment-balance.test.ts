import { describe, expect, it } from "vitest";

import { parseCollectBalance } from "./payment-balance";

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
});
