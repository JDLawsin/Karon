import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/browser", () => ({
  createBrowserSupabase: () => ({
    from: (table: string) => ({
      select: () => ({
        eq: () =>
          table === "clinics"
            ? {
                maybeSingle: async () => ({
                  data: {
                    auto_confirm_bookings: true,
                    booking_page_indexable: false,
                    name: "Happy Teeth",
                    phone: "09171234567",
                    address: { city: "Cebu City" },
                    hours: {
                      days: [1, 2, 3, 4, 5],
                      open: "09:00",
                      close: "17:00"
                    }
                  }
                })
              }
            : Promise.resolve({ count: 1 })
      })
    })
  })
}));

import { ClinicSessionProvider } from "@/lib/auth/clinic-session";

import ClinicBookingSettings from "./clinic-booking-settings";

describe("ClinicBookingSettings", () => {
  it("shows assistants search visibility without owner-only booking controls", async () => {
    render(
      <ClinicSessionProvider
        membership={{
          tenantId: "11111111-1111-4111-8111-111111111111",
          role: "assistant"
        }}
        userId="22222222-2222-4222-8222-222222222222"
      >
        <ClinicBookingSettings />
      </ClinicSessionProvider>
    );

    expect(
      await screen.findByRole("switch", { name: "Let Google show your booking page" })
    ).toHaveAttribute("aria-disabled", "true");
    expect(screen.queryByRole("switch", { name: "Auto-confirm bookings" })).toBeNull();
    expect(screen.getByText("Only the Owner can change this.")).toBeVisible();
  });
});
