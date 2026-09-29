"use client";

import { Button, Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@karon/design-system";
import Link from "next/link";

import type { SiteCta } from "../../../content/site.config";

type Props = {
  links: ReadonlyArray<{ href: string; label: string }>;
  primaryCta: SiteCta;
};

const MobileNavigation = ({ links, primaryCta }: Props) => (
  <div className="lg:hidden">
    <Sheet>
      <SheetTrigger asChild>
        <Button aria-label="Open menu" variant="ghost">Menu</Button>
      </SheetTrigger>
      <SheetContent className="w-full max-w-none" side="right">
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
          <SheetDescription>Explore Karon</SheetDescription>
        </SheetHeader>
        <nav aria-label="Mobile navigation" className="flex flex-col gap-2">
          {links.map(({ href, label }) => (
            <SheetClose asChild key={href}>
              <Link className="flex min-h-11 items-center rounded-md px-3 text-lg font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" href={href}>
                {label}
              </Link>
            </SheetClose>
          ))}
        </nav>
        <SheetFooter>
          <SheetClose asChild>
            <Button asChild>
              <Link data-cta-id={primaryCta.ctaId} href={primaryCta.href}>
                {primaryCta.label}
              </Link>
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  </div>
);

export default MobileNavigation;
