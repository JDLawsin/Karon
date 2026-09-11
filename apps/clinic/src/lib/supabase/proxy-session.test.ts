import { describe, expect, it } from "vitest";

import { shouldSkipLoginRedirect } from "./proxy-session";

describe("shouldSkipLoginRedirect", () => {
  it("lets unauthenticated API routes reach the handler", () => {
    expect(shouldSkipLoginRedirect("/api/members")).toBe(true);
    expect(shouldSkipLoginRedirect("/api/auth/device-trust")).toBe(true);
  });

  it("still sends clinic pages to login", () => {
    expect(shouldSkipLoginRedirect("/today")).toBe(false);
    expect(shouldSkipLoginRedirect("/owner/clinic")).toBe(false);
  });

  it("keeps public auth pages reachable", () => {
    expect(shouldSkipLoginRedirect("/login")).toBe(true);
    expect(shouldSkipLoginRedirect("/auth/callback")).toBe(true);
  });
});
