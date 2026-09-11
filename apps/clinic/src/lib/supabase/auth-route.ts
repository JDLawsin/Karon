import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { publicSupabaseEnv } from "@/lib/env";

type EmailOtpInput =
  | { type: EmailOtpType; token_hash: string }
  | { type: EmailOtpType; token: string; email: string };

const createAuthRouteClient = (request: NextRequest) => {
  const { url, anonKey } = publicSupabaseEnv();
  const pending: {
    name: string;
    value: string;
    options?: Parameters<NextResponse["cookies"]["set"]>[2];
  }[] = [];

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          pending.push({ name, value, options });
        });
      }
    }
  });

  const redirect = (target: URL) => {
    const response = NextResponse.redirect(target);
    pending.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options);
    });
    return response;
  };

  return { supabase, redirect };
};

const verifyEmailOtp = async (input: EmailOtpInput) => {
  const { url, anonKey } = publicSupabaseEnv();
  const response = await fetch(`${url}/auth/v1/verify`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });
  const payload = (await response.json()) as Record<string, unknown>;
  const accessToken =
    typeof payload.access_token === "string" ? payload.access_token : null;
  const refreshToken =
    typeof payload.refresh_token === "string" ? payload.refresh_token : null;

  if (!response.ok || !accessToken || !refreshToken) {
    return {
      data: { session: null, user: null },
      error: new Error("verify failed")
    };
  }

  return {
    data: {
      session: {
        access_token: accessToken,
        refresh_token: refreshToken
      },
      user: null
    },
    error: null
  };
};

export { createAuthRouteClient, verifyEmailOtp };
