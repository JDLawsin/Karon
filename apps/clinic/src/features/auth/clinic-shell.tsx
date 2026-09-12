"use client";

import { Alert } from "@karon/design-system";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import {
  ClinicBrandLink,
  ClinicJobNav,
  ClinicUtilityNav
} from "@/features/auth/clinic-nav";
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

const ClinicShell = ({ membership, userId, children }: Props) => {
  const router = useRouter();
  const role: ClinicRole = membership.role;
  const { online, pendingCount } = useClinicSync(membership.tenantId);
  const syncBannerTitle = !online
    ? "Saved on this device. Will sync when online."
    : pendingCount > 0
      ? "Saved on this device. Syncing."
      : null;
  const showJobBar = role === "owner";

  const signOut = async () => {
    await leaveClinicSession(createBrowserSupabase());
    router.push("/login");
    router.refresh();
  };

  return (
    <ClinicSessionProvider membership={membership} userId={userId}>
      <IdleLockGate membership={membership} userId={userId}>
        <div className="flex min-h-dvh min-w-0 bg-background">
          <a
            className="sr-only focus:not-sr-only focus:absolute focus:z-(--z-sticky) focus:inline-flex focus:min-h-(--control-min-height) focus:items-center focus:rounded-md focus:bg-primary focus:px-4 focus:text-sm focus:font-medium focus:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            href="#clinic-main"
          >
            Skip to content
          </a>
          <aside className="sticky top-0 hidden h-dvh w-(--sidebar-width) shrink-0 flex-col gap-6 border-r border-border bg-card px-3 py-4 md:flex">
            <ClinicBrandLink />
            <nav aria-label="Clinic" className="min-w-0 flex-1">
              <ClinicJobNav role={role} />
            </nav>
            <ClinicUtilityNav onSignOut={signOut} />
          </aside>
          <div className="flex min-w-0 flex-1 flex-col">
            <header className="flex min-w-0 flex-col gap-3 border-b border-border px-4 py-3 sm:px-6 md:hidden">
              <ClinicBrandLink />
              <ClinicUtilityNav onSignOut={signOut} />
            </header>
            {syncBannerTitle ? (
              <div className="px-4 pt-4 sm:px-6">
                <Alert title={syncBannerTitle} variant="info" />
              </div>
            ) : null}
            <main
              className={
                showJobBar
                  ? "min-w-0 flex-1 px-4 py-4 sm:px-6 max-md:pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]"
                  : "min-w-0 flex-1 px-4 py-4 sm:px-6"
              }
              id="clinic-main"
              tabIndex={-1}
            >
              {children}
            </main>
            {showJobBar ? (
              <nav
                aria-label="Clinic"
                className="fixed inset-x-0 bottom-0 z-(--z-sticky) border-t border-border bg-card px-2 pt-1 pb-[env(safe-area-inset-bottom,0px)] md:hidden"
              >
                <ClinicJobNav role={role} stacked />
              </nav>
            ) : null}
          </div>
        </div>
      </IdleLockGate>
    </ClinicSessionProvider>
  );
};

export default ClinicShell;
