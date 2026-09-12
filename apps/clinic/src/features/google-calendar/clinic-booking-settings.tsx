"use client";

import { Alert, Button, Label } from "@karon/design-system";
import { useEffect, useState } from "react";

import { writeAutoConfirm } from "@/features/today-board/local";
import { useClinicSession } from "@/lib/auth/clinic-session";
import { openClinicDb } from "@/lib/db/clinic-db";
import { createBrowserSupabase } from "@/lib/supabase/browser";

const ClinicBookingSettings = () => {
  const { membership } = useClinicSession();
  const [autoConfirm, setAutoConfirm] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const supabase = createBrowserSupabase();

    void (async () => {
      const { data } = await supabase
        .from("clinics")
        .select("auto_confirm_bookings")
        .eq("id", membership.tenantId)
        .maybeSingle();

      if (typeof data?.auto_confirm_bookings === "boolean") {
        setAutoConfirm(data.auto_confirm_bookings);
      }

      const status = await fetch("/api/google-calendar/status");
      const json = (await status.json().catch(() => null)) as {
        configured?: boolean;
        connected?: boolean;
      } | null;

      setConfigured(Boolean(json?.configured));
      setConnected(Boolean(json?.connected));
    })();
  }, [membership.tenantId]);

  const saveAutoConfirm = async (next: boolean) => {
    setError(null);
    setInfo(null);
    setPending(true);
    const supabase = createBrowserSupabase();
    const { error: saveError } = await supabase
      .from("clinics")
      .update({
        auto_confirm_bookings: next,
        updated_at: new Date().toISOString()
      })
      .eq("id", membership.tenantId);

    if (saveError) {
      setError("Could not save auto-confirm.");
      setPending(false);
      return;
    }

    setAutoConfirm(next);
    const db = await openClinicDb(membership.tenantId);
    await writeAutoConfirm(db, next);
    setInfo("Booking setting saved.");
    setPending(false);
  };

  const disconnect = async () => {
    setError(null);
    setPending(true);
    const response = await fetch("/api/google-calendar/disconnect", { method: "POST" });
    setPending(false);

    if (!response.ok) {
      setError("Could not disconnect Google Calendar.");
      return;
    }

    setConnected(false);
    setInfo("Google Calendar disconnected.");
  };

  return (
    <section className="flex max-w-xl flex-col gap-4 rounded-lg border-(length:var(--surface-border-width)) border-border bg-card p-4">
      <h2 className="text-lg font-semibold">Bookings</h2>
      <div className="flex min-h-(--control-min-height) items-center gap-3">
        <input
          checked={autoConfirm}
          className="size-5"
          disabled={pending}
          id="auto-confirm-bookings"
          onChange={(event) => {
            void saveAutoConfirm(event.target.checked);
          }}
          type="checkbox"
        />
        <Label htmlFor="auto-confirm-bookings">Auto-confirm bookings</Label>
      </div>
      <p className="text-sm text-muted-foreground">
        When off, new bookings wait in pending review before chair time.
      </p>
      {!configured ? (
        <p className="text-sm text-muted-foreground">
          Google Calendar connect is not configured on this server.
        </p>
      ) : connected ? (
        <Button disabled={pending} onClick={() => void disconnect()} type="button" variant="outline">
          Disconnect Google Calendar
        </Button>
      ) : (
        <Button asChild disabled={pending}>
          <a href="/api/google-calendar/connect">Connect Google Calendar</a>
        </Button>
      )}
      {error ? <Alert title={error} variant="danger" /> : null}
      {info ? <Alert title={info} variant="info" /> : null}
    </section>
  );
};

export default ClinicBookingSettings;
