import { z } from "zod";

const bookingSlugSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9_-]{8,32}$/);

const bookingIdempotencyKeySchema = z.uuid();

const publicBookingSubmitSchema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(80),
  mobile: z.string().trim().min(1, "Enter a mobile number.").max(20),
  startsAt: z.string().trim().min(1, "Choose a time."),
  serviceId: z.string().trim().min(1, "Choose a service.").max(80),
  note: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((value) => (value ? value : undefined))
});

const inboxRowSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  mobile: z.string(),
  service_name: z.string(),
  note: z.string().nullable(),
  starts_at: z.string()
});

const bookingLinkRowSchema = z.object({
  id: z.uuid(),
  tenant_id: z.uuid()
});

const clinicBookingRowSchema = z.object({
  name: z.string().min(1),
  timezone: z.string().nullable(),
  hours: z.unknown(),
  services: z.unknown()
});

const publicBookingPageSchema = z.object({
  clinicName: z.string(),
  timezone: z.string(),
  services: z.array(z.object({ id: z.string(), name: z.string() })),
  dates: z.array(z.string()),
  date: z.string().nullable(),
  slots: z.array(
    z.object({
      clock: z.string(),
      startsAt: z.string(),
      label: z.string()
    })
  )
});

const bookingLinkResponseSchema = z.object({
  url: z.string().min(1)
});

const bookingApiErrorSchema = z.object({
  error: z.string()
});

const bookingReplayRowSchema = z.object({
  starts_at: z.string(),
  service_id: z.string(),
  mobile: z.string()
});

const isBookingHoneypotFilled = (body: unknown) => {
  if (!body || typeof body !== "object" || !("website" in body)) {
    return false;
  }

  const value = body.website;

  if (value == null) {
    return false;
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  return true;
};

const bookingTurnstileTokenOf = (body: unknown) => {
  if (!body || typeof body !== "object" || !("turnstileToken" in body)) {
    return undefined;
  }

  return typeof body.turnstileToken === "string" ? body.turnstileToken : undefined;
};

const bookingReplayMatches = (
  existing: { starts_at: string; service_id: string; mobile: string },
  submitted: { startsAt: string; serviceId: string; mobile: string }
) =>
  Date.parse(existing.starts_at) === Date.parse(submitted.startsAt) &&
  existing.service_id === submitted.serviceId &&
  existing.mobile === submitted.mobile;

type PublicBookingSubmit = z.infer<typeof publicBookingSubmitSchema>;

export {
  bookingApiErrorSchema,
  bookingIdempotencyKeySchema,
  bookingLinkResponseSchema,
  bookingLinkRowSchema,
  bookingReplayMatches,
  bookingReplayRowSchema,
  bookingSlugSchema,
  bookingTurnstileTokenOf,
  clinicBookingRowSchema,
  inboxRowSchema,
  isBookingHoneypotFilled,
  publicBookingPageSchema,
  publicBookingSubmitSchema
};
export type { PublicBookingSubmit };
