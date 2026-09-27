import { describe, expect, it } from "vitest";

import {
  buildServiceImportRows,
  serviceIdsToRemove,
  serviceErrorRowsCsv,
  suggestServiceMapping
} from "./service-import";

const source = {
  columns: ["Code", "Service", "Price", "Minutes", "Currency"],
  rows: [
    {
      rowNumber: 2,
      values: {
        Code: "CLEAN",
        Service: "Oral prophylaxis",
        Price: "1500.00",
        Minutes: "45",
        Currency: "PHP"
      }
    }
  ]
};

describe("service import", () => {
  it("maps a clinic-currency row to minor units and an existing service", () => {
    const mapping = suggestServiceMapping(source.columns);
    const rows = buildServiceImportRows(source, mapping, "PHP", [
      {
        id: "10000000-0000-4000-8000-000000000001",
        name: "Cleaning",
        code: "CLEAN"
      }
    ]);

    expect(mapping).toEqual({
      name: "Service",
      price: "Price",
      duration: "Minutes",
      code: "Code",
      currency: "Currency"
    });
    expect(rows[0]).toMatchObject({
      name: "Oral prophylaxis",
      code: "CLEAN",
      priceMinor: 150_000,
      durationMinutes: 45,
      currencyCode: "PHP",
      existingServiceId: "10000000-0000-4000-8000-000000000001",
      action: "update"
    });
  });

  it("rejects invalid prices, currency mismatches, and a missing clinic currency", () => {
    const mapping = suggestServiceMapping(source.columns);
    const invalid = {
      ...source,
      rows: [
        { ...source.rows[0]!, values: { ...source.rows[0]!.values, Price: "1,500" } },
        {
          rowNumber: 3,
          values: { ...source.rows[0]!.values, Currency: "USD" }
        }
      ]
    };

    const rows = buildServiceImportRows(invalid, mapping, "PHP", []);
    expect(rows[0]?.error).toBe("Price must be a plain non-negative amount.");
    expect(rows[1]?.error).toBe("Currency must match the clinic currency (PHP).");
    expect(buildServiceImportRows(source, mapping, null, [])[0]?.error).toBe(
      "Set the clinic currency before importing prices."
    );
  });

  it("marks duplicate codes in the file as errors", () => {
    const duplicated = {
      ...source,
      rows: [
        source.rows[0]!,
        {
          rowNumber: 3,
          values: { ...source.rows[0]!.values, Service: "Another cleaning" }
        }
      ]
    };
    const rows = buildServiceImportRows(
      duplicated,
      suggestServiceMapping(source.columns),
      "PHP",
      []
    );

    expect(rows[1]?.error).toBe("Code is duplicated in this file.");
  });

  it("retains an existing code when the optional code column is not imported", () => {
    const withoutCode = {
      columns: ["Service", "Price", "Minutes"],
      rows: [
        {
          rowNumber: 2,
          values: { Service: "Cleaning", Price: "1500", Minutes: "45" }
        }
      ]
    };
    const rows = buildServiceImportRows(
      withoutCode,
      suggestServiceMapping(withoutCode.columns),
      "PHP",
      [
        {
          id: "10000000-0000-4000-8000-000000000001",
          name: "Cleaning",
          code: "CLEAN"
        }
      ]
    );

    expect(rows[0]).toMatchObject({ existingCode: "CLEAN", action: "update" });
  });

  it("exports failed rows without exposing valid rows", () => {
    const rows = buildServiceImportRows(
      {
        ...source,
        rows: [
          source.rows[0]!,
          {
            rowNumber: 3,
            values: { ...source.rows[0]!.values, Service: "Broken", Price: "free" }
          }
        ]
      },
      suggestServiceMapping(source.columns),
      "PHP",
      []
    );
    const csv = serviceErrorRowsCsv(source.columns, rows);

    expect(csv).toContain('"Broken","free"');
    expect(csv).not.toContain('"Oral prophylaxis","1500.00"');
  });

  it("preserves unmapped services unless removal is explicitly confirmed", () => {
    const rows = buildServiceImportRows(
      source,
      suggestServiceMapping(source.columns),
      "PHP",
      [
        { id: "10000000-0000-4000-8000-000000000001", name: "Cleaning", code: "CLEAN" },
        { id: "10000000-0000-4000-8000-000000000002", name: "Extraction" }
      ]
    );
    const existingIds = [
      "10000000-0000-4000-8000-000000000001",
      "10000000-0000-4000-8000-000000000002"
    ];

    expect(serviceIdsToRemove(existingIds, rows, false)).toEqual([]);
    expect(serviceIdsToRemove(existingIds, rows, true)).toEqual([
      "10000000-0000-4000-8000-000000000002"
    ]);
  });
});
