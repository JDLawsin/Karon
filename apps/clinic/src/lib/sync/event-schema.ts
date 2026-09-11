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

const VISIT_STATUSES = ["booked", "waiting", "in_chair"] as const;

const patientPayloadSchema = z.object({
  name: z.string().trim().min(1),
  mobile: z.string().trim().min(1),
  birthday: z.string().optional()
});

const appointmentSetPayloadSchema = z.object({
  patientId: z.uuid(),
  startsAt: z.string().min(1),
  status: z.enum(VISIT_STATUSES).optional()
});

const visitStatusChangedPayloadSchema = z.object({
  status: z.enum(VISIT_STATUSES)
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
  toClinicEvent,
  visitStatusChangedPayloadSchema
};
export type { ClinicEvent, ClinicEventType, VisitStatus };
