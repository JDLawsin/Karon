import type { Metadata } from "next";

import { siteOrigins } from "./site-origins";

export const pageMetadata = (
  path: string,
  title: string,
  description: string
): Metadata => {
  const canonical = new URL(path, siteOrigins.www).toString();
  const image = new URL("/logo.svg", siteOrigins.www).toString();
  const includesBrand = title.endsWith(" Karon");
  const socialTitle = includesBrand ? title : `${title} | Karon`;

  return {
    title: includesBrand ? { absolute: title } : title,
    description,
    alternates: { canonical },
    openGraph: {
      title: socialTitle,
      description,
      type: "website",
      url: canonical,
      siteName: "Karon",
      locale: "en_PH",
      images: [{ url: image, width: 512, height: 512, alt: "Karon" }]
    },
    twitter: {
      card: "summary",
      title: socialTitle,
      description,
      images: [image]
    }
  };
};
