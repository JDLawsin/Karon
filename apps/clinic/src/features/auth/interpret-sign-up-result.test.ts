import { describe, expect, it } from "vitest";

import { interpretSignUpResult } from "./interpret-sign-up-result";

describe("interpretSignUpResult", () => {
  it("treats an obfuscated user with empty identities as already registered", () => {
    expect(
      interpretSignUpResult({
        user: { identities: [] },
        session: null,
        error: null
      })
    ).toEqual({ kind: "alreadyRegistered" });
  });

  it("asks a new user with identities to confirm email when there is no session", () => {
    expect(
      interpretSignUpResult({
        user: { identities: [{ id: "i1" }] },
        session: null,
        error: null
      })
    ).toEqual({ kind: "needsConfirm" });
  });

  it("treats a returned session as signed in even when identities are empty", () => {
    expect(
      interpretSignUpResult({
        user: { identities: [] },
        session: { access_token: "tok" },
        error: null
      })
    ).toEqual({ kind: "signedIn" });
  });

  it("treats an auth error as failed even when identities are empty", () => {
    expect(
      interpretSignUpResult({
        user: { identities: [] },
        session: null,
        error: { message: "Error sending confirmation email" }
      })
    ).toEqual({ kind: "failed" });
  });

  it("asks for confirmation when identities are omitted on a new user", () => {
    expect(
      interpretSignUpResult({
        user: {},
        session: null,
        error: null
      })
    ).toEqual({ kind: "needsConfirm" });
  });

  it("does not claim an email was sent when there is no user", () => {
    expect(
      interpretSignUpResult({
        user: null,
        session: null,
        error: null
      })
    ).toEqual({ kind: "failed" });
  });
});
