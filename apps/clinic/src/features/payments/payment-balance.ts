import { z } from "zod";

const visitBalanceRowSchema = z
  .object({
    quote_id: z.string().uuid(),
    quote_total_minor: z.number().int().nonnegative(),
    paid_minor: z.number().int().nonnegative(),
    remaining_minor: z.number().int().nonnegative(),
    currency: z.string().regex(/^[A-Z]{3}$/)
  })
  .strict();

type CollectBalance = {
  quoteId: string;
  quoteTotalMinor: number;
  paidMinor: number;
  remainingMinor: number;
  currency: string;
};

const parseCollectBalance = (value: unknown): CollectBalance => {
  const row = visitBalanceRowSchema.parse(value);

  return {
    quoteId: row.quote_id,
    quoteTotalMinor: row.quote_total_minor,
    paidMinor: row.paid_minor,
    remainingMinor: row.remaining_minor,
    currency: row.currency
  };
};

export { parseCollectBalance };
export type { CollectBalance };
