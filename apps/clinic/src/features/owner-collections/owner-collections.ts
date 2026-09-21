import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

const collectionsDaySchema = z.iso.date().refine(
  (day) => day >= "2000-01-01",
  "Choose a date on or after 2000-01-01."
);

const minorAmountSchema = z
  .union([z.number(), z.string().regex(/^\d+$/)])
  .transform(Number)
  .refine(Number.isSafeInteger, "Amount is outside the supported range.")
  .pipe(z.number().int().nonnegative());

const collectionsReportRowSchema = z
  .object({
    day: collectionsDaySchema,
    clinic_today: collectionsDaySchema,
    timezone: z.string().min(1).max(64),
    currency: z.string().regex(/^[A-Z]{3}$/),
    payment_count: minorAmountSchema,
    paid_minor: minorAmountSchema,
    outstanding_minor: minorAmountSchema,
    cash_minor: minorAmountSchema,
    gcash_minor: minorAmountSchema,
    maya_minor: minorAmountSchema,
    card_minor: minorAmountSchema,
    other_minor: minorAmountSchema
  })
  .strict();

type CollectionsReport = {
  day: string;
  clinicToday: string;
  timezone: string;
  currency: string;
  paymentCount: number;
  paidMinor: number;
  outstandingMinor: number;
  methods: {
    cash: number;
    gcash: number;
    maya: number;
    card: number;
    other: number;
    unpaid: number;
  };
};

class CollectionsDayOutOfRangeError extends Error {}

const parseCollectionsDay = (value: unknown) => {
  const parsed = collectionsDaySchema.safeParse(value);
  return parsed.success ? parsed.data : null;
};

const parseCollectionsReport = (value: unknown): CollectionsReport => {
  const row = collectionsReportRowSchema.parse(value);

  return {
    day: row.day,
    clinicToday: row.clinic_today,
    timezone: row.timezone,
    currency: row.currency,
    paymentCount: row.payment_count,
    paidMinor: row.paid_minor,
    outstandingMinor: row.outstanding_minor,
    methods: {
      cash: row.cash_minor,
      gcash: row.gcash_minor,
      maya: row.maya_minor,
      card: row.card_minor,
      other: row.other_minor,
      unpaid: row.outstanding_minor
    }
  };
};

const getOwnerCollections = async (
  supabase: SupabaseClient,
  tenantId: string,
  day?: string | null
) => {
  const parsedDay = day ? collectionsDaySchema.parse(day) : null;
  const { data, error } = await supabase
    .rpc("get_owner_daily_collections", {
      p_tenant_id: tenantId,
      p_day: parsedDay
    })
    .single();

  if (error?.code === "22023") {
    throw new CollectionsDayOutOfRangeError("Collections day is out of range.");
  }

  if (error || !data) {
    throw new Error("Could not load collections.");
  }

  return parseCollectionsReport(data);
};

export {
  CollectionsDayOutOfRangeError,
  collectionsDaySchema,
  getOwnerCollections,
  parseCollectionsDay,
  parseCollectionsReport
};
export type { CollectionsReport };
