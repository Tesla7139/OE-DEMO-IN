# Reviews — portable export

The review **content** from this landing page, packaged so it can be reused
elsewhere. No component code — just the data.

**Nothing in this folder is imported by the app.** It exists only to be copied out.
The live source is `src/lib/reviews.ts`; the sections that render it are
`src/app/reviews/page.tsx` (the wall), `src/components/sections/WallOfLoveTeaser.tsx`,
and `src/components/ui/stagger-testimonials.tsx`.

## Contents

| File | What it is |
| --- | --- |
| `reviews.ts` | Byte-identical copy of `src/lib/reviews.ts` — a drop-in TS module |
| `reviews.md` | The same 51 reviews as plain markdown, for a CMS or a doc |

`reviews.ts` has **zero imports**, so it works in any TS project as-is:

```ts
import { reviews, type Review } from "@/lib/reviews";
```

## Shape

```ts
export interface Review {
  id: string;
  name: string;      // store name, exactly as it appears on the App Store
  date: string;      // e.g. "JUNE 9, 2026"
  rating: number;
  content: string;
  color: "orange" | "blue" | "green" | "white";
  font: "serif" | "sans";
  logoType: "circle" | "square" | "badge" | null;
}
```

Only `name`, `date`, and `content` carry real information. In this codebase
`rating` is 5 on every entry, `logoType` is `null` on every entry, and `color` is
reassigned at render time by the consuming component — so a new consumer can
ignore all three, or drop them from the type.

## Things to know before reusing

- **51 reviews, not 52.** Copy in this repo says 52 in three places
  (`/reviews` subheading, the nav, and `MAX_REVIEWS_COUNT`). Don't inherit that
  number — count the array.
- **Six entries contain literal `\n`** in `content` (Pinacolada, Westside Global,
  Burnt Toast, Mars By GHC, World of Asaya, French Accent). Rendered into a `<p>`
  as a plain string they show up as visible `\n` characters. Either flatten them
  (`content.replace(/\s*\n\s*/g, " ")`, which is what `reviews.md` did) or render
  with `whitespace-pre-line`.
- **Text is verbatim**, typos included ("alot of of our support tickets",
  "Clickpost been a great upgrade"). These are merchants' own words — edit only
  with a deliberate decision to.
- **Support reps are named** in 11 reviews (Smit ×7, Mohit ×5).
- `name` values must match the `brandInfo` keys in `src/lib/site.ts` for the
  country/tier badges to resolve. If you copy `brandInfo` too, note that 10 brands
  there have no country set.
