"use client";

import { useMemo, useState } from "react";

import { chartHistoryForPatient } from "@/features/odontogram/chart-history";
import { appendChartEntry, type AppendChartEntryInput } from "@/features/odontogram/local";
import { useClinicSession } from "@/lib/auth/clinic-session";
import { openClinicDb } from "@/lib/db/clinic-db";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import type { ClinicEvent } from "@/lib/sync/event-schema";

const toInsertRow = (event: ClinicEvent) => ({
  id: event.id,
  tenant_id: event.tenantId,
  actor_user_id: event.actorUserId,
  event_type: event.type,
  record_id: event.recordId,
  payload: event.payload,
  occurred_at: event.occurredAt
});

const useOdontogram = (
  patientId: string,
  visitId: string | undefined,
  events: readonly ClinicEvent[]
) => {
  const { membership, userId } = useClinicSession();
  const [saving, setSaving] = useState(false);
  const entries = useMemo(
    () => chartHistoryForPatient(events, patientId),
    [events, patientId]
  );

  const append = async (
    input: Pick<AppendChartEntryInput, "toothCode" | "finding" | "note">
  ) => {
    if (!visitId) {
      throw new Error("Open an active visit before charting.");
    }

    if (!navigator.onLine) {
      throw new Error("Charting needs a connection right now. Reconnect and try again.");
    }

    setSaving(true);

    try {
      const db = await openClinicDb(membership.tenantId);
      const supabase = createBrowserSupabase();

      await appendChartEntry(
        db,
        {
          ...input,
          patientId,
          visitId,
          tenantId: membership.tenantId,
          actorUserId: userId
        },
        async (event) => {
          const { error } = await supabase.from("clinic_events").insert(toInsertRow(event));

          if (error) {
            throw new Error("Could not save the chart entry. Check the connection and try again.");
          }
        }
      );
    } finally {
      setSaving(false);
    }
  };

  return { append, entries, saving };
};

export { useOdontogram };
