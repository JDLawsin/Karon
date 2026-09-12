import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import { SerwistProvider } from "@serwist/next/react";
import { ThemeProvider } from "@karon/design-system";
import { themeInitScript } from "@karon/design-system/theme";
import type { ReactNode } from "react";

import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap"
});

export const metadata: Metadata = {
  applicationName: "Karon",
  title: {
    default: "Karon",
    template: "%s | Karon"
  },
  description: "Offline-first clinic software for small dental practices.",
  robots: {
    index: false,
    follow: false
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2563EB"
};

type RootLayoutProps = {
  children: ReactNode;
};

const RootLayout = ({ children }: RootLayoutProps) => {
  return (
    <html lang="en-PH" className={`${outfit.variable} antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body data-density="clinic">
        <ThemeProvider>
          <SerwistProvider
            swUrl="/sw.js"
            disable={process.env.NODE_ENV === "development"}
          >
            {children}
          </SerwistProvider>
        </ThemeProvider>
      </body>
    </html>
  );
};

export default RootLayout;
