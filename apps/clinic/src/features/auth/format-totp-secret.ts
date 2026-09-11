const formatTotpSecret = (secret: string) =>
  secret.replaceAll(" ", "").replace(/(.{4})/g, "$1 ").trim();

export { formatTotpSecret };
