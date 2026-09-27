import { z } from "zod";

import { mobileDigits } from "@/features/patients/patient-search";

const IMPORT_BUCKET = "patient-import-staging";
const IMPORT_TTL_HOURS = 24;
const MAX_IMPORT_FILE_BYTES = 5_000_000;
const MAX_IMPORT_ROWS = 2_000;
const MAX_IMPORT_COLUMNS = 50;

const IMPORT_STATUSES = [
  "awaiting_upload",
  "uploaded",
  "preview_ready",
  "committing",
  "completed",
  "failed"
] as const;
const IMPORT_DECISIONS = ["skip", "merge", "create"] as const;

const importMappingSchema = z
  .object({
    name: z.string().min(1).max(80).nullable(),
    mobile: z.string().min(1).max(80).nullable(),
    email: z.string().min(1).max(80).nullable()
  })
  .strict();

const importDecisionSchema = z
  .object({
    rowNumber: z.int().min(2).max(MAX_IMPORT_ROWS + 1),
    decision: z.enum(IMPORT_DECISIONS)
  })
  .strict();

const createImportSchema = z
  .object({
    fileName: z.string().trim().min(1).max(255),
    fileSize: z.int().min(1).max(MAX_IMPORT_FILE_BYTES),
    contentType: z.string().trim().max(120)
  })
  .strict();

const importActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("preview") }).strict(),
  z
    .object({ action: z.literal("map"), mapping: importMappingSchema })
    .strict(),
  z
    .object({
      action: z.literal("commit"),
      decisions: z.array(importDecisionSchema).max(MAX_IMPORT_ROWS)
    })
    .strict()
]);

const patientImportRowSchema = z
  .object({
    rowNumber: z.int().min(2),
    values: z.record(z.string(), z.string()),
    name: z.string(),
    mobile: z.string(),
    email: z.string().optional(),
    mobileDigits: z.string(),
    patientId: z.uuid(),
    eventId: z.uuid(),
    duplicatePatientId: z.uuid().optional(),
    duplicateName: z.string().optional(),
    duplicateEmail: z.string().email().max(254).optional(),
    decision: z.enum(IMPORT_DECISIONS),
    error: z.string().optional()
  })
  .strict();

const patientImportJobSchema = z
  .object({
    id: z.uuid(),
    tenant_id: z.uuid(),
    created_by: z.uuid(),
    status: z.enum(IMPORT_STATUSES),
    file_name: z.string(),
    storage_path: z.string(),
    content_type: z.string(),
    file_size: z.number().int(),
    columns: z.array(z.string()),
    mapping: importMappingSchema,
    rows: z.array(patientImportRowSchema),
    total_rows: z.number().int(),
    imported_rows: z.number().int(),
    failed_rows: z.number().int(),
    skipped_rows: z.number().int(),
    last_error: z.string().nullable(),
    expires_at: z.string(),
    object_deleted_at: z.string().nullable(),
    data_purged_at: z.string().nullable(),
    completed_at: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string()
  })
  .passthrough();

const publicPatientImportJobSchema = z
  .object({
    id: z.uuid(),
    status: z.enum(IMPORT_STATUSES),
    fileName: z.string(),
    columns: z.array(z.string()),
    mapping: importMappingSchema,
    rows: z.array(patientImportRowSchema),
    totalRows: z.number().int(),
    importedRows: z.number().int(),
    failedRows: z.number().int(),
    skippedRows: z.number().int(),
    lastError: z.string().nullable(),
    expiresAt: z.string(),
    objectDeletedAt: z.string().nullable(),
    dataPurgedAt: z.string().nullable(),
    completedAt: z.string().nullable(),
    createdAt: z.string()
  })
  .strict();

const importJobResponseSchema = z
  .object({ job: publicPatientImportJobSchema })
  .strict();
const importListResponseSchema = z
  .object({ jobs: z.array(publicPatientImportJobSchema) })
  .strict();
const createImportResponseSchema = z
  .object({
    job: publicPatientImportJobSchema,
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

type ImportMapping = z.infer<typeof importMappingSchema>;
type ImportDecision = z.infer<typeof importDecisionSchema>;
type ImportAction = z.infer<typeof importActionSchema>;
type PatientImportRow = z.infer<typeof patientImportRowSchema>;
type PatientImportJob = z.infer<typeof patientImportJobSchema>;
type PublicPatientImportJob = z.infer<typeof publicPatientImportJobSchema>;
type SourceRow = {
  rowNumber: number;
  values: Record<string, string>;
};
type ImportSource = {
  columns: string[];
  rows: SourceRow[];
};
type ExistingPatient = {
  id: string;
  name: string;
  mobile: string;
  email?: string | null;
};

class ImportFileError extends Error {}

const normalizeContentType = (fileName: string, contentType: string) => {
  const extension = fileName.toLocaleLowerCase().split(".").pop();

  if (extension === "xlsx") {
    return contentType ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      ? contentType
      : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }

  if (extension === "csv") {
    return ["text/csv", "application/csv", "application/vnd.ms-excel"].includes(
      contentType
    )
      ? contentType
      : "text/csv";
  }

  throw new ImportFileError("Choose a .csv or .xlsx file.");
};

const extensionForContentType = (contentType: string) =>
  contentType ===
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ? "xlsx"
    : "csv";

const parseCsv = (input: string): string[][] => {
  const text = input.replace(/^\uFEFF/, "");

  if (text.includes("\0")) {
    throw new ImportFileError("The CSV contains unsupported binary data.");
  }

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }

      continue;
    }

    if (character === '"' && field === "") {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && text[index + 1] === "\n") {
        index += 1;
      }

      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  if (quoted) {
    throw new ImportFileError("The CSV has an unclosed quoted field.");
  }

  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((cells) => cells.some((cell) => cell.trim() !== ""));
};

const uniqueHeaders = (cells: string[]) => {
  const used = new Map<string, number>();

  return cells.map((cell, index) => {
    const base = cell.trim() || `Column ${index + 1}`;
    const count = (used.get(base.toLocaleLowerCase()) ?? 0) + 1;
    used.set(base.toLocaleLowerCase(), count);
    return count === 1 ? base : `${base} (${count})`;
  });
};

const sourceFromMatrix = (matrix: string[][]): ImportSource => {
  const [header = [], ...data] = matrix;

  if (header.length === 0 || data.length === 0) {
    throw new ImportFileError("The file needs a header row and at least one patient.");
  }

  if (header.length > MAX_IMPORT_COLUMNS) {
    throw new ImportFileError(`Use ${MAX_IMPORT_COLUMNS} columns or fewer.`);
  }

  if (header.some((cell) => cell.trim().length > 80)) {
    throw new ImportFileError("Column names must be 80 characters or fewer.");
  }

  if (data.length > MAX_IMPORT_ROWS) {
    throw new ImportFileError(`Import ${MAX_IMPORT_ROWS} patients or fewer at a time.`);
  }

  const columns = uniqueHeaders(header);
  const rows = data
    .map((cells, index) => ({
      rowNumber: index + 2,
      values: Object.fromEntries(
        columns.map((column, columnIndex) => [column, cells[columnIndex]?.trim() ?? ""])
      )
    }))
    .filter(({ values }) => Object.values(values).some(Boolean));

  if (rows.length === 0) {
    throw new ImportFileError("The file does not contain any patient rows.");
  }

  return { columns, rows };
};

const findColumn = (columns: string[], names: string[]) =>
  columns.find((column) => names.includes(column.trim().toLocaleLowerCase())) ?? null;

const suggestMapping = (columns: string[]): ImportMapping => ({
  name: findColumn(columns, ["name", "full name", "patient", "patient name"]),
  mobile: findColumn(columns, [
    "mobile",
    "mobile number",
    "phone",
    "phone number",
    "contact",
    "contact number"
  ]),
  email: findColumn(columns, ["email", "email address"])
});

const buildPatientImportRows = (
  source: ImportSource,
  mapping: ImportMapping,
  existingPatients: ExistingPatient[]
): PatientImportRow[] => {
  const existingByMobile = new Map(
    existingPatients.map((patient) => [mobileDigits(patient.mobile), patient])
  );
  const firstImportedByMobile = new Map<
    string,
    { id: string; name: string; email?: string }
  >();

  return source.rows.map(({ rowNumber, values }) => {
    const name = mapping.name ? values[mapping.name]?.trim() ?? "" : "";
    const mobile = mapping.mobile ? values[mapping.mobile]?.trim() ?? "" : "";
    const email = mapping.email ? values[mapping.email]?.trim() ?? "" : "";
    const digits = mobileDigits(mobile);
    const patientId = crypto.randomUUID();
    const eventId = crypto.randomUUID();
    let error: string | undefined;

    if (!mapping.name || !mapping.mobile) {
      error = "Map the name and mobile columns.";
    } else if (!name || name.length > 120) {
      error = "Name must be between 1 and 120 characters.";
    } else if (mobile.length < 7 || mobile.length > 20 || digits.length < 7 || digits.length > 15) {
      error = "Mobile must contain 7 to 15 digits.";
    } else if (email && !z.string().email().max(254).safeParse(email).success) {
      error = "Email is not valid.";
    }

    const existing = error ? undefined : existingByMobile.get(digits);
    const imported = error ? undefined : firstImportedByMobile.get(digits);
    const duplicate = existing ?? imported;

    if (!error && !firstImportedByMobile.has(digits)) {
      firstImportedByMobile.set(digits, {
        id: patientId,
        name,
        ...(email ? { email } : {})
      });
    }

    return {
      rowNumber,
      values,
      name,
      mobile,
      ...(email ? { email } : {}),
      mobileDigits: digits,
      patientId,
      eventId,
      ...(duplicate
        ? {
            duplicatePatientId: duplicate.id,
            duplicateName: duplicate.name,
            ...(duplicate.email ? { duplicateEmail: duplicate.email } : {})
          }
        : {}),
      decision: error || duplicate ? "skip" : "create",
      ...(error ? { error } : {})
    };
  });
};

const applyImportDecisions = (
  rows: PatientImportRow[],
  decisions: ImportDecision[]
) => {
  const byRow = new Map(decisions.map((decision) => [decision.rowNumber, decision.decision]));

  return rows.map((row) => {
    const decision = byRow.get(row.rowNumber) ?? row.decision;

    if (row.error) {
      return { ...row, decision: "skip" as const };
    }

    if (decision === "merge" && !row.duplicatePatientId) {
      throw new ImportFileError(`Row ${row.rowNumber} has no patient to merge.`);
    }

    return { ...row, decision };
  });
};

const importEvents = (
  job: PatientImportJob,
  rows: PatientImportRow[],
  occurredAt = new Date().toISOString()
) =>
  rows.flatMap((row, index) => {
    if (row.error || row.decision === "skip") {
      return [];
    }

    const merging = row.decision === "merge";
    const email = row.email ?? (merging ? row.duplicateEmail : undefined);

    return [
      {
        id: row.eventId,
        tenant_id: job.tenant_id,
        actor_user_id: job.created_by,
        event_type: merging ? ("patient.updated" as const) : ("patient.created" as const),
        record_id: merging ? row.duplicatePatientId! : row.patientId,
        payload: {
          name: row.name,
          mobile: row.mobile,
          ...(email ? { email } : {})
        },
        occurred_at: new Date(Date.parse(occurredAt) + index).toISOString()
      }
    ];
  });

const csvCell = (value: string) => {
  const safe = /^[\t\r ]*[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
};

const errorRowsCsv = (job: PatientImportJob) => {
  const errors = job.rows.filter((row) => row.error);
  const header = [...job.columns, "Error"].map(csvCell).join(",");
  const body = errors.map((row) =>
    [...job.columns.map((column) => row.values[column] ?? ""), row.error ?? ""]
      .map(csvCell)
      .join(",")
  );

  return `\uFEFF${[header, ...body].join("\r\n")}\r\n`;
};

const publicImportJob = (job: PatientImportJob) => ({
  id: job.id,
  status: job.status,
  fileName: job.file_name,
  columns: job.columns,
  mapping: job.mapping,
  rows: job.rows,
  totalRows: job.total_rows,
  importedRows: job.imported_rows,
  failedRows: job.failed_rows,
  skippedRows: job.skipped_rows,
  lastError: job.last_error,
  expiresAt: job.expires_at,
  objectDeletedAt: job.object_deleted_at,
  dataPurgedAt: job.data_purged_at,
  completedAt: job.completed_at,
  createdAt: job.created_at
});

export {
  IMPORT_BUCKET,
  IMPORT_DECISIONS,
  IMPORT_STATUSES,
  IMPORT_TTL_HOURS,
  MAX_IMPORT_FILE_BYTES,
  MAX_IMPORT_ROWS,
  ImportFileError,
  applyImportDecisions,
  buildPatientImportRows,
  createImportSchema,
  errorRowsCsv,
  extensionForContentType,
  importActionSchema,
  importJobResponseSchema,
  importListResponseSchema,
  importEvents,
  importMappingSchema,
  normalizeContentType,
  parseCsv,
  patientImportJobSchema,
  publicPatientImportJobSchema,
  publicImportJob,
  sourceFromMatrix,
  suggestMapping,
  createImportResponseSchema
};
export type {
  ExistingPatient,
  ImportAction,
  ImportDecision,
  ImportMapping,
  ImportSource,
  PatientImportJob,
  PatientImportRow,
  PublicPatientImportJob,
  SourceRow
};
