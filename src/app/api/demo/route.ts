import { NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileP = promisify(execFile);

export const runtime = "nodejs";
export const maxDuration = 60; // sequential Jina fallbacks (Cloudflare bypass) can take a while

type DemoProductOut = {
  id: string;
  title: string;
  variant: string;
  price: number;
  qty: number;
  image: string | null;
  variants: { title: string; price: number }[];
};

type Branding = {
  brandName: string | null;
  brandColor: string | null;
  logo: string | null;
  currency: string | null;
  products: DemoProductOut[];
};

// --- simple in-memory cache (per server instance) ---
const cache = new Map<string, { data: Branding; at: number }>();
const TTL = 1000 * 60 * 30; // 30 min

const FETCH_TIMEOUT = 4500;
const MAX_BYTES = 600_000; // cap HTML we read

// Many stores (Cloudflare/WAF) block generic bot User-Agents — even for the
// public /products.json — so present as a real browser to read public data.
const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
};

/** Reject obviously-internal / non-public hosts (basic SSRF guard). */
function isBlockedHost(host: string) {
  const h = host.toLowerCase();
  if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal")) return true;
  if (!h.includes(".")) return true; // must look like a real domain
  // raw IP literals -> block private / reserved ranges
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) {
    const p = h.split(".").map(Number);
    if (p[0] === 10) return true;
    if (p[0] === 127) return true;
    if (p[0] === 0) return true;
    if (p[0] === 169 && p[1] === 254) return true; // link-local / cloud metadata
    if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return true;
    if (p[0] === 192 && p[1] === 168) return true;
    return false;
  }
  if (h.includes(":")) return true; // IPv6 literal -> block to be safe
  return false;
}

function normalizeUrl(raw: string): URL | null {
  try {
    const trimmed = raw.trim().replace(/^https?:\/\//i, "");
    const url = new URL(`https://${trimmed}`);
    if (url.protocol !== "https:") return null;
    if (isBlockedHost(url.hostname)) return null;
    return url;
  } catch {
    return null;
  }
}

/** True when a response body is a Cloudflare/WAF challenge instead of real content. */
function isChallenge(text: string): boolean {
  return /Just a moment|challenge-platform|cf-browser-verification|Attention Required/i.test(text.slice(0, 2500));
}

/** Read a capped amount of the body (whole for JSON; up to </head> for HTML). */
async function readCapped(res: Response, htmlHead: boolean): Promise<string | null> {
  if (!res.ok || !res.body) return null;
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let out = "";
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    out += decoder.decode(value, { stream: true });
    if (total > MAX_BYTES || (htmlHead && /<\/head>/i.test(out))) break;
  }
  reader.cancel().catch(() => {});
  return out;
}

async function tryFetch(url: string, accept: string, htmlHead: boolean): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { ...BROWSER_HEADERS, Accept: accept },
    });
    const text = await readCapped(res, htmlHead);
    if (text && isChallenge(text)) return null; // let curl handle it
    return text;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fallback via the system `curl` — many Shopify stores sit behind Cloudflare,
 * which fingerprints and blocks Node/undici (returns a "Just a moment" 403) but
 * lets curl through, so we can still read the public /products.json + branding.
 */
async function curlFetch(url: string, accept: string): Promise<string | null> {
  try {
    const { stdout } = await execFileP(
      "curl",
      [
        "-sL",
        "--max-redirs", "5",
        "--max-time", String(Math.ceil(FETCH_TIMEOUT / 1000) + 4),
        "-A", BROWSER_HEADERS["User-Agent"],
        "-H", `Accept: ${accept}`,
        "-H", `Accept-Language: ${BROWSER_HEADERS["Accept-Language"]}`,
        url,
      ],
      { maxBuffer: MAX_BYTES + 200_000, timeout: FETCH_TIMEOUT + 6000 }
    );
    if (!stdout || isChallenge(stdout)) return null;
    return stdout;
  } catch {
    return null;
  }
}

/**
 * Fallback via Jina AI Reader (r.jina.ai) — a public reader that fetches with a
 * real headless browser, so it bypasses Cloudflare from ANY server (works on
 * Vercel where `curl` isn't available / the datacenter IP is blocked).
 * `format: "html"` returns raw HTML (for branding); default returns text/markdown
 * (the JSON body is embedded, so callers extract it).
 */
// Optional Jina API key — unauthenticated r.jina.ai is rate-limited per IP, which
// Vercel's shared datacenter IPs hit quickly (causing WAF-protected stores to fall
// back to the sample). A free key (jina.ai/reader) raises the limit dramatically.
const JINA_KEY = process.env.JINA_API_KEY;

async function jinaFetch(url: string, format?: "html"): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT + 12000);
  try {
    const headers: Record<string, string> = { "User-Agent": BROWSER_HEADERS["User-Agent"] };
    if (format) headers["X-Return-Format"] = format;
    if (JINA_KEY) headers["Authorization"] = `Bearer ${JINA_KEY}`;
    const res = await fetch(`https://r.jina.ai/${url}`, { signal: controller.signal, headers });
    if (!res.ok) return null;
    const text = await res.text();
    if (!text || isChallenge(text)) return null;
    return text;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Pull the JSON object out of a raw/wrapped response (Jina embeds it in markdown). */
function extractJson(raw: string): string {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  return start >= 0 && end > start ? raw.slice(start, end + 1) : raw;
}

function safeJson(raw: string | null): unknown | null {
  if (!raw) return null;
  try {
    return JSON.parse(extractJson(raw));
  } catch {
    return null;
  }
}

/** Fast path only (Node + curl) — no Jina, so these can safely run concurrently. */
async function directText(url: string, htmlHead = true): Promise<string | null> {
  return (
    (await tryFetch(url, "text/html,application/xhtml+xml", htmlHead)) ??
    (await curlFetch(url, "text/html,application/xhtml+xml"))
  );
}

async function directJson(url: string): Promise<unknown | null> {
  return safeJson(
    (await tryFetch(url, "application/json", false)) ?? (await curlFetch(url, "application/json"))
  );
}

/** Jina-only (headless browser proxy) — used sequentially as a last resort. */
async function jinaJson(url: string): Promise<unknown | null> {
  return safeJson(await jinaFetch(url));
}

type ShopifyProduct = {
  id?: number | string;
  handle?: string;
  title?: string;
  vendor?: string;
  variants?: { title?: string; price?: string | number }[];
  images?: { src?: string }[];
};

/** Brand name from a products.json vendor field — fallback when the homepage is unreadable. */
function vendorFrom(json: unknown): string | null {
  const arr =
    json && typeof json === "object" && Array.isArray((json as { products?: unknown }).products)
      ? (json as { products: ShopifyProduct[] }).products
      : [];
  const v = arr.find((p) => p.vendor && p.vendor.trim())?.vendor?.trim();
  return v || null;
}

function parseProducts(json: unknown): DemoProductOut[] {
  const arr =
    json && typeof json === "object" && Array.isArray((json as { products?: unknown }).products)
      ? ((json as { products: ShopifyProduct[] }).products)
      : [];
  return arr
    .slice(0, 8)
    .map((p) => {
      const v = p.variants?.[0];
      const variant = v?.title && v.title !== "Default Title" ? v.title : "";
      const price = Math.round(Number(v?.price ?? 0)) || 0;
      const image = p.images?.[0]?.src ?? null;
      const variants = (p.variants ?? [])
        .map((vv) => ({
          title: vv?.title && vv.title !== "Default Title" ? vv.title : "Default",
          price: Math.round(Number(vv?.price ?? 0)) || price,
        }))
        .filter((vv) => vv.title !== "Default" || (p.variants ?? []).length === 1);
      return {
        id: String(p.id ?? p.handle ?? Math.random()),
        title: String(p.title ?? "Product"),
        variant,
        price,
        qty: 1,
        image,
        variants,
      };
    })
    .filter((p) => p.title && p.title !== "Product");
}

// --- JSON-LD / schema.org product parsing --------------------------------
// Non-Shopify stores (WooCommerce, BigCommerce, custom) don't expose
// /products.json, but many embed schema.org Product / ItemList markup in
// <script type="application/ld+json"> on the homepage. Parse that as a fallback
// so the demo shows real products for those stores too.

/** Collect every JSON-LD node in the HTML, flattening arrays and @graph containers. */
function collectJsonLdNodes(html: string): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const raw = m[1].trim();
    if (!raw) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      continue; // ignore malformed block
    }
    const nodes = Array.isArray(parsed) ? parsed : [parsed];
    for (const n of nodes) {
      if (!n || typeof n !== "object") continue;
      const node = n as Record<string, unknown>;
      const graph = node["@graph"];
      if (Array.isArray(graph)) {
        for (const g of graph) if (g && typeof g === "object") out.push(g as Record<string, unknown>);
      } else {
        out.push(node);
      }
    }
  }
  return out;
}

function typeMatches(t: unknown, name: string): boolean {
  const target = name.toLowerCase();
  if (typeof t === "string") return t.toLowerCase().endsWith(target);
  if (Array.isArray(t)) return t.some((x) => typeof x === "string" && x.toLowerCase().endsWith(target));
  return false;
}

function jsonLdImage(node: Record<string, unknown>, base: URL): string | null {
  const img = node.image;
  let raw: string | null = null;
  if (typeof img === "string") raw = img;
  else if (Array.isArray(img) && img.length) {
    raw = typeof img[0] === "string" ? img[0] : ((img[0] as Record<string, unknown>)?.url as string) ?? null;
  } else if (img && typeof img === "object") {
    raw = ((img as Record<string, unknown>).url as string) ?? null;
  }
  return absolutize(raw, base);
}

function jsonLdPrice(node: Record<string, unknown>): number {
  const offers = node.offers;
  const offer = Array.isArray(offers) ? offers[0] : offers;
  if (offer && typeof offer === "object") {
    const o = offer as Record<string, unknown>;
    const p = o.price ?? o.lowPrice ?? (o.priceSpecification as Record<string, unknown> | undefined)?.price;
    return Math.round(Number(p)) || 0;
  }
  return 0;
}

function jsonLdToProduct(node: Record<string, unknown>, base: URL): DemoProductOut | null {
  const name = typeof node.name === "string" ? decodeHtml(node.name.trim()) : "";
  if (!name) return null;
  const id =
    (typeof node.sku === "string" && node.sku) ||
    (typeof node.url === "string" && node.url) ||
    name;
  return {
    id: String(id),
    title: name,
    variant: "",
    price: jsonLdPrice(node),
    qty: 1,
    image: jsonLdImage(node, base),
    variants: [],
  };
}

// --- Embedded app state (single-page storefronts) -------------------------
// Some stores render the catalogue client-side and ship it as one JSON blob in a
// <script>. There is no /products.json and no JSON-LD, so nothing above finds them.

/** Globals worth trying, in the order they're most likely to hold a catalogue. */
const STATE_GLOBALS = [
  "__REACT_QUERY_STATE__",
  "__PRELOADED_STATE__",
  "__NUXT__",
  "__NEXT_DATA__",
];

/**
 * Keys that mark an object as a *product* rather than a nav item, author or
 * category. Requiring one of these alongside a name is what stops the walker
 * dragging in every named object on the page.
 */
const PRODUCT_SIGNALS = [
  "looks",
  "sku",
  "permalink",
  "handle",
  "style_code",
  "product_type",
  "variants",
  "price",
];

/**
 * Stand-in prices for stores that don't publish one. Jewlr prices at
 * configuration time, so its price fields are null — the demo still needs numbers
 * for the cart maths to mean anything. Assigned by index, so they're stable.
 */
const DEMO_PRICES = [2499, 3999, 1899, 5499, 2999, 6999];

/**
 * An image value may be a full srcset ("url 256w, url 600w, …"). Take one URL and
 * ask for the largest render the CDN offers, so the demo isn't showing thumbnails.
 */
function cleanSrcset(raw: string): string {
  const first = raw.split(",")[0]?.trim().split(/\s+/)[0] ?? raw.trim();
  return first.replace(/([?&]dim=)\d+/, "$1600");
}

/** Pull a usable image out of a product object, whatever shape it stores one in. */
function embeddedImage(p: Record<string, unknown>, base: URL): string | null {
  // jewlr keeps images per look/view: looks[view].images[0]
  const looks = p.looks;
  if (looks && typeof looks === "object") {
    for (const view of Object.values(looks as Record<string, unknown>)) {
      const imgs = (view as Record<string, unknown>)?.images;
      if (Array.isArray(imgs) && typeof imgs[0] === "string" && imgs[0]) {
        return absolutize(cleanSrcset(imgs[0]), base);
      }
    }
  }
  // generic shapes
  const single = p.image ?? p.featured_image ?? p.thumbnail;
  if (typeof single === "string" && single) return absolutize(cleanSrcset(single), base);
  const many = p.images;
  if (Array.isArray(many) && typeof many[0] === "string" && many[0]) {
    return absolutize(cleanSrcset(many[0]), base);
  }
  return null;
}

/** A number if the object actually carries one, else 0 for the caller to fill in. */
function embeddedPrice(p: Record<string, unknown>): number {
  const raw = p.price;
  if (typeof raw === "number" && raw > 0) return Math.round(raw);
  if (typeof raw === "string" && Number(raw) > 0) return Math.round(Number(raw));
  // price can be an object of nulls (priced at configuration) — check the usual fields
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    for (const k of ["price_to_display", "selling", "sale_price", "reg_price", "amount"]) {
      const v = o[k];
      if (typeof v === "number" && v > 0) return Math.round(v);
      if (typeof v === "string" && Number(v) > 0) return Math.round(Number(v));
    }
  }
  return 0;
}

/**
 * Walk an embedded state blob and collect anything product-shaped. Returns [] when
 * the page has no such blob, so it costs nothing on stores handled further up.
 */
function productsFromEmbeddedState(html: string, base: URL): DemoProductOut[] {
  const out: DemoProductOut[] = [];
  const seen = new Set<string>();

  for (const global of STATE_GLOBALS) {
    const m = html.match(
      new RegExp(`${global}\\s*=\\s*(\\{[\\s\\S]*?\\})\\s*;?\\s*<\\/script>`)
    );
    if (!m) continue;

    let root: unknown;
    try {
      root = JSON.parse(m[1]);
    } catch {
      continue; // truncated or not JSON after all — try the next global
    }

    const visit = (node: unknown, depth: number) => {
      if (!node || typeof node !== "object" || depth > 14) return;
      if (Array.isArray(node)) {
        for (const item of node) visit(item, depth + 1);
        return;
      }
      const obj = node as Record<string, unknown>;
      const name = typeof obj.name === "string" ? decodeHtml(obj.name.trim()) : "";
      if (name && PRODUCT_SIGNALS.some((k) => k in obj) && !seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        out.push({
          id: String(obj.style_code ?? obj.sku ?? obj.handle ?? obj.permalink ?? name),
          title: name,
          variant: typeof obj.product_type === "string" ? obj.product_type : "",
          price: embeddedPrice(obj),
          qty: 1,
          image: embeddedImage(obj, base),
          variants: [],
        });
      }
      for (const key of Object.keys(obj)) visit(obj[key], depth + 1);
    };
    visit(root, 0);

    if (out.length > 0) break; // first blob that yields products wins
  }

  // Only keep entries we can actually render, then fill in missing prices.
  return out
    .filter((p) => p.image)
    .map((p, i) => (p.price > 0 ? p : { ...p, price: DEMO_PRICES[i % DEMO_PRICES.length] }));
}

function parseJsonLdProducts(html: string, base: URL): DemoProductOut[] {
  const nodes = collectJsonLdNodes(html);
  const products: DemoProductOut[] = [];
  for (const node of nodes) {
    const t = node["@type"];
    if (typeMatches(t, "Product")) {
      const p = jsonLdToProduct(node, base);
      if (p) products.push(p);
    } else if (typeMatches(t, "ItemList")) {
      const items = node.itemListElement;
      if (!Array.isArray(items)) continue;
      for (const it of items) {
        if (!it || typeof it !== "object") continue;
        const item = ((it as Record<string, unknown>).item ?? it) as Record<string, unknown>;
        if (typeMatches(item["@type"], "Product")) {
          const p = jsonLdToProduct(item, base);
          if (p) products.push(p);
        }
      }
    }
  }
  // dedupe by title, cap at 8
  const seen = new Set<string>();
  return products
    .filter((p) => {
      const k = p.title.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, 8);
}

function metaContent(html: string, patterns: RegExp[]): string | null {
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return decodeHtml(m[1].trim());
  }
  return null;
}

function decodeHtml(s: string) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function absolutize(href: string | null, base: URL): string | null {
  if (!href) return null;
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

/**
 * Upgrade a logo/image URL to a crisp, larger version. Shopify (and many other
 * CDNs) accept a `width`/`height` query param — favicons/apple-touch-icons come
 * back tiny (e.g. 180×180), which looks pixelated/blurry when shown large. Bump
 * the width and drop height/crop so it scales up sharp with the aspect preserved.
 */
function upscaleImage(url: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.searchParams.has("width") || u.searchParams.has("height")) {
      u.searchParams.set("width", "600");
      u.searchParams.delete("height");
      u.searchParams.delete("crop");
      return u.toString();
    }
    return url;
  } catch {
    return url;
  }
}

// Site metadata sometimes yields a useless "brand" (a page title like "Home",
// or literally "Me") — fall back to the domain name in those cases.
const GENERIC_NAMES = new Set(["me", "home", "shop", "store", "index", "welcome", "page", "cart"]);
// Error / placeholder / challenge page titles that must NEVER become the "brand" —
// stores occasionally serve these (or the fetch briefly caught an error/maintenance
// page), and we'd rather fall back to the domain name than show "Something went wrong".
const BAD_TITLE_RE =
  /^(something went wrong|error|oops|internal server error|page not found|not found|404|403|500|access denied|forbidden|unauthorized|just a moment|attention required|checking your browser|service unavailable|temporarily unavailable|site (temporarily )?unavailable|under (construction|maintenance)|maintenance|coming soon|website expired|domain (for sale|expired|parked)|bad gateway|gateway timeout)\b/i;
// Bot-check / anti-scraping interstitials (Google reCAPTCHA, Amazon "Robot Check",
// etc.) leak into the <title>/og:site_name as e.g. "Flipkart reCAPTCHA" — reject if
// these appear ANYWHERE in the name, then fall back to the clean domain name.
const CHALLENGE_RE =
  /recaptcha|captcha|are you (a )?(human|robot)|robot check|attention required|access denied|just a moment|verify you are (a )?human|unusual traffic|enable (javascript|cookies)/i;
function isUsableName(s: string | null | undefined): s is string {
  if (!s) return false;
  const t = s.trim();
  if (t.length < 2) return false;
  if (GENERIC_NAMES.has(t.toLowerCase())) return false;
  if (BAD_TITLE_RE.test(t)) return false;
  if (CHALLENGE_RE.test(t)) return false;
  return true;
}

// Brand names are short. A long descriptive <title> (e.g. "Post-Surgery Bras for
// Your Unique Body Type at AnaOno") is not a brand — reject it so we fall back to
// the domain name instead of a stray title fragment.
function isBrandLike(s: string): boolean {
  const t = s.trim();
  return t.length <= 30 && t.split(/\s+/).length <= 4;
}

function parseBranding(html: string, base: URL): Omit<Branding, "products" | "currency"> {
  // Prefer og:site_name (a clean brand). Otherwise take the first segment of the
  // <title>, but only split on separators surrounded by whitespace or a pipe/dash —
  // NOT a bare hyphen, so "Post-Surgery Bras … at AnaOno" doesn't become "Post".
  const ogName = metaContent(html, [
    /<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:site_name["']/i,
  ]);
  const titleName = metaContent(html, [/<title[^>]*>([^<]+)<\/title>/i])
    ?.split(/\s*[|–—]\s*|\s+-\s+/)[0]
    ?.trim();
  const domainName = base.hostname.replace(/^www\./, "").split(".")[0];
  const siteName = isUsableName(ogName)
    ? ogName
    : isUsableName(titleName) && isBrandLike(titleName)
      ? titleName
      : domainName;

  const themeColor = metaContent(html, [
    /<meta[^>]+name=["']theme-color["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']theme-color["']/i,
  ]);
  const brandColor = themeColor && /^#?[0-9a-f]{3,8}$/i.test(themeColor.replace("#", ""))
    ? themeColor.startsWith("#")
      ? themeColor
      : `#${themeColor}`
    : null;

  const iconHref =
    metaContent(html, [
      /<link[^>]+rel=["']apple-touch-icon[^"']*["'][^>]+href=["']([^"']+)["']/i,
      /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']apple-touch-icon[^"']*["']/i,
    ]) ||
    metaContent(html, [/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i]) ||
    metaContent(html, [
      /<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']+)["']/i,
      /<link[^>]+href=["']([^"']+)["'][^>]+rel=["'](?:shortcut )?icon["']/i,
    ]);

  return {
    brandName: siteName ? capitalize(siteName) : null,
    brandColor,
    logo: upscaleImage(absolutize(iconHref, base)),
  };
}

function capitalize(s: string) {
  return s.length ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function parseCurrency(json: unknown): string | null {
  if (!json || typeof json !== "object") return null;
  const c = (json as Record<string, unknown>).currency;
  if (typeof c === "string" && /^[A-Z]{3}$/.test(c)) return c;
  return null;
}

export async function POST(req: Request) {
  let body: { url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const url = normalizeUrl(body.url || "");
  if (!url) {
    return NextResponse.json({ error: "Invalid or blocked URL" }, { status: 400 });
  }

  const key = url.hostname;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) {
    return NextResponse.json(hit.data);
  }

  const productsUrl = `${url.origin}/products.json?limit=8`;
  const collectionsUrl = `${url.origin}/collections/all/products.json?limit=8`;

  // Phase 1 — fast path (Node + curl), concurrent, NO Jina. Handles every store
  // that isn't behind a Node-blocking WAF, with zero rate-limited requests.
  const [directHtml, directPj, cartJson] = await Promise.all([
    directText(url.toString(), false),
    directJson(productsUrl),
    directJson(`${url.origin}/cart.js`),
  ]);
  let html = directHtml;
  let productsJson = directPj;

  let products = parseProducts(productsJson);
  // Secondary Shopify path (still fast/direct) — some stores 404 /products.json.
  if (products.length === 0) {
    const alt = await directJson(collectionsUrl);
    products = parseProducts(alt);
    if (products.length > 0) productsJson = alt;
  }

  // Phase 2 — Jina fallback (WAF-protected stores). Sequential + products FIRST so
  // the important call isn't starved by a concurrent branding call under rate limits.
  if (products.length === 0) {
    productsJson = await jinaJson(productsUrl);
    products = parseProducts(productsJson);
  }
  if (products.length === 0) {
    const alt = await jinaJson(collectionsUrl);
    products = parseProducts(alt);
    if (products.length > 0) productsJson = alt;
  }
  if (!html) {
    html = await jinaFetch(url.toString(), "html");
  }
  // Non-Shopify stores — pull schema.org/JSON-LD products from the homepage.
  if (products.length === 0 && html) {
    products = parseJsonLdProducts(html, url);
  }
  // Single-page storefronts — catalogue lives in an embedded state blob, not markup.
  if (products.length === 0 && html) {
    products = productsFromEmbeddedState(html, url);
  }

  const currency = parseCurrency(cartJson);

  // Never hard-fail: even when a store blocks us entirely (no readable homepage and
  // no products — e.g. Flipkart/Amazon-style bot walls), we still return the brand
  // name (from the domain) + a favicon fallback below, and the client fills in the
  // sample catalog. The demo should always render a branded preview, never an error.
  const branding = html
    ? parseBranding(html, url)
    : {
        // No homepage: use the products' vendor, else the domain name.
        brandName:
          vendorFrom(productsJson) || capitalize(url.hostname.replace(/^www\./, "").split(".")[0]),
        brandColor: null,
        logo: null,
      };

  // Always have a logo: when we couldn't extract the apple-touch-icon (e.g. a
  // Cloudflare/bot-protected store whose homepage HTML we couldn't read), fall back
  // to Google's favicon service — it resolves the real favicon for far more hosts
  // than DuckDuckGo (which 404s to a gray-chevron placeholder for big sites like
  // flipkart.com), so the browser bar shows the brand icon, never a broken glyph.
  if (!branding.logo) {
    branding.logo = `https://www.google.com/s2/favicons?domain=${url.hostname.replace(/^www\./, "")}&sz=256`;
  }

  const data: Branding = { ...branding, currency, products };
  cache.set(key, { data, at: Date.now() });
  return NextResponse.json(data);
}
