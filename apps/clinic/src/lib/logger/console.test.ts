import {
  LogLayer,
  TestLoggingLibrary,
  TestTransport
} from "loglayer";
import { serializeError } from "serialize-error";
import { describe, expect, it } from "vitest";

import { createConsoleMethod } from "./console";
import { createServerLogPlugins } from "./plugins";

const createTestLogger = () => {
  const sink = new TestLoggingLibrary();
  const log = new LogLayer({
    contextFieldName: "context",
    metadataFieldName: "metadata",
    errorFieldName: "error",
    errorSerializer: serializeError,
    transport: new TestTransport({ logger: sink }),
    plugins: createServerLogPlugins()
  });

  return { log, sink };
};

describe("console logging bridge", () => {
  it("maps console data while redacting sensitive metadata", () => {
    const { log, sink } = createTestLogger();

    createConsoleMethod(log, "log")(
      "\u001B[31mSync queued\u001B[0m",
      { patientName: "Private Patient", route: "/sync" },
      2
    );

    const output = JSON.stringify(sink.lines);

    expect(output).toContain("Sync queued 2");
    expect(output).toContain("/sync");
    expect(output).toContain("[REDACTED]");
    expect(output).not.toContain("Private Patient");
  });

  it("serializes errors without leaking tokens", () => {
    const { log, sink } = createTestLogger();

    createConsoleMethod(log, "error")(
      "⨯",
      new Error("Sync failed"),
      { token: "secret-token" }
    );

    const output = JSON.stringify(sink.lines);

    expect(output).toContain("Sync failed");
    expect(output).toContain("[REDACTED]");
    expect(output).not.toContain("secret-token");
  });

  it("keeps child context out of the shared logger", () => {
    const { log, sink } = createTestLogger();

    log.child().withContext({ requestId: "request-a" }).info("Child");
    log.info("Parent");

    expect(JSON.stringify(sink.lines[0])).toContain("request-a");
    expect(JSON.stringify(sink.lines[1])).not.toContain("request-a");
  });
});
