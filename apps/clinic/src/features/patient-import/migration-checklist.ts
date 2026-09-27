import { z } from "zod";

const MIGRATION_CHECKLIST_ITEMS = [
  {
    id: "export_old_system",
    title: "Export the old system",
    description: "Include every patient and service file needed for cutover."
  },
  {
    id: "backup_created",
    title: "Save an encrypted backup",
    description: "Keep a separate copy in the clinic's approved encrypted location."
  },
  {
    id: "patients_imported",
    title: "Import patients",
    description: "Review mapping, duplicates, and rejected rows before continuing."
  },
  {
    id: "services_imported",
    title: "Import services and prices",
    description: "Check the clinic currency, durations, and any updated catalog rows."
  },
  {
    id: "balances_recorded",
    title: "Record opening balances or mark N/A",
    description: "Use only the agreed starting notes; this is not a full ageing ledger."
  },
  {
    id: "privacy_reviewed",
    title: "Complete the privacy review",
    description: "Confirm the clinic's PIA and counsel steps before production use."
  },
  {
    id: "records_spot_checked",
    title: "Spot-check the imported records",
    description: "Compare a sample against the encrypted backup before go-live."
  },
  {
    id: "booking_enabled",
    title: "Enable the booking link",
    description: "Turn on /book only after the imported records pass the spot-check."
  }
] as const;

const migrationChecklistItemIdSchema = z.enum(
  MIGRATION_CHECKLIST_ITEMS.map(({ id }) => id) as [
    (typeof MIGRATION_CHECKLIST_ITEMS)[number]["id"],
    ...(typeof MIGRATION_CHECKLIST_ITEMS)[number]["id"][]
  ]
);

const completedItemsSchema = z
  .array(migrationChecklistItemIdSchema)
  .max(MIGRATION_CHECKLIST_ITEMS.length)
  .refine((items) => new Set(items).size === items.length, "Checklist items must be unique.");

const migrationChecklistRowSchema = z
  .object({
    completed_items: completedItemsSchema,
    updated_at: z.string()
  })
  .strict();

const migrationChecklistResponseSchema = z
  .object({
    completedItems: completedItemsSchema,
    updatedAt: z.string().nullable()
  })
  .strict();

const updateMigrationChecklistSchema = z
  .object({ completedItems: completedItemsSchema })
  .strict();

type MigrationChecklistItemId = z.infer<typeof migrationChecklistItemIdSchema>;
type MigrationChecklistState = z.infer<typeof migrationChecklistResponseSchema>;

export {
  MIGRATION_CHECKLIST_ITEMS,
  completedItemsSchema,
  migrationChecklistResponseSchema,
  migrationChecklistRowSchema,
  updateMigrationChecklistSchema
};
export type { MigrationChecklistItemId, MigrationChecklistState };
