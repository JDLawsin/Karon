// Deferred: Google Calendar — keep for later reconnect

import { NextResponse } from "next/server";

import { runCalendarCron } from "@/lib/google-calendar/calendar-sync";
import { log } from "@/lib/logger/server";

export const GET = async (request: Request) => {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");

  if (!secret || header !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Forbidden" }, { status: 401 });
  }

  try {
    const fullSync = new URL(request.url).searchParams.get("full") === "1";
    await runCalendarCron({ fullSync });
    return NextResponse.json({ ok: true, fullSync });
  } catch {
    log.error("gcal.cron_failed");
    return NextResponse.json({ error: "Cron failed." }, { status: 500 });
  }
};
