import { NextResponse } from "next/server";

import { cleanupExpiredImports } from "@/features/patient-import/patient-import-server";
import { cleanupExpiredServiceImports } from "@/features/service-import/service-import-server";
import { log } from "@/lib/logger/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

export const GET = async (request: Request) => {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");

  if (!secret || header !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Forbidden" }, { status: 401 });
  }

  try {
    const supabase = createAdminSupabase();
    const [patients, services] = await Promise.all([
      cleanupExpiredImports(supabase),
      cleanupExpiredServiceImports(supabase)
    ]);
    return NextResponse.json({ ok: true, patients, services });
  } catch {
    log.error("import.cleanup_failed");
    return NextResponse.json({ error: "Cron failed." }, { status: 500 });
  }
};
