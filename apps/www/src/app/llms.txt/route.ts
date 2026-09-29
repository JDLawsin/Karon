import { siteRoutes } from "../../../content/site-routes";
import { claimText, liveLlmsClaims } from "../../../content/claims";
import { siteOrigins } from "@/lib/site-origins";

export const dynamic = "force-static";

export const GET = () => new Response(
  [
    "# Karon",
    "",
    claimText("entity-sentence"),
    "",
    "## Available today",
    ...liveLlmsClaims().map((text) => `- ${text}`),
    "",
    "## Pages",
    ...siteRoutes.map((route) => `- ${new URL(route, siteOrigins.www)}`)
  ].join("\n"),
  { headers: { "Content-Type": "text/plain; charset=utf-8" } }
);
