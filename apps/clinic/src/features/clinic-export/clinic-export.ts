import { z } from "zod";

const exportKinds = ["patients", "appointments", "payments"] as const;
const clinicExportKindSchema = z.enum(exportKinds);

type ClinicExportKind = z.infer<typeof clinicExportKindSchema>;

const patientExportRowSchema = z
  .object({
    id: z.uuid(),
    name: z.string(),
    mobile: z.string(),
    email: z.string().nullable(),
    created_at: z.iso.datetime({ offset: true }),
    updated_at: z.iso.datetime({ offset: true })
  })
  .strict();

const eventExportRowSchema = z
  .object({
    id: z.uuid(),
    record_id: z.uuid().nullable(),
    payload: z.record(z.string(), z.unknown()),
    occurred_at: z.iso.datetime({ offset: true }),
    received_at: z.iso.datetime({ offset: true })
  })
  .strict();

const appointmentPayloadSchema = z
  .object({
    patientId: z.uuid(),
    startsAt: z.iso.datetime({ offset: true }),
    status: z.string().min(1).max(40).optional(),
    serviceName: z.string().max(160).optional(),
    note: z.string().max(2_000).optional()
  })
  .passthrough();

const visitStatusPayloadSchema = z
  .object({ status: z.string().min(1).max(40) })
  .passthrough();

const paymentPayloadSchema = z
  .object({
    patientId: z.uuid(),
    visitId: z.uuid(),
    amountMinor: z.number().int().positive(),
    currency: z.string().regex(/^[A-Z]{3}$/),
    method: z.enum(["cash", "gcash", "maya", "card", "other", "unpaid"])
  })
  .passthrough();

const exportHeaders: Record<ClinicExportKind, readonly string[]> = {
  patients: [
    "patient_id",
    "name",
    "mobile",
    "email",
    "created_at",
    "updated_at"
  ],
  appointments: [
    "appointment_id",
    "patient_id",
    "patient_name",
    "starts_at",
    "status",
    "service_name",
    "note",
    "recorded_at"
  ],
  payments: [
    "payment_id",
    "patient_id",
    "patient_name",
    "appointment_id",
    "amount_minor",
    "currency",
    "method",
    "recorded_at"
  ]
};

const formulaPrefix = /^(?:[\t\r\n]|\s*[=+@-])/;

const csvCell = (value: string | number | null | undefined) => {
  const raw = value === null || value === undefined ? "" : String(value);
  const safe = formulaPrefix.test(raw) ? `'${raw}` : raw;
  return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
};

const csvLine = (values: readonly (string | number | null | undefined)[]) =>
  `${values.map(csvCell).join(",")}\r\n`;

const exportHeaderLine = (kind: ClinicExportKind) => csvLine(exportHeaders[kind]);

const patientCsvLine = (value: unknown) => {
  const row = patientExportRowSchema.parse(value);
  return csvLine([
    row.id,
    row.name,
    row.mobile,
    row.email,
    row.created_at,
    row.updated_at
  ]);
};

const appointmentCsvLine = (
  value: unknown,
  patientName: string | null,
  currentStatus?: string
) => {
  const row = eventExportRowSchema.parse(value);
  const payload = appointmentPayloadSchema.parse(row.payload);

  if (!row.record_id) {
    throw new Error("Appointment export row has no appointment ID.");
  }

  return csvLine([
    row.record_id,
    payload.patientId,
    patientName,
    payload.startsAt,
    currentStatus ?? payload.status ?? "confirmed",
    payload.serviceName,
    payload.note,
    row.occurred_at
  ]);
};

const paymentCsvLine = (value: unknown, patientName: string | null) => {
  const row = eventExportRowSchema.parse(value);
  const payload = paymentPayloadSchema.parse(row.payload);

  return csvLine([
    row.id,
    payload.patientId,
    patientName,
    payload.visitId,
    payload.amountMinor,
    payload.currency,
    payload.method,
    row.occurred_at
  ]);
};

const parseExportKind = (value: unknown) => {
  const parsed = clinicExportKindSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
};

const patientIdForEvent = (value: unknown) => {
  const row = eventExportRowSchema.parse(value);
  const payload =
    appointmentPayloadSchema.safeParse(row.payload).data ??
    paymentPayloadSchema.parse(row.payload);
  return payload.patientId;
};

const statusForEvent = (value: unknown) => {
  const row = eventExportRowSchema.parse(value);
  const payload = visitStatusPayloadSchema.parse(row.payload);
  return { appointmentId: row.record_id, status: payload.status };
};

export {
  appointmentCsvLine,
  clinicExportKindSchema,
  csvCell,
  csvLine,
  eventExportRowSchema,
  exportHeaderLine,
  exportKinds,
  parseExportKind,
  patientCsvLine,
  patientIdForEvent,
  paymentCsvLine,
  statusForEvent
};
export type { ClinicExportKind };
