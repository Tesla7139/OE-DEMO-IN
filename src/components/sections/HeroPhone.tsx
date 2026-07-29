"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Loader2,
  Lock,
  MapPin,
  MousePointer2,
  Pencil,
  Plus,
  Sparkles,
  Tag,
  TrendingUp,
  TriangleAlert,
  UserRound,
  X,
  Zap,
} from "lucide-react";
import { DEFAULT_ADDR } from "@/lib/demo-customer";

const BRAND = "#2f5bff";
const money = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

/* scene timeline (auto-advancing, looping) */
const SCENES = ["confirmed", "editing", "address", "upsell", "analytics"] as const;
const DURATIONS = [2000, 3000, 4800, 3600, 4600];

const UPSELLS = [
  { title: "Everyday Tote", price: 64 },
  { title: "Trail Runner 2.0", price: 128 },
  { title: "Wool Beanie", price: 32 },
];

const SPARKLES = [
  { x: "10%", y: "20%", d: 0 },
  { x: "86%", y: "14%", d: 0.1 },
  { x: "92%", y: "58%", d: 0.05 },
  { x: "6%", y: "66%", d: 0.16 },
  { x: "78%", y: "86%", d: 0.12 },
  { x: "20%", y: "90%", d: 0.2 },
];

export function HeroPhone() {
  const [step, setStep] = useState(0);
  const [flash, setFlash] = useState(false);

  const triggerFlash = useCallback(() => {
    setFlash(true);
    setTimeout(() => setFlash(false), 1400);
  }, []);

  // edit-window countdown
  const [secondsLeft, setSecondsLeft] = useState(15 * 60 - 1);
  useEffect(() => {
    const id = setInterval(() => setSecondsLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, []);
  const mm = Math.floor(secondsLeft / 60);
  const ss = (secondsLeft % 60).toString().padStart(2, "0");
  const countdown = `${mm} minute${mm === 1 ? "" : "s"} and ${ss} seconds`;

  // scene advance + loop
  useEffect(() => {
    const t = setTimeout(() => setStep((s) => (s + 1) % SCENES.length), DURATIONS[step]);
    return () => clearTimeout(t);
  }, [step]);

  const scene = SCENES[step];

  return (
    <div className="relative mx-auto flex w-full max-w-[600px] items-center justify-center">
      {/* dotted backdrop that glows on save */}
      <motion.div
        aria-hidden
        animate={{ opacity: flash ? 1 : 0.3, scale: flash ? 1.05 : 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="pointer-events-none absolute inset-0 -z-0"
        style={{
          backgroundImage: `radial-gradient(circle, ${
            flash ? "rgba(47,91,255,0.4)" : "rgba(47,91,255,0.14)"
          } 1.1px, transparent 1.1px)`,
          backgroundSize: "16px 16px",
          maskImage: "radial-gradient(circle at center, black 25%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(circle at center, black 25%, transparent 75%)",
        }}
      />

      {/* glow + sparkles on save */}
      <AnimatePresence>
        {flash && (
          <>
            <motion.div
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 0.5, scale: 1.1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="pointer-events-none absolute inset-0 -z-0 rounded-full blur-3xl"
              style={{ background: "radial-gradient(circle, rgba(47,91,255,0.3), transparent 60%)" }}
            />
            {SPARKLES.map((s, i) => (
              <motion.span
                key={i}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [0, 1, 0], opacity: [0, 1, 0] }}
                transition={{ duration: 0.8, delay: s.d, ease: "easeOut" }}
                className="pointer-events-none absolute z-30"
                style={{ left: s.x, top: s.y, color: BRAND }}
              >
                <Sparkles className="size-5" />
              </motion.span>
            ))}
          </>
        )}
      </AnimatePresence>

      {/* floating metric cards (analytics scene) */}
      <AnimatePresence>
        {scene === "analytics" && (
          <>
            <FloatCard className="-left-5 top-2" delay={0.15} icon={TrendingUp} value="₹3,58,000" label="Upsell revenue" tint />
            <FloatCard className="-right-6 top-16" delay={0.3} icon={Zap} value="128" label="Upsells accepted" />
            <FloatCard className="-right-2 -bottom-4" delay={0.45} icon={Check} value="412" label="Tickets deflected" />
          </>
        )}
      </AnimatePresence>

      {/* browser window, with a gentle zoom on save */}
      <motion.div
        animate={{ scale: flash ? 1.025 : 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full"
      >
        <BrowserFrame>
          <div className="grid h-full grid-cols-[1fr_minmax(0,210px)]">
            {/* LEFT: editing panel (crossfades per scene) */}
            <div className="relative overflow-hidden border-r border-neutral-200">
              <AnimatePresence mode="wait">
                {scene === "confirmed" && <ConfirmedBody key="confirmed" />}
                {scene === "editing" && <EditingBody key="editing" countdown={countdown} />}
                {scene === "address" && <AddressBody key="address" onSaved={triggerFlash} />}
                {scene === "upsell" && <UpsellBody key="upsell" />}
                {scene === "analytics" && <AnalyticsBody key="analytics" />}
              </AnimatePresence>
            </div>

            {/* RIGHT: order summary sidebar (constant) */}
            <Sidebar added={scene === "upsell" || scene === "analytics"} />
          </div>
        </BrowserFrame>
      </motion.div>
    </div>
  );
}

/* ------------------------------ browser shell ----------------------------- */

function BrowserFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_36px_70px_-28px_rgba(15,15,40,0.45)]">
      {/* chrome bar */}
      <div className="flex items-center gap-3 border-b border-neutral-200 bg-neutral-50 px-4 py-2.5">
        <div className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-[#ff5f57]" />
          <span className="size-2.5 rounded-full bg-[#febc2e]" />
          <span className="size-2.5 rounded-full bg-[#28c840]" />
        </div>
        <div className="mx-auto flex w-[55%] items-center justify-center gap-1.5 rounded-md bg-white px-3 py-1 text-[11px] text-neutral-500 ring-1 ring-neutral-200">
          <Lock className="size-3 text-neutral-400" />
          yourstore.com/order
        </div>
      </div>
      {/* body */}
      <div className="h-[340px]">{children}</div>
    </div>
  );
}

const bodyMotion = {
  initial: { opacity: 0, x: 12 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -12 },
  transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const },
};

/* --------------------------------- bodies --------------------------------- */

function ConfirmedBody() {
  return (
    <motion.div {...bodyMotion} className="flex h-full flex-col items-center justify-center px-8 text-center">
      <motion.span
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 16 }}
        className="flex size-14 items-center justify-center rounded-full text-white"
        style={{ background: BRAND }}
      >
        <Check className="size-7" strokeWidth={3} />
      </motion.span>
      <div className="mt-3 text-[10px] font-medium uppercase tracking-wide text-neutral-400">
        Confirmation #JDTNH5Z6N
      </div>
      <div className="mt-1 text-lg font-bold text-neutral-900">Order confirmed</div>
      <p className="mt-1 text-[12px] text-neutral-500">Thank you, {DEFAULT_ADDR.first}! A receipt is on its way.</p>
    </motion.div>
  );
}

function EditingBody({ countdown }: { countdown: string }) {
  return (
    <motion.div {...bodyMotion} className="flex h-full flex-col p-4">
      <div className="mb-2.5 flex items-center gap-2.5">
        <span
          className="flex size-7 items-center justify-center rounded-full border-2"
          style={{ borderColor: BRAND, color: BRAND }}
        >
          <Check className="size-3.5" strokeWidth={3} />
        </span>
        <div className="min-w-0">
          <div className="text-[9px] text-neutral-500">#JDTNH5Z6N</div>
          <div className="truncate text-[13px] font-bold text-neutral-900">Thank you, {DEFAULT_ADDR.first}!</div>
        </div>
      </div>

      <h3 className="mb-2 text-[12px] font-bold text-neutral-900">Make changes to your order</h3>

      <div className="mb-2.5 flex items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-2 text-[10px] leading-snug text-neutral-700">
        <TriangleAlert className="mt-0.5 size-3 shrink-0 text-amber-500" />
        <span>
          You can make changes for another{" "}
          <span className="font-semibold tabular-nums text-red-500">{countdown}</span>
        </span>
      </div>

      <div className="flex flex-1 flex-col justify-center gap-1.5">
        <Opt icon={UserRound} label="Change Contact Information" />
        <Opt icon={MapPin} label="Edit Shipping Address" highlight />
        <Opt icon={Pencil} label="Update your order" />
        <Opt icon={Tag} label="Apply Discount Code" />
        <Opt icon={X} label="Cancel Your Order" />
      </div>
    </motion.div>
  );
}

// The address the hero types out on its own. Module-scope so the "still typing"
// check below stays in sync with the string's real length.
const TYPED_ADDR = "C-42, Greater Kailash I";
const TYPED_CITY = "New Delhi";
const TYPED_PIN = "110048";
const TYPED_STATE = "Delhi";

function AddressBody({ onSaved }: { onSaved: () => void }) {
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [zip, setZip] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const A = TYPED_ADDR;
    const C = TYPED_CITY;
    const Z = TYPED_PIN;
    let ai = 0;
    let ci = 0;
    let zi = 0;
    const typer = setInterval(() => {
      if (ai < A.length) setAddress(A.slice(0, ++ai));
      else if (ci < C.length) setCity(C.slice(0, ++ci));
      else if (zi < Z.length) setZip(Z.slice(0, ++zi));
      else clearInterval(typer);
    }, 60);
    const save = setTimeout(() => {
      setSaved(true);
      onSaved();
    }, 3000);
    return () => {
      clearInterval(typer);
      clearTimeout(save);
    };
  }, [onSaved]);

  return (
    <motion.div {...bodyMotion} className="relative flex h-full flex-col p-4">
      <div className="mb-3 flex items-center gap-2">
        <ArrowLeft className="size-4 text-neutral-500" />
        <span className="text-[13px] font-bold text-neutral-900">Edit shipping address</span>
      </div>

      <Field label="Address 1" value={address} typing={!saved && address.length < TYPED_ADDR.length} />
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Field label="City" value={city} />
        <Field label="PIN code" value={zip} />
      </div>
      <Field label="State" value={TYPED_STATE} className="mt-2" />

      <button
        className="mt-auto flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-[12px] font-semibold text-white transition-colors"
        style={{ background: saved ? "#16a34a" : BRAND }}
      >
        {saved ? (
          <>
            <Check className="size-4" strokeWidth={3} /> Address saved
          </>
        ) : (
          "Save address"
        )}
      </button>

      {!saved && (
        <motion.div
          initial={{ opacity: 0, x: 26, y: 26 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          transition={{ duration: 0.6, delay: 1.9 }}
          className="pointer-events-none absolute bottom-4 left-1/2 z-20"
        >
          <motion.span
            animate={{ scale: [1, 1.7, 1], opacity: [0.4, 0, 0.4] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="absolute -left-2 -top-2 size-7 rounded-full"
            style={{ background: BRAND, opacity: 0.25 }}
          />
          <MousePointer2 className="size-4 fill-neutral-900 text-white drop-shadow" />
        </motion.div>
      )}
    </motion.div>
  );
}

function UpsellBody() {
  const [phase, setPhase] = useState<"offer" | "processing" | "added">("offer");
  useEffect(() => {
    const a = setTimeout(() => setPhase("processing"), 1600);
    const b = setTimeout(() => setPhase("added"), 2700);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, []);

  return (
    <motion.div {...bodyMotion} className="relative flex h-full flex-col p-4">
      <div className="flex items-center gap-1.5 text-[13px] font-bold text-neutral-900">
        <Plus className="size-4 text-primary" /> You may also like these products
      </div>
      <p className="mb-3 mt-0.5 text-[10px] text-neutral-500">
        Frequently bought together — ships in the same box.
      </p>

      <div className="grid flex-1 grid-cols-3 gap-2.5">
        {UPSELLS.map((p, i) => {
          const isAdded = i === 0 && phase === "added";
          return (
            <div key={p.title} className="flex flex-col rounded-xl border border-neutral-200 p-2">
              <div className="mb-2 aspect-square w-full rounded-lg bg-neutral-100" />
              <div className="line-clamp-2 text-[11px] font-medium leading-tight text-neutral-800">
                {p.title}
              </div>
              <div className="mt-0.5 text-[11px] text-neutral-500">{money(p.price)}</div>
              <button
                className="mt-auto flex items-center justify-center gap-1 rounded-md py-1.5 text-[10px] font-semibold text-white"
                style={{ background: isAdded ? "#16a34a" : BRAND }}
              >
                {isAdded ? <Check className="size-3" /> : <Plus className="size-3" />}
                {isAdded ? "Added" : "Add to order"}
              </button>
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {phase === "processing" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 flex items-center justify-center bg-white/60 backdrop-blur-[2px]"
          >
            <div className="flex flex-col items-center gap-2 rounded-2xl bg-white px-5 py-4 shadow-soft-xl">
              <Loader2 className="size-6 animate-spin" style={{ color: BRAND }} />
              <span className="text-[11px] font-medium text-neutral-600">Syncing with your order…</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function AnalyticsBody() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setOn(true), 250);
    return () => clearTimeout(t);
  }, []);
  const bars = [38, 52, 46, 64, 58, 78, 96];
  return (
    <motion.div {...bodyMotion} className="flex h-full flex-col p-4">
      <div className="text-[13px] font-bold text-neutral-900">Your impact this month</div>
      <p className="mb-3 mt-0.5 text-[10px] text-neutral-500">Updated in real time</p>

      <div className="mb-3 grid grid-cols-2 gap-2">
        <MiniStat label="Revenue added" value="₹3.6L" tint />
        <MiniStat label="AOV lift" value="+18%" />
      </div>

      <div className="flex flex-1 flex-col rounded-2xl border border-neutral-200 p-3">
        <div className="mb-2 text-[10px] font-bold text-neutral-900">Upsell revenue / week</div>
        <div className="flex flex-1 items-end gap-1.5">
          {bars.map((h, i) => (
            <motion.div
              key={i}
              initial={{ height: 0 }}
              animate={{ height: on ? `${h}%` : 0 }}
              transition={{ duration: 0.6, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
              className="flex-1 rounded-t-md"
              style={{ background: i === bars.length - 1 ? BRAND : "rgba(47,91,255,0.25)" }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/* -------------------------------- sidebar --------------------------------- */

function Sidebar({ added }: { added: boolean }) {
  const subtotal = 89 + (added ? 64 : 0);
  return (
    <aside className="flex flex-col bg-neutral-50 p-3.5">
      <div className="mb-3 text-[11px] font-bold text-neutral-900">Order summary</div>
      <div className="flex flex-col gap-2.5">
        <SummaryItem title="Merino Wool Crew" qty={1} price={89} />
        <AnimatePresence>
          {added && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="overflow-hidden">
              <SummaryItem title="Everyday Tote" qty={1} price={64} highlight />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-auto space-y-1 border-t border-neutral-200 pt-2.5 text-[11px]">
        <Row label="Subtotal" value={money(subtotal)} />
        <Row label="Shipping" value="FREE" />
      </div>
      <div className="mt-2 flex items-baseline justify-between border-t border-neutral-200 pt-2">
        <span className="text-[12px] font-bold text-neutral-900">Total</span>
        <span className="text-[14px] font-bold text-neutral-900">{money(subtotal)}</span>
      </div>
    </aside>
  );
}

function SummaryItem({ title, qty, price, highlight }: { title: string; qty: number; price: number; highlight?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative">
        <div className="size-9 shrink-0 rounded-lg border border-neutral-200 bg-neutral-100" />
        <span className="absolute -right-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full bg-neutral-900 text-[9px] font-bold text-white">
          {qty}
        </span>
      </div>
      <div className={`min-w-0 flex-1 text-[10px] font-medium ${highlight ? "text-primary" : "text-neutral-800"}`}>
        {title}
      </div>
      <div className="text-[10px] font-semibold text-neutral-900">{money(price)}</div>
    </div>
  );
}

/* --------------------------------- atoms ---------------------------------- */

function FloatCard({
  className,
  delay,
  icon: Icon,
  value,
  label,
  tint,
}: {
  className: string;
  delay: number;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  value: string;
  label: string;
  tint?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.7, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.7 }}
      transition={{ delay, type: "spring", stiffness: 220, damping: 18 }}
      className={`absolute z-40 flex items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-3 py-2 shadow-[0_16px_40px_-16px_rgba(15,15,40,0.35)] ${className}`}
    >
      <span
        className="flex size-7 items-center justify-center rounded-full"
        style={{ background: tint ? BRAND : "rgba(47,91,255,0.1)" }}
      >
        <Icon className="size-3.5" style={{ color: tint ? "#fff" : BRAND }} />
      </span>
      <div>
        <div className="text-[13px] font-bold leading-none text-neutral-900">{value}</div>
        <div className="mt-0.5 text-[9px] text-neutral-500">{label}</div>
      </div>
    </motion.div>
  );
}

function Opt({
  icon: Icon,
  label,
  highlight,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 ${
        highlight ? "border-primary/40 bg-primary/[0.04] ring-1 ring-primary/15" : "border-neutral-200"
      }`}
    >
      <Icon className="size-4 shrink-0 text-neutral-600" />
      <span className="flex-1 text-[11px] font-semibold text-neutral-800">{label}</span>
      <ChevronDown className="size-3.5 text-neutral-400" />
    </div>
  );
}

function Field({ label, value, typing, className = "" }: { label: string; value: string; typing?: boolean; className?: string }) {
  return (
    <div className={`relative rounded-md border border-neutral-200 px-3 pb-1.5 pt-4 ${className}`}>
      <span className="pointer-events-none absolute left-3 top-1 text-[9px] font-medium uppercase tracking-wide text-neutral-400">
        {label}
      </span>
      <div className="text-[12px] text-neutral-800">
        {value || " "}
        {typing && <span className="ml-px inline-block h-3 w-px animate-pulse bg-neutral-800 align-middle" />}
      </div>
    </div>
  );
}

function MiniStat({ label, value, tint }: { label: string; value: string; tint?: boolean }) {
  return (
    <div className={`rounded-xl border p-2.5 ${tint ? "border-primary/20 bg-primary/[0.05]" : "border-neutral-200"}`}>
      <div className="text-[15px] font-bold text-neutral-900">{value}</div>
      <div className="text-[9px] text-neutral-500">{label}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-neutral-600">
      <span>{label}</span>
      <span className="font-medium text-neutral-900">{value}</span>
    </div>
  );
}
