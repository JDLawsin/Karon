"use client";

import { liveQuery } from "dexie";
import { useEffect, useState, useSyncExternalStore } from "react";

import { closeClinicDb, openClinicDb } from "@/lib/db/clinic-db";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { drainOutbox, pullEvents } from "@/lib/sync/sync-engine";

const SYNC_INTERVAL_MS = 30_000;

const subscribeOnline = (onChange: () => void) => {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
};

const useClinicSync = (tenantId: string) => {
  const online = useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true
  );
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    let timer = 0;
    let runSync = () => {};
    const supabase = createBrowserSupabase();

    const onOnline = () => {
      runSync();
    };

    window.addEventListener("online", onOnline);

    const start = async () => {
      const db = await openClinicDb(tenantId);

      if (cancelled) {
        return;
      }

      const subscription = liveQuery(() =>
        db.isOpen() ? db.outbox.count() : 0
      ).subscribe({
        next: (count) => {
          if (cancelled) {
            return;
          }

          setPendingCount(count);

          if (count > 0 && navigator.onLine && db.isOpen()) {
            void drainOutbox(db, supabase);
          }
        },
        error: () => {
          if (!cancelled) {
            setPendingCount(0);
          }
        }
      });
      unsubscribe = () => subscription.unsubscribe();

      runSync = () => {
        if (cancelled || !navigator.onLine || !db.isOpen()) {
          return;
        }

        void drainOutbox(db, supabase);
        void pullEvents(db, supabase);
      };

      runSync();
      timer = window.setInterval(runSync, SYNC_INTERVAL_MS);
    };

    void start();

    return () => {
      cancelled = true;
      window.removeEventListener("online", onOnline);
      window.clearInterval(timer);
      unsubscribe?.();
      closeClinicDb();
    };
  }, [tenantId]);

  return { online, pendingCount };
};

export { useClinicSync };
