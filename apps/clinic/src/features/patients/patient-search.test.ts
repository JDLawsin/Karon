import { describe, expect, it } from "vitest";

import {
  findPatientsByMobile,
  mobileDigits,
  searchPatients,
  type PatientSearchRow
} from "./patient-search";

const patients: PatientSearchRow[] = Array.from({ length: 60 }, (_, index) => ({
  id: `patient-${index.toString().padStart(2, "0")}`,
  name: index === 42 ? "Mia Santos" : `Patient ${index.toString().padStart(2, "0")}`,
  mobile: index === 42 ? "+63 917 555 0102" : `0917000${index.toString().padStart(4, "0")}`
}));

describe("patient search", () => {
  it("matches name and normalized mobile substrings", () => {
    expect(searchPatients(patients, "san").rows.map((patient) => patient.id)).toEqual([
      "patient-42"
    ]);
    expect(searchPatients(patients, "5550102").rows.map((patient) => patient.id)).toEqual([
      "patient-42"
    ]);
  });

  it("bounds empty and wildcard-only searches", () => {
    const first = searchPatients(patients, "%_*", 1, 20);
    const second = searchPatients(patients, "", 2, 20);

    expect(first.rows).toHaveLength(20);
    expect(first.total).toBe(60);
    expect(first.pageCount).toBe(3);
    expect(second.rows).toHaveLength(20);
    expect(second.rows.some((patient) => first.rows.includes(patient))).toBe(false);
  });

  it("caps a caller-provided page size", () => {
    expect(searchPatients(patients, "", 1, 1_000).rows).toHaveLength(50);
  });

  it("finds exact mobile duplicates without making the mobile unique", () => {
    expect(findPatientsByMobile(patients, "0917-555-0102")).toEqual([
      patients[42]
    ]);
    expect(findPatientsByMobile(patients, "0063 917 555 0102")).toEqual([
      patients[42]
    ]);
    expect(findPatientsByMobile(patients, "")).toEqual([]);
  });

  it("normalizes Philippine international dialing prefixes", () => {
    expect(mobileDigits("0063 917 555 0102")).toBe("09175550102");
    expect(mobileDigits("+63 917 555 0102")).toBe("09175550102");
  });
});
