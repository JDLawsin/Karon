import { emailSchema } from "@/features/auth/auth-schemas";

const emailByUserId = (
  users: ReadonlyArray<{ id: string; email?: string | null }>
): Record<string, string> => {
  const emails: Record<string, string> = {};

  for (const user of users) {
    const parsed = emailSchema.safeParse(user.email);

    if (parsed.success) {
      emails[user.id] = parsed.data;
    }
  }

  return emails;
};

const staffMemberLabel = (role: "owner" | "assistant", email: string | null) =>
  email ? `${role} · ${email}` : role;

const formatDeviceTime = (iso: string) => {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
};

const deviceLabel = (
  revokedAt: string | null,
  email: string | null,
  lastActiveAt: string
) => {
  const status = revokedAt ? "Revoked" : "Active";
  const used = formatDeviceTime(lastActiveAt);
  const parts = [status];

  if (email) {
    parts.push(email);
  }

  if (used) {
    parts.push(`last used ${used}`);
  }

  return parts.join(" · ");
};

export { deviceLabel, emailByUserId, staffMemberLabel };
