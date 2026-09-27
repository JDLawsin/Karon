import { z } from "zod";

import { foldVisits } from "@/features/today-board/project-today-board";
import type { ClinicEvent } from "@/lib/sync/event-schema";
import { clinicDateTimeToUtc } from "@/lib/clinic/regional-settings";

const clinicDateSchema = z.iso.date();
const clinicTimeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

const nextVisitDraftSchema = z.object({
  date: clinicDateSchema,
  time: clinicTimeSchema,
  serviceName: z.string().trim().min(1).max(80)
});

type ReminderInput = {
  clinicName: string;
  locale: string;
  startsAt: string;
  timeZone: string;
};

const buildReminderText = ({
  clinicName,
  locale,
  startsAt,
  timeZone
}: ReminderInput) => {
  const dateTime = new Intl.DateTimeFormat(locale, {
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
