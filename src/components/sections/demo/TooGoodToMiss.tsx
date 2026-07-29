"use client";

import type { DemoStore, DemoProduct } from "@/lib/site";
import { DemoImg } from "./DemoImg";

const money = (n: number, currency = "INR") =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);

/** A single discounted "Too good to miss!" featured deal. */
export function TooGoodToMiss({
  store,
  brand,
  product,
  onAdd,
}: {
  store: DemoStore;
  brand: string;
  product: DemoProduct;
  onAdd: (p: DemoProduct) => void;
}) {
  const fmt = (n: number) => money(n, store.currency || "INR");
  const deal = Math.max(1, Math.round(product.price * 0.5));

  return (
    <div className="rounded-xl border border-border p-4">
      <h4 className="mb-3 text-[15px] font-bold text-neutral-900">Too good to miss!</h4>
      <div className="flex gap-4">
        <div className="relative size-24 shrink-0 overflow-hidden rounded-lg bg-neutral-50">
          <span className="absolute left-1 top-1 z-10 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-500">50% OFF</span>
          <DemoImg src={product.image} className="size-full object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-semibold text-neutral-900">{product.title}</div>
          <div className="mt-0.5 flex items-baseline gap-2">
            <span className="text-[13px] text-neutral-400 line-through">{fmt(product.price)}</span>
            <span className="text-[15px] font-bold text-emerald-600">{fmt(deal)}</span>
          </div>
          <div className="mt-2 flex items-stretch gap-2">
            <div className="flex w-24 items-center justify-between rounded-lg border border-border px-1.5 py-1">
              <span className="flex size-6 items-center justify-center rounded text-neutral-400">−</span>
              <span className="text-[13px] font-medium text-neutral-800">1</span>
              <span className="flex size-6 items-center justify-center rounded text-neutral-400">+</span>
            </div>
            <button
              onClick={() => onAdd(product)}
              className="min-w-0 flex-1 rounded-md py-2 text-[13px] font-semibold text-white transition-all hover:brightness-110"
              style={{ background: brand }}
            >
              Add · {fmt(deal)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
