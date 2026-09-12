import { Button, cn, KaronWordmark, ThemeToggle } from "@karon/design-system";
import Link from "next/link";
import type { ReactNode } from "react";

import AuthHeroPanel from "@/features/auth/auth-hero-panel";

type Props = {
  title: string;
  children: ReactNode;
  wide?: boolean;
};

const AuthShell = ({ title, children, wide = false }: Props) => (
  <main
    className={cn(
      "relative z-[1] grid min-h-screen min-w-0 bg-background",
      wide
        ? "auth-split:grid-cols-[minmax(0,40rem)_minmax(0,1fr)]"
        : "auth-split:grid-cols-[minmax(0,32rem)_minmax(0,1fr)]"
    )}
  >
    <div
      className={cn(
        "mx-auto flex w-full min-w-0 flex-col gap-8 bg-background px-4 py-8 sm:px-6 sm:py-16 auth-split:mx-0 auth-split:max-w-none auth-split:justify-center auth-split:px-12 auth-split:py-16",
        wide ? "max-w-lg" : "max-w-md"
      )}
    >
      <header className="flex w-full min-w-0 items-center justify-between gap-4">
        <Link
          href="/login"
          className="inline-flex min-h-11 items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <KaronWordmark />
        </Link>
        <ThemeToggle />
      </header>
      <div className="flex min-w-0 flex-col gap-6">
        <h1 className="text-2xl tracking-(--heading-tracking) [font-weight:var(--heading-weight)]">
          {title}
        </h1>
        <div className="min-w-0 rounded-md border-(length:var(--surface-border-width)) border-border bg-card p-4 sm:p-6">
          {children}
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        <Button asChild variant="ghost" className="h-11 px-0">
          <Link href="/~offline">Offline fallback</Link>
        </Button>
      </p>
    </div>
    <AuthHeroPanel className="hidden min-h-svh min-w-0 auth-split:block" />
  </main>
);

export default AuthShell;
