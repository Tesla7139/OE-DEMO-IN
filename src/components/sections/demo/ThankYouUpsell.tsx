"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import type { DemoStore, DemoProduct } from "@/lib/site";
import { TooGoodToMiss } from "./TooGoodToMiss";
import { DemoImg } from "./DemoImg";

const money = (n: number, currency = "INR") =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);

function Img({ src, className }: { src?: string | null; className: string }) {
  return <DemoImg src={src} className={className} />;
}

/** Product card whose "Add to order" button becomes a −1+ stepper once added. */
function AddCard({
  p, brand, currency, onAdd, btnRef,
}: {
  p: DemoProduct;
  brand: string;
  currency: string;
  onAdd: (p: DemoProduct, discounted: boolean) => void;
  btnRef?: React.RefObject<HTMLButtonElement | null>;
}) {
  const [qty, setQty] = useState(0);
  const fmt = (n: number) => money(n, currency);
  const add = () => { onAdd(p, false); setQty((q) => q + 1); };
  return (
    <div className="flex w-40 shrink-0 flex-col rounded-xl border border-border p-3">
      <div className="aspect-square w-full overflow-hidden rounded-lg bg-neutral-50">
        <Img src={p.image} className="size-full object-cover" />
      </div>
      <div className="mt-2 line-clamp-2 text-[12.5px] font-medium leading-tight" style={{ color: brand, minHeight: "2.5em" }}>{p.title}</div>
      <div className="mt-1 text-[13px] font-bold text-neutral-900">{fmt(p.price)}</div>
      {qty === 0 ? (
        <button
          ref={btnRef}
          onClick={add}
          className="mt-2.5 w-full rounded-md py-2 text-[13px] font-semibold text-white transition-all hover:brightness-110"
          style={{ background: brand }}
        >
          Add to order
        </button>
      ) : (
        <div className="mt-2.5 flex items-center justify-between rounded-md" style={{ border: `1.5px solid ${brand}` }}>
          <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="flex size-8 items-center justify-center text-[18px] font-bold leading-none" style={{ color: brand }} aria-label="Decrease">−</button>
          <span className="text-[13px] font-bold text-neutral-900">{qty}</span>
          <button onClick={add} className="flex size-8 items-center justify-center text-[18px] font-bold leading-none" style={{ color: brand }} aria-label="Increase">+</button>
        </div>
      )}
    </div>
  );
}

/**
 * Order-status page upsell: an "Add More Items" carousel (qty + Add + Explore all)
 * plus a single discounted "Too good to miss!" featured deal.
 */
export function ThankYouUpsell({
  store,
  brand,
  products,
  onAdd,
  gridRef,
  addBtnRef,
  subtotal,
  freeShipAt,
  shipBoxRef,
  shipAddBtnRef,
}: {
  store: DemoStore;
  brand: string;
  products: DemoProduct[];
  onAdd: (p: DemoProduct, discounted: boolean) => void;
  gridRef?: React.RefObject<HTMLDivElement | null>;
  addBtnRef?: React.RefObject<HTMLButtonElement | null>;
  subtotal?: number;
  freeShipAt?: number;
  shipBoxRef?: React.RefObject<HTMLDivElement | null>;
  shipAddBtnRef?: React.RefObject<HTMLButtonElement | null>;
}) {
  const fmt = (n: number) => money(n, store.currency || "INR");
  const featured = products[products.length - 1] ?? products[0];

  const showShipBar = typeof subtotal === "number" && typeof freeShipAt === "number" && freeShipAt > 0;
  const remaining = showShipBar ? Math.max(0, freeShipAt! - subtotal!) : 0;
  const unlocked = showShipBar && remaining <= 0;
  const progress = showShipBar ? Math.min(1, subtotal! / freeShipAt!) : 0;

  // split the pool so the "best sellers" (shipping box) and "add more" use different products
  const pool = products.length > 1 ? products.slice(0, -1) : products; // keep `featured` for the deal
  const half = Math.max(1, Math.ceil(pool.length / 2));
  const bestSellers = pool.slice(0, half);
  const moreItems = pool.slice(half).length ? pool.slice(half) : pool;

  const currency = store.currency || "INR";

  return (
    <div className="flex flex-col gap-4">
      {/* Shipping box — best sellers to unlock free shipping */}
      {showShipBar && (
        <div ref={shipBoxRef} className="rounded-xl border border-border p-4">
          <h4 className="text-[15px] font-bold text-neutral-900">
            {unlocked ? "You've unlocked free shipping!" : "Unlock free shipping by adding best sellers."}
          </h4>
          <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-neutral-200">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progress * 100}%`, background: unlocked ? "#16a34a" : "#111827" }}
            />
          </div>
          <p className="mt-2 text-[13.5px] text-neutral-600">
            {unlocked ? (
              <span className="font-semibold text-emerald-600">Free shipping applied to your order.</span>
            ) : (
              <>
                <span className="font-bold text-neutral-900">{fmt(remaining)}</span> away from free shipping.
              </>
            )}
          </p>
          <div className="mt-4 -mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
            {bestSellers.map((p, i) => (
              <AddCard key={i} p={p} brand={brand} currency={currency} onAdd={onAdd} btnRef={i === 0 ? shipAddBtnRef : undefined} />
            ))}
          </div>
        </div>
      )}

      {/* Add More Items — separate section, different products */}
      <div ref={gridRef} className="rounded-xl border border-border p-4">
        <div className="mb-3 flex items-center gap-2">
          <Plus className="size-4 text-neutral-500" />
          <h4 className="text-[15px] font-bold text-neutral-900">Add More Items</h4>
        </div>
        <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
          {moreItems.map((p, i) => (
            <AddCard key={i} p={p} brand={brand} currency={currency} onAdd={onAdd} btnRef={i === 0 ? addBtnRef : undefined} />
          ))}
        </div>
        <button
          onClick={() => moreItems[0] && onAdd(moreItems[0], false)}
          className="mt-3 w-full rounded-md py-2.5 text-[13px] font-semibold text-white transition-all hover:brightness-110"
          style={{ background: brand }}
        >
          Explore all products
        </button>
      </div>

      {/* Too good to miss! */}
      {featured && <TooGoodToMiss store={store} brand={brand} product={featured} onAdd={(p) => onAdd(p, true)} />}
    </div>
  );
}
