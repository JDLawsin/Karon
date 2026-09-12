import { z } from "zod";

const PASSWORD_HINT =
  "Use at least 12 characters with an uppercase letter, a lowercase letter, and a number.";

const tenantIdSchema = z.uuid();

const emailSchema = z.email("Enter a valid email.");

const clinicNameSchema = z
  .string()
  .trim()
  .min(2, "Enter a clinic name of at least 2 characters.")
  .max(80, "Use a shorter clinic name.");

const passwordSchema = z
  .string()
  .min(12, PASSWORD_HINT)
  .max(128, "Use at most 128 characters.")
  .regex(/[a-z]/, PASSWORD_HINT)
  .regex(/[A-Z]/, PASSWORD_HINT)
  .regex(/[0-9]/, PASSWORD_HINT);

// Login stays at 8 so existing accounts can still submit. Match signup in
// Supabase Auth → Providers → Email → Minimum password length (12).
const loginCredentialsSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(8, "Enter a valid email and a password of at least 8 characters.")
    .max(128, "Use at most 128 characters.")
});

const signupCredentialsSchema = z.object({
  email: emailSchema,
  password: passwordSchema
});

const forgotPasswordSchema = z.object({
  email: emailSchema
});

const updatePasswordSchema = z
  .object({
    password: passwordSchema,
    confirm: z.string()
  })
  .refine((data) => data.password === data.confirm, {
    message: "Passwords do not match.",
    path: ["confirm"]
  });

const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(8, "Enter your current password.")
      .max(128, "Use at most 128 characters."),
    password: passwordSchema,
    confirm: z.string()
  })
  .refine((data) => data.password === data.confirm, {
    message: "Passwords do not match.",
    path: ["confirm"]
  });

const totpSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit authenticator code.")
});

const emailOtpTypeSchema = z.enum([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email"
]);

type LoginCredentials = z.infer<typeof loginCredentialsSchema>;
type SignupCredentials = z.infer<typeof signupCredentialsSchema>;
type TotpValues = z.infer<typeof totpSchema>;
type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
type UpdatePasswordValues = z.infer<typeof updatePasswordSchema>;
type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

export {
  PASSWORD_HINT,
  changePasswordSchema,
  clinicNameSchema,
  emailOtpTypeSchema,
  emailSchema,
  forgotPasswordSchema,
  loginCredentialsSchema,
  passwordSchema,
  signupCredentialsSchema,
  tenantIdSchema,
  totpSchema,
  updatePasswordSchema
};
export type {
  ChangePasswordValues,
  ForgotPasswordValues,
  LoginCredentials,
  SignupCredentials,
  TotpValues,
  UpdatePasswordValues
};
