const TURNSTILE_SITEVERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

type VerifyTurnstileInput = {
  token: string | undefined;
  remoteIp?: string;
  secret?: string;
  production?: boolean;
  fetchImpl?: (input: string, init?: RequestInit) => Promise<Response>;
};

const verifyTurnstileToken = async ({
  token,
  remoteIp,
  secret = process.env.TURNSTILE_SECRET_KEY?.trim(),
  production = process.env.NODE_ENV === "production",
  fetchImpl = fetch
}: VerifyTurnstileInput) => {
  // ponytail: skip Siteverify in local/dev when unset so yarn dev still books
  if (!secret) {
    return !production;
  }

  if (!token) {
    return false;
  }

  const body = new URLSearchParams({
    secret,
    response: token
  });

  if (remoteIp) {
    body.set("remoteip", remoteIp);
  }

  try {
    const response = await fetchImpl(TURNSTILE_SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body
    });
    const json: unknown = await response.json().catch(() => null);

    return (
      response.ok &&
      Boolean(json && typeof json === "object" && "success" in json && json.success === true)
    );
  } catch {
    return false;
  }
};

export { TURNSTILE_SITEVERIFY_URL, verifyTurnstileToken };
