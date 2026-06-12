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
- Always render on the primary dark background `#18212C`.
- Minimum clear space around the logo ≈ height of the “S” in the wordmark.
- Never recolor the logo. Never stretch.
- The gold dot of “OS” in the wordmark uses Championship Gold `#C8A45D`.

## Core palette

| Token | HEX | Use |
| --- | --- | --- |
| Slate Night | `#18212C` | Primary background, app shell |
| Deep Slate | `#222D3A` | Cards, sidebar, modals |
| Graphite Panel | `#2D3A49` | Hover, nested blocks, tables |
| Snooker Cloth Green | `#12815C` | Primary brand, primary buttons, active nav, table renderer outline |
| Emerald Signal | `#1FBE8A` | Accents, progress, success metrics, AI recommendations |
| Championship Gold | `#D3B16C` | Personal bests, high breaks, achievements, premium markers, logo accent |
| Warm Ivory | `#F1EFE9` | Primary text |
| Muted Silver | `#BDC6D0` | Secondary text |
| Slate Gray | `#8694A2` | Disabled, secondary metadata |
| Controlled Red | `#E16969` | Errors, injury/fatigue risk, form decline |
| Amber Focus | `#E3A84F` | Warnings, instability, low-confidence AI |
| Tactical Blue | `#59A7F0` | Info, neutral AI insights |
| Border Subtle | `#3D4A59` | Default card border |
| Border Active | `#1FBE8A` | Active/selected card border |

> Rebalanced 2026-06-12: the original near-black ladder (`#0E1116`/`#161B22`)
> read as too dark; every neutral moved ~2 steps up in lightness toward a
> slate-graphite tone, and both greens gained luminosity so the UI feels like a
> modern sports-development platform while staying dark and calm.

## Tailwind tokens

Mapped in `apps/web/tailwind.config.js`:

```
bg-background-sunken        #111821
bg-background-primary       #18212C
bg-background-secondary     #222D3A
bg-background-elevated      #2D3A49
bg-background-raised        #394858

text-text-primary           #F1EFE9
text-text-secondary         #BDC6D0
text-text-disabled          #8694A2

bg-brand-primary            #12815C
bg-brand-accent             #1FBE8A
text-brand-gold             #D3B16C

text-state-success          #43C078
text-state-error            #E16969
text-state-warning          #E3A84F
text-state-info             #59A7F0

border-border-subtle        #3D4A59
border-border-active        #1FBE8A
```

CSS variables (also defined globally in `apps/web/src/app/globals.css`) match
these tokens 1:1 so non-Tailwind contexts (e.g. Konva renderer, charts) can
read them via `getComputedStyle`.

## Usage rules

### Primary Green `#12815C`
Primary buttons, active nav item, selected tabs, snooker table outline,
progress indicators, important interactive controls.

### Emerald Accent `#1FBE8A`
Positive trends, AI recommendations, success states, completed drills,
improvement markers, hover glow.
**Do not** use as large block background — it would over-brighten the UI.

### Championship Gold `#D3B16C`
Personal best, high break, century break, tournament achievement,
premium feature marker, important milestone, logo accent.
**Never** competes with green as the dominant accent. Gold = status.

### Red `#E16969` — only for real problems
Injury/fatigue risk, negative trend, missed goals, repeated technical error,
failed drill target, form decline.

### Amber `#E3A84F` — soft warnings only
Unstable form, high training load, possible fatigue, low-confidence AI
output (insufficient data).

## Charts

- Dark background.
- Muted grid lines (`#3D4A59`).
- Only key data series rendered in saturated brand colors.
- Trend deltas: positive → emerald, negative → controlled red, neutral → silver.

## Table renderer

- Cushion / outline: primary green `#12815C`.
- Cloth fill (when rendered): slightly darker green derived from primary,
  visually distinct from card surfaces.
- Aim lines / target zones: emerald accent.
- Ball semantic colors: `ball.*` tokens.

## What to avoid

- Pure white text (`#FFFFFF`). Use Warm Ivory.
- Saturated neon colors.
- Glow that competes with the table renderer.
- Combining red + amber + green as equal-priority chart series.
