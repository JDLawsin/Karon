---
name: clinic-overrides
description: >-
  Karon product and architecture overrides. Load on every Next.js,
  Supabase, Drizzle, PWA, shadcn, billing, or data-fetching task in this repo.
  Use when another skill (vercel-*, nextjs, supabase, shadcn) suggests Server
  Actions as the chair write path, Prisma, Zustand, per-app shadcn, pnpm,
  NestJS, or a REST /api/patients CRUD layer.
---

# Clinic overrides

Ponytail (`.cursor/rules/ponytail.mdc`) takes priority over this skill. This file only overrides generic Next.js / Vercel / Supabase / shadcn advice — never Ponytail.

Canonical docs: `docs/README.md`  
Stack: `docs/adr/0003-nextjs-supabase.md`  
Folders: `docs/folder-structure.md`  
Code shape: `docs/code-patterns.md`  
V1 stories: `docs/v1-features.md`  
Visual language: `DESIGN.md` + `docs/design-system.md`. UI skill: `.cursor/skills/karon-design/`

## Non-negotiable

1. **Yarn 4** workspaces + Turbo. Lockfile `yarn.lock`. Do not add pnpm/npm.
2. **Chair writes Dexie + outbox first.** Never block odontogram / collect on network. Never use Server Actions as the chair save.
3. **supabase-js + user JWT** for PWA sync. **No service-role** in the client (NFR-11).
4. **Drizzle** only on the server, clinic SQL inside `db.rls()`. Admin client for PayMongo webhook / ops only.
5. **`apps/clinic/src/app` is routing.** Domain in `src/features/`. Engines in `src/lib/` (Dexie, sync).
6. **Tokens + a11y:** `@karon/design-system` only. No `shadcn add` inside an app. Semantic tokens, not `bg-sky-500`. Overlay motion is `--overlay-duration` + `data-slot` CSS (`.cursor/rules/overlay-motion.mdc`), not `animate-in` in a feature file. Aim Lighthouse-minded 90+ (`.cursor/rules/lighthouse-quality.mdc`); do not run Chrome DevTools unless asked. SEO is secondary on clinic/admin.
7. **TanStack Query** = network only. **useState** = chrome. No Zustand as a data store.
8. **PayMongo** = dentist → us (F-17). Patient GCash = record only (F-08).
9. **Do not scaffold** empty `apps/marketing` or `apps/admin` until asked.

## When other skills conflict

| Other skill suggests | Do this instead |
| --- | --- |
| Server Actions for create-patient / tooth save | Feature hook → Dexie + outbox |
| `POST /api/patients` as the write path | supabase-js after outbox drain |
| Prisma as the clinic ORM | Drizzle + `db.rls`; Prisma rejected (ADR 0003) |
| Zustand / Redux / Jotai | Dexie is the live notebook |
| SWR | TanStack Query for network only |
| Per-app `components/ui` shadcn | `packages/design-system` |
| pnpm / npm | Yarn 4, `nodeLinker: node-modules` |
| NestJS / MVC `controllers/` | Feature modules (ADR 0006) |
| Chart.ts as odontogram | `react-advanced-odontogram` |
| Logging SPI to SigNoz | Redact; audit table is F-12 |

## Data and sync

- Parse at the edge with Zod. Never `JSON.parse` + `as Patient`.
- Outbox drain is `lib/sync`, not a feature UI file.
- `@karon/db` starts with `server-only`. Never import it from a Client Component.
- Entitlement (trial / active / expired) is enforced on **login and sync** (NFR-19), not only a banner.

## Verify before claiming done

Run the repo commands that match the change (workspace `typecheck` / `lint` / `test` when they exist). Domain and outbox reducers go in Vitest first. Chair E2E is Playwright with **fake** patients — do not claim the 90-second loop from unit tests alone. Then `.cursor/rules/finalize-review.mdc` and `.cursor/rules/clean-runtime.mdc`.
