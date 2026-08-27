# Brand strip — portable export

A self-contained copy of the hover-to-expand brand logo marquee from this landing
page, packaged so it can be dropped into a **different** project.

**Nothing in this folder is imported by the app.** It exists only to be copied out.
The live component this was derived from is
`src/components/sections/CustomerLogos.tsx` + `src/components/primitives/Marquee.tsx`,
with data in `src/lib/site.ts`.

## Contents

| Path | Goes to |
| --- | --- |
| `BrandStrip.tsx` | `src/components/BrandStrip.tsx` (or wherever components live) |
| `logos/*` | `public/customers/` |

## Usage

```tsx
import { BrandStrip } from "@/components/BrandStrip";

<BrandStrip />          // standalone section, py-12
<BrandStrip embedded /> // top border + tighter padding, for use inside another section
```

## Requirements

- React 18 or 19
- Tailwind v3.3+ or v4 (`line-clamp` is built in — no plugin needed)

No other dependencies. No design tokens, no `cn` helper, no shared lib imports.

If the logos are served from a path other than `/customers`, change the
`LOGO_BASE` constant at the top of `BrandStrip.tsx`.

## How it differs from the in-app version

Behaviour and visuals are identical; only the wiring changed so it travels.

- Marquee engine, logo card, and brand data merged into one file
- `cn()` (clsx + tailwind-merge) replaced with a plain template string
- Design tokens replaced with literal Tailwind colours — `border-border` →
  `border-neutral-200`, `text-foreground` → `text-neutral-900`,
  `text-muted-foreground` → `text-neutral-500`. The amber tier pill and the
  `#D97706` country caption are unchanged.
- `reviewText()` lookups against `src/lib/reviews.ts` resolved to literal strings,
  with embedded `\n` flattened to spaces (what the helper did at runtime)
- Dropped the `marquee-group` class — that CSS only targets the older
  `.animate-marquee` keyframe, which this rAF-driven marquee never used

## Note on the brand data

The 12 brands carry `country` captions and `tier` pills, which are specific to the
India demo. If the destination page is not the India one, remove the `country`
fields from the `BRANDS` array.
