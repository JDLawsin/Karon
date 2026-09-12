import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

type GoogleOauthState = {
  userId: string;
  tenantId: string;
  nonce: string;
};

const signGoogleOauthState = (
  input: { userId: string; tenantId: string },
  tokenKey: string
) => {
  const payload = Buffer.from(
    JSON.stringify({
      userId: input.userId,
      tenantId: input.tenantId,
      nonce: randomBytes(16).toString("base64url")
    } satisfies GoogleOauthState)
  ).toString("base64url");
  const sig = createHmac("sha256", tokenKey).update(payload).digest("base64url");

  return `${payload}.${sig}`;
};

const readGoogleOauthState = (
  state: string,
  tokenKey: string
): GoogleOauthState | null => {
  const dot = state.lastIndexOf(".");

  if (dot <= 0) {
    return null;
  }

  const payload = state.slice(0, dot);
  const sig = Buffer.from(state.slice(dot + 1));
  const expected = Buffer.from(
    createHmac("sha256", tokenKey).update(payload).digest("base64url")
  );

  if (sig.length !== expected.length || !timingSafeEqual(sig, expected)) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    );

    if (
      parsed &&
      typeof parsed === "object" &&
      "userId" in parsed &&
      "tenantId" in parsed &&
      "nonce" in parsed &&
      typeof parsed.userId === "string" &&
      typeof parsed.tenantId === "string" &&
      typeof parsed.nonce === "string"
    ) {
      return {
        userId: parsed.userId,
        tenantId: parsed.tenantId,
        nonce: parsed.nonce
      };
    }
  } catch {
    return null;
  }

  return null;
};

export { readGoogleOauthState, signGoogleOauthState };
export type { GoogleOauthState };
