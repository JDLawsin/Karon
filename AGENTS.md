# Karon

Offline-first-target **PWA** for small dental clinics (Cebu / PH beachhead). Buyer = dentist. Daily user = assistant. **SaaS**, not custom per clinic. Cebuano *karon* = now / today.

**Offline-first PWA.** Local-first writers cover intake, visit status, chart, quote, collect, and next visit; public booking and owner reporting still require network.

Chair loop is the product **intent**. Shipped today: auth → Today huddle → services → public `/book` ([ADR 0007](docs/adr/0007-booking-system-of-record.md) **(private)** when present). Marketing and platform admin apps are **TODO** — do not scaffold empty shells.

## Tech stack

Locked in `docs/adr/0003-nextjs-supabase.md` **(private)**. Yarn 4 workspaces (`docs/adr/0004-monorepo.md` **(private)**).

| Layer | This repo |
| --- | --- |
| Tooling | Node, **Yarn 4**, Turborepo, TypeScript |
| Apps | Next.js App Router — create `apps/clinic` first |
| Local | Dexie + dexie-encrypted + outbox |
| Cloud | Supabase Auth + Postgres **RLS**; supabase-js (user JWT) in the PWA |
| Server SQL | Drizzle **`db.rls()`**; admin client for PayMongo webhooks only |
| UI | Tailwind + shadcn inside `packages/design-system` |
| Network | TanStack Query (network only) |
| PWA | Serwist |
| Tests | Vitest + Playwright (fake data) |

Do not add: NestJS, Prisma as the clinic path, Zustand as a data store, Chart.ts as odontogram, per-app shadcn, pnpm.

## Architecture

```text
apps/clinic/src/app/          Next routing only — thin page.tsx
apps/clinic/src/features/     One folder per job (patients, odontogram, …)
apps/clinic/src/lib/          Dexie instance, sync engine, supabase clients
packages/design-system/       Tokens + shadcn + shared patterns
packages/db/                  Drizzle schema + db.rls + admin (server-only)
docs/                         Planning set (start at docs/README.md)
```

- **UI never talks to Postgres.** Chair writes Dexie + outbox. Sync uses supabase-js.
- **`@karon/db` is server-only.** Never import from a Client Component. Workspace scope is `@karon/*`.
- Parse with Zod at the Dexie / sync / webhook edge. Never `as Patient`.
- Chrome: `useState`. Live clinic rows: Dexie. Network: TanStack Query.

Route files re-export feature screens (Next requires a default export):

```tsx
import TodayBoard from "@/features/today-board/today-board";

const TodayPage = () => <TodayBoard />;

export default TodayPage;
```

## Code style

ES6+ only. Never `var`. Prefer `const`. Arrow functions, kebab-case files. Feature UI: typed `Props`, arrow, **default export**. Hooks and domain: **named** exports.

Cursor and Codex share the same project guidance. Codex discovers this file automatically; Cursor uses the `.cursor` files below. When a task matches a scoped rule, read it before editing:

| Scope | Shared instruction |
| --- | --- |
| Always | `.cursor/rules/ponytail.mdc`, `.cursor/rules/responsive-ui.mdc` |
| TypeScript / TSX | `.cursor/rules/clinic-js-style.mdc`, `.cursor/rules/react-state.mdc` |
| UI / CSS | `.cursor/rules/karon-design.mdc`, `.cursor/rules/overlay-motion.mdc`, `.cursor/rules/lighthouse-quality.mdc` |
| Playwright | `.cursor/rules/writing-e2e.mdc`, `.cursor/rules/e2e-test.mdc` |
| Finalize code changes | `.cursor/rules/finalize-review.mdc`, `.cursor/rules/clean-runtime.mdc` |

Aim for Lighthouse-minded 90+ UI; do not run DevTools unless asked.

## Docs and skills

Private planning docs may be absent from a public clone — label **`(private)`**. Prefer code + this file when private docs are unavailable.

| Task | Read |
| --- | --- |
| What ships vs intent | `docs/IMPLEMENTATION-TRUTH.md` **(private)** |
| What we build (intent) | `docs/v1-spec-freeze.md` + `docs/v1-features.md` **(private)** — Impl column is source for status |
| Booking SoT | `docs/adr/0007-booking-system-of-record.md` **(private)** — `/book` primary; NestJS notes SUPERSEDED |
| Stack | `docs/adr/0003-nextjs-supabase.md` **(private)** |
| Folders | `docs/folder-structure.md` **(private)** |
| How to write a feature | `docs/code-patterns.md` **(private)** |
| Visual language | `DESIGN.md` + `docs/design-system.md` **(private)** |
| Privacy | `docs/pia-draft.md` **(private)** — **NOT PRODUCTION APPROVED** |

Ponytail is always-on via `.cursor/rules/ponytail.mdc` and **takes priority**. Codex-native project skills live in `.agents/skills/`; Cursor-compatible copies live in `.cursor/skills/`. Product locks: `.agents/skills/clinic-overrides/` — override generic Next / Vercel / Supabase skills (Server Actions as chair save, Prisma, Zustand, REST `/api/patients`). They do not override Ponytail.

Playwright: `.cursor/rules/writing-e2e.mdc` + `.cursor/rules/e2e-test.mdc`. Review specs with `.agents/skills/review-e2e-test/`. Specs live in `e2e/`. Fake data only.

## Boundaries

Always: offline for **supported** surfaces (intake + visit status today); owner vs assistant on the **server**; no SPI in ops logs; PayMongo is dentist → us (**Missing** until built).

Never: service-role in the PWA; Server Actions as odontogram save; HMO/AI/photos in V1; NestJS booking service; empty `apps/marketing` or `apps/admin` unless asked; claim Frozen chair SaaS as shipped.

Ask first: new runtime dependencies; SMS vendor; Google Calendar reconnect. Do not seed PayMongo / `plans` pesos until [docs/pricing.md](docs/pricing.md) **(private)** is Accepted (it is **draft**).

Never commit `.env*`.

## Verify

After a feature, non-trivial bug fix, or refactor: `.cursor/rules/finalize-review.mdc`. Then matching `yarn` scripts. Then `.cursor/rules/clean-runtime.mdc` (existing `next dev` / test terminals). Do not claim done while those are dirty. Changed UI: exercise the flow in the browser when tools exist (fake data).

When completing work tied to a Jira feature ticket, update that ticket to `Done`, add honest completion evidence, and rename it to the repository's `KR-###-Done-...` convention before handoff.
