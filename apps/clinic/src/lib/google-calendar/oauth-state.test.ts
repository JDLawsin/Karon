import { describe, expect, it } from "vitest";

import { readGoogleOauthState, signGoogleOauthState } from "./oauth-state";

const KEY = "test-gcal-token-key";
const USER = "11111111-1111-4111-8111-111111111111";
const TENANT = "22222222-2222-4222-8222-222222222222";

describe("google oauth state", () => {
  it("round-trips the initiating user and tenant", () => {
    const state = signGoogleOauthState({ userId: USER, tenantId: TENANT }, KEY);

    expect(readGoogleOauthState(state, KEY)).toEqual(
      expect.objectContaining({ userId: USER, tenantId: TENANT })
    );
  });

  it("rejects a tampered payload or the wrong key", () => {
    const state = signGoogleOauthState({ userId: USER, tenantId: TENANT }, KEY);
    const [payload, sig] = state.split(".");

    expect(readGoogleOauthState(`${payload?.slice(0, -1)}x.${sig}`, KEY)).toBeNull();
    expect(readGoogleOauthState(state, "other-key")).toBeNull();
  });
});
