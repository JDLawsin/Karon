---
version: 1
slug: "apps-www-src-app-legal"
primary_target: "apps/www/src/app/legal"
related_targets: ["apps/www/src/features/legal/legal-page.tsx","apps/www/content/legal.tsx","apps/www/src/app/legal/privacy/page.tsx","apps/www/src/app/legal/terms/page.tsx"]
---

# Legal surfaces

Mode: Read. Audience: a clinic owner, staff member, or marketing-site visitor who needs to understand Karon's website terms and information handling without legal theater. Job: make draft status, scope, rights, and a reachable contact path easy to find. Constraints: counsel approval remains pending; do not imply that clinic-patient notices, payment terms, retention periods, or cross-border arrangements are approved.

## Direction contract

THESIS: Legal pages should read like a calm working document with visible status and direct wayfinding, not a wall of fine print or a persuasive landing page.

OWN-WORLD: Karon white paper, Outfit, Blue 600 links and focus, quiet gray navigation and contact fields, strong typographic hierarchy, and restrained rules. No gradients, shadows, decorative legal symbols, or compliance badges.

STORY: The reader sees the notice's draft status and scope, scans a concise table of contents, reads each section in a narrow measure, then reaches a plain-language contact handoff without hunting through the footer.

FIRST VIEWPORT: Desktop places the notice title and status above a sticky left table of contents and a single reading column. Mobile keeps the title first, then the complete table of contents, then the document. Privacy and Terms share this system so status and help remain consistent.

FORM: Established-world, code-led extension. The supplied Calendly references informed the generous white space and decisive blue/white hierarchy, while Read mode keeps legal content quieter than the persuasive pages. No concept seed was run because this extends Karon's established marketing surface and the requested information architecture was explicit.

FINISH: A legal surface is not ready when a development placeholder looks reachable, contact is hidden, heading order breaks, or narrow screens overflow. Final evidence covers phone, tablet, desktop, and wide layouts, with counsel-pending language preserved.

## Completion record

Evidence checked: `/legal/privacy` and `/legal/terms` share the Read-mode shell with a visible pending-counsel status, explicit notice scope, sticky desktop table of contents, complete mobile reading order, and a narrow `72ch` measure. Both end with the same `/contact` handoff. The privacy notice sends development placeholder addresses to `/contact`; production still requires a configured legal mailbox. Footer links make both notices directly reachable.

Finish review: **ship**. Truth and reachability are resolved, the direction contract is persisted here, and no material findings remain.
