import { describe, expect, it } from "vitest";

import { isBookingPagePath, shouldSkipLoginRedirect } from "./proxy-session";

describe("shouldSkipLoginRedirect", () => {
  it("lets unauthenticated API routes reach the handler", () => {
    expect(shouldSkipLoginRedirect("/api/members")).toBe(true);
    expect(shouldSkipLoginRedirect("/api/auth/device-trust")).toBe(true);
  });

  it("still sends clinic pages to login", () => {
    expect(shouldSkipLoginRedirect("/today")).toBe(false);
    expect(shouldSkipLoginRedirect("/settings")).toBe(false);
  });

  it("keeps public auth pages reachable", () => {
    expect(shouldSkipLoginRedirect("/login")).toBe(true);
    expect(shouldSkipLoginRedirect("/auth/callback")).toBe(true);
    expect(shouldSkipLoginRedirect("/book/abc123xyz")).toBe(true);
  });
});

describe("isBookingPagePath", () => {
  it("exempts only a booking slug from the app-wide robots header", () => {
    expect(isBookingPagePath("/book/happytee1")).toBe(true);
    expect(isBookingPagePath("/book/happytee1/")).toBe(true);
    expect(isBookingPagePath("/book/unknown.slug")).toBe(true);
    expect(isBookingPagePath("/book/happytee1/privacy")).toBe(false);
    expect(isBookingPagePath("/book/sitemap.xml")).toBe(false);
    expect(isBookingPagePath("/today")).toBe(false);
  });
});
