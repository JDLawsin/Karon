import type { Instrumentation } from "next";

import { requestErrorMetadata } from "@/lib/logger/request-error";

export const register = async () => {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  const { registerOTel } = await import("@vercel/otel");
  registerOTel("clinic");

  const [{ createConsoleMethod }, { log }] = await Promise.all([
    import("./lib/logger/console"),
    import("./lib/logger/server")
  ]);

  console.error = createConsoleMethod(log, "error");
  console.log = createConsoleMethod(log, "log");
  console.info = createConsoleMethod(log, "info");
  console.warn = createConsoleMethod(log, "warn");
  console.debug = createConsoleMethod(log, "debug");
};

export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context
) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  const { log } = await import("./lib/logger/server");
  const digest =
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof error.digest === "string"
      ? error.digest
      : undefined;

  log
    .withMetadata({
      ...requestErrorMetadata(request, context),
      ...(digest ? { digest } : {})
    })
    .error("next.request_failed");
};
