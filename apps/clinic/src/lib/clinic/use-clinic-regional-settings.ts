"use client";

import { onlineManager, useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import { useClinicSession } from "@/lib/auth/clinic-session";
import { openClinicDb, type ClinicDb } from "@/lib/db/clinic-db";
import { createBrowserSupabase } from "@/lib/supabase/browser";

import {
  clinicRegionalSettingsRowSchema,
  clinicRegionalSettingsSchema,
  type ClinicRegionalSettings
} from "./regional-settings";

const CLINIC_REGIONAL_SETTINGS_KEY = "clinicRegionalSettings";

const clinicRegionalSettingsKey = (tenantId: string) =>
  ["clinic-regional-settings", tenantId] as const;

const readCachedClinicRegionalSettings = async (db: ClinicDb) => {
  const row = await db.meta.get(CLINIC_REGIONAL_SETTINGS_KEY);

  if (!row?.value) {
    return null;
  }

  try {
    const parsed = clinicRegionalSettingsSchema.safeParse(JSON.parse(row.value));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
};

const writeCachedClinicRegionalSettings = async (
  db: ClinicDb,
  settings: ClinicRegionalSettings
) => {
  await db.meta.put({
    key: CLINIC_REGIONAL_SETTINGS_KEY,
    value: JSON.stringify(settings)
  });
};

const loadClinicRegionalSettings = async (tenantId: string) => {
  let db: ClinicDb | null = null;
  let cached: ClinicRegionalSettings | null = null;

  try {
    db = await openClinicDb(tenantId);
    cached = await readCachedClinicRegionalSettings(db);
  } catch {
    // An IndexedDB failure must not prevent an online settings refresh.
  }

  if (cached && !onlineManager.isOnline()) {
    return cached;
  }

  try {
    const supabase = createBrowserSupabase();
    const { data, error } = await supabase
      .from("clinics")
      .select("currency_code, locale, timezone")
      .eq("id", tenantId)
      .single();

    if (error || !data) {
      throw new Error("Could not load clinic regional settings.");
    }

    const settings = clinicRegionalSettingsRowSchema.parse(data);
    if (db) {
      try {
        await writeCachedClinicRegionalSettings(db, settings);
      } catch {
        // The validated server value remains authoritative when caching fails.
      }
    }

    return settings;
  } catch {
    if (cached) {
      return cached;
    }

    throw new Error("Could not load clinic regional settings.");
  }
};

const useClinicRegionalSettings = () => {
  const { membership } = useClinicSession();
  const query = useQuery({
    queryKey: clinicRegionalSettingsKey(membership.tenantId),
    queryFn: () => loadClinicRegionalSettings(membership.tenantId),
    networkMode: "always"
  });
  const settings = query.data ?? null;

  useEffect(() => {
    if (settings) {
      document.documentElement.lang = settings.locale;
    }
  }, [settings]);

  return {
    settings,
    ready: query.data !== undefined,
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null
  };
};

export {
  CLINIC_REGIONAL_SETTINGS_KEY,
  clinicRegionalSettingsKey,
  loadClinicRegionalSettings,
  readCachedClinicRegionalSettings,
  useClinicRegionalSettings,
  writeCachedClinicRegionalSettings
};
