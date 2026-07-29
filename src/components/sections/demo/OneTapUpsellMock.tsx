"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";
import type { DemoStore, DemoProduct } from "@/lib/site";
import { readableBrand, dedupeExactTitle } from "@/lib/utils";
import { DEFAULT_ADDR } from "@/lib/demo-customer";
import { DemoImg } from "./DemoImg";

const money = (n: number, currency = "INR") =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);

export function OneTapUpsellMock({ store, onComplete, onViewOrder, accentColor, addBtnRef, offerRef, onAdded }: { store: DemoStore; onComplete?: (added: DemoProduct[]) => void; onViewOrder?: () => void; accentColor?: string; addBtnRef?: React.RefObject<HTMLButtonElement | null>; offerRef?: React.RefObject<HTMLDivElement | null>; onAdded?: () => void }) {
  const brand = readableBrand(store.brandColor || accentColor);
  const currency = store.currency || "INR";
  const fmt = (n: number) => money(n, currency);
  const priced = store.products.filter((p) => (p.price ?? 0) > 0);
  // keep colour variants so there's enough variety for 3 distinct offers
  const pool = dedupeExactTitle(priced.length ? priced : store.products);
  // Up to 3 offers. Skip the first 2 products (those show as the "purchased" order
  // on the status page) so an added offer never duplicates a cart item.
  const afterCart = pool.slice(2);
  const offers = (afterCart.length ? afterCart : pool.slice(1).length ? pool.slice(1) : pool).slice(0, 3);

  const [offerIdx, setOfferIdx] = useState(0);
  const total = offers.length;
  const isLast = offerIdx >= total - 1;
  const offer = offers[offerIdx] ?? offers[0];

  // variant picker (per offer)
  const variantList =
    offer?.variants && offer.variants.length > 0
      ? offer.variants
      : offer?.variant
      ? [{ title: offer.variant, price: offer?.price ?? 0 }]
      : [];
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [showSizes, setShowSizes] = useState(false);
  const selectedVariant = variantList[selectedIdx] ?? variantList[0];
  const full = selectedVariant?.price ?? offer?.price ?? 0;
  const deal = Math.round(full * 0.5);

  const [secs, setSecs] = useState(9 * 60 + 54);
  useEffect(() => {
    const id = setInterval(() => setSecs((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, []);
  const timer = `${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, "0")}`;

  const [justAdded, setJustAdded] = useState(false);
  const addedRef = useRef<DemoProduct[]>([]); // offers the shopper accepted (charged to the order)

  const goNext = () => {
    setJustAdded(false);
    setSelectedIdx(0);
    setShowSizes(false);
    setOfferIdx((i) => i + 1);
  };
  const handleAdd = () => {
    onAdded?.();
    if (offer) {
      addedRef.current = [
        ...addedRef.current,
        { ...offer, price: deal, qty: 1, variant: selectedVariant?.title ?? offer.variant ?? "" },
      ];
    }
    setJustAdded(true);
    setTimeout(() => {
      if (!isLast) goNext();
      else onComplete?.(addedRef.current);
    }, 950);
  };
  const handleDecline = () => {
    if (!isLast) goNext();
    else onComplete?.(addedRef.current);
  };
  const declineLabel = "Skip Offer";

  return (
    <div className="mx-auto w-full bg-white">
      {/* page body */}
      <div className="lg:h-[560px] lg:overflow-y-auto lg:no-scrollbar">
        {/* confirmation header — matches order editing */}
        <div className="border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <span
              className="flex size-8 shrink-0 items-center justify-center rounded-full border-2"
              style={{ borderColor: brand, color: brand }}
            >
              <Check className="size-4" strokeWidth={3} />
            </span>
            <div>
              <div className="text-xs text-neutral-500">Confirmation #0WP59XCW8</div>
              <div className="text-lg font-bold text-neutral-900">Thank you, {DEFAULT_ADDR.first}!</div>
            </div>
          </div>
          <button onClick={onViewOrder} className="mt-2 text-[12px] font-medium text-neutral-900">
            View order confirmation &rsaquo;
          </button>
        </div>

        {/* before-you-go header */}
        <div className="border-b border-border px-6 py-2.5 text-center">
          <div className="text-[16px] font-bold text-neutral-900">{DEFAULT_ADDR.first}, before you go!</div>
          <div className="mt-1 text-[12.5px] text-neutral-600">
            Your order is confirmed but you can still add the following for a limited time{" "}
            <span className="font-bold tabular-nums text-red-500">{timer}</span>
          </div>
        </div>

        {/* offer (cycles through up to 3 distinct offers) */}
        <motion.div
          key={offerIdx}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          ref={offerRef}
          className="grid grid-cols-1 md:grid-cols-2"
        >
          {/* product image — with the urgency line on top */}
          <div className="flex flex-col items-center justify-center gap-2 bg-neutral-50 p-3">
            <p className="text-center font-serif text-[13px] font-semibold italic leading-snug text-red-500">
              Don&apos;t miss out — this offer expires when you leave this page!
            </p>
            <DemoImg src={offer?.image} alt={offer?.title ?? ""} className="h-[150px] w-full object-contain" />
          </div>

          {/* offer details */}
          <div className="flex flex-col justify-between px-5 py-4">
            <div>
              <div className="text-[12px] text-neutral-400">Offer {offerIdx + 1} of {total}</div>
              <h3 className="mt-1 text-[20px] font-bold leading-tight text-neutral-900">
                {offer?.title ?? "Add-on product"}
              </h3>
              <div className="mt-1.5 flex items-baseline gap-2">
                <span className="text-[15px] text-neutral-400 line-through">{fmt(full)}</span>
                <span className="text-[20px] font-bold text-red-500">{fmt(deal)}</span>
              </div>

              {/* interactive variant selector */}
              {variantList.length > 0 && (
                <div className="relative mt-3">
                  <button
                    onClick={() => setShowSizes((v) => !v)}
                    className="flex w-full items-center justify-between rounded-lg border px-4 py-2.5 text-[13px] text-neutral-700 transition-colors"
                    style={{ borderColor: showSizes ? brand : "#d1d5db" }}
                  >
                    <div className="text-left">
                      <div className="text-[10px] text-neutral-400">Size</div>
                      <div className="font-medium">{selectedVariant?.title} — {fmt(selectedVariant?.price ?? deal)}</div>
                    </div>
                    <ChevronDown className={`size-4 text-neutral-400 transition-transform ${showSizes ? "rotate-180" : ""}`} />
                  </button>
                  {showSizes && (
                    <div className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-lg">
                      {variantList.map((v, i) => (
                        <button
                          key={i}
                          onClick={() => { setSelectedIdx(i); setShowSizes(false); }}
                          className={`flex w-full items-center justify-between px-4 py-2.5 text-[13px] transition-colors hover:bg-neutral-50 ${i === selectedIdx ? "font-semibold" : "text-neutral-600"}`}
                          style={i === selectedIdx ? { color: brand } : undefined}
                        >
                          <span>{v.title}</span>
                          <span>{fmt(v.price)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="mt-3 space-y-1 border-t border-border pt-3 text-[13px]">
                <div className="flex justify-between text-neutral-600">
                  <span>Shipping</span>
                  <span className="font-semibold text-neutral-900">Free</span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>Taxes</span>
                  <span className="font-semibold text-neutral-900">Free</span>
                </div>
              </div>
            </div>

            <div className="mt-3 space-y-1.5">
              <button
                ref={addBtnRef}
                onClick={handleAdd}
                disabled={justAdded}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg py-3 text-[14px] font-semibold text-white shadow-md transition-all hover:brightness-125 active:scale-[0.99]"
                style={{ background: "#111827" }}
              >
                {justAdded ? (
                  <><Check className="size-4" strokeWidth={3} /> Added to your order</>
                ) : (
                  <>Add to order · {fmt(deal)}</>
                )}
              </button>
              <button
                onClick={handleDecline}
                className="w-full rounded-lg py-2 text-[13px] font-semibold transition-colors hover:bg-neutral-50"
                style={{ color: brand }}
              >
                {declineLabel}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
