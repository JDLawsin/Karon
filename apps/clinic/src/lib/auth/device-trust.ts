import { createHash, randomBytes } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

const DEVICE_TRUST_COOKIE = "karon_device_trust";
const DEVICE_TRUST_MAX_AGE_S = 30 * 24 * 60 * 60;

const hashDeviceTrustToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

const createDeviceTrustToken = () => randomBytes(32).toString("base64url");

const deviceTrustCookieOptions = () => ({
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: DEVICE_TRUST_MAX_AGE_S,
  secure: process.env.NODE_ENV === "production"
});

const redeemDeviceTrust = async (
  supabase: SupabaseClient,
  token: string | undefined
) => {
  if (!token) {
    return false;
  }

  const { data } = await supabase.rpc("redeem_device_trust", {
    p_token_hash: hashDeviceTrustToken(token)
  });
  return data === true;
};

const redeemDeviceTrustFromRequest = async (
  supabase: SupabaseClient,
  request: NextRequest
) => redeemDeviceTrust(supabase, request.cookies.get(DEVICE_TRUST_COOKIE)?.value);

export {
  DEVICE_TRUST_COOKIE,
  DEVICE_TRUST_MAX_AGE_S,
  createDeviceTrustToken,
  deviceTrustCookieOptions,
  hashDeviceTrustToken,
  redeemDeviceTrust,
  redeemDeviceTrustFromRequest
};
