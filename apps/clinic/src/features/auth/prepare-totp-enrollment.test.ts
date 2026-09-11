import { describe, expect, it } from "vitest";

import { prepareTotpEnrollment } from "./prepare-totp-enrollment";

const verifiedTotp = {
  id: "verified-karon",
  factor_type: "totp" as const,
  status: "verified" as const
};

const leftoverTotp = {
  id: "unverified-karon",
  factor_type: "totp" as const,
  status: "unverified" as const
};

const secondLeftoverTotp = {
  id: "unverified-karon-2",
  factor_type: "totp" as const,
  status: "unverified" as const
};

const unverifiedPhone = {
  id: "unverified-phone",
  factor_type: "phone" as const,
  status: "unverified" as const
};

describe("prepareTotpEnrollment", () => {
  it("challenges a verified TOTP factor", () => {
    expect(
      prepareTotpEnrollment({
        all: [verifiedTotp],
        totp: [verifiedTotp]
      })
    ).toEqual({ kind: "challenge", factorId: "verified-karon" });
  });

  it("drops a leftover unverified TOTP before a new enroll", () => {
    expect(
      prepareTotpEnrollment({
        all: [leftoverTotp],
        totp: []
      })
    ).toEqual({ kind: "enroll", dropIds: ["unverified-karon"] });
  });

  it("drops every leftover unverified TOTP before a new enroll", () => {
    expect(
      prepareTotpEnrollment({
        all: [leftoverTotp, secondLeftoverTotp],
        totp: []
      })
    ).toEqual({
      kind: "enroll",
      dropIds: ["unverified-karon", "unverified-karon-2"]
    });
  });

  it("challenges verified TOTP and does not drop it when an unverified leftover exists", () => {
    expect(
      prepareTotpEnrollment({
        all: [verifiedTotp, leftoverTotp],
        totp: [verifiedTotp]
      })
    ).toEqual({ kind: "challenge", factorId: "verified-karon" });
  });

  it("ignores leftover phone factors when enrolling TOTP", () => {
    expect(
      prepareTotpEnrollment({
        all: [unverifiedPhone],
        totp: []
      })
    ).toEqual({ kind: "enroll", dropIds: [] });
  });
});
