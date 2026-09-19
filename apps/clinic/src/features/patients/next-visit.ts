import { z } from "zod";

import { foldVisits } from "@/features/today-board/project-today-board";
import type { ClinicEvent } from "@/lib/sync/event-schema";

const clinicDateSchema = z.iso.date();
const clinicTimeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

const nextVisitDraftSchema = z.object({
  date: clinicDateSchema,
  time: clinicTimeSchema,
  serviceName: z.string().trim().min(1).max(80)
});

type ReminderInput = {
  clinicName: string;
  startsAt: string;
  timeZone: string;
};

const localDateTimeParts = (instant: Date, timeZone: string) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(instant);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return {
    date: `${read("year")}-${read("month")}-${read("day")}`,
    time: `${read("hour")}:${read("minute")}`
  };
};

const clinicDateTimeToUtc = (date: string, time: string, timeZone: string) => {
  const parsedDate = clinicDateSchema.parse(date);
  const parsedTime = clinicTimeSchema.parse(time);
  const [year = 0, month = 0, day = 0] = parsedDate.split("-").map(Number);
  const [hour = 0, minute = 0] = parsedTime.split(":").map(Number);
  const target = Date.UTC(year, month - 1, day, hour, minute);
  let instant = target;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const local = localDateTimeParts(new Date(instant), timeZone);
    const [localYear = 0, localMonth = 0, localDay = 0] = local.date
      .split("-")
      .map(Number);
    const [localHour = 0, localMinute = 0] = local.time.split(":").map(Number);
    const represented = Date.UTC(
      localYear,
      localMonth - 1,
      localDay,
      localHour,
      localMinute
    );
    instant += target - represented;
  }

  const resolved = new Date(instant);
  const local = localDateTimeParts(resolved, timeZone);

  if (local.date !== parsedDate || local.time !== parsedTime) {
    throw new Error("That clinic time is not available.");
  }

  return resolved.toISOString();
};

const buildReminderText = ({
  clinicName,
  startsAt,
  timeZone
}: ReminderInput) => {
  const dateTime = new Intl.DateTimeFormat("en-PH", {
    timeZone,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(startsAt));

  return `Hi! Reminder from ${clinicName.trim()}: ${dateTime}. See you then.`;
};

const hasActiveVisitAt = (events: ClinicEvent[], startsAt: string) =>
  [...foldVisits(events).visits.values()].some(
    (visit) =>
      visit.startsAt === startsAt &&
      visit.status !== "cancelled" &&
      visit.status !== "no_show"
  );

export {
  buildReminderText,
  clinicDateTimeToUtc,
  hasActiveVisitAt,
  nextVisitDraftSchema
};
