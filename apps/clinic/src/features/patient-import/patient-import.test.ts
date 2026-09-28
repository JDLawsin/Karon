import { describe, expect, it } from "vitest";

import {
  ImportFileError,
  applyImportDecisions,
  buildOpeningBalanceImportRows,
  buildPatientImportRows,
  errorRowsCsv,
  importEvents,
  parseCsv,
  patientImportJobSchema,
  sourceFromMatrix,
  suggestOpeningBalanceMapping,
  suggestMapping,
  type PatientImportJob
} from "./patient-import";

const job = (
  rows: PatientImportJob["rows"],
  includeOpeningBalances = false
): PatientImportJob =>
  patientImportJobSchema.parse({
    id: "10000000-0000-4000-8000-000000000001",
    tenant_id: "10000000-0000-4000-8000-000000000002",
    created_by: "10000000-0000-4000-8000-000000000003",
    status: "preview_ready",
    file_name: "patients.csv",
    storage_path:
      "10000000-0000-4000-8000-000000000002/10000000-0000-4000-8000-000000000001/source.csv",
    content_type: "text/csv",
    file_size: 100,
    include_opening_balances: includeOpeningBalances,
    columns: ["Name", "Mobile", "Email"],
    mapping: { name: "Name", mobile: "Mobile", email: "Email" },
    rows,
    total_rows: rows.length,
    imported_rows: 0,
    failed_rows: rows.filter((row) => row.error).length,
    skipped_rows: 0,
    last_error: null,
    expires_at: "2026-09-28T00:00:00.000Z",
    object_deleted_at: null,
    data_purged_at: null,
    completed_at: null,
    created_at: "2026-09-27T00:00:00.000Z",
    updated_at: "2026-09-27T00:00:00.000Z"
  });

describe("patient import", () => {
  it("parses quoted CSV fields and rejects malformed quotes", () => {
    expect(parseCsv('Name,Mobile,Note\r\n"Santos, Mae",09171234567,"Line 1\nLine 2"')).toEqual([
      ["Name", "Mobile", "Note"],
      ["Santos, Mae", "09171234567", "Line 1\nLine 2"]
    ]);
    expect(() => parseCsv('Name,Mobile\n"Mae,0917')).toThrow(ImportFileError);
  });

  it("maps columns, validates rows, and soft-flags existing and file duplicates", () => {
    const source = sourceFromMatrix([
      ["Patient Name", "Phone", "Email"],
      ["Mae Santos", "09171234567", "mae@example.com"],
      ["Mae Duplicate", "+63 917 123 4567", ""],
      ["No Mobile", "x", ""]
    ]);
    const mapping = suggestMapping(source.columns);
    const rows = buildPatientImportRows(source, mapping, [
      {
        id: "10000000-0000-4000-8000-000000000099",
        name: "Existing Mae",
        mobile: "09171234567"
      }
    ]);

    expect(mapping).toEqual({
      name: "Patient Name",
      mobile: "Phone",
      email: "Email",
      openingBalanceAmount: null,
      openingBalanceNote: null
    });
    expect(rows[0]).toMatchObject({
      duplicateName: "Existing Mae",
      decision: "skip"
    });
    expect(rows[1]).toMatchObject({
      duplicateName: "Existing Mae",
      decision: "skip"
    });
    expect(rows[2]?.error).toBe("Mobile must contain 7 to 15 digits.");
  });

  it("persists duplicate choices as idempotent patient events", () => {
    const source = sourceFromMatrix([
      ["Name", "Mobile"],
      ["Mae Updated", "09171234567"],
      ["Ana Cruz", "09991234567"]
    ]);
    const rows = buildPatientImportRows(
      source,
      { name: "Name", mobile: "Mobile", email: null },
      [
        {
          id: "10000000-0000-4000-8000-000000000099",
          name: "Mae Santos",
          mobile: "09171234567"
        }
      ]
    );
    const decided = applyImportDecisions(rows, [
      { rowNumber: 2, decision: "merge" },
      { rowNumber: 3, decision: "create" }
    ]);
    const events = importEvents(job(decided), decided, "2026-09-27T10:00:00.000Z");

    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({
      event_type: "patient.updated",
      record_id: "10000000-0000-4000-8000-000000000099"
    });
    expect(events[1]).toMatchObject({ event_type: "patient.created" });
  });

  it("preserves an existing email when a merged row leaves email blank", () => {
    const source = sourceFromMatrix([
      ["Name", "Mobile", "Email"],
      ["Mae Updated", "09171234567", ""]
    ]);
    const existingPatients = [
      {
        id: "10000000-0000-4000-8000-000000000099",
        name: "Mae Santos",
        mobile: "09171234567",
        email: "mae@example.com"
      }
    ];
    const rows = buildPatientImportRows(
      source,
      { name: "Name", mobile: "Mobile", email: "Email" },
      existingPatients
    );
    const decided = applyImportDecisions(rows, [
      { rowNumber: 2, decision: "merge" }
    ]);

    expect(importEvents(job(decided), decided)[0]?.payload).toMatchObject({
      email: "mae@example.com"
    });
  });

  it("does not copy a duplicate email when creating a separate patient", () => {
    const source = sourceFromMatrix([
      ["Name", "Mobile"],
      ["Mae Duplicate", "09171234567"]
    ]);
    const existingPatients = [
      {
        id: "10000000-0000-4000-8000-000000000099",
        name: "Mae Santos",
        mobile: "09171234567",
        email: "mae@example.com"
      }
    ];
    const rows = buildPatientImportRows(
      source,
      { name: "Name", mobile: "Mobile", email: null },
      existingPatients
    );
    const decided = applyImportDecisions(rows, [
      { rowNumber: 2, decision: "create" }
    ]);

    expect(importEvents(job(decided), decided)[0]?.payload).not.toHaveProperty(
      "email"
    );
  });

  it("exports only failed source rows with their reason", () => {
    const source = sourceFromMatrix([
      ["Name", "Mobile", "Email"],
      ["Valid", "09171234567", ""],
      ["Broken", "1", "bad@example.com"]
    ]);
    const rows = buildPatientImportRows(
      source,
      { name: "Name", mobile: "Mobile", email: "Email" },
      []
    );

    expect(errorRowsCsv(job(rows))).toContain(
      '"Broken","1","bad@example.com","Mobile must contain 7 to 15 digits."'
    );
    expect(errorRowsCsv(job(rows))).not.toContain('"Valid","09171234567"');
  });

  it("neutralizes spreadsheet formulas in error CSV cells", () => {
    const source = sourceFromMatrix([
      ["Name", "Mobile", "Email"],
      ["=HYPERLINK(\"https://example.invalid\")", "1", ""]
    ]);
    const rows = buildPatientImportRows(
      source,
      { name: "Name", mobile: "Mobile", email: "Email" },
      []
    );

    expect(errorRowsCsv(job(rows))).toContain(
      '"\'=HYPERLINK(""https://example.invalid"")"'
    );
  });
});

describe("opening balance note import", () => {
  it("matches existing patients by mobile and rejects an unknown mobile", () => {
    const source = sourceFromMatrix([
      ["Mobile", "Opening balance", "Note"],
      ["+63 917 123 4567", "1200.50", "Balance carried from the old ledger"],
      ["09991234567", "500", "Unmatched patient"],
      ["09221234567", "700", "Ambiguous patient"]
    ]);
    const mapping = suggestOpeningBalanceMapping(source.columns);
    const rows = buildOpeningBalanceImportRows(source, mapping, [
      {
        id: "10000000-0000-4000-8000-000000000099",
        name: "Mae Santos",
        mobile: "09171234567"
      },
      {
        id: "10000000-0000-4000-8000-000000000098",
        name: "First duplicate",
        mobile: "09221234567"
      },
      {
        id: "10000000-0000-4000-8000-000000000097",
        name: "Second duplicate",
        mobile: "+63 922 123 4567"
      }
    ], "PHP");

    expect(mapping).toEqual({
      name: null,
      mobile: "Mobile",
      email: null,
      openingBalanceAmount: "Opening balance",
      openingBalanceNote: "Note"
    });
    expect(rows[0]).toMatchObject({
      patientId: "10000000-0000-4000-8000-000000000099",
      name: "Mae Santos",
      openingBalanceAmountMinor: 120_050,
      openingBalanceCurrency: "PHP",
      openingBalanceNote: "Balance carried from the old ledger",
      decision: "merge"
    });
    expect(rows[1]?.error).toBe("No patient matches this mobile number.");
    expect(rows[2]?.error).toBe("More than one patient matches this mobile number.");
  });

  it("creates opening balance events without fabricating payment history", () => {
    const source = sourceFromMatrix([
      ["Mobile", "Balance", "Note"],
      ["09171234567", "800", "Starting amount only"]
    ]);
    const rows = buildOpeningBalanceImportRows(
      source,
      {
        name: null,
        mobile: "Mobile",
        email: null,
        openingBalanceAmount: "Balance",
        openingBalanceNote: "Note"
      },
      [{
        id: "10000000-0000-4000-8000-000000000099",
        name: "Mae Santos",
        mobile: "09171234567"
      }],
      "PHP"
    );

    const events = importEvents(job(rows, true), rows, "2026-09-27T10:00:00.000Z");

    expect(events).toEqual([
      expect.objectContaining({
        event_type: "opening_balance.noted",
        record_id: "10000000-0000-4000-8000-000000000099",
        payload: {
          patientId: "10000000-0000-4000-8000-000000000099",
          amountMinor: 80_000,
          currency: "PHP",
          note: "Starting amount only"
        }
      })
    ]);
    expect(events.some((event) => event.event_type === "payment.recorded")).toBe(false);
  });
});
