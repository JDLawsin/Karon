import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { parsePatientImportFile } from "@/features/patient-import/parse-patient-import-file";
import {
  IMPORT_BUCKET,
  ImportFileError,
  applyImportDecisions,
  buildPatientImportRows,
  importEvents,
  patientImportJobSchema,
  publicImportJob,
  suggestMapping,
  type ImportDecision,
  type ImportMapping,
  type PatientImportJob
} from "@/features/patient-import/patient-import";
import { authorizeOwnerAction } from "@/features/staff/authorize-owner";
import { writeAuditEvent } from "@/lib/auth/audit";
import { getClinicAccess } from "@/lib/auth/clinic-access";

const IMPORT_JOB_COLUMNS = [
  "id",
  "tenant_id",
  "created_by",
  "status",
  "file_name",
  "storage_path",
  "content_type",
  "file_size",
  "columns",
  "mapping",
  "rows",
  "total_rows",
  "imported_rows",
  "failed_rows",
  "skipped_rows",
  "last_error",
  "expires_at",
  "object_deleted_at",
  "data_purged_at",
  "completed_at",
  "created_at",
  "updated_at"
].join(", ");
const COMMIT_BATCH_SIZE = 100;
const PATIENT_PAGE_SIZE = 1_000;
const CLEANUP_BATCH_SIZE = 100;

const cleanupImportJobSchema = patientImportJobSchema.pick({
  id: true,
  tenant_id: true,
  status: true,
  storage_path: true,
  object_deleted_at: true,
  data_purged_at: true
});

type ImportObjectJob = Pick<
  PatientImportJob,
  "id" | "tenant_id" | "storage_path" | "object_deleted_at"
>;

type OwnerImportAccess = Awaited<ReturnType<typeof getClinicAccess>> & {
  userId: string;
  membership: NonNullable<Awaited<ReturnType<typeof getClinicAccess>>["membership"]>;
};

type ImportAccessResult =
  | { ok: true; access: OwnerImportAccess }
  | { ok: false; response: NextResponse };

const requireOwnerImportAccess = async (): Promise<ImportAccessResult> => {
  const access = await getClinicAccess();
  const authz = authorizeOwnerAction({
    userId: access.userId,
    aal: access.aal,
    role: access.membership?.role ?? null,
    mfaOk: access.mfaOk
  });

  if (!authz.ok || !access.userId || !access.membership || !access.sessionActive) {
    if (authz.status === 403 && access.membership && access.userId) {
      await writeAuditEvent(access.supabase, {
        tenantId: access.membership.tenantId,
        actorUserId: access.userId,
        eventType: "access.denied"
      });
    }

    return {
      ok: false,
      response: NextResponse.json(
        { error: authz.status === 401 ? "Unauthorized" : "Forbidden" },
        { status: authz.status }
      )
    };
  }

  return { ok: true, access: access as OwnerImportAccess };
};

const loadImportJob = async (
  supabase: SupabaseClient,
  tenantId: string,
  jobId: string
) => {
  const { data, error } = await supabase
    .from("patient_import_jobs")
    .select(IMPORT_JOB_COLUMNS)
    .eq("tenant_id", tenantId)
    .eq("id", jobId)
    .maybeSingle();

  if (error) {
    throw new Error("Could not load the import job.");
  }

  return data ? patientImportJobSchema.parse(data) : null;
};

const removeImportObject = async (
  supabase: SupabaseClient,
  job: ImportObjectJob
) => {
  if (job.object_deleted_at) {
    return job.object_deleted_at;
  }

  const { error } = await supabase.storage
    .from(IMPORT_BUCKET)
    .remove([job.storage_path]);

  if (error) {
    return null;
  }

  const deletedAt = new Date().toISOString();
  await supabase
    .from("patient_import_jobs")
    .update({ object_deleted_at: deletedAt, updated_at: deletedAt })
    .eq("id", job.id)
    .eq("tenant_id", job.tenant_id);

  return deletedAt;
};

const loadExistingPatients = async (
  supabase: SupabaseClient,
  tenantId: string
) => {
  const patients: { id: string; name: string; mobile: string; email: string | null }[] = [];

  for (let from = 0; ; from += PATIENT_PAGE_SIZE) {
    const { data, error } = await supabase
      .from("patients")
      .select("id, name, mobile, email")
      .eq("tenant_id", tenantId)
      .order("id")
      .range(from, from + PATIENT_PAGE_SIZE - 1);

    if (error) {
      throw new Error("Could not check existing patients.");
    }

    patients.push(...(data ?? []));

    if (!data || data.length < PATIENT_PAGE_SIZE) {
      return patients;
    }
  }
};

const updatePreview = async (
  supabase: SupabaseClient,
  job: PatientImportJob,
  mapping: ImportMapping
) => {
  if (job.status !== "preview_ready" || job.imported_rows > 0) {
    throw new ImportFileError("This import preview can no longer be changed.");
  }

  const existingPatients = await loadExistingPatients(supabase, job.tenant_id);
  const source = {
    columns: job.columns,
    rows: job.rows.map(({ rowNumber, values }) => ({ rowNumber, values }))
  };
  const rows = buildPatientImportRows(source, mapping, existingPatients);
  const failedRows = rows.filter((row) => row.error).length;
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("patient_import_jobs")
    .update({
      status: "preview_ready",
      mapping,
      rows,
      total_rows: rows.length,
      failed_rows: failedRows,
      imported_rows: 0,
      skipped_rows: 0,
      last_error: null,
      updated_at: now
    })
    .eq("id", job.id)
    .eq("tenant_id", job.tenant_id)
    .eq("status", "preview_ready")
    .eq("imported_rows", 0)
    .select(IMPORT_JOB_COLUMNS)
    .single();

  if (error) {
    throw new Error("Could not save the import preview.");
  }

  return patientImportJobSchema.parse(data);
};

const previewImportJob = async (
  supabase: SupabaseClient,
  job: PatientImportJob
) => {
  if (!["awaiting_upload", "uploaded", "failed"].includes(job.status)) {
    throw new ImportFileError("This import has already been previewed.");
  }

  const now = new Date().toISOString();
  await supabase
    .from("patient_import_jobs")
    .update({ status: "uploaded", last_error: null, updated_at: now })
    .eq("id", job.id)
    .eq("tenant_id", job.tenant_id);

  try {
    const { data: file, error: downloadError } = await supabase.storage
      .from(IMPORT_BUCKET)
      .download(job.storage_path);

    if (downloadError || !file) {
      throw new ImportFileError("The upload could not be read. Upload the file again.");
    }

    const source = await parsePatientImportFile(await file.arrayBuffer(), job.content_type);
    const mapping = suggestMapping(source.columns);
    const existingPatients = await loadExistingPatients(supabase, job.tenant_id);
    const rows = buildPatientImportRows(source, mapping, existingPatients);
    const failedRows = rows.filter((row) => row.error).length;
    const parsedAt = new Date().toISOString();
    const { data, error } = await supabase
      .from("patient_import_jobs")
      .update({
        status: "preview_ready",
        columns: source.columns,
        mapping,
        rows,
        total_rows: rows.length,
        failed_rows: failedRows,
        imported_rows: 0,
        skipped_rows: 0,
        last_error: null,
        updated_at: parsedAt
      })
      .eq("id", job.id)
      .eq("tenant_id", job.tenant_id)
      .select(IMPORT_JOB_COLUMNS)
      .single();

    if (error) {
      throw new Error("Could not save the import preview.");
    }

    const parsed = patientImportJobSchema.parse(data);
    const objectDeletedAt = await removeImportObject(supabase, parsed);
    return {
      ...parsed,
      object_deleted_at: objectDeletedAt
    };
  } catch (error) {
    const message =
      error instanceof ImportFileError
        ? error.message
        : "The file could not be parsed safely.";
    const failedAt = new Date().toISOString();

    await supabase
      .from("patient_import_jobs")
      .update({ status: "failed", last_error: message, updated_at: failedAt })
      .eq("id", job.id)
      .eq("tenant_id", job.tenant_id);
    await removeImportObject(supabase, job);
    throw new ImportFileError(message);
  }
};

const commitImportJob = async (
  supabase: SupabaseClient,
  job: PatientImportJob,
  decisions: ImportDecision[]
) => {
  if (!["preview_ready", "committing", "failed"].includes(job.status)) {
    throw new ImportFileError("This import is not ready to confirm.");
  }

  const rows =
    job.imported_rows > 0 || job.status === "committing"
      ? job.rows
      : applyImportDecisions(job.rows, decisions);
  const events = importEvents(job, rows);
  const failedRows = rows.filter((row) => row.error).length;
  const skippedRows = rows.filter((row) => !row.error && row.decision === "skip").length;
  const committingAt = new Date().toISOString();
  const { error: startError } = await supabase
    .from("patient_import_jobs")
    .update({
      status: "committing",
      rows,
      imported_rows: job.imported_rows > 0 ? job.imported_rows : 0,
      failed_rows: failedRows,
      skipped_rows: skippedRows,
      last_error: null,
      updated_at: committingAt
    })
    .eq("id", job.id)
    .eq("tenant_id", job.tenant_id);

  if (startError) {
    throw new Error("Could not start the import.");
  }

  try {
    for (let index = 0; index < events.length; index += COMMIT_BATCH_SIZE) {
      const batch = events.slice(index, index + COMMIT_BATCH_SIZE);
      const { error } = await supabase.from("clinic_events").upsert(batch, {
        onConflict: "id",
        ignoreDuplicates: true
      });

      if (error) {
        throw new Error("A patient batch could not be committed.");
      }

      const importedRows = Math.min(index + batch.length, events.length);
      await supabase
        .from("patient_import_jobs")
        .update({ imported_rows: importedRows, updated_at: new Date().toISOString() })
        .eq("id", job.id)
        .eq("tenant_id", job.tenant_id);
    }

    const objectDeletedAt = await removeImportObject(supabase, job);
    const errorRows = rows.filter((row) => row.error);
    const completedAt = new Date().toISOString();
    const { data, error } = await supabase
      .from("patient_import_jobs")
      .update({
        status: "completed",
        imported_rows: events.length,
        failed_rows: failedRows,
        skipped_rows: skippedRows,
        rows: errorRows,
        last_error: null,
        completed_at: completedAt,
        ...(errorRows.length === 0 ? { data_purged_at: completedAt } : {}),
        ...(objectDeletedAt ? { object_deleted_at: objectDeletedAt } : {}),
        updated_at: completedAt
      })
      .eq("id", job.id)
      .eq("tenant_id", job.tenant_id)
      .select(IMPORT_JOB_COLUMNS)
      .single();

    if (error) {
      throw new Error("Could not finish the import job.");
    }

    return patientImportJobSchema.parse(data);
  } catch {
    const failedAt = new Date().toISOString();
    await supabase
      .from("patient_import_jobs")
      .update({
        status: "failed",
        last_error: "Import stopped. It is safe to resume.",
        updated_at: failedAt
      })
      .eq("id", job.id)
      .eq("tenant_id", job.tenant_id);
    throw new ImportFileError("Import stopped. It is safe to resume.");
  }
};

const cleanupExpiredImports = async (supabase: SupabaseClient) => {
  const { data, error } = await supabase
    .from("patient_import_jobs")
    .select(
      "id, tenant_id, status, storage_path, object_deleted_at, data_purged_at"
    )
    .lt("expires_at", new Date().toISOString())
    .or("object_deleted_at.is.null,data_purged_at.is.null")
    .order("expires_at", { ascending: true })
    .limit(CLEANUP_BATCH_SIZE);

  if (error) {
    throw new Error("Could not load expired import jobs.");
  }

  let objectsDeleted = 0;
  let recordsPurged = 0;
  let pendingObjects = 0;

  for (const raw of data ?? []) {
    const parsed = cleanupImportJobSchema.safeParse(raw);

    if (!parsed.success) {
      continue;
    }

    const neededObjectDeletion = !parsed.data.object_deleted_at;
    const deletedAt =
      parsed.data.object_deleted_at ??
      (await removeImportObject(supabase, parsed.data));
    const cleanupAt = new Date().toISOString();
    const purgedAt = parsed.data.data_purged_at ?? cleanupAt;

    if (neededObjectDeletion && deletedAt) {
      objectsDeleted += 1;
    } else if (!deletedAt) {
      pendingObjects += 1;
    }

    if (!parsed.data.data_purged_at) {
      recordsPurged += 1;
    }

    const completed = parsed.data.status === "completed";
    const { error: updateError } = await supabase
      .from("patient_import_jobs")
      .update({
        ...(completed ? {} : { status: "failed" }),
        rows: [],
        file_name: "Purged import",
        data_purged_at: purgedAt,
        ...(deletedAt ? { object_deleted_at: deletedAt } : {}),
        ...(completed
          ? {}
          : {
              last_error: deletedAt
                ? "Import data expired and was deleted. Choose the file again."
                : "Import data expired. Parsed rows were deleted; secure upload cleanup will retry."
            }),
        updated_at: cleanupAt
      })
      .eq("id", parsed.data.id)
      .eq("tenant_id", parsed.data.tenant_id);

    if (updateError) {
      throw new Error("Could not purge an expired import job.");
    }
  }

  return {
    examined: data?.length ?? 0,
    objectsDeleted,
    recordsPurged,
    pendingObjects
  };
};

export {
  IMPORT_JOB_COLUMNS,
  cleanupExpiredImports,
  commitImportJob,
  loadImportJob,
  previewImportJob,
  publicImportJob,
  removeImportObject,
  requireOwnerImportAccess,
  updatePreview
};
