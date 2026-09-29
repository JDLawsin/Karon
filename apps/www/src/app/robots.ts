import type { MetadataRoute } from "next";

import { siteOrigins } from "@/lib/site-origins";

export const dynamic = "force-static";

const robots = (): MetadataRoute.Robots => ({
  rules: { userAgent: "*", allow: "/" },
  sitemap: new URL("/sitemap.xml", siteOrigins.www).toString()
});

export default robots;
