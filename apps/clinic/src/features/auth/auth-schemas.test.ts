import { describe, expect, it } from "vitest";

import {
  changePasswordSchema,
  clinicOnboardingSchema,
  forgotPasswordSchema,
  loginCredentialsSchema,
  passwordSchema,
  signupCredentialsSchema,
  updatePasswordSchema
} from "./auth-schemas";

describe("passwordSchema", () => {
  it("accepts a 12-character mixed password", () => {
    expect(passwordSchema.safeParse("Clinic-test-pass-12").success).toBe(true);
  });

  it("rejects short or single-case passwords", () => {
    expect(passwordSchema.safeParse("Short1A").success).toBe(false);
    expect(passwordSchema.safeParse("alllowercase12").success).toBe(false);
    expect(passwordSchema.safeParse("ALLUPPERCASE12").success).toBe(false);
    expect(passwordSchema.safeParse("NoDigitsHereAA").success).toBe(false);
  });
});

describe("credentials schemas", () => {
  it("lets login stay at 8 characters so existing accounts still submit", () => {
    expect(
      loginCredentialsSchema.safeParse({
        email: "owner@clinic.example",
        password: "12345678"
      }).success
    ).toBe(true);
  });

  it("requires the stronger password on signup", () => {
    expect(
      signupCredentialsSchema.safeParse({
        email: "owner@clinic.example",
        password: "12345678"
      }).success
    ).toBe(false);
  });
});

describe("clinicOnboardingSchema", () => {
  it("trims and bounds clinic names", () => {
    expect(clinicOnboardingSchema.safeParse({ name: "  Ab  " }).data).toEqual({
      name: "Ab"
    });
    expect(clinicOnboardingSchema.safeParse({ name: "A" }).success).toBe(false);
  });
});

describe("forgot password schemas", () => {
  it("accepts an email for a reset request", () => {
    expect(
      forgotPasswordSchema.safeParse({ email: "owner@clinic.example" }).success
    ).toBe(true);
    expect(forgotPasswordSchema.safeParse({ email: "not-an-email" }).success).toBe(
      false
    );
  });

  it("requires matching new passwords that meet the signup rules", () => {
    expect(
      updatePasswordSchema.safeParse({
        password: "Clinic-test-pass-12",
        confirm: "Clinic-test-pass-12"
      }).success
    ).toBe(true);
    expect(
      updatePasswordSchema.safeParse({
        password: "Clinic-test-pass-12",
        confirm: "Clinic-test-pass-13"
      }).success
    ).toBe(false);
    expect(
      updatePasswordSchema.safeParse({
        password: "12345678",
        confirm: "12345678"
      }).success
    ).toBe(false);
  });

  it("requires the current password on a logged-in change", () => {
    expect(
      changePasswordSchema.safeParse({
        currentPassword: "12345678",
        password: "Clinic-test-pass-12",
        confirm: "Clinic-test-pass-12"
      }).success
    ).toBe(true);
    expect(
      changePasswordSchema.safeParse({
        currentPassword: "",
        password: "Clinic-test-pass-12",
        confirm: "Clinic-test-pass-12"
      }).success
    ).toBe(false);
  });
});
