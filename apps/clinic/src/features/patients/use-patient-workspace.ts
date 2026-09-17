"use client";

import { liveQuery } from "dexie";
import { useEffect, useMemo, useState } from "react";

import { foldVisits } from "@/features/today-board/project-today-board";
import { useClinicSession } from "@/lib/auth/clinic-session";
import { openClinicDb } from "@/lib/db/clinic-db";
import type { ClinicEvent } from "@/lib/sync/event-schema";

const usePatientWorkspace = (patientId: string, visitId?: string) => {
  const { membership } = useClinicSession();
  const [events, setEvents] = useState<ClinicEvent[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    void (async () => {
      const db = await openClinicDb(membership.tenantId);

      if (cancelled) {
        return;
      }

      const subscription = liveQuery(() => db.events.toArray()).subscribe({
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
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [membership.tenantId]);

  const workspace = useMemo(() => {
    const { patients, visits } = foldVisits(events);
    const patient = patients.get(patientId) ?? null;
    const patientVisits = [...visits.entries()]
      .filter(([, visit]) => visit.patientId === patientId)
      .map(([id, visit]) => ({ id, ...visit }))
      .sort((left, right) => right.startsAt.localeCompare(left.startsAt));
    const visit = visitId
      ? (patientVisits.find((item) => item.id === visitId) ?? null)
      : (patientVisits.find((item) =>
          ["pending_review", "confirmed", "waiting", "in_chair"].includes(
            item.status
          )
        ) ?? null);

    return { patient, visit, visits: patientVisits };
  }, [events, patientId, visitId]);

  return { ...workspace, ready };
};

export { usePatientWorkspace };
