"use client";

import { liveQuery } from "dexie";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  DEFAULT_HUDDLE_HOURS,
  huddleHoursOf,
  type HuddleHours
} from "@/features/today-board/huddle-schedule";
import {
  addBooking,
  changeVisitStatus,
  readAutoConfirm,
  readClinicHours,
  writeAutoConfirm,
  writeClinicHours
} from "@/features/today-board/local";
import {
  foldVisits,
  hasDuplicateMobile,
  projectFoldedBoard
} from "@/features/today-board/project-today-board";
import { useClinicSession } from "@/lib/auth/clinic-session";
import { openClinicDb } from "@/lib/db/clinic-db";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import type { ClinicEvent, VisitStatus } from "@/lib/sync/event-schema";

const LATE_TICK_MS = 60_000;

const useTodayBoard = (viewDay?: string) => {
  const { membership, userId } = useClinicSession();
  const [now, setNow] = useState(() => new Date());
  const [events, setEvents] = useState<ClinicEvent[]>([]);
  const [outboxIds, setOutboxIds] = useState<Set<string>>(new Set());
  const [autoConfirm, setAutoConfirm] = useState(true);
  const [hours, setHours] = useState<HuddleHours>(DEFAULT_HUDDLE_HOURS);
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

      setAutoConfirm(await readAutoConfirm(db));
      setHours(await readClinicHours(db));

      const subscription = liveQuery(async () => {
        if (!db.isOpen()) {
          return { events: [] as ClinicEvent[], outboxIds: [] as string[] };
        }

        const [rows, outbox] = await Promise.all([
          db.events.toArray(),
          db.outbox.toArray()
        ]);

        return {
          events: rows,
          outboxIds: outbox.map((item) => item.id)
        };
      }).subscribe({
        next: (snapshot) => {
          if (!cancelled) {
            setEvents(snapshot.events);
            setOutboxIds(new Set(snapshot.outboxIds));
            setReady(true);
          }
        },
        error: () => {
          if (!cancelled) {
            setEvents([]);
            setOutboxIds(new Set());
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

  useEffect(() => {
    let cancelled = false;
    const supabase = createBrowserSupabase();

    const load = async () => {
      const { data } = await supabase
        .from("clinics")
        .select("auto_confirm_bookings, hours")
        .eq("id", membership.tenantId)
        .maybeSingle();

      if (cancelled || !data) {
        return;
      }

      const db = await openClinicDb(membership.tenantId);

      if (typeof data.auto_confirm_bookings === "boolean") {
        setAutoConfirm(data.auto_confirm_bookings);
        await writeAutoConfirm(db, data.auto_confirm_bookings);
      }

      const nextHours = huddleHoursOf(data.hours);

      if (nextHours) {
        setHours(nextHours);
        await writeClinicHours(db, nextHours);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [membership.tenantId]);

  const folded = useMemo(() => foldVisits(events), [events]);
  const huddle = useMemo(
    () => projectFoldedBoard(folded, now, undefined, outboxIds, viewDay),
    [folded, now, outboxIds, viewDay]
  );

  const isDuplicateMobile = useCallback(
    (mobile: string) => hasDuplicateMobile(events, mobile),
    [events]
  );

  const addWalkInPatient = async (draft: {
    name: string;
    mobile: string;
    startsAt: string;
  }) => {
    const db = await openClinicDb(membership.tenantId);

    await addBooking(db, {
      tenantId: membership.tenantId,
      actorUserId: userId,
      name: draft.name,
      mobile: draft.mobile,
      startsAt: draft.startsAt,
      autoConfirm
    });
  };

  const markVisit = async (visitId: string, status: VisitStatus) => {
    const db = await openClinicDb(membership.tenantId);
    const result = await changeVisitStatus(db, {
      tenantId: membership.tenantId,
      actorUserId: userId,
      visitId,
      status
    });

    if (
      status === "cancelled" &&
      result?.googleEventId &&
      navigator.onLine
    ) {
      await fetch("/api/google-calendar/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ googleEventId: result.googleEventId })
      });
    }
  };

  return {
    huddle,
    events,
    ready,
    now,
    autoConfirm,
    hours,
    isDuplicateMobile,
    addWalkInPatient,
    markVisit
  };
};

export { useTodayBoard };
