"use client";

import { Alert, Card, cn, showErrorToast, showSuccessToast, Skeleton } from "@karon/design-system";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import type { FieldPath } from "react-hook-form";
import type { z } from "zod";

import ClinicHoursFields from "@/features/auth/clinic-hours-fields";
import ClinicIdentityFields from "@/features/auth/clinic-identity-fields";
import ClinicLogoField from "@/features/auth/clinic-logo-field";
import ClinicTimezoneField from "@/features/auth/clinic-timezone-field";
import {
  clinicLogoPreviewUrl,
  removeClinicLogo,
  uploadClinicLogo
} from "@/features/auth/clinic-logo";
import {
  clinicDetailsSchema,
  defaultClinicDetailsValues,
  fromClinicRow,
  toClinicDetailsProfile,
  type ClinicDetails
} from "@/features/auth/onboarding-schemas";
import { useClinicSession } from "@/lib/auth/clinic-session";
import { markHydrated, useClinicForm } from "@/lib/forms/use-clinic-form";
import { createBrowserSupabase } from "@/lib/supabase/browser";

const clinicDetailsFormId = "clinic-details-form";

type ClinicDetailsSaveState = {
  canSave: boolean;
  saving: boolean;
};

type Props = {
  onSaveStateChange?: (state: ClinicDetailsSaveState) => void;
};

const ClinicDetailsForm = ({ onSaveStateChange }: Props) => {
  const { membership } = useClinicSession();
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
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
    formState: { errors, isDirty }
  } = useClinicForm(clinicDetailsSchema, {
    defaultValues: defaultClinicDetailsValues()
  });
  const canSave = isDirty || logoFile !== null || logoCleared;

  useEffect(() => {
    onSaveStateChange?.({ canSave: !loading && canSave, saving: pending });
  }, [canSave, loading, onSaveStateChange, pending]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void (async () => {
        try {
          const supabase = createBrowserSupabase();
          const { data, error } = await supabase
            .from("clinics")
            .select("name, timezone, phone, email, address, hours, logo_path")
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
        } finally {
          setLoading(false);
        }
      })();
    }, 0);

    return () => window.clearTimeout(id);
  }, [membership.tenantId, reset]);

  const applyIssues = (zodError: z.ZodError) => {
    for (const issue of zodError.issues) {
      const path = issue.path.join(".") as FieldPath<ClinicDetails>;
      if (path) {
        setFieldError(path, { type: "manual", message: issue.message });
      }
    }
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = clinicDetailsSchema.safeParse(getValues());

    if (!parsed.success) {
      applyIssues(parsed.error);
      return;
    }

    setPending(true);
    const supabase = createBrowserSupabase();
    const profile = toClinicDetailsProfile(parsed.data);

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
          updated_at: new Date().toISOString()
        })
        .eq("id", membership.tenantId);

      if (error) {
        showErrorToast("Could not save clinic details.");
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

      reset(parsed.data);

      if (logoFailed) {
        showSuccessToast("Clinic details saved. Could not update the logo.");
      } else {
        showSuccessToast("Clinic details saved.");
      }
    } catch {
      showErrorToast("Could not save clinic details.");
    } finally {
      setPending(false);
    }
  };

  if (loading) {
    return (
      <div
        aria-busy
        aria-label="Loading clinic details"
        className="grid w-full min-w-0 grid-cols-1 gap-3 lg:grid-cols-2 lg:items-start"
      >
        <Skeleton className="min-h-96 w-full min-w-0 rounded-lg lg:row-span-3" />
        <Skeleton className="min-h-28 w-full min-w-0 rounded-lg" />
        <Skeleton className="min-h-36 w-full min-w-0 rounded-lg" />
        <Skeleton className="min-h-52 w-full min-w-0 rounded-lg" />
      </div>
    );
  }

  return (
    <form
      className="flex min-w-0 w-full flex-col gap-3"
      id={clinicDetailsFormId}
      method="post"
      onSubmit={(event) => {
        void onSubmit(event);
      }}
      ref={markHydrated}
    >
      {loadError ? <Alert title={loadError} variant="danger" /> : null}
      <div className="grid w-full min-w-0 grid-cols-1 gap-3 lg:grid-cols-2 lg:items-start">
        <SettingsCard className="min-w-0 lg:row-span-3" title="Clinic details">
          <ClinicIdentityFields
            errors={errors}
            idPrefix="clinic"
            register={register}
          />
        </SettingsCard>
        <SettingsCard className="min-w-0" title="Timezone">
          <ClinicTimezoneField
            errors={errors}
            hideLabel
            idPrefix="clinic"
            register={register}
          />
        </SettingsCard>
        <SettingsCard className="min-w-0" title="Logo">
          <ClinicLogoField
            error={logoError}
            file={logoFile}
            id="clinic-logo"
            onFileChange={(nextFile, nextError) => {
              setLogoFile(nextFile);
              setLogoError(nextError);

              if (nextError) {
                return;
              }

              if (!nextFile) {
                setRemoteLogoUrl(null);
                setLogoCleared(true);
                return;
              }

              setLogoCleared(false);
            }}
            remoteUrl={remoteLogoUrl}
          />
        </SettingsCard>
        <SettingsCard className="min-w-0" title="Opens">
          <ClinicHoursFields
            errors={errors}
            idPrefix="clinic"
            register={register}
            setValue={setValue}
            watch={watch}
          />
        </SettingsCard>
      </div>
    </form>
  );
};

type SettingsCardProps = {
  title: string;
  children: ReactNode;
  className?: string;
};

const SettingsCard = ({ title, children, className }: SettingsCardProps) => (
  <Card className={cn("min-w-0 gap-3", className)}>
    <h2 className="text-lg font-semibold">{title}</h2>
    {children}
  </Card>
);

export default ClinicDetailsForm;
export { clinicDetailsFormId };
export type { ClinicDetailsSaveState };
