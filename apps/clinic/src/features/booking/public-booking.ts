import "server-only";

import { createAdminSupabase } from "@/lib/supabase/admin";

import {
  bookingLinkRowSchema,
  bookingSlugSchema,
  clinicBookingRowSchema,
  publicBookingSubmitSchema
} from "./booking-schemas";
import {
  bookableDates,
  bookingSlotsForDate,
  clinicHoursOf,
  clinicServicesOf,
  offeredBookingSlot
} from "./booking-slots";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

type PublicBookingPage = {
  clinicName: string;
  timezone: string;
  hours: { days: number[]; open: string; close: string };
  services: { id: string; name: string }[];
  dates: string[];
  date: string | null;
  slots: { clock: string; startsAt: string; label: string }[];
};

const occupiedStarts = async (
  admin: ReturnType<typeof createAdminSupabase>,
  linkId: string
) => {
  // ponytail: occupancy is pending+accepted requests on this link only; walk-ins on the huddle can still collide
  const { data } = await admin
    .from("booking_requests")
    .select("starts_at")
    .eq("link_id", linkId)
    .in("status", ["pending", "accepted"]);

  return (data ?? []).flatMap((row) =>
    typeof row.starts_at === "string" ? [row.starts_at] : []
  );
};

const readLink = async (
  admin: ReturnType<typeof createAdminSupabase>,
  slug: string
) => {
  const { data } = await admin
    .from("booking_links")
    .select("id, tenant_id")
    .eq("slug", slug)
    .maybeSingle();

  return bookingLinkRowSchema.safeParse(data);
};

const loadPublicBooking = async (
  rawSlug: string,
  rawDate: string | null,
  now = new Date()
): Promise<{ ok: true; page: PublicBookingPage } | { ok: false; status: 404 }> => {
  const slug = bookingSlugSchema.safeParse(rawSlug);

  if (!slug.success) {
    return { ok: false, status: 404 };
  }

  const admin = createAdminSupabase();
  const link = await readLink(admin, slug.data);

  if (!link.success) {
    return { ok: false, status: 404 };
  }

  const { data: clinicRow } = await admin
    .from("clinics")
    .select("name, timezone, hours, services")
    .eq("id", link.data.tenant_id)
    .maybeSingle();
  const clinic = clinicBookingRowSchema.safeParse(clinicRow);
  const hours = clinic.success ? clinicHoursOf(clinic.data.hours) : null;
  const timezone = clinic.success
    ? clinic.data.timezone?.trim() || "Asia/Manila"
    : "Asia/Manila";

  if (!clinic.success || !hours) {
    return { ok: false, status: 404 };
  }

  const dates = bookableDates(hours, timezone, now);
  const date =
    rawDate && DATE.test(rawDate) && dates.includes(rawDate) ? rawDate : (dates[0] ?? null);
  const occupied = await occupiedStarts(admin, link.data.id);
  const slots = date
    ? bookingSlotsForDate({
        date,
        hours,
        timeZone: timezone,
        occupied,
        now
      })
    : [];

  return {
    ok: true,
    page: {
      clinicName: clinic.data.name,
      timezone,
      hours,
      services: clinicServicesOf(clinic.data.services),
      dates,
      date,
      slots
    }
  };
};

const submitPublicBooking = async (
  rawSlug: string,
  body: unknown,
  now = new Date()
): Promise<{ ok: true } | { ok: false; status: 400 | 404 | 409; error: string }> => {
  const slug = bookingSlugSchema.safeParse(rawSlug);
  const parsed = publicBookingSubmitSchema.safeParse(body);

  if (!slug.success || !parsed.success) {
    return { ok: false, status: 400, error: "Check the booking details and try again." };
  }

  const loaded = await loadPublicBooking(slug.data, null, now);

  if (!loaded.ok) {
    return { ok: false, status: 404, error: "This booking link is not available." };
  }

  const startsAt = new Date(parsed.data.startsAt);
  const admin = createAdminSupabase();
  const link = await readLink(admin, slug.data);

  if (!link.success) {
    return { ok: false, status: 404, error: "This booking link is not available." };
  }

  const occupied = await occupiedStarts(admin, link.data.id);
  const slot = offeredBookingSlot({
    startsAt,
    hours: loaded.page.hours,
    timeZone: loaded.page.timezone,
    occupied,
    now
  });
  const service = loaded.page.services.find((row) => row.id === parsed.data.serviceId);

  if (!slot || !service) {
    return { ok: false, status: 409, error: "That time is no longer available." };
  }

  const { error } = await admin.from("booking_requests").insert({
    tenant_id: link.data.tenant_id,
    link_id: link.data.id,
    name: parsed.data.name,
    mobile: parsed.data.mobile,
    service_id: service.id,
    service_name: service.name,
    note: parsed.data.note ?? null,
    starts_at: slot.startsAt,
    status: "pending"
  });

  if (error) {
    return { ok: false, status: 409, error: "That time is no longer available." };
  }

  return { ok: true };
};

export { loadPublicBooking, submitPublicBooking };
export type { PublicBookingPage };
