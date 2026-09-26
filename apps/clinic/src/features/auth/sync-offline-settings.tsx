"use client";

import { Card, StatusBadge } from "@karon/design-system";

import { useClinicSession } from "@/lib/auth/clinic-session";

const SyncOfflineSettings = () => {
  const { syncStatus } = useClinicSession();
  const status =
    syncStatus.pendingCount > 0
      ? { label: "Pending sync", tone: "info" as const }
      : syncStatus.online
        ? { label: "Synced", tone: "success" as const }
        : { label: "Offline ready", tone: "info" as const };

  return (
    <Card className="gap-3" data-density="clinic">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-semibold">Sync &amp; offline</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Chair work saves to this device first, then syncs when online.
          </p>
        </div>
        <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
      </div>
      <p className="text-sm text-muted-foreground tabular-nums">
        {syncStatus.pendingCount > 0
          ? `${syncStatus.pendingCount} ${syncStatus.pendingCount === 1 ? "change" : "changes"} waiting to sync.`
          : "No work is waiting to sync."}
      </p>
      <p className="text-xs text-muted-foreground">
        Signing out or idle lock will stop before clearing this device if work is still pending.
      </p>
    </Card>
  );
};

export default SyncOfflineSettings;
