import { describe, expect, it } from "vitest";

import { RequestBodyTooLargeError, readLimitedText } from "./read-limited-text";

describe("readLimitedText", () => {
  it("returns the exact request text without JSON normalization", async () => {
    const body = '{\n  "signed": true\n}';
    const request = new Request("https://clinic.example/webhook", {
      method: "POST",
      body
    });

    await expect(readLimitedText(request, 1_024)).resolves.toBe(body);
  });

  it("rejects a streamed body over the configured limit", async () => {
    const request = new Request("https://clinic.example/webhook", {
      method: "POST",
      body: "12345"
    });

    await expect(readLimitedText(request, 4)).rejects.toThrow(
      RequestBodyTooLargeError
    );
  });
});
