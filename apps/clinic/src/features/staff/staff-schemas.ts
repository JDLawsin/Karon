import { z } from "zod";

import { emailSchema } from "@/features/auth/auth-schemas";

const inviteBodySchema = z.object({
  email: emailSchema
});

const memberUserSchema = z.object({
  userId: z.uuid()
});

const sessionBodySchema = z.union([
  z.object({ sessionId: z.uuid() }),
  z.object({ others: z.literal(true) })
]);

const inviteOkSchema = z.object({
  ok: z.literal(true),
  userId: z.uuid()
});

const apiErrorSchema = z.object({
  error: z.string()
});

const memberRowSchema = z.object({
  user_id: z.uuid(),
  role: z.enum(["owner", "assistant"])
});

const sessionRowSchema = z.object({
  id: z.uuid(),
  user_id: z.uuid(),
  session_id: z.uuid(),
  last_active_at: z.string(),
  revoked_at: z.string().nullable()
});

const staffMemberSchema = z.object({
  userId: z.uuid(),
  role: z.enum(["owner", "assistant"]),
  email: emailSchema.nullable(),
  avatarSeed: z.string().nullable(),
  avatarStyle: z.string().nullable()
});

const staffSessionSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  email: emailSchema.nullable(),
  lastActiveAt: z.string(),
  revokedAt: z.string().nullable(),
  isCurrent: z.boolean()
});

const staffDirectorySchema = z.object({
  members: z.array(staffMemberSchema),
  sessions: z.array(staffSessionSchema)
});

type InviteBody = z.infer<typeof inviteBodySchema>;
type MemberRow = z.infer<typeof memberRowSchema>;
type SessionRow = z.infer<typeof sessionRowSchema>;
type StaffMember = z.infer<typeof staffMemberSchema>;
type StaffSession = z.infer<typeof staffSessionSchema>;

export {
  apiErrorSchema,
  inviteBodySchema,
  inviteOkSchema,
  memberRowSchema,
  memberUserSchema,
  sessionBodySchema,
  sessionRowSchema,
  staffDirectorySchema,
  staffMemberSchema,
  staffSessionSchema
};
export type { InviteBody, MemberRow, SessionRow, StaffMember, StaffSession };
