/**
 * Central site configuration: nav, footer, integrations, and the MOCK demo data.
 * All copy here is original (written for CP: Order Editing & Upsell) — nothing
 * is lifted from the reference site or the Shopify listing verbatim.
 */
import type { LucideIcon } from "lucide-react";
import {
  Pencil,
  MapPin,
  XCircle,
  TrendingUp,
  RefreshCw,
  SlidersHorizontal,
  Store,
  Boxes,
  Truck,
  Users,
  GitBranch,
  Mail,
  Package,
} from "lucide-react";
import { reviews } from "./reviews";

/** Exact review text from the Shopify App Store export (reviews.ts), by store name. */
function reviewText(storeName: string): string | null {
  const r = reviews.find((rv) => rv.name === storeName);
  return r ? r.content.replace(/\s*\n\s*/g, " ").trim() : null;
}

/**
 * Shopify App Store listing — the single source of truth for every CTA on the site.
 * Carries the India demo's UTM tags, so installs attribute back to this page. It was
 * previously hard-coded in five files, which meant a tag change had to be repeated
 * five times.
 */
export const APP_STORE_URL =
  "https://apps.shopify.com/clickpost-order-edit-cancel?utm_source=clickpost_demo_IN&utm_medium=referral_IN&utm_campaign=order_edit_demo_IN&utm_content=sticky_cta_IN";

/** Same listing, deep-linked to its reviews. The fragment has to follow the query. */
export const APP_STORE_REVIEWS_URL = `${APP_STORE_URL}#reviews`;

export const site = {
  name: "Clickpost", // brand wordmark (logo slot left intentionally empty in UI)
  product: "Order Editing & Upsell",
  tagline: "Let shoppers fix their own orders.",
  phone: "+91 00000 00000", // TODO: replace with real number
  email: "hello@clickpost.ai", // TODO: confirm
};

// ---- Navigation. Flat links with a single dropdown (matches reference). ----
export type NavLink = { label: string; href: string; desc?: string };
export type NavItem = { label: string; href: string; items?: NavLink[] };

export const mainNav: NavItem[] = [
  { label: "Product Tour", href: "/#demo" },
  {
    label: "Customer Love",
    href: "/reviews",
    items: [
      { label: "Reviews", href: "/reviews", desc: "52 five-star merchant reviews" },
    ],
  },
];

// ---- Integrations (shown on the dedicated /integrations page) ----
export type Integration = {
  name: string;
  icon: LucideIcon;
  category: string;
  desc: string;
};

export const integrations: Integration[] = [
  {
    name: "Klaviyo",
    icon: Mail,
    category: "Tech",
    desc: "Klaviyo and Order Editing sync customer events for personalized email automation.",
  },
  {
    name: "Gorgias",
    icon: Users,
    category: "Tech",
    desc: "Gorgias integration displays order editing info directly in your support tickets.",
  },
  {
    name: "Zendesk",
    icon: Users,
    category: "Tech",
    desc: "Zendesk integration provides order context within your support platform.",
  },
  {
    name: "AfterSell",
    icon: TrendingUp,
    category: "Tech",
    desc: "AfterSell and Order Editing combine post-purchase upsells with order modifications.",
  },
  {
    name: "AfterShip",
    icon: Truck,
    category: "Tech",
    desc: "AfterShip syncs tracking updates and flags deliveries with issues.",
  },
  {
    name: "Loop Returns",
    icon: RefreshCw,
    category: "Tech",
    desc: "Loop Returns integration lets customers exchange items directly.",
  },
  {
    name: "Rebuy",
    icon: Store,
    category: "Tech",
    desc: "Rebuy powers smart product recommendations in the post-purchase editor.",
  },
  {
    name: "Recharge",
    icon: SlidersHorizontal,
    category: "Tech",
    desc: "Recharge allows customers to edit subscription orders seamlessly.",
  },
  {
    name: "SAP ERP",
    icon: SlidersHorizontal,
    category: "ERP",
    desc: "SAP integration pushes order corrections to your enterprise resource planning system.",
  },
  {
    name: "ShipStation",
    icon: Truck,
    category: "Shipping",
    desc: "ShipStation syncs fulfillment statuses and shipping label adjustments.",
  },
  {
    name: "Shopify Flow",
    icon: GitBranch,
    category: "iPaaS",
    desc: "Trigger workflows automatically when an order is edited or cancelled.",
  },
  {
    name: "Unicommerce",
    icon: Truck,
    category: "WMS",
    desc: "Keep the warehouse in sync so it always ships the corrected order.",
  },
  {
    name: "Easycom",
    icon: Package,
    category: "3PL",
    desc: "Push edited orders straight into your fulfillment pipeline.",
  },
];

// Names only, for any compact contexts
export const integrationNames: string[] = integrations.map((i) => i.name);

// ---- Customer logos (social proof, shown in the hero marquee) ----
// HOW TO ADD REAL LOGOS:
//   1. Drop each logo file into  public/customers/  (SVG preferred; PNG ok).
//   2. Add an entry below: { src: "/customers/<filename>", name: "<Brand>" }.
// Until at least one entry exists, blank placeholder marks are shown instead.
export type CustomerLogo = {
  src?: string; // logo image; when omitted the brand renders as a styled wordmark
  name: string;
  reviewer: string;
  role: string;
  review: string | null; // tap-to-open review (null until the real one is supplied)
  date?: string; // when the review was left (Shopify App Store export)
  badge?: string; // optional pill under the logo, e.g. "9-figure brand"
};

// International brands featured in the hero ribbon — each with a real review
// from the Shopify App Store export (reviews.csv).
export const customerLogos: CustomerLogo[] = [
  {
    src: "/customers/curlwarehouse.png",
    name: "Curl Warehouse",
    reviewer: "Curl Warehouse Team",
    role: "E-commerce",
    review:
      "This has reduced the number of emails we receive to update orders. It's easy to use and set up, and the developers have been very receptive to changes.",
    date: "Nov 21, 2023",
  },
  {
    src: "/customers/mateina.png",
    name: "Mateina",
    reviewer: "Mateina Team",
    role: "E-commerce",
    review:
      "One of the best order editing apps available that actually works! I've tested about a dozen, and this was by far one of the best. Amazing team and support.",
    date: "Mar 12, 2024",
  },
  {
    src: "/customers/renuebyscience.svg",
    name: "Renue By Science",
    reviewer: "Renue By Science Team",
    role: "E-commerce",
    review:
      "The team at Clickpost are exceptional developers and great people. They listen to feedback and have built genuinely useful tools for Shopify stores.",
    date: "Jan 8, 2024",
  },
  {
    src: "/customers/doonails.svg",
    name: "Doonails",
    reviewer: "Doonails Team",
    role: "E-commerce",
    review: "Really helped us quickly to fix all issues.",
    date: "Feb 3, 2024",
  },
  {
    src: "/customers/modomu.png",
    name: "Modomu",
    reviewer: "Modomu Team",
    role: "E-commerce",
    review:
      "Really happy with Clickpost so far. We added it mainly for order edits but ended up using the upsell part too, which brought in a bit of extra revenue.",
    date: "Apr 5, 2024",
  },
  {
    src: "/customers/hautesauce.png",
    name: "Haute Sauce",
    reviewer: "Haute Sauce Team",
    role: "E-commerce",
    review:
      "Installed Clickpost recently and it works great. Customers can edit their orders and even add extra items, which is a nice bonus.",
    date: "May 17, 2024",
  },
  // More brands from the Shopify App Store export. Real brand logos (transparent
  // PNGs pulled from each store; V-Guard's black-bg logo was keyed to a
  // transparent silhouette) render like the others. Review text is the EXACT
  // content from reviews.ts (pulled by store name, no rewording).
  {
    src: "/customers/westside.png",
    name: "Westside Global",
    reviewer: "Westside Global Team",
    role: "E-commerce",
    review: reviewText("Westside Global"),
    date: "Feb 13, 2026",
  },
  {
    src: "/customers/myborosil.png",
    name: "MyBorosil",
    reviewer: "MyBorosil Team",
    role: "E-commerce",
    review: reviewText("MyBorosil"),
    date: "Oct 14, 2025",
  },
  {
    src: "/customers/wellbeingnutrition.png",
    name: "Wellbeing Nutrition",
    reviewer: "Wellbeing Nutrition Team",
    role: "E-commerce",
    review: reviewText("Wellbeing Nutrition"),
    date: "Sep 17, 2025",
  },
  {
    src: "/customers/marsbyghc.png",
    name: "Mars By GHC",
    reviewer: "Mars By GHC Team",
    role: "E-commerce",
    review: reviewText("Mars By GHC"),
    date: "Jan 8, 2026",
  },
  {
    src: "/customers/vanillapura.png",
    name: "VanillaPura",
    reviewer: "VanillaPura Team",
    role: "E-commerce",
    review: reviewText("VanillaPura"),
    date: "Aug 27, 2025",
  },
  {
    src: "/customers/gharsoaps.png",
    name: "GHAR SOAPS",
    reviewer: "GHAR SOAPS Team",
    role: "E-commerce",
    review: reviewText("GHAR SOAPS"),
    date: "Feb 14, 2026",
  },
];

// Credibility info for featured brands — a revenue-tier pill + a country shown
// alongside the date. Rendered on the brand strip, review carousel, and Wall of
// Love. Keyed by exact brand name.
export type BrandInfo = { tier?: string; country?: string };
export const brandInfo: Record<string, BrandInfo> = {
  // --- non-Indian merchants ---
  "Doonails": { tier: "$100M+ brand", country: "Germany" },
  "Curl Warehouse": { tier: "7-figure brand", country: "Canada" },
  "VanillaPura": { tier: "7-figure brand", country: "Utah, USA" },
  "GHAR SOAPS": { tier: "8-figure brand", country: "UAE" },
  "Mateina": { tier: "Andrew Huberman's favourite", country: "Canada" },
  "Renue By Science": { country: "USA" },

  // --- Indian merchants ---
  // Names mislead in both directions here (Italian Colony is Bangalore-based;
  // Haute Sauce is Bengaluru), so the less obvious ones were each confirmed
  // against the brand's own site or press before being tagged.
  "MIRAGGIO": { tier: "8-figure brand", country: "India" },
  "Mars By GHC": { tier: "7-figure brand", country: "India" },
  "V-Guard Industries Limited": { country: "India" },
  "bearhouseindia": { country: "India" },
  "sanskritagain": { country: "India" },
  "Bacca Bucci": { country: "India" },
  "HoneyVeda": { country: "India" },
  "Divinelane": { country: "India" },
  "Wellbeing Nutrition": { country: "India" },
  "Wellwith": { country: "India" },
  "Berry - Wellwithlife": { country: "India" },
  "Wow - Wellwithlife": { country: "India" },
  "Paradyes": { country: "India" },
  "Gully Labs": { country: "India" },
  "URturms": { country: "India" },
  "Recode Studios": { country: "India" },
  "Miniwesst": { country: "India" },
  "MyBorosil": { country: "India" },
  "Starquik": { country: "India" },
  "Westside": { country: "India" },
  "Westside Global": { country: "India" },
  "Samoh by TATA": { country: "India" },
  "Samoh International": { country: "India" },
  "The Gareeb Store": { country: "India" },
  "Gladful": { country: "India" },
  "World of Asaya": { country: "India" },
  "Haute Sauce": { country: "India" },
  "Italian Colony": { country: "India" },
  "Modomu": { country: "India" },
  "Pinacolada": { country: "India" },
  "Bonhomie": { country: "India" },
  "Bichhavans": { country: "India" },
  "Sudathi": { country: "India" },
  "Muffynn": { country: "India" },
  "Tuco Kids": { country: "India" },
};

// number of blank placeholder marks to show while `customerLogos` is empty
export const customerLogoCount = 8;

// Extra brand logos for the /reviews "Wall of love" cards ONLY (kept out of the
// brand strip so it stays curated). Keyed by the exact store name in reviews.ts;
// each was fetched from that brand's own site and verified.
export const extraReviewLogos: Record<string, string> = {
  "V-Guard Industries Limited": "/customers/vguard.png",
  "PairieTales": "/customers/pairietales.png",
  "litemed": "/customers/litemed.png",
  "Muffynn": "/customers/muffynn.png",
  "lovelang": "/customers/lovelang.png",
  "buysohi": "/customers/buysohi.png",
  "GHAR SOAPS": "/customers/gharsoaps.png",
  "Bacca Bucci": "/customers/baccabucci.png",
  "World of Asaya": "/customers/worldofasaya.png",
  "Miniwesst": "/customers/miniwesst.png",
  "Bonhomie": "/customers/bonhomie.png",
  "French Accent": "/customers/frenchaccent.png",
  "Tuco Kids": "/customers/tucokids.png",
  "Starquik": "/customers/starquik.png",
  "VanillaPura": "/customers/vanillapura.png",
  "Recode Studios": "/customers/recodestudios.png",
  "URturms": "/customers/urturms.png",
  "RIJAC": "/customers/rijac.png",
  "Sammvaad": "/customers/sammvaad.png",
  "Italian Colony": "/customers/italiancolony.png",
  "Sudathi": "/customers/sudathi.png",
};

// ---- Feature showcase rows (mapped to the product's own screenshots) ----
export type Feature = {
  eyebrow: string;
  title: string;
  blurb: string;
  bullets: string[];
  icon: LucideIcon;
};

export const features: Feature[] = [
  {
    eyebrow: "Editing",
    title: "Self-service order edits",
    blurb: "Shoppers fix orders on the thank-you and order-status page — no ticket needed.",
    bullets: ["Swap items & variants", "Adjust quantities", "Update contact details"],
    icon: Pencil,
  },
  {
    eyebrow: "Address",
    title: "Address validation, built in",
    blurb: "Catch undeliverable addresses before fulfillment with Maps-powered checks.",
    bullets: ["Live address suggestions", "Flag risky deliveries", "Fewer failed shipments"],
    icon: MapPin,
  },
  {
    eyebrow: "Cancellations",
    title: "Instant cancellations & refunds",
    blurb: "Let customers cancel within your window — refunds and store credit run automatically.",
    bullets: ["Automated refunds", "Store-credit option", "Configurable windows"],
    icon: XCircle,
  },
  {
    eyebrow: "Upsell",
    title: "Post-purchase upsells",
    blurb: "Recommend the right add-on right after checkout and lift average order value.",
    bullets: ["One-tap add-on", "Smart recommendations", "No re-checkout friction"],
    icon: TrendingUp,
  },
  {
    eyebrow: "Sync",
    title: "Stays in sync with fulfillment",
    blurb: "Every edit syncs to your 3PL / WMS so the warehouse always ships the right thing.",
    bullets: ["3PL / WMS sync", "Real-time updates", "No double handling"],
    icon: RefreshCw,
  },
  {
    eyebrow: "Control",
    title: "Full control & audit trail",
    blurb: "Set editing windows, bulk-manage orders, and review a complete log of every change.",
    bullets: ["Editing windows", "Bulk editing", "Complete edit log"],
    icon: SlidersHorizontal,
  },
];

// ---- "Who we serve" segments ----
export const segments = [
  {
    icon: Store,
    title: "D2C & Shopify brands",
    blurb: "Give shoppers control and cut your support load from day one.",
  },
  {
    icon: Boxes,
    title: "High-volume merchants",
    blurb: "Automate thousands of edits a month without growing the support team.",
  },
  {
    icon: Truck,
    title: "Brands using 3PL / WMS",
    blurb: "Edits flow straight to fulfillment, so the warehouse ships what was ordered.",
  },
];

// ---- Metrics (placeholder/illustrative figures) ----
export const metrics = [
  { value: 42, suffix: "%", label: "Fewer support tickets", prefix: "" },
  { value: 18, suffix: "%", label: "Higher average order value", prefix: "+" },
  { value: 5.0, suffix: "★", label: "Rated on Shopify (52 reviews)", prefix: "", decimals: 1 },
];

// ---- Pricing tiers ----
export const pricing = [
  {
    name: "Starter",
    price: "Free",
    detail: "0–500 orders/mo",
    features: ["25 free edits / month", "Then ₹80 / edit", "Core editing & cancellations"],
    cta: "Start free",
    highlighted: false,
  },
  {
    name: "Growth",
    price: "₹3,999",
    detail: "per month · 500–5,000 orders/mo",
    features: ["Unlimited edits", "Post-purchase upsells", "Address validation"],
    cta: "Start 14-day trial",
    highlighted: true,
  },
  {
    name: "Scale",
    price: "₹9,999",
    detail: "per month · 5,000–20,000 orders/mo",
    features: ["Everything in Growth", "Dedicated account manager", "Priority support"],
    cta: "Start 14-day trial",
    highlighted: false,
  },
];

// ---- FAQ (original copy) ----
export const faqs = [
  {
    q: "How fast can I go live?",
    a: "Install from the Shopify App Store, enable the app embed, and set your editing window. Most stores are live in minutes — no developer required.",
  },
  {
    q: "What can shoppers edit themselves?",
    a: "Items, variants, quantities, shipping address, and contact details — plus self-service cancellations with automated refunds or store credit, all within the window you define.",
  },
  {
    q: "Does it work with my 3PL or WMS?",
    a: "Yes. Edits sync to your fulfillment stack in real time so the warehouse always ships the correct, updated order.",
  },
  {
    q: "How do post-purchase upsells work?",
    a: "After checkout, the app surfaces a relevant add-on that the shopper can accept in one tap — no re-entering payment — which lifts average order value.",
  },
  {
    q: "How much does it cost?",
    a: "Start free for up to 500 orders/month. Paid plans begin at ₹3,999/month with a 14-day free trial. See the pricing section above for details.",
  },
];

// ---- Footer ----
export const footerColumns = [
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "https://www.clickpost.ai/privacy-policy" },
      { label: "Cookie Policy", href: "https://www.clickpost.ai/cookie-policy" },
      { label: "Compliance Statement", href: "https://www.clickpost.ai/gdpr-compliance-statement" },
      { label: "Terms & Conditions", href: "https://www.clickpost.ai/terms-and-conditions" },
      { label: "Security Profile", href: "https://app.sprinto.com/trust-center/view/88f7aa29-f137-4d49-b596-69c89d260e85" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About Us", href: "https://www.clickpost.ai/about-us" },
      { label: "Infosec", href: "https://trust.clickpost.ai/" },
      { label: "Careers", href: "https://www.clickpost.ai/careers" },
    ],
  },
];

// ============================================================
//  MOCK DEMO DATA  — used by LiveDemoGenerator (build mode: mock)
//  Single data seam: useDemoData() currently returns this; a real
//  /api/demo (Shopify products.json + OG branding) drops in later.
// ============================================================
export type DemoProduct = {
  id: string;
  title: string;
  variant: string;
  price: number;
  qty: number;
  image?: string | null;
  variants?: { title: string; price: number }[];
};

export type DemoStore = {
  brandName: string;
  brandColor: string;
  logo?: string | null; // absolute URL to the store's logo/favicon (when personalized)
  currency?: string | null; // ISO 4217 code, e.g. "INR", "USD", "GBP"
  products: DemoProduct[];
};

// Sample catalog — used when a store's real products can't be read (non-Shopify
// sites, blocked endpoints). A realistic beauty + fashion mix with product images
// and prices so the demo always looks like a live storefront (INR-priced, since
// most fallbacks are Indian D2C stores; the currency follows store.currency).
const UNSPLASH = (id: string) => `https://images.unsplash.com/photo-${id}?w=600&q=80&auto=format&fit=crop`;
export const mockStore: DemoStore = {
  brandName: "Nira & Co.",
  brandColor: "#1f7a5a",
  currency: "INR",
  products: [
    { id: "p1", title: "Ubtan Glow Ritual Kit", variant: "Full kit", price: 2499, qty: 1, image: UNSPLASH("1596462502278-27bfdc403348") },
    { id: "p2", title: "Anarkali Kurta Set", variant: "Rani Pink · M", price: 4499, qty: 1, image: UNSPLASH("1595777457583-95e059d581b8") },
    { id: "p3", title: "Kumkumadi Radiance Face Oil", variant: "30 ml", price: 899, qty: 1, image: UNSPLASH("1631730359585-38a4935cbec4") },
    { id: "p4", title: "Handcrafted Leather Sling Bag", variant: "Tan", price: 5999, qty: 1, image: UNSPLASH("1584917865442-de89df76afd3") },
    { id: "p5", title: "Kokum Butter Body Lotion", variant: "200 ml", price: 649, qty: 1, image: UNSPLASH("1620916566398-39f1143ab7be") },
    { id: "p6", title: "Retro Round Sunglasses", variant: "Gold", price: 1899, qty: 1, image: UNSPLASH("1511499767150-a48a237f0083") },
  ],
};

// Globe arc events ("orders saved" narrative) — placeholder data
export const globeEvents = [
  { label: "Address corrected", city: "Bengaluru" },
  { label: "Order edited", city: "Mumbai" },
  { label: "Upsell accepted", city: "New Delhi" },
  { label: "Cancellation avoided", city: "Hyderabad" },
  { label: "Variant swapped", city: "Pune" },
  { label: "Address corrected", city: "Jaipur" },
];
