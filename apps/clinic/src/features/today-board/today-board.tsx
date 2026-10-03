"use client";

import {
  Alert,
  Button,
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  PageHeader,
  StatusBadge,
  cn,
  useIsMobile
} from "@karon/design-system";
import { CalendarDays, ChevronDown } from "lucide-react";
import { useState } from "react";
import { createPortal } from "react-dom";

import { useClinicChromeActions } from "@/features/auth/clinic-chrome-actions";
import BookingInbox from "@/features/booking/booking-inbox";
import {
  calendarDateInClinic,
  countByBoardStatus,
  formatClinicDate,
  formatClinicWeekday
} from "@/features/today-board/project-today-board";
import TodayHuddleBoard from "@/features/today-board/today-huddle-board";
import { useTodayBoard } from "@/features/today-board/use-today-board";
import WalkInForm from "@/features/today-board/walk-in-form";

type DateControlProps = {
  className?: string;
  label: string;
  value: string;
  onChange: (day: string) => void;
};

const DateControl = ({ className, label, value, onChange }: DateControlProps) => (
  <label
    className={cn(
      "relative inline-flex h-(--control-min-height) min-h-(--control-min-height) min-w-0 cursor-pointer items-center gap-2 rounded-md px-3 text-sm font-medium transition-[color,background-color,transform] duration-(--motion-duration) hover:scale-(--control-hover-scale) hover:bg-muted",
      className
    )}
  >
    <CalendarDays aria-hidden className="size-5 shrink-0" />
    <span className="min-w-0 truncate tabular-nums">{label}</span>
    <input
      aria-label={`Clinic date, ${label}`}
      className="absolute inset-0 cursor-pointer opacity-0"
      onChange={(event) => {
        if (event.target.value) {
          onChange(event.target.value);
        }
      }}
      onClick={(event) => {
        try {
          event.currentTarget.showPicker?.();
        } catch {
          // Click still opens the native picker when showPicker is blocked.
        }
      }}
      type="date"
      value={value}
    />
  </label>
);

const TodayBoard = () => {
  const [viewDay, setViewDay] = useState<string | undefined>();
  const {
    huddle,
    events,
    patients,
    ready,
    now,
    autoConfirm,
    hours,
    regionalSettings,
    regionalError,
    isDuplicateMobile,
    addWalkInPatient,
    markVisit
  } = useTodayBoard(viewDay);
  const isMobile = useIsMobile();
  const chromeSlot = useClinicChromeActions();
  const [open, setOpen] = useState(false);
  const [bookingsOpen, setBookingsOpen] = useState(false);
  const [pendingBookingCount, setPendingBookingCount] = useState(0);

  if (!regionalSettings) {
    return regionalError ? (
      <Alert title={regionalError} variant="danger" />
    ) : (
      <p aria-live="polite" className="text-muted-foreground">
        Loading clinic settings...
      </p>
    );
  }

  const { locale, timezone } = regionalSettings;
  const selectedDay =
    viewDay ?? calendarDateInClinic(now.toISOString(), timezone);
  const selectedAt = new Date(`${selectedDay}T12:00:00Z`);
  const viewingToday =
    selectedDay === calendarDateInClinic(now.toISOString(), timezone);
  const dateLabel = formatClinicDate(selectedAt, "UTC", locale);
  const title =
    viewingToday ? "Today" : formatClinicWeekday(selectedAt, "UTC", locale);
  const counts = countByBoardStatus(huddle.rows);
  const bookedCount = counts.pending_review + counts.confirmed;

  const openDrawer = () => setOpen(true);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden">
      <PageHeader description={dateLabel} title={title}>
        <DateControl
          className="hidden md:inline-flex"
          label={dateLabel}
          onChange={setViewDay}
          value={selectedDay}
        />
        <Button
          className="hidden md:inline-flex"
          onClick={openDrawer}
          type="button"
        >
          Add patient
        </Button>
      </PageHeader>
      {chromeSlot
        ? createPortal(
            <div className="flex min-w-0 items-center">
              <DateControl
                className="max-w-36 px-2 hover:scale-100"
                label={dateLabel}
                onChange={setViewDay}
                value={selectedDay}
              />
              <Button
                className="h-11 min-h-11 shrink-0 px-3 text-sm text-primary hover:scale-100"
                onClick={openDrawer}
                type="button"
                variant="ghost"
              >
                Add patient
              </Button>
            </div>,
            chromeSlot
          )
        : null}
      <Drawer
        onOpenChange={setOpen}
        open={open}
        showSwipeHandle={isMobile}
        swipeDirection={isMobile ? "down" : "right"}
      >
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Add patient</DrawerTitle>
            <DrawerDescription>
              Book for any day. They start as confirmed or pending review.
            </DrawerDescription>
          </DrawerHeader>
          <WalkInForm
            isDuplicateMobile={isDuplicateMobile}
            onSave={async (draft) => {
              await addWalkInPatient(draft);
              setOpen(false);
            }}
            patients={patients}
            timezone={timezone}
          />
        </DrawerContent>
      </Drawer>
      {pendingBookingCount > 0 ? (
        <a
          aria-live="polite"
          className="flex min-h-(--control-min-height) min-w-0 items-center justify-between gap-3 rounded-lg bg-warning-subtle px-4 py-3 text-warning-foreground transition-transform duration-(--motion-duration) hover:scale-(--surface-hover-scale) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          href="#booking-inbox"
          onClick={() => setBookingsOpen(true)}
        >
          <span className="font-medium">
            {pendingBookingCount} booking {pendingBookingCount === 1 ? "request" : "requests"}
          </span>
          <span className="shrink-0 text-sm">Open inbox</span>
        </a>
      ) : null}
      {ready ? (
        <p
          aria-label="Day status"
          className="rounded-lg bg-card px-4 py-3 text-sm font-medium tabular-nums text-foreground"
        >
          {dateLabel} · {counts.waiting} waiting · {counts.late} late ·{" "}
          {counts.in_chair} in chair · {bookedCount} booked
        </p>
      ) : null}
      <div className="grid min-h-0 min-w-0 flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)_auto] gap-4 md:grid-cols-[minmax(0,1fr)_minmax(14rem,0.7fr)] md:grid-rows-1">
        <div className="flex min-h-0 min-w-0 flex-col">
          <TodayHuddleBoard
            leftoverByDate={huddle.leftoverByDate}
            hours={hours}
            now={now}
            onMark={markVisit}
            onViewDay={setViewDay}
            ready={ready}
            rows={huddle.rows}
            viewDay={selectedDay}
            locale={locale}
            timezone={timezone}
          />
        </div>
        {ready ? (
          <details
            className="group min-h-0 min-w-0 overflow-hidden rounded-lg bg-card md:flex md:flex-col md:rounded-none md:bg-transparent"
            onToggle={(event) => {
              if (isMobile) {
                setBookingsOpen(event.currentTarget.open);
              }
            }}
            open={!isMobile || bookingsOpen}
          >
            <summary className="flex min-h-(--control-min-height) cursor-pointer list-none items-center gap-2 px-4 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden [&::-webkit-details-marker]:hidden">
              <span className="min-w-0 flex-1">New bookings</span>
              <StatusBadge tone={pendingBookingCount > 0 ? "warning" : "neutral"}>
                {String(pendingBookingCount) + " pending"}
              </StatusBadge>
              <ChevronDown
                aria-hidden
                className="size-5 shrink-0 transition-transform duration-(--motion-duration) group-open:rotate-180"
              />
            </summary>
            <div className="karon-scroll-region-y max-h-[35dvh] min-h-0 overflow-y-auto md:max-h-none md:flex-1">
              <BookingInbox
                autoConfirm={autoConfirm}
                events={events}
                locale={locale}
                onPendingCountChange={setPendingBookingCount}
                timezone={timezone}
              />
            </div>
          </details>
        ) : null}
      </div>
    </div>
  );
};

export default TodayBoard;
