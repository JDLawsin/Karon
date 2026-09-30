import type { NextConfig } from "next";
import { join } from "node:path";

import { siteMode } from "./content/site-mode";
import { hostRedirect } from "./src/lib/host-redirect";
import { readSiteOrigins } from "./src/lib/read-site-origins";
import { assertSiteRoutePolicy, listPageRoutes } from "./src/lib/site-route-policy";

const isProduction = process.env.VERCEL_ENV === "production";
const siteOrigins = readSiteOrigins(process.env);

assertSiteRoutePolicy(siteMode, listPageRoutes(join(import.meta.dirname, "src/app")));

const nextConfig: NextConfig = {
  agentRules: false,
  poweredByHeader: false,
  transpilePackages: ["@karon/design-system"],
  allowedDevOrigins: ["127.0.0.1"],
  headers: async () => [
    {
      source: "/(.*)",
      headers: isProduction
        ? []
        : [{ key: "X-Robots-Tag", value: "noindex, nofollow" }]
    }
  ],
  redirects: async () => [
    {
      source: "/contact",
      destination: "/demo",
      statusCode: 301
    },
    hostRedirect(siteOrigins.www)
  ]
};

export default nextConfig;
