import type { Metadata } from "next";

import { siteOrigins } from "./site-origins";

export const pageMetadata = (
  path: string,
  title: string,
  description: string
): Metadata => {
  const canonical = new URL(path, siteOrigins.www).toString();
  const image = new URL("/logo.svg", siteOrigins.www).toString();

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: "website",
      url: canonical,
      images: [{ url: image, width: 512, height: 512, alt: "Karon" }]
    }
  };
};
