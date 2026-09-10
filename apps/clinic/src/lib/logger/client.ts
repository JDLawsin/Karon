"use client";

import { getSimplePrettyTerminal } from "@loglayer/transport-simple-pretty-terminal";
import { LogLayer } from "loglayer";
import { serializeError } from "serialize-error";

import { createClientLogPlugins } from "./plugins";

const clientLog = new LogLayer({
  contextFieldName: "context",
  metadataFieldName: "metadata",
  errorFieldName: "error",
  errorSerializer: serializeError,
  transport: getSimplePrettyTerminal({
    enabled: process.env.NODE_ENV === "development",
    runtime: "browser",
    viewMode: "message-only",
    includeDataInBrowserConsole: false
  }),
  plugins: createClientLogPlugins()
});

clientLog.withContext({
  service: "clinic",
  runtime: "browser",
  environment: process.env.NODE_ENV ?? "development"
});

export { clientLog };
