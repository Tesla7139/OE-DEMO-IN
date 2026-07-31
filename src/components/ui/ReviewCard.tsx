import { Star } from "lucide-react";
import { Review } from "@/lib/reviews";
import { customerLogos, extraReviewLogos, brandInfo } from "@/lib/site";

// Brand logos, keyed by lowercase name: the strip logos + the /reviews-only extras.
const LOGOS = [
  ...customerLogos.filter((c) => c.src).map((c) => ({ name: c.name.toLowerCase(), src: c.src as string })),
  ...Object.entries(extraReviewLogos).map(([name, src]) => ({ name: name.toLowerCase(), src })),
];

/**
 * Find a logo for a review's store name — EXACT match only.
 * Loose/substring matching made different brands (e.g. "Westside" vs
 * "Westside Global") share one logo, so it looked like the same brand
 * repeated. If there's no exact logo, the card falls back to the text name.
 */
function findLogo(name: string): string | undefined {
  const n = name.toLowerCase().trim();
  return LOGOS.find((l) => l.name === n)?.src;
}

export function ReviewCard({ review }: { review: Review }) {
  const { name, date, content } = review;
  const logo = findLogo(name);
  const info = brandInfo[name];

  return (
    // Scales down so three columns still fit from 640px up, rather than the wall
    // dropping to two: padding, type and the footer all step with the breakpoint.
    <div className="w-full rounded-xl border border-black/10 bg-white p-3.5 shadow-sm transition-shadow duration-300 hover:shadow-md sm:rounded-2xl sm:p-4 lg:p-6">
      {/* 5-star rating */}
      <div className="mb-2 flex items-center gap-0.5 text-amber-400 lg:mb-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} className="size-3 fill-current stroke-current sm:size-3.5 lg:size-4" />
        ))}
      </div>

      {/* review text */}
      <p className="text-[12.5px] font-medium leading-relaxed text-black/80 sm:text-[13px] lg:text-[15px]">
        {content}
      </p>

      {/* footer: brand (logo when available), a "country · date" meta line, and an
          optional revenue-tier pill for featured brands */}
      <div className="mt-3 border-t border-black/5 pt-2.5 lg:mt-5 lg:pt-3">
        {/* stacks on the narrow 3-up cards; side by side once there's room */}
        <div className="flex flex-col gap-1.5 lg:flex-row lg:items-start lg:justify-between lg:gap-3">
          {/* brand with the country directly beneath it (left-aligned) */}
          <div className="flex flex-col items-start gap-1">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element -- local customer logo assets
              <img src={logo} alt={name} className="max-h-4 max-w-[84px] object-contain object-left brightness-0 lg:max-h-5 lg:max-w-[110px]" />
            ) : (
              <span className="text-[11.5px] font-bold text-black lg:text-[13px]">{name}</span>
            )}
            {info?.country && (
              <span className="text-[10.5px] font-semibold text-[#D97706] lg:text-[12px]">{info.country}</span>
            )}
          </div>
          {/* tier pill and date — right-aligned only once side by side */}
          <div className="flex shrink-0 flex-wrap items-center gap-1.5 lg:flex-col lg:items-end">
            {info?.tier && (
              <span className="inline-flex items-center rounded-full border border-amber-300/70 bg-gradient-to-b from-amber-50 to-amber-100 px-2 py-0.5 text-[9.5px] font-bold text-amber-700 shadow-sm lg:px-2.5 lg:text-[11.5px]">
                {info.tier}
              </span>
            )}
            <span className="text-[10.5px] font-medium text-black/40 lg:text-[12.5px]">{date}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
