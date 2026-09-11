import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  transpilePackages: ["@karon/design-system", "@karon/db"],
  allowedDevOrigins: ["127.0.0.1"],
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" }
      ]
    }
  ]
};

export default nextConfig;
