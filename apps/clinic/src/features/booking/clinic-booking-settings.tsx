"use client";

import {
  Button,
  Card,
  Input,
  Label,
  Skeleton,
  Switch,
  showErrorToast,
  showSuccessToast
} from "@karon/design-system";
import { Copy } from "lucide-react";
import { useEffect, useState } from "react";

import { bookingLinkResponseSchema } from "@/features/booking/booking-schemas";
import { writeAutoConfirm } from "@/features/today-board/local";
import { useClinicSession } from "@/lib/auth/clinic-session";
import { openClinicDb } from "@/lib/db/clinic-db";
import { createBrowserSupabase } from "@/lib/supabase/browser";

const ClinicBookingSettings = () => {
  const { membership } = useClinicSession();
  const [autoConfirm, setAutoConfirm] = useState(true);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);

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

        const response = await fetch("/api/booking-link");
        const json: unknown = await response.json().catch(() => null);
        const link = bookingLinkResponseSchema.safeParse(json);

        if (response.ok && link.success) {
          setUrl(link.data.url);
        }
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

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      showSuccessToast("Link copied.");
    } catch {
      showErrorToast("Could not copy link.");
    }
  };

  if (loading) {
    return (
      <Skeleton
        aria-busy
        aria-label="Loading bookings settings"
        className="min-h-36 w-full min-w-0 rounded-lg"
      />
    );
  }

  return (
    <Card className="gap-3">
      <h2 className="min-w-0 text-lg font-semibold">Bookings</h2>
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
        When off, accepted bookings wait in pending review before chair time.
        Customers book during clinic hours in the clinic timezone.
      </p>
      {url ? (
        <div className="flex min-w-0 flex-col gap-2">
          <Label htmlFor="booking-link-url">Booking link</Label>
          <div className="flex min-w-0 items-center gap-1">
            <Input
              aria-label="Booking link"
              className="min-w-0 flex-1"
              id="booking-link-url"
              onFocus={(event) => event.currentTarget.select()}
              readOnly
              value={url}
            />
            <Button
              aria-label="Copy booking link"
              className="w-(--control-min-height) shrink-0 px-0"
              disabled={pending}
              onClick={() => {
                void copy();
              }}
              type="button"
              variant="outline"
            >
              <Copy />
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Could not create a booking link.</p>
      )}
    </Card>
  );
};

export default ClinicBookingSettings;
