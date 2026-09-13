// Deferred: Google Calendar — keep for later reconnect

import { NextResponse } from "next/server";

import { getClinicAccess } from "@/lib/auth/clinic-access";
import { cancelGoogleEvent } from "@/lib/google-calendar/calendar-sync";

export const POST = async (request: Request) => {
  const access = await getClinicAccess();

  if (!access.userId || !access.membership || !access.sessionActive) {
    return NextResponse.json({ error: "Forbidden" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    googleEventId?: string;
  } | null;
  const googleEventId = body?.googleEventId?.trim();

  if (!googleEventId) {
    return NextResponse.json({ error: "Missing event." }, { status: 400 });
  }

  const result = await cancelGoogleEvent(access.membership.tenantId, googleEventId);

  if (result === "unlinked") {
    return NextResponse.json({ error: "Unknown event." }, { status: 404 });
  }

  return NextResponse.json({ ok: result === "deleted" });
};
