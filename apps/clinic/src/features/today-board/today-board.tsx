"use client";

import {
  Button,
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  PageHeader,
  cn,
  useIsMobile
} from "@karon/design-system";
import { CalendarDays } from "lucide-react";
import { useState } from "react";
import { createPortal } from "react-dom";

import { useClinicChromeActions } from "@/features/auth/clinic-chrome-actions";
import CalendarMatchList from "@/features/google-calendar/calendar-match-list";
import {
  calendarDateInClinic,
  formatClinicDate,
  formatClinicWeekday,
  formatOutstanding
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
    ready,
    now,
    autoConfirm,
    hours,
    isDuplicateMobile,
    addWalkInPatient,
    markVisit
  } = useTodayBoard(viewDay);
  const isMobile = useIsMobile();
  const chromeSlot = useClinicChromeActions();
  const [open, setOpen] = useState(false);
  const selectedDay = viewDay ?? calendarDateInClinic(now.toISOString());
  const selectedAt = new Date(`${selectedDay}T12:00:00+08:00`);
  const viewingToday = selectedDay === calendarDateInClinic(now.toISOString());
  const dateLabel = formatClinicDate(selectedAt);
  const title = viewingToday ? "Today" : formatClinicWeekday(selectedAt);

  const openDrawer = () => setOpen(true);

  return (
    <div className="flex min-w-0 flex-col gap-6">
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
          />
        </DrawerContent>
      </Drawer>
      <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2.6fr)_minmax(16rem,0.85fr)] lg:items-start">
        <div className="flex min-w-0 flex-col gap-4">
          {ready ? (
            <ul className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3">
              <li className="min-w-0 rounded-lg bg-card px-3 py-3">
                <p className="text-sm text-muted-foreground">
                  {viewingToday ? "Patients today" : "Patients this day"}
                </p>
                <p className="text-2xl font-semibold tabular-nums">
                  {huddle.snapshot.patientsToday}
                </p>
              </li>
              <li className="min-w-0 rounded-lg bg-card px-3 py-3">
                <p className="text-sm text-muted-foreground">Arrived</p>
                <p className="text-2xl font-semibold tabular-nums">
                  {huddle.snapshot.arrived}
                </p>
              </li>
              <li className="min-w-0 rounded-lg bg-card px-3 py-3">
                <p className="text-sm text-muted-foreground">To collect</p>
                <p className="text-2xl font-semibold tabular-nums">
                  {formatOutstanding(huddle.snapshot.outstandingPhp)}
                </p>
              </li>
            </ul>
          ) : null}
          <TodayHuddleBoard
            leftoverByDate={huddle.leftoverByDate}
            hours={hours}
            now={now}
            onMark={markVisit}
            onViewDay={setViewDay}
            ready={ready}
            rows={huddle.rows}
            viewDay={selectedDay}
          />
        </div>
        {ready ? (
          <CalendarMatchList autoConfirm={autoConfirm} events={events} />
        ) : null}
      </div>
    </div>
  );
};

export default TodayBoard;
