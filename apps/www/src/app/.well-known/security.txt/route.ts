import { siteOrigins } from "@/lib/site-origins";

export const dynamic = "force-static";

export const GET = () => new Response(
  `Contact: ${new URL("/security", siteOrigins.www)}\nCanonical: ${new URL("/.well-known/security.txt", siteOrigins.www)}\n`,
  { headers: { "Content-Type": "text/plain; charset=utf-8" } }
);
