import { inboxRowSchema, liveInboxRowSchema } from "@/features/booking/booking-schemas";

type InboxRow = {
  id: string;
  name: string;
  mobile: string;
  serviceName: string;
  note: string | null;
  startsAt: string;
};

const toInboxRow = (value: unknown) => {
  const parsed = inboxRowSchema.safeParse(value);

  if (!parsed.success) {
    return null;
  }

  return {
    id: parsed.data.id,
    name: parsed.data.name,
    mobile: parsed.data.mobile,
    serviceName: parsed.data.service_name,
    note: parsed.data.note,
    startsAt: parsed.data.starts_at
  } satisfies InboxRow;
};

const parseInboxRows = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .flatMap((row) => {
      const parsed = toInboxRow(row);

      return parsed ? [parsed] : [];
    })
    .sort((left, right) => left.startsAt.localeCompare(right.startsAt));
};

const reconcileInboxRows = (
  current: InboxRow[],
  next: InboxRow[],
  seenIds: ReadonlySet<string>
) => ({
  rows: next,
  added: next.filter(
    (row) =>
      !seenIds.has(row.id) && !current.some((currentRow) => currentRow.id === row.id)
  )
});

const applyLiveInboxChange = (
  current: InboxRow[],
  value: unknown,
  tenantId: string
) => {
  const parsed = liveInboxRowSchema.safeParse(value);

  if (!parsed.success || parsed.data.tenant_id !== tenantId) {
    return { rows: current, added: null };
  }

  if (parsed.data.status !== "pending") {
    return {
      rows: current.filter((row) => row.id !== parsed.data.id),
      added: null
    };
  }

  const row = toInboxRow(parsed.data);

  if (!row || current.some((item) => item.id === row.id)) {
    return { rows: current, added: null };
  }

  return {
    rows: [...current, row].sort((left, right) =>
      left.startsAt.localeCompare(right.startsAt)
    ),
    added: row
  };
};

export { applyLiveInboxChange, parseInboxRows, reconcileInboxRows };
export type { InboxRow };
