import type { MetadataRoute } from "next";

const manifest = (): MetadataRoute.Manifest => ({
  name: "Karon",
  short_name: "Karon",
  description: "Offline-first clinic software for small dental practices.",
  start_url: "/",
  display: "standalone",
  background_color: "#F3F8FA",
  theme_color: "#1A5B7D",
  icons: [
    {
      src: "/icons/karon.svg",
      sizes: "192x192",
      type: "image/svg+xml",
      purpose: "any"
    },
    {
      src: "/icons/karon.svg",
      sizes: "512x512",
      type: "image/svg+xml",
      purpose: "maskable"
    }
  ]
});

export default manifest;
