import { siteRoutes } from "../../../content/site-routes";
import { siteOrigins } from "@/lib/site-origins";

export const dynamic = "force-static";

export const GET = () => new Response(
  ["# Karon", "", ...siteRoutes.map((route) => `- ${new URL(route, siteOrigins.www)}`)].join("\n"),
  { headers: { "Content-Type": "text/plain; charset=utf-8" } }
);
