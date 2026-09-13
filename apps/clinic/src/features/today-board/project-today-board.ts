import {
  appointmentSetPayloadSchema,
  patientPayloadSchema,
  visitStatusChangedPayloadSchema,
  type ClinicEvent,
  type VisitStatus
} from "@/lib/sync/event-schema";

import { transitionVisitStatus } from "./visit-status";

// ponytail: clinic TZ from clinic.region when membership carries it
const CLINIC_TZ = "Asia/Manila";

const BOARD_STATUSES = [
  "pending_review",
  "confirmed",
  "late",
  "waiting",
  "in_chair",
  "complete"
] as const;

type BoardStatus = (typeof BOARD_STATUSES)[number];

type TodayBoardRow = {
  visitId: string;
  patientId: string;
  name: string;
  mobile: string;
  email?: string;
  status: BoardStatus;
  storedStatus: VisitStatus;
  startsAt: string;
  googleEventId?: string;
  syncState: "local" | "synced";
};

type TodaySnapshot = {
  patientsToday: number;
  arrived: number;
  outstandingPhp: number;
};

type TodayHuddle = {
  rows: TodayBoardRow[];
  leftoverByDate: Record<string, Partial<Record<BoardStatus, number>>>;
  snapshot: TodaySnapshot;
};

const BOARD_STATUS_LABEL: Record<BoardStatus, string> = {
  pending_review: "Pending review",
  confirmed: "Confirmed",
  late: "Late",
  waiting: "Waiting",
  in_chair: "In chair",
  complete: "Complete"
};

const VISIT_STATUS_LABEL: Record<VisitStatus, string> = {
  confirmed: "Confirmed",
  pending_review: "Pending review",
  waiting: "Waiting",
  in_chair: "In chair",
  complete: "Complete",
  cancelled: "Cancelled",
  no_show: "No-show"
};

const paymentMethodOf = (payload: Record<string, unknown>) => {
  const method = payload.method;

  return method === "cash" || method === "gcash" || method === "unpaid"
    ? method
    : undefined;
};

const paymentAmountOf = (payload: Record<string, unknown>) => {
  const amount = payload.amount;

  return typeof amount === "number" && amount >= 0 ? amount : 0;
};

const calendarDateInClinic = (iso: string, timeZone = CLINIC_TZ) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date(iso));

const formatVisitTime = (iso: string, timeZone = CLINIC_TZ) =>
  new Intl.DateTimeFormat("en-PH", {
    timeZone,
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(iso));

const formatClinicDate = (now: Date, timeZone = CLINIC_TZ) =>
  new Intl.DateTimeFormat("en-PH", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric"
  }).format(now);

const formatClinicWeekday = (now: Date, timeZone = CLINIC_TZ) =>
  new Intl.DateTimeFormat("en-PH", {
    timeZone,
    weekday: "long"
  }).format(now);

const clinicLocalParts = (now: Date, timeZone = CLINIC_TZ) => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(now);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return {
    date: `${read("year")}-${read("month")}-${read("day")}`,
    time: `${read("hour")}:${read("minute")}`
  };
};

// ponytail: Manila is UTC+8 with no DST; use clinics.timezone offset when membership carries it
const startsAtFromClinicLocal = (date: string, time: string) =>
  `${date}T${time.length === 5 ? `${time}:00` : time}+08:00`;

const formatOutstanding = (php: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0
  }).format(php);

const countByBoardStatus = (rows: TodayBoardRow[]) => {
  const counts = {
    pending_review: 0,
    confirmed: 0,
    late: 0,
    waiting: 0,
    in_chair: 0,
    complete: 0
  } satisfies Record<BoardStatus, number>;

  for (const row of rows) {
    counts[row.status] += 1;
  }

  return counts;
};

const compareEvents = (left: ClinicEvent, right: ClinicEvent) => {
  const byTime = left.occurredAt.localeCompare(right.occurredAt);

  return byTime !== 0 ? byTime : left.id.localeCompare(right.id);
};

const hasDuplicateMobile = (events: ClinicEvent[], mobile: string) => {
  const needle = mobile.trim();

  if (!needle) {
    return false;
  }

  return events.some((event) => {
    if (event.type !== "patient.created" && event.type !== "patient.updated") {
      return false;
    }

    const payload = patientPayloadSchema.safeParse(event.payload);

    return payload.success && payload.data.mobile === needle;
  });
};

const nextVisitStatus = (status: BoardStatus): VisitStatus | null => {
  if (status === "late") {
    return transitionVisitStatus("confirmed", "waiting");
  }

  if (status === "pending_review" || status === "confirmed") {
    return transitionVisitStatus(status, "waiting");
  }

  if (status === "waiting") {
    return transitionVisitStatus("waiting", "in_chair");
  }

  if (status === "in_chair") {
    return transitionVisitStatus("in_chair", "complete");
  }

  return null;
};

const boardStatusOf = (
  status: VisitStatus,
  startsAt: string,
  nowMs: number
): BoardStatus | null => {
  if (status === "cancelled" || status === "no_show") {
    return null;
  }

  if (status === "confirmed" && Date.parse(startsAt) < nowMs) {
    return "late";
  }

  if (
    status === "pending_review" ||
    status === "confirmed" ||
    status === "waiting" ||
    status === "in_chair" ||
    status === "complete"
  ) {
    return status;
  }

  return null;
};

const foldVisits = (events: ClinicEvent[]) => {
  const patients = new Map<
    string,
    { name: string; mobile: string; email?: string }
  >();
  const visits = new Map<
    string,
    {
      patientId: string;
      startsAt: string;
      status: VisitStatus;
      googleEventId?: string;
      eventIds: string[];
    }
  >();
  let outstandingPhp = 0;

  for (const event of [...events].sort(compareEvents)) {
    if (event.type === "patient.created" || event.type === "patient.updated") {
      const payload = patientPayloadSchema.safeParse(event.payload);

      if (!payload.success || !event.recordId) {
        continue;
      }

      patients.set(event.recordId, {
        name: payload.data.name,
        mobile: payload.data.mobile,
        email: payload.data.email
      });
      continue;
    }

    if (event.type === "appointment.set") {
      const payload = appointmentSetPayloadSchema.safeParse(event.payload);

      if (!payload.success || !event.recordId) {
        continue;
      }

      visits.set(event.recordId, {
        patientId: payload.data.patientId,
        startsAt: payload.data.startsAt,
        status: payload.data.status ?? "confirmed",
        googleEventId: payload.data.googleEventId,
        eventIds: [event.id]
      });
      continue;
    }

    if (event.type === "visit.status_changed") {
      const payload = visitStatusChangedPayloadSchema.safeParse(event.payload);
      const visit = event.recordId ? visits.get(event.recordId) : undefined;

      if (!payload.success || !visit) {
        continue;
      }

      visit.status = payload.data.status;
      visit.eventIds.push(event.id);
      continue;
    }

    if (event.type !== "payment.recorded") {
      continue;
    }

    const method = paymentMethodOf(event.payload);
    const amount = paymentAmountOf(event.payload);

    if (method === "unpaid") {
      outstandingPhp += amount;
    } else if (method === "cash" || method === "gcash") {
      outstandingPhp -= amount;
    }
  }

  return { patients, visits, outstandingPhp: Math.max(0, outstandingPhp) };
};

type FoldedClinic = ReturnType<typeof foldVisits>;

const bumpLeftover = (
  leftoverByDate: TodayHuddle["leftoverByDate"],
  date: string,
  status: BoardStatus
) => {
  const bucket = leftoverByDate[date] ?? {};
  bucket[status] = (bucket[status] ?? 0) + 1;
  leftoverByDate[date] = bucket;
};

const toRow = (
  visitId: string,
  visit: {
    patientId: string;
    startsAt: string;
    status: VisitStatus;
    googleEventId?: string;
    eventIds: string[];
  },
  patient: { name: string; mobile: string; email?: string },
  status: BoardStatus,
  outboxIds: Set<string>
): TodayBoardRow => ({
  visitId,
  patientId: visit.patientId,
  name: patient.name,
  mobile: patient.mobile,
  email: patient.email,
  storedStatus: visit.status,
  startsAt: visit.startsAt,
  googleEventId: visit.googleEventId,
  status,
  syncState: visit.eventIds.some((id) => outboxIds.has(id)) ? "local" : "synced"
});

const sortRows = (rows: TodayBoardRow[]) =>
  rows.sort((left, right) => {
    const byStart = left.startsAt.localeCompare(right.startsAt);

    return byStart !== 0 ? byStart : left.visitId.localeCompare(right.visitId);
  });

const projectFoldedBoard = (
  folded: FoldedClinic,
  now: Date,
  timeZone = CLINIC_TZ,
  outboxIds: ReadonlySet<string> = new Set(),
  viewDay?: string
): TodayHuddle => {
  const realToday = calendarDateInClinic(now.toISOString(), timeZone);
  const today = viewDay ?? realToday;
  const nowMs = today === realToday ? now.getTime() : 0;
  const ids = new Set(outboxIds);
  const { patients, visits, outstandingPhp } = folded;
  const rows: TodayBoardRow[] = [];
  const leftoverByDate: TodayHuddle["leftoverByDate"] = {};
  let patientsToday = 0;

  for (const [visitId, visit] of visits) {
    const patient = patients.get(visit.patientId);

    if (!patient) {
      continue;
    }

    const clinicDate = calendarDateInClinic(visit.startsAt, timeZone);
    const isToday = clinicDate === today;

    if (isToday && visit.status !== "cancelled") {
      patientsToday += 1;
    }

    if (isToday) {
      const status = boardStatusOf(visit.status, visit.startsAt, nowMs);

      if (status) {
        rows.push(toRow(visitId, visit, patient, status, ids));
      }

      continue;
    }

    if (
      clinicDate >= realToday ||
      (visit.status !== "pending_review" &&
        visit.status !== "confirmed" &&
        visit.status !== "waiting" &&
        visit.status !== "in_chair" &&
        visit.status !== "no_show")
    ) {
      continue;
    }

    const status =
      visit.status === "no_show"
        ? "confirmed"
        : (boardStatusOf(visit.status, visit.startsAt, nowMs) ?? "confirmed");

    bumpLeftover(leftoverByDate, clinicDate, status);
  }

  const sortedRows = sortRows(rows);

  return {
    rows: sortedRows,
    leftoverByDate,
    snapshot: {
      patientsToday,
      arrived: sortedRows.filter(
        (row) =>
          row.status === "waiting" ||
          row.status === "in_chair" ||
          row.status === "complete"
      ).length,
      outstandingPhp
    }
  };
};

const projectTodayBoard = (
  events: ClinicEvent[],
  now: Date,
  timeZone = CLINIC_TZ,
  outboxIds: ReadonlySet<string> = new Set(),
  viewDay?: string
): TodayHuddle =>
  projectFoldedBoard(foldVisits(events), now, timeZone, outboxIds, viewDay);

const visitFromEvents = (events: ClinicEvent[], visitId: string) =>
  foldVisits(events).visits.get(visitId);

const visitStatusFromEvents = (
  events: ClinicEvent[],
  visitId: string
): VisitStatus | null => visitFromEvents(events, visitId)?.status ?? null;

const patientForVisit = (events: ClinicEvent[], visitId: string) => {
  const { patients, visits } = foldVisits(events);
  const visit = visits.get(visitId);

  if (!visit) {
    return null;
  }

  return patients.get(visit.patientId) ?? null;
};

const patientsFromEvents = (events: ClinicEvent[]) => {
  const { patients } = foldVisits(events);

  return [...patients.entries()].map(([id, patient]) => ({
    id,
    ...patient
  }));
};

export {
  BOARD_STATUSES,
  BOARD_STATUS_LABEL,
  CLINIC_TZ,
  VISIT_STATUS_LABEL,
  calendarDateInClinic,
  clinicLocalParts,
  countByBoardStatus,
  formatClinicDate,
  formatClinicWeekday,
  formatOutstanding,
  formatVisitTime,
  foldVisits,
  hasDuplicateMobile,
  nextVisitStatus,
  patientForVisit,
  patientsFromEvents,
  projectFoldedBoard,
  projectTodayBoard,
  startsAtFromClinicLocal,
  visitFromEvents,
  visitStatusFromEvents
};
export type { BoardStatus, TodayBoardRow, TodayHuddle, TodaySnapshot };
