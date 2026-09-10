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
