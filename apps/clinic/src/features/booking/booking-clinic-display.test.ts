import { describe, expect, it } from "vitest";

import {
  clinicInitials,
  clinicPhoneOf,
  formatBookingDateChip,
  formatClinicAddress,
  formatClinicHours,
  formatClinicTimezone
} from "./booking-clinic-display";

describe("formatClinicAddress", () => {
  it("joins PH address parts and skips blanks", () => {
    expect(
      formatClinicAddress({
        line1: "123 Osmena Blvd",
        barangay: " ",
        city: "Cebu City",
        province: "Cebu",
        postalCode: "6000"
      })
    ).toBe("123 Osmena Blvd, Cebu City, Cebu, 6000");
  });

  it("returns null when nothing is usable", () => {
    expect(formatClinicAddress({})).toBeNull();
    expect(formatClinicAddress(null)).toBeNull();
    expect(formatClinicAddress("Cebu")).toBeNull();
  });
});

describe("clinicPhoneOf", () => {
  it("trims a phone or returns null", () => {
    expect(clinicPhoneOf(" 0917 123 4567 ")).toBe("0917 123 4567");
    expect(clinicPhoneOf("")).toBeNull();
    expect(clinicPhoneOf(null)).toBeNull();
  });
});

describe("formatClinicHours", () => {
  it("collapses consecutive days and clocks to am/pm", () => {
    expect(
      formatClinicHours({
        days: [1, 2, 3, 4, 5, 6],
        open: "09:00",
        close: "18:00"
      })
    ).toBe("Mon–Sat, 9:00 am – 6:00 pm");
  });

  it("lists non-consecutive days", () => {
    expect(
      formatClinicHours({
        days: [1, 3, 5],
        open: "08:30",
        close: "12:00"
      })
    ).toBe("Mon, Wed, Fri, 8:30 am – 12:00 pm");
  });
});

describe("formatBookingDateChip", () => {
  it("formats a calendar date without ISO", () => {
    expect(formatBookingDateChip("2026-09-14")).toBe("Mon, Sep 14");
  });

  it("passes through a bad date", () => {
    expect(formatBookingDateChip("soon")).toBe("soon");
  });
});

describe("formatClinicTimezone", () => {
  it("hides the Manila IANA name", () => {
    expect(formatClinicTimezone("Asia/Manila")).toBe("Times in Philippine time");
    expect(formatClinicTimezone("Asia/Singapore")).toBe("Times in Asia/Singapore");
  });
});

describe("clinicInitials", () => {
  it("uses up to two words", () => {
    expect(clinicInitials("Happy Teeth Clinic")).toBe("HT");
    expect(clinicInitials("Karon")).toBe("K");
  });
});

