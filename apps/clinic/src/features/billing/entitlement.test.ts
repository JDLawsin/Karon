import { describe, expect, it } from "vitest";

import { parseEntitlement } from "./entitlement";

describe("parseEntitlement", () => {
  it("maps a server entitlement row", () => {
    expect(
      parseEntitlement({
        status: "trialing",
        source: "trial",
        starts_at: "2026-09-28T00:00:00.000Z",
        ends_at: "2026-10-05T00:00:00.000Z",
        days_remaining: 7,
        has_access: true
      })
    ).toEqual({
      status: "trialing",
      source: "trial",
      startsAt: "2026-09-28T00:00:00.000Z",
      endsAt: "2026-10-05T00:00:00.000Z",
      daysRemaining: 7,
      hasAccess: true
    });
  });

  it("rejects an untrusted entitlement shape", () => {
    expect(parseEntitlement({ status: "forever", has_access: true })).toBeNull();
  });
});
