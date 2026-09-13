import { z } from "zod";

const bookingSlugSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9_-]{8,32}$/);

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

type PublicBookingSubmit = z.infer<typeof publicBookingSubmitSchema>;

export {
  bookingApiErrorSchema,
  bookingLinkResponseSchema,
  bookingLinkRowSchema,
  bookingSlugSchema,
  clinicBookingRowSchema,
  inboxRowSchema,
  publicBookingPageSchema,
  publicBookingSubmitSchema
};
export type { PublicBookingSubmit };
