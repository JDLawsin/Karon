"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  Button,
  Card,
  Label,
  showErrorToast,
  showSuccessToast,
  Skeleton,
  Switch
} from "@karon/design-system";
import { useEffect, useState } from "react";

import GoogleCalendarMark from "@/features/google-calendar/google-calendar-mark";
import { writeAutoConfirm } from "@/features/today-board/local";
import { useClinicSession } from "@/lib/auth/clinic-session";
import { openClinicDb } from "@/lib/db/clinic-db";
import { createBrowserSupabase } from "@/lib/supabase/browser";

const ClinicBookingSettings = () => {
  const { membership } = useClinicSession();
  const [autoConfirm, setAutoConfirm] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [disconnectOpen, setDisconnectOpen] = useState(false);

  useEffect(() => {
    const supabase = createBrowserSupabase();

    void (async () => {
      try {
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
      } finally {
        setLoading(false);
      }
    })();
  }, [membership.tenantId]);

  const saveAutoConfirm = async (next: boolean) => {
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
      showErrorToast("Could not save auto-confirm.");
      setPending(false);
      return;
    }

    setAutoConfirm(next);
    const db = await openClinicDb(membership.tenantId);
    await writeAutoConfirm(db, next);
    showSuccessToast("Booking setting saved.");
    setPending(false);
  };

  const disconnect = async () => {
    setPending(true);
    const response = await fetch("/api/google-calendar/disconnect", { method: "POST" });
    setPending(false);

    if (!response.ok) {
      showErrorToast("Could not disconnect Google Calendar.");
      return;
    }

    setConnected(false);
    showSuccessToast("Google Calendar disconnected.");
  };

  const confirmDisconnect = async () => {
    setDisconnectOpen(false);
    await disconnect();
  };

  const calendarMark = (
    <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-sm bg-background">
      <GoogleCalendarMark className="size-5" />
    </span>
  );

  if (loading) {
    return (
      <Skeleton
        aria-busy
        aria-label="Loading bookings settings"
        className="min-h-52 w-full min-w-0 rounded-lg"
      />
    );
  }

  return (
    <>
      <Card className="gap-3">
        <h2 className="text-lg font-semibold">Bookings</h2>
        <div className="flex min-h-(--control-min-height) items-center gap-3">
          <Switch
            checked={autoConfirm}
            disabled={pending}
            id="auto-confirm-bookings"
            onCheckedChange={(next) => {
              void saveAutoConfirm(next);
            }}
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
          <Button
            disabled={pending}
            onClick={() => setDisconnectOpen(true)}
            type="button"
            variant="outline"
          >
            {calendarMark}
            Disconnect Google Calendar
          </Button>
        ) : (
          <Button asChild disabled={pending}>
            <a href="/api/google-calendar/connect">
              {calendarMark}
              Connect Google Calendar
            </a>
          </Button>
        )}
      </Card>

      <AlertDialog onOpenChange={setDisconnectOpen} open={disconnectOpen}>
        <AlertDialogContent>
          <AlertDialogTitle>Disconnect Google Calendar?</AlertDialogTitle>
          <AlertDialogDescription>
            New Google bookings will stop syncing until you connect again.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                void confirmDisconnect();
              }}
            >
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ClinicBookingSettings;
