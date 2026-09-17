import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";
import { authUsers } from "drizzle-orm/supabase";

const timestamptz = (name: string) =>
  timestamp(name, { withTimezone: true, mode: "date" });

export const clinicRoleEnum = pgEnum("clinic_role", ["owner", "assistant"]);

export type ClinicAddress = {
  line1?: string;
  barangay?: string;
  city?: string;
  province?: string;
  postalCode?: string;
};

export type ClinicHours = {
  days: number[];
  open: string;
  close: string;
};

export const clinics = pgTable(
  "clinics",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    region: text("region").notNull().default("ph"),
    timezone: text("timezone").notNull().default("Asia/Manila"),
    currencyCode: text("currency_code").notNull().default("PHP"),
    phone: text("phone"),
    email: text("email"),
    address: jsonb("address")
      .$type<ClinicAddress>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    hours: jsonb("hours").$type<ClinicHours>(),
    logoPath: text("logo_path"),
    autoConfirmBookings: boolean("auto_confirm_bookings").notNull().default(true),
    trialStartedAt: timestamptz("trial_started_at").defaultNow().notNull(),
    createdAt: timestamptz("created_at").defaultNow().notNull(),
    updatedAt: timestamptz("updated_at").defaultNow().notNull()
  },
  (table) => [
    check(
      "clinics_name_length",
      sql`char_length(btrim(${table.name})) between 2 and 80`
    ),
    check(
      "clinics_timezone_length",
      sql`char_length(btrim(${table.timezone})) between 1 and 64`
    ),
    check(
      "clinics_currency_code_format",
      sql`${table.currencyCode} ~ '^[A-Z]{3}$'`
    )
  ]
).enableRLS();

export const clinicServices = pgTable(
  "clinic_services",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    icon: text("icon"),
    priceMinor: integer("price_minor"),
    currencyCode: text("currency_code"),
    durationMinutes: integer("duration_minutes"),
    createdAt: timestamptz("created_at").defaultNow().notNull(),
    updatedAt: timestamptz("updated_at").defaultNow().notNull(),
    createdBy: uuid("created_by").notNull(),
    updatedBy: uuid("updated_by").notNull()
  },
  (table) => [
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [authUsers.id],
      name: "clinic_services_created_by_fk"
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.updatedBy],
      foreignColumns: [authUsers.id],
      name: "clinic_services_updated_by_fk"
    }).onDelete("restrict"),
    uniqueIndex("clinic_services_tenant_name_idx").on(
      table.tenantId,
      sql`lower(btrim(${table.name}))`
    ),
    index("clinic_services_tenant_name_sort_idx").on(table.tenantId, table.name),
    check(
      "clinic_services_name_length",
      sql`char_length(btrim(${table.name})) between 1 and 80`
    ),
    check(
      "clinic_services_description_length",
      sql`${table.description} is null or char_length(${table.description}) <= 280`
    ),
    check(
      "clinic_services_icon_length",
      sql`${table.icon} is null or char_length(${table.icon}) <= 64`
    ),
    check(
      "clinic_services_price_non_negative",
      sql`${table.priceMinor} is null or ${table.priceMinor} >= 0`
    ),
    check(
      "clinic_services_currency_code_format",
      sql`${table.currencyCode} is null or ${table.currencyCode} ~ '^[A-Z]{3}$'`
    ),
    check(
      "clinic_services_duration_bounds",
      sql`${table.durationMinutes} is null or ${table.durationMinutes} between 1 and 1440`
    ),
    check(
      "clinic_services_pricing_complete",
      sql`(${table.priceMinor} is null and ${table.currencyCode} is null)
        or (${table.priceMinor} is not null and ${table.currencyCode} is not null and ${table.durationMinutes} is not null)`
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
        'access.denied',
        'service.created',
        'service.updated',
        'service.deleted',
        'booking.accepted',
        'booking.declined'
      )`
    )
  ]
).enableRLS();

export const clinicEvents = pgTable(
  "clinic_events",
  {
    id: uuid("id").primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    actorUserId: uuid("actor_user_id").notNull(),
    eventType: text("event_type").notNull(),
    recordId: uuid("record_id"),
    payload: jsonb("payload")
      .$type<Record<string, unknown>>()
      .notNull(),
    occurredAt: timestamptz("occurred_at").notNull(),
    receivedAt: timestamptz("received_at").defaultNow().notNull()
  },
  (table) => [
    index("clinic_events_tenant_received_idx").on(
      table.tenantId,
      table.receivedAt,
      table.id
    ),
    check(
      "clinic_events_type_check",
      sql`${table.eventType} in (
        'patient.created',
        'patient.updated',
        'chart.appended',
        'quote.created',
        'payment.recorded',
        'appointment.set',
        'visit.status_changed',
        'reminder.queued'
      )`
    )
  ]
).enableRLS();

export const patients = pgTable(
  "patients",
  {
    id: uuid("id").notNull(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    mobile: text("mobile").notNull(),
    mobileDigits: text("mobile_digits").notNull(),
    email: text("email"),
    sourceEventId: uuid("source_event_id").notNull(),
    sourceOccurredAt: timestamptz("source_occurred_at").notNull(),
    createdAt: timestamptz("created_at").defaultNow().notNull(),
    updatedAt: timestamptz("updated_at").defaultNow().notNull()
  },
  (table) => [
    primaryKey({ columns: [table.tenantId, table.id] }),
    index("patients_tenant_name_idx").on(table.tenantId, sql`lower(${table.name})`),
    index("patients_tenant_mobile_digits_idx").on(
      table.tenantId,
      table.mobileDigits
    ),
    check(
      "patients_name_length",
      sql`char_length(btrim(${table.name})) between 1 and 120`
    ),
    check(
      "patients_mobile_length",
      sql`char_length(btrim(${table.mobile})) between 1 and 20`
    ),
    check(
      "patients_mobile_digits_length",
      sql`char_length(${table.mobileDigits}) between 7 and 15`
    ),
    check(
      "patients_email_length",
      sql`${table.email} is null or char_length(${table.email}) <= 254`
    )
  ]
).enableRLS();

export const calendarImportStatusEnum = pgEnum("calendar_import_status", [
  "unmatched",
  "matched",
  "cancelled_on_google",
  "cancel_pending"
]);

export type GoogleBookingPage = {
  name: string;
  url: string;
  scheduleKey: string;
};

export const googleCalendarConnections = pgTable(
  "google_calendar_connections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    encryptedRefreshToken: text("encrypted_refresh_token").notNull(),
    calendarId: text("calendar_id").notNull().default("primary"),
    bookingPages: jsonb("booking_pages")
      .$type<GoogleBookingPage[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    syncToken: text("sync_token"),
    connectedBy: uuid("connected_by").notNull(),
    createdAt: timestamptz("created_at").defaultNow().notNull(),
    updatedAt: timestamptz("updated_at").defaultNow().notNull()
  },
  (table) => [
    uniqueIndex("google_calendar_connections_tenant_idx").on(table.tenantId),
    foreignKey({
      columns: [table.connectedBy],
      foreignColumns: [authUsers.id],
      name: "google_calendar_connections_connected_by_fk"
    }).onDelete("cascade")
  ]
).enableRLS();

export const calendarImports = pgTable(
  "calendar_imports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    googleEventId: text("google_event_id").notNull(),
    attendeeName: text("attendee_name").notNull(),
    attendeeEmail: text("attendee_email"),
    startsAt: timestamptz("starts_at").notNull(),
    description: text("description"),
    status: calendarImportStatusEnum("status").notNull().default("unmatched"),
    visitId: uuid("visit_id"),
    createdAt: timestamptz("created_at").defaultNow().notNull(),
    updatedAt: timestamptz("updated_at").defaultNow().notNull()
  },
  (table) => [
    uniqueIndex("calendar_imports_tenant_event_idx").on(
      table.tenantId,
      table.googleEventId
    ),
    index("calendar_imports_tenant_status_idx").on(table.tenantId, table.status)
  ]
).enableRLS();

export const reminderSends = pgTable(
  "reminder_sends",
  {
    eventId: uuid("event_id")
      .primaryKey()
      .references(() => clinicEvents.id, { onDelete: "cascade" }),
    sentAt: timestamptz("sent_at").defaultNow().notNull()
  }
).enableRLS();

export const bookingRequestStatusEnum = pgEnum("booking_request_status", [
  "pending",
  "accepted",
  "declined"
]);

export const bookingLinks = pgTable(
  "booking_links",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull(),
    slug: text("slug").notNull(),
    createdAt: timestamptz("created_at").defaultNow().notNull(),
    updatedAt: timestamptz("updated_at").defaultNow().notNull()
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [authUsers.id],
      name: "booking_links_user_id_fk"
    }).onDelete("cascade"),
    uniqueIndex("booking_links_slug_idx").on(table.slug),
    uniqueIndex("booking_links_tenant_user_idx").on(table.tenantId, table.userId),
    check(
      "booking_links_slug_format",
      sql`${table.slug} ~ '^[A-Za-z0-9_-]{8,32}$'`
    )
  ]
).enableRLS();

export const bookingRequests = pgTable(
  "booking_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    linkId: uuid("link_id")
      .notNull()
      .references(() => bookingLinks.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    mobile: text("mobile").notNull(),
    serviceId: text("service_id").notNull(),
    serviceName: text("service_name").notNull(),
    note: text("note"),
    startsAt: timestamptz("starts_at").notNull(),
    status: bookingRequestStatusEnum("status").notNull().default("pending"),
    visitId: uuid("visit_id"),
    idempotencyKey: text("idempotency_key"),
    createdAt: timestamptz("created_at").defaultNow().notNull(),
    updatedAt: timestamptz("updated_at").defaultNow().notNull()
  },
  (table) => [
    uniqueIndex("booking_requests_tenant_slot_idx")
      .on(table.tenantId, table.startsAt)
      .where(sql`${table.status} in ('pending', 'accepted')`),
    uniqueIndex("booking_requests_tenant_idempotency_idx")
      .on(table.tenantId, table.idempotencyKey)
      .where(sql`${table.idempotencyKey} is not null`),
    index("booking_requests_tenant_status_idx").on(table.tenantId, table.status),
    check(
      "booking_requests_name_length",
      sql`char_length(btrim(${table.name})) between 1 and 80`
    ),
    check(
      "booking_requests_mobile_length",
      sql`char_length(btrim(${table.mobile})) between 1 and 20`
    ),
    check(
      "booking_requests_note_length",
      sql`${table.note} is null or char_length(${table.note}) <= 500`
    )
  ]
).enableRLS();

export type Clinic = typeof clinics.$inferSelect;
export type ClinicServiceRow = typeof clinicServices.$inferSelect;
export type ClinicMember = typeof clinicMembers.$inferSelect;
export type ClinicSession = typeof clinicSessions.$inferSelect;
export type TrustedDevice = typeof trustedDevices.$inferSelect;
export type AuditEvent = typeof auditEvents.$inferSelect;
export type ClinicEvent = typeof clinicEvents.$inferSelect;
export type Patient = typeof patients.$inferSelect;
export type BookingLink = typeof bookingLinks.$inferSelect;
export type BookingRequest = typeof bookingRequests.$inferSelect;
