export const siteRoutes = [
  "/",
  "/features",
  "/pricing",
  "/switching",
  "/security",
  "/about",
  "/demo",
  "/legal/privacy",
  "/legal/terms",
  "/legal/cookies",
  "/legal/processing-agreement",
  "/.well-known/security.txt"
] as const;

export const primaryNavigation = [
  { href: "/features", label: "What works today" },
  { href: "/pricing", label: "Pricing" },
  { href: "/switching", label: "Switching" },
  { href: "/security", label: "Security" },
  { href: "/about", label: "About" }
] as const;
