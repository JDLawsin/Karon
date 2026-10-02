import {
  createMarketingLeadStore,
  leadRetentionCutoff
} from "@karon/db";
import { parseLeadRetentionDays } from "../../../../../content/legal-status";

let store: ReturnType<typeof createMarketingLeadStore> | undefined;

const leadStore = () => {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) throw new Error("DATABASE_URL is required for lead retention");
  store ??= createMarketingLeadStore(databaseUrl);
  return store;
};

export const GET = async (request: Request) => {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Forbidden" }, { status: 401 });
  }

  const retentionDays = parseLeadRetentionDays(process.env.LEAD_RETENTION_DAYS);
  if (retentionDays === null) {
    return Response.json({ error: "Lead retention is not configured." }, { status: 503 });
  }

  try {
    const deleted = await leadStore().deleteExpired(leadRetentionCutoff(new Date(), retentionDays));
    return Response.json({ ok: true, deleted });
  } catch {
    return Response.json({ error: "Retention job failed." }, { status: 500 });
  }
};
