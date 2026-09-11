import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";
import { authUsers } from "drizzle-orm/supabase";

const timestamptz = (name: string) =>
  timestamp(name, { withTimezone: true, mode: "date" });

export const clinicRoleEnum = pgEnum("clinic_role", ["owner", "assistant"]);

export const clinics = pgTable(
  "clinics",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    region: text("region").notNull().default("ph"),
    trialStartedAt: timestamptz("trial_started_at").defaultNow().notNull(),
    createdAt: timestamptz("created_at").defaultNow().notNull(),
    updatedAt: timestamptz("updated_at").defaultNow().notNull()
  },
  (table) => [
    check(
      "clinics_name_length",
      sql`char_length(btrim(${table.name})) between 2 and 80`
    )
  ]
).enableRLS();

export const clinicMembers = pgTable(
  "clinic_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull(),
    role: clinicRoleEnum("role").notNull(),
    createdAt: timestamptz("created_at").defaultNow().notNull()
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [authUsers.id],
      name: "clinic_members_user_id_fk"
    }).onDelete("cascade"),
    uniqueIndex("clinic_members_user_id_idx").on(table.userId),
    uniqueIndex("clinic_members_one_owner_idx")
      .on(table.tenantId)
      .where(sql`${table.role} = 'owner'`),
    index("clinic_members_tenant_id_idx").on(table.tenantId)
  ]
).enableRLS();

export const clinicSessions = pgTable(
  "clinic_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull(),
    sessionId: uuid("session_id").notNull(),
    lastActiveAt: timestamptz("last_active_at").defaultNow().notNull(),
    revokedAt: timestamptz("revoked_at"),
    createdAt: timestamptz("created_at").defaultNow().notNull()
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [authUsers.id],
      name: "clinic_sessions_user_id_fk"
    }).onDelete("cascade"),
    uniqueIndex("clinic_sessions_session_id_idx").on(table.sessionId),
    index("clinic_sessions_tenant_user_idx").on(table.tenantId, table.userId)
  ]
).enableRLS();

export const trustedDevices = pgTable(
  "trusted_devices",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    tenantId: uuid("tenant_id").references(() => clinics.id, {
      onDelete: "cascade"
    }),
    tokenHash: text("token_hash").notNull(),
    authSessionId: uuid("auth_session_id"),
    expiresAt: timestamptz("expires_at").notNull(),
    revokedAt: timestamptz("revoked_at"),
    createdAt: timestamptz("created_at").defaultNow().notNull()
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [authUsers.id],
      name: "trusted_devices_user_id_fk"
    }).onDelete("cascade"),
    uniqueIndex("trusted_devices_token_hash_idx").on(table.tokenHash),
    index("trusted_devices_user_session_idx").on(
      table.userId,
      table.authSessionId
    ),
    check(
      "trusted_devices_token_hash_format",
      sql`${table.tokenHash} ~ '^[a-f0-9]{64}$'`
    )
  ]
).enableRLS();

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    actorUserId: uuid("actor_user_id"),
    eventType: text("event_type").notNull(),
    recordId: uuid("record_id"),
    metadata: jsonb("metadata")
      .$type<Record<string, string | number | boolean | null>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: timestamptz("created_at").defaultNow().notNull()
  },
  (table) => [
    index("audit_events_tenant_created_idx").on(
      table.tenantId,
      table.createdAt
    ),
    check(
      "audit_events_type_check",
      sql`${table.eventType} in (
        'clinic.created',
        'auth.signup',
        'auth.login',
        'auth.mfa_enrolled',
        'auth.session_revoked',
        'auth.idle_lock',
        'auth.password_changed',
        'member.invited',
        'member.removed',
        'access.denied'
      )`
    )
  ]
).enableRLS();

export type Clinic = typeof clinics.$inferSelect;
export type ClinicMember = typeof clinicMembers.$inferSelect;
export type ClinicSession = typeof clinicSessions.$inferSelect;
export type TrustedDevice = typeof trustedDevices.$inferSelect;
export type AuditEvent = typeof auditEvents.$inferSelect;
