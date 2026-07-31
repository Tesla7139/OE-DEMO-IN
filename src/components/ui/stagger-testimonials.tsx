"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { customerLogos, brandInfo } from "@/lib/site";
import { reviews } from "@/lib/reviews";

const SQRT_5000 = Math.sqrt(5000);

// Real review dates from the Shopify export, keyed by store name ("JUNE 9, 2026" -> "Jun 9, 2026").
function fmtDate(d: string): string {
  const m = d.match(/^([A-Za-z]+)\s+(\d+),\s*(\d{4})$/);
  if (!m) return d;
  return `${m[1][0].toUpperCase()}${m[1].slice(1, 3).toLowerCase()} ${m[2]}, ${m[3]}`;
}
const DATE_BY_NAME = new Map(reviews.map((r) => [r.name.toLowerCase(), fmtDate(r.date)]));

// Real Clickpost reviews only (the ones that have a written review + brand logo).
const REVIEWS = customerLogos
  .filter((c) => c.review)
  .map((c, i) => ({ tempId: i, name: c.name, review: c.review as string, src: c.src, date: DATE_BY_NAME.get(c.name.toLowerCase()), info: brandInfo[c.name] }));


interface TestimonialCardProps {
  position: number;
  review: (typeof REVIEWS)[number];
  handleMove: (steps: number) => void;
  cardSize: number;
}

const TestimonialCard: React.FC<TestimonialCardProps> = ({ position, review, handleMove, cardSize }) => {
  const isCenter = position === 0;

  return (
    <div
      onClick={() => handleMove(position)}
      className={cn(
        // flex column: the card is a fixed square, so the quote has to be the part
        // that gives — otherwise a long review runs straight through the footer.
        "absolute left-1/2 top-1/2 flex cursor-pointer flex-col border-2 p-8 transition-all duration-[350ms] ease-in-out",
        isCenter
          ? "z-10 border-[#a8c8ff] text-foreground"
          : "z-0 border-border bg-card text-card-foreground hover:border-primary/50"
      )}
      style={{
        width: cardSize,
        height: cardSize,
        // center card uses page-1's light-blue backdrop
        background: isCenter ? "linear-gradient(160deg, #eaf2ff 0%, #cfe0ff 55%, #bcd6ff 100%)" : undefined,
        clipPath: "polygon(50px 0%, calc(100% - 50px) 0%, 100% 50px, 100% 100%, calc(100% - 50px) 100%, 50px 100%, 0 100%, 0 0)",
        transform: `
          translate(-50%, -50%)
          translateX(${(cardSize / 1.5) * position}px)
          translateY(${isCenter ? -65 : position % 2 ? 15 : -15}px)
          rotate(${isCenter ? 0 : position % 2 ? 2.5 : -2.5}deg)
        `,
        boxShadow: isCenter ? "0px 8px 0px 4px var(--border)" : "0px 0px 0px 0px transparent",
      }}
    >
      <span
        className="absolute block origin-top-right rotate-45 bg-border"
        style={{ right: -2, top: 48, width: SQRT_5000, height: 2 }}
      />

      {/* brand logo (image or styled wordmark) + 5-star rating */}
      <div className="mb-4 flex items-center justify-between gap-3">
        {review.src ? (
          // eslint-disable-next-line @next/next/no-img-element -- local customer logo assets
          <img
            src={review.src}
            alt={review.name}
            className="max-h-8 max-w-[150px] object-contain brightness-0"
          />
        ) : (
          <span
            className="max-w-[195px] text-[15px] font-extrabold uppercase leading-tight tracking-tight text-foreground"
          >
            {review.name}
          </span>
        )}
        <div className="flex shrink-0 items-center gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className="size-3.5 fill-amber-400 text-amber-400" />
          ))}
        </div>
      </div>

      {/* The quote takes the leftover space and clamps inside it, so it can never
          reach the footer. min-h-0 lets it actually shrink inside the flex column. */}
      <h3 className="line-clamp-[7] min-h-0 flex-1 overflow-hidden text-[14px] font-medium leading-snug text-foreground sm:line-clamp-[11] sm:text-[15.5px]">
        &ldquo;{review.review}&rdquo;
      </h3>

      <div className={cn(
        "mt-auto pt-4 text-[13px]",
        isCenter ? "text-neutral-600" : "text-muted-foreground"
      )}>
        <div className="flex items-baseline justify-between gap-2 font-semibold">
          <span className="truncate">
            {review.name}
            {review.info?.country && (
              <span className="font-semibold text-[#D97706]"> · {review.info.country}</span>
            )}
          </span>
          {review.date && <span className="shrink-0">{review.date}</span>}
        </div>
        {review.info?.tier && (
          <span className="mt-1.5 inline-flex items-center rounded-full border border-amber-300/70 bg-gradient-to-b from-amber-50 to-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 shadow-sm">
            {review.info.tier}
          </span>
        )}
      </div>
    </div>
  );
};

export const StaggerTestimonials: React.FC = () => {
  const [cardSize, setCardSize] = useState(440);
  const [list, setList] = useState(REVIEWS);

  const handleMove = useCallback((steps: number) => {
    setList((prev) => {
      const newList = [...prev];
      if (steps > 0) {
        for (let i = steps; i > 0; i--) {
          const item = newList.shift();
          if (!item) return prev;
          newList.push({ ...item, tempId: Math.random() });
        }
      } else {
        for (let i = steps; i < 0; i++) {
          const item = newList.pop();
          if (!item) return prev;
          newList.unshift({ ...item, tempId: Math.random() });
        }
      }
      return newList;
    });
  }, []);

  // auto-scroll — always running (never pauses on hover), in the same stagger animation
  useEffect(() => {
    const id = setInterval(() => handleMove(1), 2200);
    return () => clearInterval(id);
  }, [handleMove]);

  useEffect(() => {
    const updateSize = () => {
      const { matches } = window.matchMedia("(min-width: 640px)");
      setCardSize(matches ? 440 : 330);
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  return (
    <div className="relative w-full overflow-hidden" style={{ height: 720 }}>
      {list.map((review, index) => {
        const position = list.length % 2
          ? index - (list.length + 1) / 2
          : index - list.length / 2;
        return (
          <TestimonialCard
            key={review.tempId}
            review={review}
            handleMove={handleMove}
            position={position}
            cardSize={cardSize}
          />
        );
      })}
    </div>
  );
};
