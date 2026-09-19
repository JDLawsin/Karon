"use client";

import { showSuccessToast } from "@karon/design-system";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";

import { clinicDateTimeToUtc } from "@/features/patients/next-visit";
import { saveNextVisit } from "@/features/patients/save-next-visit";
import { useClinicServices } from "@/features/services/use-clinic-services";
import { useClinicSession } from "@/lib/auth/clinic-session";
import { openClinicDb } from "@/lib/db/clinic-db";
import { createBrowserSupabase } from "@/lib/supabase/browser";

const clinicProfileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  timezone: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .refine((value) => {
      try {
        new Intl.DateTimeFormat("en", { timeZone: value }).format();
        return true;
      } catch {
        return false;
      }
    })
});

type ScheduleDraft = {
  date: string;
  time: string;
  serviceName: string;
  allowOverbook?: boolean;
};

const useNextVisit = (patientId: string) => {
  const { membership, userId } = useClinicSession();
  const services = useClinicServices();
  const profile = useQuery({
    queryKey: ["clinic-reminder-profile", membership.tenantId],
    queryFn: async () => {
      const supabase = createBrowserSupabase();
      const { data, error } = await supabase
        .from("clinics")
        .select("name, timezone")
        .eq("id", membership.tenantId)
        .single();

      if (error || !data) {
        throw new Error("Could not load the clinic name and timezone.");
      }

      const parsed = clinicProfileSchema.safeParse(data);

      if (!parsed.success) {
        throw new Error("Could not load the clinic name and timezone.");
      }

      return parsed.data;
    }
  });
  const schedule = useMutation({
    mutationFn: async (draft: ScheduleDraft) => {
      if (!profile.data) {
        throw new Error("Clinic details are still loading.");
      }

      const startsAt = clinicDateTimeToUtc(
        draft.date,
        draft.time,
        profile.data.timezone
      );
      const supabase = createBrowserSupabase();
      const db = await openClinicDb(membership.tenantId);
      const result = await saveNextVisit(db, supabase, {
        tenantId: membership.tenantId,
        actorUserId: userId,
        patientId,
        startsAt,
        ...draft
      });

      return { ...result, startsAt };
    },
    onSuccess: (result) => {
      if (result.status === "saved") {
        showSuccessToast("Next visit saved.");
      }
    }
  });

  return {
    clinic: profile.data ?? null,
    services: services.services,
    loading: profile.isLoading || services.loading,
    loadError:
      profile.error instanceof Error
        ? profile.error.message
        : services.error,
    schedule
  };
};

export { useNextVisit };
export type { ScheduleDraft };
