"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Play } from "lucide-react";
import { reviews } from "@/lib/reviews";
import { APP_STORE_REVIEWS_URL, brandInfo } from "@/lib/site";

// Customer proof: the logo wall, then one merchant at a time — their photo (or
// case-study video) beside their verbatim App Store review, quoted exactly as written.

/**
 * `meta` is the brand's tier where brandInfo records one, otherwise its country.
 * `photo` is from the brand's own storefront; `focus` keeps its subject in the crop.
 * `stats` only carry figures the brand published (their review / case study).
 */
type Testimonial = {
  brand: string;
  logo: string;
  photo?: string;
  focus?: string;
  video?: { id: string; title: string; poster: string };
  meta?: string;
  date: string;
  content: string;
  stats?: { value: string; label: string }[];
};

const fromStore = (id: string) => reviews.find((r) => r.id === id)?.content ?? "";

const TESTIMONIALS: Testimonial[] = [
  {
    brand: "Miraggio",
    logo: "/customers/miraggio.png",
    // poster is a frame from the video itself (YouTube's auto-generated maxres1.jpg)
    video: { id: "8EKDWd7T-J0", title: "Miraggio Cut RTO 9% and Escalations 15% in 6 months", poster: "/customers/photos/miraggio-video.jpg" },
    meta: brandInfo["MIRAGGIO"]?.tier,
    date: "May 2026",
    content: fromStore("2199769"),
  },
  {
    brand: "Sotrue",
    logo: "/customers/sotrue.png",
    photo: "/customers/photos/sotrue.jpg",
    focus: "15% 50%",
    meta: "India",
    date: "August 2026",
    content:
      "Our experience so far with this app has been very great, It has given us great results and have helped us to improve our RTO rates. Bandwidth of customer team is also leived since customers are now editing their information without having the need to reach to support.\nGreat product overall.",
  },
  {
    brand: "World of Asaya",
    logo: "/customers/worldofasaya.png",
    photo: "/customers/photos/worldofasaya-model.jpg",
    focus: "50% 35%",
    meta: brandInfo["World of Asaya"]?.country,
    date: "December 2025",
    content: fromStore("2006909"),
    stats: [{ value: "25%", label: "lower RTO" }],
  },
  {
    brand: "Pairie Tales",
    logo: "/customers/pairietales.png",
    photo: "/customers/photos/pairietales.jpg",
    focus: "75% 50%",
    date: "May 2026",
    content: fromStore("2211429"),
  },
  {
    brand: "The Bear House",
    logo: "/customers/thebearhouse.svg",
    photo: "/customers/photos/thebearhouse.jpg",
    focus: "50% 40%",
    meta: brandInfo["bearhouseindia"]?.country,
    date: "June 2026",
    content: fromStore("2236534"),
  },
];

const LOGOS = [
  { name: "Frido", src: "/customers/frido.svg" },
  { name: "Libas", src: "/customers/libas.png", scale: 1.5 }, // the file has wide padding
  { name: "The Bear House", src: "/customers/thebearhouse.svg" },
  { name: "Miraggio", src: "/customers/miraggio.png" },
  { name: "Recode", src: "/customers/recodestudios.png" },
  { name: "Wellwith", src: "/customers/wellwith.png" },
];

/**
 * The brand's photo — or, for a brand with a case-study video, its YouTube
 * thumbnail that turns into the player when clicked (nothing loads from YouTube
 * before that). Published results are pinned over the lower edge until it plays.
 */
function Media({ t }: { t: Testimonial }) {
  const [playing, setPlaying] = useState(false);
  return (
    <div className={`relative ${t.stats ? "pb-7" : ""}`}>
      <div className={`${t.video ? "aspect-video" : "aspect-[4/3]"} relative overflow-hidden rounded-2xl bg-neutral-100 shadow-[0_24px_48px_-24px_rgba(30,50,120,0.35)]`}>
        {t.video && playing ? (
          <iframe
            className="absolute inset-0 size-full"
            src={`https://www.youtube-nocookie.com/embed/${t.video.id}?autoplay=1&rel=0`}
            title={t.video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : t.video ? (
          <button type="button" onClick={() => setPlaying(true)} className="group absolute inset-0" aria-label={`Play: ${t.video.title}`}>
            {/* eslint-disable-next-line @next/next/no-img-element -- local video frame */}
            <img src={t.video.poster} alt="" className="size-full object-cover" />
            <span className="absolute left-1/2 top-1/2 flex size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-lg transition-transform group-hover:scale-105">
              <Play className="ml-0.5 size-4 fill-neutral-900 text-neutral-900" />
            </span>
          </button>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- local brand photo
          <img src={t.photo} alt={t.brand} className="size-full object-cover" style={{ objectPosition: t.focus }} />
        )}
      </div>
      {t.stats && !playing && (
        <div className="absolute bottom-0 left-4 flex gap-3">
          {t.stats.map((s) => (
            <div key={s.label} className="w-32 overflow-hidden rounded-xl bg-white shadow-lg">
              <div className="px-3 pb-1.5 pt-2 text-[22px] font-bold leading-none tracking-tight text-neutral-950">{s.value}</div>
              <div className="bg-[#3b5bfd] px-3 py-1.5 text-[11px] font-semibold text-white">{s.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Spotlight() {
  const [[i, dir], setPos] = useState<[number, number]>([0, 1]);
  const [expanded, setExpanded] = useState(false);
  const go = (d: number) => {
    setExpanded(false);
    setPos(([cur]) => [(cur + d + TESTIMONIALS.length) % TESTIMONIALS.length, d]);
  };
  const t = TESTIMONIALS[i];
  const long = t.content.length > 320;

  return (
    <div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={i}
          initial={{ opacity: 0, x: dir * 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: dir * -16 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="grid gap-8 @2xl:grid-cols-[1fr_1.1fr] @2xl:items-center"
        >
          <Media t={t} />
          <blockquote>
            {/* oversized open-quote, as on the landing page's customer quote */}
            <div aria-hidden className="h-9 select-none font-serif text-[72px] font-bold leading-[0.9] text-[#b8c4ff]">&ldquo;</div>
            <p className={`mt-2 whitespace-pre-line text-[16.5px] leading-[1.65] text-neutral-900 ${long && !expanded ? "line-clamp-6" : ""}`}>
              {t.content}
            </p>
            {long && (
              <button type="button" onClick={() => setExpanded((v) => !v)} className="mt-1 text-[12px] text-neutral-500 underline underline-offset-4 hover:text-neutral-900">
                {expanded ? "Less" : "More"}
              </button>
            )}
            <footer className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- local customer logo */}
              <img src={t.logo} alt={t.brand} className="h-6 w-auto max-w-[120px] object-contain brightness-0" />
              <span className="text-[12.5px] text-slate-500">{[t.meta, t.date].filter(Boolean).join(" · ")}</span>
            </footer>
          </blockquote>
        </motion.div>
      </AnimatePresence>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <a
          href={APP_STORE_REVIEWS_URL}
          target="_blank"
          rel="noreferrer"
          className="group inline-flex items-center gap-2 text-[12.5px] font-semibold uppercase tracking-[0.12em] text-[#3b5bfd]"
        >
          <span className="underline decoration-[1.5px] underline-offset-[5px]">Read on Shopify</span>
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </a>
        <div className="flex items-center gap-2">
          {[{ d: -1, Icon: ArrowLeft, label: "Previous review" }, { d: 1, Icon: ArrowRight, label: "Next review" }].map(({ d, Icon, label }) => (
            <button
              key={d}
              type="button"
              onClick={() => go(d)}
              aria-label={label}
              className="flex size-8 items-center justify-center rounded-full text-neutral-700 ring-1 ring-neutral-200 transition-colors hover:bg-neutral-900 hover:text-white hover:ring-neutral-900"
            >
              <Icon className="size-3.5" />
            </button>
          ))}
          <span className="ml-1 text-[12px] tabular-nums text-neutral-400">{i + 1} / {TESTIMONIALS.length}</span>
        </div>
      </div>
    </div>
  );
}

/** Merchant proof — customer logos, then brand photo + App Store review — inside the demo window. */
export function TestimonialsMock({ maxHeight = 560 }: { maxHeight?: number }) {
  return (
    <div className="@container no-scrollbar overflow-y-auto bg-white" style={{ maxHeight }}>
      <div className="space-y-8 p-6 @2xl:p-8">
        {/* logo strip — one row on wide windows, wraps to 3 × 2 on narrow ones */}
        <section className="border-b border-neutral-100 pb-8">
          <h3 className="text-center text-[22px] font-semibold tracking-tight text-neutral-950">Trusted by leading Indian brands</h3>
          <div className="mt-5 grid grid-cols-3 items-center gap-x-6 gap-y-6 @2xl:grid-cols-6">
            {LOGOS.map((l) => (
              <div key={l.name} className="flex h-7 items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element -- local customer logo */}
                <img
                  src={l.src}
                  alt={l.name}
                  className="max-h-6 max-w-[96px] object-contain"
                  style={l.scale ? { transform: `scale(${l.scale})`, transformOrigin: "center" } : undefined}
                />
              </div>
            ))}
          </div>
        </section>

        <Spotlight />
      </div>
    </div>
  );
}
