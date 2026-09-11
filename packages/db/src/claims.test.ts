import { describe, expect, it } from "vitest";

import { decodeJwtClaims, sessionRoleForClaims } from "./claims";

const encodeClaims = (claims: Record<string, string>) => {
  const payload = Buffer.from(JSON.stringify(claims), "utf8").toString(
    "base64url"
  );

  return `header.${payload}.sig`;
};

describe("JWT session claims", () => {
  it("reads the subject and session id from a token payload", () => {
    const claims = decodeJwtClaims(
      encodeClaims({
        sub: "11111111-1111-1111-1111-111111111111",
        session_id: "22222222-2222-2222-2222-222222222222",
        role: "authenticated"
      })
    );

    expect(claims.sub).toBe("11111111-1111-1111-1111-111111111111");
    expect(claims.session_id).toBe("22222222-2222-2222-2222-222222222222");
    expect(sessionRoleForClaims(claims)).toBe("authenticated");
  });

  it("never SET ROLE to an untrusted JWT role", () => {
    expect(
      sessionRoleForClaims({ role: "service_role" })
    ).toBe("anon");
  });
});
