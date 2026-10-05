import type { MetadataRoute } from "next";

import { siteRoutes } from "../../content/site-routes";
import { siteOrigins } from "@/lib/site-origins";

export const dynamic = "force-static";

const sitemap = (): MetadataRoute.Sitemap => siteRoutes
  .filter((route) => !route.startsWith("/.well-known"))
  .map((route) => ({ url: new URL(route, siteOrigins.www).toString() }));

export default sitemap;
