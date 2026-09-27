import { z } from "zod";

import { priceMajorToMinor } from "@/features/services/service-money";
import type { ImportSource } from "@/features/patient-import/patient-import";

const SERVICE_IMPORT_BUCKET = "service-import-staging";
const SERVICE_IMPORT_STATUSES = [
  "awaiting_upload",
  "uploaded",
  "preview_ready",
  "committing",
  "completed",
  "failed"
] as const;

const serviceImportMappingSchema = z
  .object({
    name: z.string().min(1).max(80).nullable(),
    price: z.string().min(1).max(80).nullable(),
    duration: z.string().min(1).max(80).nullable(),
    code: z.string().min(1).max(80).nullable(),
    currency: z.string().min(1).max(80).nullable()
  })
  .strict();

const serviceImportRowSchema = z
  .object({
    rowNumber: z.int().min(2),
    values: z.record(z.string(), z.string()),
    serviceId: z.uuid(),
    existingServiceId: z.uuid().optional(),
    existingCode: z.string().max(40).optional(),
    name: z.string(),
    code: z.string().optional(),
    priceMinor: z.int().min(0).optional(),
    durationMinutes: z.int().min(1).max(1440).optional(),
    currencyCode: z.string().length(3).optional(),
    action: z.enum(["create", "update"]),
    error: z.string().optional()
  })
  .strict();

const serviceImportJobSchema = z
  .object({
    id: z.uuid(),
    tenant_id: z.uuid(),
    created_by: z.uuid(),
    status: z.enum(SERVICE_IMPORT_STATUSES),
    file_name: z.string(),
    storage_path: z.string(),
    content_type: z.string(),
    file_size: z.number().int(),
    columns: z.array(z.string()),
    mapping: serviceImportMappingSchema,
    rows: z.array(serviceImportRowSchema),
    existing_service_ids: z.array(z.uuid()),
    total_rows: z.number().int(),
    imported_rows: z.number().int(),
    failed_rows: z.number().int(),
    removed_rows: z.number().int(),
    last_error: z.string().nullable(),
    expires_at: z.string(),
    object_deleted_at: z.string().nullable(),
    data_purged_at: z.string().nullable(),
    completed_at: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string()
  })
  .passthrough();

const publicServiceImportJobSchema = z
  .object({
    id: z.uuid(),
    status: z.enum(SERVICE_IMPORT_STATUSES),
    fileName: z.string(),
    columns: z.array(z.string()),
    mapping: serviceImportMappingSchema,
    rows: z.array(serviceImportRowSchema),
    existingServiceIds: z.array(z.uuid()),
    totalRows: z.number().int(),
    importedRows: z.number().int(),
    failedRows: z.number().int(),
    removedRows: z.number().int(),
    lastError: z.string().nullable(),
    expiresAt: z.string(),
    objectDeletedAt: z.string().nullable(),
    dataPurgedAt: z.string().nullable(),
    completedAt: z.string().nullable(),
    createdAt: z.string()
  })
  .strict();

const serviceImportActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("preview") }).strict(),
  z
    .object({ action: z.literal("map"), mapping: serviceImportMappingSchema })
    .strict(),
  z
    .object({
      action: z.literal("commit"),
      removeUnmapped: z.boolean()
    })
    .strict()
]);

const serviceImportJobResponseSchema = z
  .object({ job: publicServiceImportJobSchema })
  .strict();
const serviceImportListResponseSchema = z
  .object({ jobs: z.array(publicServiceImportJobSchema) })
  .strict();
const createServiceImportResponseSchema = z
  .object({
    job: publicServiceImportJobSchema,
    upload: z
      .object({
        bucket: z.string(),
        path: z.string(),
        token: z.string().min(1),
        contentType: z.string().min(1)
      })
      .strict()
  })
  .strict();

type ServiceImportMapping = z.infer<typeof serviceImportMappingSchema>;
type ServiceImportRow = z.infer<typeof serviceImportRowSchema>;
type ServiceImportJob = z.infer<typeof serviceImportJobSchema>;
type PublicServiceImportJob = z.infer<typeof publicServiceImportJobSchema>;
type ExistingService = { id: string; name: string; code?: string | null };

const normalizeKey = (value: string) => value.trim().toLocaleLowerCase();
const findColumn = (columns: string[], names: string[]) =>
  columns.find((column) => names.includes(normalizeKey(column))) ?? null;

const suggestServiceMapping = (columns: string[]): ServiceImportMapping => ({
  name: findColumn(columns, ["name", "service", "service name", "treatment"]),
  price: findColumn(columns, ["price", "fee", "amount", "rate"]),
  duration: findColumn(columns, ["duration", "minutes", "duration minutes", "time"]),
  code: findColumn(columns, ["code", "service code", "item code"]),
  currency: findColumn(columns, ["currency", "currency code"])
});

const buildServiceImportRows = (
  source: ImportSource,
  mapping: ServiceImportMapping,
  clinicCurrency: string | null,
  existingServices: ExistingService[]
): ServiceImportRow[] => {
  const existingByCode = new Map(
    existingServices.flatMap((service) =>
      service.code ? [[normalizeKey(service.code), service] as const] : []
    )
  );
  const existingByName = new Map(
    existingServices.map((service) => [normalizeKey(service.name), service])
  );
  const seenCodes = new Set<string>();
  const seenNames = new Set<string>();

  return source.rows.map(({ rowNumber, values }) => {
    const name = mapping.name ? values[mapping.name]?.trim() ?? "" : "";
    const price = mapping.price ? values[mapping.price]?.trim() ?? "" : "";
    const duration = mapping.duration ? values[mapping.duration]?.trim() ?? "" : "";
    const code = mapping.code ? values[mapping.code]?.trim() ?? "" : "";
    const rowCurrency = mapping.currency
      ? values[mapping.currency]?.trim().toUpperCase() ?? ""
      : clinicCurrency;
    const normalizedCode = normalizeKey(code);
    const normalizedName = normalizeKey(name);
    const codeMatch = normalizedCode ? existingByCode.get(normalizedCode) : undefined;
    const nameMatch = existingByName.get(normalizedName);
    const existing = codeMatch ?? nameMatch;
    const serviceId = existing?.id ?? crypto.randomUUID();
    let priceMinor: number | undefined;
    let durationMinutes: number | undefined;
    let error: string | undefined;

    if (codeMatch && nameMatch && codeMatch.id !== nameMatch.id) {
      error = "Code and name match different existing services.";
    } else if (!mapping.name || !mapping.price || !mapping.duration) {
      error = "Map the name, price, and duration columns.";
    } else if (!clinicCurrency) {
      error = "Set the clinic currency before importing prices.";
    } else if (!name || name.length > 80) {
      error = "Name must be between 1 and 80 characters.";
    } else if (code.length > 40) {
      error = "Code must be 40 characters or fewer.";
    } else if (!/^\d+(?:\.\d+)?$/.test(price)) {
      error = "Price must be a plain non-negative amount.";
    } else if (!/^\d+$/.test(duration)) {
      error = "Duration must be whole minutes.";
    } else if (rowCurrency !== clinicCurrency) {
      error = `Currency must match the clinic currency (${clinicCurrency}).`;
    } else if (normalizedCode && seenCodes.has(normalizedCode)) {
      error = "Code is duplicated in this file.";
    } else if (seenNames.has(normalizedName)) {
      error = "Service name is duplicated in this file.";
    } else {
      try {
        priceMinor = priceMajorToMinor(Number(price), clinicCurrency);
        durationMinutes = z.int().min(1).max(1440).parse(Number(duration));
      } catch {
        error = "Price or duration is outside the allowed range.";
      }
    }

    if (normalizedCode) {
      seenCodes.add(normalizedCode);
    }
    if (normalizedName) {
      seenNames.add(normalizedName);
    }

    return {
      rowNumber,
      values,
      serviceId,
      ...(existing ? { existingServiceId: existing.id } : {}),
      ...(existing?.code ? { existingCode: existing.code } : {}),
      name,
      ...(code ? { code } : {}),
      ...(priceMinor === undefined ? {} : { priceMinor }),
      ...(durationMinutes === undefined ? {} : { durationMinutes }),
      ...(rowCurrency ? { currencyCode: rowCurrency } : {}),
      action: existing ? "update" : "create",
      ...(error ? { error } : {})
    };
  });
};

const csvCell = (value: string) => {
  const safe = /^[\t\r ]*[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
};

const serviceErrorRowsCsv = (columns: string[], rows: ServiceImportRow[]) => {
  const header = [...columns, "Error"].map(csvCell).join(",");
  const body = rows
    .filter((row) => row.error)
    .map((row) =>
      [...columns.map((column) => row.values[column] ?? ""), row.error ?? ""]
        .map(csvCell)
        .join(",")
    );

  return `\uFEFF${[header, ...body].join("\r\n")}\r\n`;
};

const serviceIdsToRemove = (
  existingServiceIds: string[],
  rows: ServiceImportRow[],
  confirmed: boolean
) => {
  if (!confirmed) return [];
  const mappedIds = new Set(
    rows.flatMap((row) => (row.existingServiceId ? [row.existingServiceId] : []))
  );
  return existingServiceIds.filter((id) => !mappedIds.has(id));
};

const publicServiceImportJob = (job: ServiceImportJob): PublicServiceImportJob => ({
  id: job.id,
  status: job.status,
  fileName: job.file_name,
  columns: job.columns,
  mapping: job.mapping,
  rows: job.rows,
  existingServiceIds: job.existing_service_ids,
  totalRows: job.total_rows,
  importedRows: job.imported_rows,
  failedRows: job.failed_rows,
  removedRows: job.removed_rows,
  lastError: job.last_error,
  expiresAt: job.expires_at,
  objectDeletedAt: job.object_deleted_at,
  dataPurgedAt: job.data_purged_at,
  completedAt: job.completed_at,
  createdAt: job.created_at
});

export {
  SERVICE_IMPORT_BUCKET,
  SERVICE_IMPORT_STATUSES,
  buildServiceImportRows,
  createServiceImportResponseSchema,
  publicServiceImportJob,
  publicServiceImportJobSchema,
  serviceErrorRowsCsv,
  serviceIdsToRemove,
  serviceImportActionSchema,
  serviceImportJobResponseSchema,
  serviceImportJobSchema,
  serviceImportListResponseSchema,
  serviceImportMappingSchema,
  suggestServiceMapping
};
export type {
  ExistingService,
  PublicServiceImportJob,
  ServiceImportJob,
  ServiceImportMapping,
  ServiceImportRow
};
