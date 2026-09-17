"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";

import {
  resolveStaffAvatarSeed,
  resolveStaffAvatarStyle,
  staffAvatarSeedSchema,
  staffAvatarStyleSchema,
  type StaffAvatarStyleId
} from "@/features/auth/staff-avatar";
import { createBrowserSupabase } from "@/lib/supabase/browser";

type StaffAvatarPreferenceInput = {
  seed: string;
  style: StaffAvatarStyleId;
};

type StaffAvatarPreference = {
  savedSeed: string | null;
  savedStyle: StaffAvatarStyleId | null;
  resolvedSeed: string;
  resolvedStyle: StaffAvatarStyleId;
  ready: boolean;
  saving: boolean;
  saveAvatar: (input: StaffAvatarPreferenceInput) => Promise<boolean>;
};

const StaffAvatarPreferenceContext = createContext<StaffAvatarPreference | null>(
  null
);

type ProviderProps = {
  userId: string;
  children: ReactNode;
};

const readSavedAvatarSeed = (value: unknown) => {
  if (typeof value !== "string") {
    return null;
  }

  const parsed = staffAvatarSeedSchema.safeParse(value);

  return parsed.success ? parsed.data : null;
};

const readSavedAvatarStyle = (value: unknown) => {
  if (typeof value !== "string") {
    return null;
  }

  const parsed = staffAvatarStyleSchema.safeParse(value);

  return parsed.success ? parsed.data : null;
};

const StaffAvatarPreferenceProvider = ({ userId, children }: ProviderProps) => {
  const [savedSeed, setSavedSeed] = useState<string | null>(null);
  const [savedStyle, setSavedStyle] = useState<StaffAvatarStyleId | null>(null);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const supabase = createBrowserSupabase();

    void supabase.auth
      .getUser()
      .then(({ data }) => {
        if (cancelled) {
          return;
        }

        setSavedSeed(readSavedAvatarSeed(data.user?.user_metadata?.avatar_seed));
        setSavedStyle(readSavedAvatarStyle(data.user?.user_metadata?.avatar_style));
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) {
          setLoadedUserId(userId);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const resolvedSeed = resolveStaffAvatarSeed(userId, savedSeed);
  const resolvedStyle = resolveStaffAvatarStyle(savedStyle);
  const ready = loadedUserId === userId;

  const saveAvatar = useCallback(async ({ seed, style }: StaffAvatarPreferenceInput) => {
    const parsedSeed = staffAvatarSeedSchema.safeParse(seed);
    const parsedStyle = staffAvatarStyleSchema.safeParse(style);

    if (!parsedSeed.success || !parsedStyle.success) {
      return false;
    }

    const supabase = createBrowserSupabase();
    setSaving(true);

    const { error } = await supabase.auth.updateUser({
      data: {
        avatar_seed: parsedSeed.data,
        avatar_style: parsedStyle.data
      }
    });

    setSaving(false);

    if (error) {
      return false;
    }

    setSavedSeed(parsedSeed.data);
    setSavedStyle(parsedStyle.data);
    return true;
  }, []);

  const value = useMemo(
    () => ({
      savedSeed,
      savedStyle,
      resolvedSeed,
      resolvedStyle,
      ready,
      saving,
      saveAvatar
    }),
    [savedSeed, savedStyle, resolvedSeed, resolvedStyle, ready, saving, saveAvatar]
  );

  return (
    <StaffAvatarPreferenceContext.Provider value={value}>
      {children}
    </StaffAvatarPreferenceContext.Provider>
  );
};

const useStaffAvatarPreference = () => {
  const preference = useContext(StaffAvatarPreferenceContext);

  if (!preference) {
    throw new Error(
      "useStaffAvatarPreference requires StaffAvatarPreferenceProvider"
    );
  }

  return preference;
};

export { StaffAvatarPreferenceProvider, useStaffAvatarPreference };
export type { StaffAvatarPreferenceInput };
