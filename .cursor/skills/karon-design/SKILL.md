---
name: karon-design
description: >-
  Plan and implement Karon UI with @karon/design-system tokens and primitives.
  Use when building or changing clinic UI, tokens, Tailwind colors, shadcn
  components, palette, typography, density, StatusBadge, AppShell, or when
  tempted to use raw palette classes (bg-sky-500) or recreate Button.
---

# Karon design

Ponytail wins. This skill does not add libraries, Storybook, or a second shadcn tree.

Portable intent: `DESIGN.md`  
Engineering spec: `docs/design-system.md`  
Runtime values: `packages/design-system/src/styles/tokens.css`

Atlassian’s production lesson: do not dump the whole design system into context, and do not re-implement primitives from a markdown recipe. **Plan, then import.**

## Before writing UI

List, briefly:

1. **Tokens** — which CSS/Tailwind names (`bg-background`, `bg-primary`, `bg-success`, …)
2. **Primitives** — what already exists in `@karon/design-system` (`Button`, `KaronWordmark`; add Input/Dialog in the package when needed)
3. **Status** — if the UI shows state, the **word** plus the role (see map below)

Then implement. Do not start from a screenshot or from hex.

## Import rules

```tsx
import { Button, KaronWordmark, ThemeProvider } from "@karon/design-system";
```

- Clinic root layout already mounts `ThemeProvider` and `themeInitScript`. Feature UI uses semantic tokens (`bg-background`, `bg-primary`) so light/dark swap with `data-theme`. Do not add `next-themes`.
- Feature files: semantic classes only. `bg-primary`, not `bg-[#1A5B7D]`, not `bg-sky-500`.
- New primitive: `yarn dlx shadcn@latest add <name>` from `apps/clinic` so output lands in `packages/design-system`.
- Clinic words (GCash, unpaid, odontogram) stay in `apps/clinic/src/features`. Shared chrome only in the package. `KaronMark` is brand, not clinic copy.
- Change brand in `tokens.css` and keep `DESIGN.md` YAML in sync. Do not fork a theme in `globals.css`.

## Roles

| Role | Use | Not |
| --- | --- | --- |
| `primary` / `--primary` | The one action, links, focus | Success, money |
| `success` | Paid, synced, done | Default Save button, owner totals |
| `warning` | Late, past due | Pale fill + dark text; not white-on-amber |
| `destructive` | Unpaid, expired, delete | Offline banner |
| `info` | Queued, trial, “saved on device” | Errors |

Cash / GCash = the word, not a fourth hue.

## Chair constraints

- `data-density="clinic"` → controls ≥ 44px (`min-h-[var(--control-min-height)]`).
- Sentence case. Imperative: “Add patient”, “Save visit”, “Collect”. Not “Submit”.
- One primary button per section.
- Offline: `info`, copy like “Saved on this device. Will sync when online.”
- Reminders / shareable toasts: clinic + time only — no diagnosis, no unpaid amount (NFR-14).
- No extra webfonts. IBM Plex Sans is already on the layout. Peso/time: `tabular-nums`.
- No Framer Motion for V1 chrome. `transition-colors` is enough.
- Responsive: 320px first; no horizontal page scroll.

## If you need a pattern

AppShell, PageHeader, EmptyState, StatusBadge, StatCard, SyncBanner — build in `packages/design-system/src/patterns/` when the **second** screen needs it. StatusBadge MUST include the label.

## Don’t

- Recreate Button/Input from `DESIGN.md` YAML while the primitive exists.
- Scaffold Storybook or `apps/marketing` to preview tokens.
- Green primary, mint toothpaste brand, cream paper, pill CTAs, ALL CAPS eyebrows.
