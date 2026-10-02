import "server-only";

import { unstable_noStore as noStore } from "next/cache";
import { cache } from "react";

import { clinicLogoPreviewUrl } from "@/features/auth/clinic-logo";
import { log } from "@/lib/logger/server";
import { DEFAULT_CLINIC_REGIONAL_SETTINGS } from "@/lib/clinic/regional-settings";
import { createAdminSupabase } from "@/lib/supabase/admin";
import {
  clinicCityOf,
  isBookingPageComplete
} from "./booking-indexing";
import {
  clinicEventRowSchema,
  toClinicEvent
} from "@/lib/sync/event-schema";

import {
  clinicPhoneOf,
  formatClinicAddress,
  formatClinicHours
} from "./booking-clinic-display";
import {
  bookableServicesOf,
  bookingIdempotencyKeySchema,
  bookingLinkRowSchema,
  bookingReplayMatches,
  bookingReplayRowSchema,
  bookingSitemapLinkRowSchema,
  bookingSlugSchema,
  bookingTurnstileTokenOf,
  clinicBookingRowSchema,
  indexableClinicRowSchema,
  isBookingHoneypotFilled,
  publicBookingSubmitSchema
} from "./booking-schemas";
import {
  bookableDates,
  bookingSlotsForDate,
  clinicHoursOf,
  occupiedVisitStarts,
  offeredBookingSlot
} from "./booking-slots";
import { verifyTurnstileToken } from "./booking-turnstile";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const SEND_FAILED = "Could not send that booking.";
const SLOT_TAKEN = "That time is no longer available.";
const LINK_MISSING = "This booking link is not available.";

const LOGO_SIGNED_SECONDS = 60 * 60 * 24;

type PublicBookingPage = {
  clinicName: string;
  locale: string;
  timezone: string;
  hours: { days: number[]; open: string; close: string };
  hoursLabel: string;
  phone: string | null;
  address: string | null;
  addressData: {
    streetAddress?: string;
    addressLocality: string;
    addressRegion?: string;
    postalCode?: string;
    addressCountry: string;
  } | null;
  logoUrl: string | null;
  services: { id: string; name: string }[];
  dates: string[];
  date: string | null;
  slots: { clock: string; startsAt: string; label: string }[];
  indexable: boolean;
};

type SubmitPublicBookingOptions = {
  now?: Date;
  idempotencyKey?: string | null;
  remoteIp?: string;
};

const toPublicBookingPayload = (page: PublicBookingPage) => ({
  clinicName: page.clinicName,
  locale: page.locale,
  timezone: page.timezone,
  hoursLabel: page.hoursLabel,
  phone: page.phone,
  address: page.address,
  logoUrl: page.logoUrl,
  services: page.services,
  dates: page.dates,
  date: page.date,
  slots: page.slots
});

const structuredAddressOf = (address: unknown, region: string) => {
  const city = clinicCityOf(address);

  if (!city || !address || typeof address !== "object") {
    return null;
  }

  const row = address as Record<string, unknown>;
  const text = (key: string) => {
    const value = row[key];
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
  };
  const streetAddress = [text("line1"), text("barangay")].filter(Boolean).join(", ");

  return {
    ...(streetAddress ? { streetAddress } : {}),
    addressLocality: city,
    ...(text("province") ? { addressRegion: text("province") } : {}),
    ...(text("postalCode") ? { postalCode: text("postalCode") } : {}),
    addressCountry: region.trim().toUpperCase()
  };
};

const occupiedStarts = async (
  admin: ReturnType<typeof createAdminSupabase>,
  tenantId: string
) => {
  // ponytail: visit fold is advisory; unique (tenant_id, starts_at) is the public-vs-public race.
  // Walk-in vs public in the same second can still collide until a schedule_blocks table exists.
  const [{ data: requests }, eventsResult] = await Promise.all([
    admin
      .from("booking_requests")
      .select("starts_at")
      .eq("tenant_id", tenantId)
      .in("status", ["pending", "accepted"]),
    admin
      .from("clinic_events")
      .select(
        "id, tenant_id, actor_user_id, event_type, record_id, payload, occurred_at, received_at"
      )
      .eq("tenant_id", tenantId)
      .in("event_type", ["appointment.set", "visit.status_changed"])
  ]);

  if (eventsResult.error) {
    log.withMetadata({ code: "BOOKING_OCCUPANCY_EVENTS" }).warn(
      "booking.occupancy_events_failed"
    );
  }

  const requestStarts = (requests ?? []).flatMap((row) =>
    typeof row.starts_at === "string" ? [row.starts_at] : []
  );
  const events = (eventsResult.data ?? []).flatMap((row) => {
    const parsed = clinicEventRowSchema.safeParse(row);

    return parsed.success ? [toClinicEvent(parsed.data)] : [];
  });

  return [...requestStarts, ...occupiedVisitStarts(events)];
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

const loadPublicBookingPage = async (
  rawSlug: string,
  rawDate: string | null,
  now = new Date()
): Promise<{ ok: true; page: PublicBookingPage } | { ok: false; status: 404 }> => {
  noStore();
  const slug = bookingSlugSchema.safeParse(rawSlug);

  if (!slug.success) {
    return { ok: false, status: 404 };
  }

  const admin = createAdminSupabase();
  const link = await readLink(admin, slug.data);

  if (!link.success) {
    return { ok: false, status: 404 };
  }

  const [{ data: clinicRow }, { data: serviceRows }] = await Promise.all([
    admin
      .from("clinics")
      .select(
        "name, locale, timezone, hours, phone, address, logo_path, region, booking_page_indexable"
      )
      .eq("id", link.data.tenant_id)
      .maybeSingle(),
    admin
      .from("clinic_services")
      .select("id, name")
      .eq("tenant_id", link.data.tenant_id)
      .order("name")
  ]);
  const clinic = clinicBookingRowSchema.safeParse(clinicRow);
  const hours = clinic.success ? clinicHoursOf(clinic.data.hours) : null;
  const timezone = clinic.success
    ? clinic.data.timezone?.trim() || DEFAULT_CLINIC_REGIONAL_SETTINGS.timezone
    : DEFAULT_CLINIC_REGIONAL_SETTINGS.timezone;
  const locale = clinic.success
    ? clinic.data.locale
    : DEFAULT_CLINIC_REGIONAL_SETTINGS.locale;

  if (!clinic.success || !hours) {
    return { ok: false, status: 404 };
  }

  const dates = bookableDates(hours, timezone, now);
  const date =
    rawDate && DATE.test(rawDate) && dates.includes(rawDate) ? rawDate : (dates[0] ?? null);
  const address = formatClinicAddress(clinic.data.address);
  const services = bookableServicesOf(serviceRows);
  const [occupied, logoUrl] = await Promise.all([
    occupiedStarts(admin, link.data.tenant_id),
    clinicLogoPreviewUrl(admin, clinic.data.logo_path, LOGO_SIGNED_SECONDS)
  ]);
  const slots = date
    ? bookingSlotsForDate({
        date,
        hours,
        timeZone: timezone,
        locale,
        occupied,
        now
      })
    : [];

  return {
    ok: true,
    page: {
      clinicName: clinic.data.name.trim(),
      locale,
      timezone,
      hours,
      hoursLabel: formatClinicHours(hours, locale),
      phone: clinicPhoneOf(clinic.data.phone),
      address,
      addressData: structuredAddressOf(clinic.data.address, clinic.data.region),
      logoUrl,
      services,
      dates,
      date,
      slots,
      indexable:
        clinic.data.booking_page_indexable &&
        isBookingPageComplete(clinic.data, services.length)
    }
  };
};

const loadPublicBooking = cache(loadPublicBookingPage);

const loadIndexableBookingPages = async () => {
  noStore();
  const admin = createAdminSupabase();
  const [{ data: clinicRows }, { data: linkRows }, { data: serviceRows }] =
    await Promise.all([
      admin
        .from("clinics")
        .select(
          "id, name, locale, timezone, hours, phone, address, logo_path, region, booking_page_indexable, updated_at"
        )
        .eq("booking_page_indexable", true),
      admin.from("booking_links").select("tenant_id, slug"),
      admin.from("clinic_services").select("tenant_id")
    ]);
  const clinics = (clinicRows ?? []).flatMap((row) => {
    const parsed = indexableClinicRowSchema.safeParse(row);
    return parsed.success ? [parsed.data] : [];
  });
  const links = (linkRows ?? []).flatMap((row) => {
    const parsed = bookingSitemapLinkRowSchema.safeParse(row);
    return parsed.success ? [parsed.data] : [];
  });
  const serviceCounts = new Map<string, number>();

  for (const row of serviceRows ?? []) {
    if (row && typeof row.tenant_id === "string") {
      serviceCounts.set(row.tenant_id, (serviceCounts.get(row.tenant_id) ?? 0) + 1);
    }
  }

  return clinics.flatMap((clinic) => {
    if (!isBookingPageComplete(clinic, serviceCounts.get(clinic.id) ?? 0)) {
      return [];
    }

    return links
      .filter((link) => link.tenant_id === clinic.id)
      .map((link) => ({ slug: link.slug, updatedAt: clinic.updated_at }));
  });
};

const submitPublicBooking = async (
  rawSlug: string,
  body: unknown,
  options: SubmitPublicBookingOptions = {}
): Promise<{ ok: true } | { ok: false; status: 400 | 404 | 409; error: string }> => {
  if (isBookingHoneypotFilled(body)) {
    log
      .withMetadata({ code: "BOT_CHECK_FAILED", reason: "honeypot" })
      .warn("booking.bot_check_failed");

    return { ok: false, status: 400, error: SEND_FAILED };
  }

  const turnstileOk = await verifyTurnstileToken({
    token: bookingTurnstileTokenOf(body),
    remoteIp: options.remoteIp
  });

  if (!turnstileOk) {
    log
      .withMetadata({ code: "BOT_CHECK_FAILED", reason: "turnstile" })
      .warn("booking.bot_check_failed");

    return { ok: false, status: 400, error: SEND_FAILED };
  }

  const slug = bookingSlugSchema.safeParse(rawSlug);
  const parsed = publicBookingSubmitSchema.safeParse(body);
  const idempotencyKey = bookingIdempotencyKeySchema.safeParse(options.idempotencyKey);

  if (!slug.success || !idempotencyKey.success) {
    return { ok: false, status: 400, error: SEND_FAILED };
  }

  if (!parsed.success) {
    return { ok: false, status: 400, error: "Check the booking details and try again." };
  }

  const now = options.now ?? new Date();
  const loaded = await loadPublicBooking(slug.data, null, now);

  if (!loaded.ok) {
    return { ok: false, status: 404, error: LINK_MISSING };
  }

  const startsAt = new Date(parsed.data.startsAt);
  const admin = createAdminSupabase();
  const link = await readLink(admin, slug.data);

  if (!link.success) {
    return { ok: false, status: 404, error: LINK_MISSING };
  }

  const occupied = await occupiedStarts(admin, link.data.tenant_id);
  const slot = offeredBookingSlot({
    startsAt,
    hours: loaded.page.hours,
    timeZone: loaded.page.timezone,
    locale: loaded.page.locale,
    occupied,
    now
  });
  const service = loaded.page.services.find((row) => row.id === parsed.data.serviceId);

  if (!slot || !service) {
    return { ok: false, status: 409, error: SLOT_TAKEN };
  }

  const { error } = await admin.from("booking_requests").insert({
    tenant_id: link.data.tenant_id,
    link_id: link.data.id,
    name: parsed.data.name,
    mobile: parsed.data.mobile,
    service_id: service.id,
    service_name: service.name,
    note: parsed.data.note ?? null,
    privacy_notice_version: parsed.data.privacyNoticeVersion,
    privacy_acknowledged_at: now.toISOString(),
    starts_at: slot.startsAt,
    status: "pending",
    idempotency_key: idempotencyKey.data
  });

  if (!error) {
    return { ok: true };
  }

  if (error.code === "23505") {
    const { data: existing } = await admin
      .from("booking_requests")
      .select("id, starts_at, service_id, mobile, privacy_notice_version")
      .eq("tenant_id", link.data.tenant_id)
      .eq("idempotency_key", idempotencyKey.data)
      .maybeSingle();
    const replay = bookingReplayRowSchema.safeParse(existing);

    if (replay.success && bookingReplayMatches(replay.data, parsed.data)) {
      if (replay.data.privacy_notice_version !== parsed.data.privacyNoticeVersion) {
        const { error: acknowledgmentError } = await admin
          .from("booking_requests")
          .update({
            privacy_notice_version: parsed.data.privacyNoticeVersion,
            privacy_acknowledged_at: now.toISOString()
          })
          .eq("id", replay.data.id)
          .eq("tenant_id", link.data.tenant_id);

        if (acknowledgmentError) {
          return { ok: false, status: 409, error: SEND_FAILED };
        }
      }

      return { ok: true };
    }

    if (replay.success) {
      return { ok: false, status: 409, error: SEND_FAILED };
    }

    return { ok: false, status: 409, error: SLOT_TAKEN };
  }

  return { ok: false, status: 409, error: SLOT_TAKEN };
};

export {
  loadIndexableBookingPages,
  loadPublicBooking,
  submitPublicBooking,
  toPublicBookingPayload
};
export type { PublicBookingPage, SubmitPublicBookingOptions };
