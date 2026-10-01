import { describe, expect, it } from "vitest";

import { findUnlinkedCounselWording } from "./security-copy-guard";

describe("security counsel copy guard", () => {
  it("flags unlinked wording even when the approved link appears elsewhere", () => {
    const html = `
      <p>Read about our retention approach.</p>
      <a href="/legal/privacy">Privacy notice</a>
    `;

    expect(findUnlinkedCounselWording(html)).toEqual([
      "retention wording must link to /legal/privacy"
    ]);
  });

  it("accepts wording inside its approved link and ignores structured-data copies", () => {
    const html = `
      <a href="/legal/processing-agreement"><span>Data processing agreement</span></a>
      <script type="application/ld+json">{"text":"Data processing agreement"}</script>
    `;

    expect(findUnlinkedCounselWording(html)).toEqual([]);
  });
});
