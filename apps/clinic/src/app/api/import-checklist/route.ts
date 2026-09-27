import { NextResponse } from "next/server";

import {
  migrationChecklistRowSchema,
  updateMigrationChecklistSchema
} from "@/features/patient-import/migration-checklist";
import { requireOwnerImportAccess } from "@/features/patient-import/patient-import-server";

const responseFor = (row: { completed_items: string[]; updated_at: string } | null) =>
  NextResponse.json(
    {
      completedItems: row?.completed_items ?? [],
      updatedAt: row?.updated_at ?? null
    },
    { headers: { "Cache-Control": "private, no-store" } }
  );

export const GET = async () => {
  const result = await requireOwnerImportAccess();

  if (!result.ok) {
    return result.response;
  }

  const { access } = result;
  const { data, error } = await access.supabase
    .from("migration_checklists")
    .select("completed_items, updated_at")
    .eq("tenant_id", access.membership.tenantId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Could not load the migration checklist." }, { status: 500 });
  }

  return responseFor(data ? migrationChecklistRowSchema.parse(data) : null);
};

export const PUT = async (request: Request) => {
  const result = await requireOwnerImportAccess();

  if (!result.ok) {
    return result.response;
  }

  const body = updateMigrationChecklistSchema.safeParse(
    await request.json().catch(() => null)
  );

  if (!body.success) {
    return NextResponse.json({ error: "Invalid migration checklist." }, { status: 400 });
  }

  const { access } = result;
  const { data, error } = await access.supabase
    .from("migration_checklists")
    .upsert(
      {
        tenant_id: access.membership.tenantId,
        completed_items: body.data.completedItems,
        updated_by: access.userId,
        updated_at: new Date().toISOString()
      },
      { onConflict: "tenant_id" }
    )
    .select("completed_items, updated_at")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Could not save the migration checklist." }, { status: 500 });
  }

  return responseFor(migrationChecklistRowSchema.parse(data));
};
