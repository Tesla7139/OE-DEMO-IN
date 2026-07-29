"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  ChevronDown,
  Loader2,
  Pencil,
  Tag,
  Trash2,
  TriangleAlert,
  Truck,
  UserRound,
  MapPin,
  X,
} from "lucide-react";
import type { DemoStore, DemoProduct } from "@/lib/site";
import { COUNTRIES, countryByName, lookupPostal } from "@/lib/regions";
import {
  type Addr,
  DEFAULT_ADDR,
  DEFAULT_COUNTRY,
  DEFAULT_EMAIL,
  DEFAULT_PHONE,
  VERIFIED_ADDR,
} from "@/lib/demo-customer";
import { readableBrand, dedupeByTitle, dedupeExactTitle } from "@/lib/utils";
import { DemoImg } from "./DemoImg";
import { ThankYouMap } from "./ThankYouMap";
import { OrderDetails } from "./OrderDetails";
import { ThankYouProducts } from "./ThankYouProducts";
import { ThankYouUpsell } from "./ThankYouUpsell";
import { TooGoodToMiss } from "./TooGoodToMiss";

type LineItem = DemoProduct & { uid: string; postPurchase?: boolean; dealPrice?: number };

/** Price actually charged for a line item (post-purchase upsells are discounted). */
const priceOf = (i: LineItem) => (i.postPurchase && i.dealPrice != null ? i.dealPrice : i.price);
type Section = "contact" | "shipping" | "order" | "discount" | "cancel";

// The demo customer lives in @/lib/demo-customer so leaf components (ThankYouProducts,
// OneTapUpsellMock, …) can read it without importing this module back. Re-exported
// here so existing `from "./DemoMock"` importers keep working.
export type { Addr };
export { DEFAULT_EMAIL, DEFAULT_PHONE, DEFAULT_COUNTRY, DEFAULT_ADDR };

/** Address-validation mode: the shopper's address is flagged, then corrected on validate. */
const FLAGGED_ADDR: Addr = DEFAULT_ADDR;

const money = (n: number, currency = "INR") =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);

let counter = 0;
const uid = () => `li-${counter++}`;

/** Personalized recreation of the Clickpost order-editing window. */
export function DemoMock({
  store,
  initialOpen = null,
  onOpenChange,
  forceOpen,
  maxHeight,
  forceOneTap = false,
  pageContext = "thankyou",
  extraItem,
  extraItems,
  tourRefs,
  addressOverride,
  onShippingSaved,
  qtyBump,
  onOrderUpdated,
  onPaid,
  upsellFirst = false,
  onUpsellAdded,
  addressValidation = false,
  scriptedValidation = false,
}: {
  store: DemoStore;
  initialOpen?: Section | null;
  onOpenChange?: (s: Section | null) => void;
  forceOpen?: Section | null;
  maxHeight?: number;
  forceOneTap?: boolean;
  /** Which surface the editor is shown on — sets the header (thank-you vs order status). */
  pageContext?: "thankyou" | "orderstatus";
  extraItem?: DemoProduct;
  /** Post-purchase upsells added on the one-tap page — appear in the order as an unpaid balance. */
  extraItems?: DemoProduct[];
  /** Address-validation mode: shipping opens with a flagged address that validates on save. */
  addressValidation?: boolean;
  /** Use the scripted correction (guided tour) instead of a live postal lookup. */
  scriptedValidation?: boolean;
  /** External refs (owned by a parent tour controller) attached to key elements. */
  tourRefs?: {
    countdown?: React.RefObject<HTMLDivElement | null>;
    shippingRow?: React.RefObject<HTMLDivElement | null>;
    addressForm?: React.RefObject<HTMLDivElement | null>;
    addressBlock?: React.RefObject<HTMLDivElement | null>;
    saveBtn?: React.RefObject<HTMLDivElement | null>;
    addrSaveBtn?: React.RefObject<HTMLButtonElement | null>;
    orderRow?: React.RefObject<HTMLDivElement | null>;
    orderBtn?: React.RefObject<HTMLDivElement | null>;
    orderPlusBtn?: React.RefObject<HTMLButtonElement | null>;
    payPanel?: React.RefObject<HTMLDivElement | null>;
    payBtn?: React.RefObject<HTMLButtonElement | null>;
    upsellRow?: React.RefObject<HTMLDivElement | null>;
    upsellAddBtn?: React.RefObject<HTMLButtonElement | null>;
    upsellShipBox?: React.RefObject<HTMLDivElement | null>;
    upsellShipAddBtn?: React.RefObject<HTMLButtonElement | null>;
    sections?: React.RefObject<HTMLDivElement | null>;
  };
  /** Show the "You may also like" cross-sell at the TOP (thank-you page style). */
  upsellFirst?: boolean;
  /** Fired when a cross-sell item is added (so the tour can advance). */
  onUpsellAdded?: () => void;
  /** A corrected address pushed in by the guided tour; merged into the form. */
  addressOverride?: Partial<Addr>;
  /** Fired when the shipping Save button is pressed (so the tour can advance). */
  onShippingSaved?: () => void;
  /** Bump this counter to add one more of the first item (guided tour). */
  qtyBump?: number;
  /** Fired when the order Update button is pressed (so the tour can advance). */
  onOrderUpdated?: () => void;
  /** Fired when the Pay balance button is pressed (so the tour can advance). */
  onPaid?: () => void;
}) {
  const brand = readableBrand(store.brandColor);
  const fmt = (n: number) => money(n, store.currency || "INR");

  // The order starts with two distinct items (so a quantity edit can also remove one);
  // remaining products become the in-page cross-sell suggestions.
  // Only real, priced products — skip €0 / SKU-placeholder entries in the store feed.
  const priced = store.products.filter((p) => (p.price ?? 0) > 0);
  const source = priced.length ? priced : store.products;
  // cart: distinct products (base name) so it never shows the same item twice
  const usable = dedupeByTitle(source);
  const cartProducts = usable.slice(0, 2);
  const cartIds = new Set(cartProducts.map((p) => p.id));
  // cross-sell: keep colour/size variants for variety (4-5+ suggestions), minus cart
  const variety = dedupeExactTitle(source);
  const rest = variety.filter((p) => !cartIds.has(p.id));
  const upsellPool = rest.length ? rest : usable.slice(1).length ? usable.slice(1) : usable;

  const [items, setItems] = useState<LineItem[]>(() => {
    // never duplicate a cart item with an added upsell of the same title
    const cartTitles = new Set(cartProducts.map((p) => (p.title || "").toLowerCase()));
    const cleanExtras = (extraItems ?? []).filter((e) => !cartTitles.has((e.title || "").toLowerCase()));
    const all = [...cartProducts, ...(extraItem ? [extraItem] : []), ...cleanExtras];
    return all.map((p) => ({ ...p, uid: uid() }));
  });
  const [open, setOpen] = useState<Section | null>(initialOpen);
  const [addrValidated, setAddrValidated] = useState(false);
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [validating, setValidating] = useState(false);
  const zipTouched = useRef(false); // only auto-detect once the user actually edits the postal code
  const lastDetected = useRef(""); // postal code we last resolved (avoid re-firing)
  const addrFlagged = addressValidation && !addrValidated;
  const [cancelled, setCancelled] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // amount already paid at checkout — quantity bumps & in-page upsells owe the difference
  const [paid, setPaid] = useState<number>(() => {
    const all = extraItem ? [...cartProducts, extraItem] : cartProducts;
    return all.reduce((s, p) => s + p.price * p.qty, 0);
  });

  // one-tap add button ref (optional one-tap panel)
  const oneTapAddBtnRef = useRef<HTMLButtonElement>(null);

  // switches the left panel between "editing UI" and "one tap upsell UI"
  const [demoMode, setDemoMode] = useState<"edit" | "onetap">(forceOneTap ? "onetap" : "edit");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- controlled from parent
    setDemoMode(forceOneTap ? "onetap" : "edit");
  }, [forceOneTap]);

  // editable field state (sample-prefilled — this is a UI demo)
  const [email, setEmail] = useState(DEFAULT_EMAIL);
  const [phone, setPhone] = useState(DEFAULT_PHONE);
  const [addr, setAddr] = useState<Addr>(addressValidation ? FLAGGED_ADDR : DEFAULT_ADDR);
  const [discount, setDiscount] = useState("");

  // report which section is open (so an outer panel can explain it)
  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  // let an outer control (top pills / guided tour) open a section
  useEffect(() => {
    if (forceOpen === undefined) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- controlled open from parent
    setOpen(forceOpen);
  }, [forceOpen]);

  // fields the tour just auto-filled (kept highlighted so the edit is obvious)
  const [emphasis, setEmphasis] = useState<Partial<Record<keyof Addr, boolean>>>({});
  const [formEmphasis, setFormEmphasis] = useState(false); // whole-address highlight after the edit
  const [orderEmphasis, setOrderEmphasis] = useState(false); // highlight the bumped item row

  // apply a corrected address pushed in by the guided tour — typed out field by
  // field (clear, then type char by char), then highlight the whole address
  useEffect(() => {
    if (!addressOverride) return;
    const keys = Object.keys(addressOverride) as (keyof Addr)[];
    const timers: number[] = [];
    let t = 300;
    keys.forEach((k) => {
      const val = String(addressOverride[k] ?? "");
      // highlight + clear the field before retyping it
      timers.push(window.setTimeout(() => {
        setEmphasis((e) => ({ ...e, [k]: true }));
        setAddr((prev) => ({ ...prev, [k]: "" }));
      }, t));
      t += 140;
      // type the corrected value one character at a time
      for (let c = 1; c <= val.length; c++) {
        const slice = val.slice(0, c);
        timers.push(window.setTimeout(() => setAddr((prev) => ({ ...prev, [k]: slice })), t));
        t += 42;
      }
      t += 260; // pause before the next field
    });
    timers.push(window.setTimeout(() => setFormEmphasis(true), t));
    return () => timers.forEach((t) => clearTimeout(t));
  }, [addressOverride]);

  // guided tour: add one more of the first item, with a highlight
  useEffect(() => {
    if (!qtyBump) return;
    const t = window.setTimeout(() => {
      setItems((prev) => prev.map((it, i) => (i === 0 ? { ...it, qty: it.qty + 1 } : it)));
      setOrderEmphasis(true);
    }, 250);
    return () => clearTimeout(t);
  }, [qtyBump]);

  // live editing-window countdown (default 1 hour), ticking every second
  const [secondsLeft, setSecondsLeft] = useState(60 * 60 - 1);
  useEffect(() => {
    const id = setInterval(() => setSecondsLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, []);
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const countdown = `${mins} minute${mins === 1 ? "" : "s"} and ${secs
    .toString()
    .padStart(2, "0")} seconds`;

  const subtotal = useMemo(() => items.reduce((s, i) => s + priceOf(i) * i.qty, 0), [items]);
  const savings = useMemo(
    () => items.reduce((s, i) => s + (i.postPurchase && i.dealPrice != null ? (i.price - i.dealPrice) * i.qty : 0), 0),
    [items]
  );
  const due = cancelled ? 0 : Math.max(0, subtotal - paid);

  // Free-shipping threshold: set just above the starting cart, so adding one upsell
  // item unlocks it and the shipping fee is removed from the order.
  const baseSubtotal = useMemo(() => cartProducts.reduce((s, p) => s + (p.price ?? 0), 0), [cartProducts]);
  const cheapestUpsell = useMemo(() => {
    const prices = upsellPool.map((p) => p.price ?? 0).filter((n) => n > 0);
    return prices.length ? Math.min(...prices) : Math.max(499, Math.round(baseSubtotal * 0.15));
  }, [upsellPool, baseSubtotal]);
  const freeShipAt = baseSubtotal + cheapestUpsell;
  // ₹-scaled: a ₹49 floor rounded to the nearest ₹10, the way Indian D2C stores quote shipping.
  const shipFee = useMemo(() => Math.max(49, Math.round((baseSubtotal * 0.04) / 10) * 10), [baseSubtotal]);
  const freeShip = subtotal >= freeShipAt;
  const shipping = cancelled || freeShip ? 0 : shipFee;

  // in address-validation mode only the shipping section can be opened
  const toggle = (s: Section) => {
    if (addressValidation && s !== "shipping") return;
    setOpen((cur) => (cur === s ? null : s));
  };

  const flash = (msg: string) => {
    setToast(msg);
    window.clearTimeout((flash as unknown as { _t?: number })._t);
    (flash as unknown as { _t?: number })._t = window.setTimeout(() => setToast(null), 2200);
  };

  // Auto-detect city + state from the PIN code as the user types (debounced, free
  // Zippopotam lookup). Disabled during the scripted tour so it never fights the
  // guided flow; only runs after the user actually edits the PIN field, and only
  // once all 6 digits are in — partial PINs never resolve.
  useEffect(() => {
    if (scriptedValidation || !zipTouched.current) return;
    const zip = addr.zip.replace(/\s/g, "");
    if (zip.length < countryByName(country).zipLen) return;
    let cancelled = false;
    const t = window.setTimeout(async () => {
      if (cancelled || lastDetected.current === zip) return;
      const hit = await lookupPostal(country, addr.zip);
      if (cancelled || !hit || !(hit.city || hit.region)) return;
      lastDetected.current = zip;
      // auto-fill only — detecting a city from a PIN is NOT address verification,
      // so don't flip the "verified" state or show a popup.
      setAddr((a) => ({ ...a, city: hit.city || a.city, state: hit.region || a.state }));
    }, 300);
    return () => { cancelled = true; window.clearTimeout(t); };
  }, [addr.zip, country, scriptedValidation]);

  // Signature of the order (which lines + their quantities). Captured once at
  // mount so "Update your order" only confirms when something actually changed.
  const orderSig = (list: LineItem[]) => list.map((i) => `${i.uid}:${i.qty}`).sort().join("|");
  const initialOrderSig = useRef<string>("");
  useEffect(() => {
    initialOrderSig.current = orderSig(items);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setQty = (id: string, delta: number) =>
    setItems((prev) =>
      prev.map((i) => (i.uid === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i))
    );

  const removeItem = (id: string) => {
    setItems((prev) => (prev.length > 1 ? prev.filter((i) => i.uid !== id) : prev));
    flash("Item removed");
  };

  const addUpsell = (p: DemoProduct, discounted = true) => {
    const charge = discounted ? Math.max(1, Math.round(p.price * 0.5)) : p.price;
    onUpsellAdded?.();
    setProcessing("Syncing with your order…");
    window.setTimeout(() => {
      setItems((prev) => [
        ...prev,
        { ...p, uid: uid(), qty: 1, postPurchase: discounted, dealPrice: discounted ? charge : undefined },
      ]);
      setProcessing(null);
      flash(`${p.title.split(" ").slice(0, 3).join(" ")} added — ${fmt(charge)} pending`);
    }, 1300);
  };

  const payBalance = () => {
    const amount = due;
    setProcessing("Collecting payment…");
    window.setTimeout(() => {
      setPaid(subtotal);
      setProcessing(null);
      flash(`Balance paid — ${fmt(amount)} charged`);
    }, 1300);
  };

  return (
    <div className="relative w-full text-left">
      <div className="bg-white">
        <div
          className={`grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_270px] ${maxHeight ? "lg:no-scrollbar lg:h-[var(--demo-h)] lg:overflow-y-auto" : ""}`}
          style={maxHeight ? ({ "--demo-h": `${maxHeight}px` } as CSSProperties) : undefined}
        >
          {/* LEFT: confirmation + editing panel OR one-tap upsell panel */}
          <div className="border-border p-4 lg:border-r">
            {demoMode === "onetap" ? (
              <OneTapPanel store={store} brand={brand} addBtnRef={oneTapAddBtnRef} />
            ) : (
            <>
            {/* confirmation header — pinned at the very top */}
            <div className="mb-3 flex items-center gap-3">
              <span
                className="flex size-8 items-center justify-center rounded-full border-2"
                style={{ borderColor: brand, color: brand }}
              >
                <Check className="size-4" strokeWidth={3} />
              </span>
              <div>
                <div className="text-xs text-neutral-500">
                  {pageContext === "orderstatus" ? "Order #JDTNH5Z6N" : "Confirmation #JDTNH5Z6N"}
                </div>
                <div className="text-lg font-bold text-neutral-900">
                  {pageContext === "orderstatus" ? "Your order status" : `Thank you, ${DEFAULT_ADDR.first}!`}
                </div>
              </div>
            </div>
            {/* shipment tracking timeline — order status page only */}
            {pageContext === "orderstatus" && !cancelled && (
              <div className="mb-4 rounded-xl border border-border p-4">
                <div className="text-sm text-neutral-700">
                  FedEx FIC <span className="font-medium underline">JAM8470GB72670273201</span>
                </div>
                <div className="mt-3 space-y-3">
                  <div className="flex items-start gap-3">
                    <Truck className="mt-0.5 size-4 text-neutral-700" />
                    <div>
                      <div className="text-sm font-bold text-neutral-900">On its way</div>
                      <div className="text-xs text-neutral-400">18 Jun</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 pl-[3px]">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-neutral-400" />
                    <div className="pl-[7px]">
                      <div className="text-sm font-bold text-neutral-900">Confirmed</div>
                      <div className="text-xs text-neutral-400">18 Jun</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* cross-sell (thank-you page style) */}
            {upsellFirst && !cancelled && (
              <div className="mb-4">
                <ThankYouUpsell store={store} brand="#111827" products={upsellPool} onAdd={(p, discounted) => addUpsell(p, discounted)} gridRef={tourRefs?.upsellRow} addBtnRef={tourRefs?.upsellAddBtn} shipBoxRef={tourRefs?.upsellShipBox} shipAddBtnRef={tourRefs?.upsellShipAddBtn} subtotal={subtotal} freeShipAt={freeShipAt} />
              </div>
            )}

            {cancelled ? (
              <div className="rounded-xl border border-border p-6 text-center">
                <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-neutral-100">
                  <X className="size-6 text-neutral-500" />
                </div>
                <p className="font-semibold text-neutral-900">Order cancelled</p>
                <p className="mt-1 text-sm text-neutral-500">
                  A refund of {fmt(subtotal)} has been issued.
                </p>
                <button
                  onClick={() => setCancelled(false)}
                  className="mt-3 text-sm font-semibold"
                  style={{ color: brand }}
                >
                  Undo
                </button>
              </div>
            ) : (
              <div className="rounded-xl border border-border p-3">
                <h3 className="mb-2 text-base font-bold text-neutral-900">
                  Make changes to your order
                </h3>

                {/* edit window banner */}
                <div ref={tourRefs?.countdown} className="mb-3 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-neutral-700">
                  <TriangleAlert className="size-4 shrink-0 text-amber-500" />
                  <span>
                    You can make changes to order for another{" "}
                    <span className="font-semibold text-red-500 tabular-nums">{countdown}</span>
                  </span>
                </div>

                <div ref={tourRefs?.sections} className="flex flex-col gap-2">
                  <AccordionRow icon={UserRound} label="Change Contact Information" isOpen={open === "contact"} onClick={() => toggle("contact")} locked={addressValidation}>
                    <Field label="Email" value={email} onChange={setEmail} />
                    <Field label="Phone" value={phone} onChange={setPhone} />
                    <CheckboxRow brand={brand} label="Update Profile" />
                    <PrimaryButton onClick={() => { flash("Contact information updated"); setOpen(null); }}>
                      Change Contact Information
                    </PrimaryButton>
                  </AccordionRow>

                  <div ref={tourRefs?.shippingRow}>
                    <AccordionRow
                      icon={MapPin}
                      label="Edit Shipping Address"
                      isOpen={open === "shipping"}
                      onClick={() => toggle("shipping")}
                      badge={
                        addrFlagged ? (
                          <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-neutral-800 px-2.5 py-1 text-[11px] font-semibold text-white">
                            <TriangleAlert className="size-3 shrink-0" /> Address check required
                          </span>
                        ) : addrValidated ? (
                          <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-emerald-500 px-2.5 py-1 text-[11px] font-semibold text-white">
                            <Check className="size-3 shrink-0" strokeWidth={3} /> Address verified
                          </span>
                        ) : undefined
                      }
                    >
                      <div ref={tourRefs?.addressBlock} className="flex flex-col gap-2.5">
                        <div ref={tourRefs?.addressForm} className="flex flex-col gap-2.5">
                          <SelectInput
                            label="Country"
                            value={country}
                            onChange={(v) => { setCountry(v); setAddr((a) => ({ ...a, state: countryByName(v).regions[0] })); }}
                            options={COUNTRIES.map((c) => c.name)}
                            emphasize={formEmphasis}
                          />
                          <div className="grid grid-cols-2 gap-2.5">
                            <Field label="First Name" value={addr.first} onChange={(v) => setAddr({ ...addr, first: v })} emphasize={formEmphasis} />
                            <Field label="Last Name" value={addr.last} onChange={(v) => setAddr({ ...addr, last: v })} emphasize={formEmphasis} />
                          </div>
                          <Field label="Address 1" value={addr.line1} onChange={(v) => setAddr({ ...addr, line1: v })} emphasize={emphasis.line1 || formEmphasis} invalid={addrFlagged} valid={addrValidated} error={addrFlagged ? "Street address could not be fully validated. Please review." : undefined} />
                          <Field label="Address 2" value="" onChange={() => {}} />
                          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-3">
                            <Field label="City" value={addr.city} onChange={(v) => setAddr({ ...addr, city: v })} emphasize={emphasis.city || formEmphasis} invalid={addrFlagged} valid={addrValidated} />
                            <SelectInput label={countryByName(country).regionLabel} value={addr.state} onChange={(v) => setAddr({ ...addr, state: v })} options={countryByName(country).regions} emphasize={emphasis.city || formEmphasis} />
                            <Field label="PIN Code" value={addr.zip} onChange={(v) => { zipTouched.current = true; setAddr({ ...addr, zip: v }); }} emphasize={emphasis.zip || formEmphasis} invalid={addrFlagged} valid={addrValidated} error={addrFlagged ? "PIN code could not be validated." : undefined} />
                          </div>
                        </div>
                        <div ref={tourRefs?.saveBtn}>
                          <button
                            ref={tourRefs?.addrSaveBtn}
                            disabled={validating}
                            onClick={async () => {
                              if (!addrFlagged) {
                                // 2nd tap: close the section and confirm
                                setOpen(null); flash("Shipping address updated"); onShippingSaved?.(); return;
                              }
                              // 1st tap: validate. Guided tour uses the scripted correction…
                              if (scriptedValidation) {
                                setAddr(VERIFIED_ADDR); setAddrValidated(true); flash("Address verified & deliverable"); onShippingSaved?.(); return;
                              }
                              // …manual use runs a free live postal-code lookup (Zippopotam).
                              setValidating(true);
                              const hit = await lookupPostal(country, addr.zip);
                              setValidating(false);
                              if (!hit) {
                                // PIN doesn't exist → NOT deliverable
                                flash(`Couldn't verify PIN ${addr.zip || "code"} in ${country}.`);
                                return; // stay flagged; do NOT mark verified
                              }
                              const cityWrong = hit.city && hit.city.toLowerCase() !== addr.city.trim().toLowerCase();
                              const stateWrong = hit.region && hit.region.toLowerCase() !== addr.state.trim().toLowerCase();
                              if (cityWrong || stateWrong) {
                                setAddr((a) => ({ ...a, city: hit.city || a.city, state: hit.region || a.state }));
                                flash(`Corrected to ${[hit.city, hit.region].filter(Boolean).join(", ")}`);
                              } else {
                                flash("Address verified & deliverable");
                              }
                              setAddrValidated(true);
                              onShippingSaved?.();
                            }}
                            className="mt-1 w-full rounded-md py-3 text-sm font-semibold text-white transition-all hover:brightness-125 active:scale-[0.99] disabled:opacity-70"
                            style={{ background: "#111827" }}
                          >
                            {validating ? "Validating…" : addrFlagged ? "Use validated address" : "Update Shipping Address"}
                          </button>
                        </div>
                      </div>
                    </AccordionRow>
                  </div>

                  <div ref={tourRefs?.orderRow}>
                  <AccordionRow icon={Pencil} label="Update your order" isOpen={open === "order"} onClick={() => toggle("order")} locked={addressValidation}>
                    <div className="flex flex-col divide-y divide-border">
                      {items.map((item, i) => (
                        <div
                          key={item.uid}
                          className={`flex items-center gap-3 rounded-lg px-1 py-2.5 transition-colors duration-300 ${orderEmphasis && i === 0 ? "bg-amber-50" : ""}`}
                        >
                          <Thumb src={item.image} alt={item.title} />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium text-neutral-800">{item.title}</div>
                            <div className="text-xs text-neutral-500">{fmt(item.price)}</div>
                          </div>
                          <Stepper qty={item.qty} onDec={() => setQty(item.uid, -1)} onInc={() => setQty(item.uid, 1)} incRef={i === 0 ? tourRefs?.orderPlusBtn : undefined} />
                          <button
                            onClick={() => removeItem(item.uid)}
                            disabled={items.length <= 1}
                            aria-label={`Remove ${item.title}`}
                            className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border text-neutral-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-border disabled:hover:bg-transparent disabled:hover:text-neutral-400"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div ref={tourRefs?.orderBtn}>
                      <PrimaryButton onClick={() => {
                        const changed = orderSig(items) !== initialOrderSig.current;
                        if (!changed) { flash("No changes to your order yet"); return; }
                        initialOrderSig.current = orderSig(items);
                        flash("Order updated");
                        onOrderUpdated?.();
                      }}>
                        Update your order
                      </PrimaryButton>
                    </div>
                  </AccordionRow>
                  </div>

                  <AccordionRow icon={Tag} label="Apply Discount Code" isOpen={open === "discount"} onClick={() => toggle("discount")} locked={addressValidation}>
                    <div className="flex gap-2">
                      <input
                        value={discount}
                        onChange={(e) => setDiscount(e.target.value)}
                        placeholder="Discount code"
                        className="h-11 flex-1 rounded-md border border-border px-3 text-sm focus:outline-none"
                      />
                      <button
                        onClick={() => discount && flash("Discount applied")}
                        className="h-11 rounded-md border border-border bg-neutral-100 px-5 text-sm font-medium text-neutral-500"
                      >
                        Apply
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-neutral-500">
                      Enter a valid discount code to apply savings to your order.
                    </p>
                  </AccordionRow>

                  <AccordionRow icon={X} label="Cancel Your Order" isOpen={open === "cancel"} onClick={() => toggle("cancel")} locked={addressValidation}>
                    <p className="text-sm text-neutral-600">
                      {`Cancel your order for ${fmt(subtotal)} and choose how you'd like to be refunded.`}
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        onClick={() => { setCancelled(true); setOpen(null); flash(`Refund of ${fmt(subtotal)} to original payment`); }}
                        className="rounded-md border border-red-200 py-2.5 text-[13px] font-semibold text-red-500 transition-colors hover:bg-red-50"
                      >
                        Refund to original payment
                      </button>
                      <button
                        onClick={() => { setCancelled(true); setOpen(null); flash(`${fmt(subtotal)} store credit issued`); }}
                        className="rounded-md border border-border py-2.5 text-[13px] font-semibold text-neutral-700 transition-colors hover:bg-neutral-50"
                      >
                        Store credit
                      </button>
                    </div>
                  </AccordionRow>
                </div>
              </div>
            )}

            {/* In-page cross-sell row (bottom, standard editing window) */}
            {!upsellFirst && !cancelled && (
              <div className="mt-3">
                <ThankYouProducts store={store} brand="#111827" products={upsellPool} onAdd={addUpsell} layout="row" gridRef={tourRefs?.upsellRow} addBtnRef={tourRefs?.upsellAddBtn} />
              </div>
            )}

            {/* Too good to miss — featured deal at the bottom of the editing window */}
            {!upsellFirst && !cancelled && upsellPool.length > 0 && (
              <div className="mt-3">
                <TooGoodToMiss store={store} brand="#111827" product={upsellPool[upsellPool.length - 1]} onAdd={(p) => addUpsell(p, true)} />
              </div>
            )}

            {/* shipping map + order-confirmed (thank-you page only; order status shows tracking instead) */}
            {!cancelled && pageContext !== "orderstatus" && (
              <div className="mt-3">
                <ThankYouMap city={addr.city} region={addr.state} />
              </div>
            )}

            {/* order details summary */}
            {!cancelled && (
              <div className="mt-3">
                <OrderDetails addr={addr} email={email} phone={phone} country={DEFAULT_COUNTRY} amount={`${fmt(cancelled ? 0 : subtotal + shipping)} ${store.currency || "INR"}`} />
              </div>
            )}
            </>
            )}
          </div>

          {/* RIGHT: order summary */}
          <aside className="bg-neutral-50 p-4">
            <div className="flex flex-col gap-3">
              {items.map((item) => (
                <div key={item.uid} className="flex items-start gap-3">
                  <div className="relative">
                    <Thumb src={item.image} alt={item.title} />
                    <span className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-neutral-900 text-[10px] font-bold text-white">
                      {item.qty}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium text-neutral-800">{item.title}</div>
                    {item.postPurchase && item.dealPrice != null && (
                      <div className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
                        <Tag className="size-2.5" />
                        POSTPURCHASE (-{fmt((item.price - item.dealPrice) * item.qty)})
                      </div>
                    )}
                  </div>
                  <div className="text-right text-xs">
                    {item.postPurchase && item.dealPrice != null ? (
                      <>
                        <span className="block text-neutral-400 line-through">{fmt(item.price * item.qty)}</span>
                        <span className="font-semibold text-neutral-900">{fmt(item.dealPrice * item.qty)}</span>
                      </>
                    ) : (
                      <span className="font-semibold text-neutral-900">{fmt(item.price * item.qty)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 space-y-1.5 border-t border-border pt-4 text-sm">
              <Row label={`Subtotal · ${items.reduce((n, i) => n + i.qty, 0)} items`} value={fmt(subtotal)} />
              {freeShip ? (
                <div className="flex items-center justify-between text-neutral-600">
                  <span>Shipping</span>
                  <span className="flex items-center gap-1.5">
                    <span className="text-neutral-400 line-through">{fmt(shipFee)}</span>
                    <span className="font-bold text-emerald-600">FREE</span>
                  </span>
                </div>
              ) : (
                <Row label="Shipping" value={fmt(shipping)} />
              )}
            </div>
            <div className="mt-3 flex items-baseline justify-between border-t border-border pt-3">
              <span className="font-bold text-neutral-900">Total</span>
              <span className="text-lg font-bold text-neutral-900">
                {fmt(cancelled ? 0 : subtotal + shipping)}
              </span>
            </div>
            {savings > 0 && !cancelled && (
              <div className="mt-2 flex items-center gap-1.5 text-[12px] font-bold text-emerald-600">
                <Tag className="size-3" />
                Total savings {fmt(savings)}
              </div>
            )}

            {/* balance due — quantity bumps, in-page upsells, and accepted
                one-tap post-purchase offers are charged here */}
            {due > 0 && (
              <div ref={tourRefs?.payPanel} className="mt-3 rounded-xl bg-amber-50 p-3">
                <div className="flex items-baseline justify-between text-[13px]">
                  <span className="font-medium text-neutral-700">Balance due</span>
                  <span className="font-bold text-neutral-900">{fmt(due)}</span>
                </div>
                <p className="mt-1 text-[11px] leading-snug text-neutral-500">
                  You added to your order. Pay the difference to confirm the changes.
                </p>
                <button
                  ref={tourRefs?.payBtn}
                  onClick={() => { payBalance(); onPaid?.(); }}
                  className="mt-2.5 w-full rounded-md py-2.5 text-[13px] font-semibold text-white transition-all hover:brightness-125 active:scale-[0.99]"
                  style={{ background: "#111827" }}
                >
                  Pay {fmt(due)}
                </button>
              </div>
            )}
          </aside>
        </div>
      </div>

      {/* Processing modal */}
      <AnimatePresence>
        {processing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 flex items-center justify-center rounded-2xl bg-neutral-900/20 backdrop-blur-[2px]"
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              className="relative w-[80%] max-w-sm rounded-xl bg-white p-8 text-center shadow-soft-xl"
            >
              <p className="mb-4 text-left text-lg font-bold text-neutral-900">Processing…</p>
              <Loader2 className="mx-auto size-9 animate-spin" style={{ color: brand }} />
              <p className="mt-4 text-sm text-neutral-600">{processing}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast — portaled to body so it shows ABOVE the guided-tour scrim */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {toast && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                className="fixed bottom-8 left-1/2 z-[600] flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-neutral-900 px-5 py-2.5 text-[13px] font-medium text-white shadow-2xl ring-1 ring-white/10"
              >
                <Check className="size-3.5" style={{ color: "#6ee7b7" }} />
                {toast}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}

/* ----------------------------- sub-components ----------------------------- */

function AccordionRow({
  icon: Icon,
  label,
  isOpen,
  onClick,
  children,
  badge,
  locked,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  isOpen: boolean;
  onClick: () => void;
  children: React.ReactNode;
  badge?: React.ReactNode;
  locked?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <button
        onClick={onClick}
        disabled={locked}
        className={`flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors ${locked ? "cursor-default" : "hover:bg-neutral-50"}`}
        aria-expanded={isOpen}
      >
        <Icon className="size-4 shrink-0 text-neutral-600" />
        <span className="text-sm font-semibold text-neutral-900">{label}</span>
        {badge}
        <span className="flex-1" />
        <ChevronDown className={`size-4 shrink-0 text-neutral-400 transition-transform ${isOpen ? "rotate-180" : ""} ${locked ? "opacity-30" : ""}`} />
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-2.5 px-3.5 pb-4 pt-1">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Field({ label, value, onChange, emphasize, invalid, valid, error }: { label: string; value: string; onChange: (v: string) => void; emphasize?: boolean; invalid?: boolean; valid?: boolean; error?: string }) {
  return (
    <div>
      <label
        className={`relative block rounded-md border-2 px-3 pt-5 pb-1.5 transition-colors duration-300 ${
          invalid ? "border-red-400" : valid ? "border-emerald-300" : emphasize ? "border-amber-300 bg-amber-50" : "border-border focus-within:border-neutral-400"
        }`}
      >
        <span className="pointer-events-none absolute left-3 top-1.5 text-[10px] font-medium uppercase tracking-wide text-neutral-400">
          {label}
        </span>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent text-sm text-neutral-800 focus:outline-none"
        />
      </label>
      {error && <div className="mt-1 text-[12px] font-medium text-red-500">{error}</div>}
    </div>
  );
}

/** Custom styled dropdown — opens an in-card panel (no native OS overlay), with a
 *  scrollable option list for long region lists. Matches the form's field style. */
function SelectInput({
  label, value, onChange, options, emphasize,
}: { label: string; value: string; onChange: (v: string) => void; options: string[]; emphasize?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`relative flex w-full items-center rounded-md border px-3 pt-5 pb-1.5 text-left transition-colors duration-300 ${emphasize ? "border-amber-300 bg-amber-50" : open ? "border-neutral-400" : "border-border hover:border-neutral-300"}`}
      >
        <span className="pointer-events-none absolute left-3 top-1.5 text-[10px] font-medium uppercase tracking-wide text-neutral-400">
          {label}
        </span>
        <span className="truncate pr-5 text-sm text-neutral-800">{value}</span>
        <ChevronDown className={`pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-52 overflow-y-auto rounded-md border border-neutral-200 bg-white py-1 shadow-xl">
            {options.map((o) => {
              const active = o === value;
              return (
                <button
                  key={o}
                  type="button"
                  onClick={() => { onChange(o); setOpen(false); }}
                  className={`flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-[13px] transition-colors ${active ? "bg-[#155FFF] text-white" : "text-neutral-800 hover:bg-neutral-50"}`}
                >
                  <span className="truncate">{o}</span>
                  {active && <Check className="size-3.5 shrink-0" strokeWidth={3} />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function CheckboxRow({ label, brand }: { label: string; brand: string }) {
  const [on, setOn] = useState(true);
  return (
    <button onClick={() => setOn((v) => !v)} className="flex items-center gap-2 text-sm text-neutral-700">
      <span
        className="flex size-5 items-center justify-center rounded border"
        style={on ? { background: brand, borderColor: brand } : { borderColor: "#cbd0d8" }}
      >
        {on && <Check className="size-3.5 text-white" strokeWidth={3} />}
      </span>
      {label}
    </button>
  );
}

function PrimaryButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="mt-1 w-full rounded-md py-3 text-sm font-semibold text-white transition-all hover:brightness-125 active:scale-[0.99]"
      style={{ background: "#111827" }}
    >
      {children}
    </button>
  );
}

function Stepper({ qty, onDec, onInc, incRef }: { qty: number; onDec: () => void; onInc: () => void; incRef?: React.RefObject<HTMLButtonElement | null> }) {
  return (
    <div className="flex items-center gap-2">
      <button onClick={onDec} className="flex size-7 items-center justify-center rounded-md border border-border text-neutral-500 hover:text-neutral-900">
        −
      </button>
      <span className="w-5 text-center text-sm font-medium">{qty}</span>
      <button ref={incRef} onClick={onInc} className="flex size-7 items-center justify-center rounded-md border border-border text-neutral-500 hover:text-neutral-900">
        +
      </button>
    </div>
  );
}

function Thumb({ src, alt, full }: { src?: string | null; alt: string; full?: boolean }) {
  const cls = full ? "size-full object-cover" : "size-11 shrink-0 rounded-lg border border-border object-cover";
  return <DemoImg src={src} alt={alt} className={cls} />;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-neutral-600">
      <span>{label}</span>
      <span className="font-medium text-neutral-900">{value}</span>
    </div>
  );
}

/* ----------------------------- one-tap upsell panel ----------------------------- */

function OneTapPanel({
  store,
  brand,
  addBtnRef,
}: {
  store: DemoStore;
  brand: string;
  addBtnRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const priced = store.products.filter((p) => (p.price ?? 0) > 0);
  const pool = dedupeByTitle(priced.length ? priced : store.products);
  const offer = pool[1] ?? pool[0];
  const full = offer?.price ?? 12;
  const deal = Math.max(1, Math.round(full * 0.5 * 100) / 100);
  const [secs, setSecs] = useState(9 * 60 + 54);
  useEffect(() => {
    const id = setInterval(() => setSecs((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, []);
  const timer = `${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, "0")}`;
  const moneyFmt = (n: number) => `$${n.toFixed(2)}`;

  return (
    <div className="flex flex-col gap-3">
      {/* confirmation header */}
      <div className="flex items-center gap-2 text-sm">
        <span className="flex size-6 items-center justify-center rounded-full border-2" style={{ borderColor: brand, color: brand }}>
          <Check className="size-3.5" strokeWidth={3} />
        </span>
        <span className="font-semibold text-neutral-900">Confirmation #0WPS9KCW8</span>
        <span className="text-neutral-400">· You&apos;ve paid</span>
      </div>

      {/* "before you go" banner */}
      <div className="flex items-center gap-3 rounded-lg bg-neutral-50 py-2.5 text-center text-[13px] text-neutral-700">
        <span className="flex-1 text-center font-semibold">{DEFAULT_ADDR.first}, before you go!</span>
        <span className="mr-3 font-semibold tabular-nums text-red-500">{timer}</span>
      </div>

      {/* offer card */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-neutral-50">
          <DemoImg src={offer?.image} alt={offer?.title ?? ""} className="size-full object-contain p-4" />
        </div>

        <div className="flex flex-col justify-between py-1">
          <div>
            <div className="text-[10px] font-medium uppercase tracking-wide text-neutral-400">Offer 1 of 1</div>
            <div className="mt-1 text-[14px] font-semibold leading-snug text-neutral-900">
              {offer?.title ?? "Add-on product"}
            </div>
            <div className="mt-1.5 flex items-baseline gap-1.5">
              <span className="text-[12px] text-neutral-400 line-through">{moneyFmt(full)}</span>
              <span className="text-[15px] font-bold text-red-500">{moneyFmt(deal)}</span>
            </div>
          </div>

          <div className="mt-3 space-y-1">
            <button
              ref={addBtnRef}
              className="w-full rounded-lg py-2.5 text-[13px] font-semibold text-white shadow-md transition-all hover:brightness-110"
              style={{ background: brand }}
            >
              Add to order · {moneyFmt(deal)}
            </button>
            <button className="w-full py-1.5 text-[12px] font-medium text-neutral-400 hover:text-neutral-600">
              Skip offer
            </button>
          </div>
        </div>
      </div>

      <p className="text-center text-[11px] text-neutral-400">
        One tap to add — no card or re-checkout needed.
      </p>
    </div>
  );
}
