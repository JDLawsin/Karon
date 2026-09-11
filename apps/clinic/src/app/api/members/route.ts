import { NextResponse } from "next/server";

import { magicLinkRedirect } from "@/features/auth/auth-redirects";
import { authorizeOwnerAction } from "@/features/staff/authorize-owner";
import {
  inviteAssistant,
  inviteBodySchema,
  listStaffDirectory,
  memberUserSchema,
  removeAssistant
} from "@/features/staff/manage-members";
import { writeAuditEvent } from "@/lib/auth/audit";
import { getClinicAccess } from "@/lib/auth/clinic-access";
import { clinicAppOrigin } from "@/lib/server-env";
import { createAdminSupabase } from "@/lib/supabase/admin";

const deny = async (
  status: 401 | 403,
  access: Awaited<ReturnType<typeof getClinicAccess>>
) => {
  if (status === 403 && access.membership && access.userId) {
    await writeAuditEvent(access.supabase, {
      tenantId: access.membership.tenantId,
      actorUserId: access.userId,
      eventType: "access.denied"
    });
  }

  return NextResponse.json({ error: "Forbidden" }, { status });
};

export const GET = async () => {
  const access = await getClinicAccess();
  const authz = authorizeOwnerAction({
    userId: access.userId,
    aal: access.aal,
    role: access.membership?.role ?? null,
    mfaOk: access.mfaOk
  });

  if (!authz.ok) {
    return deny(authz.status, access);
  }

  const result = await listStaffDirectory({
    userClient: access.supabase,
    admin: createAdminSupabase()
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    members: result.members,
    sessions: result.sessions
  });
};

export const POST = async (request: Request) => {
  const access = await getClinicAccess();
  const authz = authorizeOwnerAction({
    userId: access.userId,
    aal: access.aal,
    role: access.membership?.role ?? null,
    mfaOk: access.mfaOk
  });

  if (!authz.ok) {
    return deny(authz.status, access);
  }

  const body = inviteBodySchema.safeParse(await request.json().catch(() => null));

  if (!body.success || !access.membership || !access.userId) {
    return NextResponse.json({ error: "Invalid invite." }, { status: 400 });
  }

  const result = await inviteAssistant({
    userClient: access.supabase,
    admin: createAdminSupabase(),
    tenantId: access.membership.tenantId,
    actorUserId: access.userId,
    email: body.data.email,
    redirectTo: magicLinkRedirect(clinicAppOrigin())
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true, userId: result.userId });
};

export const DELETE = async (request: Request) => {
  const access = await getClinicAccess();
  const authz = authorizeOwnerAction({
    userId: access.userId,
    aal: access.aal,
    role: access.membership?.role ?? null,
    mfaOk: access.mfaOk
  });

  if (!authz.ok) {
    return deny(authz.status, access);
  }

  const body = memberUserSchema.safeParse(await request.json().catch(() => null));

  if (!body.success || !access.membership || !access.userId) {
    return NextResponse.json({ error: "Invalid member." }, { status: 400 });
  }

  const result = await removeAssistant({
    userClient: access.supabase,
    tenantId: access.membership.tenantId,
    actorUserId: access.userId,
    memberUserId: body.data.userId
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true });
};
