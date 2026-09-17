import type { ClinicDb } from "@/lib/db/clinic-db";
import {
  patientPayloadSchema,
  type VisitStatus
} from "@/lib/sync/event-schema";
import { recordClinicEvent, recordClinicEvents } from "@/lib/sync/sync-engine";

import {
  DEFAULT_HUDDLE_HOURS,
  huddleHoursOf,
  type HuddleHours
} from "./huddle-schedule";
import {
  patientForVisit,
  visitFromEvents,
  visitStatusFromEvents
} from "./project-today-board";
import { initialVisitStatus, transitionVisitStatus } from "./visit-status";

const AUTO_CONFIRM_KEY = "autoConfirmBookings";
const CLINIC_HOURS_KEY = "clinicHours";

type BookingInput = {
  tenantId: string;
  actorUserId: string;
  name: string;
  mobile: string;
  email?: string;
  patientId?: string;
  startsAt?: string;
  autoConfirm?: boolean;
  googleEventId?: string;
  serviceName?: string;
  note?: string;
  now?: Date;
};

const addBooking = async (db: ClinicDb, input: BookingInput) => {
  const occurredAt = (input.now ?? new Date()).toISOString();
  const patientId = input.patientId ?? crypto.randomUUID();
  const visitId = crypto.randomUUID();
  const events = [];
  const localPatient = input.patientId
    ? await db.events
        .where("recordId")
        .equals(patientId)
        .and(
          (event) =>
            event.type === "patient.created" || event.type === "patient.updated"
        )
        .first()
    : undefined;

  if (!localPatient) {
    events.push({
      id: crypto.randomUUID(),
      tenantId: input.tenantId,
      actorUserId: input.actorUserId,
      recordId: patientId,
      occurredAt,
      type: input.patientId ? ("patient.updated" as const) : ("patient.created" as const),
      payload: patientPayloadSchema.parse({
        name: input.name,
        mobile: input.mobile,
        ...(input.email ? { email: input.email } : {})
      })
    });
  }

  events.push({
    id: crypto.randomUUID(),
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    recordId: visitId,
    occurredAt,
    type: "appointment.set" as const,
    payload: {
      patientId,
      startsAt: input.startsAt ?? occurredAt,
      status: initialVisitStatus(input.autoConfirm ?? true),
      ...(input.googleEventId ? { googleEventId: input.googleEventId } : {}),
      ...(input.serviceName ? { serviceName: input.serviceName } : {}),
      ...(input.note ? { note: input.note } : {})
    }
  });

  await recordClinicEvents(db, events);

  return { patientId, visitId };
};

const changeVisitStatus = async (
  db: ClinicDb,
  input: {
    tenantId: string;
    actorUserId: string;
    visitId: string;
    status: VisitStatus;
    now?: Date;
  }
) => {
  const events = await db.events.toArray();
  const current = visitStatusFromEvents(events, input.visitId);
  const next = current ? transitionVisitStatus(current, input.status) : null;

  if (!next) {
    return { googleEventId: undefined };
  }

  const visit = visitFromEvents(events, input.visitId);
  const patient = patientForVisit(events, input.visitId);
  const occurredAt = (input.now ?? new Date()).toISOString();

  await recordClinicEvent(db, {
    id: crypto.randomUUID(),
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    recordId: input.visitId,
    occurredAt,
    type: "visit.status_changed",
    payload: { status: next }
  });

  if (next === "cancelled" && patient?.email) {
    await recordClinicEvent(db, {
      id: crypto.randomUUID(),
      tenantId: input.tenantId,
      actorUserId: input.actorUserId,
      recordId: input.visitId,
      occurredAt,
      type: "reminder.queued",
      payload: {
        channel: "email",
        template: "booking_cancelled",
        visitId: input.visitId,
        to: patient.email
      }
    });
  }

  return { googleEventId: visit?.googleEventId };
};

const readAutoConfirm = async (db: ClinicDb) => {
  const row = await db.meta.get(AUTO_CONFIRM_KEY);

  return row?.value !== "false";
};

const writeAutoConfirm = async (db: ClinicDb, autoConfirm: boolean) => {
  await db.meta.put({
    key: AUTO_CONFIRM_KEY,
    value: autoConfirm ? "true" : "false"
  });
};

const readClinicHours = async (db: ClinicDb): Promise<HuddleHours> => {
  const row = await db.meta.get(CLINIC_HOURS_KEY);

  if (!row?.value) {
    return { ...DEFAULT_HUDDLE_HOURS };
  }

  try {
    return huddleHoursOf(JSON.parse(row.value) as unknown) ?? { ...DEFAULT_HUDDLE_HOURS };
  } catch {
    return { ...DEFAULT_HUDDLE_HOURS };
  }
};

const writeClinicHours = async (db: ClinicDb, hours: HuddleHours) => {
  await db.meta.put({
    key: CLINIC_HOURS_KEY,
    value: JSON.stringify(hours)
  });
};

export {
  AUTO_CONFIRM_KEY,
  CLINIC_HOURS_KEY,
  addBooking,
  addBooking as addWalkIn,
  changeVisitStatus,
  readAutoConfirm,
  readClinicHours,
  writeAutoConfirm,
  writeClinicHours
};
export type { BookingInput };
