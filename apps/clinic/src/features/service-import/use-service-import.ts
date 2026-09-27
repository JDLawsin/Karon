"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createServiceImportResponseSchema,
  serviceImportJobResponseSchema,
  serviceImportListResponseSchema,
  type PublicServiceImportJob,
  type ServiceImportMapping
} from "@/features/service-import/service-import";
import { createBrowserSupabase } from "@/lib/supabase/browser";

const readError = async (response: Response) => {
  const body = await response.json().catch(() => null);
  return body && typeof body === "object" && "error" in body && typeof body.error === "string"
    ? body.error
    : "The service import request failed.";
};

const postAction = async (jobId: string, body: Record<string, unknown>) => {
  const response = await fetch(`/api/service-imports/${encodeURIComponent(jobId)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error(await readError(response));
  return serviceImportJobResponseSchema.parse(await response.json()).job;
};

const loadJob = async (jobId: string) => {
  const response = await fetch(`/api/service-imports/${encodeURIComponent(jobId)}`, {
    cache: "no-store"
  });
  if (!response.ok) throw new Error(await readError(response));
  return serviceImportJobResponseSchema.parse(await response.json()).job;
};

const createAndPreview = async (file: File) => {
  const response = await fetch("/api/service-imports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName: file.name, fileSize: file.size, contentType: file.type })
  });
  if (!response.ok) throw new Error(await readError(response));
  const created = createServiceImportResponseSchema.parse(await response.json());
  const { error } = await createBrowserSupabase().storage
    .from(created.upload.bucket)
    .uploadToSignedUrl(created.upload.path, created.upload.token, file, {
      contentType: created.upload.contentType,
      upsert: false
    });
  if (error) throw new Error("The secure upload failed. Check the connection and try again.");
  return postAction(created.job.id, { action: "preview" });
};

const useServiceImport = (jobId: string | null) => {
  const queryClient = useQueryClient();
  const jobs = useQuery({
    queryKey: ["service-imports"],
    queryFn: async () => {
      const response = await fetch("/api/service-imports", { cache: "no-store" });
      if (!response.ok) throw new Error(await readError(response));
      return serviceImportListResponseSchema.parse(await response.json()).jobs;
    }
  });
  const job = useQuery({
    queryKey: ["service-import", jobId],
    queryFn: () => loadJob(jobId!),
    enabled: Boolean(jobId),
    refetchInterval: (query) =>
      query.state.data?.status === "committing" ? 750 : false
  });
  const cacheJob = (next: PublicServiceImportJob) => {
    queryClient.setQueryData(["service-import", next.id], next);
    void queryClient.invalidateQueries({ queryKey: ["service-imports"] });
    return next;
  };

  const create = useMutation({ mutationFn: createAndPreview, onSuccess: cacheJob });
  const map = useMutation({
    mutationFn: ({ id, mapping }: { id: string; mapping: ServiceImportMapping }) =>
      postAction(id, { action: "map", mapping }),
    onSuccess: cacheJob
  });
  const commit = useMutation({
    mutationFn: ({ id, removeUnmapped }: { id: string; removeUnmapped: boolean }) =>
      postAction(id, { action: "commit", removeUnmapped }),
    onMutate: ({ id }) => {
      queryClient.setQueryData<PublicServiceImportJob>(
        ["service-import", id],
        (current) => (current ? { ...current, status: "committing" } : current)
      );
    },
    onSuccess: cacheJob,
    onError: () => {
      if (jobId) void queryClient.invalidateQueries({ queryKey: ["service-import", jobId] });
    }
  });

  return { commit, create, job, jobs, map };
};

export { useServiceImport };
