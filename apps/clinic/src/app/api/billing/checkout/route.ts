import { NextResponse } from "next/server";
import { z } from "zod";

import { authorizeOwnerAction } from "@/features/staff/authorize-owner";
import { writeAuditEvent } from "@/lib/auth/audit";
import { getClinicAccess } from "@/lib/auth/clinic-access";
import {
  createConfiguredPaymentGateway,
  getBillingConfig
} from "@/lib/billing/billing-config";
import {
  BillingCheckoutRateLimitedError,
  createBillingStore
} from "@/lib/billing/billing-store";
import { startBillingCheckout } from "@/lib/billing/checkout-service";
import {
  InvalidRequestBodyError,
  RequestBodyTooLargeError,
  readLimitedText
} from "@/lib/http/read-limited-text";
import { log } from "@/lib/logger/server";
import { clinicAppOrigin, clinicAppUrl } from "@/lib/server-env";
import { createAdminSupabase } from "@/lib/supabase/admin";

const checkoutFormSchema = z.object({
  interval: z.enum(["monthly", "yearly"])
}).strict();
const MAX_CHECKOUT_BODY_BYTES = 256;

const sameOrigin = (request: Request) => {
  const origin = request.headers.get("origin");

  try {
    return origin !== null && new URL(origin).origin === clinicAppOrigin();
  } catch {
    return false;
  }
};

const deny = async (
  status: 401 | 403,
  access: Awaited<ReturnType<typeof getClinicAccess>>
) => {
  if (status === 403 && access.membership && access.userId) {
    await writeAuditEvent(access.supabase, {
      tenantId: access.membership.tenantId,
      actorUserId: access.userId,
      eventType: "access.denied"
    });
  }

  return NextResponse.json(
    { error: status === 401 ? "Unauthorized" : "Forbidden" },
    { status }
  );
};

export const POST = async (request: Request) => {
  const access = await getClinicAccess();
  const authz = authorizeOwnerAction({
    userId: access.userId,
    aal: access.aal,
    role: access.membership?.role ?? null,
    mfaOk: access.mfaOk
  });

  if (!authz.ok) {
    return deny(authz.status, access);
  }

  if (!access.sessionActive) {
    return deny(403, access);
  }

  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const mediaType = request.headers
    .get("content-type")
    ?.split(";", 1)[0]
    ?.trim()
    .toLowerCase();

  if (mediaType !== "application/x-www-form-urlencoded") {
    return NextResponse.json(
      { error: "Unsupported content type." },
      { status: 415 }
    );
  }

  let rawBody: string;

  try {
    rawBody = await readLimitedText(request, MAX_CHECKOUT_BODY_BYTES);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ error: "Payload too large." }, { status: 413 });
    }

    if (error instanceof InvalidRequestBodyError) {
      return NextResponse.json(
        { error: "Invalid checkout request." },
        { status: 400 }
      );
    }

    throw error;
  }

  const form = checkoutFormSchema.safeParse(
    Object.fromEntries(new URLSearchParams(rawBody))
  );

  if (!form.success || !access.membership || !access.userId) {
    return NextResponse.json({ error: "Invalid checkout request." }, { status: 400 });
  }

  let config: ReturnType<typeof getBillingConfig>;

  try {
    config = getBillingConfig();
  } catch {
    log.error("billing.checkout_configuration_invalid");
    return NextResponse.json({ error: "Checkout is unavailable." }, { status: 503 });
  }

  if (!config.checkoutEnabled) {
    return NextResponse.json({ error: "Checkout is not open." }, { status: 409 });
  }

  const price = config.prices.find(({ interval }) => interval === form.data.interval);

  if (!price) {
    return NextResponse.json({ error: "Billing interval is unavailable." }, { status: 400 });
  }

  try {
    const checkoutUrl = await startBillingCheckout({
      tenantId: access.membership.tenantId,
      actorUserId: access.userId,
      interval: form.data.interval,
      price,
      skuName: config.skuName,
      successUrl: clinicAppUrl("/billing?checkout=returned").toString(),
      cancelUrl: clinicAppUrl("/billing?checkout=cancelled").toString(),
      gateway: createConfiguredPaymentGateway(config),
      livemode: config.livemode,
      store: createBillingStore(createAdminSupabase())
    });

    return NextResponse.redirect(checkoutUrl, 303);
  } catch (error) {
    if (error instanceof BillingCheckoutRateLimitedError) {
      return NextResponse.json(
        { error: "Too many checkout attempts. Try again in 10 minutes." },
        { status: 429, headers: { "Retry-After": "600" } }
      );
    }

    log.withMetadata({ provider: config.provider }).error("billing.checkout_failed");
    return NextResponse.json({ error: "Checkout is unavailable." }, { status: 503 });
  }
};
