"use client";

import {
  Button,
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  PageHeader,
  useIsMobile
} from "@karon/design-system";
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { useClinicChromeActions } from "@/features/auth/clinic-chrome-actions";
import CalendarMatchList from "@/features/google-calendar/calendar-match-list";
import {
  BOARD_STATUSES,
  BOARD_STATUS_LABEL,
  VISIT_STATUS_LABEL,
  countByBoardStatus,
  formatClinicDate,
  formatOutstanding,
  formatVisitTime
} from "@/features/today-board/project-today-board";
import TodayStatusGroup from "@/features/today-board/today-status-group";
import { useTodayBoard } from "@/features/today-board/use-today-board";
import WalkInForm from "@/features/today-board/walk-in-form";

const TodayBoard = () => {
  const {
    huddle,
    events,
    ready,
    now,
    autoConfirm,
    isDuplicateMobile,
    addWalkInPatient,
    markVisit
  } = useTodayBoard();
  const isMobile = useIsMobile();
  const chromeSlot = useClinicChromeActions();
  const [open, setOpen] = useState(false);
  const counts = useMemo(() => countByBoardStatus(huddle.rows), [huddle.rows]);
  const todayLabel = formatClinicDate(now);

  const openDrawer = () => setOpen(true);

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader description={todayLabel} title="Today">
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
            <Button
              className="h-11 min-h-11 shrink-0 px-3 text-sm text-primary hover:scale-100"
              onClick={openDrawer}
              type="button"
              variant="ghost"
            >
              Add patient
            </Button>,
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
      {ready ? (
        <CalendarMatchList autoConfirm={autoConfirm} events={events} />
      ) : null}
      {ready ? (
        <ul className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3">
          <li className="min-w-0 rounded-lg border-(length:var(--surface-border-width)) border-border bg-card px-3 py-3">
            <p className="text-sm text-muted-foreground">Patients today</p>
            <p className="text-2xl font-semibold tabular-nums">
              {huddle.snapshot.patientsToday}
            </p>
          </li>
          <li className="min-w-0 rounded-lg border-(length:var(--surface-border-width)) border-border bg-card px-3 py-3">
            <p className="text-sm text-muted-foreground">Arrived</p>
            <p className="text-2xl font-semibold tabular-nums">
              {huddle.snapshot.arrived}
            </p>
          </li>
          <li className="min-w-0 rounded-lg border-(length:var(--surface-border-width)) border-border bg-card px-3 py-3">
            <p className="text-sm text-muted-foreground">To collect</p>
            <p className="text-2xl font-semibold tabular-nums">
              {formatOutstanding(huddle.snapshot.outstandingPhp)}
            </p>
          </li>
        </ul>
      ) : null}
      {huddle.rows.length > 0 ? (
        <ul className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {BOARD_STATUSES.map((status) => (
            <li
              className="min-w-0 rounded-lg border-(length:var(--surface-border-width)) border-border bg-card px-3 py-3 transition-transform duration-(--motion-duration) hover:scale-(--surface-hover-scale)"
              key={status}
            >
              <p className="text-sm text-muted-foreground">
                {BOARD_STATUS_LABEL[status]}
              </p>
              <p className="text-2xl font-semibold tabular-nums">
                {counts[status]}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
      {huddle.carryover.length > 0 ? (
        <section className="flex min-w-0 flex-col gap-2">
          <h2 className="text-sm font-medium">Carryover</h2>
          <ul className="flex min-w-0 flex-col gap-1">
            {huddle.carryover.map((row) => (
              <li
                className="flex min-h-(--control-min-height) min-w-0 flex-wrap items-center gap-2 border-b-(length:var(--surface-border-width)) border-border py-2 last:border-b-0"
                key={row.visitId}
              >
                <p className="shrink-0 tabular-nums text-sm text-muted-foreground">
                  {formatVisitTime(row.startsAt)}
                </p>
                <p className="min-w-0 flex-1 truncate font-medium">{row.name}</p>
                <p className="text-sm text-muted-foreground">
                  {VISIT_STATUS_LABEL[row.storedStatus]}
                </p>
                {row.storedStatus === "pending_review" ||
                row.storedStatus === "confirmed" ||
                row.storedStatus === "waiting" ||
                row.storedStatus === "in_chair" ? (
                  <Button
                    aria-label={`Mark ${row.name} ${
                      row.storedStatus === "in_chair"
                        ? "complete"
                        : row.storedStatus === "waiting"
                          ? "in chair"
                          : "waiting"
                    }`}
                    onClick={() =>
                      void markVisit(
                        row.visitId,
                        row.storedStatus === "in_chair"
                          ? "complete"
                          : row.storedStatus === "waiting"
                            ? "in_chair"
                            : "waiting"
                      )
                    }
                    type="button"
                    variant="outline"
                  >
                    {row.storedStatus === "in_chair"
                      ? "Complete"
                      : row.storedStatus === "waiting"
                        ? "In chair"
                        : "Waiting"}
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {ready && huddle.rows.length === 0 ? (
        <p className="text-muted-foreground">No patients today</p>
      ) : null}
      {huddle.rows.length > 0 ? (
        <div className="flex min-w-0 flex-col gap-6 md:grid md:grid-cols-2 md:gap-3 xl:grid-cols-6">
          {BOARD_STATUSES.map((status) => (
            <TodayStatusGroup
              key={status}
              onMark={markVisit}
              rows={huddle.rows.filter((row) => row.status === status)}
              status={status}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
};

export default TodayBoard;
