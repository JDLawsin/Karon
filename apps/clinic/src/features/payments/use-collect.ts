"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { liveQuery } from "dexie";
import { useEffect, useMemo, useState } from "react";

import { recordPayment, type RecordPaymentInput } from "@/features/payments/local";
import {
  applyPendingPayments,
  collectBalanceForVisit,
  collectBalanceSnapshotKey,
  parseCollectBalance,
  parseCollectBalanceSnapshot,
  type CollectBalance
} from "@/features/payments/payment-balance";
import { useClinicSession } from "@/lib/auth/clinic-session";
import { openClinicDb } from "@/lib/db/clinic-db";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import {
  quoteCreatedPayloadSchema,
  type ClinicEvent
} from "@/lib/sync/event-schema";

const visitBalanceKey = (tenantId: string, patientId: string, visitId?: string) =>
  ["visit-balance", tenantId, patientId, visitId] as const;

const fetchVisitBalance = async (
  tenantId: string,
  patientId: string,
  visitId: string
) => {
  const { data, error } = await createBrowserSupabase()
    .rpc("get_visit_balance", {
      p_tenant_id: tenantId,
      p_patient_id: patientId,
      p_visit_id: visitId
    })
    .maybeSingle();

  if (error) {
    throw new Error("Could not load the remaining balance. Check the connection and try again.");
  }

  const db = await openClinicDb(tenantId);
  const key = collectBalanceSnapshotKey(patientId, visitId);

  if (!data) {
    await db.meta.delete(key);
    return null;
  }

  const balance = parseCollectBalance(data);
  await db.meta.put({ key, value: JSON.stringify(balance) });
  return balance;
};

const useCollect = (
  patientId: string,
  visitId: string | undefined,
  events: readonly ClinicEvent[]
) => {
  const { membership, syncStatus, userId } = useClinicSession();
  const [saving, setSaving] = useState(false);
  const [localState, setLocalState] = useState<{
    optimisticIds: ReadonlySet<string>;
    snapshot: CollectBalance | null;
    ready: boolean;
  }>({ optimisticIds: new Set(), snapshot: null, ready: false });
  const queryClient = useQueryClient();
  const queryKey = useMemo(
    () => visitBalanceKey(membership.tenantId, patientId, visitId),
    [membership.tenantId, patientId, visitId]
  );
  const localBalance = useMemo(
    () =>
      visitId ? collectBalanceForVisit(events, patientId, visitId) : null,
    [events, patientId, visitId]
  );
  const balanceQuery = useQuery({
    enabled: syncStatus.online && Boolean(visitId),
    queryKey,
    queryFn: () => fetchVisitBalance(membership.tenantId, patientId, visitId!)
  });

  useEffect(() => {
    if (!visitId) {
      return;
    }

    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    void (async () => {
      const db = await openClinicDb(membership.tenantId);

      if (cancelled) {
        return;
      }

      const key = collectBalanceSnapshotKey(patientId, visitId);
      const subscription = liveQuery(async () => {
        const [outbox, snapshot] = await Promise.all([
          db.outbox.toArray(),
          db.meta.get(key)
        ]);
        return {
          optimisticIds: new Set(
            outbox.filter(({ attempts }) => attempts === 0).map(({ id }) => id)
          ),
          snapshot: parseCollectBalanceSnapshot(snapshot?.value)
        };
      }).subscribe({
        next: (state) => {
          if (!cancelled) {
            setLocalState({ ...state, ready: true });
          }
        },
        error: () => {
          if (!cancelled) {
            setLocalState({ optimisticIds: new Set(), snapshot: null, ready: true });
          }
        }
      });
      unsubscribe = () => subscription.unsubscribe();
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [membership.tenantId, patientId, visitId]);

  const optimisticKey = [...localState.optimisticIds].sort().join(":");

  useEffect(() => {
    if (syncStatus.online && visitId && localState.ready) {
      void queryClient.invalidateQueries({ queryKey });
    }
  }, [localState.ready, optimisticKey, queryClient, queryKey, syncStatus.online, visitId]);

  const hasPendingQuote = events.some((event) => {
    if (event.type !== "quote.created" || !localState.optimisticIds.has(event.id)) {
      return false;
    }

    const payload = quoteCreatedPayloadSchema.safeParse(event.payload);
    return (
      payload.success &&
      payload.data.patientId === patientId &&
      payload.data.visitId === visitId
    );
  });
  const authoritativeBalance = syncStatus.online
    ? (balanceQuery.data ?? null)
    : localState.snapshot;
  const pendingQuoteBalance =
    hasPendingQuote &&
    localBalance &&
    authoritativeBalance?.currency === localBalance.currency
      ? {
          ...localBalance,
          paidMinor: authoritativeBalance.paidMinor,
          remainingMinor: Math.max(
            localBalance.quoteTotalMinor - authoritativeBalance.paidMinor,
            0
          )
        }
      : null;
  const useLocalProjection =
    !authoritativeBalance && (!syncStatus.online || hasPendingQuote);
  const baseBalance = pendingQuoteBalance ??
    authoritativeBalance ??
    (useLocalProjection ? localBalance : null);
  const balance =
    baseBalance && !useLocalProjection
      ? applyPendingPayments(
          baseBalance,
          events,
          localState.optimisticIds,
          patientId,
          visitId ?? ""
        )
      : baseBalance;

  const collect = async (
    input: Pick<RecordPaymentInput, "amountMinor" | "currency" | "method">
  ) => {
    if (!visitId || !balance) {
      throw new Error("Accept a quote for this visit before collecting payment.");
    }

    if (input.currency !== balance.currency || input.amountMinor > balance.remainingMinor) {
      throw new Error("Enter an amount no greater than the remaining balance.");
    }

    setSaving(true);

    try {
      const db = await openClinicDb(membership.tenantId);

      await recordPayment(
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

  return {
    balance,
    balanceError:
      syncStatus.online && balanceQuery.error instanceof Error
        ? balanceQuery.error.message
        : null,
    balanceLoading:
      Boolean(visitId) &&
      (!localState.ready || (syncStatus.online && balanceQuery.isFetching)),
    collect,
    saving
  };
};

export { useCollect };
