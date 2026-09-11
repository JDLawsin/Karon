import type { ClinicRole } from "@/features/auth/resolve-auth-destination";

const INVITE_LIMIT = 10;
const INVITE_WINDOW_MS = 10 * 60 * 1000;

type OwnerActionInput = {
  userId: string | null;
  aal: string | null;
  role: ClinicRole | null;
  mfaOk?: boolean;
};

type OwnerActionResult =
  | { ok: true; status: 200 }
  | { ok: false; status: 401 | 403 };

const authorizeOwnerAction = ({
  userId,
  aal,
  role,
  mfaOk
}: OwnerActionInput): OwnerActionResult => {
  if (!userId) {
    return { ok: false, status: 401 };
  }

  if (role !== "owner" || !(mfaOk ?? aal === "aal2")) {
    return { ok: false, status: 403 };
  }

  return { ok: true, status: 200 };
};

const isInviteRateLimited = (recentCount: number) => recentCount >= INVITE_LIMIT;

export { INVITE_LIMIT, INVITE_WINDOW_MS, authorizeOwnerAction, isInviteRateLimited };
