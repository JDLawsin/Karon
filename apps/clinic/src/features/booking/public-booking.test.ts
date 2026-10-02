import { beforeEach, describe, expect, it, vi } from "vitest";

import { BOOKING_PRIVACY_NOTICE } from "@/features/privacy/privacy-policy";

const TENANT_ID = "11111111-1111-4111-8111-111111111111";
const LINK_ID = "22222222-2222-4222-8222-222222222222";
const SERVICE_ID = "33333333-3333-4333-8333-333333333333";
const REQUEST_ID = "44444444-4444-4444-8444-444444444444";
const IDEMPOTENCY_KEY = "55555555-5555-4555-8555-555555555555";
const NOW = new Date("2026-09-29T00:00:00.000Z");
const STARTS_AT = "2026-09-29T01:00:00.000Z";

const mocks = vi.hoisted(() => ({
  insertError: null as { code: string } | null,
  inserted: vi.fn(),
  replay: null as null | {
    id: string;
    starts_at: string;
    service_id: string;
    mobile: string;
    privacy_notice_version: string | null;
  },
  updated: vi.fn(),
  updateError: null as { code: string } | null
}));

const resolved = <T>(value: T) => Promise.resolve(value);

const bookingRequestsTable = () => ({
  insert: (value: unknown) => {
    mocks.inserted(value);
    return resolved({ error: mocks.insertError });
  },
  select: (columns: string) => {
    if (columns === "starts_at") {
      return {
        eq: () => ({ in: () => resolved({ data: [], error: null }) })
      };
    }

    return {
      eq: () => ({
        eq: () => ({
          maybeSingle: () => resolved({ data: mocks.replay, error: null })
        })
      })
    };
  },
  update: (value: unknown) => {
    mocks.updated(value);
    return {
      eq: (_column: string, id: string) => ({
        eq: (_tenantColumn: string, tenantId: string) => {
          mocks.updated({ id, tenantId });
          return resolved({ error: mocks.updateError });
        }
      })
    };
  }
});

const admin = {
  from: (table: string) => {
    if (table === "booking_links") {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () =>
              resolved({ data: { id: LINK_ID, tenant_id: TENANT_ID }, error: null })
          })
        })
      };
    }

    if (table === "clinics") {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () =>
              resolved({
                data: {
                  name: "Happy Teeth",
                  locale: "en-PH",
                  timezone: "Asia/Manila",
                  hours: { days: [0, 1, 2, 3, 4, 5, 6], open: "09:00", close: "17:00" },
                  phone: null,
                  address: null,
                  logo_path: null,
                  region: "ph",
                  booking_page_indexable: false
                },
                error: null
              })
          })
        })
      };
    }

    if (table === "clinic_services") {
      return {
        select: () => ({
          eq: () => ({
            order: () =>
              resolved({ data: [{ id: SERVICE_ID, name: "Cleaning" }], error: null })
          })
        })
      };
    }

    if (table === "clinic_events") {
      return {
        select: () => ({
          eq: () => ({ in: () => resolved({ data: [], error: null }) })
        })
      };
    }

    if (table === "booking_requests") {
      return bookingRequestsTable();
    }

    throw new Error(`Unexpected table: ${table}`);
  }
};

vi.mock("@/lib/supabase/admin", () => ({
  createAdminSupabase: () => admin
}));

vi.mock("@/features/auth/clinic-logo", () => ({
  clinicLogoPreviewUrl: () => resolved(null)
}));

vi.mock("./booking-turnstile", () => ({
  verifyTurnstileToken: () => resolved(true)
}));

import { submitPublicBooking } from "./public-booking";

const booking = {
  name: "Ana Cruz",
  mobile: "09171234567",
  startsAt: STARTS_AT,
  serviceId: SERVICE_ID,
  privacyNoticeVersion: BOOKING_PRIVACY_NOTICE.version
};

describe("submitPublicBooking privacy acknowledgment", () => {
  beforeEach(() => {
    mocks.insertError = null;
    mocks.replay = null;
    mocks.updateError = null;
    mocks.inserted.mockClear();
    mocks.updated.mockClear();
  });

  it("persists the accepted notice version and server receipt time", async () => {
    await expect(
      submitPublicBooking("happyteeth", booking, {
        idempotencyKey: IDEMPOTENCY_KEY,
        now: NOW
      })
    ).resolves.toEqual({ ok: true });

    expect(mocks.inserted).toHaveBeenCalledWith(
      expect.objectContaining({
        privacy_notice_version: BOOKING_PRIVACY_NOTICE.version,
        privacy_acknowledged_at: NOW.toISOString()
      })
    );
  });

  it("backfills acknowledgment on a matching legacy idempotent replay", async () => {
    mocks.insertError = { code: "23505" };
    mocks.replay = {
      id: REQUEST_ID,
      starts_at: STARTS_AT,
      service_id: SERVICE_ID,
      mobile: booking.mobile,
      privacy_notice_version: null
    };

    await expect(
      submitPublicBooking("happyteeth", booking, {
        idempotencyKey: IDEMPOTENCY_KEY,
        now: NOW
      })
    ).resolves.toEqual({ ok: true });

    expect(mocks.updated).toHaveBeenNthCalledWith(1, {
      privacy_notice_version: BOOKING_PRIVACY_NOTICE.version,
      privacy_acknowledged_at: NOW.toISOString()
    });
    expect(mocks.updated).toHaveBeenNthCalledWith(2, {
      id: REQUEST_ID,
      tenantId: TENANT_ID
    });
  });
});
