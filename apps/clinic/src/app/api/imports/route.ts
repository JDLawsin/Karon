import { NextResponse } from "next/server";

import {
  IMPORT_BUCKET,
  MAX_IMPORT_FILE_BYTES,
  createImportSchema,
  extensionForContentType,
  normalizeContentType,
  patientImportJobSchema,
  publicImportJob
} from "@/features/patient-import/patient-import";
import {
  IMPORT_JOB_COLUMNS,
  createSecureImportUploadToken,
  requireOwnerImportAccess
} from "@/features/patient-import/patient-import-server";

const MAX_IMPORTS_PER_HOUR = 10;

export const GET = async () => {
  const result = await requireOwnerImportAccess();

  if (!result.ok) {
    return result.response;
  }

  const { access } = result;
  const { data, error } = await access.supabase
    .from("patient_import_jobs")
    .select(IMPORT_JOB_COLUMNS)
    .eq("tenant_id", access.membership.tenantId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    return NextResponse.json({ error: "Could not load imports." }, { status: 500 });
  }

  const jobs = (data ?? []).map((job) => publicImportJob(patientImportJobSchema.parse(job)));
  return NextResponse.json(
    { jobs },
    { headers: { "Cache-Control": "private, no-store" } }
  );
};

export const POST = async (request: Request) => {
  const result = await requireOwnerImportAccess();

  if (!result.ok) {
    return result.response;
  }

  const parsed = createImportSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      { error: `Choose a CSV or Excel file smaller than ${MAX_IMPORT_FILE_BYTES / 1_000_000} MB.` },
      { status: 400 }
    );
  }

  const { access } = result;
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1_000).toISOString();
  const { count } = await access.supabase
    .from("patient_import_jobs")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", access.membership.tenantId)
    .gte("created_at", oneHourAgo);

  if ((count ?? 0) >= MAX_IMPORTS_PER_HOUR) {
    return NextResponse.json(
      { error: "Too many import attempts. Try again later." },
      { status: 429 }
    );
  }

  let contentType: string;

  try {
    contentType = normalizeContentType(parsed.data.fileName, parsed.data.contentType);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Choose a CSV or Excel file." },
      { status: 400 }
    );
  }

  const jobId = crypto.randomUUID();
  const extension = extensionForContentType(contentType);
  const storagePath = `${access.membership.tenantId}/${jobId}/source.${extension}`;
  const { data, error } = await access.supabase
    .from("patient_import_jobs")
    .insert({
      id: jobId,
      tenant_id: access.membership.tenantId,
      created_by: access.userId,
      file_name: parsed.data.fileName,
      storage_path: storagePath,
      content_type: contentType,
      file_size: parsed.data.fileSize
    })
    .select(IMPORT_JOB_COLUMNS)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "Secure staging is unavailable. The file was not uploaded." },
      { status: 503 }
    );
  }

  const uploadToken = await createSecureImportUploadToken(
    access.supabase,
    IMPORT_BUCKET,
    storagePath
  );

  if (!uploadToken) {
    await access.supabase
      .from("patient_import_jobs")
      .update({
        status: "failed",
        last_error: "Secure staging is unavailable.",
        updated_at: new Date().toISOString()
      })
      .eq("id", jobId);
    return NextResponse.json(
      { error: "Secure staging is unavailable. The file was not uploaded." },
      { status: 503 }
    );
  }

  return NextResponse.json(
    {
      job: publicImportJob(patientImportJobSchema.parse(data)),
      upload: {
        bucket: IMPORT_BUCKET,
        path: storagePath,
        token: uploadToken,
        contentType
      }
    },
    { status: 201 }
  );
};
