import type { SupabaseClient } from "@supabase/supabase-js";

type AuditEventType =
  | "clinic.created"
  | "auth.signup"
  | "auth.login"
  | "auth.mfa_enrolled"
  | "auth.session_revoked"
  | "auth.idle_lock"
  | "auth.password_changed"
  | "member.invited"
  | "member.removed"
  | "access.denied"
  | "service.created"
  | "service.updated"
  | "service.deleted";

type AuditWrite = {
  tenantId: string;
  actorUserId: string;
  eventType: AuditEventType;
  recordId?: string | null;
};

const writeAuditEvent = async (
  supabase: SupabaseClient,
  { tenantId, actorUserId, eventType, recordId }: AuditWrite
) =>
  supabase.from("audit_events").insert({
    tenant_id: tenantId,
    actor_user_id: actorUserId,
    event_type: eventType,
    record_id: recordId ?? null,
    metadata: {}
  });

export { writeAuditEvent };
export type { AuditEventType, AuditWrite };
