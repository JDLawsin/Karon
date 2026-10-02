import { NextResponse } from "next/server";

import {
  bookingClientKey,
  isPublicBookingGetLimited,
  isPublicBookingPostLimited
} from "@/features/booking/booking-rate-limit";
import {
  loadPublicBooking,
  submitPublicBooking,
  toPublicBookingPayload
} from "@/features/booking/public-booking";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export const GET = async (request: Request, context: RouteContext) => {
  const { slug } = await context.params;

  let limited: boolean;

  try {
    limited = await isPublicBookingGetLimited(request, slug);
  } catch {
    return NextResponse.json(
      { error: "Booking is temporarily unavailable. Try again in a few minutes." },
      { status: 503 }
    );
  }

  if (limited) {
    return NextResponse.json(
      { error: "Too many booking attempts. Try again in a few minutes." },
      { status: 429 }
    );
  }

  const date = new URL(request.url).searchParams.get("date");
  const result = await loadPublicBooking(slug, date);

  if (!result.ok) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  return NextResponse.json(toPublicBookingPayload(result.page));
};

export const POST = async (request: Request, context: RouteContext) => {
  const { slug } = await context.params;

  let limited: boolean;

  try {
    limited = await isPublicBookingPostLimited(request, slug);
  } catch {
    return NextResponse.json(
      { error: "Booking is temporarily unavailable. Try again in a few minutes." },
      { status: 503 }
    );
  }

  if (limited) {
    return NextResponse.json(
      { error: "Too many booking attempts. Try again in a few minutes." },
      { status: 429 }
    );
  }

  const body: unknown = await request.json().catch(() => null);
  const result = await submitPublicBooking(slug, body, {
    idempotencyKey: request.headers.get("idempotency-key"),
    remoteIp: bookingClientKey(request)
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true });
};
