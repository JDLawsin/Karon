import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { parseAuthClaims } from "@/features/auth/parse-membership";
import { publicSupabaseEnv } from "@/lib/env";
import { clinicAppUrl } from "@/lib/server-env";

const isAnonymousPublicPath = (pathname: string) =>
  pathname === "/login" ||
  pathname === "/signup" ||
  pathname === "/forgot-password" ||
  pathname === "/~offline" ||
  pathname.startsWith("/auth/");

const shouldSkipLoginRedirect = (pathname: string) =>
  isAnonymousPublicPath(pathname) || pathname.startsWith("/api/");

const copyCookies = (from: NextResponse, to: NextResponse) => {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie);
  });

  return to;
};

const updateSession = async (request: NextRequest) => {
  const { url, anonKey } = publicSupabaseEnv();
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      }
    }
  });

  const { data } = await supabase.auth.getClaims();
  const { userId } = parseAuthClaims(data?.claims);
  const pathname = request.nextUrl.pathname;

  if (!userId && !shouldSkipLoginRedirect(pathname)) {
    return copyCookies(
      supabaseResponse,
      NextResponse.redirect(clinicAppUrl("/login"))
    );
  }

  if (userId && pathname === "/") {
    return copyCookies(
      supabaseResponse,
      NextResponse.redirect(clinicAppUrl("/today"))
    );
  }

  return supabaseResponse;
};

export { shouldSkipLoginRedirect, updateSession };
