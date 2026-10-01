import "server-only";

const TURNSTILE_SITEVERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

type VerifyLeadTurnstileInput = {
  token?: string;
  remoteIp?: string;
  secret?: string;
  local?: boolean;
  fetchImpl?: typeof fetch;
};

const verifyLeadTurnstile = async ({
  token,
  remoteIp,
  secret = process.env.TURNSTILE_SECRET_KEY?.trim(),
  local = process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test",
  fetchImpl = fetch
}: VerifyLeadTurnstileInput) => {
  if (!secret) return local;
  if (!token) return false;

  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp) body.set("remoteip", remoteIp);

  try {
    const response = await fetchImpl(TURNSTILE_SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body
    });
    const result: unknown = await response.json().catch(() => null);

    return Boolean(
      response.ok &&
      result &&
      typeof result === "object" &&
      "success" in result &&
      result.success === true
    );
  } catch {
    return false;
  }
};

export { TURNSTILE_SITEVERIFY_URL, verifyLeadTurnstile };
