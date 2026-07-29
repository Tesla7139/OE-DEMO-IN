"use client";

import { useState } from "react";
import { Marquee } from "@/components/primitives/Marquee";
import { customerLogos, brandInfo, type CustomerLogo } from "@/lib/site";

/**
 * One brand in the strip. Hovering (or tapping, on touch) expands the card inline
 * to the right to reveal that brand's review, sliding its neighbours aside — no
 * floating popover. Each rendered copy in the marquee keeps its own open state, so
 * only the one under the cursor expands.
 */
function LogoItem({ logo }: { logo: CustomerLogo }) {
  const [open, setOpen] = useState(false);
  const info = brandInfo[logo.name];
  const reviewer = logo.reviewer.replace(/\s*Team$/i, "");

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
          {logo.src ? (
            // eslint-disable-next-line @next/next/no-img-element -- local customer logo assets
            <img
              src={logo.src}
              alt={logo.name}
              className="max-h-12 max-w-[150px] object-contain brightness-0"
            />
          ) : (
            <span className="max-w-[170px] text-center text-[15px] font-extrabold uppercase leading-tight tracking-tight text-foreground">
              {logo.name}
            </span>
          )}
        </span>
        {info?.tier && (
          <span className="mt-2 inline-flex items-center rounded-full border border-amber-300/70 bg-gradient-to-b from-amber-50 to-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 shadow-sm">
            {info.tier}
          </span>
        )}
        {/* Country under the logo, so it reads without hovering. Same amber as the
            review card / wall of love, but lighter than the tier pill so the
            hierarchy stays logo → tier → country. */}
        {info?.country && (
          <span className="mt-1.5 text-[11px] font-semibold tracking-wide text-[#D97706]">
            {info.country}
          </span>
        )}
      </button>

      {/* inline-expanding review — slides open to the right */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-out ${
          open ? "max-w-[19rem] opacity-100" : "max-w-0 opacity-0"
        }`}
      >
        <div className="w-[19rem] border-l-2 border-border pl-4 pr-2 text-left">
          {logo.review ? (
            <p className="line-clamp-4 text-[14px] italic leading-relaxed text-foreground">
              “{logo.review}”
            </p>
          ) : (
            <p className="text-[14px] italic leading-relaxed text-muted-foreground">
              Verified Clickpost customer — review coming soon.
            </p>
          )}
          {/* no country here — it sits under the logo, which is visible at the
              same time as this panel, so repeating it would just read as a dupe. */}
          <div className="mt-2 text-[13px] font-bold text-foreground">{reviewer}</div>
        </div>
      </div>
    </div>
  );
}

export function CustomerLogos({ embedded = false }: { embedded?: boolean }) {
  const items = customerLogos.map((logo) => (
    <LogoItem key={logo.src ?? logo.name} logo={logo} />
  ));

  const Wrapper = embedded ? "div" : "section";

  return (
    <Wrapper
      aria-label="Brands working with us"
      className={embedded ? "w-full border-t border-border/60 pt-10 pb-2" : "py-12"}
    >
      {/* slow the drift while the pointer is over the strip (instead of stopping)
          so hovered cards can expand without the row sliding away */}
      <Marquee items={items} duration={70} hoverSlow={0.15} />
    </Wrapper>
  );
}
