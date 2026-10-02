import { describe, expect, it } from "vitest";

import {
  assertLegalLeadCapture,
  legalApproval,
  legalLaunchReady,
  parseLeadRetentionDays,
  readLegalContactEmail
} from "./legal-status";

const approved = {
  status: "approved",
  approvedAt: "2026-10-02",
  approvedBy: "Counsel"
} as const;

describe("legal launch gate", () => {
  it("blocks an enabled production lead form while counsel approval is pending", () => {
    expect(legalApproval.status).toBe("pending");
    expect(() => assertLegalLeadCapture("production", true)).toThrow(
      "Lead capture requires final counsel-approved notices"
    );
  });

  it("allows local work and a disabled production form", () => {
    expect(() => assertLegalLeadCapture("development", true)).not.toThrow();
    expect(() => assertLegalLeadCapture("production", false)).not.toThrow();
  });

  it("requires approval evidence, final wording, and the approved retention period together", () => {
    expect(legalLaunchReady({
      approval: approved,
      noticeVersion: "2026-10-02-draft",
      retentionDays: "365"
    })).toBe(false);
    expect(legalLaunchReady({
      approval: { ...approved, approvedAt: "2026-99-99" },
      noticeVersion: "2026-10-02",
      retentionDays: "365"
    })).toBe(false);
    expect(legalLaunchReady({
      approval: approved,
      noticeVersion: "2026-10-02",
      retentionDays: undefined
    })).toBe(false);
    expect(legalLaunchReady({
      approval: approved,
      noticeVersion: "2026-10-02",
      retentionDays: "365"
    })).toBe(true);
    expect(() => assertLegalLeadCapture("production", true, {
      approval: approved,
      noticeVersion: "2026-10-02",
      retentionDays: "365"
    })).not.toThrow();
  });

  it("accepts only bounded whole-day retention values", () => {
    expect(parseLeadRetentionDays("365")).toBe(365);
    expect(parseLeadRetentionDays("0")).toBeNull();
    expect(parseLeadRetentionDays("1.5")).toBeNull();
    expect(parseLeadRetentionDays(undefined)).toBeNull();
  });

  it("requires a configured production privacy contact", () => {
    expect(readLegalContactEmail(" privacy@example.test ", "production"))
      .toBe("privacy@example.test");
    expect(() => readLegalContactEmail(undefined, "production")).toThrow(
      "LEGAL_CONTACT_EMAIL is required"
    );
    expect(readLegalContactEmail(undefined, "development")).toBe("privacy@example.test");
  });
});
