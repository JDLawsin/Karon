"use client";

import { Alert, Button, cn } from "@karon/design-system";
import { useEffect, useRef, useState } from "react";

import { inboxRowSchema } from "@/features/booking/booking-schemas";
import { visitOccupiesSlot } from "@/features/booking/booking-slots";
import { addBooking } from "@/features/today-board/local";
import {
  CLINIC_TZ,
  formatVisitTime,
  patientsFromEvents
} from "@/features/today-board/project-today-board";
import { useClinicSession } from "@/lib/auth/clinic-session";
import { openClinicDb } from "@/lib/db/clinic-db";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import type { ClinicEvent } from "@/lib/sync/event-schema";

type InboxRow = {
  id: string;
  name: string;
  mobile: string;
  serviceName: string;
  note: string | null;
  startsAt: string;
};

type Props = {
  autoConfirm: boolean;
  events: ClinicEvent[];
  onPendingCountChange?: (count: number) => void;
};

const BookingInbox = ({ autoConfirm, events, onPendingCountChange }: Props) => {
  const { membership, userId } = useClinicSession();
  const [rows, setRows] = useState<InboxRow[]>([]);
  const [matchById, setMatchById] = useState<Record<string, string>>({});
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const busyRef = useRef(false);
  const patients = patientsFromEvents(events);

  useEffect(() => {
    onPendingCountChange?.(rows.length);
  }, [onPendingCountChange, rows.length]);

  useEffect(() => {
    const supabase = createBrowserSupabase();

    void (async () => {
      const { data } = await supabase
        .from("booking_requests")
        .select("id, name, mobile, service_name, note, starts_at")
        .eq("tenant_id", membership.tenantId)
        .eq("status", "pending")
        .order("starts_at", { ascending: true });
      const parsed = (data ?? []).flatMap((row) => {
        const result = inboxRowSchema.safeParse(row);

        if (!result.success) {
          return [];
        }

        return [
          {
            id: result.data.id,
            name: result.data.name,
            mobile: result.data.mobile,
            serviceName: result.data.service_name,
            note: result.data.note,
            startsAt: result.data.starts_at
          }
        ];
      });

      setRows(parsed);
    })();
  }, [membership.tenantId, events.length]);

  const mark = async (row: InboxRow, status: "accepted" | "declined") => {
    const supabase = createBrowserSupabase();
    const { data, error } = await supabase
      .from("booking_requests")
      .update({
        status,
        visit_id: null,
        updated_at: new Date().toISOString()
      })
      .eq("id", row.id)
      .eq("tenant_id", membership.tenantId)
      .eq("status", "pending")
      .select("id");

    if (error || !data?.[0]) {
      setActionError("Could not update that booking. Try again.");
      return false;
    }

    setActionError(null);
    setRows((current) => current.filter((item) => item.id !== row.id));
    return true;
  };

  const revertAccepted = async (row: InboxRow) => {
    const supabase = createBrowserSupabase();

    await supabase
      .from("booking_requests")
      .update({
        status: "pending",
        visit_id: null,
        updated_at: new Date().toISOString()
      })
      .eq("id", row.id)
      .eq("tenant_id", membership.tenantId)
      .eq("status", "accepted");

    setRows((current) =>
      current.some((item) => item.id === row.id)
        ? current
        : [...current, row].sort((left, right) => left.startsAt.localeCompare(right.startsAt))
    );
  };

  const accept = async (
    row: InboxRow,
    patient?: { id: string; name: string; mobile: string; email?: string }
  ) => {
    if (busyRef.current) {
      return;
    }

    busyRef.current = true;
    setBusyId(row.id);

    try {
      if (visitOccupiesSlot(events, row.startsAt, CLINIC_TZ)) {
        setActionError("That time already has a visit on the board.");
        return;
      }

      const claimed = await mark(row, "accepted");

      if (!claimed) {
        return;
      }

      let visitId: string;

      try {
        const db = await openClinicDb(membership.tenantId);
        ({ visitId } = await addBooking(db, {
          tenantId: membership.tenantId,
          actorUserId: userId,
          name: patient?.name ?? row.name,
          mobile: patient?.mobile ?? row.mobile,
          email: patient?.email,
          patientId: patient?.id,
          startsAt: row.startsAt,
          autoConfirm,
          serviceName: row.serviceName,
          note: row.note ?? undefined
        }));
      } catch {
        await revertAccepted(row);
        setActionError("Could not save that booking on this device. Try again.");
        return;
      }

      const supabase = createBrowserSupabase();

      await supabase
        .from("booking_requests")
        .update({
          visit_id: visitId,
          updated_at: new Date().toISOString()
        })
        .eq("id", row.id)
        .eq("tenant_id", membership.tenantId)
        .eq("status", "accepted");
    } finally {
      busyRef.current = false;
      setBusyId(null);
    }
  };

  const decline = async (row: InboxRow) => {
    if (busyRef.current) {
      return;
    }

    busyRef.current = true;
    setBusyId(row.id);

    try {
      await mark(row, "declined");
    } finally {
      busyRef.current = false;
      setBusyId(null);
    }
  };

  return (
    <section
      className={cn(
        "flex min-w-0 flex-col gap-3 rounded-lg bg-card p-3 lg:sticky lg:top-4",
        rows.length === 0 && "max-lg:hidden"
      )}
      id="booking-inbox"
    >
      <h2 className="text-sm font-medium">New bookings</h2>
      {actionError ? <Alert title={actionError} variant="danger" /> : null}
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No new bookings</p>
      ) : (
        <ul className="flex min-w-0 flex-col gap-3">
          {rows.map((row) => (
            <li
              className="flex min-w-0 flex-col gap-3 rounded-lg border-(length:var(--surface-border-width)) border-border bg-card p-3"
              key={row.id}
            >
              <p className="font-medium">{row.name}</p>
              <p className="text-sm text-muted-foreground">
                {formatVisitTime(row.startsAt)}
                {` · ${row.mobile}`}
              </p>
              <p className="text-sm">{row.serviceName}</p>
              {row.note ? <p className="text-sm text-muted-foreground">{row.note}</p> : null}
              <div className="flex min-w-0 flex-wrap gap-2">
                <Button
                  disabled={Boolean(busyId)}
                  onClick={() => {
                    void accept(row);
                  }}
                  type="button"
                >
                  New patient
                </Button>
                {patients.length > 0 ? (
                  <>
                    <select
                      aria-label={`Match ${row.name} to an existing patient`}
                      className="min-h-(--control-min-height) min-w-0 flex-1 rounded-md border-(length:var(--surface-border-width)) border-border bg-background px-3 text-sm"
                      disabled={Boolean(busyId)}
                      onChange={(event) =>
                        setMatchById((current) => ({
                          ...current,
                          [row.id]: event.target.value
                        }))
                      }
                      value={matchById[row.id] ?? ""}
                    >
                      <option value="">Existing patient</option>
                      {patients.map((patient) => (
                        <option key={patient.id} value={patient.id}>
                          {patient.name}
                        </option>
                      ))}
                    </select>
                    <Button
                      disabled={Boolean(busyId)}
                      onClick={() => {
                        const patient = patients.find((item) => item.id === matchById[row.id]);

                        if (!patient) {
                          return;
                        }

                        void accept(row, patient);
                      }}
                      type="button"
                      variant="outline"
                    >
                      Match
                    </Button>
                  </>
                ) : null}
                <Button
                  disabled={Boolean(busyId)}
                  onClick={() => {
                    void decline(row);
                  }}
                  type="button"
                  variant="outline"
                >
                  Decline
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default BookingInbox;
