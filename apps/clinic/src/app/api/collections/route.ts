import { NextResponse } from "next/server";

import {
  CollectionsDayOutOfRangeError,
  getOwnerCollections,
  parseCollectionsDay
} from "@/features/owner-collections/owner-collections";
import { authorizeOwnerAction } from "@/features/staff/authorize-owner";
import { writeAuditEvent } from "@/lib/auth/audit";
import { getClinicAccess } from "@/lib/auth/clinic-access";

export const GET = async (request: Request) => {
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

    return NextResponse.json(
      { error: authz.status === 401 ? "Unauthorized" : "Forbidden" },
      { status: authz.status }
    );
  }

  if (!access.membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rawDay = new URL(request.url).searchParams.get("day");
  const day = rawDay === null ? null : parseCollectionsDay(rawDay);

  if (rawDay !== null && !day) {
    return NextResponse.json({ error: "Invalid collections day." }, { status: 400 });
  }

  try {
    const report = await getOwnerCollections(
      access.supabase,
      access.membership.tenantId,
      day
    );
    return NextResponse.json(
      { report },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    if (error instanceof CollectionsDayOutOfRangeError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: "Could not load collections." }, { status: 500 });
  }
};
