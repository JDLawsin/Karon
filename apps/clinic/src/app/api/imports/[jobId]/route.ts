import { NextResponse } from "next/server";

import {
  ImportFileError,
  errorRowsCsv,
  importActionSchema,
  publicImportJob
} from "@/features/patient-import/patient-import";
import {
  commitImportJob,
  loadImportJob,
  previewImportJob,
  requireOwnerImportAccess,
  updatePreview
} from "@/features/patient-import/patient-import-server";

export const runtime = "nodejs";

type Context = {
  params: Promise<{ jobId: string }>;
};

export const GET = async (request: Request, { params }: Context) => {
  const result = await requireOwnerImportAccess();

  if (!result.ok) {
    return result.response;
  }

  const { access } = result;
  const { jobId } = await params;
  const job = await loadImportJob(
    access.supabase,
    access.membership.tenantId,
    jobId
  );

  if (!job) {
    return NextResponse.json({ error: "Import not found." }, { status: 404 });
  }

  if (new URL(request.url).searchParams.get("download") === "errors") {
    return new NextResponse(errorRowsCsv(job), {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": `attachment; filename="patient-import-${job.id}-errors.csv"`,
        "Content-Type": "text/csv; charset=utf-8"
      }
    });
  }

  return NextResponse.json(
    { job: publicImportJob(job) },
    { headers: { "Cache-Control": "private, no-store" } }
  );
};

export const POST = async (request: Request, { params }: Context) => {
  const result = await requireOwnerImportAccess();

  if (!result.ok) {
    return result.response;
  }

  const action = importActionSchema.safeParse(await request.json().catch(() => null));

  if (!action.success) {
    return NextResponse.json({ error: "Invalid import action." }, { status: 400 });
  }

  const { access } = result;
  const { jobId } = await params;
  const job = await loadImportJob(
    access.supabase,
    access.membership.tenantId,
    jobId
  );

  if (!job) {
    return NextResponse.json({ error: "Import not found." }, { status: 404 });
  }

  try {
    if (action.data.action === "preview") {
      return NextResponse.json({ job: publicImportJob(await previewImportJob(access.supabase, job)) });
    }

    if (action.data.action === "map") {
      return NextResponse.json({
        job: publicImportJob(
          await updatePreview(access.supabase, job, action.data.mapping)
        )
      });
    }

    return NextResponse.json({
      job: publicImportJob(
        await commitImportJob(access.supabase, job, action.data.decisions)
      )
    });
  } catch (error) {
    const message =
      error instanceof ImportFileError
        ? error.message
        : "The import could not be completed.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
};
