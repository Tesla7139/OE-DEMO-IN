"use client";

import { Check } from "lucide-react";
import type { DemoStore, DemoProduct } from "@/lib/site";
import { DEFAULT_ADDR } from "@/lib/demo-customer";
import { DemoImg } from "./DemoImg";

const money = (n: number, currency = "INR") =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);

function ProductImg({ src, alt }: { src?: string | null; alt: string }) {
  return <DemoImg src={src} alt={alt} className="size-full object-cover" />;
}

/**
 * The cross-sell product row.
 * - `layout="row"`: compact horizontal scroller shown inside the editing window.
 * - `layout="page"`: thank-you / order-status page with the products brought to the TOP.
 */
export function ThankYouProducts({
  store,
  brand,
  products,
  onAdd,
  layout = "row",
  gridRef,
  addBtnRef,
}: {
  store: DemoStore;
  brand: string;
  products: DemoProduct[];
  onAdd: (p: DemoProduct) => void;
  layout?: "row" | "page";
  gridRef?: React.RefObject<HTMLDivElement | null>;
  addBtnRef?: React.RefObject<HTMLButtonElement | null>;
}) {
  const fmt = (n: number) => money(n, store.currency || "INR");
  const deal = (n: number) => Math.max(1, Math.round(n * 0.5)); // post-purchase offer = 50% off

  if (layout === "page") {
    return (
      <div className="mx-auto w-full max-w-3xl overflow-hidden rounded-2xl border border-border bg-white shadow-soft-xl">
        {/* products brought to the top */}
        <div ref={gridRef} className="border-b border-border p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[15px] font-bold text-neutral-900">Complete your order</h3>
            <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">
              Recommended for you
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {products.map((p, i) => (
              <div key={i} className="flex flex-col rounded-xl border border-border p-2.5">
                <div className="aspect-square w-full overflow-hidden rounded-lg border border-border bg-neutral-50">
                  <ProductImg src={p.image} alt={p.title} />
                </div>
                <div className="mt-2 line-clamp-2 text-[12.5px] font-medium leading-tight text-neutral-800" style={{ minHeight: "2.5em" }}>{p.title}</div>
                <div className="mt-0.5 flex items-baseline gap-1.5 text-xs">
                  <span className="text-neutral-400 line-through">{fmt(p.price)}</span>
                  <span className="font-bold text-emerald-600">{fmt(deal(p.price))}</span>
                </div>
                <button
                  ref={i === 0 ? addBtnRef : undefined}
                  onClick={() => onAdd(p)}
                  className="mt-2 w-full rounded-md py-1.5 text-xs font-semibold text-white transition-all hover:brightness-110"
                  style={{ background: brand }}
                >
                  Add · {fmt(deal(p.price))}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* thank-you confirmation below the products */}
        <div className="flex items-center gap-3 p-5">
          <span
            className="flex size-8 shrink-0 items-center justify-center rounded-full border-2"
            style={{ borderColor: brand, color: brand }}
          >
            <Check className="size-4" strokeWidth={3} />
          </span>
          <div>
            <div className="text-xs text-neutral-500">Order #JDTNH5Z6N confirmed</div>
            <div className="text-[15px] font-bold text-neutral-900">Thank you, {DEFAULT_ADDR.first}!</div>
          </div>
        </div>
      </div>
    );
  }

  // row layout (in-editing cross-sell)
  return (
    <div ref={gridRef} className="rounded-xl border border-border p-3">
      <h4 className="mb-2 text-sm font-bold text-neutral-900">You may also like these products</h4>
      <div className="-mx-1 flex items-stretch gap-3 overflow-x-auto px-1 pb-1">
        {products.map((p, i) => (
          <div key={i} className="flex w-28 shrink-0 flex-col">
            <div className="aspect-square w-full overflow-hidden rounded-lg border border-border bg-neutral-50">
              <ProductImg src={p.image} alt={p.title} />
            </div>
            <div className="mt-1.5 line-clamp-2 text-xs font-medium leading-tight text-neutral-800" style={{ minHeight: "2.5em" }}>{p.title}</div>
            <div className="mt-0.5 flex items-baseline gap-1 text-xs">
              <span className="text-neutral-400 line-through">{fmt(p.price)}</span>
              <span className="font-bold text-emerald-600">{fmt(deal(p.price))}</span>
            </div>
            <button
              ref={i === 0 ? addBtnRef : undefined}
              onClick={() => onAdd(p)}
              className="mt-1.5 w-full rounded-md py-1.5 text-xs font-semibold text-white"
              style={{ background: brand }}
            >
              Add · {fmt(deal(p.price))}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
