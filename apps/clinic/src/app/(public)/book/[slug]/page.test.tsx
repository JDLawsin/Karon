import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const loadPublicBooking = vi.hoisted(() => vi.fn());

vi.mock("@/features/booking/public-booking", () => ({
  loadPublicBooking,
  toPublicBookingPayload: (page: unknown) => page
}));

vi.mock("@/features/booking/public-booking-page", () => ({
  default: () => <main>Booking form</main>
}));

import BookPage, { generateMetadata } from "./page";

const page = {
  clinicName: "Happy Teeth",
  locale: "en-PH",
  timezone: "Asia/Manila",
  hours: { days: [1, 2, 3, 4, 5], open: "09:00", close: "17:00" },
  hoursLabel: "Mon–Fri, 9:00 AM – 5:00 PM",
  phone: "09171234567",
  address: "123 Osmena Blvd, Cebu City",
  addressData: {
    streetAddress: "123 Osmena Blvd",
    addressLocality: "Cebu City",
    addressRegion: "Cebu",
    addressCountry: "PH"
  },
  logoUrl: "https://storage.example/logo.png?token=signed&expires=tomorrow",
  services: [{ id: "service-1", name: "Cleaning" }],
  dates: [],
  date: null,
  slots: [],
  indexable: true
};

const props = (query: Record<string, string> = {}) => ({
  params: Promise.resolve({ slug: "happytee1" }),
  searchParams: Promise.resolve(query)
});

describe("public booking indexing metadata", () => {
  beforeEach(() => {
    process.env.SITE_URL = "https://clinic.example";
    loadPublicBooking.mockResolvedValue({ ok: true, page });
  });

  it("indexes only the canonical complete page with local Dentist metadata", async () => {
    const metadata = await generateMetadata(props());

    expect(metadata.title).toEqual({
      absolute: "Happy Teeth, Dentist in Cebu City | Book online"
    });
    expect(metadata.robots).toEqual({ index: true, follow: true });
    expect(metadata.alternates?.canonical?.toString()).toBe(
      "https://clinic.example/book/happytee1"
    );

    const { container } = render(await BookPage(props()));
    expect(screen.getByText("Booking form")).toBeTruthy();
    const json = container.querySelector('script[type="application/ld+json"]')
      ?.textContent ?? "";
    expect(json).toContain('"addressLocality":"Cebu City"');
    expect(json).not.toContain("token=");
    expect(json).not.toContain("expires=");
  });

  it("keeps query variants out of the index with the base canonical", async () => {
    const metadata = await generateMetadata(props({ date: "2026-10-03" }));

    expect(metadata.title).toEqual({ absolute: "Happy Teeth | Book a visit" });
    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(metadata.alternates?.canonical?.toString()).toBe(
      "https://clinic.example/book/happytee1"
    );
  });
});
