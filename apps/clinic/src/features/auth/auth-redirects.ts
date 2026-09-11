export const googleOAuthStart = (origin: string) => ({
  provider: "google" as const,
  options: { redirectTo: `${origin}/auth/callback` }
});

export const magicLinkRedirect = (origin: string) => `${origin}/auth/confirm`;
