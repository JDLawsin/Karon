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
  icon: serviceIconSchema
});

const clinicServiceRowSchema = z.object({
  id: z.uuid(),
  tenant_id: z.uuid(),
  name: z.string(),
  description: z.string().nullable(),
  icon: z.string().nullable(),
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
  parseClinicServices,
  serviceFormSchema
};
export type { ClinicServiceRow, ServiceFormValues };
