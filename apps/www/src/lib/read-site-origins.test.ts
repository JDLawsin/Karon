import { describe, expect, it } from "vitest";

import { readSiteOrigins } from "./read-site-origins";

describe("readSiteOrigins", () => {
  it("uses localhost origins when next dev has no env file", () => {
    expect(readSiteOrigins({ NODE_ENV: "development" })).toEqual({
      www: "http://localhost:3001",
      app: "http://localhost:3000"
    });
  });

  it("requires explicit origins outside development", () => {
    expect(() => readSiteOrigins({ NODE_ENV: "production" })).toThrow("WWW_URL is required");
  });
});

