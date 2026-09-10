---
version: alpha
name: Karon
description: >-
  Offline-first dental clinic PWA. Minimal product UI that feels trusted at the
  chair — clinical blue for actions, green only for success, never spa mint.
colors:
  # Neutrals — ~90% of the canvas
  surface: "#FFFFFF"
  surface-sunken: "#E7EEF0"
  paper: "#F3F8FA"
  text: "#1C2B32"
  text-subtle: "#4C5B5F"
  text-subtlest: "#5D6C70"
  text-inverse: "#FFFFFF"
  border: "#D1D9DB"
  border-input: "#6E7D82"
  border-focused: "#1A5B7D"
  # Semantic roles — meaning, not decoration
  primary: "#1A5B7D"
  primary-hovered: "#034D6E"
  primary-foreground: "#FFFFFF"
  success: "#176540"
  success-foreground: "#FFFFFF"
  success-subtle: "#DCF2E4"
  warning: "#AA592C"
  warning-foreground: "#722803"
  warning-subtle: "#F9E8D9"
  danger: "#AC3039"
  danger-foreground: "#FFFFFF"
  danger-subtle: "#FFE4E2"
  information: "#156163"
  information-foreground: "#FFFFFF"
  information-subtle: "#DDF0F0"
  brand-subtle: "#E0EDF6"
  link: "#1A5B7D"
typography:
  family-sans:
    fontFamily: '"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif'
  family-numeric:
    fontFamily: '"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif'
    fontFeature: "tnum"
  display:
    fontFamily: '"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif'
    fontSize: 1.5rem
    fontWeight: 600
    lineHeight: 1.25
  heading:
    fontFamily: '"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif'
    fontSize: 1.125rem
    fontWeight: 600
    lineHeight: 1.35
  body:
    fontFamily: '"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif'
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.5
  body-small:
    fontFamily: '"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif'
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.4
  label:
    fontFamily: '"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif'
    fontSize: 0.875rem
    fontWeight: 500
    lineHeight: 1.3
  button:
    fontFamily: '"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif'
    fontSize: 0.875rem
    fontWeight: 500
    lineHeight: 1
rounded:
  sm: 0.25rem
  md: 0.5rem
  lg: 0.75rem
  full: 9999px
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
    height: 44px
    padding: 16px
    typography: "{typography.button}"
  button-primary-hover:
    backgroundColor: "{colors.primary-hovered}"
    textColor: "{colors.primary-foreground}"
  button-outline:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    height: 44px
    padding: 16px
  button-ghost:
    backgroundColor: transparent
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    height: 44px
  textfield:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    height: 44px
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

Engineering spec (package tree, shadcn, density attribute): [`docs/design-system.md`](docs/design-system.md).
Agent workflow: `.cursor/skills/karon-design/`. Product locks: [ADR 0005](docs/adr/0005-design-system.md).

Aligned with: [Atlassian Design System](https://atlassian.design/get-started) token
roles, [DESIGN.md](https://github.com/google-labs-code/design.md) portability, IBM
Carbon (quiet canvas), Linear (restraint). Not aligned with: default shadcn zinc
dashboards, spa-mint dentistry Dribbbles, Material card theatre, Atlassian blue
`#0C66E4` as a copy.

---

## Overview

Karon (Cebuano *now / today*) is chair software for a 1–2 person dental clinic.
The **buyer** is the dentist. The **daily user** is the secretary / chairside
assistant, often on a cheap Android phone, sometimes in gloves, often with wifi
that dies mid-procedure. The loop that matters is ninety seconds after one morning
of teaching: who is here → name + mobile → tooth → peso quote → cash / GCash /
unpaid → next visit.

### Atmosphere

- MUST default to `paper` / `surface` for ~90% of the canvas. Clinics are already
  visually noisy (lights, instruments, Messenger). The product is the quiet notebook.
- MUST treat color as meaning. Saturated fills are for **one** primary action per
  section, or for a status that also has a text label.
- MUST NOT ship cream paper, terracotta accents, gradient heroes, glassmorphism,
  or a dark “AI tool” theme. Those are generic generated-UI tells and they do not
  belong at a Cebu chair.
- SHOULD prefer whitespace and 1px `border` for grouping before elevation.
- SHOULD feel closer to a well-printed chart than to a SaaS marketing site.

### Brand vs product

One type family everywhere in product chrome: IBM Plex Sans. No display serif, no
second “marketing font” until `apps/marketing` exists — and even then the landing
page SHOULD stay in the same family so clinic and brochure are one product.

The **wordmark** is the word **Karon** in sentence case (IBM Plex Sans 600) beside
the app mark. Import `KaronWordmark` from `@karon/design-system`.

The **app mark** (`KaronMark`) is a geometric molar in profile that also reads as a
dental chair facing right: two cusps (crown / backrest), an L-shaped seat, two
root-legs, and a filled circle in the crook of the L — someone in the chair *now*
(*karon*). In chrome it is `currentColor` / `text-primary`. PWA and favicon: Chair
Azure square, white glyph, ~20% maskable inset (`apps/clinic/public/icons/karon.svg`).
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
| Dark mode | Supported via `data-theme`. Default preference is **system**. Chair can force light. |

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
| `paper` | `#F3F8FA` | Page canvas. Cool, slightly blue. Not cream, not stark clinic-white. |
| `surface` | `#FFFFFF` | Cards, fields, dialogs sitting on paper |
| `surface-sunken` | `#E7EEF0` | Wells inside a page (today-board columns). Never the outermost canvas. |
| `text` | `#1C2B32` | Body, headings, peso amounts |
| `text-subtle` | `#4C5B5F` | Labels, metadata. Contrast ≥ 4.5:1 on paper. |
| `text-subtlest` | `#5D6C70` | Placeholders only — not body copy |
| `border` | `#D1D9DB` | Hairline grouping. Decorative; not the only selected-state cue |
| `border-input` | `#6E7D82` | Resting field outline. ≥ 3:1 vs paper (WCAG 1.4.11) |
| `border-focused` | `#1A5B7D` | Focus ring; same as brand |

MUST use `paper` as the page background. MUST NOT use `surface-sunken` as the page
background to make white cards pop. That “grey page, floating cards” pattern is the
common drift; the Karon pattern is **cool paper, bordered white surfaces, optional
sunken wells inside**.

### Dark theme

Same token **names**. Values live under `[data-theme="dark"]` in `tokens.css`. Paper
is a blue-black (`#081318`), not `#000`. Brand, success, and danger **lighten** so
`text-primary` still meets 4.5:1 on dark paper; filled buttons use the matching
`*-foreground` (dark ink on the lighter fill). Preference: `system` (default),
`light`, or `dark`, stored as `karon-theme`. Chair MAY force light. MUST NOT introduce
a second hex palette in feature files for dark.

### Semantic roles

These answer “what state is this?” Names are whole words.

| Role | Hex | When |
| --- | --- | --- |
| `primary` (Chair Azure) | `#1A5B7D` | The one action: Save visit, Add patient, Collect. Links, focus. |
| `success` | `#176540` | Paid, synced, done. Never the default button. |
| `warning` | `#AA592C` | Late, past due, “ask before you do this”. |
| `danger` | `#AC3039` | Unpaid, expired entitlement, destructive confirm. |
| `information` | `#156163` | Teal. Queued / syncing / in progress / trial. The “dental water” hue. |

**Hue split is deliberate.** Brand sits at OKLCH hue ~240 (blue). Success sits at
~155 (green). Information is teal (~200). Do not “make primary a bit greener” to feel
more dental — that collapses brand and success for deuteranopia (~8% of men,
including dentists).

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
| Booked | neutral / subtle | Booked |
| Waiting | information | Waiting |
| In chair | primary | In chair |
| Late | warning | Late |
| Paid | success | Paid |
| Unpaid | danger | Unpaid |
| Cash / GCash | no extra hue | The word Cash or GCash |
| Sync queued | information | Queued |
| Synced | success | Synced |
| Trial | information | Trial |
| Past due | warning | Past due |
| Expired | danger | Expired |

### What not to copy from dentistry clichés

- Toothpaste mint (`#7FDBCA`, `#A8E6CF`) as brand.
- Gold / serif “premium implant clinic” marketing inside the PWA.
- Per-tooth rainbow on the odontogram. The chart maps `--odon-primary` to `primary`.

---

## Typography

### Family

IBM Plex Sans is the product face: every screen, button, table, form, quote. It was
chosen because it is **legible at arm’s length**, has proper figures for pesos, covers
`latin-ext` (Ñ and Filipino names), and does not look like Geist / Inter defaults.

- MUST load it once via `next/font` in the app layout (`display: swap`, `latin` +
  `latin-ext`). MUST NOT add a second webfont per page.
- MUST NOT introduce Inter, Geist, Roboto, Plus Jakarta, or a display serif in clinic
  chrome.
- Peso amounts, GCash refs, and times MUST use `tabular-nums` (`font-variant-numeric:
  tabular-nums` / Tailwind `tabular-nums`) so ₱1,500 and ₱11,500 do not dance.

### Scale

| Token | Size | Weight | Use |
| --- | --- | --- | --- |
| `display` | 1.5rem / 600 | Owner daily total, today heading | One `h1` per view |
| `heading` | 1.125rem / 600 | Section titles, dialog titles | `h2` |
| `body` | 1rem / 400 | Everything continuous | Default |
| `body-small` | 0.875rem / 400 | Helper text, lozenge, table headers | Sparingly |
| `label` | 0.875rem / 500 | Field labels, nav | |
| `button` | 0.875rem / 500 | Buttons | |

Chair glare and cheap phones: MUST NOT set body below 16px (`1rem`) on clinic density.
`body-small` is for secondary metadata, not the patient name.

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
- Tablet / desktop: `24px` (`space-6`).
- Max readable measure for helper prose: ~40rem. The today board MAY use the full
  width; quotes and settings SHOULD NOT stretch a 12-word sentence across a 1440px
  monitor.

### Alignment

Product UI is **left-aligned** in LTR. MUST NOT center the chair loop. Sign-in MAY
center a single card on large screens; the card contents stay left-aligned.

```
Phone today board                 Tablet+
┌─────────────────────┐         ┌─────────┬─────────┬─────────┐
│ Today        [Add]  │         │ Booked  │ Waiting │ In chair│
│ ○ Maria  waiting    │         │ …       │ …       │ …       │
│ ○ Juan   in chair    │         └─────────┴─────────┴─────────┘
│ ○ Ana    late        │
└─────────────────────┘
```

---

## Elevation & Depth

Three planes. Shadows are rare.

| Plane | Token | Use |
| --- | --- | --- |
| Default | `paper` | The canvas |
| Resting surface | `surface` + `border` | Cards, fields, board columns |
| Overlay | `surface` + dialog primitive | Modal, sheet, toast, select |

- MUST prefer hairline `border` over drop shadow for in-page grouping.
- MUST NOT put `box-shadow` on every card. Assistants do not need Material elevation
  to know a row is tappable — they need 44px height and a clear name.
- SHOULD use `surface-sunken` for today-board columns on wide screens (wells on paper),
  not a stack of raised cards.
- Overlay (dialog / sheet) MAY use the shadcn overlay scrim. MUST keep the dialog
  titled (visible or `sr-only`).

---

## Shapes

Radius follows **what the thing is**, not taste.

| Token | rem | Component class |
| --- | --- | --- |
| `sm` | 0.25rem | Lozenges, badges |
| `md` | 0.5rem | Buttons, inputs, select, nav items |
| `lg` | 0.75rem | Cards, dialogs, sheets |
| `full` | pill | Avatars only (we barely use avatars in V1) |

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
  needs it — do not paste a one-off `<button className="bg-[#1A5B7D]">`.

### Button

Appearances that exist today: `default` (primary), `outline`, `ghost`.

- MUST use sentence case and an imperative verb: “Save visit”, “Add patient”, “Collect”.
  MUST NOT use “Submit”, “OK”, or “Click here”.
- MUST keep **one** primary button per section. A second action is `outline` or `ghost`.
- MUST NOT paint Save as `success` or Collect as `warning`.
- Clinic density: default height **44px** (`h-11` / `min-h-11`). Compact (`sm`) is for
  marketing/admin later or dense tables — MUST NOT be the chair default.
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

## Do's and Don'ts

**Do**

- Change brand in `tokens.css` (and keep this YAML in sync).
- Compose pages from primitives: Button, Field, Card, Empty, Badge, Dialog, Sonner.
- Keep clinic words (tooth, GCash, unpaid) in `apps/clinic/src/features`, not in
  `@karon/design-system`.
- Show offline as a calm `information` banner: “Saved on this device. Will sync when
  online.” Offline is the product, not an error.

**Don’t**

- `bg-sky-500`, `text-emerald-600`, or any raw palette class in a feature file.
- Recreate shadcn in the app.
- Use color as the only status.
- Put patient name, mobile, odontogram, or GCash ref in `console.*` or Pino/SigNoz
  (NFR-21).
- Scaffold Storybook or `apps/marketing` to “see the tokens”. Clinic is the catalog
  until a third surface exists.

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

Motion-cut product. Assistants are working, not watching.

- MAY use `transition-colors` on buttons (~150–180ms).
- MUST animate only `opacity` and `transform` if something moves.
- MUST honor `prefers-reduced-motion: reduce` (≤150ms opacity or none).
- MUST NOT add page-load fade-up on every section, bounce, or confetti on Collect.
- MUST NOT install Framer Motion / GSAP for V1 chrome.

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

- Contrast: body `text` on `paper` ≥ 4.5:1 (this palette: ~13:1). UI components that
  convey meaning ≥ 3:1 (`border-input` is the floor for fields).
- Touch: clinic `data-density="clinic"` → controls **≥ 44px**.
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

- MUST keep tap targets ≥ 44px at every width in clinic.
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

Dark theme is **on**: `data-theme="light" | "dark"` on `<html>`, `ThemeProvider` + `themeInitScript` in the clinic layout, preference in `localStorage` (`karon-theme`: light / dark / system). Prefer swapping tokens over `dark:` utilities. Chart ramps and a marketing display face remain omitted.
