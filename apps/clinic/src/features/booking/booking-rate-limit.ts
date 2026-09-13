// ponytail: in-memory per instance; upgrade to Redis if booking spam spans serverless replicas
const BOOKING_POST_WINDOW_MS = 10 * 60 * 1000;
const BOOKING_POST_IP_LIMIT = 8;
const BOOKING_POST_SLUG_LIMIT = 40;

const hits = new Map<string, number[]>();

const isLimited = (key: string, limit: number, now: number, windowMs: number) => {
  const recent = (hits.get(key) ?? []).filter((at) => now - at < windowMs);

  if (recent.length >= limit) {
    hits.set(key, recent);
    return true;
  }

  recent.push(now);
  hits.set(key, recent);
  return false;
};

const bookingPostClientKey = (request: Request) => {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown";

  return ip;
};

const isPublicBookingPostLimited = (
  request: Request,
  slug: string,
  now = Date.now()
) => {
  const ip = bookingPostClientKey(request);
  const slugKey = slug.slice(0, 64);

  return (
    isLimited(`ip:${ip}:${slugKey}`, BOOKING_POST_IP_LIMIT, now, BOOKING_POST_WINDOW_MS) ||
    isLimited(`slug:${slugKey}`, BOOKING_POST_SLUG_LIMIT, now, BOOKING_POST_WINDOW_MS)
  );
};

export {
  BOOKING_POST_IP_LIMIT,
  BOOKING_POST_SLUG_LIMIT,
  BOOKING_POST_WINDOW_MS,
  isPublicBookingPostLimited
};
