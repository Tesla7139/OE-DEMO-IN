"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Roboto_Condensed } from "next/font/google";
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleArrowLeft,
  CircleCheck,
  CircleHelp,
  CircleUserRound,
  Copy,
  Earth,
  Filter,
  IdCard,
  LogOut,
  Mail,
  MessageCircle,
  MessageSquareText,
  Package,
  PackageCheck,
  PackageX,
  Pencil,
  Phone,
  Plus,
  RotateCw,
  Search,
  ShoppingBag,
  Star,
  Trash2,
  Truck,
  Undo2,
  X,
} from "lucide-react";
import type { DemoProduct, DemoStore } from "@/lib/site";
import { DEFAULT_ADDR, DEFAULT_EMAIL, DEFAULT_PHONE, VERIFIED_ADDR } from "@/lib/demo-customer";
import { dedupeByTitle, dedupeExactTitle, readableBrand } from "@/lib/utils";
import { DemoImg } from "./DemoImg";
import { DemoMock } from "./DemoMock";

// The storefront's "My Account" area — orders with per-item tracking, profile,
// addresses, support — rebuilt from the brand-account reference build, with the
// loaded store's logo, colour and products. The draft order's "Edit Order Details"
// opens the order-editing window.

const font = Roboto_Condensed({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

/* ── tokens (from the reference build) ── */
const TEXT = "#252525";

/* ── dates — relative to today, like the reference; this tab only renders client-side ── */
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const LONG_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const LONG_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const at = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d;
};
const pad = (n: number) => String(n).padStart(2, "0");
const fmtDay = (d: Date) => `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`; // Thu, 12 Nov
const fmtLong = (d: Date) => `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`; // Nov 12, 2026
const fmtBadge = (d: Date) => `${d.getDate()} ${MONTHS[d.getMonth()]}, ${d.getFullYear()}`; // 12 Nov, 2026
const fmtShort = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${String(d.getFullYear()).slice(2)}`; // 10/11/26
const fmtEvent = (d: Date, time: string) =>
  `(${time}:00 on ${DAYS[d.getDay()]}, ${d.getDate()} ${LONG_MONTHS[d.getMonth()]}, ${d.getFullYear()})`;
const fmtPickup = (d: Date) => `${LONG_DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;

/* ── data ── */
type Status = "packed" | "in_transit" | "out_for_delivery" | "delivered" | "failed" | "cancelled" | "return_in_progress" | "refunded";
type Ship = {
  status: Status;
  awb?: string;
  placed: number;
  outcome?: number;
  eta?: number;
  failureReason?: string;
  ret?: { requested: number; pickup: number; pickedUp?: number; refunded?: number; amount: number };
};
type Item = { id: string; p: number; price?: number; qty?: number; ship?: Ship };
type Order = {
  id: string;
  draft?: boolean;
  placed: number;
  cod?: boolean;
  addr?: number;
  discount?: number;
  shippingFee?: number;
  items: Item[];
};
type Address = { id: string; name: string; phone: string; line1: string; line2: string; city: string; state: string; zip: string; label: "home" | "work"; isDefault: boolean };
type Event = { title: string; lines: string[]; when: string };

const NAME = `${DEFAULT_ADDR.first} ${DEFAULT_ADDR.last}`;
const PHONE = DEFAULT_PHONE.replace(/\D/g, "").slice(-10);

const ADDRESSES: Address[] = [
  { id: "a1", name: NAME, phone: PHONE, line1: "Tower 3, 1402, The Magnolias", line2: "DLF Golf Course Road, DLF Phase 5", city: VERIFIED_ADDR.city, state: VERIFIED_ADDR.state, zip: VERIFIED_ADDR.zip, label: "home", isDefault: true },
  { id: "a2", name: NAME, phone: PHONE, line1: "Two Horizon Center, 5th Floor", line2: "Golf Course Road, Sector 43", city: "Gurugram", state: "Haryana", zip: "122002", label: "work", isDefault: false },
];

const s = (status: Status, placed: number, rest: Partial<Ship> = {}): Ship => ({ status, placed, ...rest });

// Same shape as the reference's order history; `p` indexes the store's products.
// The draft carries the order the editing window opens on (its first two products).
const ORDERS: Order[] = [
  { id: "D1042", draft: true, placed: -3, items: [{ id: "li-1", p: 0 }, { id: "li-2", p: 1 }] },
  { id: "521451", placed: -1, items: [
    { id: "li-7", p: 0, ship: s("out_for_delivery", -2, { awb: "89892887900", outcome: 0, eta: 0 }) },
    { id: "li-8", p: 2, ship: s("packed", -1, { awb: "89892887901", eta: 3 }) },
  ] },
  { id: "521450", placed: -3, items: [
    { id: "li-9", p: 2, ship: s("in_transit", -3, { awb: "89892887880", eta: 2 }) },
    { id: "li-10", p: 3, ship: s("in_transit", -3, { awb: "89892887881", eta: 2 }) },
    { id: "li-11", p: 0, ship: s("in_transit", -3, { awb: "89892887882", eta: 2 }) },
  ] },
  { id: "521449", placed: -4, items: [
    { id: "li-12", p: 1, ship: s("cancelled", -4, { outcome: -4 }) },
    { id: "li-13", p: 0, ship: s("cancelled", -4, { outcome: -4 }) },
  ] },
  { id: "521448", placed: -5, items: [
    { id: "li-14", p: 2, ship: s("failed", -5, { awb: "89892887870", outcome: -1, failureReason: "Customer Unavailable" }) },
    { id: "li-15", p: 3, ship: s("failed", -5, { awb: "89892887871", outcome: -1, failureReason: "Customer Unavailable" }) },
    { id: "li-16", p: 0, ship: s("delivered", -5, { awb: "89892887872", outcome: -2 }) },
  ] },
  { id: "521447", placed: -6, items: [
    { id: "li-17", p: 2, ship: s("delivered", -6, { awb: "89892887862", outcome: -2 }) },
    { id: "li-18", p: 3, ship: s("return_in_progress", -6, { awb: "89892887863", outcome: -2, ret: { requested: -1, pickup: 1, amount: 0 } }) },
    { id: "li-19", p: 0, ship: s("delivered", -6, { awb: "89892887864", outcome: -2 }) },
  ] },
  { id: "521438", placed: -24, items: [
    { id: "li-20", p: 2, ship: s("delivered", -24, { awb: "89892887852", outcome: -20 }) },
    { id: "li-21", p: 3, ship: s("delivered", -24, { awb: "89892887853", outcome: -20 }) },
    { id: "li-22", p: 0, ship: s("delivered", -24, { awb: "89892887854", outcome: -20 }) },
  ] },
  { id: "521402", placed: -40, cod: true, addr: 1, discount: 300, shippingFee: 99, items: [
    { id: "li-23", p: 3, ship: s("delivered", -40, { awb: "89892887890", outcome: -36 }) },
    { id: "li-24", p: 2, ship: s("delivered", -40, { awb: "89892887891", outcome: -36 }) },
    { id: "li-25", p: 0, ship: s("delivered", -40, { awb: "89892887892", outcome: -36 }) },
    { id: "li-26", p: 1, qty: 2, ship: s("refunded", -40, { awb: "89892887893", outcome: -36, ret: { requested: -34, pickup: -33, pickedUp: -33, refunded: -29, amount: 0 } }) },
    { id: "li-27", p: 0, ship: s("delivered", -40, { awb: "89892887894", outcome: -36 }) },
    { id: "li-28", p: 2, ship: s("delivered", -40, { awb: "89892887895", outcome: -36 }) },
  ] },
];

const STATUS_LABEL: Record<Status, string> = {
  packed: "Packed",
  in_transit: "In-Transit",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  failed: "Failed",
  cancelled: "Cancelled",
  return_in_progress: "Return in Progress",
  refunded: "Refunded",
};
type Tone = "warning" | "neutral" | "success" | "danger";
const STATUS_TONE: Record<Status, Tone> = {
  packed: "neutral",
  in_transit: "warning",
  out_for_delivery: "warning",
  delivered: "success",
  failed: "danger",
  cancelled: "neutral",
  return_in_progress: "warning",
  refunded: "success",
};
const TONE: Record<Tone, string> = {
  warning: "bg-[#fffad6] border-[#edd434]",
  neutral: "bg-white border-[#cfd8dc]",
  success: "bg-[#ebfff2] border-[#0e8c3a]",
  danger: "bg-[rgba(229,55,38,.1)] border-[#e53726]",
};

/** Filter groups, counted per order (an order is in a group if any item is). */
const FILTERS: { key: string; label: string; match: (o: Order) => boolean }[] = [
  { key: "all", label: "All", match: () => true },
  { key: "packed", label: "Packed", match: (o) => has(o, "packed") },
  { key: "transit", label: "In-Transit", match: (o) => has(o, "in_transit", "out_for_delivery") },
  { key: "delivered", label: "Delivered", match: (o) => has(o, "delivered") },
  { key: "failed", label: "Failed", match: (o) => has(o, "failed") },
  { key: "returns", label: "Returns", match: (o) => has(o, "return_in_progress", "refunded") },
  { key: "cancelled", label: "Cancelled", match: (o) => has(o, "cancelled") },
  { key: "draft", label: "Draft", match: (o) => !!o.draft },
];
const has = (o: Order, ...st: Status[]) => o.items.some((i) => i.ship && st.includes(i.ship.status));

const PIPELINE: Status[] = ["packed", "in_transit", "out_for_delivery", "delivered"];
const BRANCH = "Location: WHITE FIELD BRANCH";

/** Tracking events for one shipment, newest first (port of the reference's builder). */
function eventsFor(sh: Ship, money: (n: number) => string): Event[] {
  const reached = (st: Status) => {
    const cur = ["failed", "return_in_progress", "refunded"].includes(sh.status)
      ? PIPELINE.indexOf(sh.status === "failed" ? "out_for_delivery" : "delivered")
      : PIPELINE.indexOf(sh.status);
    return cur >= PIPELINE.indexOf(st);
  };
  const e = (title: string, lines: string[], day: number, time: string): Event => ({ title, lines, when: fmtEvent(at(day), time) });
  const out = [e("ORDER PLACED", ["We have successfully received your order!", "Excitement is on the way!"], sh.placed, "19:44")];
  if (sh.status === "cancelled") out.push(e("ORDER CANCELLED", ["Cancelled at your request", "Refund initiated to your original payment method"], sh.outcome ?? sh.placed, "21:05"));
  if (reached("packed")) out.push(e("PACKED", ["Packed at our warehouse", BRANCH], sh.placed, "22:10"));
  if (reached("in_transit")) {
    out.push(e("ORDER SHIPPED", ["Pickup Scheduled", BRANCH], sh.placed + 1, "09:30"));
    out.push(e("PICKED UP", ["Booked", BRANCH], sh.placed + 1, "13:15"));
    out.push(e("IN TRANSIT", ["Arrived at destination hub", `Location: ${VERIFIED_ADDR.city.toUpperCase()} HUB`], sh.placed + 2, "06:40"));
  }
  if (reached("out_for_delivery")) out.push(e("OUT FOR DELIVERY", ["With our delivery partner", `Location: ${VERIFIED_ADDR.city.toUpperCase()}`], sh.outcome ?? 0, "08:30"));
  if (reached("delivered")) out.push(e("DELIVERED", ["Delivered to customer", `Received by: ${DEFAULT_ADDR.first}`], sh.outcome ?? 0, "14:10"));
  if (sh.status === "failed") out.push(e("DELIVERY FAILED", [`Reason: ${sh.failureReason}`, "We’ll reattempt on your request"], sh.outcome ?? 0, "15:25"));
  if (sh.ret) {
    out.push(e("RETURN REQUESTED", ["Return request received"], sh.ret.requested, "10:05"));
    out.push(e("PICKUP SCHEDULED", [`Courier will collect it on ${fmtPickup(at(sh.ret.pickup))}`, "Keep the item packed with its tags on"], sh.ret.requested, "10:06"));
    if (sh.ret.pickedUp !== undefined) out.push(e("PICKED UP", ["Return collected from your address"], sh.ret.pickedUp, "12:30"));
    if (sh.ret.refunded !== undefined) out.push(e("REFUND ISSUED", [`${money(sh.ret.amount)} credited to your original payment method`], sh.ret.refunded, "16:00"));
  }
  return out.reverse();
}

const addrLine = (a: Address) => `${a.line1}, ${a.line2 ? `${a.line2}, ` : ""}${a.city}, ${a.state} - ${a.zip}, India`;

/* ── small pieces ── */
function Badge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={`inline-flex items-center whitespace-nowrap rounded-[2px] border px-1.5 py-[1px] text-[10.5px] font-semibold leading-4 ${TONE[tone]}`}>{children}</span>;
}
function Chip({ children }: { children: ReactNode }) {
  return <span className="inline-flex whitespace-nowrap rounded-[2px] border border-[#cfd8dc] bg-white px-1.5 py-[1px] text-[11px] leading-4">{children}</span>;
}
function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`bg-white ${className}`}>{children}</section>;
}
function PageTitle({ children }: { children: ReactNode }) {
  return (
    <div className="mb-4">
      <h2 className="inline-block border-b border-dashed border-[#252525] px-2 pb-2.5 text-[15px] font-medium">{children}</h2>
    </div>
  );
}
function GrayHead({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 bg-[#f8f8f8] px-3 py-2.5">
      <span className="text-[14px] font-medium">{children}</span>
      {right}
    </div>
  );
}
function Crumbs({ brand, trail, onNav }: { brand: string; trail: { label: string; to?: () => void }[]; onNav?: never }) {
  void onNav;
  return (
    <nav className="flex flex-wrap items-center gap-1 text-[11px]">
      {trail.map((c, i) => (
        <span key={c.label} className="flex items-center gap-1">
          {c.to ? (
            <button type="button" onClick={c.to} className="hover:underline" style={{ color: brand }}>
              {c.label}
            </button>
          ) : (
            <span>{c.label}</span>
          )}
          {i < trail.length - 1 && <ChevronRight className="size-3" style={{ color: brand }} />}
        </span>
      ))}
    </nav>
  );
}
function Arrows({ onPrev, onNext }: { onPrev: () => void; onNext: () => void }) {
  return (
    <div className="flex gap-2">
      {[{ f: onPrev, I: ChevronLeft, l: "Previous" }, { f: onNext, I: ChevronRight, l: "Next" }].map(({ f, I, l }) => (
        <button key={l} type="button" aria-label={l} onClick={f} className="flex size-7 items-center justify-center rounded-full border border-[#ebebeb] bg-white hover:bg-[#eceff1]">
          <I className="size-3.5" />
        </button>
      ))}
    </div>
  );
}

const RAIL_INTERVAL = 3200; // pause between slides
const RAIL_DURATION = 900; // one slide's eased scroll
const RAIL_RESUME = 5000; // autoplay waits this long after the shopper uses the arrows
const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);

/**
 * Autoplaying, endlessly looping card rail (as in the reference build): the cards are
 * rendered twice and the scroll position jumps back one set when it passes the
 * copy, so it never visibly rewinds. Pauses on hover / keyboard focus, while the
 * shopper is using the arrows, off-screen, in a hidden tab, and for reduced motion.
 * Returns the arrow handler.
 */
// (the rail is `relative`, so card offsetLeft is measured from the rail itself)
function useAutoRail(ref: React.RefObject<HTMLDivElement | null>, setSize: number) {
  const step = useRef<(dir: number) => void>(() => {});
  useEffect(() => {
    const el = ref.current;
    if (!el || setSize === 0) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const s = { hovered: false, focused: false, visible: true, lastUser: 0, raf: 0 };
    const items = () => Array.from(el.querySelectorAll<HTMLElement>("[data-rail-item]"));
    const loopAt = () => items()[setSize]?.offsetLeft ?? 0; // where the second copy starts
    const stop = () => {
      if (s.raf) cancelAnimationFrame(s.raf);
      s.raf = 0;
      el.style.scrollSnapType = "";
    };
    const animateTo = (target: number) => {
      const from = el.scrollLeft;
      const t0 = performance.now();
      el.style.scrollSnapType = "none";
      const frame = (now: number) => {
        const k = Math.min(1, (now - t0) / RAIL_DURATION);
        el.scrollLeft = from + (target - from) * easeInOut(k);
        if (k < 1) s.raf = requestAnimationFrame(frame);
        else {
          const at = loopAt();
          if (at > 0 && el.scrollLeft >= at - 1) el.scrollLeft -= at;
          stop();
        }
      };
      s.raf = requestAnimationFrame(frame);
    };
    const next = () => {
      const at = loopAt();
      if (at > 0 && el.scrollLeft >= at - 1) el.scrollLeft -= at;
      const x = el.scrollLeft;
      const card = items().find((c) => c.offsetLeft > x + 2);
      if (card) animateTo(card.offsetLeft);
    };
    const prev = () => {
      const at = loopAt();
      if (at > 0 && el.scrollLeft <= 2) el.scrollLeft += at;
      const x = el.scrollLeft;
      const card = items().filter((c) => c.offsetLeft < x - 2).pop();
      if (card) animateTo(card.offsetLeft);
    };
    step.current = (dir) => {
      s.lastUser = Date.now();
      stop();
      if (dir > 0) next();
      else prev();
    };
    const tick = () => {
      const idle = Date.now() - s.lastUser > RAIL_RESUME;
      const fits = el.scrollWidth <= el.clientWidth + 2;
      if (!reduced && !s.hovered && !s.focused && s.visible && !document.hidden && idle && !s.raf && !fits) next();
    };
    const timer = window.setInterval(tick, RAIL_INTERVAL + RAIL_DURATION);
    const onUser = () => {
      s.lastUser = Date.now();
      if (s.raf) stop();
    };
    const enter = () => (s.hovered = true);
    const leave = () => (s.hovered = false);
    const focusIn = () => (s.focused = el.matches(":focus-within"));
    const focusOut = () => (s.focused = false);
    const io = new IntersectionObserver(([e]) => (s.visible = e.isIntersecting));
    io.observe(el);
    el.addEventListener("wheel", onUser, { passive: true });
    el.addEventListener("touchstart", onUser, { passive: true });
    el.addEventListener("pointerenter", enter);
    el.addEventListener("pointerleave", leave);
    el.addEventListener("focusin", focusIn);
    el.addEventListener("focusout", focusOut);
    return () => {
      window.clearInterval(timer);
      stop();
      io.disconnect();
      el.removeEventListener("wheel", onUser);
      el.removeEventListener("touchstart", onUser);
      el.removeEventListener("pointerenter", enter);
      el.removeEventListener("pointerleave", leave);
      el.removeEventListener("focusin", focusIn);
      el.removeEventListener("focusout", focusOut);
    };
  }, [ref, setSize]);
  return (dir: number) => step.current(dir);
}

/** "Explore Our New Arrivals" — horizontal cards (orders page) or tall cards (side panels). */
function NewArrivals({ products, fmt, tall, title = "Explore Our New Arrivals", flush }: { products: DemoProduct[]; fmt: (n: number) => string; tall?: boolean; title?: string; flush?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = useAutoRail(ref, products.length);
  return (
    <Card className={flush ? "" : "p-3.5"}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className={tall && flush ? "text-[14px] text-[#465a64]" : "text-[17px] font-medium"}>{title}</h3>
        <Arrows onPrev={() => scroll(-1)} onNext={() => scroll(1)} />
      </div>
      <div ref={ref} className="no-scrollbar relative flex snap-x gap-3 overflow-x-auto">
        {/* two copies for the seamless loop; the second is hidden from assistive tech */}
        {[...products, ...products].map((p, i) => {
          const copy = i >= products.length;
          const mrp = Math.round(p.price * 1.25);
          const price = (
            <div className="flex items-center gap-1.5">
              <span className="text-[12px] font-bold">{fmt(p.price)}</span>
              <span className="text-[10px] text-[#969696] line-through">MRP {fmt(mrp)}</span>
              <span className="bg-[#ebfff2] px-1 text-[9px] font-semibold text-[#0e8c3a]">20% Off</span>
            </div>
          );
          return tall ? (
            <div key={`${p.id}-${i}`} data-rail-item aria-hidden={copy || undefined} className="w-[170px] shrink-0 snap-start border border-[#ebebeb]">
              <DemoImg src={p.image} alt={p.title} className="aspect-square w-full object-cover" />
              <div className="p-2.5">
                <p className="truncate text-[12.5px] font-bold">{p.title}</p>
                <p className="truncate text-[12px] text-[#465a64]">{p.variant}</p>
                <div className="mt-2">{price}</div>
              </div>
            </div>
          ) : (
            <div key={`${p.id}-${i}`} data-rail-item aria-hidden={copy || undefined} className="flex w-[245px] shrink-0 snap-start border border-[#ebebeb]">
              <DemoImg src={p.image} alt={p.title} className="h-[84px] w-[88px] shrink-0 object-cover" />
              <div className="min-w-0 p-2.5">
                <p className="truncate text-[12.5px] font-bold">{p.title}</p>
                <p className="truncate text-[12px] text-[#465a64]">{p.variant}</p>
                <div className="mt-2">{price}</div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/** Add / edit address dialog: the reference's fields, minus "Use current location". */
function AddressModal({ initial, nextId, brand, onClose, onSave }: { initial: Address | null; nextId: string; brand: string; onClose: () => void; onSave: (a: Address) => void }) {
  const [f, setF] = useState<Address>(
    initial ?? { id: nextId, name: NAME, phone: "", line1: "", line2: "", city: "", state: "", zip: "", label: "home", isDefault: false },
  );
  const set = (k: keyof Address, v: string | boolean) => setF((x) => ({ ...x, [k]: v }));
  const ok = f.name && f.phone.length === 10 && f.line1 && f.zip.length === 6 && f.city && f.state;
  const input = (label: string, k: keyof Address, opts: { full?: boolean; prefix?: string; numeric?: number } = {}) => (
    <label className={opts.full ? "col-span-2 block" : "block"}>
      <span className="text-[12px]">{label}</span>
      <span className="mt-1 flex items-center border border-[#ebebeb] bg-white px-2.5">
        {opts.prefix && <span className="mr-2 text-[13px] text-[#465a64]">{opts.prefix}</span>}
        <input
          value={String(f[k])}
          inputMode={opts.numeric ? "numeric" : undefined}
          onChange={(e) => set(k, opts.numeric ? e.target.value.replace(/\D/g, "").slice(0, opts.numeric) : e.target.value)}
          className="h-8 w-full bg-transparent text-[13px] outline-none"
        />
      </span>
    </label>
  );
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-full w-full max-w-[480px] overflow-y-auto bg-white">
        <div className="flex items-start justify-between border-b border-[#ebebeb] px-4 py-3">
          <div>
            <h3 className="text-[17px] font-bold">{initial ? "Edit Address" : "Add New Address"}</h3>
            <p className="text-[12px] text-[#465a64]">{initial ? "Changes apply to future orders only." : "We’ll use this for delivery at checkout."}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close"><X className="size-4" /></button>
        </div>
        <div className="grid grid-cols-2 gap-3 px-4 py-4">
          {input("Full Name *", "name", { full: true })}
          {input("Mobile Number *", "phone", { full: true, prefix: "+91", numeric: 10 })}
          {input("Flat, House no., Building, Society *", "line1", { full: true })}
          {input("Area, Street, Landmark (optional)", "line2", { full: true })}
          {input("PIN Code *", "zip", { numeric: 6 })}
          {input("City *", "city")}
          {input("State *", "state")}
          <label className="block">
            <span className="text-[12px]">Country</span>
            <span className="mt-1 flex h-8 items-center border border-[#ebebeb] bg-[#f8f8f8] px-2.5 text-[13px] text-[#8f8f8e]">India</span>
          </label>
          <div className="col-span-2 flex gap-2">
            {(["home", "work"] as const).map((l) => (
              <button key={l} type="button" onClick={() => set("label", l)} className={`border px-3 py-1 text-[12px] capitalize ${f.label === l ? "border-[#252525] font-semibold" : "border-[#ebebeb]"}`}>
                {l}
              </button>
            ))}
          </div>
          <label className="col-span-2 flex items-center gap-2 text-[13px]">
            <input type="checkbox" checked={f.isDefault} onChange={(e) => set("isDefault", e.target.checked)} style={{ accentColor: brand }} />
            Make this my default address
          </label>
        </div>
        <div className="flex justify-end gap-2 border-t border-[#ebebeb] px-4 py-3">
          <button type="button" onClick={onClose} className="border border-[#252525] px-4 py-1.5 text-[13px]">Cancel</button>
          <button type="button" disabled={!ok} onClick={() => onSave(f)} className="px-4 py-1.5 text-[13px] font-semibold text-white disabled:opacity-50" style={{ background: brand }}>
            {initial ? "Save Changes" : "Save Address"}
          </button>
        </div>
      </div>
    </div>
  );
}

type View =
  | { page: "orders" }
  | { page: "order"; id: string }
  | { page: "item"; id: string; item: string }
  | { page: "edit" }
  | { page: "profile" }
  | { page: "addresses" }
  | { page: "chat" }
  | { page: "faqs" }
  | { page: "logged-out" };

const NAV = [
  { page: "orders", label: "Orders", Icon: Package },
  { page: "profile", label: "Profile", Icon: CircleUserRound },
  { page: "addresses", label: "Address", Icon: Earth },
  { page: "chat", label: "Chat with us", Icon: MessageSquareText },
  { page: "faqs", label: "FAQs", Icon: CircleHelp },
] as const;

/** The shopper's account area on the store — opened from the rail's "Customer account". */
export function CustomerAccountMock({ store, maxHeight = 560 }: { store: DemoStore; maxHeight?: number }) {
  const brand = readableBrand(store.brandColor);
  const currency = store.currency || "INR";
  const money = (n: number) =>
    currency === "INR"
      ? `Rs. ${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : new Intl.NumberFormat("en-IN", { style: "currency", currency, minimumFractionDigits: 2 }).format(n);
  const short = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);

  // the editor's cart is dedupeByTitle(priced).slice(0, 2) — keep p:0/p:1 the same products
  const products = useMemo(() => {
    const priced = store.products.filter((p) => (p.price ?? 0) > 0);
    const base = dedupeByTitle(priced.length ? priced : store.products);
    return base.length ? base : store.products;
  }, [store.products]);
  const arrivals = useMemo(() => {
    const priced = store.products.filter((p) => (p.price ?? 0) > 0);
    return dedupeExactTitle(priced.length ? priced : store.products).slice(0, 8);
  }, [store.products]);
  const prod = (i: Item) => products[i.p % Math.max(1, products.length)];
  const priceOf = (i: Item) => i.price ?? prod(i)?.price ?? 0;
  const qtyOf = (i: Item) => i.qty ?? 1;

  const [view, setView] = useState<View>({ page: "orders" });
  const [addresses, setAddresses] = useState<Address[]>(ADDRESSES);
  const [overrides, setOverrides] = useState<Record<string, Ship>>({}); // initiated returns
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [reattempted, setReattempted] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  // page-level UI state lives here: the pages below are render functions, not components
  const [filter, setFilter] = useState("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [openRows, setOpenRows] = useState<Record<string, boolean>>({});
  const [timelineOpen, setTimelineOpen] = useState<Record<string, boolean>>({});
  const [gender, setGender] = useState("Male");
  const [editingAddr, setEditingAddr] = useState<Address | "new" | null>(null);

  const go = (v: View) => setView(v);
  // every page change starts at the top of the account window
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [view]);
  const flash = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(null), 2600);
  };

  const orders = useMemo(
    () =>
      ORDERS.map((o) => ({
        ...o,
        items: o.items.map((i) => {
          const ship = overrides[i.id] ?? i.ship;
          // return amounts follow the item's (store) price
          if (ship?.ret && !ship.ret.amount) return { ...i, ship: { ...ship, ret: { ...ship.ret, amount: priceOf(i) * qtyOf(i) } } };
          return { ...i, ship };
        }),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [overrides, products],
  );

  const summary = (o: Order) => {
    const itemTotal = o.items.reduce((sum, i) => sum + priceOf(i) * qtyOf(i), 0);
    const discount = o.discount ?? 0;
    const shipping = o.shippingFee ?? 0;
    return { itemTotal, discount, subtotal: itemTotal - discount, shipping, total: itemTotal - discount + shipping };
  };
  const addrOf = (o: Order) => addresses.find((a) => a.id === ADDRESSES[o.addr ?? 0].id) ?? ADDRESSES[o.addr ?? 0];
  const navActive = view.page === "order" || view.page === "item" || view.page === "edit" ? "orders" : view.page;

  const thumbs = (items: Item[], size: string) => (
    <>
      {items.slice(0, 3).map((i) => (
        <DemoImg key={i.id} src={prod(i)?.image} alt="" className={`${size} shrink-0 border border-[#ebebeb] object-cover`} />
      ))}
      {items.length > 3 && <span className="text-[14px]">+{items.length - 3} more</span>}
    </>
  );

  /* ── pages ── */

  function ordersPage() {
    const open = openRows;
    const setOpen = setOpenRows;
    const list = orders.filter(FILTERS.find((f) => f.key === filter)!.match);
    const visible = showAll ? list : list.slice(0, 5);

    return (
      <div className="space-y-4">
        <PageTitle>My Orders</PageTitle>
        <NewArrivals products={arrivals} fmt={short} />
        <Card>
          <div className="flex items-center justify-between gap-3 border-b border-[#ebebeb] px-4 py-3.5">
            <h3 className="flex items-center gap-2 text-[17px] font-semibold">
              <span aria-hidden>📦</span>
              Order History &amp; Status
              <span className="rounded-full bg-[#eceff1] px-1.5 text-[10px] font-normal">{orders.length}</span>
            </h3>
            <div className="relative">
              <button
                type="button"
                onClick={() => setFilterOpen((v) => !v)}
                className={`flex items-center gap-1.5 border bg-white px-3 py-1.5 text-[13px] ${filterOpen ? "border-[#252525]" : "border-[#ebebeb]"}`}
              >
                <Filter className="size-3.5" />
                {FILTERS.find((f) => f.key === filter)!.label}
                <ChevronDown className={`size-3.5 transition-transform ${filterOpen ? "rotate-180" : ""}`} />
              </button>
              {filterOpen && (
                <div className="absolute right-0 top-full z-20 mt-1.5 w-[180px] rounded-md bg-white p-1.5 shadow-[0_8px_24px_rgba(0,0,0,.12)]">
                  <div className="px-2 pb-1.5 pt-1 text-[10px] uppercase tracking-wide text-[#79909c]">Filter by status</div>
                  {FILTERS.map((f) => {
                    const n = orders.filter(f.match).length;
                    const on = f.key === filter;
                    return (
                      <button
                        key={f.key}
                        type="button"
                        onClick={() => {
                          setFilter(f.key);
                          setFilterOpen(false);
                          setShowAll(false);
                        }}
                        className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-[14px] ${on ? "bg-[rgba(229,55,38,.08)] font-semibold" : "hover:bg-[#f8f8f8]"}`}
                        style={on ? { color: brand } : undefined}
                      >
                        {f.label}
                        <span className={`rounded-full px-1.5 text-[10px] ${on ? "bg-white" : "bg-[#eceff1] text-[#465a64]"}`}>{n}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="px-4 pb-4">
            {visible.length === 0 && <p className="py-8 text-center text-[14px] text-[#465a64]">No orders with this status.</p>}
            {visible.map((o, idx) => {
              const isOpen = !!open[o.id];
              const counts = new Map<Status, number>();
              o.items.forEach((i) => i.ship && counts.set(i.ship.status, (counts.get(i.ship.status) ?? 0) + 1));
              const mixed = counts.size > 1;
              return (
                <div key={o.id} className={idx ? "border-t border-[#ebebeb]" : ""}>
                  <div className="flex items-center gap-3 py-3.5 transition-colors hover:bg-[#fafafa]">
                    {o.draft ? (
                      <div className="flex flex-1 items-center gap-2 pl-2">{thumbs(o.items, "size-[52px]")}</div>
                    ) : (
                      <div className="flex flex-1 flex-wrap items-center gap-x-6 gap-y-2 pl-1">
                        <div>
                          <p className="inline-block border border-[#ebebeb] bg-white px-2 py-1 text-[14px] font-medium">Order Id: #{o.id}</p>
                          <p className="mt-1.5 text-[12.5px]">Order date:&nbsp; {fmtDay(at(o.placed))}</p>
                        </div>
                        <div className="flex items-center gap-2">{thumbs(o.items, "size-[52px]")}</div>
                      </div>
                    )}
                    <div className="flex shrink-0 flex-col items-end gap-1.5 border-r border-[#ebebeb] pr-4">
                      {o.draft ? (
                        <>
                          <span className="flex cursor-default items-center gap-1.5 text-[13px] font-medium underline underline-offset-2">
                            Edit Order Details
                            <Pencil className="size-3.5" />
                          </span>
                          <Badge tone="warning">Draft Saved ({fmtShort(at(o.placed))})</Badge>
                        </>
                      ) : (
                        <>
                          <button type="button" onClick={() => go({ page: "order", id: o.id })} className="text-[13px] font-medium underline underline-offset-2">
                            View Full Order ({o.items.length})
                          </button>
                          <div className="flex flex-wrap justify-end gap-1">
                            {[...counts].map(([st, n]) => (
                              <Badge key={st} tone={STATUS_TONE[st]}>
                                {mixed ? `${n} ` : ""}
                                {STATUS_LABEL[st]}
                              </Badge>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-label={`Show items in order ${o.id}`}
                      onClick={() => setOpen((m) => ({ ...m, [o.id]: !m[o.id] }))}
                      className="flex size-8 shrink-0 items-center justify-center"
                    >
                      <ChevronDown className={`size-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                    </button>
                  </div>
                  {isOpen && (
                    <div className="mb-3 bg-[#fafafa] px-3">
                      {o.items.map((i) => (
                        itemRow(i, i.ship ? () => go({ page: "item", id: o.id, item: i.id }) : undefined)
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {!showAll && list.length > 5 && (
              <div className="mt-2 flex justify-center">
                <button type="button" onClick={() => setShowAll(true)} className="border px-3.5 py-2 text-[13px] font-medium" style={{ borderColor: brand, color: brand }}>
                  Show more orders ({list.length - 5})
                </button>
              </div>
            )}
          </div>
        </Card>
      </div>
    );
  }

  function itemRow(item: Item, onClick?: () => void, chevron?: boolean) {
    const p = prod(item);
    const sh = item.ship;
    const returnUntil = sh?.status === "delivered" && sh.outcome !== undefined && sh.outcome + 7 >= 0 ? at(sh.outcome + 7) : null;
    const Inner = (
      <div className="flex min-w-0 flex-1 items-start gap-3 py-3 text-left">
        <DemoImg src={p?.image} alt="" className="size-[46px] shrink-0 border border-[#ebebeb] object-cover" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-[13.5px] font-medium" title={p?.title}>
              {p?.title}
              <span className="sr-only">, {p?.variant}</span>
            </p>
            <Chip>x {qtyOf(item)} Qty</Chip>
          </div>
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <p className="text-[13px]">{money(priceOf(item))}</p>
            {sh && <Badge tone={STATUS_TONE[sh.status]}>Status: {STATUS_LABEL[sh.status]}</Badge>}
          </div>
          {returnUntil && <p className="mt-1 text-[11.5px]">Return available until {fmtDay(returnUntil)}</p>}
        </div>
        {chevron && <ChevronRight className="mt-4 size-4 shrink-0" />}
      </div>
    );
    return onClick ? (
      <button key={item.id} type="button" onClick={onClick} className="flex w-full border-b border-[#ebebeb] last:border-b-0 hover:bg-[#f8f8f8]">
        {Inner}
      </button>
    ) : (
      <div key={item.id} className="flex border-b border-[#ebebeb] last:border-b-0">{Inner}</div>
    );
  }

  function headerCard({ trail, title, onBack, copy, actions }: { trail: { label: string; to?: () => void }[]; title: string; onBack: () => void; copy?: string; actions?: ReactNode }) {
    return (
      <Card className="flex flex-wrap items-end justify-between gap-3 px-4 py-3.5">
        <div>
          <Crumbs brand={brand} trail={trail} />
          <div className="mt-1.5 flex items-center gap-2">
            <button type="button" onClick={onBack} aria-label="Back">
              <CircleArrowLeft className="size-[18px]" />
            </button>
            <h3 className="text-[18px] font-bold">{title}</h3>
            {copy && (
              <button type="button" aria-label="Copy AWB number" onClick={() => { navigator.clipboard?.writeText(copy).catch(() => {}); flash("AWB number copied"); }}>
                <Copy className="size-3.5 text-[#556e7a]" />
              </button>
            )}
          </div>
        </div>
        {actions}
      </Card>
    );
  }

  function infoRows(o: Order) {
    const a = addrOf(o);
    const sm = summary(o);
    return (
      <div className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2.5 px-2 py-3.5 text-[14px]">
        <span>Order Placed on</span>
        <span className="text-[#465a64]">{fmtLong(at(o.placed))}</span>
        <span>{o.cod ? "Cash on Delivery" : "Prepaid"}</span>
        <span className="text-[#465a64]">{money(sm.total)}</span>
        <span>Delivery Address</span>
        <div className="space-y-1.5 text-[12.5px] text-[#465a64]">
          <p>Name: {a.name}</p>
          <p>Phone No: {a.phone}</p>
          <p className="leading-snug">{addrLine(a)}</p>
        </div>
      </div>
    );
  }

  function orderPage(id: string) {
    const o = orders.find((x) => x.id === id)!;
    const sm = summary(o);
    const row = (l: string, v: string) => (
      <div className="flex justify-between text-[13px]">
        <span>{l}</span>
        <span className="text-[#465a64]">{v}</span>
      </div>
    );
    return (
      <div className="space-y-4">
        <PageTitle>My Orders</PageTitle>
        {headerCard({ trail: [{ label: "Orders", to: () => go({ page: "orders" }) }, { label: `Order #${o.id}` }], title: `Order #${o.id}`, onBack: () => go({ page: "orders" }) })}
        <div className="grid gap-4 @3xl:grid-cols-[minmax(0,1fr)_minmax(0,280px)] @3xl:items-start">
          <Card className="p-3.5">
            <GrayHead>Overall Shipment Info</GrayHead>
            {infoRows(o)}
            <GrayHead>Total Products: {o.items.length}</GrayHead>
            <div className="px-1">
              {o.items.map((i) => (
                itemRow(i, () => go({ page: "item", id: o.id, item: i.id }), true)
              ))}
            </div>
          </Card>
          <div className="space-y-4">
            <Card className="p-3.5">
              <div className="bg-[#f8f8f8] px-2 py-1.5 text-[14px] text-[#465a64]">Order Summary</div>
              <div className="space-y-2 border-b border-[#ebebeb] px-2 py-3">
                {row("Item Total", money(sm.itemTotal))}
                {row("Item Discount", `-${money(sm.discount)}`)}
                {row("Subtotal", money(sm.subtotal))}
              </div>
              <div className="space-y-2 border-b border-[#ebebeb] px-2 py-3">
                {row("Shipping", money(sm.shipping))}
                {row(o.cod ? "Cash on Delivery" : "Prepaid", o.cod ? "Paid on delivery" : "Paid")}
              </div>
              <div className="flex justify-between px-2 pt-3 text-[15px] font-medium">
                <span>Order Total</span>
                <span>{money(sm.total)}</span>
              </div>
            </Card>
            <NewArrivals products={arrivals} fmt={short} tall />
          </div>
        </div>
      </div>
    );
  }

  function banner(text: string, kind: "transit" | "failed" | "delivered") {
    const Icon = kind === "transit" ? Truck : kind === "failed" ? PackageX : PackageCheck;
    return (
      <div className="flex items-center justify-between gap-3 bg-[#252525] px-4 py-2.5 text-white">
        <p className="text-[21px] font-bold leading-[1.2]">{text}</p>
        <span className="relative flex size-11 shrink-0 items-center justify-center rounded-md bg-[#f4a340]">
          <Icon className="size-6 text-[#5b3410]" />
          {kind === "failed" && <X className="absolute -left-1 top-3 size-4 rounded-full bg-[#e53726] p-0.5 text-white" strokeWidth={3} />}
          {kind === "delivered" && <Check className="absolute -left-1 bottom-1 size-4 rounded-full bg-[#0e8c3a] p-0.5 text-white" strokeWidth={3} />}
        </span>
      </div>
    );
  }

  function timeline(key: string, events: Event[]) {
    const expanded = !!timelineOpen[key];
    const setExpanded = () => setTimelineOpen((m) => ({ ...m, [key]: !m[key] }));
    const [first, ...rest] = events;
    const ev = (e: Event, action?: ReactNode) => (
      <li key={e.title + e.when} className="relative pb-4 pl-4 last:pb-0">
        <span className="absolute left-0 top-1.5 size-[5px] rounded-full bg-[#252525]" />
        <span className="absolute bottom-0 left-[2px] top-3.5 border-l border-dashed border-[#252525]" />
        <div className="flex items-start justify-between gap-2">
          <p className="text-[13px] font-medium">{e.title}</p>
          {action}
        </div>
        <div className="mt-1.5 space-y-1 text-[12.5px] text-[#465a64]">
          {e.lines.map((l) => (
            <p key={l}>{l}</p>
          ))}
          <p>{e.when}</p>
        </div>
      </li>
    );
    return (
      <ol className="pl-1">
        {ev(
          first,
          rest.length > 0 && (
            <button type="button" onClick={setExpanded} className="bg-[rgba(229,55,38,.08)] px-1.5 py-0.5 text-[11.5px]" style={{ color: brand }}>
              {expanded ? "Hide Details" : "View in detail"}
            </button>
          ),
        )}
        {expanded && rest.map((e) => ev(e))}
      </ol>
    );
  }

  function itemPage(id: string, itemId: string) {
    const o = orders.find((x) => x.id === id)!;
    const item = o.items.find((i) => i.id === itemId)!;
    const sh = item.ship!;
    const p = prod(item);
    const amount = priceOf(item) * qtyOf(item);
    const returnUntil = sh.status === "delivered" && sh.outcome !== undefined && sh.outcome + 7 >= 0 ? at(sh.outcome + 7) : null;
    const title = sh.awb ? `AWB No: ${sh.awb}` : "Item Tracking";

    const badgeText =
      sh.status === "out_for_delivery" ? "Out for Delivery (Arriving today)"
      : sh.status === "packed" || sh.status === "in_transit" ? `${STATUS_LABEL[sh.status]} (Arriving ${fmtDay(at(sh.eta ?? 2))})`
      : sh.status === "return_in_progress" ? `Return in Progress (Pickup ${fmtDay(at(sh.ret!.pickup))})`
      : `${STATUS_LABEL[sh.status]} (${fmtBadge(at(sh.ret?.refunded ?? sh.outcome ?? 0))})`;

    const initiateReturn = () => {
      setOverrides((m) => ({ ...m, [item.id]: { ...sh, status: "return_in_progress", ret: { requested: 0, pickup: 1, amount } } }));
      flash(`Return requested — pickup on ${fmtPickup(at(1))}`);
    };
    const deliveredActions = sh.status === "delivered" && (
      <div className="flex gap-2">
        <button type="button" className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-semibold text-white" style={{ background: brand }} onClick={() => flash("Added to cart")}>
          Buy Again <ShoppingBag className="size-3.5" />
        </button>
        {returnUntil && (
          <button type="button" onClick={initiateReturn} className="flex items-center gap-1.5 border px-3 py-1.5 text-[13px] font-medium" style={{ borderColor: brand, color: brand }}>
            Initiate Return <Undo2 className="size-3.5" />
          </button>
        )}
      </div>
    );

    const reasonBlock = (label: string, value: string, note: string) => (
      <div className="space-y-2 px-2 pt-3">
        <p className="flex justify-between gap-3 text-[14px]">
          <span>{label}</span>
          <span className="text-[#465a64]">{value}</span>
        </p>
        <p className="text-[12.5px] text-[#465a64]">{note}</p>
      </div>
    );
    let aside: ReactNode;
    if (sh.status === "delivered") {
      aside = (
        <>
          {banner("Your Order has Delivered Successfully", "delivered")}
          <div className="mt-4"><NewArrivals products={arrivals} fmt={short} tall flush /></div>
        </>
      );
    } else if (sh.status === "failed") {
      const done = reattempted[item.id];
      aside = (
        <>
          {banner("Delivery Attempt Unsuccessful", "failed")}
          <div className="space-y-3 px-2 pt-3">
            <p className="flex justify-between gap-3 text-[14px]">
              <span>Reason for Failed Delivery:</span>
              <span className="text-[#465a64]">{sh.failureReason}</span>
            </p>
            <button
              type="button"
              disabled={done}
              onClick={() => { setReattempted((m) => ({ ...m, [item.id]: true })); flash("Reattempt requested — we’ll try delivering again within 24–48 hrs"); }}
              className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-60"
              style={{ background: brand }}
            >
              {done ? "Reattempt Requested" : <>Reattempt <RotateCw className="size-3.5" /></>}
            </button>
            {done && <p className="text-[12.5px] text-[#465a64]">Our courier partner will contact you before the next attempt.</p>}
          </div>
        </>
      );
    } else if (sh.status === "cancelled" || sh.status === "return_in_progress" || sh.status === "refunded") {
      const [text, label, note] =
        sh.status === "cancelled"
          ? ["This item was cancelled", "Refund amount:", "Refunded to your original payment method within 5–7 business days."]
          : sh.status === "return_in_progress"
            ? ["Your return is in progress", "Refund amount:", `Refunded to ${o.cod ? "your bank account" : "your original payment method"} within 5–7 business days of pickup.`]
            : ["Your refund has been issued", "Refunded:", `Credited to ${o.cod ? "your bank account" : "your original payment method"} on ${fmtLong(at(sh.ret!.refunded!))}. It can take 2–3 days to show up.`];
      aside = (
        <>
          {banner(text, sh.status === "cancelled" ? "failed" : "delivered")}
          {reasonBlock(label, money(sh.ret?.amount ?? amount), note)}
          <div className="mt-5"><NewArrivals products={arrivals} fmt={short} tall flush title="Meanwhile, Explore Our New Arrivals" /></div>
        </>
      );
    } else {
      const text = sh.status === "packed" ? "Packed and ready to ship" : sh.status === "in_transit" ? "Your order is on its way! will reach you soon..." : "Out for delivery, arriving today";
      aside = (
        <>
          {banner(text, "transit")}
          <div className="mt-4"><NewArrivals products={arrivals} fmt={short} tall flush title="Meanwhile, Explore Our New Arrivals" /></div>
        </>
      );
    }

    return (
      <div className="space-y-4">
        <PageTitle>My Orders</PageTitle>
        {headerCard({
          trail: [{ label: "Orders", to: () => go({ page: "orders" }) }, { label: `Order #${o.id}`, to: () => go({ page: "order", id: o.id }) }, { label: title }],
          title,
          copy: sh.awb,
          onBack: () => go({ page: "order", id: o.id }),
          actions: deliveredActions,
        })}
        <div className="grid gap-4 @3xl:grid-cols-[minmax(0,1fr)_minmax(0,280px)] @3xl:items-start">
          <Card className="p-3.5">
            <GrayHead right={<Badge tone={STATUS_TONE[sh.status]}>{badgeText}</Badge>}>Order Info</GrayHead>
            {infoRows(o)}
            <GrayHead>Order Timeline</GrayHead>
            <div className="flex items-start gap-3 px-1 py-3">
              <DemoImg src={p?.image} alt="" className="size-[46px] shrink-0 border border-[#ebebeb] object-cover" />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate text-[13.5px] font-medium">{p?.title}</p>
                  <Chip>x {qtyOf(item)} Qty</Chip>
                </div>
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <p className="text-[13px]">{money(priceOf(item))}</p>
                  {sh.status === "delivered" && (
                    <div className="flex gap-1" role="radiogroup" aria-label="Rate this item">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button key={n} type="button" aria-label={`${n} star${n > 1 ? "s" : ""}`} onClick={() => setRatings((r) => ({ ...r, [item.id]: n }))}>
                          <Star className={`size-3.5 ${n <= (ratings[item.id] ?? 0) ? "fill-[#f4a340] text-[#f4a340]" : "text-[#556e7a]"}`} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {returnUntil && <p className="mt-1 text-[11.5px]">Return available until {fmtDay(returnUntil)}</p>}
              </div>
            </div>
            <div className="px-1 pb-2">
              {timeline(`${item.id}-${sh.status}`, eventsFor(sh, money))}
            </div>
          </Card>
          <Card className="p-3.5">{aside}</Card>
        </div>
      </div>
    );
  }

  function profilePage() {
    const field = (label: string, value: string, verified?: boolean, help?: string) => (
      <label className="block">
        <span className="text-[12px]">{label}</span>
        <span className="mt-1.5 flex items-center border border-[#ebebeb] bg-white px-3">
          <input defaultValue={value} className="h-9 w-full bg-transparent text-[13.5px] outline-none" />
          {verified && <CircleCheck className="size-4 shrink-0 fill-[#0e8c3a] text-white" />}
        </span>
        {help && <span className="mt-1.5 block text-[11.5px] text-[#465a64]">{help}</span>}
      </label>
    );
    return (
      <div className="space-y-4">
        <PageTitle>My Profile</PageTitle>
        <div className="grid gap-x-5 gap-y-4 border-b border-[#ebebeb] pb-6 @xl:grid-cols-2">
          {field("First Name", DEFAULT_ADDR.first)}
          {field("Last Name", DEFAULT_ADDR.last)}
          {field("Email ID", DEFAULT_EMAIL, true)}
          {field("Phone Number", `+91${PHONE}`, true)}
          {field("Date of Birth", "14/03/1994", false, "Add your birthday to get a special offer every year")}
          <label className="block">
            <span className="text-[12px]">Gender</span>
            <span className="relative mt-1.5 flex items-center border border-[#ebebeb] bg-white">
              <select value={gender} onChange={(e) => setGender(e.target.value)} className="h-9 w-full appearance-none bg-transparent px-3 text-[13.5px] outline-none">
                {["Male", "Female", "Other", "Prefer not to say"].map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 size-4" />
            </span>
          </label>
        </div>
        <NewArrivals products={arrivals} fmt={short} tall />
      </div>
    );
  }

  function addressPage() {
    const editing = editingAddr;
    const setEditing = setEditingAddr;
    return (
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <PageTitle>My Address</PageTitle>
          <button type="button" onClick={() => setEditing("new")} className="flex items-center gap-1.5 border bg-white px-3 py-1.5 text-[13px] font-medium" style={{ borderColor: brand, color: brand }}>
            Add New Address <Plus className="size-4" />
          </button>
        </div>
        <div className="grid gap-4 border-b border-[#ebebeb] pb-6 @2xl:grid-cols-2">
          {addresses.map((a) => (
            <Card key={a.id} className="flex flex-col">
              <div className="flex-1 px-4 pt-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 text-[14px]">
                    <p className="flex items-center gap-2"><IdCard className="size-4" /> Name: {a.name}</p>
                    <p className="flex items-center gap-2"><Phone className="size-3.5" /> Phone No: {a.phone}</p>
                  </div>
                  <div className="flex gap-1.5">
                    <Badge tone="neutral"><span className="capitalize">{a.label}</span></Badge>
                    {a.isDefault && <Badge tone="danger">Default</Badge>}
                  </div>
                </div>
                <p className="mt-2.5 pb-3.5 text-[12.5px] leading-snug text-[#465a64]">{addrLine(a)}</p>
              </div>
              <div className="flex items-center border-t border-[#ebebeb] text-[13px]">
                <button type="button" onClick={() => setEditing(a)} className="flex items-center gap-1.5 border-r border-[#ebebeb] px-4 py-2.5 hover:bg-[#f8f8f8]">
                  <Pencil className="size-3.5" /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAddresses((list) => {
                      const next = list.filter((x) => x.id !== a.id);
                      if (a.isDefault && next.length) next[0] = { ...next[0], isDefault: true };
                      return next;
                    });
                    flash("Address removed");
                  }}
                  className="flex items-center gap-1.5 px-4 py-2.5 hover:bg-[#f8f8f8]"
                >
                  <Trash2 className="size-3.5" /> Remove
                </button>
                {a.isDefault ? (
                  <span className="ml-auto pr-4 text-[11.5px] text-[#465a64]">Used at checkout by default</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setAddresses((list) => list.map((x) => ({ ...x, isDefault: x.id === a.id })))}
                    className="ml-auto flex items-center gap-1.5 pr-4 hover:underline"
                  >
                    <CircleCheck className="size-3.5" /> Set as Default
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
        <NewArrivals products={arrivals} fmt={short} tall />
        {editing && (
          <AddressModal
            key={editing === "new" ? "new" : editing.id}
            initial={editing === "new" ? null : editing}
            nextId={`a${addresses.length + 3}`}
            brand={brand}
            onClose={() => setEditing(null)}
            onSave={(a) => {
              setAddresses((list) => {
                let next = editing === "new" ? [...list, a] : list.map((x) => (x.id === a.id ? a : x));
                if (a.isDefault || next.length === 1) next = next.map((x) => ({ ...x, isDefault: x.id === a.id || (!a.isDefault && x.isDefault) }));
                return next;
              });
              setEditing(null);
              flash(editing === "new" ? "Address added" : "Address updated");
            }}
          />
        )}
      </div>
    );
  }

  function chatPage() {
    const domain = store.brandName.toLowerCase().replace(/[^a-z0-9]/g, "") || "store";
    const channels = [
      { title: "WhatsApp", body: "Chat with our care team, 10 AM – 7 PM, Mon–Sat.", Icon: MessageCircle },
      { title: "Email", body: `care@${domain}.com — we reply within 24 hours.`, Icon: Mail },
      { title: "Call", body: `${DEFAULT_PHONE} — 10 AM – 7 PM, Mon–Sat.`, Icon: Phone },
    ];
    return (
      <div className="space-y-4">
        <PageTitle>Chat with us</PageTitle>
        <Card className="p-4">
          <p className="text-[14px] text-[#465a64]">Questions about an order, sizing or returns? Reach us on any channel below.</p>
          <div className="mt-3.5 grid gap-3 @2xl:grid-cols-3">
            {channels.map(({ title, body, Icon }) => (
              <div key={title} className="flex items-start gap-3 border border-[#ebebeb] p-3 hover:bg-[#fafafa]">
                <span className="flex size-9 shrink-0 items-center justify-center bg-[#f1f1f1]"><Icon className="size-4" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-medium">{title}</span>
                  <span className="block text-[12.5px] text-[#465a64]">{body}</span>
                </span>
                <ArrowUpRight className="size-3.5 shrink-0 text-[#556e7a]" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  function faqsPage() {
    const faqs = [
      { q: "How do I track my order?", a: "Go to Orders, open an order and tap any item to see its AWB number and live tracking timeline." },
      { q: "Can I edit an order after placing it?", a: "Orders saved as drafts can be edited from Orders → Edit Order Details. Placed orders can’t be edited once they’re packed." },
      { q: "What if my delivery attempt failed?", a: "Open the item and choose “Reattempt”. Our courier partner will contact you before the next attempt." },
      { q: "How do returns work?", a: "Delivered items can be returned from the item page via “Initiate Return”. We schedule a free pickup and refund within 5–7 business days." },
      { q: "How do I change my default address?", a: "Go to Address and tap “Set as Default” on the address you want. You can also tick “Make this my default address” while adding or editing one." },
    ];
    return (
      <div className="space-y-4">
        <PageTitle>FAQs</PageTitle>
        <Card className="px-4 py-2">
          {faqs.map((f) => (
            <details key={f.q} className="group border-b border-[#ebebeb]">
              <summary className="flex cursor-pointer list-none items-center justify-between py-3.5 text-[14px] font-medium [&::-webkit-details-marker]:hidden">
                {f.q}
                <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
              </summary>
              <p className="pb-3.5 text-[13px] text-[#465a64]">{f.a}</p>
            </details>
          ))}
        </Card>
      </div>
    );
  }

  function editPage() {
    return (
      <div className="space-y-4">
        <PageTitle>My Orders</PageTitle>
        {headerCard({ trail: [{ label: "Orders", to: () => go({ page: "orders" }) }, { label: "Edit Order" }], title: "Edit Order Details", onBack: () => go({ page: "orders" }) })}
        <div className="overflow-hidden bg-white">
          <DemoMock store={store} pageContext="account" />
        </div>
      </div>
    );
  }

  const initials = `${DEFAULT_ADDR.first[0]}${DEFAULT_ADDR.last[0]}`;

  return (
    <div className={`${font.className} @container relative`} style={{ color: TEXT }}>
      <div ref={scroller} className="no-scrollbar overflow-y-auto bg-[#fafafa]" style={{ maxHeight, height: maxHeight }}>
        {/* storefront header — announcement bar, nav · logo · search/account/cart */}
        <div className="bg-[#232322] px-4 py-1.5 text-center text-[10.5px] font-medium uppercase tracking-wide text-white">
          Free shipping on prepaid orders | Easy 7-day returns | New arrivals are live now
        </div>
        <header className="grid grid-cols-[1fr_auto_1fr] items-center border-b border-[#ebebeb] bg-white px-5" style={{ height: 64 }}>
          <nav className="hidden gap-4 text-[12px] font-semibold uppercase @2xl:flex">
            <span className="flex items-center gap-0.5">Shop <ChevronDown className="size-3" /></span>
            <span className="flex items-center gap-0.5">New Arrivals <ChevronDown className="size-3" /></span>
            <span>About Us</span>
            <span>Contact Us</span>
          </nav>
          {store.logo ? (
            // eslint-disable-next-line @next/next/no-img-element -- store favicon/logo
            <img src={store.logo} alt={store.brandName} className="col-start-2 h-10 w-auto max-w-[140px] object-contain" referrerPolicy="no-referrer" />
          ) : (
            <span className="col-start-2 border-2 px-3 py-0.5 text-[16px] font-bold uppercase tracking-[0.3em]" style={{ borderColor: brand, color: brand }}>
              {store.brandName}
            </span>
          )}
          <div className="col-start-3 flex items-center justify-end gap-4 text-[9.5px] font-semibold uppercase">
            <span className="flex items-center gap-1"><Search className="size-4" /> Search</span>
            <button type="button" onClick={() => go({ page: "orders" })} className="uppercase transition-opacity hover:opacity-60">
              Account
            </button>
            <span className="border-l border-[#ebebeb] py-5 pl-4">Cart</span>
          </div>
        </header>

        {view.page === "logged-out" ? (
          <div className="flex flex-col items-center gap-4 px-6 py-24 text-center">
            <h3 className="text-[22px] font-bold">You’ve been logged out</h3>
            <p className="text-[14px] text-[#465a64]">See you again soon.</p>
            <button type="button" onClick={() => go({ page: "orders" })} className="px-5 py-2 text-[13px] font-semibold text-white" style={{ background: brand }}>
              Log in again
            </button>
          </div>
        ) : (
          <div className="mx-auto grid max-w-[1100px] gap-6 px-5 py-6 @3xl:grid-cols-[200px_1fr]">
            {/* sidebar */}
            <aside className="space-y-3 @max-3xl:hidden">
              <button type="button" className="flex items-center gap-2 px-1 py-1 text-[14px]">
                <CircleArrowLeft className="size-4" /> Back to Shopping
              </button>
              <div className="bg-white p-3.5">
                <span className="flex size-10 items-center justify-center rounded-full bg-[#252525] text-[14px] font-bold text-white">{initials}</span>
                <p className="mt-2.5 text-[15px] font-semibold">{NAME}</p>
                <p className="truncate text-[12.5px] text-[#465a64]">{DEFAULT_EMAIL}</p>
                <p className="text-[12.5px] text-[#465a64]">{DEFAULT_PHONE}</p>
              </div>
              <nav className="bg-white">
                {NAV.map(({ page, label, Icon }) => {
                  const on = navActive === page;
                  return (
                    <button
                      key={page}
                      type="button"
                      onClick={() => go({ page } as View)}
                      className={`relative flex w-full items-center gap-2.5 border-b border-[#ebebeb] px-3.5 py-3 text-left text-[14.5px] last:border-b-0 ${on ? "font-semibold" : "hover:bg-[#fafafa]"}`}
                      style={on ? { background: `linear-gradient(90deg, ${brand}14, transparent 70%)` } : undefined}
                    >
                      {on && <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: brand }} />}
                      <Icon className="size-4" />
                      {label}
                      {page === "orders" && <span className="ml-auto rounded-full bg-[#eceff1] px-1.5 text-[10px] font-normal">{ORDERS.length}</span>}
                    </button>
                  );
                })}
              </nav>
              <button type="button" onClick={() => go({ page: "logged-out" })} className="flex w-full items-center gap-2.5 bg-white px-3.5 py-3 text-[14.5px]" style={{ color: brand }}>
                <LogOut className="size-4" /> Logout
              </button>
            </aside>

            {/* narrow windows: the sidebar becomes a tab strip */}
            <nav className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto @3xl:hidden">
              {NAV.map(({ page, label }) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => go({ page } as View)}
                  className={`shrink-0 border-b-2 px-3 py-1.5 text-[13px] ${navActive === page ? "font-semibold" : "border-transparent text-[#465a64]"}`}
                  style={navActive === page ? { borderColor: brand } : undefined}
                >
                  {label}
                </button>
              ))}
            </nav>

            <main className="min-w-0">
              {view.page === "orders" && ordersPage()}
              {view.page === "order" && orderPage(view.id)}
              {view.page === "item" && itemPage(view.id, view.item)}
              {view.page === "edit" && editPage()}
              {view.page === "profile" && profilePage()}
              {view.page === "addresses" && addressPage()}
              {view.page === "chat" && chatPage()}
              {view.page === "faqs" && faqsPage()}
            </main>
          </div>
        )}
      </div>

      {toast && (
        <div className="pointer-events-none absolute bottom-4 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap bg-[#252525] px-4 py-2 text-[13px] text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
