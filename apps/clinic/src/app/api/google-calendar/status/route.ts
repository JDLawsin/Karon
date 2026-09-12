import { NextResponse } from "next/server";

import { authorizeOwnerAction } from "@/features/staff/authorize-owner";
import { getClinicAccess } from "@/lib/auth/clinic-access";
import { googleCalendarConfigured } from "@/lib/google-calendar/calendar-sync";

export const GET = async () => {
  const access = await getClinicAccess();
  const authz = authorizeOwnerAction({
    userId: access.userId,
    aal: access.aal,
    role: access.membership?.role ?? null,
    mfaOk: access.mfaOk
  });

  if (!authz.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: authz.status });
  }

  if (!access.membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 401 });
  }

  const { data } = await access.supabase
    .from("google_calendar_connections")
    .select("id")
    .eq("tenant_id", access.membership.tenantId)
    .maybeSingle();

  return NextResponse.json({
    configured: googleCalendarConfigured(),
    connected: Boolean(data)
  });
};
