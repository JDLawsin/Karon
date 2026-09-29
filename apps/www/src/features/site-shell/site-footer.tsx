import { KaronWordmark } from "@karon/design-system";
import Link from "next/link";

import { siteConfig } from "../../../content/site.config";
import { primaryNavigation } from "../../../content/site-routes";

const SiteFooter = () => (
  <footer className="relative z-10 bg-card" data-sticky-cta-stop>
    <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-2 lg:px-8">
      <div className="space-y-3">
        <KaronWordmark />
        <p className="max-w-md text-sm text-muted-foreground">
          Karon is a dental clinic management app built for small clinics with 1 to 2 chairs, starting in the Philippines.
        </p>
      </div>
      <nav aria-label="Footer navigation" className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
        {primaryNavigation.map(({ href, label }) => <Link href={href} key={href}>{label}</Link>)}
        <Link href="/legal/privacy">Privacy</Link>
        <Link href="/legal/terms">Terms</Link>
        <Link href="/legal/cookies">Cookie notice</Link>
        <Link href="/legal/processing-agreement">Processing agreement</Link>
        <Link href="/.well-known/security.txt">Report a security issue</Link>
        <a data-cta-id={siteConfig.ctas.existingClinic.ctaId} href={siteConfig.ctas.existingClinic.href}>
          {siteConfig.ctas.existingClinic.label}
        </a>
      </nav>
    </div>
  </footer>
);

export default SiteFooter;
