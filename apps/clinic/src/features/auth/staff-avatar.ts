import { createAvatar, type Style } from "@dicebear/core";
import * as adventurer from "@dicebear/adventurer";
import * as avataaars from "@dicebear/avataaars";
import * as bigSmile from "@dicebear/big-smile";
import * as botttsNeutral from "@dicebear/bottts-neutral";
import * as funEmoji from "@dicebear/fun-emoji";
import * as lorelei from "@dicebear/lorelei";
import * as micah from "@dicebear/micah";
import * as notionists from "@dicebear/notionists";
import * as notionistsNeutral from "@dicebear/notionists-neutral";
import * as openPeeps from "@dicebear/open-peeps";
import * as pixelArt from "@dicebear/pixel-art";
import * as thumbs from "@dicebear/thumbs";
import { z } from "zod";

import type { ClinicRole } from "@/features/auth/resolve-auth-destination";

const STAFF_AVATAR_COLORS = ["2563eb", "1d4ed8", "0f766e", "059669"];

const STAFF_AVATAR_STYLE_IDS = [
  "notionists-neutral",
  "notionists",
  "lorelei",
  "avataaars",
  "micah",
  "open-peeps",
  "adventurer",
  "big-smile",
  "bottts-neutral",
  "thumbs",
  "fun-emoji",
  "pixel-art"
] as const;

type StaffAvatarStyleId = (typeof STAFF_AVATAR_STYLE_IDS)[number];

const DEFAULT_STAFF_AVATAR_STYLE: StaffAvatarStyleId = "notionists-neutral";

const STAFF_AVATAR_STYLES: Record<
  StaffAvatarStyleId,
  { label: string; style: Style<Record<string, unknown>> }
> = {
  "notionists-neutral": {
    label: "Neutral",
    style: notionistsNeutral
  },
  notionists: {
    label: "Notionists",
    style: notionists
  },
  lorelei: {
    label: "Lorelei",
    style: lorelei
  },
  avataaars: {
    label: "Avataaars",
    style: avataaars
  },
  micah: {
    label: "Micah",
    style: micah
  },
  "open-peeps": {
    label: "Peeps",
    style: openPeeps
  },
  adventurer: {
    label: "Adventurer",
    style: adventurer
  },
  "big-smile": {
    label: "Smile",
    style: bigSmile
  },
  "bottts-neutral": {
    label: "Bottts",
    style: botttsNeutral
  },
  thumbs: {
    label: "Thumbs",
    style: thumbs
  },
  "fun-emoji": {
    label: "Emoji",
    style: funEmoji
  },
  "pixel-art": {
    label: "Pixel",
    style: pixelArt
  }
};

const STAFF_AVATAR_ROUNDED_STYLE_IDS = new Set<StaffAvatarStyleId>([
  "notionists-neutral",
  "notionists",
  "bottts-neutral"
]);

const STAFF_AVATAR_PRESETS = [
  "avery",
  "blake",
  "casey",
  "cameron",
  "dakota",
  "dylan",
  "emery",
  "finley",
  "harper",
  "jordan",
  "logan",
  "morgan",
  "parker",
  "quinn",
  "reese",
  "riley",
  "rowan",
  "sage",
  "skyler",
  "taylor"
] as const;

const staffAvatarSeedSchema = z.string().trim().min(1).max(128);

const staffAvatarStyleSchema = z.enum(STAFF_AVATAR_STYLE_IDS);

const resolveStaffAvatarSeed = (userId: string, savedSeed?: string | null) => {
  const parsed = savedSeed ? staffAvatarSeedSchema.safeParse(savedSeed) : null;

  return parsed?.success ? parsed.data : userId;
};

const resolveStaffAvatarStyle = (
  savedStyle?: string | null
): StaffAvatarStyleId => {
  const parsed = savedStyle
    ? staffAvatarStyleSchema.safeParse(savedStyle)
    : null;

  return parsed?.success ? parsed.data : DEFAULT_STAFF_AVATAR_STYLE;
};

const staffAvatarDataUri = (
  seed: string,
  styleId: StaffAvatarStyleId = DEFAULT_STAFF_AVATAR_STYLE
) => {
  const { style } = STAFF_AVATAR_STYLES[styleId];
  const options: Record<string, unknown> = { seed, size: 64 };

  if (STAFF_AVATAR_ROUNDED_STYLE_IDS.has(styleId)) {
    options.backgroundColor = STAFF_AVATAR_COLORS;
    options.radius = 50;
  }

  return createAvatar(style, options).toDataUri();
};

const staffAvatarFallback = (role: ClinicRole) => (role === "owner" ? "O" : "A");

const staffRoleLabel = (role: ClinicRole) =>
  role === "owner" ? "Owner" : "Assistant";

export {
  DEFAULT_STAFF_AVATAR_STYLE,
  STAFF_AVATAR_PRESETS,
  STAFF_AVATAR_STYLE_IDS,
  STAFF_AVATAR_STYLES,
  resolveStaffAvatarSeed,
  resolveStaffAvatarStyle,
  staffAvatarDataUri,
  staffAvatarFallback,
  staffAvatarSeedSchema,
  staffAvatarStyleSchema,
  staffRoleLabel
};
export type { StaffAvatarStyleId };
