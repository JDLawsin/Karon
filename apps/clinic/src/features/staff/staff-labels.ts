import { emailSchema } from "@/features/auth/auth-schemas";
import { DEFAULT_CLINIC_REGIONAL_SETTINGS } from "@/lib/clinic/regional-settings";

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

const formatDeviceTime = (
  iso: string,
  locale: string = DEFAULT_CLINIC_REGIONAL_SETTINGS.locale,
  timezone: string = DEFAULT_CLINIC_REGIONAL_SETTINGS.timezone
) => {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone
  }).format(date);
};

const ACTIVE_DEVICE_LIMIT = 5;

const deviceLabel = (
  revokedAt: string | null,
  email: string | null,
  lastActiveAt: string,
  isCurrent = false,
  locale: string = DEFAULT_CLINIC_REGIONAL_SETTINGS.locale,
  timezone: string = DEFAULT_CLINIC_REGIONAL_SETTINGS.timezone
) => {
  const status = revokedAt ? "Revoked" : isCurrent ? "This device" : "Active";
  const used = formatDeviceTime(lastActiveAt, locale, timezone);
  const parts = [status];

  if (email) {
    parts.push(email);
  }

  if (used) {
    parts.push(`last used ${used}`);
  }

  return parts.join(" · ");
};

const visibleDeviceSessions = <T extends { revokedAt: string | null }>(
  sessions: readonly T[]
) =>
  sessions
    .filter((session) => session.revokedAt === null)
    .slice(0, ACTIVE_DEVICE_LIMIT);

export { deviceLabel, emailByUserId, staffMemberLabel, visibleDeviceSessions };
