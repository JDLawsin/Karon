import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import {
  appointmentCsvLine,
  eventExportRowSchema,
  exportHeaderLine,
  patientCsvLine,
  patientIdForEvent,
  paymentCsvLine,
  statusForEvent,
  type ClinicExportKind
} from "@/features/clinic-export/clinic-export";
import { writeAuditEvent } from "@/lib/auth/audit";

const EXPORT_PAGE_SIZE = 100;
const cutoffSchema = z.iso.datetime({ offset: true });
const cutoffRowSchema = z
  .object({
    created_at: cutoffSchema.optional(),
    received_at: cutoffSchema.optional()
  })
  .passthrough();

type ClinicExportPage = {
  cursor: string | null;
  lines: string[];
  rowCount: number;
};

const patientNameRowSchema = z
  .object({ id: z.uuid(), name: z.string() })
  .strict();

class ClinicExportError extends Error {}
class ClinicExportRateLimitedError extends Error {}

const countClinicExportRows = async (
  supabase: SupabaseClient,
  tenantId: string,
  kind: ClinicExportKind,
  cutoff: string | null
) => {
  if (!cutoff) {
    return 0;
  }

  const query =
    kind === "patients"
      ? supabase
          .from("patients")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .lte("created_at", cutoff)
      : supabase
          .from("clinic_events")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .eq(
            "event_type",
            kind === "appointments" ? "appointment.set" : "payment.recorded"
          )
          .lte("received_at", cutoff);
  const { count, error } = await query;

  if (error) {
    throw new ClinicExportError("Could not count clinic export rows.");
  }

  return count ?? 0;
};

const loadClinicExportCutoff = async (
  supabase: SupabaseClient,
  tenantId: string,
  kind: ClinicExportKind
) => {
  const column = kind === "patients" ? "created_at" : "received_at";
  let query = supabase
    .from(kind === "patients" ? "patients" : "clinic_events")
    .select(column)
    .eq("tenant_id", tenantId);

  if (kind !== "patients") {
    query = query.eq(
      "event_type",
      kind === "appointments" ? "appointment.set" : "payment.recorded"
    );
  }

  const { data, error } = await query.order(column, { ascending: false }).limit(1);

  if (error) {
    throw new ClinicExportError("Could not prepare the clinic export snapshot.");
  }

  const row = cutoffRowSchema.parse(data?.[0] ?? {});
  return (kind === "patients" ? row.created_at : row.received_at) ?? null;
};

const reserveClinicExport = async (
  supabase: SupabaseClient,
  tenantId: string,
  actorUserId: string,
  kind: ClinicExportKind,
  expectedRowCount: number
) => {
  const { data, error } = await supabase.rpc("reserve_clinic_export", {
    p_tenant_id: tenantId,
    p_actor_user_id: actorUserId,
    p_kind: kind,
    p_row_count: expectedRowCount
  });

  if (error) {
    throw new ClinicExportError("Could not reserve the clinic export.");
  }

  if (!data) {
    throw new ClinicExportRateLimitedError("Too many exports. Try again later.");
  }
};

const loadPatientNames = async (
  supabase: SupabaseClient,
  tenantId: string,
  patientIds: readonly string[]
) => {
  const uniqueIds = [...new Set(patientIds)];

  if (uniqueIds.length === 0) {
    return new Map<string, string>();
  }

  const { data, error } = await supabase
    .from("patients")
    .select("id, name")
    .eq("tenant_id", tenantId)
    .in("id", uniqueIds);

  if (error) {
    throw new ClinicExportError("Could not load export patient names.");
  }

  return new Map(
    (data ?? []).map((value) => {
      const row = patientNameRowSchema.parse(value);
      return [row.id, row.name] as const;
    })
  );
};

const loadCurrentStatuses = async (
  supabase: SupabaseClient,
  tenantId: string,
  appointmentIds: readonly string[],
  cutoff: string
) => {
  if (appointmentIds.length === 0) {
    return new Map<string, string>();
  }

  const { data, error } = await supabase
    .from("clinic_events")
    .select("id, record_id, payload, occurred_at, received_at")
    .eq("tenant_id", tenantId)
    .eq("event_type", "visit.status_changed")
    .in("record_id", appointmentIds)
    .lte("received_at", cutoff)
    .order("occurred_at", { ascending: true })
    .order("received_at", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    throw new ClinicExportError("Could not load appointment statuses.");
  }

  const statuses = new Map<string, string>();

  for (const value of data ?? []) {
    const status = statusForEvent(value);

    if (status.appointmentId) {
      statuses.set(status.appointmentId, status.status);
    }
  }

  return statuses;
};

const loadPatientPage = async (
  supabase: SupabaseClient,
  tenantId: string,
  cutoff: string,
  cursor: string | null
): Promise<ClinicExportPage> => {
  let query = supabase
    .from("patients")
    .select("id, name, mobile, email, created_at, updated_at")
    .eq("tenant_id", tenantId)
    .lte("created_at", cutoff)
    .order("id", { ascending: true })
    .limit(EXPORT_PAGE_SIZE);

  if (cursor) {
    query = query.gt("id", cursor);
  }

  const { data, error } = await query;

  if (error) {
    throw new ClinicExportError("Could not load patients for export.");
  }

  const rows = data ?? [];
  return {
    cursor: rows.at(-1)?.id ?? null,
    lines: rows.map(patientCsvLine),
    rowCount: rows.length
  };
};

const loadEventPage = async (
  supabase: SupabaseClient,
  tenantId: string,
  kind: Exclude<ClinicExportKind, "patients">,
  cutoff: string,
  cursor: string | null
): Promise<ClinicExportPage> => {
  let query = supabase
    .from("clinic_events")
    .select("id, record_id, payload, occurred_at, received_at")
    .eq("tenant_id", tenantId)
    .eq("event_type", kind === "appointments" ? "appointment.set" : "payment.recorded")
    .lte("received_at", cutoff)
    .order("id", { ascending: true })
    .limit(EXPORT_PAGE_SIZE);

  if (cursor) {
    query = query.gt("id", cursor);
  }

  const { data, error } = await query;

  if (error) {
    throw new ClinicExportError(`Could not load ${kind} for export.`);
  }

  const rows = (data ?? []).map((value) => eventExportRowSchema.parse(value));
  const patientIds = rows.map(patientIdForEvent);
  const patientNames = await loadPatientNames(supabase, tenantId, patientIds);

  if (kind === "payments") {
    return {
      cursor: rows.at(-1)?.id ?? null,
      lines: rows.map((row, index) =>
        paymentCsvLine(row, patientNames.get(patientIds[index] ?? "") ?? null)
      ),
      rowCount: rows.length
    };
  }

  const appointmentIds = rows.flatMap((row) => (row.record_id ? [row.record_id] : []));
  const statuses = await loadCurrentStatuses(supabase, tenantId, appointmentIds, cutoff);

  return {
    cursor: rows.at(-1)?.id ?? null,
    lines: rows.map((row, index) =>
      appointmentCsvLine(
        row,
        patientNames.get(patientIds[index] ?? "") ?? null,
        row.record_id ? statuses.get(row.record_id) : undefined
      )
    ),
    rowCount: rows.length
  };
};

type CreateStreamInput = {
  supabase: SupabaseClient;
  tenantId: string;
  actorUserId: string;
  kind: ClinicExportKind;
  cutoff: string | null;
};

const createClinicExportStream = ({
  supabase,
  tenantId,
  actorUserId,
  kind,
  cutoff
}: CreateStreamInput) => {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    start: (controller) => {
      void (async () => {
        let exportedRows = 0;

        try {
          controller.enqueue(encoder.encode(`\uFEFF${exportHeaderLine(kind)}`));

          let cursor: string | null = null;

          while (cutoff) {
            const page: ClinicExportPage =
              kind === "patients"
                ? await loadPatientPage(supabase, tenantId, cutoff, cursor)
                : await loadEventPage(supabase, tenantId, kind, cutoff, cursor);

            if (page.lines.length > 0) {
              controller.enqueue(encoder.encode(page.lines.join("")));
            }

            exportedRows += page.rowCount;

            if (page.rowCount < EXPORT_PAGE_SIZE) {
              break;
            }

            if (!page.cursor) {
              throw new ClinicExportError("Could not continue the clinic export.");
            }

            cursor = page.cursor;
          }

          const { error } = await writeAuditEvent(supabase, {
            tenantId,
            actorUserId,
            eventType: "export.completed",
            metadata: {
              kind,
              filter: "all",
              row_count: exportedRows
            }
          });

          if (error) {
            throw new ClinicExportError("Could not audit the completed export.");
          }

          controller.close();
        } catch (error) {
          await writeAuditEvent(supabase, {
            tenantId,
            actorUserId,
            eventType: "export.failed",
            metadata: {
              kind,
              filter: "all",
              row_count: exportedRows
            }
          });
          controller.error(error);
        }
      })();
    }
  });
};

export {
  ClinicExportError,
  ClinicExportRateLimitedError,
  countClinicExportRows,
  createClinicExportStream,
  loadClinicExportCutoff,
  reserveClinicExport
};
