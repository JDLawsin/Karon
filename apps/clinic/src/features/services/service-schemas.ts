import { z } from "zod";

import { isServiceIconKey } from "@/features/services/service-icons";

const serviceDescriptionSchema = z
  .string()
  .trim()
  .max(280, "Use a shorter description.")
  .optional()
  .transform((value) => (value ? value : undefined));

const serviceIconSchema = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined))
  .refine((value) => value === undefined || isServiceIconKey(value), {
    message: "Choose an icon from the list."
  });

const serviceFormSchema = z.object({
  name: z.string().trim().min(1, "Enter a service name.").max(80, "Use a shorter name."),
  description: serviceDescriptionSchema,
  icon: serviceIconSchema,
  priceMajor: z
    .number({ error: "Enter a price." })
    .min(0, "Price cannot be negative.")
    .max(21_474_836.47, "Enter a lower price."),
  durationMinutes: z
    .number({ error: "Enter a duration." })
    .int("Use whole minutes.")
    .min(1, "Duration must be at least 1 minute.")
    .max(1440, "Duration cannot exceed 24 hours.")
});

const currencyCodeSchema = z
  .string()
  .regex(/^[A-Z]{3}$/, "Currency must be a three-letter ISO code.");

const servicePricingSchema = z.object({
  priceMinor: z.int().min(0).max(2_147_483_647),
  currencyCode: currencyCodeSchema,
  durationMinutes: z.int().min(1).max(1440)
});

const clinicServiceRowSchema = z.object({
  id: z.uuid(),
  tenant_id: z.uuid(),
  name: z.string(),
  description: z.string().nullable(),
  icon: z.string().nullable(),
  price_minor: z.int().min(0).nullable(),
  currency_code: currencyCodeSchema.nullable(),
  duration_minutes: z.int().min(1).max(1440).nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  created_by: z.uuid(),
  updated_by: z.uuid()
});

const clinicServicesSchema = z.array(clinicServiceRowSchema);

type ServiceFormValues = z.infer<typeof serviceFormSchema>;
type ClinicServiceRow = z.infer<typeof clinicServiceRowSchema>;

const parseClinicServices = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((row) => {
    const parsed = clinicServiceRowSchema.safeParse(row);

    return parsed.success ? [parsed.data] : [];
  });
};

export {
  clinicServiceRowSchema,
  clinicServicesSchema,
  currencyCodeSchema,
  parseClinicServices,
  servicePricingSchema,
  serviceFormSchema
};
export type { ClinicServiceRow, ServiceFormValues };
