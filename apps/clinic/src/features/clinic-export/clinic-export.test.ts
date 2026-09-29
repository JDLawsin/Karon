import { describe, expect, it } from "vitest";

import {
  appointmentCsvLine,
  csvCell,
  exportHeaderLine,
  parseExportKind,
  patientCsvLine,
  paymentCsvLine
} from "./clinic-export";

const EVENT_ID = "11111111-1111-4111-8111-111111111111";
const PATIENT_ID = "22222222-2222-4222-8222-222222222222";
const VISIT_ID = "33333333-3333-4333-8333-333333333333";

describe("clinic CSV export", () => {
  it("escapes spreadsheet formulas, quotes, commas, and new lines", () => {
    expect(csvCell("=HYPERLINK(\"bad\")")).toBe("\"'=HYPERLINK(\"\"bad\"\")\"");
    expect(csvCell(" \t=HYPERLINK(\"bad\")")).toBe(
      "\"' \t=HYPERLINK(\"\"bad\"\")\""
    );
    expect(csvCell("\r=HYPERLINK(\"bad\")")).toBe(
      "\"'\r=HYPERLINK(\"\"bad\"\")\""
    );
    expect(csvCell("Dela Cruz, Ana")).toBe('"Dela Cruz, Ana"');
    expect(csvCell("line 1\nline 2")).toBe('"line 1\nline 2"');
    expect(csvCell(0)).toBe("0");
  });

  it("uses stable documented columns for each export", () => {
    expect(exportHeaderLine("patients")).toBe(
      "patient_id,name,mobile,email,created_at,updated_at\r\n"
    );
    expect(exportHeaderLine("appointments")).toContain("patient_name,starts_at,status");
    expect(exportHeaderLine("payments")).toContain("amount_minor,currency,method");
    expect(parseExportKind("patients")).toBe("patients");
    expect(parseExportKind("charts")).toBeNull();
  });

  it("serializes patient, appointment, and payment rows", () => {
    expect(
      patientCsvLine({
        id: PATIENT_ID,
        name: "Ana, Cruz",
        mobile: "09171234567",
        email: null,
        created_at: "2026-09-20T01:00:00.000Z",
        updated_at: "2026-09-21T01:00:00.000Z"
      })
    ).toContain('"Ana, Cruz",09171234567,,');

    expect(
      appointmentCsvLine(
        {
          id: EVENT_ID,
          record_id: VISIT_ID,
          payload: {
            patientId: PATIENT_ID,
            startsAt: "2026-09-30T01:00:00.000Z",
            status: "waiting",
            serviceName: "Cleaning"
          },
          occurred_at: "2026-09-20T01:00:00.000Z",
          received_at: "2026-09-20T01:00:01.000Z"
        },
        "Ana Cruz",
        "complete"
      )
    ).toContain(",complete,Cleaning,,");

    expect(
      paymentCsvLine(
        {
          id: EVENT_ID,
          record_id: EVENT_ID,
          payload: {
            patientId: PATIENT_ID,
            visitId: VISIT_ID,
            amountMinor: 150_000,
            currency: "PHP",
            method: "gcash"
          },
          occurred_at: "2026-09-20T01:00:00.000Z",
          received_at: "2026-09-20T01:00:01.000Z"
        },
        "Ana Cruz"
      )
    ).toContain(",150000,PHP,gcash,");
  });
});
