import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { publicSupabaseEnv } from "@/lib/env";

const createServerSupabase = async () => {
  const cookieStore = await cookies();
  const { url, anonKey } = publicSupabaseEnv();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component; proxy is responsible for the refresh.
        }
      }
    }
  });
};

export { createServerSupabase };
