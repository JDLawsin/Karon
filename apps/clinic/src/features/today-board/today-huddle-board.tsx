"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useDndContext,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent
} from "@dnd-kit/core";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  Button,
  cn,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  useIsMobile
} from "@karon/design-system";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  DEFAULT_HUDDLE_HOURS,
  canDropOnBoard,
  carryoverLegendByDay,
  currentTimePosition,
  formatSlotLabel,
  groupRowsBySlot,
  huddleTimeSlots,
  huddleWeekDays,
  isReverseBoardDrop,
  shiftClinicDate,
  visitStatusForColumn,
  type HuddleHours
} from "@/features/today-board/huddle-schedule";
import TodayHuddleCard from "@/features/today-board/today-huddle-card";
import {
  BOARD_STATUSES,
  BOARD_STATUS_LABEL,
  VISIT_STATUS_LABEL,
  calendarDateInClinic,
  countByBoardStatus,
  type BoardStatus,
  type TodayBoardRow,
  type TodayHuddle
} from "@/features/today-board/project-today-board";
import { isReverseVisitStatus } from "@/features/today-board/visit-status";
import type { VisitStatus } from "@/lib/sync/event-schema";

type Props = {
  locale: string;
  rows: TodayBoardRow[];
  leftoverByDate?: TodayHuddle["leftoverByDate"];
  now: Date;
  viewDay: string;
  ready: boolean;
  hours?: HuddleHours;
  onViewDay: (day: string) => void;
  onMark: (visitId: string, status: VisitStatus) => void;
  timezone: string;
};

type DraggableVisitProps = {
  locale: string;
  row: TodayBoardRow;
  disabled: boolean;
  showStatus: boolean;
  onMark: (visitId: string, status: VisitStatus) => void;
  timezone: string;
};

type PendingReverse = {
  visitId: string;
  name: string;
  to: VisitStatus;
};

type DropCellProps = {
  locale: string;
  status: BoardStatus;
  slot: number;
  rows: TodayBoardRow[];
  dragDisabled: boolean;
  currentTimeOffset?: number;
  onMark: (visitId: string, status: VisitStatus) => void;
  timezone: string;
};

const LEGEND_DOT: Record<
  "pending_review" | "confirmed" | "waiting" | "in_chair",
  string
> = {
  pending_review: "bg-info text-info-foreground",
  confirmed: "bg-muted-foreground text-background",
  waiting: "bg-primary/70 text-primary-foreground",
  in_chair: "bg-primary text-primary-foreground"
};

const COLUMN_HEADER: Record<BoardStatus, string> = {
  pending_review: "bg-info-subtle text-foreground",
  confirmed: "bg-muted text-foreground",
  late: "bg-warning-subtle text-warning-foreground",
  waiting: "bg-primary/10 text-foreground",
  in_chair: "bg-primary text-primary-foreground",
  complete: "bg-success-subtle text-success"
};

const DraggableVisit = ({
  locale,
  row,
  timezone,
  disabled,
  showStatus,
  onMark
}: DraggableVisitProps) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `${showStatus ? "agenda" : "board"}-${row.visitId}`,
    data: { storedStatus: row.storedStatus, visitId: row.visitId, name: row.name },
    disabled
  });

  return (
    <TodayHuddleCard
      dragProps={{ ...listeners, ...attributes }}
      dragRef={setNodeRef}
      draggable={!disabled}
      isDragging={isDragging}
      locale={locale}
      onMark={onMark}
      row={row}
      showStatus={showStatus}
      timezone={timezone}
    />
  );
};

const DropCell = ({
  locale,
  status,
  slot,
  rows,
  dragDisabled,
  currentTimeOffset,
  onMark,
  timezone
}: DropCellProps) => {
  const { active } = useDndContext();
  const { setNodeRef, isOver } = useDroppable({
    id: `huddle-${status}-${slot}`,
    data: { status }
  });
  const from = active?.data.current?.storedStatus as VisitStatus | undefined;
  const allowed = from ? canDropOnBoard(from, status) : false;
  const reverse = from ? isReverseBoardDrop(from, status) : false;

  return (
    <div
      className={cn(
        "relative z-1 flex min-h-24 min-w-0 flex-col gap-1 rounded-md bg-background/35 p-1",
        isOver && allowed && !reverse && "ring-2 ring-primary",
        isOver && allowed && reverse && "ring-2 ring-warning",
        isOver && !allowed && active && "opacity-60"
      )}
      ref={setNodeRef}
    >
      {rows.length > 0 ? (
        <ul className="relative z-1 flex min-w-0 flex-col gap-1">
          {rows.map((row) => (
            <DraggableVisit
              disabled={dragDisabled}
              key={row.visitId}
              locale={locale}
              onMark={onMark}
              row={row}
              showStatus={false}
              timezone={timezone}
            />
          ))}
        </ul>
      ) : null}
      {currentTimeOffset !== undefined ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 border-t border-primary/70"
          data-current-time
          style={{ top: `${currentTimeOffset}%` }}
        />
      ) : null}
    </div>
  );
};

const TodayHuddleBoard = ({
  locale,
  rows,
  leftoverByDate = {},
  now,
  viewDay,
  ready,
  hours = DEFAULT_HUDDLE_HOURS,
  onViewDay,
  onMark,
  timezone
}: Props) => {
  const isMobile = useIsMobile();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pendingReverse, setPendingReverse] = useState<PendingReverse | null>(
    null
  );
  const realToday = calendarDateInClinic(now.toISOString(), timezone);
  const viewingToday = viewDay === realToday;
  const weekDays = useMemo(
    () => huddleWeekDays(viewDay, realToday, locale),
    [locale, realToday, viewDay]
  );
  const leftoverByDay = useMemo(
    () =>
      carryoverLegendByDay(
        leftoverByDate,
        weekDays.map((day) => day.date),
        realToday
      ),
    [leftoverByDate, realToday, weekDays]
  );
  const slots = useMemo(
    () => huddleTimeSlots(rows, now, viewingToday, hours, timezone),
    [hours, now, rows, timezone, viewingToday]
  );
  const bySlot = useMemo(() => groupRowsBySlot(rows, timezone), [rows, timezone]);
  const counts = useMemo(() => countByBoardStatus(rows), [rows]);
  const currentTime = useMemo(
    () => currentTimePosition(now, timezone),
    [now, timezone]
  );
  const activeRow = rows.find((row) => row.visitId === activeId);
  const mobileScheduleRef = useRef<HTMLDivElement>(null);
  const desktopScheduleRef = useRef<HTMLDivElement>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  useEffect(() => {
    if (!ready || !viewingToday) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      for (const container of [
        mobileScheduleRef.current,
        desktopScheduleRef.current
      ]) {
        if (!container || container.clientHeight === 0) {
          continue;
        }

        const marker = container.querySelector<HTMLElement>(
          "[data-current-time]"
        );

        if (!marker) {
          continue;
        }

        const markerTop =
          marker.getBoundingClientRect().top -
          container.getBoundingClientRect().top +
          container.scrollTop;

        container.scrollTop = Math.max(
          0,
          markerTop - container.clientHeight * 0.35
        );
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [
    hours.close,
    hours.open,
    isMobile,
    ready,
    viewDay,
    viewingToday
  ]);

  const markOrConfirm = (visitId: string, to: VisitStatus, name?: string) => {
    const row = rows.find((item) => item.visitId === visitId);

    if (row && isReverseVisitStatus(row.storedStatus, to)) {
      setPendingReverse({ visitId, name: name ?? row.name, to });
      return;
    }

    onMark(visitId, to);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const visitId = event.active.data.current?.visitId;
    setActiveId(typeof visitId === "string" ? visitId : null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) {
      return;
    }

    const visitId = active.data.current?.visitId;
    const from = active.data.current?.storedStatus as VisitStatus | undefined;
    const name = active.data.current?.name;
    const to = over.data.current?.status as BoardStatus | undefined;

    if (typeof visitId !== "string" || !from || !to || !canDropOnBoard(from, to)) {
      return;
    }

    const next = visitStatusForColumn(to);

    if (!next) {
      return;
    }

    markOrConfirm(visitId, next, typeof name === "string" ? name : undefined);
  };

  return (
    <section
      aria-label="Today huddle"
      className="flex min-h-0 min-w-0 flex-1 flex-col gap-3"
    >
      <TooltipProvider delayDuration={200}>
        <div className="flex min-w-0 items-center gap-1">
          <Button
            aria-label="Previous day"
            className="size-11 min-h-11 shrink-0 self-center px-0 [&_svg]:size-5"
            onClick={() => onViewDay(shiftClinicDate(viewDay, -1))}
            type="button"
            variant="ghost"
          >
            <ChevronLeft />
          </Button>
          <div className="karon-scroll-region-x min-w-0 flex-1 overflow-x-auto">
            <div
              aria-label="Clinic week"
              className="grid min-w-88 grid-cols-7 gap-1"
              role="group"
            >
              {weekDays.map((day) => {
                const selected = day.date === viewDay;
                const dots = leftoverByDay.get(day.date) ?? [];
                const leftover = dots
                  .map(
                    (dot) =>
                      `${dot.count} ${BOARD_STATUS_LABEL[dot.status].toLowerCase()}`
                  )
                  .join(", ");

                return (
                  <div
                    className="flex min-w-0 items-center justify-center gap-0.5"
                    key={day.date}
                  >
                    {dots.length > 0 ? (
                      <span className="grid shrink-0 grid-cols-2 grid-rows-2 gap-px">
                        {dots.map((dot) => (
                          <Tooltip key={dot.status}>
                            <TooltipTrigger asChild>
                              <span
                                className={cn(
                                  "inline-flex size-3 shrink-0 items-center justify-center overflow-hidden rounded-full text-[6px] leading-none tabular-nums",
                                  LEGEND_DOT[dot.status]
                                )}
                              >
                                {dot.count}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              {dot.count} {BOARD_STATUS_LABEL[dot.status].toLowerCase()}
                            </TooltipContent>
                          </Tooltip>
                        ))}
                      </span>
                    ) : null}
                    <button
                      aria-current={day.isToday ? "date" : undefined}
                      aria-label={`${day.weekday} ${day.day}${day.isToday ? ", today" : ""}${leftover ? `, ${leftover}` : ""}`}
                      aria-pressed={selected}
                      className={cn(
                        "group flex min-h-(--control-min-height) min-w-0 flex-col items-center justify-center gap-0.5 rounded-md px-0.5 text-center transition-colors duration-(--motion-duration) hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        selected && "bg-muted"
                      )}
                      onClick={() => onViewDay(day.date)}
                      type="button"
                    >
                      <span
                        className={cn(
                          "text-[10px] leading-none text-muted-foreground",
                          selected && "font-medium text-primary",
                          !selected && "group-hover:text-foreground"
                        )}
                      >
                        {day.weekday}
                      </span>
                      <span
                        className={cn(
                          "flex size-7 items-center justify-center rounded-full text-xs tabular-nums transition-colors duration-(--motion-duration)",
                          selected && "bg-primary text-primary-foreground",
                          !selected && "group-hover:bg-background",
                          !selected && day.isToday && "ring-2 ring-primary"
                        )}
                      >
                        {day.day}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
          <Button
            aria-label="Next day"
            className="size-11 min-h-11 shrink-0 self-center px-0 [&_svg]:size-5"
            onClick={() => onViewDay(shiftClinicDate(viewDay, 1))}
            type="button"
            variant="ghost"
          >
            <ChevronRight />
          </Button>
        </div>
      </TooltipProvider>
      {!ready ? (
        <p
          aria-live="polite"
          className="grid min-h-0 flex-1 place-items-center text-center text-muted-foreground"
        >
          Preparing the schedule...
        </p>
      ) : null}
      {ready && rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No patients this day</p>
      ) : null}
      {ready ? (
        <DndContext
          collisionDetection={pointerWithin}
          onDragEnd={handleDragEnd}
          onDragStart={handleDragStart}
          sensors={sensors}
        >
          <div
            aria-label="Daily schedule"
            className="karon-scroll-region-y relative min-h-0 min-w-0 flex-1 overflow-y-auto rounded-lg bg-surface-sunken p-2 md:hidden"
            ref={mobileScheduleRef}
            role="region"
          >
            {slots.map((slot) => {
              const slotRows = bySlot.get(slot) ?? [];
              const isNow = viewingToday && slot === currentTime.slot;

              if (slotRows.length === 0) {
                return (
                  <div className="relative min-h-24" key={slot}>
                    <p
                      className={cn(
                        "relative z-1 pt-2 text-sm tabular-nums text-muted-foreground",
                        isNow && "font-medium text-primary"
                      )}
                    >
                      {formatSlotLabel(slot, timezone, locale)}
                      {isNow ? " · Now" : ""}
                    </p>
                    {isNow ? (
                      <div
                        aria-hidden
                        className="pointer-events-none absolute right-0 left-16 border-t border-primary/70"
                        data-current-time
                        style={{ top: `${currentTime.offsetPercent}%` }}
                      />
                    ) : null}
                  </div>
                );
              }

              return (
                <section
                  className="relative flex min-h-24 min-w-0 flex-col gap-2"
                  key={slot}
                >
                  <h2 className="flex items-baseline gap-2 text-sm font-medium">
                    <span className="tabular-nums">
                      {formatSlotLabel(slot, timezone, locale)}
                    </span>
                    {isNow ? (
                      <span className="text-xs font-medium text-primary">Now</span>
                    ) : null}
                  </h2>
                  <ul className="relative z-1 flex min-w-0 flex-col gap-2 pl-16">
                    {slotRows.map((row) => (
                      <DraggableVisit
                        disabled
                        key={row.visitId}
                        locale={locale}
                        onMark={markOrConfirm}
                        row={row}
                        showStatus
                        timezone={timezone}
                      />
                    ))}
                  </ul>
                  {isNow ? (
                    <div
                      aria-hidden
                      className="pointer-events-none absolute right-0 left-16 border-t border-primary/70"
                      data-current-time
                      style={{ top: `${currentTime.offsetPercent}%` }}
                    />
                  ) : null}
                </section>
              );
            })}
          </div>
          <div
            aria-label="Daily schedule"
            className="karon-scroll-region-x karon-scroll-region-y relative hidden min-h-0 min-w-0 flex-1 overflow-auto rounded-lg bg-surface-sunken md:block"
            ref={desktopScheduleRef}
            role="region"
          >
            <div
              className="relative grid min-w-6xl gap-2 p-2"
              style={{
                gridTemplateColumns: `3.75rem repeat(${BOARD_STATUSES.length}, minmax(11rem, 1fr))`
              }}
            >
              <div
                aria-hidden="true"
                className="sticky top-0 z-20 bg-surface-sunken"
              />
              {BOARD_STATUSES.map((status) => (
                <div
                  className={cn(
                    "sticky top-0 z-20 rounded-md px-3 py-2",
                    COLUMN_HEADER[status]
                  )}
                  key={status}
                >
                  <h2 className="flex min-w-0 items-baseline justify-between gap-2 text-sm font-medium">
                    <span>{BOARD_STATUS_LABEL[status]}</span>
                    <span className="tabular-nums opacity-80">
                      {counts[status]}
                    </span>
                  </h2>
                </div>
              ))}
              {slots.map((slot) => {
                const isNow = viewingToday && slot === currentTime.slot;

                return (
                  <div className="contents" key={slot}>
                    <p
                      className={cn(
                        "pt-2 text-right text-xs tabular-nums text-muted-foreground",
                        isNow && "font-medium text-primary"
                      )}
                    >
                      {formatSlotLabel(slot, timezone, locale)}
                    </p>
                    {BOARD_STATUSES.map((status) => (
                      <DropCell
                        currentTimeOffset={
                          isNow ? currentTime.offsetPercent : undefined
                        }
                        dragDisabled={isMobile}
                        key={`${status}-${slot}`}
                        locale={locale}
                        onMark={markOrConfirm}
                        rows={(bySlot.get(slot) ?? []).filter(
                          (row) => row.status === status
                        )}
                        slot={slot}
                        status={status}
                        timezone={timezone}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
          <DragOverlay>
            {activeRow ? (
              <ul className="w-72">
                <TodayHuddleCard
                  locale={locale}
                  onMark={markOrConfirm}
                  overlay
                  row={activeRow}
                  showStatus
                  timezone={timezone}
                />
              </ul>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : null}
      <AlertDialog
        onOpenChange={(open) => {
          if (!open) {
            setPendingReverse(null);
          }
        }}
        open={pendingReverse !== null}
      >
        <AlertDialogContent>
          <AlertDialogTitle>
            {pendingReverse
              ? `Move ${pendingReverse.name} back to ${VISIT_STATUS_LABEL[pendingReverse.to].toLowerCase()}?`
              : "Move this visit back?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            Confirm if this visit was marked too soon. The chair record will
            go back to that step.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingReverse) {
                  onMark(pendingReverse.visitId, pendingReverse.to);
                }
              }}
            >
              Move back
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
};

export default TodayHuddleBoard;
