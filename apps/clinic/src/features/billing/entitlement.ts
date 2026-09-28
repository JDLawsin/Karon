import { z } from "zod";

const entitlementRowSchema = z.object({
  status: z.enum(["trialing", "active", "past_due", "expired"]),
  source: z.enum(["trial", "manual", "paymongo"]),
  starts_at: z.iso.datetime({ offset: true }),
  ends_at: z.iso.datetime({ offset: true }).nullable(),
  days_remaining: z.number().int().nonnegative().nullable(),
  has_access: z.boolean()
});

type Entitlement = {
  status: z.infer<typeof entitlementRowSchema>["status"];
  source: z.infer<typeof entitlementRowSchema>["source"];
  startsAt: string;
  endsAt: string | null;
  daysRemaining: number | null;
  hasAccess: boolean;
};

const parseEntitlement = (row: unknown): Entitlement | null => {
  const parsed = entitlementRowSchema.safeParse(row);

  if (!parsed.success) {
    return null;
  }

  return {
    status: parsed.data.status,
    source: parsed.data.source,
    startsAt: parsed.data.starts_at,
    endsAt: parsed.data.ends_at,
    daysRemaining: parsed.data.days_remaining,
    hasAccess: parsed.data.has_access
  };
};

export { entitlementRowSchema, parseEntitlement };
export type { Entitlement };
