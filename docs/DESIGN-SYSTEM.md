# Design System — "Mizan"

_Mizan_ (ميزان) — the balance. Named for what the system has to communicate:
measured judgement, equilibrium between ambition and prudence, and the idea that
a partnership is weighed fairly on both sides.

The design system is shared by all three surfaces. The **tokens** are the
contract; Tailwind is only ergonomics. No component may introduce a raw colour,
spacing value, radius, shadow or duration that is not a token.

---

## 1. Design Principles

1. **Composure over persuasion.** An IR portal earns trust by being calm,
   precise and unhurried. No urgency patterns, no growth-hack UI, no gradients
   that shout.
2. **Structure is the ornament.** Islamic identity is expressed through
   _geometry_ — proportion, tessellation, radial symmetry — not through pasted-on
   iconography. There are no crescents, no mosque silhouettes, no arabesque
   borders around buttons.
3. **Evidence-forward.** Numbers, dates, sources and states are always visible.
   A financial figure never appears without its period and its provenance.
4. **Dense where it's work, generous where it's story.** The admin surface is
   information-dense and keyboard-first. The public portal breathes.
5. **Every state is designed.** Empty, loading, partial, error, forbidden,
   offline and success are components, not afterthoughts.
6. **Mobile-first, genuinely.** Layouts are authored at 360px and expanded. The
   admin dashboard included.

### Deliberately avoided

Generic SaaS template (purple gradient + Inter + rounded-3xl cards), generic
travel site (photo hero + orange CTA), generic banking dashboard (blue chrome +
donut charts), WordPress theme conventions (full-width alternating stripes).

---

## 2. Colour

Defined in **OKLCH** for perceptually even ramps and predictable contrast.
Three families plus semantics.

### `zamrud` — Emerald. Primary. Growth, life, continuity.

| Step | OKLCH                    | Use                    |
| ---- | ------------------------ | ---------------------- |
| 50   | `oklch(0.972 0.015 168)` | tinted surface         |
| 100  | `oklch(0.940 0.030 168)` | subtle fill            |
| 200  | `oklch(0.880 0.055 168)` | border on tint         |
| 300  | `oklch(0.800 0.080 168)` | dark-mode text accent  |
| 400  | `oklch(0.700 0.100 168)` | dark-mode primary      |
| 500  | `oklch(0.600 0.110 168)` | —                      |
| 600  | `oklch(0.510 0.100 168)` | **light-mode primary** |
| 700  | `oklch(0.420 0.085 168)` | primary hover          |
| 800  | `oklch(0.330 0.065 168)` | primary pressed        |
| 900  | `oklch(0.250 0.050 168)` | deep surface           |
| 950  | `oklch(0.170 0.035 168)` | **dark canvas**        |

### `emas` — Gold. Accent. Value, craft, significance. Used sparingly.

| Step | OKLCH                   |
| ---- | ----------------------- |
| 100  | `oklch(0.945 0.040 88)` |
| 200  | `oklch(0.895 0.070 88)` |
| 300  | `oklch(0.845 0.100 88)` |
| 400  | `oklch(0.790 0.120 86)` |
| 500  | `oklch(0.740 0.130 84)` |
| 600  | `oklch(0.660 0.120 82)` |
| 700  | `oklch(0.550 0.100 80)` |
| 800  | `oklch(0.440 0.080 78)` |

**Gold discipline:** gold is never a button fill for a routine action. It marks
_significance_ — the active nav indicator, a published badge, a milestone marker,
the hero's key line, a chart's primary series. If everything is gold, nothing is.

### `sakinah` — Neutral. Cool, faintly green-cast so it sits with the primary.

`0 (#fff)` · `25` · `50` · `100` · `200` · `300` · `400` · `500` · `600` · `700` ·
`800` · `900` · `950` · `1000`, from `oklch(1 0 0)` to `oklch(0.10 0.020 180)`.

The near-black is `oklch(0.10 0.020 180)`, not `#000`. Pure black is avoided
everywhere — it reads cheap on OLED and crushes shadow layering.

### Semantic ramps

`success` (reuses zamrud), `warning` `hue 70`, `danger` `hue 25`,
`info` `hue 240`. Each has `-subtle` (background), `-border`, `-fg` (text) and
`-solid` (fill) roles so a status colour is never chosen ad hoc.

### Semantic token layer

Components consume **roles**, never ramp steps:

```
--color-canvas            --color-fg
--color-surface           --color-fg-muted
--color-surface-raised    --color-fg-subtle
--color-surface-sunken    --color-fg-on-primary
--color-border            --color-primary / -hover / -active / -subtle
--color-border-strong     --color-accent  / -subtle
--color-border-focus      --color-success|warning|danger|info (+ -subtle/-fg/-border)
--color-overlay           --color-ring
```

Both themes redefine only these roles. This is also exactly the surface the CMS
theme manager is allowed to override — an admin can retheme the portal without
being able to emit arbitrary CSS.

### Contrast

Every text/background pairing meets **WCAG 2.2 AA** (4.5:1 body, 3:1 large text
and UI boundaries). Interactive targets meet 3:1 against adjacent colour. A
Vitest test computes contrast for every semantic pairing in both themes and fails
the build on a violation — contrast is enforced, not hoped for.

---

## 3. Typography

| Role           | Family                           | Rationale                                                                                                                                       |
| -------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Display        | **Newsreader** (variable serif)  | Editorial gravitas. Reads as a considered publication, not a product page. Optical-size axis keeps large sizes elegant and small sizes legible. |
| UI / body      | **Plus Jakarta Sans** (variable) | Designed in Jakarta — a real, non-decorative Indonesian identity signal. Geometric-humanist: modern without the Inter-sameness.                 |
| Numeric / mono | **JetBrains Mono**               | Tabular financial figures, reference codes, checksums.                                                                                          |

Loaded via `next/font` (self-hosted, subset, `display: swap`, preloaded for the
two above-the-fold faces). No external font CDN — it would also violate the CSP.

### Type scale (fluid, `clamp()` between 360px and 1440px)

| Token         | Min → Max            | Line height | Tracking          | Family               |
| ------------- | -------------------- | ----------- | ----------------- | -------------------- |
| `display-2xl` | 2.75 → 4.5rem        | 1.02        | −0.03em           | Display              |
| `display-xl`  | 2.25 → 3.5rem        | 1.06        | −0.025em          | Display              |
| `display-lg`  | 1.875 → 2.75rem      | 1.12        | −0.02em           | Display              |
| `heading-xl`  | 1.5 → 2rem           | 1.20        | −0.015em          | Display              |
| `heading-lg`  | 1.25 → 1.5rem        | 1.28        | −0.01em           | UI                   |
| `heading-md`  | 1.125 → 1.25rem      | 1.35        | −0.005em          | UI                   |
| `heading-sm`  | 1 → 1.0625rem        | 1.40        | 0                 | UI                   |
| `body-lg`     | 1.0625 → 1.1875rem   | 1.65        | 0                 | UI                   |
| `body`        | 0.9375 → 1rem        | 1.60        | 0                 | UI                   |
| `body-sm`     | 0.875rem             | 1.55        | 0                 | UI                   |
| `caption`     | 0.8125rem            | 1.45        | 0.005em           | UI                   |
| `overline`    | 0.75rem              | 1.30        | 0.12em, uppercase | UI                   |
| `numeric-*`   | matches body/heading | —           | —                 | Mono, `tabular-nums` |

**Measure:** prose is capped at `68ch`; the portal's long-form sections at `62ch`.

`overline` is the system's signature small element — used for section eyebrows
("INVESTOR RELATIONS", "Q3 2026 · AUDITED"), always in `fg-subtle` or `accent`.

---

## 4. Space, Size & Layout

**Base unit 4px.** Scale:
`0, 0.5(2), 1(4), 1.5(6), 2(8), 3(12), 4(16), 5(20), 6(24), 8(32), 10(40),
12(48), 16(64), 20(80), 24(96), 32(128), 40(160)`.

Section rhythm on the portal uses a separate, larger scale so vertical spacing is
consistent across sections: `section-sm 64/96`, `section 96/144`,
`section-lg 128/192` (mobile/desktop, fluid).

### Breakpoints

`xs 360` · `sm 480` · `md 768` · `lg 1024` · `xl 1280` · `2xl 1536`

Containers: `content 1200px`, `narrow 760px`, `wide 1440px`, gutters
`16/24/32/48px` by breakpoint.

**Admin responsive behaviour:** below `lg` the sidebar becomes a slide-over
drawer; data tables become stacked definition cards (not horizontally scrolling
tables — those are unusable on a phone); toolbars collapse into an overflow menu.
Every admin screen is authored and reviewed at 360px.

### Grid

12-column on the portal, 4-column at `xs`, 8 at `md`. Sections may also use an
asymmetric 5/7 split, which is the layout signature of the portal's editorial
sections.

---

## 5. Radius, Border, Elevation

**Radius:** `xs 4` · `sm 6` · `md 10` · `lg 14` · `xl 20` · `2xl 28` · `full`.
Default for cards is `lg`, controls `md`. The scale is admin-overridable in
theme settings (three presets: `sharp`, `balanced`, `soft`) rather than free-form.

**Borders:** 1px hairlines are the primary separator. `border-strong` (1px, higher
contrast) for table headers and focus containers. 2px only for focus rings.

**Elevation** — five levels, shadows **tinted with the neutral hue** rather than
pure black, and layered (a tight contact shadow + a wide ambient one):

| Level     | Use                           |
| --------- | ----------------------------- |
| `flat`    | inline surfaces, table rows   |
| `raised`  | cards                         |
| `overlay` | dropdowns, popovers, tooltips |
| `modal`   | dialogs, drawers              |
| `top`     | toasts, command palette       |

In dark mode, elevation is expressed primarily by **surface lightness**, with
shadows reduced — shadows barely read on a dark canvas, and stacking them looks
muddy.

**Z-index scale:** `base 0`, `raised 10`, `sticky 100`, `drawer 200`,
`overlay 300`, `modal 400`, `popover 500`, `toast 600`, `tooltip 700`. No
arbitrary z-index anywhere.

---

## 6. Motion

| Token        | Duration | Easing                     | Use                 |
| ------------ | -------- | -------------------------- | ------------------- |
| `instant`    | 80ms     | `ease-out`                 | hover, active       |
| `fast`       | 140ms    | `cubic-bezier(.2,0,0,1)`   | small state change  |
| `base`       | 220ms    | `cubic-bezier(.2,0,0,1)`   | enter/exit          |
| `slow`       | 340ms    | `cubic-bezier(.16,1,.3,1)` | drawers, modals     |
| `deliberate` | 560ms    | `cubic-bezier(.16,1,.3,1)` | hero, scroll reveal |

Rules: motion clarifies causality (where a thing came from), never decorates.
Entry animations only on first view. No parallax on text. **Everything above
`fast` is disabled under `prefers-reduced-motion: reduce`**, including the 3D
hero's camera drift — the scene holds a still composition instead.

---

## 7. The Geometric System

The Islamic identity layer. One motif, used structurally.

**Motif:** the _khatim_ eight-point star, constructed from two overlapping
squares, and its rub-el-hizb derivative. Generated as SVG from a small
parametric function (`src/ui/geometry/`), so it can be tessellated, masked and
scaled without shipping bitmaps.

Sanctioned uses:

- **Section transitions** — a hairline tessellated band, 1px strokes at
  6–10% opacity, marking the boundary between portal sections.
- **Canvas texture** — a very low-opacity (2–4%) tessellation on deep surfaces,
  giving the dark canvas depth without imagery.
- **Focus geometry** — the loading indicator is the eight-point star rotating on
  its own symmetry (45°/step), not a generic circular spinner.
- **Milestone markers** and the active-navigation indicator.
- **Empty-state illustration** — geometric line construction, never a mascot.

Forbidden: the motif as a button decoration, as a bullet point, behind body text,
or at an opacity where it competes with content.

---

## 8. Component Inventory

All components live in `src/ui`, are surface-agnostic, and are documented in a
live gallery at `/design-system` (development only).

**Primitives** — Button (`primary` `secondary` `ghost` `danger` `link`; `sm` `md`
`lg`; loading, icon-only, full-width), IconButton, Input, Textarea, Select,
Combobox, Checkbox, Radio, Switch, Slider, DatePicker, FileInput, Label, Field
(label + hint + error + required, wired for a11y), Fieldset, Badge (status
variants), Tag, Avatar, Separator, Skeleton, Spinner, Progress, Kbd, Link.

**Composites** — Card (+ Header/Body/Footer/Media), StatCard, Table (sortable,
selectable, sticky header, responsive stacking, column visibility), DataGrid
toolbar, Pagination, Tabs, Accordion, Dialog, Drawer, Popover, Tooltip,
DropdownMenu, ContextMenu, Toast/Toaster, Alert, Banner, Breadcrumb, Stepper,
Timeline, CommandPalette, FilterBar, SearchInput, Chart primitives
(axis/grid/tooltip/legend shells wrapping a headless chart layer).

**Layout** — AppShell, Sidebar (collapsible, drawer on mobile), Topbar,
PageHeader (title + eyebrow + actions + breadcrumb), Section, Container, Stack,
Inline, Grid, SplitPane, StickyAside.

**States** — EmptyState, ErrorState, ForbiddenState, LoadingState,
OfflineBanner, RealtimeStatus, NotFoundState. Each takes a title, description,
optional geometric illustration and optional action. **A screen without a
designed empty and error state is not finished.**

**Domain-flavoured** — StatusPill (investor lifecycle, with the exact palette per
state), PublicationBadge (draft/review/approved/published/archived),
ProvenanceTag (internal/reviewed/audited — always adjacent to financial figures),
PeriodLabel, MoneyValue (currency, locale, tabular numerals, negative in
`danger-fg` with parentheses), DeltaValue (± with direction colour and arrow),
DocumentVersionChip, AuditEntry, MessageBubble, NotificationItem.

---

## 9. Interaction & Accessibility Baseline

- **Focus:** a 2px `border-focus` ring with a 2px offset, visible on
  `:focus-visible` on every interactive element. Never removed.
- **Targets:** minimum 44×44px on touch, 32px on pointer-fine.
- **Keyboard:** every action reachable; dialogs trap focus and restore it;
  Escape closes; tables are arrow-navigable; the command palette is `Ctrl/⌘+K`.
- **Semantics:** correct roles and landmarks; one `h1` per page; headings never
  skip levels. Icon-only controls always have an accessible name.
- **Live regions:** toasts, realtime arrivals and validation summaries announce
  politely; destructive confirmations announce assertively.
- **Forms:** errors are announced, associated via `aria-describedby`, listed in a
  summary at the top of long forms, and never communicated by colour alone.
- **Motion & transparency:** `prefers-reduced-motion` and
  `prefers-reduced-transparency` honoured.
- **Zoom:** usable at 200% zoom and at 320px width with no horizontal scroll.
- **Target:** zero critical/serious axe violations, enforced in CI.

---

## 10. Theming & Admin Control

- Tokens are CSS custom properties on `:root`, redefined for
  `[data-theme="dark"]` and under `@media (prefers-color-scheme: dark)`.
- Theme resolution order: explicit user choice (cookie) → CMS default → system.
  The initial theme is applied by a tiny inline script before paint, so there is
  no flash.
- The CMS theme manager writes a **validated token override object**, not CSS.
  Admin-controllable: logo assets, primary/accent hue+chroma, radius preset,
  typography preset, default colour scheme, hero treatment. Anything not on that
  list is not themeable — which is what keeps a retheme from breaking contrast or
  layout. The theme editor recomputes and displays contrast ratios live and
  refuses to save a combination that fails AA.

---

## 11. Content & Tone

- Bilingual-ready from the start (`id` primary, `en` secondary): all UI strings
  are keyed, no concatenated sentences, dates and numbers formatted through
  `Intl` with an explicit locale and timezone.
- Voice: precise, respectful, unhurried. States facts and their sources. Avoids
  hype adjectives and avoids implying regulated status or guaranteed returns.
- Every financial or forward-looking section carries the standard informational
  disclaimer, sourced from CMS settings rather than hardcoded per page.
- Empty states explain _what will appear here and who provides it_, not "Nothing
  to see".
