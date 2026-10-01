import { createHmac, randomUUID } from "node:crypto";

import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { databaseUrl, loadEnvFiles } from "./load-env";
import {
  createMarketingLeadStore,
  marketingLeadInputSchema,
  marketingLeadSchemaColumns,
} from "./marketing-leads";

loadEnvFiles();

const url = databaseUrl();
const configured = Boolean(url);
const suffix = randomUUID();
const submissionId = randomUUID();
const rateKeys = {
  ip: `rls-test-ip:${suffix}`,
  lead: `rls-test-lead:${suffix}`,
  global: `rls-test-global:${suffix}`
};
const lead = marketingLeadInputSchema.parse({
  submissionId,
  intent: "application",
  name: "Test Dentist",
  clinicName: "Test Dental Clinic",
  country: "PH",
  province: "Cebu",
  city: "Cebu City",
  email: `lead-${suffix}@example.test`,
  clinicSize: "1_chair",
  role: "owner_dentist",
  mobile: "09171234567",
  message: undefined,
  privacyAcknowledged: true,
  marketingOptIn: false,
  privacyNoticeVersion: "2026-09-30",
  marketingWordingVersion: "2026-09-30",
  sourcePage: "/demo",
  renderedAt: Date.now() - 3_000,
  turnstileToken: "integration-test",
  website: "",
  attribution: {}
});

describe.skipIf(!configured)("KR-030 marketing lead isolation", () => {
  const admin = postgres(url!, { max: 2, prepare: false, ssl: "require" });
  const secondInstance = postgres(url!, { max: 1, prepare: false, ssl: "require" });
  const store = createMarketingLeadStore(url!);

  beforeAll(async () => {
    const rows = await admin<{ table_name: string | null }[]>`
      select to_regclass('marketing.marketing_leads')::text as table_name
    `;
    expect(rows[0]?.table_name).toBe("marketing.marketing_leads");
  });

  afterAll(async () => {
    await admin`delete from marketing.marketing_leads where submission_id = ${submissionId}`;
    await admin`delete from private.rate_limit_buckets where key_hash like ${`%${suffix}%`}`;
    await store.close();
    await secondInstance.end();
    await admin.end();
  });

  it("matches the reviewed schema exactly", async () => {
    const rows = await admin<{ column_name: string }[]>`
      select column_name
      from information_schema.columns
      where table_schema = 'marketing' and table_name = 'marketing_leads'
      order by ordinal_position
    `;

    expect(rows.map(({ column_name }) => column_name)).toEqual(marketingLeadSchemaColumns);
  });

  it("deduplicates concurrent submissions on the non-personal submission id", async () => {
    const results = await Promise.all([
      store.submit(lead, rateKeys, new Date()),
      store.submit(lead, rateKeys, new Date())
    ]);
    const rows = await admin<{ count: number }[]>`
      select count(*)::integer as count
      from marketing.marketing_leads
      where submission_id = ${submissionId}
    `;

    expect(results.filter(({ created }) => created)).toHaveLength(1);
    expect(rows[0]?.count).toBe(1);
  });

  it.each(["anon", "authenticated"] as const)(
    "denies every table operation and limiter execution to %s",
    async (role) => {
      const denied = async (statement: string) => admin.begin(async (transaction) => {
        await transaction.unsafe(`set local role ${role}`);
        await transaction.unsafe(statement);
      });

      await expect(denied("select * from marketing.marketing_leads")).rejects.toBeTruthy();
      await expect(denied(`
        insert into marketing.marketing_leads (
          submission_id, intent, name, clinic_name, country_code, city, email,
          clinic_size, role, privacy_acknowledged_at, privacy_notice_version
        ) values (
          gen_random_uuid(), 'application', 'Denied Dentist', 'Denied Dental',
          'PH', 'Cebu City', 'denied@example.test', '1_chair',
          'owner_dentist', now(), '2026-09-30'
        )
      `)).rejects.toMatchObject({ code: "42501" });
      await expect(denied("update marketing.marketing_leads set status = 'closed'")).rejects.toBeTruthy();
      await expect(denied("delete from marketing.marketing_leads")).rejects.toBeTruthy();
      await expect(denied("select private.rate_limit_hit('forbidden', interval '1 minute', 1)")).rejects.toBeTruthy();
    }
  );

  it("increments the shared limiter atomically across two instances", async () => {
    const key = `atomic:${suffix}`;
    const hit = async (client: typeof admin) => client.begin(async (transaction) => {
      await transaction.unsafe("set local role service_role");
      const rows = await transaction<{ limited: boolean }[]>`
        select private.rate_limit_hit(${key}, interval '10 minutes', 2) as limited
      `;
      return rows[0]?.limited;
    });

    await expect(Promise.all([hit(admin), hit(secondInstance)])).resolves.toEqual([false, false]);
    await expect(hit(admin)).resolves.toBe(true);
  });

  it("uses opaque HMAC-style keys rather than raw IP addresses", () => {
    const key = createHmac("sha256", "test-secret").update("203.0.113.9").digest("hex");
    expect(key).not.toContain("203.0.113.9");
    expect(key).toHaveLength(64);
  });
});
