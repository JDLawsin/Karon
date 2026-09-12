import type { MetadataRoute } from "next";

const manifest = (): MetadataRoute.Manifest => ({
  name: "Karon",
  short_name: "Karon",
  description: "Offline-first clinic software for small dental practices.",
  start_url: "/",
  display: "standalone",
  background_color: "#FFFFFF",
  theme_color: "#2563EB",
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
