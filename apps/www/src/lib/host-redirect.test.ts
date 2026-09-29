import { describe, expect, it } from "vitest";

import { hostRedirect } from "./host-redirect";

describe("hostRedirect", () => {
  it("redirects www to an apex canonical host", () => {
    expect(hostRedirect("https://example.test")).toEqual({
      source: "/:path*",
      destination: "https://example.test/:path*",
      statusCode: 301,
      has: [{ type: "host", value: "www.example.test" }]
    });
  });

  it("redirects apex to a www canonical host", () => {
    expect(hostRedirect("https://www.example.test").has[0].value).toBe("example.test");
  });
});
