import { NextResponse } from "next/server";

import { authorizeOwnerAction } from "@/features/staff/authorize-owner";
import { getClinicAccess } from "@/lib/auth/clinic-access";
import { saveCalendarSettings } from "@/lib/google-calendar/calendar-sync";

export const POST = async (request: Request) => {
  const access = await getClinicAccess();
  const authz = authorizeOwnerAction({
    userId: access.userId,
    aal: access.aal,
    role: access.membership?.role ?? null,
    mfaOk: access.mfaOk
  });

  if (!authz.ok || !access.membership || !access.sessionActive) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: authz.ok ? 401 : authz.status }
    );
  }

  const body: unknown = await request.json().catch(() => null);
  const result = await saveCalendarSettings(access.membership.tenantId, body);

  if (!result.ok) {
    return NextResponse.json(
      { error: result.status === 404 ? "Not connected." : "Invalid booking settings." },
      { status: result.status }
    );
  }

  return NextResponse.json({
    ok: true,
    calendarId: result.calendarId,
    bookingPages: result.bookingPages
  });
};
