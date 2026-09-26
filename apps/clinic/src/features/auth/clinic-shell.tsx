"use client";

import {
  Alert,
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  Button,
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
import { StaffAvatarPreferenceProvider } from "@/features/auth/staff-avatar-preference";
import { ClinicSessionProvider } from "@/lib/auth/clinic-session";
import { writeAuditEvent } from "@/lib/auth/audit";
import { leaveClinicSession } from "@/lib/auth/leave-clinic-session";
import { exportPendingClinicWork } from "@/lib/auth/pending-work-export";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import QueryProvider from "@/lib/query/query-provider";
import { useClinicSync } from "@/lib/sync/use-clinic-sync";

type Props = {
  membership: Membership;
  userId: string;
  sessionActive?: boolean;
  appVersion: string;
  children: ReactNode;
};

const ClinicShell = ({
  membership,
  userId,
  sessionActive = true,
  appVersion,
  children
}: Props) => {
  const router = useRouter();
  const [chromeActions, setChromeActions] = useState<HTMLElement | null>(null);
  const [protectedCount, setProtectedCount] = useState<number | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);
  const role: ClinicRole = membership.role;
  const { online, pendingCount } = useClinicSync(membership.tenantId);
  const syncBannerTitle = !online
    ? "Saved on this device. Will sync when online."
    : pendingCount > 0
      ? "Saved on this device. Syncing."
      : null;

  const signOut = async () => {
    setLeaving(true);
    setLeaveError(null);

    try {
      const result = await leaveClinicSession(createBrowserSupabase());

      if (result.status === "blocked") {
        setProtectedCount(result.pendingCount);
        return;
      }

      router.push("/login");
      router.refresh();
    } finally {
      setLeaving(false);
    }
  };

  const discardAndSignOut = async () => {
    setLeaving(true);
    setLeaveError(null);
    const supabase = createBrowserSupabase();

    try {
      await writeAuditEvent(supabase, {
        tenantId: membership.tenantId,
        actorUserId: userId,
        eventType: "auth.outbox_discarded"
      });
      await leaveClinicSession(supabase, { discardPending: true });
      router.push("/login");
      router.refresh();
    } catch {
      setLeaveError("Could not leave the clinic. Try again.");
    } finally {
      setLeaving(false);
    }
  };

  const currentProtectedCount = protectedCount ?? 0;

  return (
    <ClinicSessionProvider
      membership={membership}
      syncStatus={{ online, pendingCount }}
      userId={userId}
    >
      <QueryProvider>
        <StaffAvatarPreferenceProvider userId={userId}>
          <IdleLockGate
            membership={membership}
            pendingCount={pendingCount}
            sessionActive={sessionActive}
            userId={userId}
          >
            <ClinicChromeActionsContext.Provider value={chromeActions}>
              <SidebarProvider className="relative z-1 min-h-dvh min-w-0 bg-sidebar">
                <a
                  className="sr-only focus:not-sr-only focus:absolute focus:z-(--z-sticky) focus:inline-flex focus:min-h-(--control-min-height) focus:items-center focus:rounded-md focus:bg-primary focus:px-4 focus:text-sm focus:font-medium focus:text-primary-foreground focus:ring-2 focus:ring-ring focus:outline-none"
                  href="#clinic-main"
                >
                  Skip to content
                </a>
                <Sidebar collapsible="icon" variant="inset">
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
                  <header className="grid min-h-(--control-min-height) grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-3 sm:px-6 md:hidden">
                    <SidebarTrigger className="relative z-1 justify-self-start" />
                    <ClinicBrandLink className="justify-center justify-self-center" />
                    <div
                      className="flex items-center justify-end justify-self-end"
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
          <AlertDialog open={protectedCount !== null}>
            <AlertDialogContent
              onEscapeKeyDown={(event) => event.preventDefault()}
            >
              <AlertDialogTitle>
                {confirmDiscard
                  ? `Discard ${currentProtectedCount} pending ${currentProtectedCount === 1 ? "change" : "changes"}?`
                  : "Unsynced work is protected"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {confirmDiscard
                  ? "This permanently removes the pending work from this device. It cannot be recovered unless you export it first."
                  : online
                    ? "Wait for sync to finish, or stay signed in. Karon will not sign out and wipe this device while work is pending."
                    : "Reconnect and wait for sync, or stay signed in. Karon will not wipe pending work while this device is offline."}
              </AlertDialogDescription>
              {currentProtectedCount > 0 ? (
                <Alert
                  className="mt-4"
                  title="Export includes sensitive clinic data. Store the file securely."
                  variant="info"
                />
              ) : null}
              {leaveError ? (
                <Alert className="mt-4" title={leaveError} variant="danger" />
              ) : null}
              <div className="mt-6 flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap">
                {currentProtectedCount > 0 ? (
                  <Button
                    className="w-full sm:w-auto"
                    disabled={leaving}
                    onClick={() => {
                      void exportPendingClinicWork(membership.tenantId).catch(() => {
                        setLeaveError("Could not export pending work.");
                      });
                    }}
                    type="button"
                    variant="outline"
                  >
                    Export pending work
                  </Button>
                ) : null}
                <Button
                  className="w-full sm:w-auto"
                  disabled={leaving}
                  onClick={() => void signOut()}
                  type="button"
                >
                  Check sync &amp; sign out
                </Button>
                <Button
                  className="w-full sm:w-auto"
                  disabled={leaving}
                  onClick={() => {
                    setProtectedCount(null);
                    setConfirmDiscard(false);
                    setLeaveError(null);
                  }}
                  type="button"
                  variant="outline"
                >
                  Stay signed in
                </Button>
                {currentProtectedCount > 0 ? (
                  <Button
                    className="w-full sm:w-auto"
                    disabled={leaving}
                    onClick={() => {
                      if (confirmDiscard) {
                        void discardAndSignOut();
                      } else {
                        setConfirmDiscard(true);
                      }
                    }}
                    type="button"
                    variant="destructive"
                  >
                    {confirmDiscard ? "Discard and sign out" : "Discard pending work..."}
                  </Button>
                ) : null}
              </div>
            </AlertDialogContent>
          </AlertDialog>
        </StaffAvatarPreferenceProvider>
      </QueryProvider>
    </ClinicSessionProvider>
  );
};

export default ClinicShell;
