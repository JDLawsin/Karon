import "server-only";

import { createHmac } from "node:crypto";

import { createSharedRateLimitStore } from "@karon/db";

const BOOKING_POST_WINDOW_MS = 10 * 60 * 1000;
const BOOKING_POST_IP_LIMIT = 8;
const BOOKING_POST_SLUG_LIMIT = 40;
const BOOKING_GET_WINDOW_MS = 10 * 60 * 1000;
const BOOKING_GET_IP_LIMIT = 60;
const BOOKING_GET_SLUG_LIMIT = 240;

const bookingClientKey = (request: Request) => {
  return request.headers.get("x-vercel-forwarded-for")?.trim() || "unavailable";
};

type RateLimitHit = (key: string, windowMinutes: number, limit: number) => Promise<boolean>;

const bookingRateLimitKeys = (
  request: Request,
  slug: string,
  method: "get" | "post",
  secret: string
) => {
  const ip = bookingClientKey(request);
  const slugKey = slug.slice(0, 64);
  const hash = (value: string) =>
    createHmac("sha256", secret).update(value).digest("hex");

  return {
    ip: `booking-${method}-ip:${hash(`${ip}:${slugKey}`)}`,
    slug: `booking-${method}-slug:${hash(slugKey)}`
  };
};

const isPublicBookingLimited = async (
  request: Request,
  slug: string,
  method: "get" | "post",
  secret: string,
  hit: RateLimitHit
) => {
  const keys = bookingRateLimitKeys(request, slug, method, secret);
  const ipLimit = method === "post" ? BOOKING_POST_IP_LIMIT : BOOKING_GET_IP_LIMIT;
  const slugLimit =
    method === "post" ? BOOKING_POST_SLUG_LIMIT : BOOKING_GET_SLUG_LIMIT;

  const [ipLimited, slugLimited] = await Promise.all([
    hit(keys.ip, 10, ipLimit),
    hit(keys.slug, 10, slugLimit)
  ]);

  return ipLimited || slugLimited;
};

let store: ReturnType<typeof createSharedRateLimitStore> | undefined;

const bookingLimiter = () => {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  const secret = process.env.BOOKING_RATE_LIMIT_SECRET?.trim() ||
    (process.env.NODE_ENV === "production" ? undefined : "karon-local-booking-limiter");

  if (!databaseUrl || !secret) {
    throw new Error("Booking rate limiter is not configured");
  }

  store ??= createSharedRateLimitStore(databaseUrl);

  return { hit: store.hit, secret };
};

const isPublicBookingPostLimited = async (request: Request, slug: string) => {
  const { hit, secret } = bookingLimiter();
  return isPublicBookingLimited(request, slug, "post", secret, hit);
};

const isPublicBookingGetLimited = async (request: Request, slug: string) => {
  const { hit, secret } = bookingLimiter();
  return isPublicBookingLimited(request, slug, "get", secret, hit);
};

export {
  BOOKING_GET_IP_LIMIT,
  BOOKING_GET_SLUG_LIMIT,
  BOOKING_GET_WINDOW_MS,
  BOOKING_POST_IP_LIMIT,
  BOOKING_POST_SLUG_LIMIT,
  BOOKING_POST_WINDOW_MS,
  bookingClientKey,
  bookingRateLimitKeys,
  isPublicBookingLimited,
  isPublicBookingGetLimited,
  isPublicBookingPostLimited
};
export type { RateLimitHit };
