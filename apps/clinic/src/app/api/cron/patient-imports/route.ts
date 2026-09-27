import { NextResponse } from "next/server";

import { cleanupExpiredImports } from "@/features/patient-import/patient-import-server";
import { log } from "@/lib/logger/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

export const GET = async (request: Request) => {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");

  if (!secret || header !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Forbidden" }, { status: 401 });
  }

  try {
    const result = await cleanupExpiredImports(createAdminSupabase());
    return NextResponse.json({ ok: true, ...result });
  } catch {
    log.error("patient_import.cleanup_failed");
    return NextResponse.json({ error: "Cron failed." }, { status: 500 });
  }
};
