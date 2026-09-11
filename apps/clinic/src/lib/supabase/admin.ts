import "server-only";

import { createClient } from "@supabase/supabase-js";

import { serverSupabaseEnv } from "@/lib/server-env";

const createAdminSupabase = () => {
  const { url, secretKey } = serverSupabaseEnv();

  return createClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
};

export { createAdminSupabase };
