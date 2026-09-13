import {
  CLINIC_TZ,
  calendarDateInClinic,
  clinicLocalParts,
  formatVisitTime,
  startsAtFromClinicLocal,
  type BoardStatus
} from "@/features/today-board/project-today-board";
import { isReverseVisitStatus, transitionVisitStatus } from "@/features/today-board/visit-status";
import type { VisitStatus } from "@/lib/sync/event-schema";

const HUDDLE_SLOT_MINUTES = 30;
const DAY_MS = 86_400_000;
const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/;
const DEFAULT_HUDDLE_HOURS = { open: "09:00", close: "18:00" } as const;

type HuddleHours = {
  open: string;
  close: string;
};

const clinicMinutes = (iso: string, timeZone = CLINIC_TZ) => {
  const { time } = clinicLocalParts(new Date(iso), timeZone);
  const [hours, minutes] = time.split(":").map(Number);

  return hours * 60 + minutes;
};

const slotStart = (minutes: number) =>
  Math.floor(minutes / HUDDLE_SLOT_MINUTES) * HUDDLE_SLOT_MINUTES;

const nowSlotStart = (now: Date, timeZone = CLINIC_TZ) =>
  slotStart(clinicMinutes(now.toISOString(), timeZone));

const minutesFromClock = (clock: string) => {
  if (!CLOCK.test(clock)) {
    return null;
  }

  const [hours, minutes] = clock.split(":").map(Number);

  return hours * 60 + minutes;
};

const huddleHoursOf = (value: unknown): HuddleHours | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const open =
    "open" in value && typeof value.open === "string"
      ? value.open.slice(0, 5)
      : "";
  const close =
    "close" in value && typeof value.close === "string"
      ? value.close.slice(0, 5)
      : "";

  if (!CLOCK.test(open) || !CLOCK.test(close) || open >= close) {
    return null;
  }

  return { open, close };
};

const formatSlotLabel = (minutes: number, timeZone = CLINIC_TZ) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const time = `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;

  return formatVisitTime(startsAtFromClinicLocal("2026-01-01", time), timeZone);
};

const huddleTimeSlots = (
  rows: readonly { startsAt: string }[],
  now: Date,
  viewingToday: boolean,
  hours: HuddleHours = DEFAULT_HUDDLE_HOURS,
  timeZone = CLINIC_TZ
) => {
  const open = minutesFromClock(hours.open) ?? 9 * 60;
  const close = minutesFromClock(hours.close) ?? 18 * 60;
  const start = slotStart(open);
  const lastSlot = slotStart(close);
  const slots = new Set<number>();

  for (
    let minute = start;
    minute <= Math.max(lastSlot, start);
    minute += HUDDLE_SLOT_MINUTES
  ) {
    slots.add(minute);
  }

  for (const row of rows) {
    slots.add(slotStart(clinicMinutes(row.startsAt, timeZone)));
  }

  if (viewingToday) {
    const nowSlot = nowSlotStart(now, timeZone);

    if (nowSlot >= start && nowSlot <= lastSlot) {
      slots.add(nowSlot);
    }
  }

  return [...slots].sort((left, right) => left - right);
};

const groupRowsBySlot = <T extends { startsAt: string }>(
  rows: readonly T[],
  timeZone = CLINIC_TZ
) => {
  const groups = new Map<number, T[]>();

  for (const row of rows) {
    const slot = slotStart(clinicMinutes(row.startsAt, timeZone));
    const list = groups.get(slot);

    if (list) {
      list.push(row);
    } else {
      groups.set(slot, [row]);
    }
  }

  return groups;
};

const visitStatusForColumn = (status: BoardStatus): VisitStatus | null =>
  status === "late" ? null : status;

const canDropOnBoard = (from: VisitStatus, to: BoardStatus) => {
  const target = visitStatusForColumn(to);

  return target !== null && transitionVisitStatus(from, target) !== null;
};

const isReverseBoardDrop = (from: VisitStatus, to: BoardStatus) => {
  const target = visitStatusForColumn(to);

  return target !== null && isReverseVisitStatus(from, target);
};

const huddleWeekDays = (
  centerDate: string,
  todayDate = centerDate,
  timeZone = CLINIC_TZ
) => {
  const center = Date.parse(`${centerDate}T12:00:00+08:00`);

  return [-3, -2, -1, 0, 1, 2, 3].map((offset) => {
    const date = calendarDateInClinic(
      new Date(center + offset * DAY_MS).toISOString(),
      timeZone
    );
    const at = new Date(`${date}T12:00:00+08:00`);

    return {
      date,
      weekday: new Intl.DateTimeFormat("en-PH", {
        timeZone,
        weekday: "short"
      }).format(at),
      day: new Intl.DateTimeFormat("en-PH", {
        timeZone,
        day: "numeric"
      }).format(at),
      isToday: date === todayDate
    };
  });
};

const shiftClinicDate = (date: string, days: number, timeZone = CLINIC_TZ) =>
  calendarDateInClinic(
    new Date(Date.parse(`${date}T12:00:00+08:00`) + days * DAY_MS).toISOString(),
    timeZone
  );

const LEGEND_STATUSES = [
  "pending_review",
  "confirmed",
  "waiting",
  "in_chair"
] as const satisfies readonly BoardStatus[];

const legendStatusOf = (status: BoardStatus) => {
  if (status === "late") {
    return "confirmed";
  }

  return LEGEND_STATUSES.find((item) => item === status) ?? null;
};

const emptyLegendCounts = (): Record<(typeof LEGEND_STATUSES)[number], number> => ({
  pending_review: 0,
  confirmed: 0,
  waiting: 0,
  in_chair: 0
});

const carryoverLegendByDay = (
  leftoverByDate: Readonly<
    Record<string, Partial<Record<BoardStatus, number>>>
  >,
  weekDates: readonly string[],
  today: string
) => {
  const week = new Set(weekDates);
  const counts = new Map(
    weekDates.map((date) => [date, emptyLegendCounts()] as const)
  );

  for (const [origin, bucket] of Object.entries(leftoverByDate)) {
    const date = week.has(origin) ? origin : today;
    const target = counts.get(date);

    if (!target) {
      continue;
    }

    for (const [status, count] of Object.entries(bucket)) {
      const legend = legendStatusOf(status as BoardStatus);

      if (legend && count) {
        target[legend] += count;
      }
    }
  }

  return new Map(
    [...counts].map(([date, bucket]) => [
      date,
      LEGEND_STATUSES.filter((status) => bucket[status] > 0).map((status) => ({
        status,
        count: bucket[status]
      }))
    ])
  );
};

export {
  DEFAULT_HUDDLE_HOURS,
  HUDDLE_SLOT_MINUTES,
  canDropOnBoard,
  carryoverLegendByDay,
  clinicMinutes,
  formatSlotLabel,
  groupRowsBySlot,
  huddleHoursOf,
  huddleTimeSlots,
  huddleWeekDays,
  isReverseBoardDrop,
  nowSlotStart,
  shiftClinicDate,
  slotStart,
  visitStatusForColumn
};
export type { HuddleHours };
