---
version: alpha
name: Karon
description: >-
  Offline-first-target dental clinic PWA. Quiet ops workbench on paper — Blue 600,
  Outfit, emerald only for success, never spa mint or Chair Azure. Density tiers (D3).
colors:
  # Neutrals — ~90% of the canvas
  surface: "#F3F4F6"
  surface-sunken: "#E5E7EB"  # darker than surface — wells (D2)
  paper: "#FFFFFF"
  text: "#111827"
  text-subtle: "#4B5563"
  text-subtlest: "#6B7280"
  text-inverse: "#FFFFFF"
  border: "#E5E7EB"
  border-input: "#E5E7EB"
  border-focused: "#2563EB"
  # Semantic roles — meaning, not decoration
  primary: "#2563EB"
  primary-hovered: "#1D4ED8"
  primary-foreground: "#FFFFFF"
  success: "#059669"
  success-foreground: "#FFFFFF"
  success-subtle: "#D1FAE5"
  warning: "#D97706"
  warning-foreground: "#92400E"
  warning-subtle: "#FEF3C7"
  danger: "#DC2626"
  danger-foreground: "#FFFFFF"
  danger-subtle: "#FEE2E2"
  information: "#0F766E"
  information-foreground: "#FFFFFF"
  information-subtle: "#CCFBF1"
  brand-subtle: "#F3F4F6"
  accent: "#F59E0B"
  accent-foreground: "#111827"
  link: "#2563EB"
typography:
  family-sans:
    fontFamily: '"Outfit", ui-sans-serif, system-ui, sans-serif'
  family-numeric:
    fontFamily: '"Outfit", ui-sans-serif, system-ui, sans-serif'
    fontFeature: "tnum"
  display:
    fontFamily: '"Outfit", ui-sans-serif, system-ui, sans-serif'
    fontSize: 1.5rem
    fontWeight: 800
    letterSpacing: -0.02em
    lineHeight: 1.25
  heading:
    fontFamily: '"Outfit", ui-sans-serif, system-ui, sans-serif'
    fontSize: 1.125rem
    fontWeight: 800
    letterSpacing: -0.02em
    lineHeight: 1.35
  body:
    fontFamily: '"Outfit", ui-sans-serif, system-ui, sans-serif'
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.5
  body-small:
    fontFamily: '"Outfit", ui-sans-serif, system-ui, sans-serif'
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.4
  label:
    fontFamily: '"Outfit", ui-sans-serif, system-ui, sans-serif'
    fontSize: 0.875rem
    fontWeight: 500
    lineHeight: 1.3
  button:
    fontFamily: '"Outfit", ui-sans-serif, system-ui, sans-serif'
    fontSize: 0.875rem
    fontWeight: 500
    lineHeight: 1
rounded:
  sm: 0.25rem
  md: 0.5rem
  lg: 0.75rem
  full: 9999px
motion:
  control: 200ms
  overlay: 450ms
spacing:
  0: 0
  1: 4px
  2: 8px
  3: 12px
  4: 16px
  5: 20px
  6: 24px
  8: 32px
  10: 40px
  12: 48px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
    height: 56px
    padding: 16px
    typography: "{typography.button}"
  button-primary-hover:
    backgroundColor: "{colors.primary-hovered}"
    textColor: "{colors.primary-foreground}"
  button-outline:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    height: 56px
    padding: 16px
  button-ghost:
    backgroundColor: transparent
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    height: 56px
  textfield:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    height: 56px
  status-success:
    backgroundColor: "{colors.success-subtle}"
    textColor: "{colors.success}"
    rounded: "{rounded.sm}"
    padding: 8px
  status-warning:
    backgroundColor: "{colors.warning-subtle}"
    textColor: "{colors.warning-foreground}"
    rounded: "{rounded.sm}"
    padding: 8px
  status-danger:
    backgroundColor: "{colors.danger-subtle}"
    textColor: "{colors.danger}"
    rounded: "{rounded.sm}"
    padding: 8px
  status-information:
    backgroundColor: "{colors.information-subtle}"
    textColor: "{colors.information}"
    rounded: "{rounded.sm}"
    padding: 8px
---

# Design — Karon

Portable, token-first manifest for anything that should look like Karon: the chair
PWA now, marketing and admin later. YAML above is machine-readable. This prose is
how the pieces fit. Rules use RFC 2119: MUST, MUST NOT, SHOULD, MAY.

**This file is intent, not a license to re-draw the system.** In this repository,
production UI MUST import `@karon/design-system` and MUST use CSS variables in
`packages/design-system/src/styles/tokens.css`. If YAML and `tokens.css` disagree,
**`tokens.css` wins**. Do not re-implement Button, Input, or Dialog from the YAML
recipes when those primitives already exist.

Engineering spec (package tree, shadcn, density attribute): [`docs/design-system.md`](docs/design-system.md) **(private)**.
Agent workflow: `.cursor/skills/karon-design/`. Product locks: [ADR 0005](docs/adr/0005-design-system.md) **(private)**.
Booking SoT: [ADR 0007](docs/adr/0007-booking-system-of-record.md) **(private)**.

Aligned with: [Atlassian Design System](https://atlassian.design/get-started) token
roles, [DESIGN.md](https://github.com/google-labs-code/design.md) portability, quiet
ops workbench on paper (color blocks; no Material elevation theatre). Not aligned with:
Chair Azure / IBM Plex, default shadcn zinc dashboards, spa-mint dentistry Dribbbles,
Material card theatre, Atlassian blue `#0C66E4` as a copy, prompt Blue 500 on white
text (fails WCAG AA). Poster is inspiration — not a ban on separators (D1).

---

## Overview

Karon (Cebuano *now / today*) is chair software for a 1–2 person dental clinic.
The **buyer** is the dentist. The **daily user** is the secretary / chairside
assistant, often on a cheap Android phone, sometimes in gloves, often with wifi
that dies mid-procedure. The loop that matters (intent) is ninety seconds after one
morning of teaching: who is here → name + mobile → tooth → peso quote → cash / GCash /
unpaid → next visit. **Offline-first target; current offline coverage = intake +
visit status only.** North star UX: quiet **chair ops workbench** — attention strip →
next patient → fat verb → calm booking interrupt.

### Atmosphere

- MUST default to `paper` (`#FFFFFF`) for ~90% of the canvas. Clinics are already
  visually noisy (lights, instruments, Messenger). Atmosphere: **quiet ops workbench
  on paper** — poster is inspiration, not a ban on separators (D1).
- MUST treat color as meaning. Saturated fills are for **one** primary action per
  section, or for a status that also has a text label.
- MUST group related blocks primarily with `surface` / `surface-sunken` fills.
  **Allow:** a 1px low-contrast separator token **or** a real sunken delta when fill
  alone vanishes (~3% luminance). MUST NOT invent `border-l-4` + `shadow-md` as structure.
  Drag overlay = opacity/ring, not `shadow-md`. Keep: no Material elevation theatre.
  Default `--surface-border-width` may stay `0`; `--shadow` stays `none` on resting chrome.
- MUST NOT ship Chair Azure, IBM Plex, cream paper, terracotta accents,
  glassmorphism, or Material elevation theatre.
- Auth split MAY place licensed clinic photos as small rotated paper cards
  (`bg-background`, `rounded-lg`) on the primary color-block. The photo inside
  stays square (`rounded-none`). MUST NOT full-bleed photos or put them on chair
  screens. Inventory: [`docs/attributions.md`](docs/attributions.md) **(private)**.
- SHOULD feel like a fast honest chair ops surface — not a SaaS marketing site, not EHR density.

### Brand vs product

One type family everywhere in product chrome: Outfit. No display serif, no second
“marketing font” until `apps/marketing` exists — and even then the landing page
SHOULD stay in the same family so clinic and brochure are one product. MUST NOT
load IBM Plex Sans.

The **wordmark** is the word **Karon** in sentence case (Outfit 600) beside
the app mark. Import `KaronWordmark` from `@karon/design-system`.

The **app mark** (`KaronMark`) is a geometric molar in profile that also reads as a
dental chair facing right: two cusps (crown / backrest), an L-shaped seat, two
root-legs, and a filled circle in the crook of the L — someone in the chair *now*
(*karon*). In chrome it is `currentColor` / `text-primary`. PWA and favicon: Blue 600
`#2563EB` square, white glyph, ~20% maskable inset (`apps/clinic/public/icons/karon.svg`).
Draft paths live in `packages/design-system/src/brand/`.

MUST NOT use clip-art molars, gradients, a cavity-like knockout hole, or a tooth
emoji. MUST NOT tile the mark as a watermark behind the today board.

### What we are not

| Not this | Why |
| --- | --- |
| Hospital EHR density (Epic-like) | Assistants will not complete a 90-second loop |
| Consumer wellness / teeth-whitening brand | Buyer is a dentist, not a TikTok clinic |
| Green primary buttons | Green is **paid / synced / success** only (CVD + money-app vibe) |
| Red primary buttons | Red is **unpaid / expired / destructive** |
| Dark mode | Supported via `data-theme`. **Clinic first-run default = light** (D8). User MAY choose system/dark in Settings. |

---

## Colors

Four kinds of color, not interchangeable — same split as [Atlassian color](https://atlassian.design/foundations/color):

1. **Neutrals and surfaces** — backbone.
2. **Semantic roles** — meaning (brand, success, warning, danger, information).
3. **Tints** — `*-subtle` fills for lozenges and banners. Not a second palette.
4. **Odontogram** — `--odon-*` aliases of the same tokens. Not a rainbow of tooth states
   invented in the feature file.

Refer to tokens by YAML key in prose. In app code, emit the CSS variable
(`bg-primary`, `text-muted-foreground`), never the hex.

### Neutrals

| Token | Hex | Use |
| --- | --- | --- |
| `paper` | `#FFFFFF` | Page canvas. Stark white. Not cream, not Chair Azure cool paper. |
| `surface` | `#F3F4F6` | Cards, wells, grouping fills on paper |
| `surface-sunken` | `#E5E7EB` | **Darker than `surface`** — wells inside a page (D2). Never the outermost canvas. Dark theme: document a visible delta in `tokens.css`. YAML MUST NOT claim “same as surface.” |
| `text` | `#111827` | Body, headings, peso amounts |
| `text-subtle` | `#4B5563` | Labels, metadata. Contrast ≥ 4.5:1 on paper. |
| `text-subtlest` | `#6B7280` | Placeholders only — not body copy |
| `border` | `#E5E7EB` | Residual outline token. Grouping uses fills, not hairlines. |
| `border-input` | `#E5E7EB` | Fields use `--input-fill` (`#E5E7EB`) and `--input-border-width: 0`. |
| `border-focused` | `#2563EB` | Focus ring; same as brand |

MUST use `paper` as the page background. Prefer fill grouping; MAY use low-contrast
separator or sunken delta when wells would otherwise vanish. The Karon pattern is
**white paper, gray color-block surfaces, no Material drop-shadow theatre**.

### Dark theme

Same token **names**. Values live under `[data-theme="dark"]` in `tokens.css`. Paper
is gray-900 (`#111827`), not `#000` and not Chair Azure blue-black. Fields use
`--input-fill: #111827` so they contrast on `#1F2937` cards. Filled buttons use the
matching `*-foreground`. Preference: **`light` (clinic first-run default)**, `system`, or `dark`, stored
as `karon-theme` (D8). MUST NOT introduce a second hex palette in
feature files for dark. MUST NOT add a Chair vs Flat look switch (`data-look`).

### Semantic roles

These answer “what state is this?” Names are whole words.

| Role | Hex | When |
| --- | --- | --- |
| `primary` (Blue 600) | `#2563EB` | The one action: Save visit, Add patient, Collect. Links, focus. Hover `#1D4ED8`. Do not use Blue 500 — white-on-500 fails WCAG AA. |
| `success` (emerald) | `#059669` | Paid, synced, done. Never the default button. |
| `accent` (amber) | `#F59E0B` | Sparse highlight only. **Active job ≠ amber** (D6) — use **primary** indicator (left bar or `primary/10` + medium). Reserve amber/`warning` for late / past due. |
| `warning` | `#D97706` | Late, past due, “ask before you do this”. Pale fill + dark ink. |
| `danger` | `#DC2626` | Unpaid, expired entitlement, destructive confirm. |
| `information` | `#0F766E` | Teal. Queued / syncing / in progress / trial. |

**Hue split is deliberate.** Brand is Blue 600. Success is emerald. Information is teal.
Do not “make primary a bit greener” to feel more dental — that collapses brand and
success for deuteranopia (~8% of men, including dentists). MUST NOT revive Chair Azure
`#1A5B7D` as primary.

- MUST treat `success` as a role, not a decorative mint accent.
- MUST NOT use `success` for owner daily totals. Money is `text` with tabular figures.
  Green-on-peso reads as a consumer finance app, not a clinic ledger.
- MUST pick the role that matches user meaning: delete confirm is `danger`; “patient
  is late” is `warning`; “saved on this device” is `information`, not `danger`.
- On bold filled backgrounds (`primary`, `success`, `danger`, `information`), text is
  `text-inverse`. Exception: warning fills stay **pale** (`warning-subtle`) with
  `warning-foreground` ink. White-on-amber fails contrast. Same Atlassian warning-inverse
  rule.

### Tints

`brand-subtle`, `success-subtle`, `warning-subtle`, `danger-subtle`, `information-subtle`
are lozenge / banner backgrounds. Body copy on those surfaces MUST stay `text` or
`text-subtle`, not tinted role text. Tinting a whole paragraph teal on a teal panel is
the usual drift and often fails contrast intuition.

### Clinic status → role map

Status is never color alone (WCAG 1.4.1). Pair **label + color**; icon when space allows.

| Domain state | Role | Label (sentence case) |
| --- | --- | --- |
| Booked (includes pending + confirmed) | neutral / subtle | Booked — pending = “Needs review” **chip**, not own column (D5) |
| Waiting | information | Waiting |
| In chair | primary | In chair — **never** amber accent (D6) |
| Late | warning | Late (derived) |
| Done | success / subtle | Done |
| Paid | success | Paid — **Collect / Collections only**, not Today columns |
| Unpaid | danger | Unpaid — **Collect / Collections only** |
| Cash / GCash | no extra hue | The word Cash or GCash |
| Sync queued | information | Queued |
| Synced | success | Synced |
| Trial | information | Trial |
| Past due | warning | Past due |
| Expired | danger | Expired |

**Board columns (max 5):** Booked · Waiting · In chair · Late · Done. StatusBadge `tone="primary"` MUST use primary — not accent (D6).

### What not to copy from dentistry clichés

- Toothpaste mint (`#7FDBCA`, `#A8E6CF`) as brand.
- Gold / serif “premium implant clinic” marketing inside the PWA.
- Per-tooth rainbow on the odontogram. The chart maps `--odon-primary` to `primary`.

---

## Typography

### Family

Outfit is the product face: every screen, button, table, form, quote. It is geometric,
legible at arm’s length, covers `latin-ext` (Ñ and Filipino names), and is already
loaded on the clinic layout. MUST NOT load IBM Plex Sans.

- MUST load Outfit once via `next/font` in the app layout (`display: swap`, `latin` +
  `latin-ext`, weights 400–800). MUST NOT add a second webfont per page.
- MUST NOT introduce IBM Plex, Inter, Geist, Roboto, Plus Jakarta, or a display serif
  in clinic chrome.
- Peso amounts, GCash refs, and times MUST use `tabular-nums` (`font-variant-numeric:
  tabular-nums` / Tailwind `tabular-nums`) so ₱1,500 and ₱11,500 do not dance.

### Scale

| Token | Size | Weight | Use |
| --- | --- | --- | --- |
| `display` | 1.5rem / 800 | Owner daily total, today heading | One `h1` per view. Tracking `-0.02em`. |
| `heading` | 1.125rem / 800 | Section titles, dialog titles | `h2`. Tracking `-0.02em`. |
| `body` | 1rem / 400 | Everything continuous | Default |
| `body-small` | 0.875rem / 400 | Helper text, lozenge, table headers | Sparingly |
| `label` | 0.875rem / 500 | Field labels, nav | |
| `button` | 0.875rem / 500 | Buttons | |

Chair glare and cheap phones: MUST NOT set body below 16px (`1rem`) on clinic density.
`body-small` is for secondary metadata, not the patient name.

Post-login chrome is a **workbench** (Hallmark app family). One type family still holds: Outfit is display and body. Do not add a marketing serif inside the PWA.

### Case and hierarchy

- MUST use **sentence case** for every user-visible string: titles, buttons, tabs,
  empty states, table headers, lozenges. “Add patient”, not “Add Patient”.
- MUST NOT use ALL CAPS, tracked-out eyebrows, or `01 · THE BOARD` kicker labels.
- MUST keep one `h1` per view and not skip heading levels.
- MUST leave ~30% extra width for later `en-PH` / Cebuano strings (translated labels
  grow). Do not size a button to the English word as if it were a pixel.

### Voice of type

The type should feel like a calm secretary, not a billboard. Hierarchy comes from
size and weight, not from coloring body copy `text-subtle` “to differentiate it from
headings”.

---

## Layout

Spacing is a **4px** scale (Tailwind default). Prefer even steps so the canvas also
reads as an 8px rhythm: `2, 4, 6, 8` (8 / 16 / 24 / 32).

- MUST express relatedness by proximity: label-to-field `space-1`/`2`; blocks that
  are different jobs `space-6`/`8`.
- MUST NOT invent `13px` or `10px 14px` gaps. Round to the nearest token.
- MUST use normal flow, Flexbox, Grid, `minmax()`, wrapping. MUST NOT require horizontal
  page scroll at 320px. Intrinsically wide charts MAY scroll **inside** a bounded region.
- SHOULD keep the today board as a **list on the phone** and a **column well on
  tablet+** — same component tree, not two apps.

### Page padding

- Phone: `16px` (`space-4`) inset, plus safe-area.
- Tablet / desktop: rail `14rem` + canvas `24px` (`space-6`).
- Max readable measure for helper prose: ~40rem. The today board MAY use the full
  canvas; quotes and settings SHOULD NOT stretch a 12-word sentence across a 1440px
  monitor.

### Alignment

Product UI is **left-aligned** in LTR. MUST NOT center the chair loop. Sign-in MAY
center a single card on large screens; the card contents stay left-aligned.

### App chrome (workbench)

Post-login is a dashboard work surface, not a wrapping header of every utility.

- Tablet+: left **rail** — Jobs (Today; owner also Collections), then
  Account (Settings). Settings holds Account (password and signed-in devices) and,
  for owners, Clinic (details), Integrations (bookings), and Members (staff).
  Active job uses **primary** indicator (D6), not amber. Header has a collapse control; collapsed rail is icons only.
  Footer is a staff chip (avatar, name, email) that opens theme and sign out.
  Staff avatar is DiceBear Notionists Neutral, seeded by
  user id (stable per person, not reshuffled on login).
- Phone: menu trigger on the left, wordmark centered. Jobs, Settings, theme, and
  sign out live in the left sheet (same grouping as the tablet rail).
- Sync stays an `information` banner above the canvas, never a toast.

Today’s canvas: **attention strip** (D11), then rows (phone) or column wells (tablet+).
MUST NOT invent marketing stats or peso KPIs on assistant Today until Collect ships (D10).

**Attention strip (prescribe):**
```
{date} · {n} waiting · {n} late · {n} in chair · {n} booked
[+ {n} new bookings when pending > 0]
```
Tap to filter. No “Arrived.” No ₱ on assistant Today. Services → Settings / Clinic — not a morning peer job (D10). Collections nav only when Collect exists; stub stays honest.

```
Phone                               Tablet+
┌─────────────────────┐           ┌──────┬──────────────────┐
│ ≡   Karon  [Add]    │           │Karon │ Today · attention│
│ Today               │           │Today │ [Add patient]    │
│ Mon · 2 waiting · 1 late        │Coll.*│ Booked│Waiting│… │
│ [2 new bookings]    │           │Sett. │ wells on sunken  │
│ Maria     Waiting   │           │      │                  │
│ [ In chair ]   [⋮]  │           │av ▸  │                  │
└─────────────────────┘           └──────┴──────────────────┘
* Collections only when Collect ships.
```

---

## Elevation & Depth

Three planes. No Material elevation theatre (`--shadow: none` on resting chrome).

| Plane | Token | Use |
| --- | --- | --- |
| Default | `paper` | The canvas (`#FFFFFF`) |
| Resting surface | `surface` | Cards, fields — fill first |
| Sunken well | `surface-sunken` (`#E5E7EB`) | Board columns / wells — **must differ** from surface (D2) |
| Overlay | `surface` + dialog primitive | Modal, sheet, toast, select |

- MUST group primarily with color blocks. MAY use 1px low-contrast separator when needed (D1).
- MUST NOT put `box-shadow` / `shadow-md` / `border-l-4` kanban tells on cards. Drag overlay = opacity/ring.
- Primary controls need **56px**; secondary/icon-only ≥44 (D3) — not “every control is 56.”
- SHOULD use `surface-sunken` for today-board columns on wide screens (wells on paper).
- Overlay (dialog / sheet) MAY use the shadcn overlay scrim. MUST keep the dialog
  titled (visible or `sr-only`).
- Under `data-density="clinic"`: `--control-hover-scale: 1` and `--surface-hover-scale: 1` **always** (D4). Hover = background/color only.
  `prefers-reduced-motion: reduce` MUST keep scales at `1` and `--motion-duration` at `0`. Overlay motion stays `--overlay-duration` (see Motion).

---

## Shapes

Radius follows **what the thing is**, not taste.

| Token | rem | Component class |
| --- | --- | --- |
| `sm` | 0.25rem | Lozenges, badges |
| `md` | 0.5rem | Buttons, inputs, select, nav items |
| `lg` | 0.75rem | Cards, dialogs, sheets |
| `full` | pill | Avatars only |

- MUST NOT use one radius on every element.
- MUST NOT emit `rounded-3xl` / pill buttons for primary actions. Clinic controls are
  slightly rounded rectangles, not consumer-app capsules.
- Focus: MUST show a 2px ring in `border-focused` / `--ring`. MUST NOT
  `outline-none` without that replacement. Ring MUST appear instantly (no fade-in).

---

## Components

YAML `components:` recipes are for prototypes and foreign tools. **In this repo they
are not an invitation to hand-build a second Button.**

### Import, don’t redraw

- MUST import `Button` (and later Input, Dialog, etc.) from `@karon/design-system`.
- MUST add new primitives with the shadcn CLI **into** `packages/design-system`
  (`yarn dlx shadcn@latest add …` from `apps/clinic`, aliases already point at the
  package). MUST NOT `shadcn add` into `apps/clinic/src/components/ui`.
- If a primitive does not exist yet, add it to the package in the same change that
  needs it — do not paste a one-off `<button className="bg-[#2563EB]">`.

### Button

Appearances that exist today: `default` (primary), `outline`, `ghost`.

- MUST use sentence case and an imperative verb: “Save visit”, “Add patient”, “Collect”.
  MUST NOT use “Submit”, “OK”, or “Click here”.
- MUST keep **one** primary button per section. A second action is `outline` or `ghost`.
- MUST NOT paint Save as `success` or Collect as `warning`.
- Clinic density **tiers** (D3) — replace “56px law for every control”:

| Tier | Min height | Examples |
| --- | --- | --- |
| **Primary** | **56px** | Add patient, Collect, Accept booking, Save visit, next-status on focused row |
| **Secondary** | ≥44px | Outline secondary, date control, week prev/next |
| **Icon-only** | ≥44×44 hit | Overflow ⋮, close |

  Shrinking Primary below 56 to “fit the card” = **P0 bug**. Secondary at 44 = compliant.
- Disabled is `opacity-50` plus `pointer-events-none`. MUST also set `disabled` on the
  element so assistive tech knows.

### Field

- MUST have a visible label. Placeholder-as-label is banned.
- Patient create is **name + mobile** only (F-05). MUST NOT grow a 10-field chart
  form because the layout looked empty.
- Errors sit next to the field in `danger` text, not only a toast.

### StatusBadge (pattern, when built)

- MUST include the word (Paid, Late, Queued). Color is reinforcement.
- MUST use the role map above. MUST NOT invent a fourth hue for GCash.

### EmptyState (pattern, when built)

Empty is an invitation: heading + one sentence + primary action. No illustrations of
teeth. Example: “No patients today” / “Add the first name from the Messenger thread.”
`EmptyState` MUST accept optional `action?: ReactNode` (D9). Loading (Skeleton +
`aria-busy`) and Error (Alert danger + retry) are first-class with Empty — error ≠ empty.

### AppShell (pattern, when built)

Clinic nav is the jobs in the 90-second loop, not a settings jungle. Owner-only items
(daily total, billing) MUST be absent for assistants in the UI **and** refused by the
server (NFR-10). Hide-the-button is not enough.

### Odontogram

Wrap `react-advanced-odontogram` in `features/odontogram`. Theme via `--odon-*`
aliases. One instance per page. MUST NOT restyle teeth with `bg-sky-500`.

### Toast / Sonner

Silent success: the row updates. Toast for failures and for “copied reminder”. MUST
NOT celebrate every Dexie write. MUST NOT put SPI (diagnosis, unpaid amount) in a
toast that might be screenshot-shared.

---

## Calm interrupts (bookings) — D7

Public booking inbox must not be silent or toast-spam.

1. Subscribe (Realtime or short backoff); single `useBookingInbox` for badge + list.
2. One short chime per new-request burst (settings-gated; default on desk); optional vibrate.
3. `aria-live="polite"`: “New booking: {name} · {time}” — no diagnosis, no unpaid.
4. Badge on Today + phone chrome when pending > 0.
5. Offline: last-known pending + “Inbox needs network.”
6. MUST NOT toast-spam; MUST NOT flash the whole board primary.

## Do's and Don'ts

**Do**

- Change brand in `tokens.css` (and keep this YAML in sync).
- Compose pages from primitives: Button, Field, Card, Empty, Badge, Dialog, Sonner.
- Keep clinic words (tooth, GCash, unpaid) in `apps/clinic/src/features`, not in
  `@karon/design-system`.
- Show offline as a calm `information` banner: “Saved on this device. Will sync when
  online.” Offline is the product target, not an error — coverage today = intake +
  visit status; inbox needs network.

**Don’t**

- `bg-sky-500`, `text-emerald-600`, or any raw palette class in a feature file.
- Recreate shadcn in the app.
- Use color as the only status.
- Put patient name, mobile, odontogram, or GCash ref in `console.*` or Pino/SigNoz
  (NFR-21).
- Require a public marketing Storybook for V1. MAY add package-level visual tests /
  minimal catalog for Today primitives (D12). Do not scaffold `apps/marketing` empty.

---

## Icons

Lucide via the design-system `components.json` (`iconLibrary: lucide`) for UI
chrome. Brand is `KaronMark` / `KaronWordmark`, not a Lucide tooth.

- MUST keep UI icons simple: plus, search, check, alert, wifi-off, copy.
- MUST give icon-only buttons an accessible name.
- MUST use `KaronWordmark` in app chrome (sign-in, shell). Standalone `KaronMark`
  needs an accessible name; nested in the wordmark it is `aria-hidden`.
- MUST NOT use a tooth emoji, a sparkle, or a gradient icon as brand.
- Decorative icons `aria-hidden="true"`.

---

## Motion

Motion-cut product. Assistants are working, not watching. Two clocks in
`packages/design-system/src/styles/tokens.css` — not in `components.json` and not
in a Tailwind JS config (this repo is Tailwind v4 `@theme`).

| Token | Default | Job |
| --- | --- | --- |
| `--motion-duration` | 200ms | Control hover / color. Tailwind: `duration-motion`. |
| `--overlay-duration` | 450ms | Drawer, sheet, dropdown, tooltip, alert-dialog. `--drawer-duration` aliases it. Tailwind: `duration-overlay`. |

- Overlay CSS lives in `packages/design-system/src/styles/index.css`, keyed by `data-slot`. Feature files MUST import the primitive and MUST NOT add `animate-in`, `slide-in-from-*`, overlay keyframes, or a second duration.
- New overlay primitive: set `data-slot` on overlay + content, then add the CSS block next to the existing overlay rules. Popovers MUST animate the CSS `scale` property (not `transform`) so Radix positioning `transform` is not overwritten.
- Popovers next to a collapsed rail MUST leave collision detection on (never `avoidCollisions={false}`) with `collisionPadding` so every item stays in the viewport.
- MUST honor `prefers-reduced-motion: reduce` for hover (`--motion-duration: 0`, scales = 1). Overlay duration is not zeroed — `0ms` overlays read as a pop.
- MUST NOT add page-load fade-up on every section, bounce, or confetti on Collect.
- MUST NOT install Framer Motion, GSAP, or `tw-animate-css` (`animate-in` is not in this repo).

---

## Voice and tone

English UI in V1 (`html lang="en-PH"`). Later strings MUST be translatable; do not
concatenate fragments.

| Surface | Tone |
| --- | --- |
| Chair chrome | Short, imperative, calm. “Add patient”. |
| Empty / error | What happened + what to do. No apology essay. |
| Reminder (F-10 / NFR-14) | Clinic name + date/time only. No diagnosis, no unpaid balance. |
| Owner totals | A number and a date. Not “crushing it today”. |

Patient-facing reminder MAY use *po* when we copy to Messenger because that is how
Cebu clinics write. In-app chrome SHOULD stay in English until we have translations.

MUST keep action names stable: the button “Collect” leads to a state “Collected”
(or Paid / Unpaid / GCash), not a toast that says “Success”.

---

## Accessibility

Target WCAG 2.2 **AA**. Chair also has NFR-08 (gloves / one-hand). Lighthouse-minded
90+ on Performance / a11y / best practices; SEO is low on the authenticated PWA.

- Contrast: body `text` on `paper` ≥ 4.5:1 (this palette: ~16:1). White on `primary`
  (`#2563EB`) meets AA; Blue 500 does not — do not “brighten” the brand fill.
- Touch: clinic `data-density="clinic"` → **Primary 56px**; Secondary / icon-only ≥ 44px (D3).
- Keyboard: visible focus ring. Dialogs have a title. One `h1`.
- Status: text + color. Prefer `role="status"` for sync/offline, not only a green dot.
- MUST NOT rely on hover. The primary device is a phone.
- Session timeout (NFR-13) MUST warn before logout; MUST NOT wipe an in-progress chart
  without a local Dexie write.

---

## Responsive behaviour

Breakpoints are the ones already in the clinic responsive rule: start at 320px,
then ~390, ~768, ~1280.

| Width | Today board | Quote / collect |
| --- | --- | --- |
| 320–767 | Single column, large rows | Full-width stack, sticky primary |
| 768–1023 | Column wells | Two-pane if it still fits |
| 1280+ | Same wells, not a new IA | Quote readable, not a dashboard wall |

- MUST keep tap targets ≥ 44px at every width; Primary actions stay 56px (D3).
- MUST account for long Filipino names wrapping; names MUST NOT overflow the row.
- Landscape phone: the odontogram MAY scroll inside a bounded region; chrome MUST
  remain reachable.

---

## Agent context

Atlassian’s production finding: a DESIGN.md is excellent for **portable intent** and
one-shot prototypes; it is a poor sole source for **production** because it dumps every
token at once and tempts agents to redraw components. We follow that split:

| Layer | Job |
| --- | --- |
| This file | Brand, roles, UX rules, YAML for foreign tools |
| `tokens.css` | Runtime values. Source of truth in this repo |
| `@karon/design-system` | Primitives and (later) patterns |
| `.cursor/skills/karon-design/` | On-demand: plan tokens/components, then import |
| Lint + cursor rules | Zero-token enforcement: no raw palette, no per-app shadcn |

Before writing UI, list the tokens and primitives you will use (the `ads_plan` step).
Then generate code that **imports** them.

Dark theme is **on**: `data-theme="light" | "dark"` on `<html>`, `ThemeProvider` + `themeInitScript` in the clinic layout, preference in `localStorage` (`karon-theme`: light / dark / system). **First-run clinic default = light** (D8). Prefer swapping tokens over `dark:` utilities. There is **no** look switch and **no** `karon-look` key. Chart ramps and a marketing display face remain omitted. Chair Azure and IBM Plex MUST NOT return. Keep brand tokens: Blue 600, Outfit + latin-ext, emerald = success/paid/synced only, money `text` + tabular-nums, sentence case, offline information banner, name+mobile create, no SPI in toasts, WCAG AA, skip-link + focus ring, role-gated nav, motion-cut (no confetti).
