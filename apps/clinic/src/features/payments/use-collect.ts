"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { recordPayment, type RecordPaymentInput } from "@/features/payments/local";
import { parseCollectBalance } from "@/features/payments/payment-balance";
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

const visitBalanceKey = (tenantId: string, patientId: string, visitId?: string) =>
  ["visit-balance", tenantId, patientId, visitId] as const;

const fetchVisitBalance = async (
  tenantId: string,
  patientId: string,
  visitId: string
) => {
  const supabase = createBrowserSupabase();
  const { data, error } = await supabase
    .rpc("get_visit_balance", {
      p_tenant_id: tenantId,
      p_patient_id: patientId,
      p_visit_id: visitId
    })
    .maybeSingle();

  if (error) {
    throw new Error("Could not load the remaining balance. Check the connection and try again.");
  }

  return data ? parseCollectBalance(data) : null;
};

const useCollect = (
  patientId: string,
  visitId: string | undefined
) => {
  const { membership, userId } = useClinicSession();
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();
  const queryKey = visitBalanceKey(membership.tenantId, patientId, visitId);
  const balanceQuery = useQuery({
    enabled: Boolean(visitId),
    queryKey,
    queryFn: () => fetchVisitBalance(membership.tenantId, patientId, visitId!)
  });
  const balance = balanceQuery.data ?? null;

  const collect = async (
    input: Pick<RecordPaymentInput, "amountMinor" | "currency" | "method">
  ) => {
    if (!visitId || !balance) {
      throw new Error("Accept a quote for this visit before collecting payment.");
    }

    if (!navigator.onLine) {
      throw new Error("Payments need a connection right now. Reconnect and try again.");
    }

    if (input.currency !== balance.currency || input.amountMinor > balance.remainingMinor) {
      throw new Error("Enter an amount no greater than the remaining balance.");
    }

    setSaving(true);

    try {
      const db = await openClinicDb(membership.tenantId);
      const supabase = createBrowserSupabase();

      await recordPayment(
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

          if (error && error.code !== "23505") {
            throw new Error("Could not record the payment. Check the connection and try again.");
          }
        }
      );
      await queryClient.invalidateQueries({ queryKey });
    } finally {
      setSaving(false);
    }
  };

  return {
    balance,
    balanceError:
      balanceQuery.error instanceof Error ? balanceQuery.error.message : null,
    balanceLoading: Boolean(visitId) && balanceQuery.isLoading,
    collect,
    saving
  };
};

export { useCollect };
