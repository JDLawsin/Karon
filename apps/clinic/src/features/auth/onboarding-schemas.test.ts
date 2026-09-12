import { describe, expect, it } from "vitest";

import {
  clinicOnboardingSchema,
  clinicPhoneSchema,
  defaultOnboardingValues,
  fromClinicRow,
  onboardingHoursSchema,
  onboardingIdentitySchema,
  onboardingStaffSchema,
  parseLogoFile,
  staffInviteEmails,
  stepForOnboardingIssues,
  toClinicProfile
} from "./onboarding-schemas";

const validIdentity = {
  name: "  Ab  ",
  phone: "09171234567",
  email: "clinic@example.com",
  line1: "",
  barangay: "",
  city: "",
  province: "",
  postalCode: ""
};

describe("clinicOnboardingSchema", () => {
  it("trims and bounds clinic names", () => {
    expect(onboardingIdentitySchema.safeParse(validIdentity).data).toMatchObject({
      name: "Ab"
    });
    expect(
      onboardingIdentitySchema.safeParse({ ...validIdentity, name: "A" }).success
    ).toBe(false);
  });

  it("accepts PH-style clinic phones and rejects short ones", () => {
    expect(clinicPhoneSchema.safeParse("09171234567").success).toBe(true);
    expect(clinicPhoneSchema.safeParse("+63 917 123 4567").success).toBe(true);
    expect(clinicPhoneSchema.safeParse("123").success).toBe(false);
  });

  it("requires at least one working day and close after open", () => {
    expect(
      onboardingHoursSchema.safeParse({
        timezone: "Asia/Manila",
        days: [],
        open: "09:00",
        close: "18:00"
      }).success
    ).toBe(false);
    expect(
      onboardingHoursSchema.safeParse({
        timezone: "Asia/Manila",
        days: [1],
        open: "18:00",
        close: "09:00"
      }).success
    ).toBe(false);
    expect(
      onboardingHoursSchema.safeParse({
        timezone: "Asia/Manila",
        days: [1, 2],
        open: "09:00",
        close: "18:00"
      }).success
    ).toBe(true);
  });

  it("allows empty staff rows and rejects invalid leftover emails", () => {
    expect(
      onboardingStaffSchema.safeParse({ staffEmails: ["", "  "] }).success
    ).toBe(true);
    expect(
      onboardingStaffSchema.safeParse({ staffEmails: ["not-an-email"] }).success
    ).toBe(false);
    expect(
      onboardingStaffSchema.safeParse({
        staffEmails: ["assistant@example.com"]
      }).success
    ).toBe(true);
  });

  it("builds a profile and drops blank invites", () => {
    const values = {
      ...defaultOnboardingValues(),
      name: "Sunrise Dental",
      phone: "09171234567",
      email: "clinic@example.com",
      staffEmails: ["", "  assistant@example.com  "],
      services: [{ id: "1", name: "  Extraction  " }]
    };
    const parsed = clinicOnboardingSchema.safeParse(values);
    expect(parsed.success).toBe(true);
    if (!parsed.success) {
      return;
    }
    expect(toClinicProfile(parsed.data).services).toEqual([
      { id: "1", name: "Extraction" }
    ]);
    expect(staffInviteEmails(parsed.data)).toEqual(["assistant@example.com"]);
  });

  it("sends review-step issues back to the earliest step", () => {
    expect(
      stepForOnboardingIssues([{ path: ["staffEmails", 0] }, { path: ["close"] }])
    ).toBe(1);
    expect(stepForOnboardingIssues([{ path: ["staffEmails", 1] }])).toBe(2);
  });

  it("loads a clinic row with defaults for missing hours", () => {
    const values = fromClinicRow({
      name: "Saved Clinic",
      timezone: "Asia/Manila",
      phone: "09171234567",
      email: "clinic@example.com",
      address: { city: "Cebu" },
      hours: null,
      services: [],
      logo_path: null
    });
    expect(values.name).toBe("Saved Clinic");
    expect(values.city).toBe("Cebu");
    expect(values.days.length).toBeGreaterThan(0);
  });
});

describe("parseLogoFile", () => {
  it("rejects the wrong type or an oversized file", () => {
    const text = new File(["x"], "note.txt", { type: "text/plain" });
    expect(parseLogoFile(text).ok).toBe(false);
    const huge = new File([new Uint8Array(513 * 1024)], "logo.png", {
      type: "image/png"
    });
    expect(parseLogoFile(huge).ok).toBe(false);
  });
});
