# Karon

Offline-first-target PWA for small dental clinics in the Philippines. Cebuano *karon* means now / today.

**Offline-first target; current offline coverage = intake + visit status only.**

Shipped today (auth → Today huddle → services → public `/book` requests). The full chair loop (tooth chart → peso quote → payment → next visit) is **spec intent**, not present-tense product — see private docs / [IMPLEMENTATION-TRUTH](../docs/IMPLEMENTATION-TRUTH.md) when available.

## Setup

Node 24+ and Yarn 4.

```bash
corepack enable
yarn
yarn workspace @karon/clinic dev
```

Opens at [http://localhost:3000](http://localhost:3000). Copy `apps/clinic/.env.example` to `apps/clinic/.env.local` if you need logging.

## Scripts

```bash
yarn workspace @karon/clinic dev   # clinic PWA
yarn lint
yarn typecheck
yarn test
yarn test:e2e
```

## Repo

- `apps/clinic` — clinic PWA
- `packages/design-system` — tokens and UI primitives
- `packages/db` — Drizzle schema (server-only)
- `docs/` — product and architecture (may be private / incomplete in public clone)

Start in [docs/README.md](docs/README.md) when present.
