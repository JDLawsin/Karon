"use client";

import { liveQuery } from "dexie";
import { useCallback, useEffect, useMemo, useState } from "react";

import { addWalkIn, changeVisitStatus } from "@/features/today-board/local";
import {
  hasDuplicateMobile,
  projectTodayBoard
} from "@/features/today-board/project-today-board";
import { useClinicSession } from "@/lib/auth/clinic-session";
import { openClinicDb } from "@/lib/db/clinic-db";
import type { ClinicEvent, VisitStatus } from "@/lib/sync/event-schema";

const LATE_TICK_MS = 60_000;

const useTodayBoard = () => {
  const { membership, userId } = useClinicSession();
  const [now, setNow] = useState(() => new Date());
  const [events, setEvents] = useState<ClinicEvent[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), LATE_TICK_MS);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    const start = async () => {
      const db = await openClinicDb(membership.tenantId);

      if (cancelled) {
        return;
      }

      const subscription = liveQuery(() =>
        db.isOpen() ? db.events.toArray() : []
      ).subscribe({
        next: (rows) => {
          if (!cancelled) {
            setEvents(rows);
            setReady(true);
          }
        },
        error: () => {
          if (!cancelled) {
            setEvents([]);
            setReady(true);
          }
        }
      });
      unsubscribe = () => subscription.unsubscribe();
    };

    void start();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [membership.tenantId]);

  const rows = useMemo(() => projectTodayBoard(events, now), [events, now]);

  const isDuplicateMobile = useCallback(
    (mobile: string) => hasDuplicateMobile(events, mobile),
    [events]
  );

  const addWalkInPatient = async (draft: { name: string; mobile: string }) => {
    const db = await openClinicDb(membership.tenantId);

    await addWalkIn(db, {
      tenantId: membership.tenantId,
      actorUserId: userId,
      name: draft.name,
      mobile: draft.mobile
    });
  };

  const markVisit = async (visitId: string, status: VisitStatus) => {
    const db = await openClinicDb(membership.tenantId);

    await changeVisitStatus(db, {
      tenantId: membership.tenantId,
      actorUserId: userId,
      visitId,
      status
    });
  };

  return { rows, ready, now, isDuplicateMobile, addWalkInPatient, markVisit };
};

export { useTodayBoard };
