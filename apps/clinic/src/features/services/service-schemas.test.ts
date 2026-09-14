import { describe, expect, it } from "vitest";

import {
  COMMON_DENTAL_SERVICES,
  filterDentalServiceSuggestions,
  matchDentalServiceSuggestion
} from "./service-catalog";
import { isServiceIconKey } from "./service-icons";
import { parseClinicServices, serviceFormSchema } from "./service-schemas";

describe("serviceFormSchema", () => {
  it("accepts optional icon and description", () => {
    const parsed = serviceFormSchema.safeParse({
      name: "Tooth extraction",
      description: "Simple removal of a tooth under local anesthesia.",
      icon: "extraction"
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects unknown icons", () => {
    const parsed = serviceFormSchema.safeParse({
      name: "Tooth extraction",
      icon: "stethoscope"
    });

    expect(parsed.success).toBe(false);
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
