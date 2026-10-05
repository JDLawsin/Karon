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
    "## Audience and status",
    "- Built for owner-dentists and small dental clinic teams, starting in the Philippines.",
    "- Karon is currently working with founding clinics; public self-serve signup is not open.",
    "- Product pages distinguish capabilities that are live from work that is still being built.",
    "",
    "## Available today",
    ...liveLlmsClaims().map((text) => `- ${text}`),
    "",
    "## Pages",
    ...siteRoutes.map((route) => `- [${route === "/" ? "Home" : route}](${new URL(route, siteOrigins.www)})`)
  ].join("\n"),
  { headers: { "Content-Type": "text/plain; charset=utf-8" } }
);
