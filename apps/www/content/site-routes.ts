export const siteRoutes = [
  "/",
  "/product",
  "/pricing",
  "/about",
  "/contact",
  "/demo",
  "/legal/privacy",
  "/legal/terms",
  "/legal/cookies",
  "/legal/processing-agreement",
  "/.well-known/security.txt"
] as const;

export const primaryNavigation = [
  { href: "/", label: "Home" },
  { href: "/product", label: "Product" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About us" },
  { href: "/contact", label: "Contact" }
] as const;
