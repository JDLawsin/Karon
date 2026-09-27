"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  migrationChecklistResponseSchema,
  type MigrationChecklistItemId,
  type MigrationChecklistState
} from "@/features/patient-import/migration-checklist";

const queryKey = ["migration-checklist"] as const;

const readError = async (response: Response) => {
  const body = await response.json().catch(() => null);
  return body && typeof body === "object" && "error" in body && typeof body.error === "string"
    ? body.error
    : "The migration checklist could not be saved.";
};

const loadChecklist = async () => {
  const response = await fetch("/api/import-checklist", { cache: "no-store" });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return migrationChecklistResponseSchema.parse(await response.json());
};

const saveChecklist = async (completedItems: MigrationChecklistItemId[]) => {
  const response = await fetch("/api/import-checklist", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ completedItems })
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return migrationChecklistResponseSchema.parse(await response.json());
};

const useMigrationChecklist = () => {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey, queryFn: loadChecklist });
  const save = useMutation({
    mutationFn: saveChecklist,
    onMutate: async (completedItems) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<MigrationChecklistState>(queryKey);
      queryClient.setQueryData<MigrationChecklistState>(queryKey, {
        completedItems,
        updatedAt: previous?.updatedAt ?? null
      });
      return { previous };
    },
    onError: (_error, _completedItems, context) => {
      queryClient.setQueryData(queryKey, context?.previous);
    },
    onSuccess: (next) => queryClient.setQueryData<MigrationChecklistState>(queryKey, next)
  });

  const toggle = (itemId: MigrationChecklistItemId) => {
    const current = query.data?.completedItems ?? [];
    const completedItems = current.includes(itemId)
      ? current.filter((id) => id !== itemId)
      : [...current, itemId];

    save.mutate(completedItems);
  };

  return { query, save, toggle };
};

export { useMigrationChecklist };
