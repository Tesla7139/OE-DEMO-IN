"use client";

/**
 * BrandStrip — self-contained hover-to-expand logo marquee.
 *
 * Portable copy of the brand strip from the OE demo landing page. Everything it
 * needs lives in this one file: the marquee engine, the logo card, and the brand
 * data. No design tokens, no `cn`, no shared lib imports — only React + Tailwind.
 *
 * To use:
 *   1. Drop this file in (e.g. src/components/BrandStrip.tsx)
 *   2. Copy the logo PNG/SVGs into public/customers/ (see LOGO_BASE below)
 *   3. <BrandStrip />
 */

import { useEffect, useRef, useState } from "react";

/** Where the logo files live, relative to the site root. */
const LOGO_BASE = "/customers";

type Brand = {
  file?: string; // logo image; when omitted the brand renders as a styled wordmark
  name: string;
  reviewer: string;
  review: string | null;
  tier?: string; // pill under the logo, e.g. "8-figure brand"
  country?: string; // small caption under the logo
};

const BRANDS: Brand[] = [
  {
    file: "curlwarehouse.png",
    name: "Curl Warehouse",
    reviewer: "Curl Warehouse",
    review:
      "This has reduced the number of emails we receive to update orders. It's easy to use and set up, and the developers have been very receptive to changes.",
    tier: "7-figure brand",
    country: "Canada",
  },
  {
    file: "mateina.png",
    name: "Mateina",
    reviewer: "Mateina",
    review:
      "One of the best order editing apps available that actually works! I've tested about a dozen, and this was by far one of the best. Amazing team and support.",
    tier: "Andrew Huberman's favourite",
    country: "Canada",
  },
  {
    file: "renuebyscience.svg",
    name: "Renue By Science",
    reviewer: "Renue By Science",
    review:
      "The team at Clickpost are exceptional developers and great people. They listen to feedback and have built genuinely useful tools for Shopify stores.",
    country: "USA",
  },
  {
    file: "doonails.svg",
    name: "Doonails",
    reviewer: "Doonails",
    review: "Really helped us quickly to fix all issues.",
    tier: "$100M+ brand",
    country: "Germany",
  },
  {
    file: "modomu.png",
    name: "Modomu",
    reviewer: "Modomu",
    review:
      "Really happy with Clickpost so far. We added it mainly for order edits but ended up using the upsell part too, which brought in a bit of extra revenue.",
    country: "India",
  },
  {
    file: "hautesauce.png",
    name: "Haute Sauce",
    reviewer: "Haute Sauce",
    review:
      "Installed Clickpost recently and it works great. Customers can edit their orders and even add extra items, which is a nice bonus.",
    country: "India",
  },
  {
    file: "westside.png",
    name: "Westside Global",
    reviewer: "Westside Global",
    review:
      "We just installed Clickpost a few days ago and honestly it's been a very smooth experience. Setup was way easier than I expected and everything worked right out of the box. The order editing feature is exactly what we needed since customers always want to change something after checkout. Smit helped us get everything configured and answered our questions super fast.",
    country: "India",
  },
  {
    file: "myborosil.png",
    name: "MyBorosil",
    reviewer: "MyBorosil",
    review:
      "Order editing app by clickpost is easy to install with a super responsive support team. It has reduced our support tickets. It has just made our life easier. Was very easy to setup on them. Loving it!",
    country: "India",
  },
  {
    file: "wellbeingnutrition.png",
    name: "Wellbeing Nutrition",
    reviewer: "Wellbeing Nutrition",
    review:
      "Clickpost order editing has made our post purchase process so much better. Customers can now edit their orders without contacting support. Their upsells are a cherry on the top, and have increased our AOV. Real value for money, and absolutely great support from the team.",
    country: "India",
  },
  {
    file: "marsbyghc.png",
    name: "Mars By GHC",
    reviewer: "Mars By GHC",
    review:
      "We’ve been using Clickpost and it’s genuinely been super helpful. Customers can handle order edits themselves, and the post-purchase upsells have been a solid bonus for incremental revenue. Setup was straightforward, everything’s been running smoothly, and support has been great too — the team was quick to respond and got us up and running fast.",
    tier: "7-figure brand",
    country: "India",
  },
  {
    file: "vanillapura.png",
    name: "VanillaPura",
    reviewer: "VanillaPura",
    review:
      "Great experience and fantastic support from the ClickPost team with my questions. Our top customer service requests are for order edits, so this immediately cut support tickets making it easy to quantify the ROI. A lot of customization features and various upsell tools are included in the app that I can implement to increase AOV as well. I highly recommend it.",
    tier: "7-figure brand",
    country: "Utah, USA",
  },
  {
    file: "gharsoaps.png",
    name: "GHAR SOAPS",
    reviewer: "GHAR SOAPS",
    review:
      "Clickpost been a great upgrade for our store. Customers can log in, check their info, and manage everything easily, which has made the whole experience feel smoother and more professional.",
    tier: "8-figure brand",
    country: "UAE",
  },
];

/* ------------------------------------------------------------------ */
/* Marquee                                                             */
/* ------------------------------------------------------------------ */

/**
 * Infinite horizontal marquee. Renders arbitrary nodes twice and scrolls the
 * track left, wrapping seamlessly. Driven by requestAnimationFrame (not a CSS
 * keyframe) so the speed can ease smoothly — hovering can either fully pause
 * (default) or slow to a fraction of full speed via `hoverSlow`.
 */
function Marquee({
  items,
  duration = 32,
  className = "",
  paused = false,
  reverse = false,
  hoverSlow,
}: {
  items: React.ReactNode[];
  /** seconds for one full loop at full speed */
  duration?: number;
  className?: string;
  /** hard-stop the scroll */
  paused?: boolean;
  reverse?: boolean;
  /** 0..1 — on hover, ease to this fraction of full speed instead of stopping. */
  hoverSlow?: number;
}) {
  // Repeat the items enough to overflow wide viewports, then duplicate that
  // group so wrapping by one half-width loops seamlessly with no visible gap.
  const reps = Math.max(2, Math.ceil(16 / Math.max(items.length, 1)));
  const half = Array.from({ length: reps }, () => items).flat();
  const track = [...half, ...half];

  const trackRef = useRef<HTMLDivElement>(null);
  const offset = useRef(0); // px scrolled, kept in [0, halfWidth)
  const speed = useRef(0); // px/s, eased toward target each frame
  const [hover, setHover] = useState(false);

  // live config the rAF loop reads without needing to restart
  const cfg = useRef({ duration, paused, reverse, hoverSlow, hover });
  cfg.current = { duration, paused, reverse, hoverSlow, hover };

  useEffect(() => {
    let raf = 0;
    let last = 0;
    const step = (t: number) => {
      const dt = last ? Math.min(0.05, (t - last) / 1000) : 0; // clamp tab-away gaps
      last = t;
      const el = trackRef.current;
      if (el) {
        const halfW = el.scrollWidth / 2 || 1;
        const c = cfg.current;
        const base = halfW / Math.max(1, c.duration); // full-speed px/s
        let target = base;
        if (c.paused) target = 0;
        else if (c.hover) target = c.hoverSlow != null ? base * c.hoverSlow : 0;
        // ease current speed toward the target for a smooth slow-down / speed-up
        speed.current += (target - speed.current) * Math.min(1, dt * 6);
        let o = offset.current + speed.current * dt * (c.reverse ? -1 : 1);
        o = ((o % halfW) + halfW) % halfW; // wrap both directions
        offset.current = o;
        el.style.transform = `translateX(${-o}px)`;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      className={`relative w-full overflow-hidden ${className}`}
      style={
        {
          maskImage:
            "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
        } as React.CSSProperties
      }
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div
        ref={trackRef}
        className="flex w-max shrink-0 items-center gap-8 pr-8"
        style={{ willChange: "transform" }}
      >
        {track.map((item, i) => (
          <div key={i} aria-hidden={i >= half.length} className="shrink-0">
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Logo card                                                           */
/* ------------------------------------------------------------------ */

/**
 * One brand in the strip. Hovering (or tapping, on touch) expands the card inline
 * to the right to reveal that brand's review, sliding its neighbours aside — no
 * floating popover. Each rendered copy in the marquee keeps its own open state, so
 * only the one under the cursor expands.
 */
function LogoItem({ brand }: { brand: Brand }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="group flex items-center gap-4"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {/* logo + affordance */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex shrink-0 flex-col items-center"
      >
        <span className="flex h-16 w-44 items-center justify-center transition-transform duration-300 group-hover:-translate-y-0.5">
          {brand.file ? (
            // eslint-disable-next-line @next/next/no-img-element -- local logo assets
            <img
              src={`${LOGO_BASE}/${brand.file}`}
              alt={brand.name}
              className="max-h-12 max-w-[150px] object-contain brightness-0"
            />
          ) : (
            <span className="max-w-[170px] text-center text-[15px] font-extrabold uppercase leading-tight tracking-tight text-neutral-900">
              {brand.name}
            </span>
          )}
        </span>
        {brand.tier && (
          <span className="mt-2 inline-flex items-center rounded-full border border-amber-300/70 bg-gradient-to-b from-amber-50 to-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 shadow-sm">
            {brand.tier}
          </span>
        )}
        {/* Country under the logo, so it reads without hovering. Lighter than the
            tier pill so the hierarchy stays logo → tier → country. */}
        {brand.country && (
          <span className="mt-1.5 text-[11px] font-semibold tracking-wide text-[#D97706]">
            {brand.country}
          </span>
        )}
      </button>

      {/* inline-expanding review — slides open to the right */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-out ${
          open ? "max-w-[19rem] opacity-100" : "max-w-0 opacity-0"
        }`}
      >
        <div className="w-[19rem] border-l-2 border-neutral-200 pl-4 pr-2 text-left">
          {brand.review ? (
            <p className="line-clamp-4 text-[14px] italic leading-relaxed text-neutral-900">
              &ldquo;{brand.review}&rdquo;
            </p>
          ) : (
            <p className="text-[14px] italic leading-relaxed text-neutral-500">
              Verified Clickpost customer — review coming soon.
            </p>
          )}
          <div className="mt-2 text-[13px] font-bold text-neutral-900">
            {brand.reviewer}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Public component                                                    */
/* ------------------------------------------------------------------ */

export function BrandStrip({ embedded = false }: { embedded?: boolean }) {
  const items = BRANDS.map((brand) => (
    <LogoItem key={brand.file ?? brand.name} brand={brand} />
  ));

  const Wrapper = embedded ? "div" : "section";

  return (
    <Wrapper
      aria-label="Brands working with us"
      className={
        embedded ? "w-full border-t border-neutral-200 pt-10 pb-2" : "py-12"
      }
    >
      {/* slow the drift while the pointer is over the strip (instead of stopping)
          so hovered cards can expand without the row sliding away */}
      <Marquee items={items} duration={70} hoverSlow={0.15} />
    </Wrapper>
  );
}

export default BrandStrip;
