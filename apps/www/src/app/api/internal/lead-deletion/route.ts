import { createMarketingLeadStore, marketingLeadDeletionSchema } from "@karon/db";

let store: ReturnType<typeof createMarketingLeadStore> | undefined;

const leadStore = () => {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) throw new Error("DATABASE_URL is required for lead deletion");
  store ??= createMarketingLeadStore(databaseUrl);
  return store;
};

export const DELETE = async (request: Request) => {
  const secret = process.env.LEAD_DELETION_SECRET?.trim();
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Forbidden" }, { status: 401 });
  }

  const payload = marketingLeadDeletionSchema.safeParse(await request.json().catch(() => null));
  if (!payload.success) {
    return Response.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  try {
    const deleted = await leadStore().deleteByEmail(payload.data.email);
    return Response.json({ ok: true, deleted });
  } catch {
    return Response.json({ error: "Deletion failed." }, { status: 500 });
  }
};
