import type { ClinicEvent } from "./event-schema";

type OutboxItem = {
  id: string;
  tenantId: string;
  createdAt: string;
  attempts: number;
};

type Notebook = {
  events: ClinicEvent[];
  outbox: OutboxItem[];
};

const emptyNotebook = (): Notebook => ({ events: [], outbox: [] });

const enqueue = (state: Notebook, event: ClinicEvent): Notebook => {
  if (state.events.some((row) => row.id === event.id)) {
    return state;
  }

  return {
    events: [...state.events, event],
    outbox: [
      ...state.outbox,
      {
        id: event.id,
        tenantId: event.tenantId,
        createdAt: event.occurredAt,
        attempts: 0
      }
    ]
  };
};

const applyRemote = (state: Notebook, event: ClinicEvent): Notebook => {
  if (state.events.some((row) => row.id === event.id)) {
    return state;
  }

  return {
    ...state,
    events: [...state.events, event]
  };
};

const markDrained = (state: Notebook, id: string): Notebook => ({
  ...state,
  outbox: state.outbox.filter((item) => item.id !== id)
});

const bumpAttempts = (state: Notebook, id: string): Notebook => ({
  ...state,
  outbox: state.outbox.map((item) =>
    item.id === id ? { ...item, attempts: item.attempts + 1 } : item
  )
});

export { applyRemote, bumpAttempts, emptyNotebook, enqueue, markDrained };
export type { Notebook, OutboxItem };
