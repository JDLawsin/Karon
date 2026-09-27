"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createImportResponseSchema,
  importJobResponseSchema,
  importListResponseSchema,
  type ImportDecision,
  type ImportMapping,
  type PublicPatientImportJob
} from "@/features/patient-import/patient-import";
import { createBrowserSupabase } from "@/lib/supabase/browser";

const readError = async (response: Response) => {
  const body = await response.json().catch(() => null);
  return body && typeof body === "object" && "error" in body && typeof body.error === "string"
    ? body.error
    : "The import request failed.";
};

const postAction = async (
  jobId: string,
  body: Record<string, unknown>
): Promise<PublicPatientImportJob> => {
  const response = await fetch(`/api/imports/${encodeURIComponent(jobId)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return importJobResponseSchema.parse(await response.json()).job;
};

const loadImportJob = async (jobId: string) => {
  const response = await fetch(`/api/imports/${encodeURIComponent(jobId)}`, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return importJobResponseSchema.parse(await response.json()).job;
};

const createAndPreviewImport = async (file: File) => {
  const response = await fetch("/api/imports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName: file.name,
      fileSize: file.size,
      contentType: file.type
    })
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  const created = createImportResponseSchema.parse(await response.json());
  const supabase = createBrowserSupabase();
  const { error } = await supabase.storage
    .from(created.upload.bucket)
    .uploadToSignedUrl(created.upload.path, created.upload.token, file, {
      contentType: created.upload.contentType,
      upsert: false
    });

  if (error) {
    throw new Error("The secure upload failed. Check the connection and try again.");
  }

  return postAction(created.job.id, { action: "preview" });
};

const usePatientImport = (jobId: string | null) => {
  const queryClient = useQueryClient();
  const jobs = useQuery({
    queryKey: ["patient-imports"],
    queryFn: async () => {
      const response = await fetch("/api/imports", { cache: "no-store" });

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      return importListResponseSchema.parse(await response.json()).jobs;
    }
  });
  const job = useQuery({
    queryKey: ["patient-import", jobId],
    queryFn: () => loadImportJob(jobId!),
    enabled: Boolean(jobId),
    refetchInterval: (query) =>
      query.state.data?.status === "committing" ? 750 : false
  });

  const cacheJob = (next: PublicPatientImportJob) => {
    queryClient.setQueryData(["patient-import", next.id], next);
    void queryClient.invalidateQueries({ queryKey: ["patient-imports"] });
    return next;
  };

  const create = useMutation({
    mutationFn: createAndPreviewImport,
    onSuccess: cacheJob
  });
  const map = useMutation({
    mutationFn: ({ id, mapping }: { id: string; mapping: ImportMapping }) =>
      postAction(id, { action: "map", mapping }),
    onSuccess: cacheJob
  });
  const commit = useMutation({
    mutationFn: ({ id, decisions }: { id: string; decisions: ImportDecision[] }) =>
      postAction(id, { action: "commit", decisions }),
    onMutate: ({ id }) => {
      queryClient.setQueryData<PublicPatientImportJob>(
        ["patient-import", id],
        (current) => (current ? { ...current, status: "committing" } : current)
      );
    },
    onSuccess: cacheJob,
    onError: () => {
      if (jobId) {
        void queryClient.invalidateQueries({ queryKey: ["patient-import", jobId] });
      }
    }
  });

  return { commit, create, job, jobs, map };
};

export { usePatientImport };
