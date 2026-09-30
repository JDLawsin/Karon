const readOrigin = (
  environment: NodeJS.ProcessEnv,
  name: "WWW_URL" | "APP_URL"
) => {
  const developmentOrigins = {
    WWW_URL: "http://localhost:3001",
    APP_URL: "http://localhost:3000"
  } as const;
  const value = environment[name] ?? (
    environment.NODE_ENV === "development" ? developmentOrigins[name] : undefined
  );

  if (!value) {
    throw new Error(`${name} is required`);
  }

  const url = new URL(value);

  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error(`${name} must be an HTTP(S) origin without a path`);
  }

  return url.origin;
};

export const readSiteOrigins = (environment: NodeJS.ProcessEnv) => ({
  www: readOrigin(environment, "WWW_URL"),
  app: readOrigin(environment, "APP_URL")
});
