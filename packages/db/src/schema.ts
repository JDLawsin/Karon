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

export const clinicEntitlementStatusEnum = pgEnum("clinic_entitlement_status", [
  "trialing",
  "active",
  "past_due",
  "expired"
]);

export const billingIntervalEnum = pgEnum("billing_interval", [
  "monthly",
  "yearly"
]);

export const billingCheckoutStatusEnum = pgEnum("billing_checkout_status", [
  "pending",
  "open",
  "paid",
  "failed",
  "cancelled"
]);

export const billingWebhookStatusEnum = pgEnum("billing_webhook_status", [
  "received",
  "processed",
  "ignored"
]);

export const patientImportStatusEnum = pgEnum("patient_import_status", [
  "awaiting_upload",
  "uploaded",
  "preview_ready",
  "committing",
  "completed",
  "failed"
]);

export const serviceImportStatusEnum = pgEnum("service_import_status", [
  "awaiting_upload",
  "uploaded",
  "preview_ready",
  "committing",
  "completed",
  "failed"
]);

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
    locale: text("locale").notNull().default("en-PH"),
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
    ),
    check(
      "clinics_locale_format",
      sql`char_length(${table.locale}) between 2 and 35
        and ${table.locale} ~ '^[A-Za-z]{2,8}(-[A-Za-z0-9]{1,8})*$'`
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
    serviceCode: text("service_code"),
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
    uniqueIndex("clinic_services_tenant_code_idx")
      .on(table.tenantId, sql`lower(btrim(${table.serviceCode}))`)
      .where(sql`${table.serviceCode} is not null`),
    index("clinic_services_tenant_name_sort_idx").on(table.tenantId, table.name),
    check(
      "clinic_services_name_length",
      sql`char_length(btrim(${table.name})) between 1 and 80`
    ),
    check(
      "clinic_services_code_length",
      sql`${table.serviceCode} is null or char_length(btrim(${table.serviceCode})) between 1 and 40`
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

export const billingCheckoutSessions = pgTable(
  "billing_checkout_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    actorUserId: uuid("actor_user_id").notNull(),
    provider: text("provider").notNull(),
    billingInterval: billingIntervalEnum("billing_interval").notNull(),
    amountMinor: integer("amount_minor").notNull(),
    currencyCode: text("currency_code").notNull(),
    status: billingCheckoutStatusEnum("status").notNull().default("pending"),
    providerCheckoutId: text("provider_checkout_id"),
    livemode: boolean("livemode").notNull(),
    lastProviderEventAt: timestamptz("last_provider_event_at"),
    createdAt: timestamptz("created_at").defaultNow().notNull(),
    updatedAt: timestamptz("updated_at").defaultNow().notNull()
  },
  (table) => [
    foreignKey({
      columns: [table.actorUserId],
      foreignColumns: [authUsers.id],
      name: "billing_checkout_sessions_actor_user_id_fkey"
    }).onDelete("restrict"),
    index("billing_checkout_tenant_created_idx").on(
      table.tenantId,
      table.createdAt
    ),
    uniqueIndex("billing_checkout_provider_id_idx")
      .on(table.provider, table.providerCheckoutId)
      .where(sql`${table.providerCheckoutId} is not null`),
    check(
      "billing_checkout_provider_format",
      sql`${table.provider} ~ '^[a-z][a-z0-9_-]{0,39}$'`
    ),
    check(
      "billing_checkout_amount_positive",
      sql`${table.amountMinor} > 0`
    ),
    check(
      "billing_checkout_currency_format",
      sql`${table.currencyCode} ~ '^[A-Z]{3}$'`
    ),
    check(
      "billing_checkout_provider_id_length",
      sql`${table.providerCheckoutId} is null or char_length(${table.providerCheckoutId}) between 1 and 255`
    )
  ]
).enableRLS();

export const billingWebhookEvents = pgTable(
  "billing_webhook_events",
  {
    provider: text("provider").notNull(),
    providerEventId: text("provider_event_id").notNull(),
    tenantId: uuid("tenant_id").references(() => clinics.id, {
      onDelete: "set null"
    }),
    checkoutId: uuid("checkout_id").references(
      () => billingCheckoutSessions.id,
      { onDelete: "set null" }
    ),
    eventType: text("event_type").notNull(),
    processingStatus: billingWebhookStatusEnum("processing_status")
      .notNull()
      .default("received"),
    livemode: boolean("livemode").notNull(),
    payloadSha256: text("payload_sha256").notNull(),
    providerOccurredAt: timestamptz("provider_occurred_at").notNull(),
    receivedAt: timestamptz("received_at").defaultNow().notNull(),
    processedAt: timestamptz("processed_at")
  },
  (table) => [
    primaryKey({ columns: [table.provider, table.providerEventId] }),
    index("billing_webhook_tenant_received_idx")
      .on(table.tenantId, table.receivedAt)
      .where(sql`${table.tenantId} is not null`),
    index("billing_webhook_checkout_idx")
      .on(table.checkoutId)
      .where(sql`${table.checkoutId} is not null`),
    check(
      "billing_webhook_provider_format",
      sql`${table.provider} ~ '^[a-z][a-z0-9_-]{0,39}$'`
    ),
    check(
      "billing_webhook_event_id_length",
      sql`char_length(${table.providerEventId}) between 1 and 255`
    ),
    check(
      "billing_webhook_event_type_length",
      sql`char_length(${table.eventType}) between 1 and 120`
    ),
    check(
      "billing_webhook_payload_hash_format",
      sql`${table.payloadSha256} ~ '^[a-f0-9]{64}$'`
    )
  ]
).enableRLS();

export const clinicEntitlements = pgTable(
  "clinic_entitlements",
  {
    tenantId: uuid("tenant_id")
      .primaryKey()
      .references(() => clinics.id, { onDelete: "cascade" }),
    status: clinicEntitlementStatusEnum("status").notNull(),
    source: text("source").notNull(),
    provider: text("provider"),
    billingCheckoutId: uuid("billing_checkout_id").references(
      () => billingCheckoutSessions.id,
      { onDelete: "set null" }
    ),
    startsAt: timestamptz("starts_at").defaultNow().notNull(),
    accessUntil: timestamptz("access_until"),
    createdAt: timestamptz("created_at").defaultNow().notNull(),
    updatedAt: timestamptz("updated_at").defaultNow().notNull()
  },
  (table) => [
    check(
      "clinic_entitlements_status_check",
      sql`${table.status} <> 'trialing'::clinic_entitlement_status`
    ),
    check(
      "clinic_entitlements_source_check",
      sql`${table.source} in ('manual', 'billing')`
    ),
    check(
      "clinic_entitlements_window_check",
      sql`${table.accessUntil} is null or ${table.accessUntil} > ${table.startsAt}`
    ),
    check(
      "clinic_entitlements_manual_expiry_check",
      sql`${table.source} <> 'manual' or ${table.accessUntil} is not null`
    ),
    check(
      "clinic_entitlements_past_due_expiry_check",
      sql`${table.status} <> 'past_due'::clinic_entitlement_status or ${table.accessUntil} is not null`
    ),
    check(
      "clinic_entitlements_provider_format",
      sql`${table.provider} is null or ${table.provider} ~ '^[a-z][a-z0-9_-]{0,39}$'`
    ),
    check(
      "clinic_entitlements_source_provider_check",
      sql`(${table.source} = 'manual' and ${table.provider} is null and ${table.billingCheckoutId} is null)
        or (${table.source} = 'billing' and ${table.provider} is not null)`
    )
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
    index("audit_events_export_rate_limit_idx")
      .on(table.tenantId, table.actorUserId, table.createdAt)
      .where(sql`${table.eventType} = 'export.started'`),
    check(
      "audit_events_type_check",
      sql`${table.eventType} in (
        'clinic.created',
        'clinic.profile_updated',
        'auth.signup',
        'auth.login',
        'auth.mfa_enrolled',
        'auth.session_revoked',
        'auth.idle_lock',
        'auth.outbox_discarded',
        'auth.password_changed',
        'member.invited',
        'member.removed',
        'access.denied',
        'service.created',
        'service.updated',
        'service.deleted',
        'booking.accepted',
        'booking.declined',
        'patient.created',
        'patient.updated',
        'appointment.set',
        'chart.appended',
        'quote.created',
        'payment.recorded',
        'opening_balance.noted',
        'collections.viewed',
        'import.started',
        'import.completed',
        'import.failed',
        'import.checklist_updated',
        'entitlement.trial_expired',
        'entitlement.grace_granted',
        'entitlement.expired',
        'entitlement.past_due',
        'entitlement.restored',
        'billing.checkout_started',
        'billing.payment_succeeded',
        'billing.payment_failed',
        'export.started',
        'export.completed',
        'export.failed'
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
    index("clinic_events_appointment_export_idx")
      .on(table.tenantId, table.id)
      .where(sql`${table.eventType} = 'appointment.set'`),
    index("clinic_events_payment_export_idx")
      .on(table.tenantId, table.id)
      .where(sql`${table.eventType} = 'payment.recorded'`),
    index("clinic_events_visit_status_export_idx")
      .on(
        table.tenantId,
        table.recordId,
        table.occurredAt,
        table.receivedAt,
        table.id
      )
      .where(sql`${table.eventType} = 'visit.status_changed'`),
    check(
      "clinic_events_type_check",
      sql`${table.eventType} in (
        'patient.created',
        'patient.updated',
        'chart.appended',
        'quote.created',
        'payment.recorded',
        'opening_balance.noted',
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

export type PatientImportMapping = {
  name: string | null;
  mobile: string | null;
  email: string | null;
  openingBalanceAmount: string | null;
  openingBalanceNote: string | null;
};

export type PatientImportDecision = "skip" | "merge" | "create";

export type PatientImportRow = {
  rowNumber: number;
  values: Record<string, string>;
  name: string;
  mobile: string;
  email?: string;
  mobileDigits: string;
  patientId: string;
  eventId: string;
  duplicatePatientId?: string;
  duplicateName?: string;
  duplicateEmail?: string;
  decision: PatientImportDecision;
  openingBalanceAmountMinor?: number;
  openingBalanceCurrency?: string;
  openingBalanceNote?: string;
  error?: string;
};

export const patientImportJobs = pgTable(
  "patient_import_jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    createdBy: uuid("created_by").notNull(),
    status: patientImportStatusEnum("status")
      .notNull()
      .default("awaiting_upload"),
    fileName: text("file_name").notNull(),
    storagePath: text("storage_path").notNull(),
    contentType: text("content_type").notNull(),
    fileSize: integer("file_size").notNull(),
    includeOpeningBalances: boolean("include_opening_balances").notNull().default(false),
    columns: jsonb("columns").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    mapping: jsonb("mapping")
      .$type<PatientImportMapping>()
      .notNull()
      .default(sql`'{"name":null,"mobile":null,"email":null,"openingBalanceAmount":null,"openingBalanceNote":null}'::jsonb`),
    rows: jsonb("rows")
      .$type<PatientImportRow[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    totalRows: integer("total_rows").notNull().default(0),
    importedRows: integer("imported_rows").notNull().default(0),
    failedRows: integer("failed_rows").notNull().default(0),
    skippedRows: integer("skipped_rows").notNull().default(0),
    lastError: text("last_error"),
    expiresAt: timestamptz("expires_at")
      .notNull()
      .default(sql`now() + interval '24 hours'`),
    objectDeletedAt: timestamptz("object_deleted_at"),
    dataPurgedAt: timestamptz("data_purged_at"),
    completedAt: timestamptz("completed_at"),
    createdAt: timestamptz("created_at").defaultNow().notNull(),
    updatedAt: timestamptz("updated_at").defaultNow().notNull()
  },
  (table) => [
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [authUsers.id],
      name: "patient_import_jobs_created_by_fk"
    }).onDelete("restrict"),
    uniqueIndex("patient_import_jobs_storage_path_idx").on(table.storagePath),
    index("patient_import_jobs_tenant_created_idx").on(
      table.tenantId,
      table.createdAt
    ),
    index("patient_import_jobs_expiry_idx")
      .on(table.expiresAt)
      .where(sql`${table.objectDeletedAt} is null or ${table.dataPurgedAt} is null`),
    check(
      "patient_import_jobs_file_size_bounds",
      sql`${table.fileSize} between 1 and 5000000`
    ),
    check(
      "patient_import_jobs_counts_non_negative",
      sql`${table.totalRows} >= 0 and ${table.importedRows} >= 0 and ${table.failedRows} >= 0 and ${table.skippedRows} >= 0`
    ),
    check(
      "patient_import_jobs_error_length",
      sql`${table.lastError} is null or char_length(${table.lastError}) <= 280`
    )
  ]
).enableRLS();

export type ServiceImportMapping = {
  name: string | null;
  price: string | null;
  duration: string | null;
  code: string | null;
  currency: string | null;
};

export type ServiceImportRow = {
  rowNumber: number;
  values: Record<string, string>;
  serviceId: string;
  existingServiceId?: string;
  existingCode?: string;
  name: string;
  code?: string;
  priceMinor?: number;
  durationMinutes?: number;
  currencyCode?: string;
  action: "create" | "update";
  error?: string;
};

export const serviceImportJobs = pgTable(
  "service_import_jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull().references(() => clinics.id, { onDelete: "cascade" }),
    createdBy: uuid("created_by").notNull(),
    status: serviceImportStatusEnum("status").notNull().default("awaiting_upload"),
    fileName: text("file_name").notNull(),
    storagePath: text("storage_path").notNull(),
    contentType: text("content_type").notNull(),
    fileSize: integer("file_size").notNull(),
    columns: jsonb("columns").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    mapping: jsonb("mapping").$type<ServiceImportMapping>().notNull().default(sql`'{"name":null,"price":null,"duration":null,"code":null,"currency":null}'::jsonb`),
    rows: jsonb("rows").$type<ServiceImportRow[]>().notNull().default(sql`'[]'::jsonb`),
    existingServiceIds: jsonb("existing_service_ids").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    totalRows: integer("total_rows").notNull().default(0),
    importedRows: integer("imported_rows").notNull().default(0),
    failedRows: integer("failed_rows").notNull().default(0),
    removedRows: integer("removed_rows").notNull().default(0),
    lastError: text("last_error"),
    expiresAt: timestamptz("expires_at").notNull().default(sql`now() + interval '24 hours'`),
    objectDeletedAt: timestamptz("object_deleted_at"),
    dataPurgedAt: timestamptz("data_purged_at"),
    completedAt: timestamptz("completed_at"),
    createdAt: timestamptz("created_at").defaultNow().notNull(),
    updatedAt: timestamptz("updated_at").defaultNow().notNull()
  },
  (table) => [
    foreignKey({ columns: [table.createdBy], foreignColumns: [authUsers.id], name: "service_import_jobs_created_by_fk" }).onDelete("restrict"),
    uniqueIndex("service_import_jobs_storage_path_idx").on(table.storagePath),
    index("service_import_jobs_tenant_created_idx").on(table.tenantId, table.createdAt),
    index("service_import_jobs_expiry_idx").on(table.expiresAt).where(sql`${table.objectDeletedAt} is null or ${table.dataPurgedAt} is null`),
    check("service_import_jobs_file_size_bounds", sql`${table.fileSize} between 1 and 5000000`),
    check("service_import_jobs_counts_non_negative", sql`${table.totalRows} >= 0 and ${table.importedRows} >= 0 and ${table.failedRows} >= 0 and ${table.removedRows} >= 0`)
  ]
).enableRLS();

export const migrationChecklists = pgTable(
  "migration_checklists",
  {
    tenantId: uuid("tenant_id")
      .primaryKey()
      .references(() => clinics.id, { onDelete: "cascade" }),
    completedItems: text("completed_items")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    updatedBy: uuid("updated_by").notNull(),
    updatedAt: timestamptz("updated_at").defaultNow().notNull()
  },
  (table) => [
    foreignKey({
      columns: [table.updatedBy],
      foreignColumns: [authUsers.id],
      name: "migration_checklists_updated_by_fk"
    }).onDelete("restrict"),
    check(
      "migration_checklists_completed_items_allowed",
      sql`${table.completedItems} <@ array[
        'export_old_system',
        'backup_created',
        'patients_imported',
        'services_imported',
        'balances_recorded',
        'privacy_reviewed',
        'records_spot_checked',
        'booking_enabled'
      ]::text[]`
    ),
    check(
      "migration_checklists_completed_items_unique",
      sql`array_position(${table.completedItems}, null) is null
        and cardinality(array_positions(${table.completedItems}, 'export_old_system')) <= 1
        and cardinality(array_positions(${table.completedItems}, 'backup_created')) <= 1
        and cardinality(array_positions(${table.completedItems}, 'patients_imported')) <= 1
        and cardinality(array_positions(${table.completedItems}, 'services_imported')) <= 1
        and cardinality(array_positions(${table.completedItems}, 'balances_recorded')) <= 1
        and cardinality(array_positions(${table.completedItems}, 'privacy_reviewed')) <= 1
        and cardinality(array_positions(${table.completedItems}, 'records_spot_checked')) <= 1
        and cardinality(array_positions(${table.completedItems}, 'booking_enabled')) <= 1`
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
    privacyNoticeVersion: text("privacy_notice_version"),
    privacyAcknowledgedAt: timestamptz("privacy_acknowledged_at"),
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
    ),
    check(
      "booking_requests_privacy_ack_pair",
      sql`(${table.privacyNoticeVersion} is null) = (${table.privacyAcknowledgedAt} is null)`
    ),
    check(
      "booking_requests_privacy_notice_version_length",
      sql`${table.privacyNoticeVersion} is null or char_length(${table.privacyNoticeVersion}) between 1 and 80`
    )
  ]
).enableRLS();

export type Clinic = typeof clinics.$inferSelect;
export type ClinicServiceRow = typeof clinicServices.$inferSelect;
export type ClinicMember = typeof clinicMembers.$inferSelect;
export type ClinicSession = typeof clinicSessions.$inferSelect;
export type TrustedDevice = typeof trustedDevices.$inferSelect;
export type AuditEvent = typeof auditEvents.$inferSelect;
export type BillingCheckoutSession = typeof billingCheckoutSessions.$inferSelect;
export type BillingWebhookEvent = typeof billingWebhookEvents.$inferSelect;
export type MigrationChecklist = typeof migrationChecklists.$inferSelect;
export type ClinicEvent = typeof clinicEvents.$inferSelect;
export type Patient = typeof patients.$inferSelect;
export type PatientImportJob = typeof patientImportJobs.$inferSelect;
export type ServiceImportJob = typeof serviceImportJobs.$inferSelect;
export type BookingLink = typeof bookingLinks.$inferSelect;
export type BookingRequest = typeof bookingRequests.$inferSelect;
