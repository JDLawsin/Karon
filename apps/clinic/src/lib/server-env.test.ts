import { afterEach, describe, expect, it } from "vitest";

import { clinicAppOrigin, clinicAppUrl } from "./server-env";

const keys = ["SITE_URL", "NODE_ENV"] as const;

const snapshot = Object.fromEntries(keys.map((key) => [key, process.env[key]]));

afterEach(() => {
  for (const key of keys) {
    const value = snapshot[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});

describe("clinicAppOrigin", () => {
  it("pins invite redirects to SITE_URL without a trailing slash", () => {
    process.env.SITE_URL = "https://clinic.example/";
    expect(clinicAppOrigin()).toBe("https://clinic.example");
  });

  it("falls back to localhost outside production", () => {
    delete process.env.SITE_URL;
    process.env.NODE_ENV = "test";
    expect(clinicAppOrigin()).toBe("http://localhost:3000");
  });

  it("fails closed in production without SITE_URL", () => {
    delete process.env.SITE_URL;
    process.env.NODE_ENV = "production";
    expect(() => clinicAppOrigin()).toThrow(/SITE_URL/);
  });
});

describe("clinicAppUrl", () => {
  it("builds Locations from SITE_URL, not a request host", () => {
    process.env.SITE_URL = "https://clinic.example/";
    const next = clinicAppUrl("/login");
    expect(next.href).toBe("https://clinic.example/login");
    expect(next.search).toBe("");
  });
});
