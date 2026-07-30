"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Banknote,
  Check,
  ChevronDown,
  CircleCheck,
  Loader2,
  Lock,
  Smartphone,
  TriangleAlert,
} from "lucide-react";
import type { DemoProduct, DemoStore } from "@/lib/site";
import { dedupeExactTitle, readableBrand } from "@/lib/utils";
import {
  DEFAULT_ADDR,
  DEFAULT_COUNTRY,
  DEFAULT_COURIER,
  DEFAULT_EMAIL,
  DEFAULT_PHONE,
  DEFAULT_UPI,
} from "@/lib/demo-customer";
import { DemoImg } from "./DemoImg";
import { OrderDetails } from "./OrderDetails";

/**
 * COD → Prepaid: the order-status page offers a cash-on-delivery shopper an extra
 * discount to pay up front. Modelled on the live app, where the prepaid nudge sits
 * above the order and the order itself stays unpaid until they take it.
 *
 * India-specific by nature — COD is the dominant payment method here and the single
 * biggest driver of RTO, so converting it pre-dispatch is the whole point.
 */

/**
 * Unlike the other mocks this one keeps paise. The prepaid discount lands on
 * fractions (₹1,424.05 → ₹1,352.85, saving ₹71.20) and rounding it away would make
 * the "you save" line not reconcile with the totals.
 */
const money = (n: number, currency = "INR") =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

/** Whole rupees — offer prices are round, so paise would just be noise. */
const money0 = (n: number, currency = "INR") =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);

const round2 = (n: number) => Math.round(n * 100) / 100;

const PREPAID_OFF = 0.05; // extra discount for switching off COD
const CODE_OFF = 0.05; // the SAVE5 code already applied at checkout
const CODE_NAME = "SAVE5";
const OFFER_SECONDS = 50 * 60 + 39; // the remaining slice of the prepaid window
const PROCESSING_MS = 1500; // how long the "processing payment" popup holds
const CONFIRMATION = "JDTNH5Z6N"; // same order as the editing window, so they agree

/** "50 mins and 39 secs" */
function humanize(total: number) {
  const m = Math.floor(Math.max(0, total) / 60);
  const s = Math.max(0, total) % 60;
  return `${m} mins and ${String(s).padStart(2, "0")} secs`;
}

function Row({
  label,
  value,
  sub,
  strong,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  sub?: React.ReactNode;
  strong?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <div>
        <div className={strong ? "text-[15px] font-bold text-neutral-900" : "text-[13.5px] text-neutral-600"}>
          {label}
        </div>
        {sub && <div className="mt-0.5 text-[12px] text-neutral-400">{sub}</div>}
      </div>
      <div className={strong ? "text-[15px] font-bold text-neutral-900" : "text-[13.5px] text-neutral-700"}>
        {value}
      </div>
    </div>
  );
}

/** Read-only variant picker — the live page shows a select even with one option. */
function VariantSelect({ label }: { label: string }) {
  return (
    <div className="relative">
      <div className="rounded-lg border border-border px-3 py-2 pr-8">
        <div className="text-[10.5px] leading-none text-neutral-400">Variant</div>
        <div className="mt-1 truncate text-[12.5px] font-medium text-neutral-800">{label}</div>
      </div>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
    </div>
  );
}

/**
 * An offer card. `layout="tile"` is the horizontal "Too good to miss !" scroller;
 * `layout="wide"` is the single "You may also like this product" block.
 *
 * The action is a single "Add · ₹x" button rather than a quantity stepper — one tap
 * puts it on the order, matching the cross-sell row in the order-editing window.
 */
function OfferCard({
  product,
  brand,
  currency,
  layout,
}: {
  product: DemoProduct;
  brand: string;
  currency: string;
  layout: "tile" | "wide";
}) {
  const [added, setAdded] = useState(false);
  const variantLabel = product.variants?.[0]?.title || product.variant || product.title;
  // post-purchase offers run at half price, same convention as ThankYouProducts
  const deal = Math.max(1, Math.round(product.price * 0.5));
  const fmt = (n: number) => money0(n, currency);

  const priceRow = (
    <div className="flex items-baseline gap-2">
      <span className="text-[13px] text-neutral-400 line-through">{fmt(product.price)}</span>
      <span className="text-[14px] font-bold text-emerald-700">{fmt(deal)}</span>
    </div>
  );

  const addBtn = (
    <button
      onClick={() => setAdded(true)}
      className="w-full rounded-lg py-2.5 text-[13px] font-bold text-white transition-all hover:brightness-110 active:scale-[0.99]"
      style={{ background: added ? "#15803d" : brand }}
    >
      {added ? (
        <span className="inline-flex items-center gap-1.5">
          <Check className="size-3.5" strokeWidth={3} /> Added
        </span>
      ) : (
        `Add · ${fmt(deal)}`
      )}
    </button>
  );

  if (layout === "wide") {
    return (
      <div className="rounded-xl border border-border p-4">
        <div className="flex gap-4">
          <div className="size-[104px] shrink-0 overflow-hidden rounded-lg border border-border">
            <DemoImg src={product.image} alt={product.title} className="size-full object-cover" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="text-[14px] font-bold leading-snug text-neutral-900">{product.title}</div>
            {priceRow}
            <VariantSelect label={variantLabel} />
            {addBtn}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-[190px] shrink-0 flex-col gap-2.5 rounded-xl border border-border p-3">
      <div className="aspect-square w-full overflow-hidden rounded-lg border border-border">
        <DemoImg src={product.image} alt={product.title} className="size-full object-cover" />
      </div>
      <div className="line-clamp-2 min-h-[2.5em] text-[13px] font-semibold leading-snug text-neutral-900">
        {product.title}
      </div>
      {priceRow}
      <VariantSelect label={variantLabel} />
      {addBtn}
    </div>
  );
}

export function CodToPrepaidMock({
  store,
  tourRefs,
  onPaid,
}: {
  store: DemoStore;
  tourRefs?: {
    offerCard?: React.RefObject<HTMLDivElement | null>;
    payBtn?: React.RefObject<HTMLButtonElement | null>;
  };
  onPaid?: () => void;
}) {
  const brand = readableBrand(store.brandColor);
  const currency = store.currency || "INR";
  const fmt = (n: number) => money(n, currency);

  const priced = store.products.filter((p) => (p.price ?? 0) > 0);
  const product = priced[0] ?? store.products[0];
  const subtotal = product?.price ?? 1499;

  // Offers exclude whatever is already in the order; colour/size variants are kept
  // so the scroller has enough cards, exactly like the live page.
  const offers = dedupeExactTitle(priced.length ? priced : store.products).filter(
    (p) => p.id !== product?.id
  );
  const tiles = offers.slice(0, 4);
  const alsoLike = offers[0];
  const codeDiscount = round2(subtotal * CODE_OFF);
  const codTotal = round2(subtotal - codeDiscount);
  const prepaidTotal = round2(codTotal * (1 - PREPAID_OFF));
  const prepaidSaving = round2(codTotal - prepaidTotal);

  const [paid, setPaid] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [left, setLeft] = useState(OFFER_SECONDS);

  // Counts down from mount, so SSR and first client render agree (no Date.now).
  useEffect(() => {
    if (paid) return;
    const id = setInterval(() => setLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [paid]);

  // Hold the processing popup, then settle.
  useEffect(() => {
    if (!processing) return;
    const t = setTimeout(() => {
      setProcessing(false);
      setPaid(true);
      onPaid?.();
    }, PROCESSING_MS);
    return () => clearTimeout(t);
    // onPaid identity must not restart the timer mid-payment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [processing]);

  const pay = () => {
    if (paid || processing) return;
    setProcessing(true);
  };

  return (
    <div className="flex flex-col gap-4 bg-neutral-50 p-4 lg:p-5">
      {/* ---------- order confirmed: the thank-you line leads the page ---------- */}
      <div className="flex items-center gap-3 rounded-xl border border-border bg-white p-4">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-emerald-600">
          <Check className="size-4 text-emerald-700" strokeWidth={3} />
        </span>
        <div className="min-w-0">
          <div className="text-[12px] text-neutral-500">Confirmation #{CONFIRMATION}</div>
          <div className="text-[17px] font-bold leading-tight text-neutral-900">
            Thank you, {DEFAULT_ADDR.first}!
          </div>
        </div>
      </div>

      {/* ---------- the prepaid nudge (or its paid confirmation) ---------- */}
      <div
        ref={tourRefs?.offerCard}
        className="relative overflow-hidden rounded-2xl border border-border bg-white p-4 shadow-soft-sm lg:p-5"
      >
        {/* processing popup — sits over the card while the payment goes through */}
        <AnimatePresence>
          {processing && (
            <motion.div
              key="processing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 z-20 flex items-center justify-center bg-white/80 backdrop-blur-sm"
            >
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-white px-7 py-6 shadow-[0_18px_44px_-14px_rgba(15,15,25,0.34)]">
                <Loader2 className="size-7 animate-spin" style={{ color: brand }} />
                <div className="text-[14px] font-bold text-neutral-900">Processing payment…</div>
                <div className="text-[12.5px] text-neutral-500">Please don&apos;t close this window</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence mode="wait" initial={false}>
          {!paid ? (
            <motion.div
              key="offer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16 }}
            >
              {/* expiry strip */}
              <div className="flex items-center gap-2.5 rounded-xl bg-[#fdf6ec] px-3.5 py-3">
                <TriangleAlert className="size-4 shrink-0 text-neutral-500" />
                <span className="text-[13.5px] text-neutral-700">
                  Offer expires in{" "}
                  <span className="font-bold text-[#c2410c]">{humanize(left)}</span>
                </span>
              </div>

              <h3 className="mt-4 text-[16px] font-bold text-neutral-900">Pay now &amp; save extra!</h3>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-neutral-500">
                Switch to prepaid and enjoy an exclusive discount on your order.
              </p>

              {/* the incentive */}
              <div className="mt-3.5 flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3.5 py-3">
                <CircleCheck className="size-4 shrink-0 text-emerald-600" />
                <span className="text-[13.5px] font-semibold text-emerald-900">
                  EXTRA {Math.round(PREPAID_OFF * 100)}% OFF on prepaid
                </span>
              </div>

              {/* old vs new total */}
              <div className="mt-3.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <div className="flex items-baseline gap-2.5">
                  <span className="text-[14px] text-neutral-400 line-through">{fmt(codTotal)}</span>
                  <span className="text-[16px] font-bold text-neutral-900">{fmt(prepaidTotal)}</span>
                </div>
                <span className="text-[14px] font-bold text-emerald-700">
                  You save {fmt(prepaidSaving)}
                </span>
              </div>

              <button
                ref={tourRefs?.payBtn}
                onClick={pay}
                disabled={processing}
                className="mt-4 w-full rounded-xl py-3.5 text-[14px] font-bold text-white transition-all hover:brightness-110 active:scale-[0.99] disabled:opacity-70"
                style={{ background: brand }}
              >
                Pay Now &amp; Get {Math.round(PREPAID_OFF * 100)}% Off
              </button>

              <div className="mt-3 flex items-center justify-center gap-2 text-[12.5px] text-neutral-500">
                <Lock className="size-3.5" />
                Secure payment via Shopify Checkout
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="paid"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              className="text-center"
            >
              <div className="mx-auto flex size-11 items-center justify-center rounded-full bg-emerald-100">
                <Check className="size-6 text-emerald-700" strokeWidth={3} />
              </div>
              <h3 className="mt-3 text-[16px] font-bold text-neutral-900">Payment successful</h3>
              <p className="mt-1.5 text-[13.5px] text-neutral-500">
                {fmt(prepaidTotal)} paid. Now prepaid.
              </p>
              <div className="mt-3.5 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-[13px] font-bold text-emerald-800">
                <CircleCheck className="size-3.5" />
                You saved {fmt(prepaidSaving)}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ---------- order header ---------- */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-[20px] font-bold leading-tight text-neutral-900">Order 57600</h2>
          <p className="mt-0.5 text-[13px] text-neutral-500">Confirmed today</p>
        </div>
        <button className="shrink-0 rounded-lg border border-border bg-white px-4 py-2 text-[13px] font-semibold text-neutral-700 transition-colors hover:bg-neutral-50">
          Buy again
        </button>
      </div>

      {/* ---------- payment state ---------- */}
      <div className="rounded-xl border border-border bg-white p-4">
        <div className="text-[15px] font-bold text-neutral-900">
          {fmt(paid ? prepaidTotal : codTotal)} {currency}
        </div>
        <p className="mt-1 text-[13px] leading-relaxed text-neutral-500">
          {paid
            ? "Payment received. This order is fully paid and moves straight to fulfillment."
            : "This order has a pending payment. The balance will be updated when payment is received."}
        </p>
      </div>

      {/* ---------- "Too good to miss !" offer scroller ---------- */}
      {tiles.length > 0 && (
        <div className="rounded-xl border border-border bg-white p-4 lg:p-5">
          <h3 className="text-[16px] font-bold text-neutral-900">Too good to miss !</h3>
          <div className="mt-3.5 flex gap-3 overflow-x-auto pb-2">
            {tiles.map((p) => (
              <OfferCard key={p.id} product={p} brand={brand} currency={currency} layout="tile" />
            ))}
          </div>
        </div>
      )}

      {/* ---------- order summary ---------- */}
      <div className="rounded-xl border border-border bg-white p-4 lg:p-5">
        <div className="flex items-center gap-3">
          <div className="relative size-12 shrink-0 overflow-hidden rounded-lg border border-border">
            <DemoImg src={product?.image} alt={product?.title ?? "Item"} className="size-full object-cover" />
            <span className="absolute -right-1 -top-1 flex size-4.5 items-center justify-center rounded-full bg-neutral-900 px-1 text-[10px] font-bold text-white">
              1
            </span>
          </div>
          <div className="min-w-0 flex-1 text-[14px] font-semibold text-neutral-900">
            {product?.title ?? "Item"}
          </div>
          <div className="text-[14px] font-semibold text-neutral-900">{fmt(subtotal)}</div>
        </div>

        <div className="mt-4 border-t border-border pt-3">
          <Row label="Subtotal" value={fmt(subtotal)} />
          <Row label="Order discount" sub={CODE_NAME} value={`-${fmt(codeDiscount)}`} />
          <Row label="Shipping" value="Free" />
          {paid && (
            <Row label={`Prepaid discount (${Math.round(PREPAID_OFF * 100)}%)`} value={`-${fmt(prepaidSaving)}`} />
          )}
          <div className="mt-1 border-t border-border pt-2">
            <Row
              strong
              label="Total"
              value={
                <span>
                  <span className="mr-1.5 text-[12px] font-medium text-neutral-400">{currency}</span>
                  {fmt(paid ? prepaidTotal : codTotal)}
                </span>
              }
            />
            <div className="text-[12px] text-neutral-400">Including {fmt(0)} GST</div>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 border-t border-border pt-3 text-[13px] font-bold text-neutral-900">
          <Banknote className="size-4 text-neutral-400" />
          TOTAL SAVINGS {fmt(paid ? codeDiscount + prepaidSaving : codeDiscount)}
        </div>
      </div>

      {/* ---------- "You may also like this product" ---------- */}
      {alsoLike && (
        <div className="rounded-xl border border-border bg-white p-4 lg:p-5">
          <h3 className="text-[16px] font-bold text-neutral-900">You may also like this product</h3>
          <div className="mt-3.5">
            <OfferCard product={alsoLike} brand={brand} currency={currency} layout="wide" />
          </div>
        </div>
      )}

      {/* ---------- contact / addresses / payment method ---------- */}
      <OrderDetails
        addr={DEFAULT_ADDR}
        email={DEFAULT_EMAIL}
        phone={DEFAULT_PHONE}
        country={DEFAULT_COUNTRY}
        amount={`${fmt(paid ? prepaidTotal : codTotal)} ${currency}`}
        paymentIcon={paid ? Smartphone : Banknote}
        paymentLabel={
          paid
            ? `UPI · ${DEFAULT_UPI} · ${fmt(prepaidTotal)} ${currency}`
            : `Cash on Delivery (COD) · ${fmt(codTotal)} ${currency}`
        }
        shippingMethod={`${DEFAULT_COURIER} (${paid ? "Prepaid" : "COD"})`}
      />
    </div>
  );
}
