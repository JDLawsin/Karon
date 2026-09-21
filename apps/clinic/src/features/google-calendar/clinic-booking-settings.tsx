"use client";

// Deferred: Google Calendar — keep for later reconnect

import {
  Alert,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  Button,
  Card,
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  Input,
  Label,
  showErrorToast,
  showSuccessToast,
  Skeleton,
  Switch,
  useIsMobile
} from "@karon/design-system";
import { useEffect, useState } from "react";

import BookingPageLink from "@/features/google-calendar/booking-page-link";
import GoogleCalendarMark from "@/features/google-calendar/google-calendar-mark";
import { writeAutoConfirm } from "@/features/today-board/local";
import { useClinicSession } from "@/lib/auth/clinic-session";
import { openClinicDb } from "@/lib/db/clinic-db";
import { createBrowserSupabase } from "@/lib/supabase/browser";

type BookingPage = {
  name: string;
  url: string;
  scheduleKey: string;
};

type CalendarOption = {
  id: string;
  summary: string;
  primary: boolean;
};

type CalendarStatus = {
  configured?: boolean;
  connected?: boolean;
  calendarId?: string | null;
  bookingPages?: BookingPage[];
  calendars?: CalendarOption[];
  reconnect?: boolean;
};

const selectClassName =
  "min-h-(--control-min-height) w-full min-w-0 rounded-md border-(length:var(--surface-border-width)) border-border bg-background px-3 text-sm";

const ClinicBookingSettings = () => {
  const { membership } = useClinicSession();
  const isMobile = useIsMobile();
  const [autoConfirm, setAutoConfirm] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [connected, setConnected] = useState(false);
  const [reconnect, setReconnect] = useState(false);
  const [calendarId, setCalendarId] = useState("primary");
  const [calendars, setCalendars] = useState<CalendarOption[]>([]);
  const [pages, setPages] = useState<BookingPage[]>([]);
  const [pageName, setPageName] = useState("");
  const [pageUrl, setPageUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
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
        const json = (await status.json().catch(() => null)) as CalendarStatus | null;

        setConfigured(Boolean(json?.configured));
        setConnected(Boolean(json?.connected));
        setReconnect(Boolean(json?.reconnect));
        setCalendarId(json?.calendarId ?? "primary");
        setCalendars(json?.calendars ?? []);
        setPages(json?.bookingPages ?? []);
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

  const persist = async (nextCalendarId: string, nextPages: BookingPage[]) => {
    setPending(true);
    const response = await fetch("/api/google-calendar/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        calendarId: nextCalendarId,
        bookingPages: nextPages.map((page) => ({ name: page.name, url: page.url }))
      })
    });
    const json = (await response.json().catch(() => null)) as {
      calendarId?: string;
      bookingPages?: BookingPage[];
    } | null;
    setPending(false);

    if (!response.ok || !json?.calendarId || !json.bookingPages) {
      showErrorToast(
        response.status === 400
          ? "That is not a Google booking page link."
          : "Could not save Google Calendar settings."
      );
      return false;
    }

    setCalendarId(json.calendarId);
    setPages(json.bookingPages);
    showSuccessToast("Booking setting saved.");
    return true;
  };

  const selectedCalendarId = () => {
    if (calendars.some((row) => row.id === calendarId)) {
      return calendarId;
    }

    if (calendarId === "primary") {
      return calendars.find((row) => row.primary)?.id ?? calendarId;
    }

    return calendarId;
  };

  const calendarOptions = (() => {
    if (!calendarId || calendars.some((row) => row.id === calendarId)) {
      return calendars;
    }

    if (calendarId === "primary" && calendars.some((row) => row.primary)) {
      return calendars;
    }

    return [
      {
        id: calendarId,
        summary: calendarId === "primary" ? "Primary calendar" : calendarId,
        primary: calendarId === "primary"
      },
      ...calendars
    ];
  })();

  const disconnect = async () => {
    setPending(true);
    const response = await fetch("/api/google-calendar/disconnect", { method: "POST" });
    setPending(false);

    if (!response.ok) {
      showErrorToast("Could not disconnect Google Calendar.");
      return;
    }

    setConnected(false);
    setReconnect(false);
    setCalendars([]);
    setPages([]);
    setCalendarId("primary");
    setDrawerOpen(false);
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
        className="min-h-36 w-full min-w-0 rounded-lg"
      />
    );
  }

  return (
    <>
      <Card className="gap-3">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <h2 className="min-w-0 text-lg font-semibold">Bookings</h2>
          {configured && connected ? (
            <Button
              className="shrink-0"
              disabled={pending}
              onClick={() => setDrawerOpen(true)}
              type="button"
              variant="outline"
            >
              Booking pages
            </Button>
          ) : null}
        </div>
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
          <div className="flex min-w-0 flex-col gap-3">
            {reconnect ? (
              <>
                <Alert title="Reconnect Google Calendar to list your calendars." />
                <Button asChild disabled={pending} variant="outline">
                  <a href="/api/google-calendar/connect">
                    {calendarMark}
                    Reconnect Google Calendar
                  </a>
                </Button>
              </>
            ) : null}
            <Button
              disabled={pending}
              onClick={() => setDisconnectOpen(true)}
              type="button"
              variant="outline"
            >
              {calendarMark}
              Disconnect Google Calendar
            </Button>
          </div>
        ) : (
          <Button asChild disabled={pending}>
            <a href="/api/google-calendar/connect">
              {calendarMark}
              Connect Google Calendar
            </a>
          </Button>
        )}
      </Card>

      <Drawer
        onOpenChange={setDrawerOpen}
        open={drawerOpen}
        showSwipeHandle={isMobile}
        swipeDirection={isMobile ? "down" : "right"}
      >
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Booking pages</DrawerTitle>
            <DrawerDescription>
              Paste each clinic booking page from Google Calendar → Copy link.
              Other pages on that calendar are ignored. Add at least one page or
              nothing imports.
            </DrawerDescription>
          </DrawerHeader>
          <div className="karon-scroll-region-y flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-y-auto px-6 pb-6">
            {reconnect ? (
              <Alert title="Reconnect Google Calendar to list your calendars." />
            ) : null}
            <div className="flex min-w-0 flex-col gap-2">
              <Label htmlFor="google-calendar-id">Calendar</Label>
              <select
                className={selectClassName}
                disabled={pending || calendarOptions.length === 0}
                id="google-calendar-id"
                onChange={(event) => {
                  void persist(event.target.value, pages);
                }}
                value={selectedCalendarId()}
              >
                {calendarOptions.map((calendar) => (
                  <option key={calendar.id} value={calendar.id}>
                    {calendar.summary}
                    {calendar.primary ? " (primary)" : ""}
                  </option>
                ))}
              </select>
            </div>
            {pages.length > 0 ? (
              <ul className="flex min-w-0 flex-col gap-2">
                {pages.map((page) => (
                  <li className="min-w-0" key={page.scheduleKey}>
                    <BookingPageLink
                      disabled={pending}
                      name={page.name}
                      onRemove={() => {
                        void persist(
                          selectedCalendarId(),
                          pages.filter((row) => row.scheduleKey !== page.scheduleKey)
                        );
                      }}
                      url={page.url}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No booking pages yet.</p>
            )}
            <div className="flex min-w-0 flex-col gap-2">
              <Label htmlFor="booking-page-name">Booking page name</Label>
              <Input
                disabled={pending}
                id="booking-page-name"
                onChange={(event) => setPageName(event.target.value)}
                value={pageName}
              />
            </div>
            <div className="flex min-w-0 flex-col gap-2">
              <Label htmlFor="booking-page-url">Booking page link</Label>
              <Input
                disabled={pending}
                id="booking-page-url"
                inputMode="url"
                onChange={(event) => setPageUrl(event.target.value)}
                value={pageUrl}
              />
            </div>
            <Button
              disabled={pending || pageUrl.trim().length === 0}
              onClick={async () => {
                const saved = await persist(selectedCalendarId(), [
                  ...pages,
                  {
                    name: pageName.trim(),
                    url: pageUrl.trim(),
                    scheduleKey: pageUrl.trim()
                  }
                ]);

                if (saved) {
                  setPageName("");
                  setPageUrl("");
                }
              }}
              type="button"
            >
              Add booking page
            </Button>
          </div>
        </DrawerContent>
      </Drawer>

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
