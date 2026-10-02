import type { MetadataRoute } from "next";

import { clinicAppUrl } from "@/lib/server-env";

const trainingBots = [
  "GPTBot",
  "ClaudeBot",
  "Google-Extended",
  "Applebot-Extended",
  "CCBot"
];

export const dynamic = "force-dynamic";

const robots = (): MetadataRoute.Robots => ({
  rules: [
    { userAgent: "*", allow: "/book/", disallow: "/" },
    { userAgent: trainingBots, disallow: "/" }
  ],
  sitemap: clinicAppUrl("/book/sitemap.xml").toString()
});

export default robots;
