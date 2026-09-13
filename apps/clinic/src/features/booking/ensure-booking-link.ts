import "server-only";

import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

import { clinicAppUrl } from "@/lib/server-env";

import { bookingSlugSchema } from "./booking-schemas";

const newSlug = () => randomBytes(9).toString("base64url");

const bookingUrl = (slug: string) => clinicAppUrl(`/book/${slug}`).toString();

const ensureOwnerBookingLink = async (input: {
  supabase: SupabaseClient;
  tenantId: string;
  userId: string;
}) => {
  const read = async () => {
    const { data } = await input.supabase
      .from("booking_links")
      .select("slug")
      .eq("tenant_id", input.tenantId)
      .eq("user_id", input.userId)
      .maybeSingle();
    const parsed = bookingSlugSchema.safeParse(data?.slug);

    return parsed.success ? parsed.data : null;
  };

  const existing = await read();

  if (existing) {
    return { slug: existing, url: bookingUrl(existing) };
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const slug = newSlug();
    const { error } = await input.supabase.from("booking_links").insert({
      tenant_id: input.tenantId,
      user_id: input.userId,
      slug
    });

    if (!error) {
      return { slug, url: bookingUrl(slug) };
    }

    const retry = await read();

    if (retry) {
      return { slug: retry, url: bookingUrl(retry) };
    }
  }

  return null;
};

export { ensureOwnerBookingLink };
