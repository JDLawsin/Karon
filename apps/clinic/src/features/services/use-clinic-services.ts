"use client";

import { showErrorToast, showSuccessToast } from "@karon/design-system";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  currencyCodeSchema,
  parseClinicServices,
  servicePricingSchema,
  type ClinicServiceRow,
  type ServiceFormValues
} from "@/features/services/service-schemas";
import { priceMajorToMinor } from "@/features/services/service-money";
import { useClinicSession } from "@/lib/auth/clinic-session";
import { writeAuditEvent } from "@/lib/auth/audit";
import { createBrowserSupabase } from "@/lib/supabase/browser";

const clinicServicesKey = (tenantId: string) => ["clinic-services", tenantId] as const;
const serviceColumns =
  "id, tenant_id, name, description, icon, price_minor, currency_code, duration_minutes, created_at, updated_at, created_by, updated_by";

const fetchClinicServices = async (tenantId: string) => {
  const supabase = createBrowserSupabase();
  const [{ data, error }, { data: clinic, error: clinicError }] = await Promise.all([
    supabase
      .from("clinic_services")
      .select(serviceColumns)
      .eq("tenant_id", tenantId)
      .order("name"),
    supabase.from("clinics").select("currency_code").eq("id", tenantId).single()
  ]);

  if (error || clinicError) {
    throw new Error("Could not load services.");
  }

  return {
    services: parseClinicServices(data),
    currencyCode: currencyCodeSchema.parse(clinic?.currency_code)
  };
};

const useClinicServices = () => {
  const { membership, userId } = useClinicSession();
  const canEdit = membership.role === "owner";
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
      if (!canEdit) {
        throw new Error("Only the clinic owner can change services.");
      }

      const supabase = createBrowserSupabase();
      const now = new Date().toISOString();
      const pricing = servicePricingSchema.parse({
        priceMinor: priceMajorToMinor(values.priceMajor, query.data?.currencyCode ?? ""),
        currencyCode: query.data?.currencyCode,
        durationMinutes: values.durationMinutes
      });
      const { data, error } = await supabase
        .from("clinic_services")
        .insert({
          tenant_id: membership.tenantId,
          name: values.name,
          description: values.description ?? null,
          icon: values.icon ?? null,
          price_minor: pricing.priceMinor,
          currency_code: pricing.currencyCode,
          duration_minutes: pricing.durationMinutes,
          created_by: userId,
          updated_by: userId,
          created_at: now,
          updated_at: now
        })
        .select(serviceColumns)
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
      if (!canEdit) {
        throw new Error("Only the clinic owner can change services.");
      }

      const supabase = createBrowserSupabase();
      const pricingCurrencyCode =
        service.currency_code ?? query.data?.currencyCode ?? "";
      const priceMinor = priceMajorToMinor(
        values.priceMajor,
        pricingCurrencyCode
      );
      const pricing = servicePricingSchema.parse({
        priceMinor,
        currencyCode: pricingCurrencyCode,
        durationMinutes: values.durationMinutes
      });
      const { data, error } = await supabase
        .from("clinic_services")
        .update({
          name: values.name,
          description: values.description ?? null,
          icon: values.icon ?? null,
          price_minor: pricing.priceMinor,
          currency_code: pricing.currencyCode,
          duration_minutes: pricing.durationMinutes,
          updated_by: userId,
          updated_at: new Date().toISOString()
        })
        .eq("id", service.id)
        .eq("tenant_id", membership.tenantId)
        .select(serviceColumns)
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
      if (!canEdit) {
        throw new Error("Only the clinic owner can change services.");
      }

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
    services: query.data?.services ?? [],
    currencyCode: query.data?.currencyCode ?? null,
    canEdit,
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    refetch: query.refetch,
    createService,
    updateService,
    deleteService
  };
};

export { useClinicServices };
