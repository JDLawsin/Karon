import { NextResponse } from "next/server";
import { z } from "zod";

import {
  createPayMongoWebhookParser,
  getPayMongoWebhookConfig
} from "@/lib/billing/billing-config";
import {
  BillingStoreError,
  applyBillingWebhook
} from "@/lib/billing/billing-store";
import {
  InvalidBillingWebhookError,
  InvalidBillingWebhookSignatureError
} from "@/lib/billing/payment-gateway";
import {
  InvalidRequestBodyError,
  RequestBodyTooLargeError,
  readLimitedText
} from "@/lib/http/read-limited-text";
import { log } from "@/lib/logger/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

const MAX_WEBHOOK_BYTES = 256 * 1024;

export const runtime = "nodejs";

export const POST = async (request: Request) => {
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return NextResponse.json({ error: "Unsupported content type." }, { status: 415 });
  }

  const signature =
    request.headers.get("paymongo-signature") ??
    request.headers.get("x-paymongo-signature");

  if (!signature) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  try {
    const rawBody = await readLimitedText(request, MAX_WEBHOOK_BYTES);
    const gateway = createPayMongoWebhookParser(getPayMongoWebhookConfig());
    const event = gateway.parseWebhook({ rawBody, signatureHeader: signature });
    const result = await applyBillingWebhook(createAdminSupabase(), {
      provider: gateway.provider,
      rawBody,
      event
    });

    return NextResponse.json(
      { received: true, result },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ error: "Payload too large." }, { status: 413 });
    }

    if (error instanceof InvalidBillingWebhookSignatureError) {
      return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
    }

    if (
      error instanceof InvalidBillingWebhookError ||
      error instanceof InvalidRequestBodyError ||
      error instanceof SyntaxError ||
      error instanceof z.ZodError
    ) {
      return NextResponse.json({ error: "Invalid webhook." }, { status: 400 });
    }

    if (error instanceof BillingStoreError) {
      log.error("billing.webhook_store_failed");
    } else {
      log.error("billing.webhook_failed");
    }

    return NextResponse.json({ error: "Webhook unavailable." }, { status: 503 });
  }
};

export { MAX_WEBHOOK_BYTES };
