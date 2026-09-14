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

  if (isPublicBookingGetLimited(request, slug)) {
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

  if (isPublicBookingPostLimited(request, slug)) {
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
