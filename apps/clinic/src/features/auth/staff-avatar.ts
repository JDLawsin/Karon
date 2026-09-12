import { createAvatar } from "@dicebear/core";
import * as notionistsNeutral from "@dicebear/notionists-neutral";

import type { ClinicRole } from "@/features/auth/resolve-auth-destination";

const STAFF_AVATAR_COLORS = ["2563eb", "1d4ed8", "0f766e", "059669"];

const staffAvatarDataUri = (userId: string) =>
  createAvatar(notionistsNeutral, {
    seed: userId,
    size: 64,
    backgroundColor: STAFF_AVATAR_COLORS,
    radius: 50
  }).toDataUri();

const staffAvatarFallback = (role: ClinicRole) => (role === "owner" ? "O" : "A");

const staffRoleLabel = (role: ClinicRole) =>
  role === "owner" ? "Owner" : "Assistant";

export { staffAvatarDataUri, staffAvatarFallback, staffRoleLabel };
