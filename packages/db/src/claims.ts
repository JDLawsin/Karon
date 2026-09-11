const SESSION_ROLES = new Set(["anon", "authenticated"]);

type JwtClaims = {
  aal?: string;
  email?: string;
  role?: string;
  session_id?: string;
  sub?: string;
};

const decodeJwtClaims = (accessToken: string) => {
  const payload = accessToken.split(".")[1];

  if (!payload) {
    throw new Error("Invalid access token");
  }

  return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as JwtClaims;
};

const sessionRoleForClaims = (claims: JwtClaims) =>
  claims.role && SESSION_ROLES.has(claims.role) ? claims.role : "anon";

export { decodeJwtClaims, sessionRoleForClaims };
export type { JwtClaims };
