import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

const auditMetadataValueSchema = z.union([
  z.string().max(500),
  z.number().finite(),
  z.boolean(),
  z.null()
]);

const auditEventSchema = z.object({
  id: z.uuid(),
  tenant_id: z.uuid(),
  actor_user_id: z.uuid().nullable(),
  event_type: z.string().min(1).max(80),
  record_id: z.uuid().nullable(),
  metadata: z.record(z.string().max(80), auditMetadataValueSchema),
  created_at: z.iso.datetime({ offset: true })
});

type AuditEvent = z.infer<typeof auditEventSchema>;

const parseAuditEvents = (value: unknown): AuditEvent[] =>
  z.array(auditEventSchema).max(100).parse(value);

const getRecentAuditEvents = async (
  supabase: SupabaseClient,
  tenantId: string
) => {
  const { data, error } = await supabase
    .from("audit_events")
    .select(
      "id, tenant_id, actor_user_id, event_type, record_id, metadata, created_at"
    )
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(100);

  if (error) {
    throw new Error("Could not load recent audit activity.");
  }

  return parseAuditEvents(data ?? []);
};

export { getRecentAuditEvents, parseAuditEvents };
export type { AuditEvent };
