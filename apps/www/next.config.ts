import type { NextConfig } from "next";

import { hostRedirect } from "./src/lib/host-redirect";
import { readSiteOrigins } from "./src/lib/read-site-origins";

const isProduction = process.env.VERCEL_ENV === "production";
const siteOrigins = readSiteOrigins(process.env);

const nextConfig: NextConfig = {
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
