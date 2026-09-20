"use client";

import { useMemo, useState } from "react";

import { createQuote, type CreateQuoteInput } from "@/features/quotes/local";
import { quoteHistoryForPatient } from "@/features/quotes/quote-history";
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

const useQuotes = (
  patientId: string,
  visitId: string | undefined,
  events: readonly ClinicEvent[]
) => {
  const { membership, userId } = useClinicSession();
  const [saving, setSaving] = useState(false);
  const quotes = useMemo(
    () => quoteHistoryForPatient(events, patientId),
    [events, patientId]
  );

  const accept = async (
    input: Pick<CreateQuoteInput, "lines" | "totalMinor" | "currency">
  ) => {
    if (!visitId) {
      throw new Error("Open an active visit before creating a quote.");
    }

    if (!navigator.onLine) {
      throw new Error("Quotes need a connection right now. Reconnect and try again.");
    }

    setSaving(true);

    try {
      const db = await openClinicDb(membership.tenantId);
      const supabase = createBrowserSupabase();

      await createQuote(
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
            throw new Error("Could not save the quote. Check the connection and try again.");
          }
        }
      );
    } finally {
      setSaving(false);
    }
  };

  return { accept, quotes, saving };
};

export { useQuotes };
