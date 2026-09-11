"use client";

import { createBrowserClient } from "@supabase/ssr";

import { publicSupabaseEnv } from "@/lib/env";

const createBrowserSupabase = () => {
  const { url, anonKey } = publicSupabaseEnv();

  return createBrowserClient(url, anonKey);
};

export { createBrowserSupabase };
