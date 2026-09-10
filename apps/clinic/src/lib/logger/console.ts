import { stripVTControlCharacters } from "node:util";

import type { ILogLayer } from "loglayer";

type ConsoleMethod = "error" | "info" | "warn" | "debug" | "log";
type LogMethod = Exclude<ConsoleMethod, "log">;

const createConsoleMethod = (log: ILogLayer, method: ConsoleMethod) => {
  const mappedMethod: LogMethod = method === "log" ? "info" : method;

  return (...args: unknown[]) => {
    const metadata: Record<string, unknown> = {};
    const messages: string[] = [];
    let error: Error | null = null;
    let hasMetadata = false;

    for (const arg of args) {
      if (arg instanceof Error) {
        error ??= arg;
      } else if (typeof arg === "object" && arg !== null) {
        Object.assign(metadata, arg);
        hasMetadata = true;
      } else {
        messages.push(String(arg));
      }
    }

    let message = stripVTControlCharacters(messages.join(" ")).trim();

    if (message === "⨯" && error) {
      message = error.message;
    }

    if (error && hasMetadata && messages.length > 0) {
      log.withError(error).withMetadata(metadata)[mappedMethod](message);
    } else if (error && messages.length > 0) {
      log.withError(error)[mappedMethod](message);
    } else if (hasMetadata && messages.length > 0) {
      log.withMetadata(metadata)[mappedMethod](message);
    } else if (error && hasMetadata) {
      log.withError(error).withMetadata(metadata)[mappedMethod]("");
    } else if (error) {
      log.errorOnly(error);
    } else if (hasMetadata) {
      log.metadataOnly(metadata);
    } else {
      log[mappedMethod](message);
    }
  };
};

export { createConsoleMethod };
export type { ConsoleMethod };
