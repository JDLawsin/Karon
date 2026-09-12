"use client";

import { Alert, Button } from "@karon/design-system";
import { useEffect, useState, type FormEvent } from "react";
import type { FieldPath } from "react-hook-form";
import type { z } from "zod";

import ClinicHoursFields from "@/features/auth/clinic-hours-fields";
import ClinicIdentityFields from "@/features/auth/clinic-identity-fields";
import ClinicLogoField from "@/features/auth/clinic-logo-field";
import {
  clinicLogoPreviewUrl,
  removeClinicLogo,
  uploadClinicLogo
} from "@/features/auth/clinic-logo";
import ClinicServicesFields from "@/features/auth/clinic-services-fields";
import {
  clinicOnboardingSchema,
  defaultOnboardingValues,
  fromClinicRow,
  toClinicProfile,
  type ClinicOnboarding
} from "@/features/auth/onboarding-schemas";
import { useClinicSession } from "@/lib/auth/clinic-session";
import { markHydrated, useClinicForm } from "@/lib/forms/use-clinic-form";
import { createBrowserSupabase } from "@/lib/supabase/browser";

const ClinicDetailsForm = () => {
  const { membership } = useClinicSession();
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [remoteLogoUrl, setRemoteLogoUrl] = useState<string | null>(null);
  const [logoPath, setLogoPath] = useState<string | null>(null);
  const [logoCleared, setLogoCleared] = useState(false);
  const [pending, setPending] = useState(false);
  const {
    register,
    getValues,
    setValue,
    setError: setFieldError,
    reset,
    watch,
    formState: { errors }
  } = useClinicForm(clinicOnboardingSchema, {
    defaultValues: defaultOnboardingValues()
  });
  const values = watch();

  useEffect(() => {
    const id = window.setTimeout(() => {
      void (async () => {
        const supabase = createBrowserSupabase();
        const { data, error } = await supabase
          .from("clinics")
          .select(
            "name, timezone, phone, email, address, hours, services, logo_path"
          )
          .eq("id", membership.tenantId)
          .maybeSingle();

        if (error || !data) {
          setLoadError("Could not load clinic details.");
          return;
        }

        reset(fromClinicRow(data));
        const path =
          typeof data.logo_path === "string" ? data.logo_path : null;
        setLogoPath(path);
        setRemoteLogoUrl(await clinicLogoPreviewUrl(supabase, path));
      })();
    }, 0);

    return () => window.clearTimeout(id);
  }, [membership.tenantId, reset]);

  const applyIssues = (zodError: z.ZodError) => {
    for (const issue of zodError.issues) {
      const path = issue.path.join(".") as FieldPath<ClinicOnboarding>;
      if (path) {
        setFieldError(path, { type: "manual", message: issue.message });
      }
    }
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaveError(null);
    setInfo(null);
    const parsed = clinicOnboardingSchema.safeParse(getValues());

    if (!parsed.success) {
      applyIssues(parsed.error);
      return;
    }

    setPending(true);
    const supabase = createBrowserSupabase();
    const profile = toClinicProfile(parsed.data);

    try {
      const { error } = await supabase
        .from("clinics")
        .update({
          name: parsed.data.name,
          timezone: profile.timezone,
          phone: profile.phone,
          email: profile.email,
          address: profile.address,
          hours: profile.hours,
          services: profile.services,
          updated_at: new Date().toISOString()
        })
        .eq("id", membership.tenantId);

      if (error) {
        setSaveError("Could not save clinic details.");
        return;
      }

      let logoFailed = false;

      try {
        if (logoFile) {
          const uploaded = await uploadClinicLogo(
            supabase,
            membership.tenantId,
            logoFile
          );

          if (uploaded.ok) {
            setLogoPath(uploaded.path);
            setLogoFile(null);
            setLogoCleared(false);
            setRemoteLogoUrl(await clinicLogoPreviewUrl(supabase, uploaded.path));
          } else {
            logoFailed = true;
          }
        } else if (logoCleared && logoPath) {
          const removed = await removeClinicLogo(
            supabase,
            membership.tenantId,
            logoPath
          );

          if (removed.ok) {
            setLogoPath(null);
            setRemoteLogoUrl(null);
            setLogoCleared(false);
          } else {
            logoFailed = true;
          }
        }
      } catch {
        logoFailed = true;
      }

      if (logoFailed) {
        setInfo("Clinic details saved. Could not update the logo.");
      } else {
        setInfo("Clinic details saved.");
      }
    } catch {
      setSaveError("Could not save clinic details.");
    } finally {
      setPending(false);
    }
  };

  return (
    <form
      className="flex max-w-xl flex-col gap-4 rounded-lg border border-border bg-card p-4"
      method="post"
      onSubmit={(event) => {
        void onSubmit(event);
      }}
      ref={markHydrated}
    >
      <h2 className="text-lg font-semibold">Clinic details</h2>
      {loadError ? <Alert title={loadError} variant="danger" /> : null}
      <ClinicIdentityFields
        errors={errors}
        idPrefix="clinic"
        register={register}
      />
      <ClinicLogoField
        error={logoError}
        file={logoFile}
        id="clinic-logo"
        onFileChange={(file, nextError) => {
          setLogoFile(file);
          setLogoError(nextError);
          if (!file) {
            setRemoteLogoUrl(null);
            setLogoCleared(true);
          } else {
            setLogoCleared(false);
          }
        }}
        remoteUrl={remoteLogoUrl}
      />
      <ClinicHoursFields
        errors={errors}
        idPrefix="clinic"
        register={register}
        setValue={setValue}
        watch={watch}
      />
      <ClinicServicesFields
        errors={errors}
        idPrefix="clinic"
        onChange={(services) => setValue("services", services)}
        services={values.services ?? []}
      />
      {saveError ? <Alert title={saveError} variant="danger" /> : null}
      {info ? <Alert title={info} variant="info" /> : null}
      <Button disabled={pending} type="submit">
        Save clinic details
      </Button>
    </form>
  );
};

export default ClinicDetailsForm;
