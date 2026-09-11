import "server-only";

import { publicSupabaseEnv } from "./env";

const serverSupabaseEnv = () => {
  const { url, anonKey } = publicSupabaseEnv();
  const secretKey =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!secretKey) {
    throw new Error("Missing SUPABASE_SECRET_KEY");
  }

  return { url, anonKey, secretKey };
};

const clinicAppOrigin = () => {
  const pinned = process.env.SITE_URL?.replace(/\/$/, "");

  if (pinned) {
    return pinned;
  }

  if (process.env.NODE_ENV !== "production") {
    return "http://localhost:3000";
  }

  throw new Error("Missing SITE_URL");
};

const clinicAppUrl = (pathname: string) =>
  new URL(pathname, `${clinicAppOrigin()}/`);

export { clinicAppOrigin, clinicAppUrl, serverSupabaseEnv };
