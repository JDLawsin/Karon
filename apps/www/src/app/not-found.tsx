import { Button } from "@karon/design-system";
import type { Metadata } from "next";
import Link from "next/link";

import { siteConfig } from "../../content/site.config";

export const metadata: Metadata = { title: "Page not found", robots: { index: false, follow: false } };

const NotFound = () => (
  <main className="mx-auto flex min-h-[65svh] max-w-3xl flex-col justify-center gap-6 px-4 py-16 sm:px-6 lg:px-8">
    <p className="font-semibold text-primary">404</p>
    <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Page not found</h1>
    <p className="text-lg text-muted-foreground">The page you requested is not here.</p>
    <nav aria-label="Page not found links" className="flex flex-wrap items-center gap-4">
      <Link href="/">Home</Link>
      <Link href="/product">Product</Link>
      <Link href="/pricing">Pricing</Link>
      <Button asChild>
        <Link data-cta-id={siteConfig.ctas.primary.ctaId} href={siteConfig.ctas.primary.href}>{siteConfig.ctas.primary.label}</Link>
      </Button>
    </nav>
  </main>
);

export default NotFound;
