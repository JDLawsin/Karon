import { describe, expect, it } from "vitest";

import { pageMetadata } from "./page-metadata";

describe("pageMetadata", () => {
  it("publishes canonical, Open Graph, and social-card metadata", () => {
    const metadata = pageMetadata(
      "/product",
      "Dental clinic software features",
      "See how Karon carries a patient request through the clinic day."
    );

    expect(metadata.alternates).toEqual({ canonical: "https://www.example.test/product" });
    expect(metadata.openGraph).toMatchObject({
      title: "Dental clinic software features | Karon",
      siteName: "Karon",
      locale: "en_PH",
      url: "https://www.example.test/product"
    });
    expect(metadata.twitter).toMatchObject({
      card: "summary",
      title: "Dental clinic software features | Karon"
    });
  });

  it("does not repeat the brand when the page title already includes Karon", () => {
    const metadata = pageMetadata("/about", "About Karon", "About the team building Karon.");

    expect(metadata.title).toEqual({ absolute: "About Karon" });
    expect(metadata.openGraph).toMatchObject({ title: "About Karon" });
  });
});
