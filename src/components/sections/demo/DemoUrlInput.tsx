"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useAnimationControls } from "framer-motion";
import { ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function DemoUrlInput({
  url,
  setUrl,
  onSubmit,
  loading,
  align = "left",
  shake = 0,
}: {
  url: string;
  setUrl: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
  align?: "left" | "center";
  /** bump this counter to shake + focus the input (e.g. from the "Product Tour" nav link) */
  shake?: number;
}) {
  const controls = useAnimationControls();
  const inputRef = useRef<HTMLInputElement>(null);
  const [highlight, setHighlight] = useState(false);

  useEffect(() => {
    if (shake <= 0) return;
    inputRef.current?.focus({ preventScroll: false });
    controls.start({
      x: [0, -12, 12, -10, 10, -6, 6, 0],
      transition: { duration: 0.55, ease: "easeInOut" },
    });
    setHighlight(true);
    const t = setTimeout(() => setHighlight(false), 1800);
    return () => clearTimeout(t);
  }, [shake, controls]);

  return (
    <div className={cn("w-full", align === "center" && "mx-auto max-w-xl")}>
      <form onSubmit={onSubmit} className="w-full">
        <label htmlFor="store-url" className="sr-only">
          Your store URL
        </label>
        <motion.div
          animate={controls}
          className={cn(
            "group relative flex w-full items-center rounded-full border bg-white/95 p-2 shadow-[0_10px_40px_-12px_rgba(15,15,25,0.18)] backdrop-blur-xl transition-all",
            highlight
              ? "border-red-400 ring-4 ring-red-500/25 shadow-[0_14px_50px_-12px_rgba(239,68,68,0.4)]"
              : "border-border/60 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/30 focus-within:shadow-[0_14px_50px_-12px_rgba(47,91,255,0.3)]"
          )}
        >
          <input
            id="store-url"
            ref={inputRef}
            type="text"
            inputMode="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter your store URL"
            className="h-10 flex-1 bg-transparent pl-4 pr-2 text-[0.85rem] text-foreground placeholder:text-muted-foreground/70 outline-none focus:!outline-none focus-visible:!outline-none [&:focus-visible]:!outline-none lg:h-14 lg:pl-6 lg:text-[1.05rem]"
            style={{ outline: "none", boxShadow: "none" }}
          />
          <button
            type="submit"
            disabled={loading}
            aria-busy={loading}
            className="flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-primary px-3.5 text-[0.8rem] font-semibold text-primary-foreground shadow-md transition-all hover:bg-primary/90 active:scale-95 disabled:opacity-70 lg:h-14 lg:gap-2 lg:px-7 lg:text-[1rem]"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span className="max-lg:hidden">Generating</span>
              </>
            ) : (
              <>
                <span className="max-lg:hidden">See it live</span>
                <ArrowRight className="size-4" />
              </>
            )}
          </button>
        </motion.div>
      </form>
    </div>
  );
}
