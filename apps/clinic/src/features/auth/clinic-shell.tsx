"use client";

import { Alert, Button, KaronWordmark, ThemeToggle } from "@karon/design-system";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import IdleLockGate from "@/features/auth/idle-lock-gate";
import type { ClinicRole, Membership } from "@/features/auth/resolve-auth-destination";
import { ClinicSessionProvider } from "@/lib/auth/clinic-session";
import { leaveClinicSession } from "@/lib/auth/leave-clinic-session";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { useClinicSync } from "@/lib/sync/use-clinic-sync";

type Props = {
  membership: Membership;
  userId: string;
  children: ReactNode;
};

const navLinkClass =
  "inline-flex min-h-(--control-min-height) items-center rounded-md px-3 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const ClinicShell = ({ membership, userId, children }: Props) => {
  const router = useRouter();
  const role: ClinicRole = membership.role;
  const { online, pendingCount } = useClinicSync(membership.tenantId);
  const syncBannerTitle = !online
    ? "Saved on this device. Will sync when online."
    : pendingCount > 0
      ? "Saved on this device. Syncing."
      : null;

  const signOut = async () => {
    await leaveClinicSession(createBrowserSupabase());
    router.push("/login");
    router.refresh();
  };

  return (
    <ClinicSessionProvider membership={membership} userId={userId}>
      <IdleLockGate membership={membership} userId={userId}>
        <div className="mx-auto flex min-h-screen w-full max-w-5xl min-w-0 flex-col gap-6 px-4 py-4 sm:px-6">
          <a
            className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:inline-flex focus:min-h-(--control-min-height) focus:items-center focus:rounded-md focus:bg-primary focus:px-4 focus:text-sm focus:font-medium focus:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            href="#clinic-main"
          >
            Skip to content
          </a>
          <header className="flex w-full min-w-0 flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
            <Link
              className="inline-flex min-h-(--control-min-height) items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              href="/today"
            >
              <KaronWordmark />
            </Link>
            <nav aria-label="Clinic" className="flex min-w-0 flex-wrap items-center gap-1">
              <Link className={navLinkClass} href="/today">
                Today
              </Link>
              {role === "owner" ? (
                <>
                  <Link className={navLinkClass} href="/owner/today">
                    Today&apos;s collections
                  </Link>
                  <Link className={navLinkClass} href="/owner/clinic">
                    Clinic
                  </Link>
                </>
              ) : null}
              <Link className={navLinkClass} href="/update-password">
                Password
              </Link>
              <ThemeToggle />
              <Button onClick={signOut} type="button" variant="outline">
                Sign out
              </Button>
            </nav>
          </header>
          {syncBannerTitle ? (
            <Alert title={syncBannerTitle} variant="info" />
          ) : null}
          <main className="min-w-0 flex-1" id="clinic-main" tabIndex={-1}>
            {children}
          </main>
        </div>
      </IdleLockGate>
    </ClinicSessionProvider>
  );
};

export default ClinicShell;
