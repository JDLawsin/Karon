import { describe, expect, it } from "vitest";

import { deviceLabel, emailByUserId, staffMemberLabel } from "./staff-labels";

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
  });
});
