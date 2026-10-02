import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getLimited: vi.fn(),
  postLimited: vi.fn(),
  load: vi.fn(),
  submit: vi.fn()
}));

vi.mock("@/features/booking/booking-rate-limit", () => ({
  bookingClientKey: () => "203.0.113.9",
  isPublicBookingGetLimited: mocks.getLimited,
  isPublicBookingPostLimited: mocks.postLimited
}));

vi.mock("@/features/booking/public-booking", () => ({
  loadPublicBooking: mocks.load,
  submitPublicBooking: mocks.submit,
  toPublicBookingPayload: (page: unknown) => page
}));

import { GET, POST } from "./route";

const context = { params: Promise.resolve({ slug: "happytee1" }) };

describe("public booking rate limiter failures", () => {
  it.each([
    ["GET", GET, mocks.getLimited, mocks.load],
    ["POST", POST, mocks.postLimited, mocks.submit]
  ] as const)("fails %s closed before booking data is touched", async (
    _method,
    handler,
    limiter,
    bookingAction
  ) => {
    limiter.mockRejectedValueOnce(new Error("database unavailable"));
    const request = new Request("https://clinic.example/api/book/happytee1", {
      method: _method,
      body: _method === "POST" ? "{}" : undefined
    });

    const response = await handler(request, context);

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "Booking is temporarily unavailable. Try again in a few minutes."
    });
    expect(bookingAction).not.toHaveBeenCalled();
  });
});
