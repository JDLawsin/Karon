# Karon

Offline-first **PWA** for small dental clinics (Cebu / PH beachhead). Buyer = dentist. Daily user = assistant. **SaaS**, not custom per clinic. Cebuano *karon* = now / today.

Chair loop is the product. Marketing and platform admin apps are **TODO** — do not scaffold empty shells.

## Tech stack

Locked in `docs/adr/0003-nextjs-supabase.md`. Yarn 4 workspaces (`docs/adr/0004-monorepo.md`).

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

Cursor: `.cursor/rules/clinic-js-style.mdc`, `.cursor/rules/react-state.mdc`, `.cursor/rules/lighthouse-quality.mdc` (90+ Lighthouse-minded UI; do not run DevTools unless asked).

## Docs and skills

| Task | Read |
| --- | --- |
| What we build | `docs/v1-spec-freeze.md` + `docs/v1-features.md` |
| Stack | `docs/adr/0003-nextjs-supabase.md` |
| Folders | `docs/folder-structure.md` |
| How to write a feature | `docs/code-patterns.md` |
| Visual language | `DESIGN.md` + `docs/design-system.md` |
| Privacy | `docs/pia-draft.md` (not legal approval) |

Ponytail is always-on via `.cursor/rules/ponytail.mdc` and **takes priority**. Product locks: `.cursor/skills/clinic-overrides/` — override generic Next / Vercel / Supabase skills (Server Actions as chair save, Prisma, Zustand, REST `/api/patients`). They do not override Ponytail.

Playwright: `.cursor/rules/writing-e2e.mdc` + `.cursor/rules/e2e-test.mdc`. Review specs with `.cursor/skills/review-e2e-test/`. Specs live in `e2e/`. Fake data only.

## Boundaries

Always: airplane-mode chair loop; owner vs assistant on the **server**; no SPI in ops logs; PayMongo is dentist → us.

Never: service-role in the PWA; Server Actions as odontogram save; HMO/AI/photos in V1; empty `apps/marketing` or `apps/admin` unless asked.

Ask first: new runtime dependencies; SMS vendor. Do not seed PayMongo / `plans` pesos until [docs/pricing.md](docs/pricing.md) is Accepted (it is **draft**).

Never commit `.env*`.

## Verify

After a feature, non-trivial bug fix, or refactor: `.cursor/rules/finalize-review.mdc`. Then matching `yarn` scripts. Then `.cursor/rules/clean-runtime.mdc` (existing `next dev` / test terminals). Do not claim done while those are dirty. Changed UI: exercise the flow in the browser when tools exist (fake data).
