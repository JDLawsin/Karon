import { describe, expect, it } from "vitest";

import {
  DEFAULT_CLINIC_REGIONAL_SETTINGS,
  clinicRegionalSettingsSchema,
  formatClinicDateTime,
  formatClinicMoney
} from "./regional-settings";

describe("clinicRegionalSettingsSchema", () => {
  it("accepts and canonicalizes supported clinic settings", () => {
    expect(
      clinicRegionalSettingsSchema.parse({
        currencyCode: "sgd",
        locale: "EN-sg",
        timezone: "Asia/Singapore"
      })
    ).toEqual({
      currencyCode: "SGD",
      locale: "en-SG",
      timezone: "Asia/Singapore"
    });
  });

  it("rejects missing or invalid regional settings", () => {
    expect(clinicRegionalSettingsSchema.safeParse({}).success).toBe(false);
    expect(
      clinicRegionalSettingsSchema.safeParse({
        ...DEFAULT_CLINIC_REGIONAL_SETTINGS,
        currencyCode: "ABC"
      }).success
    ).toBe(false);
    expect(
      clinicRegionalSettingsSchema.safeParse({
        ...DEFAULT_CLINIC_REGIONAL_SETTINGS,
        locale: "not_a_locale"
      }).success
    ).toBe(false);
    expect(
      clinicRegionalSettingsSchema.safeParse({
        ...DEFAULT_CLINIC_REGIONAL_SETTINGS,
        timezone: "Mars/Olympus_Mons"
      }).success
    ).toBe(false);
  });
});

describe("clinic regional formatting", () => {
  it("formats money with the clinic currency and locale", () => {
    expect(formatClinicMoney(150_050, "USD", "en-US")).toBe("$1,500.50");
    expect(formatClinicMoney(150_050, "EUR", "de-DE")).toBe("1.500,50\u00a0€");
  });

  it("formats the same instant in the clinic locale and timezone", () => {
    expect(
      formatClinicDateTime("2026-09-29T02:00:00.000Z", {
        locale: "en-SG",
        timezone: "Asia/Singapore"
      })
    ).toBe("29 Sept 2026, 10:00 am");
  });
});
