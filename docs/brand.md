# Brand & Visual Identity

Source of truth for colors, logo usage, and feel of the product.

## Positioning

Professional sports-tech / analytics CRM for the long-term development of a
snooker player. Dark, premium, calm, data-driven. **Not** an arcade game,
**not** a betting app, **not** a scoreboard utility, **not** a fantasy-sports
dashboard.

The product should feel:
- professional
- coach-grade
- analytical
- long-term
- premium
- calm
- focused on player development

## Logo

- Horizontal logo: `apps/web/public/logo.png` (snooker-table icon + wordmark).
- Square icon: `apps/web/public/icon.png` (table icon on dark background).
- Always render on the primary dark background `#0E1116`.
- Minimum clear space around the logo ≈ height of the “S” in the wordmark.
- Never recolor the logo. Never stretch.
- The gold dot of “OS” in the wordmark uses Championship Gold `#C8A45D`.

## Core palette

| Token | HEX | Use |
| --- | --- | --- |
| Obsidian Black | `#0E1116` | Primary background, app shell |
| Deep Slate | `#161B22` | Cards, sidebar, modals |
| Graphite Panel | `#1F2630` | Hover, nested blocks, tables |
| Snooker Cloth Green | `#0E6B4D` | Primary brand, primary buttons, active nav, table renderer outline |
| Emerald Signal | `#19A974` | Accents, progress, success metrics, AI recommendations |
| Championship Gold | `#C8A45D` | Personal bests, high breaks, achievements, premium markers, logo accent |
| Warm Ivory | `#E9E6DF` | Primary text |
| Muted Silver | `#A8B0B8` | Secondary text |
| Slate Gray | `#6F7A86` | Disabled, secondary metadata |
| Controlled Red | `#D65A5A` | Errors, injury/fatigue risk, form decline |
| Amber Focus | `#D89A3A` | Warnings, instability, low-confidence AI |
| Tactical Blue | `#4A90E2` | Info, neutral AI insights |
| Border Subtle | `#2A323D` | Default card border |
| Border Active | `#19A974` | Active/selected card border |

## Tailwind tokens

Mapped in `apps/web/tailwind.config.js`:

```
bg-background-primary       #0E1116
bg-background-secondary     #161B22
bg-background-elevated      #1F2630

text-text-primary           #E9E6DF
text-text-secondary         #A8B0B8
text-text-disabled          #6F7A86

bg-brand-primary            #0E6B4D
bg-brand-accent             #19A974
text-brand-gold             #C8A45D

text-state-error            #D65A5A
text-state-warning          #D89A3A
text-state-info             #4A90E2

border-border-subtle        #2A323D
border-border-active        #19A974
```

CSS variables (also defined globally in `apps/web/src/app/globals.css`) match
these tokens 1:1 so non-Tailwind contexts (e.g. Konva renderer, charts) can
read them via `getComputedStyle`.

## Usage rules

### Primary Green `#0E6B4D`
Primary buttons, active nav item, selected tabs, snooker table outline,
progress indicators, important interactive controls.

### Emerald Accent `#19A974`
Positive trends, AI recommendations, success states, completed drills,
improvement markers, hover glow.
**Do not** use as large block background — it would over-brighten the UI.

### Championship Gold `#C8A45D`
Personal best, high break, century break, tournament achievement,
premium feature marker, important milestone, logo accent.
**Never** competes with green as the dominant accent. Gold = status.

### Red `#D65A5A` — only for real problems
Injury/fatigue risk, negative trend, missed goals, repeated technical error,
failed drill target, form decline.

### Amber `#D89A3A` — soft warnings only
Unstable form, high training load, possible fatigue, low-confidence AI
output (insufficient data).

## Charts

- Dark background.
- Muted grid lines (`#2A323D`).
- Only key data series rendered in saturated brand colors.
- Trend deltas: positive → emerald, negative → controlled red, neutral → silver.

## Table renderer

- Cushion / outline: primary green `#0E6B4D`.
- Cloth fill (when rendered): slightly darker green derived from primary,
  visually distinct from card surfaces.
- Aim lines / target zones: emerald accent.
- Ball semantic colors: `ball.*` tokens.

## What to avoid

- Pure white text (`#FFFFFF`). Use Warm Ivory.
- Saturated neon colors.
- Glow that competes with the table renderer.
- Combining red + amber + green as equal-priority chart series.
