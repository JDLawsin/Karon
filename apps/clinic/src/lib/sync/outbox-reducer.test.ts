import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  clinicEventSchema,
  patientPayloadSchema,
  type ClinicEvent
} from "./event-schema";
import {
  applyRemote,
  emptyNotebook,
  enqueue,
  markDrained
} from "./outbox-reducer";

const TENANT = "11111111-1111-4111-8111-111111111111";
const ACTOR = "22222222-2222-4222-8222-222222222222";

const makeEvent = (type: ClinicEvent["type"], recordId = randomUUID()): ClinicEvent => ({
  id: randomUUID(),
  tenantId: TENANT,
  actorUserId: ACTOR,
  recordId,
  occurredAt: new Date().toISOString(),
  type,
  payload:
    type === "patient.created" || type === "patient.updated"
      ? { name: "Ana Cruz", mobile: "09171234567" }
      : {}
});

describe("outbox reducer", () => {
  it("enqueues chair writes and keeps two events for the same record", () => {
    const recordId = randomUUID();
    const types = [
      "patient.created",
      "chart.appended",
      "quote.created",
      "payment.recorded",
      "appointment.set"
    ] as const;
    const events = types.map((type) => makeEvent(type, recordId));
    const state = events.reduce(enqueue, emptyNotebook());

    expect(state.events.map((row) => row.type)).toEqual([...types]);
    expect(state.outbox.map((item) => item.id)).toEqual(events.map((row) => row.id));
    expect(new Set(state.events.map((row) => row.id)).size).toBe(5);
  });

  it("markDrained drops the outbox id after a successful upload", () => {
    const event = makeEvent("patient.created");
    const queued = enqueue(emptyNotebook(), event);
    const drained = markDrained(queued, event.id);

    expect(drained.events).toEqual(queued.events);
    expect(drained.outbox).toEqual([]);
  });

  it("applyRemote never deletes or overwrites an existing payload", () => {
    const event = makeEvent("chart.appended");
    const local = enqueue(emptyNotebook(), event);
    const incoming = {
      ...event,
      payload: { overwritten: true }
    };
    const next = applyRemote(local, incoming);

    expect(next.events).toHaveLength(1);
    expect(next.events[0]?.payload).toEqual(event.payload);
    expect(next.outbox).toHaveLength(1);
  });
});

describe("clinic event schema", () => {
  it("parses patient.created", () => {
    const parsed = clinicEventSchema.safeParse(makeEvent("patient.created"));
    expect(parsed.success).toBe(true);
    expect(patientPayloadSchema.safeParse({ name: "Ana Cruz", mobile: "09171234567" }).success).toBe(
      true
    );
  });

  it("rejects garbage", () => {
    expect(clinicEventSchema.safeParse({ type: "patient.created" }).success).toBe(false);
    expect(
      clinicEventSchema.safeParse({
        ...makeEvent("patient.created"),
        payload: { name: "", mobile: "0917" }
      }).success
    ).toBe(false);
  });

  it("parses appointment.set and visit.status_changed", () => {
    const visitId = randomUUID();
    const patientId = randomUUID();

    expect(
      clinicEventSchema.safeParse({
        ...makeEvent("appointment.set", visitId),
        payload: {
          patientId,
          startsAt: "2026-09-12T04:00:00.000Z",
          status: "waiting"
        }
      }).success
    ).toBe(true);
    expect(
      clinicEventSchema.safeParse({
        ...makeEvent("visit.status_changed", visitId),
        payload: { status: "in_chair" }
      }).success
    ).toBe(true);
  });

  it("rejects bad appointment and visit status payloads", () => {
    expect(clinicEventSchema.safeParse(makeEvent("appointment.set")).success).toBe(
      false
    );
    expect(
      clinicEventSchema.safeParse({
        ...makeEvent("visit.status_changed"),
        payload: { status: "late" }
      }).success
    ).toBe(false);
  });
});
