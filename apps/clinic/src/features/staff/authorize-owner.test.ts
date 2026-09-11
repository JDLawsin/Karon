import { describe, expect, it } from "vitest";

import { authorizeOwnerAction, isInviteRateLimited } from "./authorize-owner";

describe("authorizeOwnerAction", () => {
  it("rejects missing users and non-owners before checking MFA", () => {
    expect(authorizeOwnerAction({ userId: null, aal: "aal2", role: "owner" })).toEqual({
      ok: false,
      status: 401
    });
    expect(
      authorizeOwnerAction({ userId: "user-1", aal: "aal2", role: "assistant" })
    ).toEqual({ ok: false, status: 403 });
  });

  it("requires owner aal2", () => {
    expect(
      authorizeOwnerAction({ userId: "user-1", aal: "aal1", role: "owner" })
    ).toEqual({ ok: false, status: 403 });
    expect(
      authorizeOwnerAction({ userId: "user-1", aal: "aal2", role: "owner" })
    ).toEqual({ ok: true, status: 200 });
  });

  it("lets a trusted aal1 owner act", () => {
    expect(
      authorizeOwnerAction({
        userId: "user-1",
        aal: "aal1",
        role: "owner",
        mfaOk: true
      })
    ).toEqual({ ok: true, status: 200 });
    expect(
      authorizeOwnerAction({
        userId: "user-1",
        aal: "aal1",
        role: "owner",
        mfaOk: false
      })
    ).toEqual({ ok: false, status: 403 });
  });
});

describe("isInviteRateLimited", () => {
  it("caps invites inside the audit window", () => {
    expect(isInviteRateLimited(9)).toBe(false);
    expect(isInviteRateLimited(10)).toBe(true);
  });
});
