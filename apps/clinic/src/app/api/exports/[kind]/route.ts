import { NextResponse } from "next/server";

import { parseExportKind } from "@/features/clinic-export/clinic-export";
import {
  ClinicExportError,
  ClinicExportRateLimitedError,
  countClinicExportRows,
  createClinicExportStream,
  loadClinicExportCutoff,
  reserveClinicExport
} from "@/features/clinic-export/clinic-export-server";
import { authorizeOwnerAction } from "@/features/staff/authorize-owner";
import { writeAuditEvent } from "@/lib/auth/audit";
import { getClinicAccess } from "@/lib/auth/clinic-access";

type Context = {
  params: Promise<{ kind: string }>;
};

export const GET = async (_request: Request, { params }: Context) => {
  const access = await getClinicAccess();
  const authz = authorizeOwnerAction({
    userId: access.userId,
    aal: access.aal,
    role: access.membership?.role ?? null,
    mfaOk: access.mfaOk
  });

  if (!authz.ok || !access.sessionActive || !access.membership || !access.userId) {
    if (authz.status === 403 && access.membership && access.userId) {
      await writeAuditEvent(access.supabase, {
        tenantId: access.membership.tenantId,
        actorUserId: access.userId,
        eventType: "access.denied"
      });
    }

    const status = authz.ok ? 403 : authz.status;
    return NextResponse.json(
      { error: status === 401 ? "Unauthorized" : "Forbidden" },
      { status }
    );
  }

  const kind = parseExportKind((await params).kind);

  if (!kind) {
    return NextResponse.json({ error: "Unknown export type." }, { status: 400 });
  }

  try {
    const cutoff = await loadClinicExportCutoff(
      access.supabase,
      access.membership.tenantId,
      kind
    );
    const rowCount = await countClinicExportRows(
      access.supabase,
      access.membership.tenantId,
      kind,
      cutoff
    );
    await reserveClinicExport(
      access.supabase,
      access.membership.tenantId,
      access.userId,
      kind,
      rowCount
    );
    const stream = createClinicExportStream({
      supabase: access.supabase,
      tenantId: access.membership.tenantId,
      actorUserId: access.userId,
      kind,
      cutoff
    });
    const day = new Date().toISOString().slice(0, 10);

    return new Response(stream, {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": `attachment; filename="karon-${kind}-${day}.csv"`,
        "Content-Type": "text/csv; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "X-Export-Row-Count": String(rowCount)
      }
    });
  } catch (error) {
    if (error instanceof ClinicExportRateLimitedError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }

    const message =
      error instanceof ClinicExportError
        ? "Clinic export is temporarily unavailable."
        : "Could not prepare the clinic export.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
};
