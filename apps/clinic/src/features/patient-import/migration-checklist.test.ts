import { describe, expect, it } from "vitest";

import {
  MIGRATION_CHECKLIST_ITEMS,
  updateMigrationChecklistSchema
} from "./migration-checklist";

describe("migration checklist", () => {
  it("accepts the complete fixed checklist", () => {
    expect(
      updateMigrationChecklistSchema.parse({
        completedItems: MIGRATION_CHECKLIST_ITEMS.map(({ id }) => id)
      }).completedItems
    ).toHaveLength(MIGRATION_CHECKLIST_ITEMS.length);
  });

  it("rejects unknown or duplicated checklist items", () => {
    expect(
      updateMigrationChecklistSchema.safeParse({ completedItems: ["unknown"] }).success
    ).toBe(false);
    expect(
      updateMigrationChecklistSchema.safeParse({
        completedItems: ["patients_imported", "patients_imported"]
      }).success
    ).toBe(false);
  });
});
