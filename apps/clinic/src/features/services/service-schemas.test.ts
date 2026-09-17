import { describe, expect, it } from "vitest";

import {
  COMMON_DENTAL_SERVICES,
  filterDentalServiceSuggestions,
  matchDentalServiceSuggestion
} from "./service-catalog";
import { isServiceIconKey } from "./service-icons";
import {
  formatServicePrice,
  priceMajorToMinor,
  priceMinorToMajor
} from "./service-money";
import { parseClinicServices, serviceFormSchema } from "./service-schemas";

describe("serviceFormSchema", () => {
  it("accepts optional icon and description", () => {
    const parsed = serviceFormSchema.safeParse({
      name: "Tooth extraction",
      description: "Simple removal of a tooth under local anesthesia.",
      icon: "extraction",
      priceMajor: 1500,
      durationMinutes: 45
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects unknown icons", () => {
    const parsed = serviceFormSchema.safeParse({
      name: "Tooth extraction",
      icon: "stethoscope",
      priceMajor: 1500,
      durationMinutes: 45
    });

    expect(parsed.success).toBe(false);
  });

  it.each([
    { priceMajor: -1, durationMinutes: 30 },
    { priceMajor: 1000, durationMinutes: 0 }
  ])("rejects invalid pricing %#", ({ priceMajor, durationMinutes }) => {
    expect(
      serviceFormSchema.safeParse({
        name: "Cleaning",
        priceMajor,
        durationMinutes
      }).success
    ).toBe(false);
  });
});

describe("service money", () => {
  it("converts and formats minor units in the clinic currency", () => {
    expect(priceMajorToMinor(1500.5, "PHP")).toBe(150_050);
    expect(priceMajorToMinor(10.01, "PHP")).toBe(1001);
    expect(priceMinorToMajor(150_050, "PHP")).toBe(1500.5);
    expect(formatServicePrice(150_050, "PHP")).toContain("1,500.50");
  });

  it("rejects unsupported precision and malformed currency codes", () => {
    expect(() => priceMajorToMinor(10.001, "PHP")).toThrow(/decimal places/);
    expect(() => priceMajorToMinor(10, "php")).toThrow();
  });
});

describe("COMMON_DENTAL_SERVICES", () => {
  it("covers core PH clinic bookings with valid icons and short copy", () => {
    expect(COMMON_DENTAL_SERVICES.length).toBeGreaterThanOrEqual(12);

    for (const service of COMMON_DENTAL_SERVICES) {
      expect(isServiceIconKey(service.icon)).toBe(true);
      expect(service.name.length).toBeGreaterThan(0);
      expect(service.name.length).toBeLessThanOrEqual(80);
      expect(service.description.length).toBeGreaterThan(0);
      expect(service.description.length).toBeLessThanOrEqual(280);
    }
  });

  it("filters and exact-matches suggestions", () => {
    expect(filterDentalServiceSuggestions("whit").map((row) => row.name)).toEqual([
      "Teeth whitening"
    ]);
    expect(matchDentalServiceSuggestion("oral prophylaxis")?.icon).toBe("cleaning");
    expect(matchDentalServiceSuggestion("unknown")).toBeNull();
  });
});

describe("parseClinicServices", () => {
  it("drops invalid rows", () => {
    expect(
      parseClinicServices([
        {
          id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
          tenant_id: "b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
          name: "Cleaning",
          description: null,
          icon: null,
          price_minor: null,
          currency_code: null,
          duration_minutes: null,
          created_at: "2026-09-14T00:00:00.000Z",
          updated_at: "2026-09-14T00:00:00.000Z",
          created_by: "c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a33",
          updated_by: "c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a33"
        },
        { id: "bad" }
      ])
    ).toHaveLength(1);
  });
});
