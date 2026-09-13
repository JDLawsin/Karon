import { describe, expect, it } from "vitest";

import {
  deviceLabel,
  emailByUserId,
  staffMemberLabel,
  visibleDeviceSessions
} from "./staff-labels";

describe("emailByUserId", () => {
  it("maps valid emails and skips missing ones", () => {
    expect(
      emailByUserId([
        { id: "11111111-1111-4111-8111-111111111111", email: "owner@clinic.test" },
        { id: "22222222-2222-4222-8222-222222222222", email: null },
        { id: "33333333-3333-4333-8333-333333333333", email: "" }
      ])
    ).toEqual({
      "11111111-1111-4111-8111-111111111111": "owner@clinic.test"
    });
  });
});

describe("staffMemberLabel", () => {
  it("hides the user id when email is missing", () => {
    expect(staffMemberLabel("assistant", "aide@clinic.test")).toBe(
      "assistant · aide@clinic.test"
    );
    expect(staffMemberLabel("owner", null)).toBe("owner");
  });
});

describe("deviceLabel", () => {
  it("uses email and last-used time instead of a session id", () => {
    expect(
      deviceLabel("2026-09-11T08:00:00.000Z", "aide@clinic.test", "2026-09-11T08:00:00.000Z")
    ).toBe(
      `Revoked · aide@clinic.test · last used ${new Intl.DateTimeFormat("en-PH", {
        dateStyle: "medium",
        timeStyle: "short"
      }).format(new Date("2026-09-11T08:00:00.000Z"))}`
    );
    expect(deviceLabel(null, null, "not-a-date")).toBe("Active");
    expect(deviceLabel(null, "owner@clinic.test", "2026-09-11T08:00:00.000Z", true)).toBe(
      `This device · owner@clinic.test · last used ${new Intl.DateTimeFormat("en-PH", {
        dateStyle: "medium",
        timeStyle: "short"
      }).format(new Date("2026-09-11T08:00:00.000Z"))}`
    );
  });
});

describe("visibleDeviceSessions", () => {
  it("drops revoked sessions and keeps the five newest active", () => {
    const sessions = [1, 2, 3, 4, 5, 6].map((n) => ({
      id: `active-${n}`,
      revokedAt: null as string | null
    }));
    sessions.splice(2, 0, { id: "revoked", revokedAt: "2026-09-12T08:00:00.000Z" });

    expect(visibleDeviceSessions(sessions).map((session) => session.id)).toEqual([
      "active-1",
      "active-2",
      "active-3",
      "active-4",
      "active-5"
    ]);
  });
});
