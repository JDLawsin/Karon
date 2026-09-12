import { z } from "zod";

import { clinicNameSchema, emailSchema } from "@/features/auth/auth-schemas";

const DEFAULT_TIMEZONE = "Asia/Manila";
const DEFAULT_OPEN = "09:00";
const DEFAULT_CLOSE = "18:00";
const DEFAULT_WORKING_DAYS = [1, 2, 3, 4, 5, 6];
const SUGGESTED_SERVICES = ["Oral prophylaxis", "Extraction", "Filling"];
const MAX_STAFF_INVITES = 5;
const MAX_SERVICES = 12;

const optionalAddressLine = z.string().trim().max(120, "Use a shorter value.");

const clinicPhoneSchema = z
  .string()
  .trim()
  .min(7, "Enter a clinic phone number.")
  .max(20, "Use a shorter phone number.")
  .regex(/^[+\d][\d\s\-()]{6,19}$/, "Enter a valid phone number.");

const timeSchema = z
  .string()
  .trim()
  .transform((value) => value.slice(0, 5))
  .pipe(z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Enter a time."));

const serviceSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(80, "Use a shorter service name.")
});

const clinicOnboardingFields = z.object({
  name: clinicNameSchema,
  phone: clinicPhoneSchema,
  email: emailSchema,
  line1: optionalAddressLine,
  barangay: optionalAddressLine,
  city: optionalAddressLine,
  province: optionalAddressLine,
  postalCode: z.string().trim().max(10, "Use a shorter postal code."),
  timezone: z.string().trim().min(1, "Choose a timezone.").max(64),
  days: z
    .array(z.number().int().min(0).max(6))
    .min(1, "Pick at least one working day."),
  open: timeSchema,
  close: timeSchema,
  staffEmails: z.array(z.string()),
  services: z.array(serviceSchema).max(MAX_SERVICES)
});

const addHoursIssue = (
  data: { open: string; close: string },
  ctx: z.RefinementCtx
) => {
  if (data.open >= data.close) {
    ctx.addIssue({
      code: "custom",
      path: ["close"],
      message: "Close must be after open."
    });
  }
};

const addStaffEmailIssues = (
  emails: string[],
  ctx: z.RefinementCtx
) => {
  emails.forEach((email, index) => {
    const trimmed = email.trim();

    if (!trimmed) {
      return;
    }

    if (!emailSchema.safeParse(trimmed).success) {
      ctx.addIssue({
        code: "custom",
        path: ["staffEmails", index],
        message: "Enter a valid email."
      });
    }
  });
};

const onboardingIdentitySchema = clinicOnboardingFields.pick({
  name: true,
  phone: true,
  email: true,
  line1: true,
  barangay: true,
  city: true,
  province: true,
  postalCode: true
});

const onboardingHoursSchema = clinicOnboardingFields
  .pick({
    timezone: true,
    days: true,
    open: true,
    close: true
  })
  .superRefine(addHoursIssue);

const onboardingStaffSchema = clinicOnboardingFields
  .pick({ staffEmails: true })
  .superRefine((data, ctx) => addStaffEmailIssues(data.staffEmails, ctx));

const onboardingServicesSchema = clinicOnboardingFields.pick({
  services: true
});

const clinicOnboardingSchema = clinicOnboardingFields.superRefine((data, ctx) => {
  addHoursIssue(data, ctx);
  addStaffEmailIssues(data.staffEmails, ctx);
});

type ClinicOnboarding = z.infer<typeof clinicOnboardingSchema>;

type ClinicProfile = {
  timezone: string;
  phone: string;
  email: string;
  address: {
    line1: string;
    barangay: string;
    city: string;
    province: string;
    postalCode: string;
  };
  hours: {
    days: number[];
    open: string;
    close: string;
  };
  services: { id: string; name: string }[];
};

const defaultOnboardingValues = (): ClinicOnboarding => ({
  name: "",
  phone: "",
  email: "",
  line1: "",
  barangay: "",
  city: "",
  province: "",
  postalCode: "",
  timezone: DEFAULT_TIMEZONE,
  days: [...DEFAULT_WORKING_DAYS],
  open: DEFAULT_OPEN,
  close: DEFAULT_CLOSE,
  staffEmails: [""],
  services: []
});

const toClinicProfile = (values: ClinicOnboarding): ClinicProfile => ({
  timezone: values.timezone,
  phone: values.phone,
  email: values.email,
  address: {
    line1: values.line1,
    barangay: values.barangay,
    city: values.city,
    province: values.province,
    postalCode: values.postalCode
  },
  hours: {
    days: [...values.days].sort((left, right) => left - right),
    open: values.open.slice(0, 5),
    close: values.close.slice(0, 5)
  },
  services: values.services
    .map((service) => ({ id: service.id, name: service.name.trim() }))
    .filter((service) => service.name)
});

const staffInviteEmails = (values: ClinicOnboarding) =>
  values.staffEmails.map((email) => email.trim()).filter(Boolean);

const clinicRowSchema = z.object({
  name: z.string(),
  timezone: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  address: z
    .object({
      line1: z.string().optional(),
      barangay: z.string().optional(),
      city: z.string().optional(),
      province: z.string().optional(),
      postalCode: z.string().optional()
    })
    .nullable()
    .optional(),
  hours: z
    .object({
      days: z.array(z.number()).optional(),
      open: z.string().optional(),
      close: z.string().optional()
    })
    .nullable()
    .optional(),
  services: z.array(serviceSchema).nullable().optional(),
  logo_path: z.string().nullable().optional()
});

const fromClinicRow = (row: unknown): ClinicOnboarding => {
  const parsed = clinicRowSchema.safeParse(row);
  const defaults = defaultOnboardingValues();

  if (!parsed.success) {
    return defaults;
  }

  const data = parsed.data;
  const days = data.hours?.days?.filter((day) => day >= 0 && day <= 6) ?? [];

  return {
    ...defaults,
    name: data.name,
    phone: data.phone ?? "",
    email: data.email ?? "",
    line1: data.address?.line1 ?? "",
    barangay: data.address?.barangay ?? "",
    city: data.address?.city ?? "",
    province: data.address?.province ?? "",
    postalCode: data.address?.postalCode ?? "",
    timezone: data.timezone?.trim() || DEFAULT_TIMEZONE,
    days: days.length > 0 ? days : [...DEFAULT_WORKING_DAYS],
    open: data.hours?.open?.slice(0, 5) || DEFAULT_OPEN,
    close: data.hours?.close?.slice(0, 5) || DEFAULT_CLOSE,
    services: data.services ?? []
  };
};

const WORKING_DAYS = [
  { value: 0, label: "Sunday", short: "Sun" },
  { value: 1, label: "Monday", short: "Mon" },
  { value: 2, label: "Tuesday", short: "Tue" },
  { value: 3, label: "Wednesday", short: "Wed" },
  { value: 4, label: "Thursday", short: "Thu" },
  { value: 5, label: "Friday", short: "Fri" },
  { value: 6, label: "Saturday", short: "Sat" }
] as const;

const ONBOARDING_STEPS = [
  {
    id: "identity",
    label: "Clinic",
    blurb: "Name the clinic patients will see."
  },
  {
    id: "hours",
    label: "Hours",
    blurb: "When the clinic is open."
  },
  {
    id: "staff",
    label: "Staff",
    blurb: "Invite assistants now, or skip and add them later."
  },
  {
    id: "services",
    label: "Services",
    blurb: "Add a few now. You can edit them later."
  },
  {
    id: "review",
    label: "Review",
    blurb: "Check these details, then create the clinic."
  }
] as const;

const stepForOnboardingIssues = (issues: { path: PropertyKey[] }[]) => {
  const steps = issues.map((issue) => {
    const root = String(issue.path[0] ?? "");

    if (
      root === "name" ||
      root === "phone" ||
      root === "email" ||
      root === "line1" ||
      root === "barangay" ||
      root === "city" ||
      root === "province" ||
      root === "postalCode"
    ) {
      return 0;
    }

    if (root === "timezone" || root === "days" || root === "open" || root === "close") {
      return 1;
    }

    if (root === "staffEmails") {
      return 2;
    }

    if (root === "services") {
      return 3;
    }

    return 0;
  });

  return steps.length > 0 ? Math.min(...steps) : 0;
};

export {
  MAX_SERVICES,
  MAX_STAFF_INVITES,
  ONBOARDING_STEPS,
  SUGGESTED_SERVICES,
  WORKING_DAYS,
  clinicOnboardingSchema,
  clinicPhoneSchema,
  defaultOnboardingValues,
  fromClinicRow,
  onboardingHoursSchema,
  onboardingIdentitySchema,
  onboardingServicesSchema,
  onboardingStaffSchema,
  staffInviteEmails,
  stepForOnboardingIssues,
  toClinicProfile
};
export type { ClinicOnboarding, ClinicProfile };
