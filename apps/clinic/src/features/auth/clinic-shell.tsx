"use client";

import {
  Alert,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger
} from "@karon/design-system";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

import { ClinicChromeActionsContext } from "@/features/auth/clinic-chrome-actions";
import {
  ClinicAccountMenu,
  ClinicAccountNav,
  ClinicBrandLink,
  ClinicJobNav
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
  appVersion: string;
  children: ReactNode;
};

const ClinicShell = ({ membership, userId, appVersion, children }: Props) => {
  const router = useRouter();
  const [chromeActions, setChromeActions] = useState<HTMLElement | null>(null);
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
        <ClinicChromeActionsContext.Provider value={chromeActions}>
          <SidebarProvider className="relative z-1 min-h-dvh min-w-0 bg-background">
            <a
              className="sr-only focus:not-sr-only focus:absolute focus:z-(--z-sticky) focus:inline-flex focus:min-h-(--control-min-height) focus:items-center focus:rounded-md focus:bg-primary focus:px-4 focus:text-sm focus:font-medium focus:text-primary-foreground focus:ring-2 focus:ring-ring focus:outline-none"
              href="#clinic-main"
            >
              Skip to content
            </a>
          <Sidebar collapsible="icon">
            <SidebarHeader>
              <div className="flex min-w-0 items-center gap-1 group-data-[collapsible=icon]:flex-col">
                <ClinicBrandLink className="min-w-0 flex-1 group-data-[collapsible=icon]:flex-none" />
                <SidebarTrigger className="ml-auto group-data-[collapsible=icon]:order-first group-data-[collapsible=icon]:ml-0" />
              </div>
            </SidebarHeader>
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupLabel>Jobs</SidebarGroupLabel>
                <SidebarGroupContent>
                  <nav aria-label="Jobs">
                    <ClinicJobNav role={role} />
                  </nav>
                </SidebarGroupContent>
              </SidebarGroup>
              <SidebarGroup>
                <SidebarGroupLabel>Account</SidebarGroupLabel>
                <SidebarGroupContent>
                  <nav aria-label="Account">
                    <ClinicAccountNav />
                  </nav>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
            <SidebarFooter>
              <ClinicAccountMenu
                onSignOut={signOut}
                role={role}
                userId={userId}
              />
              <p className="w-full px-2 text-center text-xs text-muted-foreground tabular-nums group-data-[collapsible=icon]:sr-only">
                Version {appVersion}
              </p>
            </SidebarFooter>
          </Sidebar>
          <SidebarInset>
            <header className="flex min-h-(--control-min-height) items-center gap-2 px-4 py-3 sm:px-6 md:hidden">
              <SidebarTrigger className="relative z-1" />
              <div className="flex min-w-0 flex-1 items-center justify-center">
                <ClinicBrandLink className="justify-center" />
              </div>
              <div
                className="flex shrink-0 items-center justify-end"
                id="clinic-chrome-actions"
                ref={(node) => {
                  if (!node) {
                    return;
                  }

                  queueMicrotask(() => {
                    setChromeActions(node);
                  });
                }}
              />
            </header>
            {syncBannerTitle ? (
              <div className="px-4 pt-4 sm:px-6">
                <Alert title={syncBannerTitle} variant="info" />
              </div>
            ) : null}
            <main
              className="min-w-0 flex-1 px-4 py-4 sm:px-6"
              id="clinic-main"
              tabIndex={-1}
            >
              {children}
            </main>
          </SidebarInset>
          </SidebarProvider>
        </ClinicChromeActionsContext.Provider>
      </IdleLockGate>
    </ClinicSessionProvider>
  );
};

export default ClinicShell;
