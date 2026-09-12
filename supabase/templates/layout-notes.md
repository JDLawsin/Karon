# Auth email templates

Paste-ready HTML for the four GoTrue mailers the clinic app sends today. Copy each file into **Supabase Dashboard → Authentication → Email Templates**. These files do not deploy with Next.js.

| File | Dashboard template | Subject | Preheader |
| --- | --- | --- | --- |
| `confirmation.html` | Confirm signup | Confirm your Karon account | Confirm this email to finish creating your Karon account. |
| `magic-link.html` | Magic Link | Sign in to Karon | Use this link to sign in to Karon. It expires soon. |
| `invite.html` | Invite user | You're invited to Karon | Accept this invite to join a clinic on Karon. |
| `recovery.html` | Reset password | Choose a new Karon password | Use this link to choose a new Karon password. It expires soon. |

## Site URL

Set **Authentication → URL Configuration → Site URL** to the clinic origin with **no trailing slash** (for example `https://clinic.example`). Links are `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=…` so they hit [`apps/clinic/src/app/auth/confirm/route.ts`](../../apps/clinic/src/app/auth/confirm/route.ts). Redirect URLs must allow that origin.

Do not use `{{ .ConfirmationURL }}` (GoTrue GET `/verify` — PKCE-fragile and consumed by Microsoft Safe Links prefetch).

If you later send mail through Resend, turn **off click tracking**. Rewritten links break Auth.

Safe Links can still prefetch our `/auth/confirm` GET. An interstitial page is out of this pass.

## Tokens (sRGB from DESIGN.md)

Email clients cannot use `tokens.css`. Inline hex only:

| Role | Hex |
| --- | --- |
| Paper | `#FFFFFF` |
| Card | `#F3F4F6` |
| Text | `#111827` |
| Muted | `#4B5563` |
| Border | `#E5E7EB` |
| Primary CTA | `#2563EB` on `#FFFFFF` |

Font stack: `"Outfit", ui-sans-serif, system-ui, sans-serif`. CTA min-height 44px, radius 8px.

## Variables used

- `{{ .SiteURL }}`
- `{{ .TokenHash }}`

Do not put `{{ .Token }}` or `{{ .TokenHash }}` in the subject or preheader.

Email-change, reauthentication, and security-notification templates are out of scope until those screens exist.
