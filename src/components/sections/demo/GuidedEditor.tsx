"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronDown, ChevronRight, Globe, MapPin, Pencil, Play, Sparkles, Wallet } from "lucide-react";
import type { DemoStore } from "@/lib/site";
import type { Addr } from "./DemoMock";
import { DemoMock } from "./DemoMock";
import { CodToPrepaidMock } from "./CodToPrepaidMock";
import { TourOverlay, type TourRect } from "./TourOverlay";
import { ShopifyAppStoreBadge } from "./ShopifyAppStoreBadge";
import { BuiltForShopifyBadge } from "./BuiltForShopifyBadge";

const APP_URL = "https://apps.shopify.com/clickpost-order-edit-cancel";

type Tab = "editing" | "cod-prepaid" | "address" | "cancel";
type Tour = "editing" | "cod-prepaid" | "address";
type Section = "contact" | "shipping" | "order" | "discount" | "cancel";

/**
 * Address the guided tour drops into the form to demonstrate an edit — a move from
 * Gurugram into Delhi. `state` must be set explicitly: the shopper's default state
 * is Haryana, so omitting it would leave "New Delhi, Haryana".
 */
const CORRECTED_ADDRESS: Partial<Addr> = { line1: "C-42, Greater Kailash I", city: "New Delhi", state: "Delhi", zip: "110048" };

/** Left-rail features, each with an icon. */
const NAV_FEATURES: { key: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "editing", label: "Order editing", icon: Pencil },
  { key: "cod-prepaid", label: "COD to Prepaid", icon: Wallet },
  { key: "address", label: "Address validation", icon: MapPin },
];


type ActionPill = {
  key: "tour" | Section;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  section?: Section;
};

const EDITING_PILLS: ActionPill[] = [
  { key: "tour", label: "Take a tour", icon: Sparkles },
  { key: "shipping", label: "Edit address", section: "shipping" },
  { key: "order", label: "Update order", section: "order" },
  { key: "contact", label: "Contact", section: "contact" },
  { key: "discount", label: "Discount", section: "discount" },
  { key: "cancel", label: "Cancel", section: "cancel" },
];

/* ----------------------------- tour step defs ----------------------------- */
type TourStepDef = {
  id: string;
  title: string;
  desc: string;
  cta: string;
  measureDelayMs?: number;
  clickThrough?: boolean;
  /** show the red "tap here" dot — only on steps where you tap the highlighted element */
  tapTarget?: boolean;
  /** element to spotlight (defaults to `id`) */
  spotlightId?: string;
  /** element the red dot points at (defaults to the spotlight) */
  dotId?: string;
  /** hide the tooltip card (let the highlighted element speak for itself) */
  hideCard?: boolean;
  /** hide the Next button (the user advances by tapping the highlighted element) */
  hideCta?: boolean;
  /** keep the current scroll position (don't scroll the target into view) */
  noScroll?: boolean;
  /** scroll the whole spotlight to the TOP of the demo (instead of centering the dot) */
  scrollAlignTop?: boolean;
  /** advance WITHOUT dropping the highlight (seamless in-place update, e.g. +1 qty) */
  seamless?: boolean;
  /** how long to wait before advancing on a seamless step (e.g. let the "added" toast show) */
  advanceDelayMs?: number;
  /** auto-advance after N ms with no tap (e.g. a watch-the-details-type step) */
  autoAdvanceMs?: number;
  /** force the callout card above the spotlight (for steps where below covers content) */
  cardAbove?: boolean;
  /** id of an element to programmatically "click" on step-enter so its animation
   *  plays automatically (Next-driven tour — no tapping required) */
  autoClickId?: string;
  /** end-of-feature conversion step: blurred backdrop + centered CTA linking to the app */
  outcome?: boolean;
  outcomeHeadline?: string;
  outcomeButton?: string;
  /** rail card highlighted on this outcome step + tour to start on advance ("null" = finish) */
  nextTour?: Tour | null;
  /** label shown after "up next:" on the outcome card */
  nextLabel?: string;
  /** final step of the whole chain */
  finalStep?: boolean;
};

const EDITING_TOUR_STEPS: TourStepDef[] = [
  {
    id: "window",
    title: "Your edit window",
    desc: "Customers can edit their order for a window you control — no support ticket needed.",
    cta: "Next",
  },
  // ---- Address: ONE persistent box. The shipping section opens with the dot on
  // the address; tapping it drops in the corrected address; the dot then shifts
  // to the Update button; tapping it syncs the change. ----
  {
    id: "addr-show",
    title: "Self-serve edits",
    desc: "Change the address in seconds. Tap the address to drop in the corrected one, then tap Update to sync it to your store.",
    cta: "Next",
    measureDelayMs: 520,
    spotlightId: "shipping-box", // whole address section, including the Update button
    dotId: "addr-block", // point at the address the shopper taps to fix
  },
  {
    id: "addr-update",
    title: "",
    desc: "",
    cta: "Next",
    measureDelayMs: 700, // let the corrected address drop in before pointing at Update
    noScroll: true,
    hideCard: true, // no 3/7 box — the dot just shifts to the Update button
    spotlightId: "shipping-box",
    dotId: "addr-save",
    autoClickId: "addr-save",
  },
  // ---- Order: ONE box; dot on + then (no new box) on Update your order. ----
  {
    id: "order-add",
    title: "Add or change items",
    desc: "Add one more, swap, or remove. Tap + to bump the quantity, then Update your order to apply it — the new total is instant.",
    cta: "Next",
    measureDelayMs: 640,
    spotlightId: "order-row", // whole order section, including the Update button
    dotId: "order-plus",
    autoClickId: "order-plus",
    seamless: true, // +1 updates in place; keep the highlight, just move the dot to Update
  },
  {
    id: "order-apply",
    title: "",
    desc: "",
    cta: "Next",
    measureDelayMs: 340,
    hideCard: true,
    spotlightId: "order-row",
    dotId: "order-btn",
    autoClickId: "order-btn",
  },
  {
    id: "pay",
    title: "",
    desc: "",
    cta: "Next",
    measureDelayMs: 360,
    hideCard: true, // the balance-due panel explains itself — just point at Pay
    spotlightId: "pay-panel",
    dotId: "pay-btn",
    autoClickId: "pay-btn",
  },
  {
    // end of the order-editing tour → conversion screen
    id: "editing-finish",
    title: "",
    desc: "",
    cta: "Finish",
    measureDelayMs: 320,
    outcome: true,
    finalStep: true,
  },
];

const COD_PREPAID_TOUR_STEPS: TourStepDef[] = [
  {
    id: "cod-offer",
    title: "Turn COD into prepaid",
    desc: "COD orders are the ones that bounce back. On the order status page the shopper is offered an extra discount to pay up front — tap Pay Now and the order is settled before it ships.",
    cta: "Next",
    measureDelayMs: 380,
    spotlightId: "cod-offer",
    dotId: "cod-pay", // one red dot — straight on the Pay Now button
    autoClickId: "cod-pay",
    scrollAlignTop: true, // the offer card is tall; pin it to the top of the window
    seamless: true, // hold the highlight through the "processing payment" popup
    advanceDelayMs: 1900, // just past the 1500ms popup, so the flip is visible
  },
  {
    // the card has flipped to "now prepaid" — let it land, no new box
    id: "cod-paid",
    title: "",
    desc: "",
    cta: "Next",
    measureDelayMs: 420,
    hideCard: true,
    spotlightId: "cod-offer",
    dotId: "cod-offer",
    autoAdvanceMs: 2600,
    scrollAlignTop: true,
  },
  {
    // end of the COD-to-prepaid tour → hands off to address validation
    id: "cod-finish",
    title: "",
    desc: "",
    cta: "Finish",
    measureDelayMs: 320,
    outcome: true,
    finalStep: true,
  },
];

const ADDRESS_TOUR_STEPS: TourStepDef[] = [
  {
    id: "addr-flagged",
    title: "We catch bad addresses",
    desc: "Undeliverable or incomplete addresses are flagged before the order ships — the shopper accepts the corrected, deliverable address in one tap.",
    cta: "Next",
    measureDelayMs: 420,
    spotlightId: "addr-flagged",
    dotId: "addr-validate", // one red dot only — straight on the validate button
    autoClickId: "addr-validate", // tap → the address is validated (turns green)
    scrollAlignTop: true, // keep the tall address block inside the window (don't spill over the top bar)
  },
  {
    id: "addr-update",
    title: "Save the corrected address",
    desc: "Tap Update Shipping Address to lock in the verified, deliverable address on the order — no failed delivery, no return-to-origin.",
    cta: "Next",
    measureDelayMs: 460, // wait for the button to relabel to "Update Shipping Address"
    spotlightId: "addr-flagged", // highlight the full corrected address block…
    dotId: "addr-validate", // …with the red dot on the Update Shipping Address button
    autoClickId: "addr-validate", // tap → shipping address saved
    scrollAlignTop: true,
  },
  {
    // Last feature in TOUR_ORDER, so this is the end of the whole journey: with no
    // next feature to hand off to, TourOverlay renders the full conversion box
    // (eyebrow + headline + App Store badge) rather than an "Up next" card.
    id: "address-finish",
    title: "",
    desc: "",
    cta: "Finish",
    measureDelayMs: 320,
    outcome: true,
    nextTour: null,
    finalStep: true,
  },
];

const TOUR_STEPS: Record<Tour, TourStepDef[]> = {
  editing: EDITING_TOUR_STEPS,
  "cod-prepaid": COD_PREPAID_TOUR_STEPS,
  address: ADDRESS_TOUR_STEPS,
};

// Order features run in — the finale "Watch next" CTA chains to the next one.
// Address validation is last, so it ends on the conversion box.
const TOUR_ORDER: Tour[] = ["editing", "cod-prepaid", "address"];

// One-line pitch shown on the "up next" hand-off box before each feature's tour.
const FEATURE_INTRO: Record<Tour, string> = {
  editing: "Let shoppers edit their own orders — swaps, add-ons, quantities — without a support ticket.",
  "cod-prepaid": "Offer COD shoppers a discount to pay up front — less cash on delivery, far less RTO.",
  address: "Catch undeliverable addresses before they ship — fewer failed deliveries and RTO.",
};

/** Clickpost "Order Edit & Cancel" app icon — official logo from /public. */
function ClickpostMark({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- local brand asset
    <img src="/clickpost-app-logo.svg" alt="CP Order Editing" className={className} />
  );
}

/**
 * Per-feature CTA copy. Only `action` is rendered (see ReadyToTryBox); `brand` and
 * `stat` are real merchant results kept for when the box shows a proof point again —
 * which is why COD-to-Prepaid has none rather than an invented number.
 */
const FINALE: Record<Tab, { action: string; brand?: string; stat?: string }> = {
  editing: {
    action: "cut support tickets",
    brand: "Doonails",
    stat: "deflected 58% of “where’s my order” tickets and saved ₹10L a month.",
  },
  "cod-prepaid": {
    action: "convert COD to prepaid",
  },
  address: {
    action: "stop failed deliveries",
    brand: "World of Asaya",
    stat: "cut RTO by 25% by fixing wrong addresses before they shipped.",
  },
  cancel: {
    action: "handle cancellations",
    brand: "Gladful",
    stat: "saw far fewer cancelled orders once shoppers could self-edit instead.",
  },
};


/** The "Ready to try…" conversion box — desktop shows it in the left rail; mobile
 *  shows it at the end (below the demo). */
function ReadyToTryBox({ tab, className }: { tab: Tab; className?: string }) {
  return (
    <div className={`relative flex w-full max-w-sm flex-col gap-3.5 overflow-hidden rounded-2xl border border-neutral-200/90 bg-white/70 p-5 text-center shadow-[0_1px_2px_rgba(15,15,25,0.06),0_18px_44px_-14px_rgba(15,15,25,0.30)] backdrop-blur-md ${className ?? ""}`}>
      <h3
        className="text-balance text-[18px] font-semibold leading-[1.15] tracking-tight text-foreground"
        style={{ fontFamily: "var(--font-display), sans-serif" }}
      >
        Ready to {FINALE[tab].action} on <span className="text-[#155FFF]">your store</span>?
      </h3>
      <div className="flex items-center justify-center gap-2.5">
        <ClickpostMark className="size-10 shrink-0 rounded-[9px] shadow-sm" />
        <div className="text-left">
          <div className="whitespace-nowrap text-[12px] font-medium leading-tight tracking-tight text-neutral-900">CP Order Editing &amp; Upsell</div>
          <div className="mt-1"><BuiltForShopifyBadge compact /></div>
        </div>
      </div>
      <ShopifyAppStoreBadge href={APP_URL} className="w-full" />
    </div>
  );
}

/* ----------------------------- guided editor ----------------------------- */
export function GuidedEditor({ store }: { store: DemoStore }) {
  const domain = `${(store.brandName || "yourstore").toLowerCase().replace(/[^a-z0-9]+/g, "")}.com`;
  const [tab, setTab] = useState<Tab>("editing");
  const [featureMenuOpen, setFeatureMenuOpen] = useState(false); // mobile feature dropdown
  const [activePill, setActivePill] = useState<ActionPill["key"]>("tour");
  const [editView, setEditView] = useState<"thankyou" | "orderstatus">("thankyou"); // order-edit surface

  // lifted tour state
  const [activeTour, setActiveTour] = useState<Tour | null>(null);
  const [tourStep, setTourStep] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState<TourRect | null>(null);
  const [dotRect, setDotRect] = useState<TourRect | null>(null); // where the red dot points (may differ from spotlight)
  const [measuredStep, setMeasuredStep] = useState(-1); // which step the current rect belongs to
  const [demoRect, setDemoRect] = useState<TourRect | null>(null); // editing-window bounds (blurred on outcome steps)
  const [pendingTour, setPendingTour] = useState<Tour | null>(null); // start this tour once its tab mounts
  const [revealScreen, setRevealScreen] = useState(false); // after an action tap: drop the highlight to show the clean screen + toast

  // controlled bits during the tour
  const [tourForcedOpen, setTourForcedOpen] = useState<Section | null>(null);
  const [addrOverride, setAddrOverride] = useState<Partial<Addr> | undefined>(undefined);
  const [qtyBump, setQtyBump] = useState(0); // tour: add one more of the first item
  const [demoResetKey, setDemoResetKey] = useState(0); // bump to remount the demo fresh
  const [addrResetKey, setAddrResetKey] = useState(0); // bump to remount the address-validation window fresh
  const [codResetKey, setCodResetKey] = useState(0); // bump to remount the COD-to-prepaid window fresh (offer un-paid)

  // start the editing tour from a clean demo (original 2-item order, fresh timer, nothing highlighted)
  function resetDemo() {
    setAddrOverride(undefined);
    setQtyBump(0);
    setTourForcedOpen(null);
    setDemoResetKey((k) => k + 1);
  }

  const rootRef = useRef<HTMLDivElement>(null);
  const demoFrameRef = useRef<HTMLDivElement>(null); // the editing/demo window (blurred on outcome steps)

  // tour ref registry
  const countdownRef = useRef<HTMLDivElement>(null);
  const shippingRowRef = useRef<HTMLDivElement>(null);
  const addressFormRef = useRef<HTMLDivElement>(null);
  const addressBlockRef = useRef<HTMLDivElement>(null);
  const saveBtnRef = useRef<HTMLDivElement>(null);
  const orderRowRef = useRef<HTMLDivElement>(null);
  const orderBtnRef = useRef<HTMLDivElement>(null);
  const orderPlusBtnRef = useRef<HTMLButtonElement>(null);
  const payPanelRef = useRef<HTMLDivElement>(null);
  const payBtnRef = useRef<HTMLButtonElement>(null);
  const sectionsRef = useRef<HTMLDivElement>(null);
  // COD-to-prepaid tour targets
  const codOfferRef = useRef<HTMLDivElement>(null);
  const codPayBtnRef = useRef<HTMLButtonElement>(null);
  // address-validation tour targets
  const addrSaveBtnRef = useRef<HTMLButtonElement>(null);
  const addrFlaggedRef = useRef<HTMLDivElement>(null);
  const addrShippingRowRef = useRef<HTMLDivElement>(null);
  // rail feature-card refs (for highlighting the "next" feature on outcome steps)
  const editingCardRef = useRef<HTMLButtonElement>(null);
  const codCardRef = useRef<HTMLButtonElement>(null);
  const addressCardRef = useRef<HTMLButtonElement>(null);
  const cardRefs: Partial<Record<Tab, React.RefObject<HTMLButtonElement | null>>> = {
    editing: editingCardRef, "cod-prepaid": codCardRef, address: addressCardRef,
  };
  const pauseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentPill = EDITING_PILLS.find((p) => p.key === activePill) ?? EDITING_PILLS[0];

  const steps = activeTour ? TOUR_STEPS[activeTour] : [];
  const curStep = activeTour ? steps[tourStep] : null;
  // the feature that runs after the current one (for the finale's "Watch next" CTA)
  const nextTourKey = activeTour ? TOUR_ORDER[TOUR_ORDER.indexOf(activeTour) + 1] : undefined;
  const nextFeatureLabel = nextTourKey ? NAV_FEATURES.find((n) => n.key === nextTourKey)?.label : undefined;
  const nextFeatureDesc = nextTourKey ? FEATURE_INTRO[nextTourKey] : undefined;
  // Progress numbering — count only the steps that show a box (skip hideCard /
  // outcome steps), running continuously across the chained journey.
  const isBoxStep = (s: TourStepDef) => !s.hideCard && !s.outcome;
  const boxCount = (list: TourStepDef[], upto: number) => list.slice(0, upto).filter(isBoxStep).length;
  let displayTotal = 0;
  let displayStep = 0;
  if (activeTour) {
    // each feature tour is self-contained — number only its own box steps
    displayTotal = steps.filter(isBoxStep).length;
    displayStep = Math.max(0, boxCount(steps, tourStep + 1) - 1);
  }

  // resolve a step's spotlight target — called only from effects/handlers, never render
  function getStepTarget(id: string): HTMLElement | null {
    switch (id) {
      case "window": return countdownRef.current;
      case "addr-row": return addressFormRef.current;
      case "addr-save": return saveBtnRef.current;
      case "addr-block": return addressBlockRef.current;
      case "shipping-box": return shippingRowRef.current;
      case "order-row": return orderRowRef.current;
      case "order-btn": return orderBtnRef.current;
      case "order-plus": return orderPlusBtnRef.current;
      case "pay-panel": return payPanelRef.current;
      case "pay-btn": return payBtnRef.current;
      case "others": return sectionsRef.current;
      case "to-cod": return codCardRef.current;
      case "to-address": return addressCardRef.current;
      case "feature-cod": return codCardRef.current;
      case "feature-address": return addressCardRef.current;
      case "cod-offer": return codOfferRef.current;
      case "cod-pay": return codPayBtnRef.current;
      case "addr-validate": return addrSaveBtnRef.current;
      case "addr-flagged": return addrFlaggedRef.current;
      default: return null;
    }
  }

  // perform a step's side effects, then move to it
  function enterStep(tourId: Tour, idx: number) {
    const list = TOUR_STEPS[tourId];
    const s = list[idx];
    if (!s) return;
    switch (s.id) {
      case "window":
        setTourForcedOpen(null);
        break;
      case "addr-show":
        // open the shipping section (original address shown; dot on the address)
        setTourForcedOpen("shipping");
        break;
      case "addr-update":
        // shopper tapped the address → drop in the corrected one; dot moves to Update
        setTourForcedOpen("shipping");
        setAddrOverride(CORRECTED_ADDRESS);
        break;
      case "order-add":
        // open the order section with the original quantities
        setTourForcedOpen("order");
        break;
      case "order-apply":
        // stay open; dot moves to Update your order (no box)
        setTourForcedOpen("order");
        break;
      case "pay":
        // collapse the editing sections so the balance-due panel is the focus
        setTourForcedOpen(null);
        break;
      case "to-cod":
      case "to-address":
        // close every editing section before handing off to the next feature
        setTourForcedOpen(null);
        break;
      default:
        // COD-to-prepaid, address and outcome steps: nothing to pre-open
        break;
    }
    setTourStep(idx);
  }

  function startEditingTour() {
    setActivePill("tour");
    setActiveTour("editing");
    enterStep("editing", 0);
  }

  // "Start tour" — runs the CURRENT feature's own tour, ending on its finale screen.
  // Switch to a feature and auto-start its tour from a clean slate.
  function startFeatureTour(t: Tour) {
    resetDemo(); // fresh 2-item order + fresh timer before we begin
    setActiveTour(null);
    setSpotlightRect(null);
    setActivePill("tour");
    setTourForcedOpen(null);
    // the COD tour must begin on an unpaid order, so remount the offer card
    if (t === "cod-prepaid") setCodResetKey((k) => k + 1);
    setTab(t);
    setPendingTour(t);
  }

  function launchTour() {
    const t: Tour = (TOUR_STEPS[tab as Tour] ? (tab as Tour) : "editing");
    startFeatureTour(t);
  }

  // From a finale, jump to the next feature in TOUR_ORDER and start its tour.
  function goToNextFeature() {
    if (!activeTour) return;
    const next = TOUR_ORDER[TOUR_ORDER.indexOf(activeTour) + 1];
    if (next) startFeatureTour(next);
    else closeTour(); // last feature — nothing after it
  }

  // Bring a target into view by scrolling ONLY its nearest inner scroll container
  // (the demo window / offer panel) — never the outer modal, so the top bar isn't cut.
  function scrollInnerIntoView(el: HTMLElement, alignTop = false) {
    const root = rootRef.current;
    // only consider scroll containers INSIDE the demo (between el and root);
    // the outer modal is an ancestor of root, so it's never scrolled.
    let c: HTMLElement | null = el.parentElement;
    while (c && c !== root) {
      const oy = getComputedStyle(c).overflowY;
      if ((oy === "auto" || oy === "scroll") && c.scrollHeight > c.clientHeight + 1) {
        const cRect = c.getBoundingClientRect();
        const eRect = el.getBoundingClientRect();
        const delta = alignTop
          ? (eRect.top - cRect.top) - 14 // pin the element's top near the container top
          : (eRect.top - cRect.top) - (c.clientHeight - eRect.height) / 2;
        c.scrollTop += delta; // instant: target is at its final position for measuring
        return;
      }
      c = c.parentElement;
    }
  }

  function scrollDemoTop() {
    const el = rootRef.current;
    if (!el) return;
    // reset every actually-scrolled ancestor (the full-screen demo modal lives among them)
    let p: HTMLElement | null = el.parentElement;
    while (p) {
      if (p.scrollTop > 0) p.scrollTop = 0;
      p = p.parentElement;
    }
    if (window.scrollY > 0) window.scrollTo(0, 0);
  }

  function advanceTour() {
    if (!activeTour) return;
    const list = TOUR_STEPS[activeTour];
    const cur = list[tourStep];
    // advancing off the finale box closes the tour
    if (cur?.outcome) { closeTour(); return; }
    // otherwise step forward; the last step is each feature's outcome box (a
    // "next feature" intro for non-final features, or the conversion box for EU).
    if (tourStep >= list.length - 1) {
      setActiveTour(null); setSpotlightRect(null); scrollDemoTop();
    } else {
      enterStep(activeTour, tourStep + 1);
    }
  }


  function closeTour() {
    if (pauseTimer.current) clearTimeout(pauseTimer.current);
    setActiveTour(null);
    setSpotlightRect(null);
    setPendingTour(null);
    setRevealScreen(false);
    scrollDemoTop();
  }

  function selectFeature(k: Tab) {
    setActiveTour(null);
    setSpotlightRect(null);
    setPendingTour(null);
    setActivePill("tour");
    setTourForcedOpen(null);
    // tapping COD to Prepaid always shows the offer un-taken
    if (k === "cod-prepaid") setCodResetKey((n) => n + 1);
    setTab(k);
  }

  // Esc exits the tour
  useEffect(() => {
    if (!activeTour) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeTour(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTour]);

  // While a spotlight step is active, block USER scrolling — the spotlight is
  // measured in viewport coords, so a manual scroll makes it drift out of place.
  // The tour's own programmatic scroll (scrollIntoView / scrollTop) still works
  // since it doesn't fire wheel/touch events. (Skip on the finale so its box can scroll.)
  useEffect(() => {
    if (!activeTour || curStep?.outcome) return;
    const block = (e: Event) => e.preventDefault();
    window.addEventListener("wheel", block, { passive: false });
    window.addEventListener("touchmove", block, { passive: false });
    return () => {
      window.removeEventListener("wheel", block);
      window.removeEventListener("touchmove", block);
    };
  }, [activeTour, curStep?.outcome]);

  // start a pending tour once its tab swap has mounted the targets
  useEffect(() => {
    if (!pendingTour || tab !== pendingTour) return;
    const next = pendingTour;
    const t = setTimeout(() => {
      setPendingTour(null);
      if (next === "editing") { startEditingTour(); return; }
      setActivePill("tour");
      setActiveTour(next);
      enterStep(next, 0);
    }, 340);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, pendingTour]);

  // measure the spotlight for the active step — retries until the target(s) mount
  useEffect(() => {
    if (!activeTour) return;
    const list = TOUR_STEPS[activeTour];
    const s = list[tourStep];
    if (!s) return;
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    // On mobile the feature rail is a dropdown, so a transition step can't tap a
    // (hidden) feature card — spotlighting it would frame a zero-size element.
    // Instead, just auto-switch to the next feature after a short beat.
    const isMobile = typeof window !== "undefined" && window.innerWidth < 1024;
    if (isMobile && s.nextTour) {
      setSpotlightRect(null);
      setDotRect(null);
      timers.push(setTimeout(() => { if (!cancelled) advanceTour(); }, 900));
      return () => { cancelled = true; timers.forEach(clearTimeout); };
    }

    // capture the spotlight + dot rects from the (now-settled) DOM
    const measureDemo = () => {
      // measure on every step so the callout can sit to the LEFT of the demo
      // window (in the dimmed area) instead of dropping below and covering it
      if (!demoFrameRef.current) return;
      const d = demoFrameRef.current.getBoundingClientRect();
      setDemoRect({ top: d.top, left: d.left, width: d.width, height: d.height });
    };
    const capture = (doScroll: boolean) => {
      if (cancelled) return;
      const el = getStepTarget(s.spotlightId ?? s.id);
      // the red dot points at the actionable element: an explicit dotId, else the
      // button the step taps (autoClickId), else the spotlight.
      const dotEl = getStepTarget(s.dotId ?? s.autoClickId ?? s.spotlightId ?? s.id);
      if (!el || (s.dotId && !dotEl)) return;
      if (doScroll && !s.noScroll) {
        const scrollTarget = s.scrollAlignTop ? el : (dotEl ?? el);
        if (isMobile) {
          // mobile has no inner scroll container — scroll the page/modal so the
          // highlighted element is in view (desktop keeps scrollInnerIntoView)
          scrollTarget.scrollIntoView({ block: s.scrollAlignTop ? "start" : "center", inline: "nearest", behavior: "auto" });
        } else {
          scrollInnerIntoView(scrollTarget, s.scrollAlignTop);
        }
      }
      const r = el.getBoundingClientRect();
      setSpotlightRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      const dr = (dotEl ?? el).getBoundingClientRect();
      setDotRect({ top: dr.top, left: dr.left, width: dr.width, height: dr.height });
      measureDemo();
      setMeasuredStep(tourStep);
      setRevealScreen(false); // next step is framed → bring the highlight back
    };
    const run = (attempt: number) => {
      if (cancelled) return;
      const el = getStepTarget(s.spotlightId ?? s.id);
      const dotEl = getStepTarget(s.dotId ?? s.spotlightId ?? s.id);
      // wait until both the spotlight and (if any) the dot target have mounted
      if (!el || (s.dotId && !dotEl)) {
        // an outcome step with no card to highlight → full-screen blurred CTA
        if (s.outcome) { setSpotlightRect(null); measureDemo(); setMeasuredStep(tourStep); setRevealScreen(false); return; }
        if (attempt < 10) timers.push(setTimeout(() => run(attempt + 1), 120));
        return;
      }
      capture(true);
      // accordions open/close over ~250ms; re-measure after they settle so the
      // spotlight + dot lock onto the target's FINAL position (no re-scroll jump).
      timers.push(setTimeout(() => capture(false), 300));
    };
    timers.push(setTimeout(() => run(0), s.measureDelayMs ?? 80));
    // steps with no tap target (e.g. "watch the details type in") advance on a timer
    if (s.autoAdvanceMs) timers.push(setTimeout(() => { if (!cancelled) advanceTour(); }, s.autoAdvanceMs));

    // Interactive: the presenter actually TAPS the highlighted action button. We
    // detect the tap at the document level (robust to re-renders) by checking the
    // click lands within the action element's box. Its real onClick still fires
    // (the action + toast); then we drop the highlight and advance after a beat.
    let cleanupClick: (() => void) | null = null;
    let advanced = false;
    if (s.autoClickId && !s.outcome) {
      const onDocClick = (e: MouseEvent) => {
        if (advanced || cancelled) return;
        const host = getStepTarget(s.autoClickId!) ?? getStepTarget(s.spotlightId ?? s.id);
        if (!host) return;
        const r = host.getBoundingClientRect();
        const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
        if (!inside) return;
        advanced = true;
        if (s.seamless) {
          // keep the highlight up — the update happens in place (e.g. +1 qty, or
          // "added to cart" toast); then the dot moves to the next spot with no
          // close/re-open flicker. advanceDelayMs lets the toast show first.
          timers.push(setTimeout(() => { if (!cancelled) advanceTour(); }, s.advanceDelayMs ?? 550));
        } else {
          setRevealScreen(true); // highlight off → clean screen + toast
          timers.push(setTimeout(() => { if (!cancelled) advanceTour(); }, 1400));
        }
      };
      document.addEventListener("click", onDocClick, true);
      cleanupClick = () => document.removeEventListener("click", onDocClick, true);
    }

    return () => { cancelled = true; timers.forEach(clearTimeout); cleanupClick?.(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTour, tourStep]);

  // editing-window open state: tour-controlled during the tour, pill-controlled otherwise
  const editingForceOpen: Section | null =
    activeTour === "editing"
      ? tourForcedOpen
      : activePill !== "tour"
        ? currentPill.section ?? null
        : null;

  return (
    <div ref={rootRef} className="demo-scale-root scroll-mt-6">
      {/* During the tour, the left rail slides away and the demo centers so the
          typewriter callouts have clean space to the side. Closing the tour
          (cross / Esc → activeTour = null) restores the normal two-column view. */}
      <div className="demo-scale-grid grid grid-cols-1 items-stretch gap-6 lg:min-h-[100svh] lg:grid-cols-[minmax(0,0.52fr)_minmax(0,1.48fr)] lg:gap-0">
        {/* LEFT: feature buttons + the "ready to try" box (raised on mobile so the
            feature dropdown overlays the demo top bar instead of hiding behind it) */}
        <div className="relative z-10 flex flex-col gap-6 px-3 pb-6 max-lg:z-30 lg:items-center lg:justify-start lg:pl-0 lg:pr-8 lg:pt-8 lg:pb-12">
          {/* heading + feature buttons */}
          <div className="w-full max-w-sm">
            <div className="mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element -- brand wordmark from clickpost.ai */}
              <img src="/clickpost-wordmark.png" alt="Clickpost" className="h-6 w-auto" />
            </div>
            <h3 className="mb-5 font-serif text-[1.3rem] font-bold italic leading-tight tracking-tight text-foreground">
              Click a feature to run it live.
            </h3>
            {/* mobile: custom feature dropdown (desktop uses the vertical rail below) */}
            <div className="relative lg:hidden">
              <button
                type="button"
                onClick={() => setFeatureMenuOpen((v) => !v)}
                aria-expanded={featureMenuOpen}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-left text-[14px] font-semibold text-neutral-900 shadow-sm"
              >
                <span>{NAV_FEATURES.find((n) => n.key === tab)?.label ?? "Choose a feature"}</span>
                <ChevronDown className={`size-4 shrink-0 text-[#155FFF] transition-transform ${featureMenuOpen ? "rotate-180" : ""}`} />
              </button>
              {featureMenuOpen && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setFeatureMenuOpen(false)} />
                  <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xl">
                    {NAV_FEATURES.map((n) => {
                      const active = tab === n.key;
                      return (
                        <button
                          key={n.key}
                          type="button"
                          onClick={() => { selectFeature(n.key); setFeatureMenuOpen(false); }}
                          className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-[14px] font-semibold transition-colors ${active ? "bg-[#155FFF] text-white" : "text-neutral-800 hover:bg-neutral-50"}`}
                        >
                          <span>{n.label}</span>
                          {active && <Check className="size-4 shrink-0" strokeWidth={3} />}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
            <div className="flex flex-col gap-3 max-lg:hidden">
            {NAV_FEATURES.map((n) => {
              const active = tab === n.key;
              return (
                <button
                  key={n.key}
                  ref={cardRefs[n.key]}
                  onClick={() => selectFeature(n.key)}
                  style={active ? { background: "linear-gradient(160deg, #eaf2ff 0%, #cfe0ff 55%, #bcd6ff 100%)" } : undefined}
                  className={`group flex w-full items-center gap-3 rounded-2xl px-5 py-3 text-left text-[15px] font-semibold transition-all ${
                    active
                      ? "text-neutral-900 ring-1 ring-[#9cc0ff] shadow-[0_10px_24px_-14px_rgba(21,95,255,0.45)]"
                      : "bg-white text-neutral-800 ring-1 ring-neutral-200 hover:-translate-y-0.5 hover:ring-neutral-300 hover:shadow-md"
                  }`}
                >
                  <span className="flex-1">{n.label}</span>
                  <ChevronRight
                    className={`size-4 shrink-0 transition-transform ${
                      active ? "text-[#155FFF]" : "text-neutral-300 group-hover:translate-x-0.5 group-hover:text-[#155FFF]"
                    }`}
                  />
                </button>
              );
            })}
            </div>
          </div>

          {/* the "ready to try" box — desktop only (mobile shows it at the end, below the demo);
              mt-auto pushes it to the bottom of the rail so there's a gap under the features */}
          <ReadyToTryBox tab={tab} className="max-lg:hidden lg:mt-auto" />
        </div>

        {/* RIGHT: full-bleed blue demo stage — top pill nav + paired sub-row + sliding window */}
        <div
          ref={demoFrameRef}
          className="relative flex w-full flex-col justify-center gap-4 lg:justify-start lg:gap-5 lg:px-10 lg:pt-8 lg:pb-12 xl:px-16"
        >
          {/* blue backdrop (desktop only) */}
          <div aria-hidden className="absolute inset-0 z-0 hidden lg:block" style={{ background: "linear-gradient(160deg, #eaf2ff 0%, #cfe0ff 42%, #a8c8ff 100%)" }} />

          {/* bar over the editing window — Start tour (left) · brand URL (center) · Start free trial (right) */}
          <div className="relative z-10 flex items-center justify-between gap-3 max-lg:flex-wrap max-lg:justify-center max-lg:gap-2">
            {/* Start tour — with a shine sweep */}
            <button
              onClick={launchTour}
              className="group relative hidden shrink-0 items-center gap-1.5 overflow-hidden whitespace-nowrap rounded-full bg-white px-4 py-2.5 text-[12.5px] font-semibold text-neutral-800 shadow-soft-md ring-1 ring-neutral-200 transition-all hover:bg-neutral-50 lg:inline-flex"
            >
              <motion.span
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{ background: "linear-gradient(100deg, transparent 38%, rgba(21,95,255,0.28) 50%, transparent 62%)" }}
                initial={{ x: "-140%" }}
                animate={{ x: "140%" }}
                transition={{ duration: 1.8, ease: "easeInOut", repeat: Infinity, repeatDelay: 1.2 }}
              />
              <Play className="relative z-10 size-3 fill-current" />
              <span className="relative z-10">Start tour</span>
            </button>

            {/* Order-edit sub-tabs — Thank you page / Order status page */}
            {tab === "editing" && (
              <div className="flex shrink-0 items-center gap-1 rounded-full bg-white/70 p-1 shadow-soft-md ring-1 ring-neutral-200">
                {([["thankyou", "Thank you page"], ["orderstatus", "Order status page"]] as const).map(([key, label]) => {
                  const active = editView === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setEditView(key)}
                      className={`whitespace-nowrap rounded-full px-4 py-1.5 text-[12px] font-semibold transition-colors ${
                        active ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-800"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}

            <a
              href={APP_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-5 py-2.5 text-[13px] font-bold text-white shadow-md transition-all hover:brightness-110 max-lg:hidden"
              style={{ background: "#155FFF" }}
            >
              Start free trial
            </a>
          </div>

          {/* sub-row — mobile-only Start tour (desktop has everything in the top bar) */}
          <div className="relative z-10 flex flex-wrap items-center justify-center gap-2 lg:hidden">
            <button
              onClick={launchTour}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-[12px] font-semibold text-neutral-700 shadow-sm ring-1 ring-neutral-200 transition-all hover:bg-neutral-50"
            >
              <Play className="size-3.5 fill-current" />
              Start tour
            </button>
          </div>

          {/* body — the editing window: browser bezel (store URL) + sliding mock */}
          <div className="relative z-10 w-full overflow-hidden rounded-2xl bg-white shadow-soft-xl" style={{ border: "1.5px solid #1f2430" }}>
            {/* browser bezel with the store URL */}
            <div className="flex items-center gap-2 border-b border-neutral-200 bg-neutral-50 px-4 py-2.5">
              {/* store logo — in place of the traffic-light dots */}
              {store.logo ? (
                // eslint-disable-next-line @next/next/no-img-element -- store favicon/logo
                <img src={store.logo} alt="" className="size-9 shrink-0 rounded-md object-contain" referrerPolicy="no-referrer" onError={(e) => (e.currentTarget.style.display = "none")} />
              ) : (
                <Globe className="size-9 shrink-0 text-neutral-400" />
              )}
              <div className="mx-auto flex items-center gap-2 rounded-md bg-white px-4 py-1.5 text-[15px] font-extrabold text-neutral-900 ring-1 ring-neutral-200">
                {domain}
              </div>
            </div>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={tab === "editing" ? `editing-${editView}` : tab}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
              >
                {tab === "editing" && (
                  <DemoMock
                    key={`demo-${demoResetKey}-${editView}`}
                    store={store}
                    initialOpen={null}
                    forceOpen={editingForceOpen}
                    pageContext={editView}
                    maxHeight={560}
                    tourRefs={{ countdown: countdownRef, shippingRow: shippingRowRef, addressForm: addressFormRef, addressBlock: addressBlockRef, saveBtn: saveBtnRef, orderRow: orderRowRef, orderBtn: orderBtnRef, orderPlusBtn: orderPlusBtnRef, payPanel: payPanelRef, payBtn: payBtnRef, sections: sectionsRef }}
                    addressOverride={addrOverride}
                    qtyBump={qtyBump}
                  />
                )}
                {tab === "cod-prepaid" && (
                  <CodToPrepaidMock
                    key={`cod-${codResetKey}`}
                    store={store}
                    maxHeight={560}
                    tourRefs={{ offerCard: codOfferRef, payBtn: codPayBtnRef }}
                  />
                )}
                {tab === "address" && (
                  <DemoMock
                    key={`addr-${addrResetKey}`}
                    store={store}
                    initialOpen="shipping"
                    forceOpen="shipping"
                    maxHeight={560}
                    addressValidation
                    scriptedValidation={activeTour === "address"}
                    tourRefs={{ shippingRow: addrShippingRowRef, addressBlock: addrFlaggedRef, addrSaveBtn: addrSaveBtnRef }}
                  />
                )}
                {tab === "cancel" && (
                  <DemoMock store={store} initialOpen="cancel" forceOpen="cancel" maxHeight={560} />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* mobile: the "ready to try" box at the end, below the demo */}
          <ReadyToTryBox tab={tab} className="mx-auto mt-2 lg:hidden" />
        </div>
      </div>

      {/* lifted guided-tour overlay (portals to body; can target any element) */}
      {activeTour && curStep && !revealScreen && (curStep.outcome || spotlightRect) && (
        <TourOverlay
          step={tourStep}
          total={steps.length}
          displayStep={displayStep}
          displayTotal={displayTotal}
          rect={spotlightRect}
          title={curStep.title}
          desc={curStep.desc}
          cta={curStep.cta}
          clickThrough={!!curStep.clickThrough || !!curStep.autoClickId}
          showDot={!curStep.outcome && measuredStep === tourStep}
          showFinger={tourStep === 0 && !curStep.outcome}
          dotRect={dotRect}
          hideCard={curStep.hideCard}
          hideCta={curStep.hideCta}
          cardAbove={curStep.cardAbove}
          outcome={curStep.outcome}
          outcomeHeadline={curStep.outcomeHeadline}
          outcomeButton={curStep.outcomeButton}
          outcomeHref={APP_URL}
          nextLabel={curStep.nextLabel}
          finalStep={curStep.finalStep}
          blurRect={demoRect}
          nextFeatureLabel={nextFeatureLabel}
          nextFeatureDesc={nextFeatureDesc}
          onNextFeature={goToNextFeature}
          onAdvance={advanceTour}
          onClose={closeTour}
        />
      )}
    </div>
  );
}
