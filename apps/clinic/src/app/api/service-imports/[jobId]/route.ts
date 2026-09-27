import { NextResponse } from "next/server";

import { ImportFileError } from "@/features/patient-import/patient-import";
import { requireOwnerImportAccess } from "@/features/patient-import/patient-import-server";
import {
  publicServiceImportJob,
  serviceErrorRowsCsv,
  serviceImportActionSchema
} from "@/features/service-import/service-import";
import {
  commitServiceImportJob,
  loadServiceImportJob,
  previewServiceImportJob,
  updateServicePreview
} from "@/features/service-import/service-import-server";

export const runtime = "nodejs";
type Context = { params: Promise<{ jobId: string }> };

export const GET = async (request: Request, { params }: Context) => {
  const result = await requireOwnerImportAccess();
  if (!result.ok) return result.response;
  const { access } = result;
  const { jobId } = await params;
  const job = await loadServiceImportJob(
    access.supabase,
    access.membership.tenantId,
    jobId
  );
  if (!job) return NextResponse.json({ error: "Import not found." }, { status: 404 });

  if (new URL(request.url).searchParams.get("download") === "errors") {
    return new NextResponse(serviceErrorRowsCsv(job.columns, job.rows), {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": `attachment; filename="service-import-${job.id}-errors.csv"`,
        "Content-Type": "text/csv; charset=utf-8"
      }
    });
  }
  return NextResponse.json(
    { job: publicServiceImportJob(job) },
    { headers: { "Cache-Control": "private, no-store" } }
  );
};

export const POST = async (request: Request, { params }: Context) => {
  const result = await requireOwnerImportAccess();
  if (!result.ok) return result.response;
  const action = serviceImportActionSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!action.success) {
    return NextResponse.json({ error: "Invalid import action." }, { status: 400 });
  }

  const { access } = result;
  const { jobId } = await params;
  const job = await loadServiceImportJob(
    access.supabase,
    access.membership.tenantId,
    jobId
  );
  if (!job) return NextResponse.json({ error: "Import not found." }, { status: 404 });

  try {
    const next =
      action.data.action === "preview"
        ? await previewServiceImportJob(access.supabase, job)
        : action.data.action === "map"
          ? await updateServicePreview(access.supabase, job, action.data.mapping)
          : await commitServiceImportJob(
              access.supabase,
              job,
              action.data.removeUnmapped
            );
    return NextResponse.json({ job: publicServiceImportJob(next) });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof ImportFileError
            ? error.message
            : "The service import could not be completed."
      },
      { status: 422 }
    );
  }
};
