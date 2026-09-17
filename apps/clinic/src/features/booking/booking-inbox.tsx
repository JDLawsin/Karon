"use client";

import { Alert, Button, StatusBadge } from "@karon/design-system";
import { Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { InboxRow } from "@/features/booking/booking-inbox-live";
import { visitOccupiesSlot } from "@/features/booking/booking-slots";
import { useLiveBookingRequests } from "@/features/booking/use-live-booking-requests";
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

type Props = {
  autoConfirm: boolean;
  events: ClinicEvent[];
  onPendingCountChange?: (count: number) => void;
};

const BookingInbox = ({ autoConfirm, events, onPendingCountChange }: Props) => {
  const { membership, userId } = useClinicSession();
  const {
    rows,
    ready,
    loadError,
    soundState,
    setSoundMuted,
    enableSound,
    removeRow,
    restoreRow
  } = useLiveBookingRequests(membership.tenantId);
  const [matchById, setMatchById] = useState<Record<string, string>>({});
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const busyRef = useRef(false);
  const patients = patientsFromEvents(events);

  useEffect(() => {
    onPendingCountChange?.(rows.length);
  }, [onPendingCountChange, rows.length]);

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
    removeRow(row.id);
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

    restoreRow(row);
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
    <section className="flex min-w-0 flex-col gap-3 rounded-lg bg-card p-3 lg:sticky lg:top-4" id="booking-inbox">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <h2 className="mr-auto text-sm font-medium">New bookings</h2>
        <StatusBadge aria-live="polite" tone={rows.length > 0 ? "warning" : "neutral"}>
          {`${rows.length} pending`}
        </StatusBadge>
        <StatusBadge tone={soundState === "on" ? "info" : "neutral"}>
          {soundState === "on" ? "Soft chime on" : "Sound off"}
        </StatusBadge>
        <Button
          aria-pressed={soundState !== "on"}
          className="min-h-11"
          onClick={() => {
            if (soundState !== "on") {
              void enableSound();
              return;
            }

            setSoundMuted(true);
          }}
          type="button"
          variant="outline"
        >
          {soundState === "on" ? (
            <VolumeX aria-hidden className="size-4" />
          ) : (
            <Volume2 aria-hidden className="size-4" />
          )}
          {soundState === "on" ? "Mute" : "Turn on"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Sound setting is saved on this clinic browser.
      </p>
      {soundState === "blocked" ? (
        <Alert title="Sound blocked" variant="info">
          <div className="flex min-w-0 flex-col items-start gap-2">
            <p>Badge and attention strip are still active.</p>
            <Button className="min-h-11" onClick={() => void enableSound()} type="button" variant="outline">
              Enable sound
            </Button>
          </div>
        </Alert>
      ) : null}
      {soundState === "muted" ? (
        <Alert title="Muted by you" variant="info">
          Badge and attention strip stay active.
        </Alert>
      ) : null}
      {loadError ? <Alert title={loadError} variant="danger" /> : null}
      {actionError ? <Alert title={actionError} variant="danger" /> : null}
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {ready ? "No new bookings" : "Checking for new bookings…"}
        </p>
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
