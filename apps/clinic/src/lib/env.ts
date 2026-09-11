const PUBLIC_SECRET_NAME = /SERVICE_ROLE|SECRET_KEY/i;

const assertNoPublicSecrets = () => {
  const leaked = Object.keys(process.env).filter(
    (key) => key.startsWith("NEXT_PUBLIC_") && PUBLIC_SECRET_NAME.test(key)
  );

  if (leaked.length > 0) {
    throw new Error("Service role must not be public");
  }
};

const publicSupabaseEnv = () => {
  assertNoPublicSecrets();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !anonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or anon key");
  }

  return { url, anonKey };
};

export { assertNoPublicSecrets, publicSupabaseEnv };
