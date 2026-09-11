CREATE TYPE "public"."clinic_role" AS ENUM('owner', 'assistant');--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"actor_user_id" uuid,
	"event_type" text NOT NULL,
	"record_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "audit_events_type_check" CHECK ("audit_events"."event_type" in (
        'clinic.created',
        'auth.signup',
        'auth.login',
        'auth.mfa_enrolled',
        'auth.session_revoked',
        'auth.idle_lock',
        'member.invited',
        'member.removed',
        'access.denied'
      ))
);
--> statement-breakpoint
ALTER TABLE "audit_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "clinic_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "clinic_role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clinic_members" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "clinic_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"last_active_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clinic_sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "clinics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"region" text DEFAULT 'ph' NOT NULL,
	"trial_started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clinics" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_tenant_id_clinics_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinic_members" ADD CONSTRAINT "clinic_members_tenant_id_clinics_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinic_members" ADD CONSTRAINT "clinic_members_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinic_sessions" ADD CONSTRAINT "clinic_sessions_tenant_id_clinics_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinic_sessions" ADD CONSTRAINT "clinic_sessions_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_events_tenant_created_idx" ON "audit_events" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "clinic_members_user_id_idx" ON "clinic_members" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "clinic_members_one_owner_idx" ON "clinic_members" USING btree ("tenant_id") WHERE "clinic_members"."role" = 'owner';--> statement-breakpoint
CREATE INDEX "clinic_members_tenant_id_idx" ON "clinic_members" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "clinic_sessions_session_id_idx" ON "clinic_sessions" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "clinic_sessions_tenant_user_idx" ON "clinic_sessions" USING btree ("tenant_id","user_id");