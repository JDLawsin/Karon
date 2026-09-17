import { describe, expect, it } from "vitest";

import { parseAuthClaims, parseMembership } from "./parse-membership";

describe("parseMembership", () => {
  it("accepts a clinic membership row and rejects junk", () => {
    expect(
      parseMembership({
        tenant_id: "11111111-1111-4111-8111-111111111111",
        role: "owner"
      })
    ).toEqual({
      tenantId: "11111111-1111-4111-8111-111111111111",
      role: "owner"
    });
    expect(parseMembership({ role: "owner" })).toBeNull();
  });
});

describe("parseAuthClaims", () => {
  it("accepts a uuid subject and rejects junk", () => {
    expect(
      parseAuthClaims({
        sub: "11111111-1111-4111-8111-111111111111",
        aal: "aal2",
        role: "authenticated"
      })
    ).toEqual({
      userId: "11111111-1111-4111-8111-111111111111",
      aal: "aal2",
      passwordRecovery: false,
      authSessionId: null
    });
    expect(parseAuthClaims({ sub: "not-a-uuid" })).toEqual({
      userId: null,
      aal: null,
      passwordRecovery: false,
      authSessionId: null
    });
  });

  it("flags a recovery session from amr", () => {
    expect(
      parseAuthClaims({
        sub: "11111111-1111-4111-8111-111111111111",
        aal: "aal1",
        amr: [
          { method: "otp", timestamp: 1 },
          { method: "recovery", timestamp: 2 }
        ]
      }).passwordRecovery
    ).toBe(true);
    expect(
      parseAuthClaims({
        sub: "11111111-1111-4111-8111-111111111111",
        aal: "aal1",
        amr: [{ method: "password", timestamp: 1 }]
      }).passwordRecovery
    ).toBe(false);
  });

  it("still reads the subject when amr is a string list", () => {
    expect(
      parseAuthClaims({
        sub: "11111111-1111-4111-8111-111111111111",
        aal: "aal1",
        amr: ["otp", "recovery"]
      })
    ).toEqual({
      userId: "11111111-1111-4111-8111-111111111111",
      aal: "aal1",
      passwordRecovery: true,
      authSessionId: null
    });
  });
});
