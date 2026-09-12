import {
  appointmentSetPayloadSchema,
  patientPayloadSchema,
  visitStatusChangedPayloadSchema,
  type ClinicEvent,
  type VisitStatus
} from "@/lib/sync/event-schema";

// ponytail: clinic TZ from clinic.region when membership carries it
const CLINIC_TZ = "Asia/Manila";

const BOARD_STATUSES = ["booked", "waiting", "in_chair", "late"] as const;

type BoardStatus = (typeof BOARD_STATUSES)[number];

type TodayBoardRow = {
  visitId: string;
  patientId: string;
  name: string;
  mobile: string;
  status: BoardStatus;
  storedStatus: VisitStatus;
  startsAt: string;
};

const BOARD_STATUS_LABEL: Record<BoardStatus, string> = {
  booked: "Booked",
  waiting: "Waiting",
  in_chair: "In chair",
  late: "Late"
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

const countByBoardStatus = (rows: TodayBoardRow[]) => {
  const counts = {
    booked: 0,
    waiting: 0,
    in_chair: 0,
    late: 0
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
  if (status === "booked" || status === "late") {
    return "waiting";
  }

  if (status === "waiting") {
    return "in_chair";
  }

  return null;
};

const projectTodayBoard = (
  events: ClinicEvent[],
  now: Date,
  timeZone = CLINIC_TZ
): TodayBoardRow[] => {
  const today = calendarDateInClinic(now.toISOString(), timeZone);
  const patients = new Map<string, { name: string; mobile: string }>();
  const visits = new Map<
    string,
    { patientId: string; startsAt: string; status: VisitStatus }
  >();

  for (const event of [...events].sort(compareEvents)) {
    if (event.type === "patient.created" || event.type === "patient.updated") {
      const payload = patientPayloadSchema.safeParse(event.payload);

      if (!payload.success || !event.recordId) {
        continue;
      }

      patients.set(event.recordId, {
        name: payload.data.name,
        mobile: payload.data.mobile
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
        status: payload.data.status ?? "booked"
      });
      continue;
    }

    if (event.type !== "visit.status_changed") {
      continue;
    }

    const payload = visitStatusChangedPayloadSchema.safeParse(event.payload);
    const visit = event.recordId ? visits.get(event.recordId) : undefined;

    if (!payload.success || !visit) {
      continue;
    }

    visit.status = payload.data.status;
  }

  const nowMs = now.getTime();
  const rows: TodayBoardRow[] = [];

  for (const [visitId, visit] of visits) {
    if (calendarDateInClinic(visit.startsAt, timeZone) !== today) {
      continue;
    }

    const patient = patients.get(visit.patientId);

    if (!patient) {
      continue;
    }

    rows.push({
      visitId,
      patientId: visit.patientId,
      name: patient.name,
      mobile: patient.mobile,
      storedStatus: visit.status,
      startsAt: visit.startsAt,
      status:
        visit.status === "booked" && Date.parse(visit.startsAt) < nowMs
          ? "late"
          : visit.status
    });
  }

  return rows.sort((left, right) => {
    const byStart = left.startsAt.localeCompare(right.startsAt);

    return byStart !== 0 ? byStart : left.visitId.localeCompare(right.visitId);
  });
};

export {
  BOARD_STATUSES,
  BOARD_STATUS_LABEL,
  CLINIC_TZ,
  calendarDateInClinic,
  countByBoardStatus,
  formatClinicDate,
  formatVisitTime,
  hasDuplicateMobile,
  nextVisitStatus,
  projectTodayBoard
};
export type { BoardStatus, TodayBoardRow };
