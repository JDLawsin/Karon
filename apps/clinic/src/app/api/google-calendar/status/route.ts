import { NextResponse } from "next/server";

import { authorizeOwnerAction } from "@/features/staff/authorize-owner";
import { getClinicAccess } from "@/lib/auth/clinic-access";
import { googleCalendarStatus } from "@/lib/google-calendar/calendar-sync";

export const GET = async () => {
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

  return NextResponse.json(await googleCalendarStatus(access.membership.tenantId));
};
