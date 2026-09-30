import { describe, expect, it } from "vitest";

import { assertSiteRoutePolicy } from "./site-route-policy";

describe("marketing route policy", () => {
  it.each(["compare/vendor-name", "alternatives/vendor-name", "(marketing)/compare/vendor-name"])(
    "blocks %s in design-partner mode",
    (route) => {
      expect(() => assertSiteRoutePolicy("design-partner", ["", "switching", route]))
        .toThrow("Vendor comparison routes require open mode");
    }
  );

  it("allows the switching page in design-partner mode and comparison routes in open mode", () => {
    expect(() => assertSiteRoutePolicy("design-partner", ["", "switching"])).not.toThrow();
    expect(() => assertSiteRoutePolicy("open", ["compare/vendor-name"])).not.toThrow();
  });
});
