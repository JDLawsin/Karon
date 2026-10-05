import { KaronMark } from "@karon/design-system";
import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import type { ReactNode } from "react";

import { siteOrigins } from "@/lib/site-origins";
import SiteFooter from "@/features/site-shell/site-footer";
import SiteHeader from "@/features/site-shell/site-header";
import AttributionCapture from "@/features/demo/attribution-capture";
import { claimText } from "../../content/claims";

import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap"
});

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigins.www),
  applicationName: "Karon",
  title: { default: "Karon", template: "%s | Karon" },
  description: claimText("entity-sentence"),
  icons: {
    icon: [{ url: "/logo.svg", sizes: "any", type: "image/svg+xml" }],
    shortcut: "/logo.svg"
  },
  robots: { index: true, follow: true }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2563EB"
};

type RootLayoutProps = { children: ReactNode };

const RootLayout = ({ children }: RootLayoutProps) => {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteOrigins.www}/#organization`,
        name: "Karon",
        url: siteOrigins.www,
        logo: new URL("/logo.svg", siteOrigins.www).toString(),
        description: claimText("entity-sentence")
      },
      {
        "@type": "WebSite",
        "@id": `${siteOrigins.www}/#website`,
        url: siteOrigins.www,
        name: "Karon",
        description: claimText("entity-sentence"),
        inLanguage: "en-PH",
        publisher: { "@id": `${siteOrigins.www}/#organization` }
      }
    ]
  };

  return (
    <html className={`${outfit.variable} antialiased`} lang="en-PH">
      <body data-density="marketing">
        <AttributionCapture />
        <a className="sr-only z-50 bg-background p-3 focus:not-sr-only focus:fixed focus:left-2 focus:top-2" href="#main-content">Skip to content</a>
        <SiteHeader />
        <div id="main-content" tabIndex={-1}>{children}</div>
        <SiteFooter />
        <script dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replaceAll("<", "\\u003c") }} type="application/ld+json" />
        <KaronMark aria-hidden className="hidden" />
      </body>
    </html>
  );
};

export default RootLayout;
