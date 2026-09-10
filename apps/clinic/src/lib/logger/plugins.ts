import { openTelemetryPlugin } from "@loglayer/plugin-opentelemetry";
import { redactionPlugin } from "@loglayer/plugin-redaction";

const SENSITIVE_FIELDS = [
  "accessToken",
  "access_token",
  "authorization",
  "chart",
  "cookie",
  "gcashRef",
  "gcashReference",
  "gcash_ref",
  "mobile",
  "mobileNumber",
  "mobile_number",
  "odontogram",
  "odontogramJson",
  "odontogram_json",
  "password",
  "patient",
  "patientName",
  "patient_name",
  "phone",
  "refreshToken",
  "refresh_token",
  "token"
];

const SENSITIVE_LOG_PATHS = [
  ...["context", "metadata"].flatMap((scope) =>
    SENSITIVE_FIELDS.map((field) => `${scope}.${field}`)
  ),
  "context.headers.authorization",
  "context.headers.Authorization",
  "context.headers.cookie",
  "context.headers.Cookie",
  "metadata.headers.authorization",
  "metadata.headers.Authorization",
  "metadata.headers.cookie",
  "metadata.headers.Cookie",
  "error.authorization",
  "error.cookie",
  "error.config.headers.Authorization",
  "error.config.headers.authorization",
  "error.config.headers.cookie",
  "error.response.config.headers.Authorization",
  "error.response.config.headers.authorization",
  "error.response.config.headers.cookie",
  "error.token"
];

const createServerLogPlugins = () => [
  redactionPlugin({
    paths: SENSITIVE_LOG_PATHS,
    censor: "[REDACTED]"
  }),
  openTelemetryPlugin()
];

const createClientLogPlugins = () => [
  redactionPlugin({
    paths: SENSITIVE_LOG_PATHS,
    censor: "[REDACTED]"
  })
];

export {
  SENSITIVE_LOG_PATHS,
  createClientLogPlugins,
  createServerLogPlugins
};
