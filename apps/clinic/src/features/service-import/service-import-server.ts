import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { parsePatientImportFile } from "@/features/patient-import/parse-patient-import-file";
import { ImportFileError } from "@/features/patient-import/patient-import";
import {
  SERVICE_IMPORT_BUCKET,
  buildServiceImportRows,
  publicServiceImportJob,
  serviceIdsToRemove,
  serviceImportJobSchema,
  suggestServiceMapping,
  type ServiceImportJob,
  type ServiceImportMapping
} from "@/features/service-import/service-import";

const SERVICE_IMPORT_JOB_COLUMNS = [
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
  "existing_service_ids",
  "total_rows",
  "imported_rows",
  "failed_rows",
  "removed_rows",
  "last_error",
  "expires_at",
  "object_deleted_at",
  "data_purged_at",
  "completed_at",
  "created_at",
  "updated_at"
].join(", ");
const COMMIT_BATCH_SIZE = 100;
const CLEANUP_BATCH_SIZE = 100;
const serviceContextSchema = z.object({
  clinic: z.object({ currency_code: z.string().length(3) }),
  services: z.array(
    z.object({
      id: z.uuid(),
      name: z.string(),
      service_code: z.string().nullable()
    })
  )
});
const serviceCreatorSchema = z.array(
  z.object({ id: z.uuid(), created_by: z.uuid() })
);

const loadServiceImportJob = async (
  supabase: SupabaseClient,
  tenantId: string,
  jobId: string
) => {
  const { data, error } = await supabase
    .from("service_import_jobs")
    .select(SERVICE_IMPORT_JOB_COLUMNS)
    .eq("tenant_id", tenantId)
    .eq("id", jobId)
    .maybeSingle();

  if (error) {
    throw new Error("Could not load the service import job.");
  }

  return data ? serviceImportJobSchema.parse(data) : null;
};

const removeServiceImportObject = async (
  supabase: SupabaseClient,
  job: Pick<ServiceImportJob, "id" | "tenant_id" | "storage_path" | "object_deleted_at">
) => {
  if (job.object_deleted_at) {
    return job.object_deleted_at;
  }

  const { error } = await supabase.storage
    .from(SERVICE_IMPORT_BUCKET)
    .remove([job.storage_path]);

  if (error) {
    return null;
  }

  const deletedAt = new Date().toISOString();
  await supabase
    .from("service_import_jobs")
    .update({ object_deleted_at: deletedAt, updated_at: deletedAt })
    .eq("id", job.id)
    .eq("tenant_id", job.tenant_id);
  return deletedAt;
};

const loadServiceContext = async (supabase: SupabaseClient, tenantId: string) => {
  const [{ data: clinic, error: clinicError }, { data: services, error: servicesError }] =
    await Promise.all([
      supabase.from("clinics").select("currency_code").eq("id", tenantId).single(),
      supabase
        .from("clinic_services")
        .select("id, name, service_code")
        .eq("tenant_id", tenantId)
        .order("id")
    ]);

  if (clinicError || servicesError) {
    throw new Error("Could not load the clinic service catalog.");
  }

  const parsed = serviceContextSchema.safeParse({ clinic, services: services ?? [] });

  if (!parsed.success) {
    return { currencyCode: null, services: [] };
  }

  return {
    currencyCode: parsed.data.clinic.currency_code,
    services: parsed.data.services.map((service) => ({
      id: service.id,
      name: service.name,
      code: service.service_code
    }))
  };
};

const saveServicePreview = async (
  supabase: SupabaseClient,
  job: ServiceImportJob,
  mapping: ServiceImportMapping,
  source = {
    columns: job.columns,
    rows: job.rows.map(({ rowNumber, values }) => ({ rowNumber, values }))
  }
) => {
  const context = await loadServiceContext(supabase, job.tenant_id);
  const rows = buildServiceImportRows(
    source,
    mapping,
    context.currencyCode,
    context.services
  );
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("service_import_jobs")
    .update({
      status: "preview_ready",
      columns: source.columns,
      mapping,
      rows,
      existing_service_ids: context.services.map((service) => service.id),
      total_rows: rows.length,
      imported_rows: 0,
      failed_rows: rows.filter((row) => row.error).length,
      removed_rows: 0,
      last_error: null,
      updated_at: now
    })
    .eq("id", job.id)
    .eq("tenant_id", job.tenant_id)
    .eq("status", job.status)
    .eq("imported_rows", 0)
    .select(SERVICE_IMPORT_JOB_COLUMNS)
    .single();

  if (error) {
    throw new Error("Could not save the service import preview.");
  }

  return serviceImportJobSchema.parse(data);
};

const previewServiceImportJob = async (
  supabase: SupabaseClient,
  job: ServiceImportJob
) => {
  if (!["awaiting_upload", "uploaded", "failed"].includes(job.status)) {
    throw new ImportFileError("This import has already been previewed.");
  }

  try {
    const { data: file, error } = await supabase.storage
      .from(SERVICE_IMPORT_BUCKET)
      .download(job.storage_path);

    if (error || !file) {
      throw new ImportFileError("The upload could not be read. Upload the file again.");
    }

    const source = await parsePatientImportFile(
      await file.arrayBuffer(),
      job.content_type,
      "service"
    );
    const parsed = await saveServicePreview(
      supabase,
      job,
      suggestServiceMapping(source.columns),
      source
    );
    const objectDeletedAt = await removeServiceImportObject(supabase, parsed);
    return { ...parsed, object_deleted_at: objectDeletedAt };
  } catch (error) {
    const message =
      error instanceof ImportFileError
        ? error.message
        : "The service file could not be parsed safely.";
    await supabase
      .from("service_import_jobs")
      .update({ status: "failed", last_error: message, updated_at: new Date().toISOString() })
      .eq("id", job.id)
      .eq("tenant_id", job.tenant_id);
    await removeServiceImportObject(supabase, job);
    throw new ImportFileError(message);
  }
};

const updateServicePreview = async (
  supabase: SupabaseClient,
  job: ServiceImportJob,
  mapping: ServiceImportMapping
) => {
  if (job.status !== "preview_ready" || job.imported_rows > 0) {
    throw new ImportFileError("This import preview can no longer be changed.");
  }

  return saveServicePreview(supabase, job, mapping);
};

const commitServiceImportJob = async (
  supabase: SupabaseClient,
  job: ServiceImportJob,
  removeUnmapped: boolean
) => {
  if (!["preview_ready", "committing", "failed"].includes(job.status)) {
    throw new ImportFileError("This service import is not ready to confirm.");
  }

  if (job.rows.length === 0) {
    throw new ImportFileError("Upload and preview the service file before confirming.");
  }

  const validRows = job.rows.filter(
    (row) =>
      !row.error &&
      row.priceMinor !== undefined &&
      row.durationMinutes !== undefined &&
      row.currencyCode
  );
  const startedAt = new Date().toISOString();
  await supabase
    .from("service_import_jobs")
    .update({ status: "committing", last_error: null, updated_at: startedAt })
    .eq("id", job.id)
    .eq("tenant_id", job.tenant_id);

  try {
    const existingIds = validRows.flatMap((row) =>
      row.existingServiceId ? [row.existingServiceId] : []
    );
    const existingCreators = new Map<string, string>();

    if (existingIds.length > 0) {
      const { data, error } = await supabase
        .from("clinic_services")
        .select("id, created_by")
        .eq("tenant_id", job.tenant_id)
        .in("id", existingIds);

      if (error) {
        throw new Error("Existing services could not be checked.");
      }

      const creators = serviceCreatorSchema.parse(data ?? []);
      for (const service of creators) {
        existingCreators.set(service.id, service.created_by);
      }
    }

    for (let index = 0; index < validRows.length; index += COMMIT_BATCH_SIZE) {
      const batch = validRows.slice(index, index + COMMIT_BATCH_SIZE).map((row) => ({
        id: row.serviceId,
        tenant_id: job.tenant_id,
        name: row.name,
        service_code: row.code ?? row.existingCode ?? null,
        price_minor: row.priceMinor!,
        currency_code: row.currencyCode!,
        duration_minutes: row.durationMinutes!,
        created_by: existingCreators.get(row.serviceId) ?? job.created_by,
        updated_by: job.created_by,
        updated_at: new Date().toISOString()
      }));
      const { error } = await supabase
        .from("clinic_services")
        .upsert(batch, { onConflict: "id" });

      if (error) {
        throw new Error("A service batch could not be committed.");
      }

      await supabase
        .from("service_import_jobs")
        .update({
          imported_rows: Math.min(index + batch.length, validRows.length),
          updated_at: new Date().toISOString()
        })
        .eq("id", job.id)
        .eq("tenant_id", job.tenant_id);
    }

    const removableIds = serviceIdsToRemove(
      job.existing_service_ids,
      job.rows,
      removeUnmapped
    );

    if (removableIds.length > 0) {
      const { error } = await supabase
        .from("clinic_services")
        .delete()
        .eq("tenant_id", job.tenant_id)
        .in("id", removableIds);

      if (error) {
        throw new Error("Unmapped services could not be removed.");
      }
    }

    const objectDeletedAt = await removeServiceImportObject(supabase, job);
    const errorRows = job.rows.filter((row) => row.error);
    const completedAt = new Date().toISOString();
    const { data, error } = await supabase
      .from("service_import_jobs")
      .update({
        status: "completed",
        imported_rows: validRows.length,
        failed_rows: errorRows.length,
        removed_rows: removableIds.length,
        rows: errorRows,
        last_error: null,
        completed_at: completedAt,
        ...(errorRows.length === 0 ? { data_purged_at: completedAt } : {}),
        ...(objectDeletedAt ? { object_deleted_at: objectDeletedAt } : {}),
        updated_at: completedAt
      })
      .eq("id", job.id)
      .eq("tenant_id", job.tenant_id)
      .select(SERVICE_IMPORT_JOB_COLUMNS)
      .single();

    if (error) {
      throw new Error("Could not finish the service import job.");
    }

    return serviceImportJobSchema.parse(data);
  } catch {
    await supabase
      .from("service_import_jobs")
      .update({
        status: "failed",
        last_error: "Import stopped. It is safe to resume.",
        updated_at: new Date().toISOString()
      })
      .eq("id", job.id)
      .eq("tenant_id", job.tenant_id);
    throw new ImportFileError("Import stopped. It is safe to resume.");
  }
};

const cleanupExpiredServiceImports = async (supabase: SupabaseClient) => {
  const { data, error } = await supabase
    .from("service_import_jobs")
    .select("id, tenant_id, status, storage_path, object_deleted_at, data_purged_at")
    .lt("expires_at", new Date().toISOString())
    .or("object_deleted_at.is.null,data_purged_at.is.null")
    .order("expires_at", { ascending: true })
    .limit(CLEANUP_BATCH_SIZE);

  if (error) {
    throw new Error("Could not load expired service imports.");
  }

  let objectsDeleted = 0;
  let recordsPurged = 0;
  let pendingObjects = 0;
  for (const raw of data ?? []) {
    const parsed = serviceImportJobSchema
      .pick({
        id: true,
        tenant_id: true,
        status: true,
        storage_path: true,
        object_deleted_at: true,
        data_purged_at: true
      })
      .safeParse(raw);
    if (!parsed.success) continue;
    const neededObjectDeletion = !parsed.data.object_deleted_at;
    const deletedAt =
      parsed.data.object_deleted_at ??
      (await removeServiceImportObject(supabase, parsed.data));
    const now = new Date().toISOString();

    if (neededObjectDeletion && deletedAt) objectsDeleted += 1;
    else if (!deletedAt) pendingObjects += 1;
    if (!parsed.data.data_purged_at) recordsPurged += 1;

    const completed = parsed.data.status === "completed";
    const { error: purgeError } = await supabase
      .from("service_import_jobs")
      .update({
        ...(completed ? {} : { status: "failed" }),
        rows: [],
        file_name: "Purged import",
        data_purged_at: parsed.data.data_purged_at ?? now,
        ...(deletedAt ? { object_deleted_at: deletedAt } : {}),
        ...(completed
          ? {}
          : {
              last_error: deletedAt
                ? "Import data expired and was deleted. Choose the file again."
                : "Import data expired. Parsed rows were deleted; secure upload cleanup will retry."
            }),
        updated_at: now
      })
      .eq("id", parsed.data.id)
      .eq("tenant_id", parsed.data.tenant_id);

    if (purgeError) {
      throw new Error("Could not purge expired service import data.");
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
  SERVICE_IMPORT_JOB_COLUMNS,
  cleanupExpiredServiceImports,
  commitServiceImportJob,
  loadServiceImportJob,
  previewServiceImportJob,
  publicServiceImportJob,
  updateServicePreview
};
