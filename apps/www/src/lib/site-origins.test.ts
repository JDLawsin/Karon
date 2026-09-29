import { describe, expect, it } from "vitest";

import { siteOrigins } from "./site-origins";

describe("siteOrigins", () => {
  it("reads distinct marketing and clinic origins", () => {
    expect(siteOrigins).toEqual({
      www: "https://www.example.test",
      app: "https://app.example.test"
    });
  });
});
