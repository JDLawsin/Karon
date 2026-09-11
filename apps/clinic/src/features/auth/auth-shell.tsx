import { Button, KaronWordmark, ThemeToggle } from "@karon/design-system";
import Link from "next/link";
import type { ReactNode } from "react";

import AuthHeroPanel from "@/features/auth/auth-hero-panel";

type Props = {
  title: string;
  children: ReactNode;
};

const AuthShell = ({ title, children }: Props) => (
  <main className="grid min-h-screen min-w-0 bg-background md:grid-cols-[minmax(0,28rem)_minmax(0,1fr)] lg:grid-cols-[minmax(0,32rem)_minmax(0,1fr)]">
    <div className="mx-auto flex w-full min-w-0 max-w-md flex-col gap-8 bg-background px-4 py-8 sm:px-6 sm:py-16 md:mx-0 md:max-w-none md:justify-center md:px-8 md:py-12 lg:px-12 lg:py-16">
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
        <h1 className="text-2xl font-semibold">{title}</h1>
        <div className="min-w-0 rounded-md border border-border bg-card p-4 sm:p-6">
          {children}
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        <Button asChild variant="ghost" className="h-11 px-0">
          <Link href="/~offline">Offline fallback</Link>
        </Button>
      </p>
    </div>
    <AuthHeroPanel className="hidden min-h-svh min-w-0 md:block" />
  </main>
);

export default AuthShell;
