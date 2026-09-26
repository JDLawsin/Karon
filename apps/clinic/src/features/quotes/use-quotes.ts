"use client";

import { useMemo, useState } from "react";

import { createQuote, type CreateQuoteInput } from "@/features/quotes/local";
import { quoteHistoryForPatient } from "@/features/quotes/quote-history";
import { useClinicSession } from "@/lib/auth/clinic-session";
import { openClinicDb } from "@/lib/db/clinic-db";
import type { ClinicEvent } from "@/lib/sync/event-schema";

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

    setSaving(true);

    try {
      const db = await openClinicDb(membership.tenantId);

      await createQuote(
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

  return { accept, quotes, saving };
};

export { useQuotes };
