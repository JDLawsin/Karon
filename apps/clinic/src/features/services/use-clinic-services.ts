"use client";

import { showErrorToast, showSuccessToast } from "@karon/design-system";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  parseClinicServices,
  type ClinicServiceRow,
  type ServiceFormValues
} from "@/features/services/service-schemas";
import { useClinicSession } from "@/lib/auth/clinic-session";
import { writeAuditEvent } from "@/lib/auth/audit";
import { createBrowserSupabase } from "@/lib/supabase/browser";

const clinicServicesKey = (tenantId: string) => ["clinic-services", tenantId] as const;

const fetchClinicServices = async (tenantId: string) => {
  const supabase = createBrowserSupabase();
  const { data, error } = await supabase
    .from("clinic_services")
    .select(
      "id, tenant_id, name, description, icon, created_at, updated_at, created_by, updated_by"
    )
    .eq("tenant_id", tenantId)
    .order("name");

  if (error) {
    throw new Error("Could not load services.");
  }

  return parseClinicServices(data);
};

const useClinicServices = () => {
  const { membership, userId } = useClinicSession();
  const queryClient = useQueryClient();
  const queryKey = clinicServicesKey(membership.tenantId);

  const query = useQuery({
    queryKey,
    queryFn: () => fetchClinicServices(membership.tenantId)
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey });
  };

  const createService = useMutation({
    mutationFn: async (values: ServiceFormValues) => {
      const supabase = createBrowserSupabase();
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("clinic_services")
        .insert({
          tenant_id: membership.tenantId,
          name: values.name,
          description: values.description ?? null,
          icon: values.icon ?? null,
          created_by: userId,
          updated_by: userId,
          created_at: now,
          updated_at: now
        })
        .select(
          "id, tenant_id, name, description, icon, created_at, updated_at, created_by, updated_by"
        )
        .single();

      if (error || !data) {
        throw new Error(
          error?.code === "23505"
            ? "A service with that name already exists."
            : "Could not create service."
        );
      }

      const parsed = parseClinicServices([data])[0];

      if (!parsed) {
        throw new Error("Could not create service.");
      }

      await writeAuditEvent(supabase, {
        tenantId: membership.tenantId,
        actorUserId: userId,
        eventType: "service.created",
        recordId: parsed.id
      });

      return parsed;
    },
    onSuccess: async () => {
      await invalidate();
      showSuccessToast("Service created.");
    },
    onError: (error: Error) => {
      showErrorToast(error.message);
    }
  });

  const updateService = useMutation({
    mutationFn: async ({
      service,
      values
    }: {
      service: ClinicServiceRow;
      values: ServiceFormValues;
    }) => {
      const supabase = createBrowserSupabase();
      const { data, error } = await supabase
        .from("clinic_services")
        .update({
          name: values.name,
          description: values.description ?? null,
          icon: values.icon ?? null,
          updated_by: userId,
          updated_at: new Date().toISOString()
        })
        .eq("id", service.id)
        .eq("tenant_id", membership.tenantId)
        .select(
          "id, tenant_id, name, description, icon, created_at, updated_at, created_by, updated_by"
        )
        .single();

      if (error || !data) {
        throw new Error(
          error?.code === "23505"
            ? "A service with that name already exists."
            : "Could not update service."
        );
      }

      const parsed = parseClinicServices([data])[0];

      if (!parsed) {
        throw new Error("Could not update service.");
      }

      await writeAuditEvent(supabase, {
        tenantId: membership.tenantId,
        actorUserId: userId,
        eventType: "service.updated",
        recordId: parsed.id
      });

      return parsed;
    },
    onSuccess: async () => {
      await invalidate();
      showSuccessToast("Service updated.");
    },
    onError: (error: Error) => {
      showErrorToast(error.message);
    }
  });

  const deleteService = useMutation({
    mutationFn: async (service: ClinicServiceRow) => {
      const supabase = createBrowserSupabase();
      const { error } = await supabase
        .from("clinic_services")
        .delete()
        .eq("id", service.id)
        .eq("tenant_id", membership.tenantId);

      if (error) {
        throw new Error("Could not delete service.");
      }

      await writeAuditEvent(supabase, {
        tenantId: membership.tenantId,
        actorUserId: userId,
        eventType: "service.deleted",
        recordId: service.id
      });
    },
    onSuccess: async () => {
      await invalidate();
      showSuccessToast("Service deleted.");
    },
    onError: (error: Error) => {
      showErrorToast(error.message);
    }
  });

  return {
    services: query.data ?? [],
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    refetch: query.refetch,
    createService,
    updateService,
    deleteService
  };
};

export { useClinicServices };
