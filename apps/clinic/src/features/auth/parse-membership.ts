import { z } from "zod";

import type { Membership } from "@/features/auth/resolve-auth-destination";

const membershipRowSchema = z.object({
  tenant_id: z.uuid(),
  role: z.enum(["owner", "assistant"])
});

const authClaimsSchema = z.object({
  sub: z.uuid(),
  aal: z.string().optional(),
  amr: z.unknown().optional()
});

const parseMembership = (row: unknown): Membership | null => {
  const parsed = membershipRowSchema.safeParse(row);

  if (!parsed.success) {
    return null;
  }

  return { tenantId: parsed.data.tenant_id, role: parsed.data.role };
};

const amrMethod = (entry: unknown) => {
  if (typeof entry === "string") {
    return entry;
  }

  if (
    entry &&
    typeof entry === "object" &&
    "method" in entry &&
    typeof entry.method === "string"
  ) {
    return entry.method;
  }

  return null;
};

const parseAuthClaims = (claims: unknown) => {
  const parsed = authClaimsSchema.safeParse(claims);

  if (!parsed.success) {
    return { userId: null, aal: null, passwordRecovery: false };
  }

  const amr = parsed.data.amr;

  return {
    userId: parsed.data.sub,
    aal: parsed.data.aal ?? null,
    passwordRecovery:
      Array.isArray(amr) && amr.some((entry) => amrMethod(entry) === "recovery")
  };
};

export { membershipRowSchema, parseAuthClaims, parseMembership };
