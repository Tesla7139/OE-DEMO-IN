"use client";

import { useState } from "react";
import { ArrowLeft, CalendarDays, Check, ChevronDown, ChevronsUpDown, Info, Search } from "lucide-react";
import type { DemoStore, DemoProduct } from "@/lib/site";
import { AppHeader } from "./AppHeader";

// Mirrors the live app's Analytics screen (Overview / Edit Activity / Upsell),
// populated with deterministic demo numbers instead of a fresh store's zeros.

const TEAL = "#0d9488";
const GREEN = "#15803d";
const SLATE = "#94a3b8";
const PREV = "#60a5fa";

/** Polaris-style card: white, soft ring, gentle bottom shadow. */
const CARD = "rounded-xl bg-white shadow-[0_1px_0_rgba(0,0,0,0.08),0_0_0_1px_rgba(0,0,0,0.07)]";

// en-IN gives lakh/crore digit grouping (₹1,20,000 not ₹120,000).
function amount(n: number, currency: string) {
  return `${currency} ${new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)}`;
}
function price(n: number, currency: string) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
}

// Date ranges end on a fixed day (SSR-safe: no Date.now, no locale/timezone formatting).
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_MS = 86_400_000;
const END = Date.UTC(2026, 9, 29);
const RANGES = [
  { days: 7, label: "Last 7 days" },
  { days: 14, label: "Last 14 days" },
  { days: 30, label: "Last 30 days" },
  { days: 90, label: "Last 90 days" },
] as const;
type RangeDays = (typeof RANGES)[number]["days"];

const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
/** "Sep 29"-style labels for the `n` days leading up to END. */
function dayLabels(n: number) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(END - (n - i) * DAY_MS);
    return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
  });
}

/** Deterministic `n`-point series (SSR-safe: no Math.random / Date). */
function series(base: number, swing: number, seed: number, n = 30) {
  return Array.from({ length: n }, (_, i) =>
    Math.max(0, Math.round(base + swing * Math.sin((i + seed) / 3.1) + (swing * 0.5) * Math.sin((i + seed) / 1.4) + i * (base * 0.36) / n))
  );
}

/** Round up to a 1 / 2 / 2.5 / 5 × 10ⁿ step so the axis reads cleanly. */
function niceMax(v: number) {
  if (v <= 10) return 10;
  const p = 10 ** Math.floor(Math.log10(v));
  return ([1, 2, 2.5, 5, 10].find((m) => m * p >= v) ?? 10) * p;
}
function compact(n: number) {
  return n >= 1000 ? `${+(n / 1000).toFixed(1)}k` : String(n);
}

function LineChart({
  days,
  data,
  prev,
  color,
  label,
  format = String,
}: {
  days: string[];
  data: number[];
  prev?: number[];
  color: string;
  label: string;
  format?: (n: number) => string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 720, H = 180;
  const max = niceMax(Math.max(...data, ...(prev ?? [])));
  const x = (i: number) => (i / (data.length - 1)) * W;
  const y = (v: number) => (1 - v / max) * H;
  const pts = (d: number[]) => d.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const pct = (i: number) => (i / (data.length - 1)) * 100;
  const tickEvery = Math.ceil(data.length / 10); // ~10 dates on the x axis

  return (
    <div>
      <div className="flex gap-2">
        {/* y axis */}
        <div className="relative w-9 shrink-0 text-right text-[10.5px] text-neutral-500" style={{ height: H }}>
          {[1, 0.5, 0].map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2" style={{ top: `${(1 - t) * 100}%` }}>
              {compact(max * t)}
            </span>
          ))}
        </div>
        <div
          className="relative flex-1"
          style={{ height: H }}
          onMouseMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            setHover(Math.round(((e.clientX - r.left) / r.width) * (data.length - 1)));
          }}
          onMouseLeave={() => setHover(null)}
        >
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
            {[0, 0.5, 1].map((t) => (
              <line key={t} x1={0} x2={W} y1={t * H} y2={t * H} stroke="#e5e7eb" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            ))}
            {prev && <polyline points={pts(prev)} fill="none" stroke={PREV} strokeWidth="2" strokeDasharray="2 4" vectorEffect="non-scaling-stroke" />}
            <polyline points={pts(data)} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          </svg>
          {hover !== null && (
            <>
              <div className="pointer-events-none absolute inset-y-0 w-px bg-neutral-300" style={{ left: `${pct(hover)}%` }} />
              <div
                className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white"
                style={{ left: `${pct(hover)}%`, top: `${(1 - data[hover] / max) * 100}%`, background: color }}
              />
              <div
                className={`pointer-events-none absolute top-0 z-10 w-44 rounded-lg bg-white p-2.5 text-[11.5px] shadow-lg ring-1 ring-black/5 ${hover > data.length / 2 ? "-translate-x-[calc(100%+10px)]" : "translate-x-2.5"}`}
                style={{ left: `${pct(hover)}%` }}
              >
                <div className="mb-1.5 font-medium text-neutral-500">{days[hover]}</div>
                <div className="flex items-center gap-2">
                  <span className="h-0.5 w-3 rounded" style={{ background: color }} />
                  <span className="flex-1 text-neutral-700">{label}</span>
                  <span className="font-semibold text-neutral-900">{format(data[hover])}</span>
                </div>
                {prev && (
                  <div className="mt-1 flex items-center gap-2">
                    <span className="w-3 border-b-2 border-dotted" style={{ borderColor: PREV }} />
                    <span className="flex-1 text-neutral-700">Previous period</span>
                    <span className="font-semibold text-neutral-900">{format(prev[hover])}</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      {/* x axis */}
      <div className="relative ml-11 mt-2 h-4 text-[10.5px] text-neutral-500">
        {days.map((d, i) => i % tickEvery === 0 && (
          <span key={d} className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: `${pct(i)}%` }}>{d}</span>
        ))}
      </div>
      {/* legend */}
      <div className="mt-3 flex justify-center gap-5 text-[11.5px] text-neutral-600">
        <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4 rounded" style={{ background: color }} /> {label}</span>
        {prev && <span className="inline-flex items-center gap-1.5"><span className="w-4 border-b-2 border-dotted" style={{ borderColor: PREV }} /> Previous period</span>}
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: React.ReactNode }) {
  return (
    <div className={`${CARD} p-4`}>
      <div className="text-[13px] text-neutral-600">{label}</div>
      <div className="mt-1 text-[20px] font-bold text-neutral-900">{value}</div>
      {sub && <div className="mt-1 text-[12px] text-neutral-500">{sub}</div>}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center py-10 text-center">
      <Search className="size-8 text-neutral-400" />
      <div className="mt-3 text-[15px] font-bold text-neutral-900">No Items found</div>
      <div className="text-[12px] text-neutral-500">{text}</div>
    </div>
  );
}

const EDIT_TYPES = [
  { label: "Address Changed", pct: 0.3 },
  { label: "Contact Updated", pct: 0.15 },
  { label: "Quantity Changed", pct: 0.2 },
  { label: "Items Added (Upsell)", pct: 0.13 },
  { label: "Order Cancelled", pct: 0.05 },
  { label: "Discount Applied", pct: 0.06 },
  { label: "Shipping Method Changed", pct: 0.07 },
  { label: "Birthday Addition", pct: 0.04 },
] as const;
type EditType = (typeof EDIT_TYPES)[number]["label"];

const CANCELLATIONS = [
  { reason: "Changed my mind", prepaid: 4, cod: 7 },
  { reason: "Ordered by mistake", prepaid: 5, cod: 2 },
  { reason: "Found it cheaper elsewhere", prepaid: 2, cod: 3 },
  { reason: "Delivery too slow", prepaid: 1, cod: 2 },
];

const CUSTOMERS = ["Aarav Sharma", "Priya Nair", "Rohan Mehta", "Ananya Iyer", "Kabir Singh", "Isha Kapoor", "Vikram Rao", "Meera Joshi", "Arjun Reddy", "Sneha Patel"];
const RECENT_TYPES: EditType[] = [
  "Address Changed", "Items Added (Upsell)", "Quantity Changed", "Contact Updated", "Shipping Method Changed",
  "Address Changed", "Discount Applied", "Order Cancelled", "Birthday Addition", "Quantity Changed",
];
const RECENT_TIMES = ["Oct 29, 11:42 AM", "Oct 29, 10:15 AM", "Oct 29, 9:03 AM", "Oct 28, 8:47 PM", "Oct 28, 6:20 PM", "Oct 28, 3:58 PM", "Oct 28, 1:11 PM", "Oct 27, 9:36 PM", "Oct 27, 5:02 PM", "Oct 27, 12:24 PM"];

function editDetail(type: EditType, product: string) {
  switch (type) {
    case "Address Changed": return "Gurugram → New Delhi";
    case "Contact Updated": return "Phone number updated";
    case "Quantity Changed": return `${product} · 1 → 2`;
    case "Items Added (Upsell)": return `+ ${product}`;
    case "Order Cancelled": return "Ordered by mistake";
    case "Discount Applied": return "Code WELCOME10";
    case "Shipping Method Changed": return "Standard → Express";
    case "Birthday Addition": return "Birthday: 14 Nov";
  }
}

type AnalyticsView = "overview" | "edits" | "upsell";
type AnalyticsTourRefs = {
  overview?: React.RefObject<HTMLDivElement | null>;
  edits?: React.RefObject<HTMLDivElement | null>;
  upsell?: React.RefObject<HTMLDivElement | null>;
};

/** `embedded` drops the outer card chrome, for use inside the demo's browser window. */
/** `withHome` opens on the app's home screen, which links through to Analytics. */
export function AnalyticsMock({ store, viewTab, tourRefs, embedded, withHome }: { store: DemoStore; viewTab?: AnalyticsView; tourRefs?: AnalyticsTourRefs; embedded?: boolean; withHome?: boolean }) {
  const [page, setPage] = useState<"home" | "analytics">(withHome ? "home" : "analytics");
  const [innerTab, setInnerTab] = useState<AnalyticsView>("overview");
  const tab = viewTab ?? innerTab;
  const setTab = setInnerTab;
  const [metric, setMetric] = useState<"edits" | "savings" | "upsell">("edits"); // overview chart
  const [cancelFilter, setCancelFilter] = useState<"all" | "prepaid" | "cod">("all");
  const [recentFilter, setRecentFilter] = useState<"All" | EditType>("All");
  const [rangeDays, setRangeDays] = useState<RangeDays>(30);
  const [rangeOpen, setRangeOpen] = useState(false);
  const currency = store.currency || "INR";
  const products: DemoProduct[] = store.products.filter((p) => (p.price ?? 0) > 0);
  const productName = (i: number) => products.length ? products[i % products.length].title : "Classic Tee";

  function openAnalytics() {
    setPage("analytics");
    setInnerTab("overview");
  }

  // every total below is for the selected range (home is always the last 30 days);
  // counts scale off a 30-day baseline
  const spanDays = page === "home" ? 30 : rangeDays;
  const days = dayLabels(spanDays);
  const scale = spanDays / 30;
  const dateRange = `${iso(END - rangeDays * DAY_MS)} – ${iso(END)}`;

  // --- edits ---
  const editsSeries = series(14, 6, 0, spanDays);
  const editsPrev = editsSeries.map((v) => Math.round(v * 0.82));
  const totalEdits = editsSeries.reduce((a, b) => a + b, 0);
  const ordersSeries = editsSeries.map((v, i) => Math.round(v / 0.41 + 4 * Math.sin(i / 2.3)));
  const totalOrders = ordersSeries.reduce((a, b) => a + b, 0);
  const avgSaved = currency === "INR" ? 150 : currency === "GBP" || currency === "EUR" ? 4 : 5;
  const savingsSeries = editsSeries.map((v) => v * avgSaved);
  const supportSavings = totalEdits * avgSaved;

  const breakdown = EDIT_TYPES.map((b) => ({ ...b, value: Math.round(totalEdits * b.pct) }));

  const cancellations = CANCELLATIONS.map((c) => ({
    reason: c.reason,
    prepaid: Math.max(1, Math.round(c.prepaid * scale)),
    cod: Math.max(1, Math.round(c.cod * scale)),
  }));
  const cancelCount = (c: (typeof cancellations)[number]) =>
    cancelFilter === "prepaid" ? c.prepaid : cancelFilter === "cod" ? c.cod : c.prepaid + c.cod;
  const cancelTotals = {
    all: cancellations.reduce((a, c) => a + c.prepaid + c.cod, 0),
    prepaid: cancellations.reduce((a, c) => a + c.prepaid, 0),
    cod: cancellations.reduce((a, c) => a + c.cod, 0),
  };
  const cancelMax = Math.max(...cancellations.map(cancelCount), 1);

  const recent = RECENT_TYPES.map((type, i) => ({
    order: `#${1482 - i * 3}`,
    customer: CUSTOMERS[i],
    type,
    detail: editDetail(type, productName(i)),
    time: RECENT_TIMES[i],
  })).filter((r) => recentFilter === "All" || r.type === recentFilter);

  // --- upsell (product-based) ---
  const topProducts = products
    .map((p, i) => {
      const units = Math.max(1, Math.round(Math.max(8, 92 - i * 11 - (i % 2) * 5) * scale));
      return { title: p.title, image: p.image, units, revenue: units * Math.max(1, Math.round(p.price * 0.9)) };
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);
  const upsellCount = topProducts.reduce((a, p) => a + p.units, 0);
  const upsellRevenue = topProducts.reduce((a, p) => a + p.revenue, 0) || Math.round(18400 * scale);
  const avgPerUpsell = upsellCount ? Math.round(upsellRevenue / upsellCount) : 0;
  const upsellConversion = 26;
  const revBase = upsellRevenue / rangeDays;
  const upsellSeries = series(revBase, revBase * 0.5, 3, rangeDays);
  const upsellPrev = upsellSeries.map((v) => Math.round(v * 0.78));

  const money = (n: number) => amount(n, currency);
  const OVERVIEW_METRICS = [
    { key: "edits", label: "Total Edits", value: String(totalEdits), sub: `${Math.round((totalEdits / totalOrders) * 100)}% of total orders` },
    { key: "savings", label: "Support Cost Savings", value: money(supportSavings), sub: `${currency} ${avgSaved} avg saved per edit` },
    { key: "upsell", label: "Upsell Revenue Added", value: money(upsellRevenue), sub: `From ${upsellCount} completed upsells` },
  ] as const;
  const overviewChart = {
    edits: { data: editsSeries, prev: editsPrev, color: TEAL, label: "Total Edits", format: String },
    savings: { data: savingsSeries, prev: editsPrev.map((v) => v * avgSaved), color: TEAL, label: "Support Cost Savings", format: money },
    upsell: { data: upsellSeries, prev: upsellPrev, color: GREEN, label: "Upsell Revenue", format: money },
  }[metric];

  const TABS = [
    { key: "overview", label: "Overview" },
    { key: "edits", label: "Edit Activity" },
    { key: "upsell", label: "Upsell" },
  ] as const;

  return (
    <div className={embedded ? "w-full bg-[#f1f1f1]" : "mx-auto w-full max-w-3xl overflow-hidden rounded-2xl border border-border bg-[#f1f1f1] shadow-soft-xl"}>
      <div className="max-h-[560px] overflow-y-auto no-scrollbar">
        <AppHeader />

        {page === "home" ? (
          /* ---- APP HOME — the screen merchants land on; links through to Analytics ---- */
          <div className="space-y-4 p-5">
            <div>
              <h3 className="text-[20px] font-bold tracking-tight text-neutral-900">Hi, {store.brandName || "your"} team! 👋</h3>
              <p className="mt-0.5 text-[13px] text-neutral-600">Enhance your order management with customizable editing options</p>
            </div>
            <div className={`${CARD} p-4`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[14px] font-bold text-neutral-900">Overview</div>
                  <div className="text-[12.5px] text-neutral-600">Last 30 days</div>
                </div>
                <button type="button" onClick={openAnalytics} className="mt-1 text-[13px] font-medium text-[#005bd3] hover:underline">
                  Detailed analytics →
                </button>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {OVERVIEW_METRICS.map((m) => (
                  <button
                    key={m.key}
                    onClick={() => setMetric(m.key)}
                    className={`rounded-xl border p-3 text-left transition-colors ${metric === m.key ? "border-[#005bd3] bg-[#f7f7f7]" : "border-neutral-200 hover:bg-neutral-50"}`}
                  >
                    <div className="text-[13px] text-neutral-700">{m.label}</div>
                    <div className="mt-1 text-[17px] font-bold text-neutral-900">{m.value}</div>
                    <div className="mt-1 text-[11.5px] text-neutral-500">{m.sub}</div>
                  </button>
                ))}
              </div>
              <div className="mt-4">
                <LineChart key={metric} days={days} {...overviewChart} />
              </div>
            </div>
            <div className={`${CARD} flex gap-3 p-4`}>
              <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[#91d0ff]">
                <Info className="size-4 text-neutral-900" />
              </span>
              <div>
                <p className="text-[13px] text-neutral-800">Get deeper insights into order edits, upsells, and customer behaviour in the full analytics dashboard.</p>
                <button
                  type="button"
                  onClick={openAnalytics}
                  className="mt-2.5 rounded-lg bg-white px-3 py-1.5 text-[12.5px] font-semibold text-neutral-900 shadow-[0_1px_0_rgba(0,0,0,0.08)] ring-1 ring-neutral-300 hover:bg-neutral-50"
                >
                  View detailed analytics
                </button>
              </div>
            </div>
          </div>
        ) : (
        <div className="p-5">
          {/* title + date range */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {withHome && (
                <button type="button" onClick={() => setPage("home")} aria-label="Back to home" className="flex size-7 items-center justify-center rounded-lg hover:bg-neutral-200/70">
                  <ArrowLeft className="size-4 text-neutral-800" />
                </button>
              )}
              <h3 className="text-[20px] font-bold tracking-tight text-neutral-900">Analytics</h3>
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => setRangeOpen((v) => !v)}
                aria-expanded={rangeOpen}
                className={`${CARD} inline-flex items-center gap-2 px-3 py-1.5 text-[12px] font-medium text-neutral-800 hover:bg-neutral-50`}
              >
                <CalendarDays className="size-3.5 text-neutral-600" />
                {dateRange}
                <ChevronDown className={`size-3.5 text-neutral-600 transition-transform ${rangeOpen ? "rotate-180" : ""}`} />
              </button>
              {rangeOpen && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setRangeOpen(false)} />
                  <div className={`${CARD} absolute right-0 top-full z-30 mt-1.5 w-44 p-1.5 shadow-lg`}>
                    {RANGES.map((r) => (
                      <button
                        key={r.days}
                        type="button"
                        onClick={() => { setRangeDays(r.days); setRangeOpen(false); }}
                        className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-[12.5px] ${rangeDays === r.days ? "bg-[#ebebeb] font-medium text-neutral-900" : "text-neutral-700 hover:bg-neutral-50"}`}
                      >
                        {r.label}
                        {rangeDays === r.days && <Check className="size-3.5" strokeWidth={2.5} />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* sub-tabs */}
          <div className={`${CARD} mt-4 grid grid-cols-3 gap-1 p-1.5`}>
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`rounded-lg py-2 text-[13px] font-medium transition-colors ${tab === t.key ? "bg-[#ebebeb] text-neutral-900" : "text-neutral-700 hover:bg-neutral-50"}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* ---- OVERVIEW ---- */}
          {tab === "overview" && (
            <div ref={tourRefs?.overview} className="mt-4 space-y-4">
              <div className={`${CARD} p-4`}>
                {/* the metrics double as the chart selector */}
                <div className="grid gap-2 sm:grid-cols-3">
                  {OVERVIEW_METRICS.map((m) => (
                    <button
                      key={m.key}
                      onClick={() => setMetric(m.key)}
                      className={`rounded-lg p-3 text-left transition-colors ${metric === m.key ? "bg-[#f1f1f1]" : "hover:bg-neutral-50"}`}
                    >
                      <div className="text-[13px] text-neutral-700">{m.label}</div>
                      <div className="mt-1 text-[19px] font-bold text-neutral-900">{m.value}</div>
                      <div className="mt-1 text-[11.5px] text-neutral-500">{m.sub}</div>
                    </button>
                  ))}
                </div>
                <div className="mt-4">
                  <LineChart key={metric} days={days} {...overviewChart} />
                </div>
              </div>

              <div className={`${CARD} p-4`}>
                <div className="mb-4 flex items-center justify-between">
                  <div className="text-[14px] font-bold text-neutral-900">Total Orders</div>
                  <div className="text-[18px] font-bold text-neutral-900">{totalOrders}</div>
                </div>
                <LineChart days={days} data={ordersSeries} color={SLATE} label="Total Orders" />
              </div>
            </div>
          )}

          {/* ---- EDIT ACTIVITY ---- */}
          {tab === "edits" && (
            <div ref={tourRefs?.edits} className="mt-4 space-y-4">
              <div className={`${CARD} px-4 py-3 text-[14px] text-neutral-700`}>
                Total <span className="font-bold text-neutral-900">{totalEdits} edits</span> out of <span className="font-bold text-neutral-900">{totalOrders} orders</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {breakdown.map((b) => (
                  <Stat key={b.label} label={b.label} value={String(b.value)} sub={`${Math.round(b.pct * 100)}% of edits`} />
                ))}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className={`${CARD} p-4`}>
                  <div className="mb-3 text-[14px] font-bold text-neutral-900">Edit Type Distribution</div>
                  <div className="space-y-2.5">
                    {breakdown.map((b) => (
                      <div key={b.label}>
                        <div className="flex justify-between text-[12px] text-neutral-600">
                          <span>{b.label}</span>
                          <span className="font-semibold text-neutral-900">{b.value}</span>
                        </div>
                        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
                          <div className="h-full rounded-full" style={{ width: `${(b.pct / 0.3) * 100}%`, background: TEAL }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className={`${CARD} p-4`}>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="text-[14px] font-bold text-neutral-900">Cancellation Reasons</div>
                    <div className="flex overflow-hidden rounded-lg text-[11.5px] font-medium ring-1 ring-neutral-300">
                      {(["all", "prepaid", "cod"] as const).map((f) => (
                        <button
                          key={f}
                          onClick={() => setCancelFilter(f)}
                          className={`border-l border-neutral-300 px-2.5 py-1 first:border-l-0 ${cancelFilter === f ? "bg-[#e3e3e3] text-neutral-900" : "bg-white text-neutral-700 hover:bg-neutral-50"}`}
                        >
                          {f === "all" ? "All" : f === "cod" ? "COD" : "Prepaid"} ({cancelTotals[f]})
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    {cancellations.map((c) => (
                      <div key={c.reason}>
                        <div className="flex justify-between text-[12px] text-neutral-600">
                          <span>{c.reason}</span>
                          <span className="font-semibold text-neutral-900">{cancelCount(c)}</span>
                        </div>
                        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
                          <div className="h-full rounded-full bg-rose-400 transition-[width] duration-300" style={{ width: `${(cancelCount(c) / cancelMax) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className={`${CARD} p-4`}>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="text-[14px] font-bold text-neutral-900">Recent Edits</div>
                  <div className="relative">
                    <select
                      value={recentFilter}
                      onChange={(e) => setRecentFilter(e.target.value as typeof recentFilter)}
                      className="appearance-none rounded-lg bg-white py-1.5 pl-3 pr-8 text-[12.5px] text-neutral-800 ring-1 ring-neutral-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option>All</option>
                      {EDIT_TYPES.map((t) => <option key={t.label}>{t.label}</option>)}
                    </select>
                    <ChevronsUpDown className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-neutral-500" />
                  </div>
                </div>
                {recent.length ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[12.5px]">
                      <thead className="text-neutral-500">
                        <tr className="border-b border-neutral-200">
                          <th className="py-2 pr-3 font-medium">Order</th>
                          <th className="py-2 pr-3 font-medium">Customer</th>
                          <th className="py-2 pr-3 font-medium">Edit</th>
                          <th className="py-2 pr-3 font-medium">Details</th>
                          <th className="py-2 font-medium">Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100">
                        {recent.map((r) => (
                          <tr key={r.order}>
                            <td className="py-2.5 pr-3 font-semibold text-neutral-900">{r.order}</td>
                            <td className="whitespace-nowrap py-2.5 pr-3 text-neutral-700">{r.customer}</td>
                            <td className="whitespace-nowrap py-2.5 pr-3">
                              <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-[11.5px] font-medium text-neutral-700">{r.type}</span>
                            </td>
                            <td className="max-w-[200px] truncate py-2.5 pr-3 text-neutral-600">{r.detail}</td>
                            <td className="whitespace-nowrap py-2.5 text-neutral-500">{r.time}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <Empty text="Try changing the filters or search term" />
                )}
              </div>
            </div>
          )}

          {/* ---- UPSELL ---- */}
          {tab === "upsell" && (
            <div ref={tourRefs?.upsell} className="mt-4 space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <Stat label="Upsell Revenue" value={money(upsellRevenue)} sub={`From ${upsellCount} completed upsells`} />
                <Stat label="Upsell Conversion" value={`${upsellConversion}%`} />
                <Stat label="Avg Revenue Per Upsell" value={money(avgPerUpsell)} sub={<>Items Added : <span className="font-bold text-neutral-900">{upsellCount}</span></>} />
              </div>
              <div className={`${CARD} p-4`}>
                <div className="mb-4 text-[14px] font-bold text-neutral-900">Upsell Revenue Over Time</div>
                <LineChart days={days} data={upsellSeries} prev={upsellPrev} color={GREEN} label="Upsell Revenue" format={money} />
              </div>
              <div className={`${CARD} p-4`}>
                <div className="mb-3 text-[14px] font-bold text-neutral-900">Top 10 Upsell Products</div>
                {topProducts.length ? (
                  <div className="divide-y divide-neutral-100">
                    {topProducts.map((p, i) => (
                      <div key={i} className="flex items-center gap-3 py-2.5">
                        <span className="w-4 text-[12px] font-bold text-neutral-400">{i + 1}</span>
                        <div className="size-9 shrink-0 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50">
                          {p.image ? (
                            // eslint-disable-next-line @next/next/no-img-element -- remote product image
                            <img src={p.image} alt="" className="size-full object-cover" onError={(e) => (e.currentTarget.style.visibility = "hidden")} />
                          ) : null}
                        </div>
                        <div className="min-w-0 flex-1 truncate text-[13px] font-medium text-neutral-800">{p.title}</div>
                        <div className="text-right">
                          <div className="text-[13px] font-semibold text-neutral-900">{price(p.revenue, currency)}</div>
                          <div className="text-[11px] text-neutral-500">{p.units} sold</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Empty text="Try changing the filters or search term" />
                )}
              </div>
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  );
}
