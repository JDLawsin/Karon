import { Button } from "@karon/design-system";
import Link from "next/link";
import type { ReactNode } from "react";

import { siteConfig } from "../../../content/site.config";
import StickyCta from "../site-shell/sticky-cta";

type Props = {
  title: ReactNode;
  description: ReactNode;
  pageId: string;
  showCtas?: boolean;
  lastUpdated?: string;
};

const SitePage = ({ title, description, pageId, showCtas = true, lastUpdated }: Props) => (
  <main className={showCtas ? "with-mobile-sticky" : undefined} data-page={pageId}>
    <section className="mx-auto flex min-h-[55svh] max-w-5xl flex-col justify-center gap-6 px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
      <h1 className="max-w-3xl text-4xl font-extrabold tracking-tight sm:text-6xl">{title}</h1>
      <p className="max-w-2xl text-lg text-muted-foreground sm:text-xl">{description}</p>
      {showCtas && (
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center" data-sticky-cta-origin>
          <Button asChild>
            <Link data-cta-id={siteConfig.ctas.primary.ctaId} href={siteConfig.ctas.primary.href}>
              {siteConfig.ctas.primary.label}
            </Link>
          </Button>
          <Link className="min-h-11 py-2 font-semibold text-primary underline-offset-4 hover:underline" data-cta-id={siteConfig.ctas.secondary.ctaId} href={siteConfig.ctas.secondary.href}>
            {siteConfig.ctas.secondary.label}
          </Link>
        </div>
      )}
      {lastUpdated && <p className="text-sm text-muted-foreground">Last updated: {lastUpdated}</p>}
    </section>
    {showCtas && (
      <section className="bg-primary text-primary-foreground" data-sticky-cta-stop>
        <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-5 px-4 py-10 sm:flex-row sm:items-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold">Talk with us about your clinic.</h2>
          <Button asChild className="bg-background text-foreground hover:bg-muted">
            <Link data-cta-id={siteConfig.ctas.primary.ctaId} href={siteConfig.ctas.primary.href}>
              {siteConfig.ctas.primary.label}
            </Link>
          </Button>
        </div>
      </section>
    )}
    {showCtas && <StickyCta cta={siteConfig.ctas.primary} />}
  </main>
);

export default SitePage;
