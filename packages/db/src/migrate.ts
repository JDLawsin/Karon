import { readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";

import postgres from "postgres";

import { databaseUrl, loadEnvFiles, repoRoot } from "./load-env.ts";

const files = [
  "packages/db/drizzle/0000_peaceful_iron_lad.sql",
  "packages/db/drizzle/0001_rls_policies.sql",
  "packages/db/drizzle/0002_session_rpcs.sql",
  "packages/db/drizzle/0003_clinic_name_length.sql",
  "packages/db/drizzle/0004_owner_mfa_and_revoke.sql",
  "packages/db/drizzle/0005_create_clinic_requires_aal2.sql",
  "packages/db/drizzle/0006_trusted_devices.sql",
  "packages/db/drizzle/0007_password_change_revoke.sql",
  "packages/db/drizzle/0008_revoke_anon_grants.sql",
  "packages/db/drizzle/0009_audit_session_search_path.sql",
  "packages/db/drizzle/0010_clinic_events.sql",
  "packages/db/drizzle/0011_clinic_events_payment_select.sql",
  "packages/db/drizzle/0012_clinic_profile.sql",
  "packages/db/drizzle/0013_clinic_branding_mfa.sql",
  "packages/db/drizzle/0014_appointments.sql",
  "packages/db/drizzle/0015_google_booking_pages.sql",
  "packages/db/drizzle/0016_booking_links.sql",
  "packages/db/drizzle/0017_booking_invariants.sql",
  "packages/db/drizzle/0018_clinic_services.sql",
  "packages/db/drizzle/0019_service_prices_durations.sql",
  "packages/db/drizzle/0020_private_schema_usage.sql",
  "packages/db/drizzle/0021_patient_projection.sql",
  "packages/db/drizzle/0022_live_booking_inbox.sql",
  "packages/db/drizzle/0023_chart_events.sql",
  "packages/db/drizzle/0024_quote_events.sql",
  "packages/db/drizzle/0025_payment_events.sql",
  "packages/db/drizzle/0026_owner_collections.sql"
];

const splitSql = (contents: string) => {
  if (!contents.includes("--> statement-breakpoint")) {
    return [contents];
  }

  return contents
    .split("--> statement-breakpoint")
    .map((statement) => statement.trim())
    .filter(Boolean);
};

const migrate = async () => {
  loadEnvFiles();
  const url = databaseUrl();

  if (!url) {
    throw new Error("DATABASE_URL is missing");
  }

  const sql = postgres(url, { max: 1, prepare: false, ssl: "require" });

  try {
    await sql.unsafe(`
      create table if not exists public.karon_schema_migrations (
        id text primary key,
        applied_at timestamptz not null default now()
      );
      alter table public.karon_schema_migrations enable row level security;
      alter table public.karon_schema_migrations force row level security;
      revoke all on table public.karon_schema_migrations from public, anon, authenticated;
    `);

    const existing = await sql<{ clinics: string | null }[]>`
      select to_regclass('public.clinics')::text as clinics
    `;

    if (existing[0]?.clinics) {
      await sql.unsafe(`
        insert into public.karon_schema_migrations (id)
        values
          ('0000_peaceful_iron_lad.sql'),
          ('0001_rls_policies.sql')
        on conflict (id) do nothing
      `);
    }

    const appliedRows = await sql<{ id: string }[]>`
      select id from public.karon_schema_migrations
    `;
    const applied = new Set(appliedRows.map((row) => row.id));

    for (const file of files) {
      const id = basename(file);

      if (applied.has(id)) {
        continue;
      }

      const contents = await readFile(resolve(repoRoot, file), "utf8");

      for (const statement of splitSql(contents)) {
        await sql.unsafe(statement);
      }

      await sql`insert into public.karon_schema_migrations (id) values (${id})`;
    }
  } finally {
    await sql.end();
  }
};

await migrate();
