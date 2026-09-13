"use client";

// Deferred: Google Calendar — keep for later reconnect

import { Alert, Button, Input, Label, cn } from "@karon/design-system";
import { useEffect, useState } from "react";

import { addBooking } from "@/features/today-board/local";
import {
  formatVisitTime,
  patientsFromEvents
} from "@/features/today-board/project-today-board";
import { useClinicSession } from "@/lib/auth/clinic-session";
import { openClinicDb } from "@/lib/db/clinic-db";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import type { ClinicEvent } from "@/lib/sync/event-schema";

type ImportRow = {
  id: string;
  google_event_id: string;
  attendee_name: string;
  attendee_email: string | null;
  starts_at: string;
  description: string | null;
};

type Props = {
  autoConfirm: boolean;
  events: ClinicEvent[];
};

const CalendarMatchList = ({ autoConfirm, events }: Props) => {
  const { membership, userId } = useClinicSession();
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [mobileById, setMobileById] = useState<Record<string, string>>({});
  const [matchById, setMatchById] = useState<Record<string, string>>({});
  const [matchError, setMatchError] = useState<string | null>(null);
  const patients = patientsFromEvents(events);

  useEffect(() => {
    const supabase = createBrowserSupabase();

    void (async () => {
      const { data } = await supabase
        .from("calendar_imports")
        .select(
          "id, google_event_id, attendee_name, attendee_email, starts_at, description"
        )
        .eq("tenant_id", membership.tenantId)
        .eq("status", "unmatched")
        .order("starts_at", { ascending: true });

      setRows((data as ImportRow[] | null) ?? []);
    })();
  }, [membership.tenantId, events.length]);

  const markMatched = async (row: ImportRow, visitId: string) => {
    const supabase = createBrowserSupabase();
    const { data, error } = await supabase
      .from("calendar_imports")
      .update({
        status: "matched",
        visit_id: visitId,
        updated_at: new Date().toISOString()
      })
      .eq("id", row.id)
      .eq("tenant_id", membership.tenantId)
      .eq("status", "unmatched")
      .select("id");

    if (error || !data?.[0]) {
      setMatchError("Could not mark that Google booking as matched. Try again.");
      return;
    }

    setMatchError(null);
    setRows((current) => current.filter((item) => item.id !== row.id));
  };

  return (
    <section
      className={cn(
        "flex min-w-0 flex-col gap-3 rounded-lg bg-card p-3 lg:sticky lg:top-4",
        rows.length === 0 && "max-lg:hidden"
      )}
    >
      <h2 className="text-sm font-medium">New Google bookings</h2>
      {matchError ? <Alert title={matchError} variant="danger" /> : null}
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No new Google bookings</p>
      ) : (
      <ul className="flex min-w-0 flex-col gap-3">
        {rows.map((row) => (
          <li
            className="flex min-w-0 flex-col gap-3 rounded-lg border-(length:var(--surface-border-width)) border-border bg-card p-3"
            key={row.id}
          >
            <p className="font-medium">{row.attendee_name}</p>
            <p className="text-sm text-muted-foreground">
              {formatVisitTime(row.starts_at)}
              {row.attendee_email ? ` · ${row.attendee_email}` : ""}
            </p>
            <div className="flex min-w-0 flex-col gap-2">
              <Label htmlFor={`match-mobile-${row.id}`}>Mobile for new patient</Label>
              <Input
                id={`match-mobile-${row.id}`}
                inputMode="tel"
                onChange={(event) =>
                  setMobileById((current) => ({
                    ...current,
                    [row.id]: event.target.value
                  }))
                }
                value={mobileById[row.id] ?? ""}
              />
            </div>
            <div className="flex min-w-0 flex-wrap gap-2">
              <Button
                onClick={async () => {
                  const mobile = (mobileById[row.id] ?? "").trim();

                  if (!mobile) {
                    return;
                  }

                  const db = await openClinicDb(membership.tenantId);
                  const { visitId } = await addBooking(db, {
                    tenantId: membership.tenantId,
                    actorUserId: userId,
                    name: row.attendee_name,
                    mobile,
                    email: row.attendee_email ?? undefined,
                    startsAt: row.starts_at,
                    autoConfirm,
                    googleEventId: row.google_event_id
                  });
                  await markMatched(row, visitId);
                }}
                type="button"
              >
                New patient
              </Button>
              {patients.length > 0 ? (
                <>
                  <select
                    aria-label={`Match ${row.attendee_name} to an existing patient`}
                    className="min-h-(--control-min-height) min-w-0 flex-1 rounded-md border-(length:var(--surface-border-width)) border-border bg-background px-3 text-sm"
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
                    onClick={async () => {
                      const patientId = matchById[row.id];
                      const patient = patients.find((item) => item.id === patientId);

                      if (!patient) {
                        return;
                      }

                      const db = await openClinicDb(membership.tenantId);
                      const { visitId } = await addBooking(db, {
                        tenantId: membership.tenantId,
                        actorUserId: userId,
                        name: patient.name,
                        mobile: patient.mobile,
                        email: row.attendee_email ?? patient.email,
                        patientId: patient.id,
                        startsAt: row.starts_at,
                        autoConfirm,
                        googleEventId: row.google_event_id
                      });
                      await markMatched(row, visitId);
                    }}
                    type="button"
                    variant="outline"
                  >
                    Match
                  </Button>
                </>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      )}
    </section>
  );
};

export default CalendarMatchList;
