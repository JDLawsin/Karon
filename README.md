# Karon

Offline-first PWA for small dental clinics in the Philippines. Cebuano *karon* means now / today.

The chair loop: who is here today → patient → tooth chart → peso quote → payment → next visit. The phone still works when wifi dies.

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

- `apps/clinic` — chair PWA
- `packages/design-system` — tokens and UI primitives
- `packages/db` — Drizzle schema (server-only)
- `docs/` — product and architecture ([attributions](docs/attributions.md) for stock photos)

Start in [docs/README.md](docs/README.md).
