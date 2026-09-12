import { NextResponse } from "next/server";

import { authorizeOwnerAction } from "@/features/staff/authorize-owner";
import { getClinicAccess } from "@/lib/auth/clinic-access";

export const POST = async () => {
  const access = await getClinicAccess();
  const authz = authorizeOwnerAction({
    userId: access.userId,
    aal: access.aal,
    role: access.membership?.role ?? null,
    mfaOk: access.mfaOk
  });

  if (!authz.ok || !access.membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: authz.status });
  }

  const { error } = await access.supabase
    .from("google_calendar_connections")
    .delete()
    .eq("tenant_id", access.membership.tenantId);

  if (error) {
    return NextResponse.json({ error: "Could not disconnect." }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
};
