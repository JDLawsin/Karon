import { z } from "zod";

const CLINIC_EVENT_TYPES = [
  "patient.created",
  "patient.updated",
  "chart.appended",
  "quote.created",
  "payment.recorded",
  "appointment.set",
  "visit.status_changed",
  "reminder.queued"
] as const;

const VISIT_STATUSES = [
  "confirmed",
  "pending_review",
  "waiting",
  "in_chair",
  "complete",
  "cancelled",
  "no_show"
] as const;

const visitStatusSchema = z
  .enum([...VISIT_STATUSES, "booked"])
  .transform((status) => (status === "booked" ? "confirmed" : status));

const patientPayloadSchema = z.object({
  name: z.string().trim().min(1).max(120),
  mobile: z.string().trim().min(7).max(20),
  birthday: z.string().optional(),
  email: z.string().trim().email().max(254).optional()
});

const appointmentSetPayloadSchema = z.object({
  patientId: z.uuid(),
  startsAt: z.string().min(1),
  status: visitStatusSchema.optional(),
  googleEventId: z.string().min(1).optional(),
  serviceName: z.string().trim().min(1).max(80).optional(),
  note: z.string().trim().max(500).optional()
});

const visitStatusChangedPayloadSchema = z.object({
  status: visitStatusSchema
});

const reminderQueuedPayloadSchema = z.object({
  channel: z.literal("email"),
  template: z.literal("booking_cancelled"),
  visitId: z.uuid(),
  to: z.string().trim().email()
});

const payloadIssue = (ctx: z.RefinementCtx, message: string) => {
  ctx.addIssue({
    code: "custom",
    message,
    path: ["payload"]
  });
};

const clinicEventSchema = z
  .object({
    id: z.uuid(),
    tenantId: z.uuid(),
    actorUserId: z.uuid(),
    recordId: z.uuid().nullable(),
    occurredAt: z.string().min(1),
    receivedAt: z.string().min(1).optional(),
    type: z.enum(CLINIC_EVENT_TYPES),
    payload: z.record(z.string(), z.unknown())
  })
  .superRefine((value, ctx) => {
    if (value.type === "patient.created" || value.type === "patient.updated") {
      if (!patientPayloadSchema.safeParse(value.payload).success) {
        payloadIssue(ctx, "Invalid patient payload");
      }

      return;
    }

    if (value.type === "appointment.set") {
      if (!appointmentSetPayloadSchema.safeParse(value.payload).success) {
        payloadIssue(ctx, "Invalid appointment payload");
      }

      return;
    }

    if (value.type === "visit.status_changed") {
      if (!visitStatusChangedPayloadSchema.safeParse(value.payload).success) {
        payloadIssue(ctx, "Invalid visit status payload");
      }

      return;
    }

    if (value.type === "reminder.queued") {
      const parsed = reminderQueuedPayloadSchema.safeParse(value.payload);

      if (!parsed.success || parsed.data.visitId !== value.recordId) {
        payloadIssue(ctx, "Invalid reminder payload");
      }
    }
  });

const clinicEventRowSchema = z.object({
  id: z.uuid(),
  tenant_id: z.uuid(),
  actor_user_id: z.uuid(),
  event_type: z.enum(CLINIC_EVENT_TYPES),
  record_id: z.uuid().nullable(),
  payload: z.record(z.string(), z.unknown()),
  occurred_at: z.string().min(1),
  received_at: z.string().min(1)
});

type ClinicEvent = z.infer<typeof clinicEventSchema>;
type ClinicEventType = (typeof CLINIC_EVENT_TYPES)[number];
type VisitStatus = (typeof VISIT_STATUSES)[number];

const toClinicEvent = (row: z.infer<typeof clinicEventRowSchema>): ClinicEvent => ({
  id: row.id,
  tenantId: row.tenant_id,
  actorUserId: row.actor_user_id,
  recordId: row.record_id,
  occurredAt: row.occurred_at,
  receivedAt: row.received_at,
  type: row.event_type,
  payload: row.payload
});

export {
  CLINIC_EVENT_TYPES,
  VISIT_STATUSES,
  appointmentSetPayloadSchema,
  clinicEventRowSchema,
  clinicEventSchema,
  patientPayloadSchema,
  reminderQueuedPayloadSchema,
  toClinicEvent,
  visitStatusChangedPayloadSchema,
  visitStatusSchema
};
export type { ClinicEvent, ClinicEventType, VisitStatus };
