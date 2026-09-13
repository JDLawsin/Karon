import { describe, expect, it } from "vitest";

import { resolveAuthDestination } from "./resolve-auth-destination";

const owner = { tenantId: "11111111-1111-4111-8111-111111111111", role: "owner" as const };
const assistant = {
  tenantId: "11111111-1111-4111-8111-111111111111",
  role: "assistant" as const
};

describe("resolveAuthDestination", () => {
  it("sends anonymous users to log in except on public auth pages", () => {
    expect(
      resolveAuthDestination({
        pathname: "/today",
        userId: null,
        aal: null,
        membership: null,
        sessionActive: false
      })
    ).toBe("/login");
    expect(
      resolveAuthDestination({
        pathname: "/login",
        userId: null,
        aal: null,
        membership: null,
        sessionActive: false
      })
    ).toBeNull();
    expect(
      resolveAuthDestination({
        pathname: "/~offline",
        userId: null,
        aal: null,
        membership: null,
        sessionActive: false
      })
    ).toBeNull();
  });

  it("sends first-time owners to TOTP before they can name a clinic", () => {
    expect(
      resolveAuthDestination({
        pathname: "/today",
        userId: "user-1",
        aal: "aal1",
        membership: null,
        sessionActive: false
      })
    ).toBe("/mfa");
    expect(
      resolveAuthDestination({
        pathname: "/onboarding",
        userId: "user-1",
        aal: "aal1",
        membership: null,
        sessionActive: false
      })
    ).toBe("/mfa");
    expect(
      resolveAuthDestination({
        pathname: "/mfa",
        userId: "user-1",
        aal: "aal1",
        membership: null,
        sessionActive: false
      })
    ).toBeNull();
  });

  it("sends aal2 users without a clinic to onboarding", () => {
    expect(
      resolveAuthDestination({
        pathname: "/mfa",
        userId: "user-1",
        aal: "aal2",
        membership: null,
        sessionActive: false
      })
    ).toBe("/onboarding");
    expect(
      resolveAuthDestination({
        pathname: "/onboarding",
        userId: "user-1",
        aal: "aal2",
        membership: null,
        sessionActive: false
      })
    ).toBeNull();
  });

  it("keeps an inactive clinic session on clinic routes for the idle lock", () => {
    expect(
      resolveAuthDestination({
        pathname: "/today",
        userId: "user-1",
        aal: "aal2",
        membership: owner,
        sessionActive: false
      })
    ).toBeNull();
    expect(
      resolveAuthDestination({
        pathname: "/owner/today",
        userId: "user-1",
        aal: "aal2",
        membership: owner,
        sessionActive: false
      })
    ).toBeNull();
    expect(
      resolveAuthDestination({
        pathname: "/login",
        userId: "user-1",
        aal: "aal2",
        membership: owner,
        sessionActive: false
      })
    ).toBeNull();
    expect(
      resolveAuthDestination({
        pathname: "/mfa",
        userId: "user-1",
        aal: "aal1",
        membership: owner,
        sessionActive: false
      })
    ).toBe("/login");
  });

  it("requires owner TOTP before clinic routes", () => {
    expect(
      resolveAuthDestination({
        pathname: "/today",
        userId: "user-1",
        aal: "aal1",
        membership: owner,
        sessionActive: true
      })
    ).toBe("/mfa");
    expect(
      resolveAuthDestination({
        pathname: "/mfa",
        userId: "user-1",
        aal: "aal1",
        membership: owner,
        sessionActive: true
      })
    ).toBeNull();
  });

  it("skips owner TOTP on a trusted device", () => {
    expect(
      resolveAuthDestination({
        pathname: "/today",
        userId: "user-1",
        aal: "aal1",
        membership: owner,
        sessionActive: true,
        deviceTrusted: true
      })
    ).toBeNull();
    expect(
      resolveAuthDestination({
        pathname: "/login",
        userId: "user-1",
        aal: "aal1",
        membership: owner,
        sessionActive: true,
        deviceTrusted: true
      })
    ).toBe("/today");
  });

  it("still requires first-time TOTP even if a leftover cookie looks trusted", () => {
    expect(
      resolveAuthDestination({
        pathname: "/onboarding",
        userId: "user-1",
        aal: "aal1",
        membership: null,
        sessionActive: false,
        deviceTrusted: true
      })
    ).toBe("/mfa");
  });

  it("keeps assistants off owner routes and MFA", () => {
    expect(
      resolveAuthDestination({
        pathname: "/owner/today",
        userId: "user-2",
        aal: "aal1",
        membership: assistant,
        sessionActive: true
      })
    ).toBe("/today");
    expect(
      resolveAuthDestination({
        pathname: "/mfa",
        userId: "user-2",
        aal: "aal1",
        membership: assistant,
        sessionActive: true
      })
    ).toBe("/today");
    expect(
      resolveAuthDestination({
        pathname: "/today",
        userId: "user-2",
        aal: "aal1",
        membership: assistant,
        sessionActive: true
      })
    ).toBeNull();
  });

  it("sends a fully authenticated owner into the clinic", () => {
    expect(
      resolveAuthDestination({
        pathname: "/login",
        userId: "user-1",
        aal: "aal2",
        membership: owner,
        sessionActive: true
      })
    ).toBe("/today");
    expect(
      resolveAuthDestination({
        pathname: "/settings",
        userId: "user-1",
        aal: "aal2",
        membership: owner,
        sessionActive: true
      })
    ).toBeNull();
  });

  it("lets anonymous users request a password reset", () => {
    expect(
      resolveAuthDestination({
        pathname: "/forgot-password",
        userId: null,
        aal: null,
        membership: null,
        sessionActive: false
      })
    ).toBeNull();
    expect(
      resolveAuthDestination({
        pathname: "/update-password",
        userId: null,
        aal: null,
        membership: null,
        sessionActive: false
      })
    ).toBe("/login");
  });

  it("keeps a recovery session on update-password before MFA", () => {
    const recoveryOwner = {
      pathname: "/today",
      userId: "user-1",
      aal: "aal1",
      membership: owner,
      sessionActive: true,
      passwordRecovery: true
    };

    expect(resolveAuthDestination(recoveryOwner)).toBe("/update-password");
    expect(
      resolveAuthDestination({ ...recoveryOwner, pathname: "/update-password" })
    ).toBeNull();
    expect(resolveAuthDestination({ ...recoveryOwner, pathname: "/mfa" })).toBe(
      "/update-password"
    );
    expect(
      resolveAuthDestination({
        ...recoveryOwner,
        pathname: "/update-password",
        sessionActive: false
      })
    ).toBeNull();
    expect(
      resolveAuthDestination({
        pathname: "/update-password",
        userId: "user-2",
        aal: "aal1",
        membership: assistant,
        sessionActive: false
      })
    ).toBeNull();
  });

  it("keeps a recovery assistant on update-password", () => {
    expect(
      resolveAuthDestination({
        pathname: "/today",
        userId: "user-2",
        aal: "aal1",
        membership: assistant,
        sessionActive: true,
        passwordRecovery: true
      })
    ).toBe("/update-password");
    expect(
      resolveAuthDestination({
        pathname: "/update-password",
        userId: "user-2",
        aal: "aal1",
        membership: assistant,
        sessionActive: true,
        passwordRecovery: true
      })
    ).toBeNull();
  });

  it("lets a signed-in user stay on update-password and leaves forgot-password", () => {
    expect(
      resolveAuthDestination({
        pathname: "/update-password",
        userId: "user-1",
        aal: "aal2",
        membership: owner,
        sessionActive: true
      })
    ).toBeNull();
    expect(
      resolveAuthDestination({
        pathname: "/forgot-password",
        userId: "user-1",
        aal: "aal2",
        membership: owner,
        sessionActive: true
      })
    ).toBe("/today");
  });

  it("sends an owner who still needs TOTP to MFA before a logged-in password change", () => {
    expect(
      resolveAuthDestination({
        pathname: "/update-password",
        userId: "user-1",
        aal: "aal1",
        membership: owner,
        sessionActive: true
      })
    ).toBe("/mfa");
  });
});
