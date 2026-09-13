import { NextResponse } from "next/server";

import { authorizeOwnerAction } from "@/features/staff/authorize-owner";
import { ensureOwnerBookingLink } from "@/features/booking/ensure-booking-link";
import { getClinicAccess } from "@/lib/auth/clinic-access";

export const GET = async () => {
  const access = await getClinicAccess();
  const authz = authorizeOwnerAction({
    userId: access.userId,
    aal: access.aal,
    role: access.membership?.role ?? null,
    mfaOk: access.mfaOk
  });

  if (!authz.ok || !access.membership || !access.userId || !access.sessionActive) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: authz.ok ? 401 : authz.status }
    );
  }

  const link = await ensureOwnerBookingLink({
    supabase: access.supabase,
    tenantId: access.membership.tenantId,
    userId: access.userId
  });

  if (!link) {
    return NextResponse.json({ error: "Could not create a booking link." }, { status: 400 });
  }

  return NextResponse.json(link);
};
