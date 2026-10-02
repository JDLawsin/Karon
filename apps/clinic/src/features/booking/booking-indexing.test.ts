import { describe, expect, it } from "vitest";

import {
  bookingIndexingMissingItems,
  clinicCityOf,
  isBookingPageComplete
} from "./booking-indexing";

const complete = {
  name: "Happy Teeth",
  phone: "09171234567",
  address: { line1: "123 Osmena Blvd", city: " Cebu City " },
  hours: { days: [1, 2, 3, 4, 5], open: "09:00", close: "17:00" }
};

describe("booking indexing completeness", () => {
  it("accepts a complete profile with a service and a real slot", () => {
    expect(isBookingPageComplete(complete, 1)).toBe(true);
    expect(clinicCityOf(complete.address)).toBe("Cebu City");
  });

  it("rejects whitespace cities and names every missing item", () => {
    const missing = bookingIndexingMissingItems(
      { ...complete, address: { line1: "123 Osmena Blvd", city: "   " } },
      0
    );

    expect(missing.map(({ label }) => label)).toEqual(["city", "services"]);
  });

  it("requires enough opening time for one slot", () => {
    expect(
      bookingIndexingMissingItems(
        { ...complete, hours: { days: [1], open: "09:00", close: "09:15" } },
        1
      ).map(({ label }) => label)
    ).toContain("bookable slot hours");
  });
});
