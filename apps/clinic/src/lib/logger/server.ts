import "server-only";

import { PinoTransport } from "@loglayer/transport-pino";
import { getSimplePrettyTerminal } from "@loglayer/transport-simple-pretty-terminal";
import { LogLayer } from "loglayer";
import { pino } from "pino";
import { serializeError } from "serialize-error";

import { SENSITIVE_LOG_PATHS, createServerLogPlugins } from "./plugins";

const LOG_LEVELS = new Set([
  "trace",
  "debug",
  "info",
  "warn",
  "error",
  "fatal"
]);

const getLogLevel = () => {
  const configuredLevel = process.env.LOG_LEVEL;

  return configuredLevel && LOG_LEVELS.has(configuredLevel)
    ? configuredLevel
    : process.env.NODE_ENV === "development"
      ? "debug"
      : "info";
};

const pinoLogger = pino({
  level: getLogLevel(),
  redact: {
    paths: SENSITIVE_LOG_PATHS,
    censor: "[REDACTED]"
  }
});

const log = new LogLayer({
  contextFieldName: "context",
  metadataFieldName: "metadata",
  errorFieldName: "error",
  errorSerializer: serializeError,
  transport: [
    getSimplePrettyTerminal({
      enabled: process.env.NODE_ENV === "development",
      runtime: "node",
      viewMode: "inline"
    }),
    new PinoTransport({
      enabled: process.env.NODE_ENV === "production",
      logger: pinoLogger
    })
  ],
  plugins: createServerLogPlugins()
});

log.withContext({
  service: "clinic",
  runtime: "node",
  environment: process.env.NODE_ENV ?? "development"
});

export { getLogLevel, log };
