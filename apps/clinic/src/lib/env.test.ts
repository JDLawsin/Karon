import { afterEach, describe, expect, it } from "vitest";

import { assertNoPublicSecrets, publicSupabaseEnv } from "./env";

const keys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY"
] as const;

const snapshot = Object.fromEntries(
  keys.map((key) => [key, process.env[key]])
);

afterEach(() => {
  for (const key of keys) {
    const value = snapshot[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});

describe("publicSupabaseEnv", () => {
  it("prefers the anon JWT over a publishable key", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-jwt";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_x";

    expect(publicSupabaseEnv()).toEqual({
      url: "https://example.supabase.co",
      anonKey: "anon-jwt"
    });
  });

  it("rejects a service-role key on NEXT_PUBLIC_*", () => {
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY = "not-for-the-browser";

    expect(() => assertNoPublicSecrets()).toThrow(/must not be public/i);
  });
});
