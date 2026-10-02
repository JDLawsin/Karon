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
import Link from "next/link";
import { useEffect, useState } from "react";

import { bookingIndexingMissingItems } from "@/features/booking/booking-indexing";
import {
  bookingLinkResponseSchema,
  bookingSettingsClinicSchema
} from "@/features/booking/booking-schemas";
import { writeAutoConfirm } from "@/features/today-board/local";
import { useClinicSession } from "@/lib/auth/clinic-session";
import { openClinicDb } from "@/lib/db/clinic-db";
import { createBrowserSupabase } from "@/lib/supabase/browser";

const ClinicBookingSettings = () => {
  const { membership } = useClinicSession();
  const [autoConfirm, setAutoConfirm] = useState(true);
  const [indexable, setIndexable] = useState(false);
  const [missingItems, setMissingItems] = useState<
    ReturnType<typeof bookingIndexingMissingItems>
  >([]);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const supabase = createBrowserSupabase();

    void (async () => {
      try {
        const [{ data }, { count: serviceCount }] = await Promise.all([
          supabase
          .from("clinics")
          .select(
            "auto_confirm_bookings, booking_page_indexable, name, phone, address, hours"
          )
          .eq("id", membership.tenantId)
          .maybeSingle(),
          supabase
            .from("clinic_services")
            .select("id", { count: "exact", head: true })
            .eq("tenant_id", membership.tenantId)
        ]);
        const clinic = bookingSettingsClinicSchema.safeParse(data);

        if (clinic.success) {
          setAutoConfirm(clinic.data.auto_confirm_bookings);
          setIndexable(clinic.data.booking_page_indexable);
          setMissingItems(
            bookingIndexingMissingItems(clinic.data, serviceCount ?? 0)
          );
        }

        if (membership.role === "owner") {
          const response = await fetch("/api/booking-link");
          const json: unknown = await response.json().catch(() => null);
          const link = bookingLinkResponseSchema.safeParse(json);

          if (response.ok && link.success) {
            setUrl(link.data.url);
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [membership.role, membership.tenantId]);

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

  const saveIndexable = async (next: boolean) => {
    setPending(true);
    const supabase = createBrowserSupabase();
    const { error } = await supabase
      .from("clinics")
      .update({
        booking_page_indexable: next,
        updated_at: new Date().toISOString()
      })
      .eq("id", membership.tenantId);

    if (error) {
      showErrorToast("Could not update search visibility.");
      setPending(false);
      return;
    }

    setIndexable(next);
    showSuccessToast(
      next
        ? "Your booking page can now appear in search. Search engines update on their own schedule."
        : "Your booking page is hidden from search again. It can take a while for search engines to drop it."
    );
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
      {membership.role === "owner" ? (
        <>
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
        </>
      ) : null}
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
      ) : membership.role === "owner" ? (
        <p className="text-sm text-muted-foreground">Could not create a booking link.</p>
      ) : null}
      <div className="mt-2 flex min-w-0 flex-col gap-3 border-t border-border pt-4">
        <div className="flex min-h-(--control-min-height) items-center gap-3">
          <Switch
            checked={indexable}
            disabled={
              pending || membership.role !== "owner" || missingItems.length > 0
            }
            id="booking-page-indexable"
            onCheckedChange={(next) => {
              void saveIndexable(next);
            }}
          />
          <Label htmlFor="booking-page-indexable">
            Let Google show your booking page
          </Label>
        </div>
        <p className="text-sm text-muted-foreground">
          Opting in makes your booking page discoverable in search.
        </p>
        <div className="text-sm">
          <p className="font-medium text-foreground">What becomes public</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
            <li>Clinic name and logo</li>
            <li>Address and hours</li>
            <li>Services and open slot times</li>
          </ul>
        </div>
        <p className="text-sm text-foreground">
          Patient names, numbers, and requests are never shown.
        </p>
        {membership.role !== "owner" ? (
          <p className="text-sm text-muted-foreground">
            Only the Owner can change this.
          </p>
        ) : missingItems.length > 0 ? (
          <div className="text-sm text-muted-foreground">
            <p>Finish these first:</p>
            <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-2">
              {missingItems.map((item) => (
                <li key={item.label}>
                  <Link className="text-primary underline underline-offset-4" href={item.href}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </Card>
  );
};

export default ClinicBookingSettings;
