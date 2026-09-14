import type { SupabaseClient } from "@supabase/supabase-js";

const CLINIC_BRANDING_BUCKET = "clinic-branding";

const clinicLogoPath = (tenantId: string) => `${tenantId}/logo`;

const uploadClinicLogo = async (
  supabase: SupabaseClient,
  tenantId: string,
  file: File
) => {
  const path = clinicLogoPath(tenantId);
  const { error: uploadError } = await supabase.storage
    .from(CLINIC_BRANDING_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: true
    });

  if (uploadError) {
    return { ok: false as const };
  }

  const { error: updateError } = await supabase
    .from("clinics")
    .update({ logo_path: path })
    .eq("id", tenantId);

  if (updateError) {
    return { ok: false as const };
  }

  return { ok: true as const, path };
};

const removeClinicLogo = async (
  supabase: SupabaseClient,
  tenantId: string,
  path: string
) => {
  const { error: removeError } = await supabase.storage
    .from(CLINIC_BRANDING_BUCKET)
    .remove([path]);
  const { error: updateError } = await supabase
    .from("clinics")
    .update({ logo_path: null, updated_at: new Date().toISOString() })
    .eq("id", tenantId);

  if (removeError || updateError) {
    return { ok: false as const };
  }

  return { ok: true as const };
};

const clinicLogoPreviewUrl = async (
  supabase: SupabaseClient,
  logoPath: string | null | undefined,
  expiresIn = 3600
) => {
  if (!logoPath) {
    return null;
  }

  const { data, error } = await supabase.storage
    .from(CLINIC_BRANDING_BUCKET)
    .createSignedUrl(logoPath, expiresIn);

  if (error || !data.signedUrl) {
    return null;
  }

  return data.signedUrl;
};

export { clinicLogoPreviewUrl, removeClinicLogo, uploadClinicLogo };
