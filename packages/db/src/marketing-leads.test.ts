import { describe, expect, it } from "vitest";

import {
  leadRetentionCutoff,
  leadRetentionDaysSchema,
  marketingLeadDeletionSchema,
  marketingLeadInputSchema,
  marketingLeadSchemaColumns,
  normalizeLeadMobile
} from "./marketing-leads";

const validLead = {
  submissionId: "4cf7f7e0-aa10-4fd8-bfff-a4c45d2ec112",
  intent: "application",
  name: "Dr Ana Cruz",
  clinicName: "Cruz Dental",
  country: "PH",
  province: "Cebu",
  city: "Cebu City",
  email: "ana@example.test",
  clinicSize: "1_chair",
  role: "owner_dentist",
  mobile: "0917 123 4567",
  message: "We would like to learn more.",
  privacyAcknowledged: true,
  marketingOptIn: false,
  privacyNoticeVersion: "2026-09-30",
  marketingWordingVersion: "2026-09-30",
  sourcePage: "/demo",
  renderedAt: Date.now() - 5_000,
  turnstileToken: "test-token",
  website: "",
  attribution: {
    utmSource: "facebook",
    landingPath: "/pricing",
    referrerDomain: "example.com"
  }
} as const;

describe("marketing lead schema", () => {
  it("accepts the approved application fields and rejects unknown fields", () => {
    expect(marketingLeadInputSchema.safeParse(validLead).success).toBe(true);
    expect(
      marketingLeadInputSchema.safeParse({ ...validLead, diagnosis: "private" }).success
    ).toBe(false);
  });

  it("keeps demo time optional, removes it from applications, and defaults an unknown intent", () => {
    expect(
      marketingLeadInputSchema.safeParse({ ...validLead, intent: "tampered" }).data
    ).toEqual(expect.objectContaining({ intent: "application" }));
    expect(marketingLeadInputSchema.safeParse({ ...validLead, intent: "demo" }).success).toBe(true);
    expect(
      marketingLeadInputSchema.safeParse({
        ...validLead,
        intent: "demo",
        preferredTime: "weekday_morning"
      }).success
    ).toBe(true);
    expect(
      marketingLeadInputSchema.parse({
        ...validLead,
        preferredTime: "weekday_morning"
      })
    ).not.toHaveProperty("preferredTime");
  });

  it("normalizes supported Philippine mobile forms and preserves non-PH input", () => {
    for (const mobile of [
      "09171234567",
      "0917 123 4567",
      "917-123-4567",
      "+639171234567"
    ]) {
      expect(normalizeLeadMobile("PH", mobile)).toEqual({
        mobile: "+639171234567",
        valid: true
      });
    }

    expect(normalizeLeadMobile("SG", "+65 8123 4567")).toEqual({
      mobile: "+65 8123 4567",
      valid: true
    });
    expect(
      marketingLeadInputSchema.parse({ ...validLead, country: "SG", mobile: "  +65 8123 4567  " }).mobile
    ).toBe("  +65 8123 4567  ");
    expect(normalizeLeadMobile("PH", "123").valid).toBe(false);
  });

  it("keeps the storage schema free of patient and clinical fields", () => {
    expect(marketingLeadSchemaColumns).not.toEqual(
      expect.arrayContaining([
        "patient",
        "diagnosis",
        "treatment",
        "balance",
        "payment_reference"
      ])
    );
  });

  it("requires an explicit bounded retention period and computes its cutoff", () => {
    expect(leadRetentionDaysSchema.parse("365")).toBe(365);
    expect(leadRetentionDaysSchema.safeParse(0).success).toBe(false);
    expect(leadRetentionDaysSchema.safeParse(3_651).success).toBe(false);
    expect(leadRetentionCutoff(new Date("2026-10-01T00:00:00.000Z"), 30).toISOString())
      .toBe("2026-09-01T00:00:00.000Z");
  });

  it("normalizes deletion-request email addresses", () => {
    expect(marketingLeadDeletionSchema.parse({ email: " DENTIST@EXAMPLE.TEST " }).email)
      .toBe("dentist@example.test");
    expect(marketingLeadDeletionSchema.safeParse({ email: "not-an-email" }).success).toBe(false);
  });
});
