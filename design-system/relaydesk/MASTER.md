# Design System Master File — RelayDesk

> **LOGIC:** When building a specific page, first check `design-system/relaydesk/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file. If not, strictly follow the rules below.

**Project:** RelayDesk — Voice AI agent + inbox CRM (Next.js 14 app router, Tailwind 3)
**Generated:** 2026-10-20 with UI UX Pro Max (`--design-system`, Variance 6 · Motion 3 · Density 7), then verified.
**Style:** Minimalism & Swiss Style (skill match for "SaaS platforms, dashboards, professional tools") with a vibrant purple brand signature.

> **Verification note.** The generated palette matched "Voice Recorder" (recording red + waveform blue), which contradicts the
> product's brand. Per the skill's query contract it was re-run as `"AI SaaS vibrant purple violet" --domain color`; the
> "AI/Chatbot Platform" profile (primary `#7C3AED`, secondary `#A78BFA`, border `#DDD6FE`, background `#FAF5FF`, foreground
> `#1E1B4B`) validates the brand palette below, which is the owner's specified palette. Contrast checked against white.

---

## Global Rules

### Color Palette (light only — no dark surfaces anywhere)

| Role | Hex | CSS variable | Notes |
|------|-----|--------------|-------|
| Background | `#FFFFFF` | `--rd-bg` | dominant canvas |
| Soft surface | `#F8F5FF` | `--rd-surface` | page wash, table headers, selected rows |
| Lavender | `#F1EBFF` | `--rd-lavender` | chips, icon tiles, hover |
| Border | `#E9DFFF` | `--rd-border` | cards, dividers, inputs |
| Border strong | `#D8C8FF` | `--rd-border-strong` | input hover, separators on lavender |
| Primary | `#6C3BFF` | `--rd-primary` | buttons, links, focus — 5.2:1 on white |
| Primary hover | `#5A2BE6` | `--rd-primary-hover` | |
| Violet | `#8B5CF6` | `--rd-violet` | gradients, chart fills only (4.2:1 — not for small text) |
| Bright purple | `#9747FF` | `--rd-bright` | gradient highlight, glow |
| Ink | `#32136B` | `--rd-ink` | headings and body text — 13.9:1 |
| Muted | `#75658F` | `--rd-muted` | secondary text — 5.2:1 |
| Subtle | `#9C8FB5` | `--rd-subtle` | timestamps / placeholders (≥ large or non-essential only) |

**Brand gradient:** `linear-gradient(135deg, #6C3BFF 0%, #8B5CF6 55%, #9747FF 100%)` — primary buttons, hero banner, key metric
accents, active indicators. White text on it is bold/semibold (≥ 14px semibold) and the dark end sits under the text.
**Soft gradient:** `linear-gradient(180deg, #F8F5FF 0%, #FFFFFF 100%)` — section washes. **Ambient glow:** radial `#9747FF` at
8–14% opacity behind the hero / page header only.

Status semantics stay inside the purple family: live = brand gradient + pulse dot; missed/failed = lavender chip with ink text
and an icon (never color alone); closed = muted outline.

### Typography

- **Font:** Plus Jakarta Sans (headings + body), loaded with `next/font/google` on `<body>` (skill: Next.js — no layout shift).
- Scale: page title 30/36 bold (−0.03em) · section title 16/24 semibold · body 14/22 · small 12/18 · micro labels 11 uppercase
  +0.12em semibold. Numbers use tabular figures.

### Spacing (Density 7 — standard)

`--space-xs 4px · --space-sm 8px · --space-md 16px · --space-lg 24px · --space-xl 32px · --space-2xl 48px` — 8px rhythm.

### Radius

`--radius-sm 8px` (inputs, chips' inner) · `--radius-md 12px` (buttons, list rows) · `--radius-lg 16px` (cards, panels) ·
`--radius-xl 24px` (hero). Pills only for chips/badges.

### Shadows (purple-tinted, never grey/black)

| Level | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(50,19,107,.06)` | inputs, chips |
| `--shadow-md` | `0 12px 32px -20px rgba(108,59,255,.35)` | cards, panels |
| `--shadow-lg` | `0 24px 48px -24px rgba(108,59,255,.45)` | dropdowns, dialogs, hovered cards |
| `--shadow-glow` | `0 14px 28px -12px rgba(108,59,255,.55)` | primary buttons, active nav |

---

## Component Specs

- **Primary button:** brand gradient, white semibold text, radius 12, height 40, `--shadow-glow`; hover = slightly darker
  gradient + lift 1px; focus = 3px `#6C3BFF` ring at 35% + 2px offset; disabled = 50% opacity, no shadow.
- **Secondary button:** white, 1px `--rd-border`, ink text; hover = `--rd-surface` + `--rd-border-strong`.
- **Cards / panels:** white, 1px `--rd-border`, radius 16, `--shadow-md`; header row separated by `--rd-border`; clickable
  cards lift 2px with `--shadow-lg` (transform only — no layout shift).
- **Tables:** white; header `--rd-surface` with 11px uppercase muted labels; row dividers `#F1EBFF`; hover `#FBF9FF`;
  selected = lavender + 3px primary left accent.
- **Inputs / selects / textareas:** white, 1px `--rd-border`, radius 10, ink text; hover `--rd-border-strong`;
  focus border `#6C3BFF` + `0 0 0 4px rgba(108,59,255,.14)`. Labels always visible above.
- **Chips / badges:** pill, lavender bg + primary text; active = brand gradient + white.
- **Navigation (sidebar):** white, 1px right border; items ink-muted with purple line icons; hover lavender; active =
  lavender pill + primary text + 3px gradient bar on the left. Counts: lavender pill; alert counts: brand gradient.
- **Charts:** white background, purple series (`#6C3BFF` line, 18% gradient fill), dashed second series (never hue alone),
  dashed `#F1EBFF` gridlines, ink tooltip text on white tooltip with `--shadow-lg`; points focusable to reveal values.
- **Dialogs / dropdowns:** white, radius 16, `--shadow-lg`, scrim `rgba(50,19,107,.28)` + blur.
- **Icons:** Lucide only, 1.75–2px stroke, 16/18/20px tokens, purple (`#6C3BFF`) or muted (`#75658F`). No emoji as icons.

## Motion

Subtle (Motion 3): hover/press transitions 150–250ms `ease-out`; content fade-up 8–12px over 300ms on mount; skeleton shimmer
for loading. Everything honours `prefers-reduced-motion: reduce` (transitions and animations disabled).

## Anti-Patterns (Do NOT Use)

- ❌ Dark surfaces, black/charcoal panels, dark sidebar or dark hero
- ❌ Non-purple brand colors; grey shadows
- ❌ Excessive decoration; gradients on every surface (gradients only on primary actions, hero, key accents)
- ❌ Emojis as icons — Lucide SVG icons
- ❌ Missing `cursor:pointer`; layout-shifting hovers; instant state changes
- ❌ Low-contrast text (< 4.5:1); invisible focus states

## Pre-Delivery Checklist

- [ ] No emojis used as icons; all icons Lucide
- [ ] `cursor-pointer` on all clickable elements
- [ ] Hover states with smooth transitions (150–300ms)
- [ ] Text contrast ≥ 4.5:1 (ink `#32136B`, muted `#75658F` on white)
- [ ] Focus states visible for keyboard navigation
- [ ] `prefers-reduced-motion` respected
- [ ] Responsive: 375px, 768px, 1024px, 1440px — no horizontal scroll
- [ ] No content hidden behind fixed bars
