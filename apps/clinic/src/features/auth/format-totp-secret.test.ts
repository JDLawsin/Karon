import { describe, expect, it } from "vitest";

import { formatTotpSecret } from "./format-totp-secret";

describe("formatTotpSecret", () => {
  it("groups a Base32 secret into four-character chunks", () => {
    expect(formatTotpSecret("JBSWY3DPEHPK3PXP")).toBe("JBSW Y3DP EHPK 3PXP");
  });

  it("strips existing spaces and keeps a leftover chunk", () => {
    expect(formatTotpSecret("abcd efghi")).toBe("abcd efgh i");
  });
});
