import { NextResponse } from "next/server";

import { authorizeOwnerAction } from "@/features/staff/authorize-owner";
import {
  revokeDevice,
  revokeOtherDevices,
  sessionBodySchema
} from "@/features/staff/manage-members";
import { writeAuditEvent } from "@/lib/auth/audit";
import { getClinicAccess } from "@/lib/auth/clinic-access";

export const POST = async (request: Request) => {
  const access = await getClinicAccess();
  const authz = authorizeOwnerAction({
    userId: access.userId,
    aal: access.aal,
    role: access.membership?.role ?? null,
    mfaOk: access.mfaOk
  });

  if (!authz.ok) {
    if (authz.status === 403 && access.membership && access.userId) {
      await writeAuditEvent(access.supabase, {
        tenantId: access.membership.tenantId,
        actorUserId: access.userId,
        eventType: "access.denied"
      });
    }

    return NextResponse.json({ error: "Forbidden" }, { status: authz.status });
  }

  const body = sessionBodySchema.safeParse(await request.json().catch(() => null));

  if (!body.success || !access.membership || !access.userId) {
    return NextResponse.json({ error: "Invalid session." }, { status: 400 });
  }

  const result =
    "others" in body.data
      ? await revokeOtherDevices({
          userClient: access.supabase,
          tenantId: access.membership.tenantId,
          actorUserId: access.userId
        })
      : await revokeDevice({
          userClient: access.supabase,
          tenantId: access.membership.tenantId,
          actorUserId: access.userId,
          sessionRowId: body.data.sessionId
        });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true });
};
