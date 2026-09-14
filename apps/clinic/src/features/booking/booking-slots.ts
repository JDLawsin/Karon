import {
  HUDDLE_SLOT_MINUTES,
  clinicMinutes,
  huddleHoursOf,
  slotStart
} from "@/features/today-board/huddle-schedule";
import {
  calendarDateInClinic,
  clinicLocalParts,
  foldVisits,
  formatVisitTime
} from "@/features/today-board/project-today-board";
import type { ClinicEvent } from "@/lib/sync/event-schema";

const BOOKING_HORIZON_DAYS = 14;
const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/;
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

type BookableHours = {
  days: number[];
  open: string;
  close: string;
};

type BookingSlot = {
  clock: string;
  startsAt: string;
  label: string;
};

const minutesFromClock = (clock: string) => {
  if (!CLOCK.test(clock)) {
    return null;
  }

  const [hours, minutes] = clock.split(":").map(Number);

  return hours * 60 + minutes;
};

const clockFromMinutes = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
};

const clinicHoursOf = (value: unknown): BookableHours | null => {
  const window = huddleHoursOf(value);

  if (!window || !value || typeof value !== "object" || !("days" in value)) {
    return null;
  }

  if (!Array.isArray(value.days)) {
    return null;
  }

  const days = [
    ...new Set(
      value.days.filter(
        (day): day is number =>
          typeof day === "number" && Number.isInteger(day) && day >= 0 && day <= 6
      )
    )
  ].sort((left, right) => left - right);

  if (days.length === 0) {
    return null;
  }

  return { days, open: window.open, close: window.close };
};

// ponytail: offset-guess is enough for PH (no DST); use Temporal.ZonedDateTime if we book across DST zones
const instantFromClinicLocal = (date: string, time: string, timeZone: string) => {
  const clock = time.slice(0, 5);
  const guess = new Date(`${date}T${clock}:00Z`);
  const parts = clinicLocalParts(guess, timeZone);
  const delta =
    Date.parse(`${parts.date}T${parts.time}:00Z`) - Date.parse(`${date}T${clock}:00Z`);

  return new Date(guess.getTime() - delta);
};

const weekdaySun0 = (date: string, timeZone: string) => {
  const instant = instantFromClinicLocal(date, "12:00", timeZone);
  const name = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short"
  }).format(instant);

  return WEEKDAYS.indexOf(name as (typeof WEEKDAYS)[number]);
};

const addCalendarDays = (date: string, days: number) => {
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days));

  return next.toISOString().slice(0, 10);
};

const occupiedSlotKey = (iso: string, timeZone: string) => {
  const at = new Date(iso);

  if (Number.isNaN(at.getTime())) {
    return null;
  }

  return `${calendarDateInClinic(iso, timeZone)}:${slotStart(clinicMinutes(iso, timeZone))}`;
};

const occupiedVisitStarts = (events: readonly ClinicEvent[]) =>
  [...foldVisits([...events]).visits.values()].flatMap((visit) =>
    visit.status === "cancelled" ? [] : [visit.startsAt]
  );

const visitOccupiesSlot = (
  events: readonly ClinicEvent[],
  startsAt: string,
  timeZone: string
) => {
  const target = occupiedSlotKey(startsAt, timeZone);

  if (!target) {
    return false;
  }

  return occupiedVisitStarts(events).some(
    (iso) => occupiedSlotKey(iso, timeZone) === target
  );
};

const bookableDates = (
  hours: BookableHours,
  timeZone: string,
  now: Date,
  horizonDays = BOOKING_HORIZON_DAYS
) => {
  const today = calendarDateInClinic(now.toISOString(), timeZone);
  const dates: string[] = [];

  for (let offset = 0; offset < horizonDays; offset += 1) {
    const date = addCalendarDays(today, offset);
    const weekday = weekdaySun0(date, timeZone);

    if (hours.days.includes(weekday)) {
      dates.push(date);
    }
  }

  return dates;
};

const bookingSlotsForDate = (input: {
  date: string;
  hours: BookableHours;
  timeZone: string;
  occupied: readonly string[];
  now: Date;
}): BookingSlot[] => {
  const weekday = weekdaySun0(input.date, input.timeZone);

  if (!input.hours.days.includes(weekday)) {
    return [];
  }

  const open = minutesFromClock(input.hours.open);
  const close = minutesFromClock(input.hours.close);

  if (open === null || close === null || open >= close) {
    return [];
  }

  const taken = new Set(
    input.occupied.flatMap((iso) => {
      const key = occupiedSlotKey(iso, input.timeZone);

      return key ? [key] : [];
    })
  );
  const today = calendarDateInClinic(input.now.toISOString(), input.timeZone);
  const slots: BookingSlot[] = [];

  for (
    let minute = open;
    minute + HUDDLE_SLOT_MINUTES <= close;
    minute += HUDDLE_SLOT_MINUTES
  ) {
    const clock = clockFromMinutes(minute);
    const starts = instantFromClinicLocal(input.date, clock, input.timeZone);

    if (input.date === today && starts.getTime() <= input.now.getTime()) {
      continue;
    }

    if (taken.has(`${input.date}:${minute}`)) {
      continue;
    }

    slots.push({
      clock,
      startsAt: starts.toISOString(),
      label: formatVisitTime(starts.toISOString(), input.timeZone)
    });
  }

  return slots;
};

const offeredBookingSlot = (input: {
  startsAt: Date;
  hours: BookableHours;
  timeZone: string;
  occupied: readonly string[];
  now: Date;
}) => {
  if (Number.isNaN(input.startsAt.getTime())) {
    return null;
  }

  const date = calendarDateInClinic(input.startsAt.toISOString(), input.timeZone);

  if (!bookableDates(input.hours, input.timeZone, input.now).includes(date)) {
    return null;
  }

  return (
    bookingSlotsForDate({
      date,
      hours: input.hours,
      timeZone: input.timeZone,
      occupied: input.occupied,
      now: input.now
    }).find((row) => new Date(row.startsAt).getTime() === input.startsAt.getTime()) ?? null
  );
};

export {
  BOOKING_HORIZON_DAYS,
  bookableDates,
  bookingSlotsForDate,
  clinicHoursOf,
  instantFromClinicLocal,
  occupiedSlotKey,
  occupiedVisitStarts,
  offeredBookingSlot,
  visitOccupiesSlot
};
export type { BookableHours, BookingSlot };
