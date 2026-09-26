"use client";

import { useMemo, useState } from "react";

import { chartHistoryForPatient } from "@/features/odontogram/chart-history";
import { appendChartEntry, type AppendChartEntryInput } from "@/features/odontogram/local";
import { useClinicSession } from "@/lib/auth/clinic-session";
import { openClinicDb } from "@/lib/db/clinic-db";
import type { ClinicEvent } from "@/lib/sync/event-schema";

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

    setSaving(true);

    try {
      const db = await openClinicDb(membership.tenantId);

      await appendChartEntry(
        db,
        {
          ...input,
          patientId,
          visitId,
          tenantId: membership.tenantId,
          actorUserId: userId
        }
      );
    } finally {
      setSaving(false);
    }
  };

  return { append, entries, saving };
};

export { useOdontogram };
