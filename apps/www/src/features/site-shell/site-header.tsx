import { Button, KaronWordmark } from "@karon/design-system";
import Link from "next/link";

import { siteConfig } from "../../../content/site.config";
import { primaryNavigation } from "../../../content/site-routes";
import MobileNavigation from "./mobile-navigation";

const SiteHeader = () => (
  <header className="relative z-10 border-b border-border bg-background">
    <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
      <Link aria-label="Karon home" href="/">
        <KaronWordmark />
      </Link>
      <nav aria-label="Primary navigation" className="hidden items-center gap-1 lg:flex">
        {primaryNavigation.map(({ href, label }) => (
          <Link className="flex min-h-11 items-center rounded-md px-3 font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" href={href} key={href}>
            {label}
          </Link>
        ))}
      </nav>
      <div className="hidden lg:block">
        <Button asChild>
          <Link data-cta-id={siteConfig.ctas.primary.ctaId} href={siteConfig.ctas.primary.href}>
            {siteConfig.ctas.primary.label}
          </Link>
        </Button>
      </div>
      <MobileNavigation links={primaryNavigation} primaryCta={siteConfig.ctas.primary} />
    </div>
  </header>
);

export default SiteHeader;
