import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  transpilePackages: ["@karon/design-system"]
};

export default nextConfig;
