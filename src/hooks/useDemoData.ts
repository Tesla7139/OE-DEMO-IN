"use client";

import { useCallback, useState } from "react";
import { mockStore, type DemoProduct, type DemoStore } from "@/lib/site";

type Status = "idle" | "loading" | "ready";

type BrandingResponse = {
  brandName: string | null;
  brandColor: string | null;
  logo: string | null;
  currency: string | null;
  products: DemoProduct[];
};

/**
 * Data seam for the live demo (BUILD_SPEC §4.5).
 * Personalized mode: POST /api/demo { url } to fetch the store's real branding
 * (name + color + logo), then render it on the sample order/edit/upsell mock.
 * Any failure falls back to a derived/sample brand so it never breaks.
 */
export function useDemoData() {
  const [status, setStatus] = useState<Status>("idle");
  const [store, setStore] = useState<DemoStore | null>(null);
  const [submittedUrl, setSubmittedUrl] = useState("");

  const generate = useCallback(async (url: string) => {
    setSubmittedUrl(url);
    setStatus("loading");

    const started = Date.now();
    let branding: BrandingResponse | null = null;
    try {
      const res = await fetch("/api/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (res.ok) branding = (await res.json()) as BrandingResponse;
    } catch {
      branding = null;
    }

    // keep the reveal feeling crafted (min ~4s even if the fetch is instant) so the
    // "Building <brand>" loading screen + scrolling tickets are clearly seen first
    const elapsed = Date.now() - started;
    if (elapsed < 4000) await new Promise((r) => setTimeout(r, 4000 - elapsed));

    setStore({
      ...mockStore,
      brandName: branding?.brandName || deriveBrandName(url) || mockStore.brandName,
      brandColor: branding?.brandColor || mockStore.brandColor,
      logo: branding?.logo || null,
      currency: branding?.currency || currencyFromUrl(url) || mockStore.currency || "INR",
      products: fillProducts(branding?.products),
    });
    setStatus("ready");
  }, []);

  const reset = useCallback(() => {
    setStatus("idle");
    setStore(null);
    setSubmittedUrl("");
  }, []);

  return { status, store, submittedUrl, generate, reset };
}

// Keep every real product we captured, then top up with sample products so the demo
// storefront always looks full — e.g. a store that only exposes 2 products shows those
// 2 real ones plus sample items to fill the space. Real products are kept ahead of
// samples, and titles are de-duped so a sample never repeats a real product.
const SAMPLE_TARGET = 6;
function fillProducts(captured?: DemoProduct[]): DemoProduct[] {
  const real = captured ?? [];
  if (real.length >= SAMPLE_TARGET) return real;
  const seen = new Set(real.map((p) => p.title.trim().toLowerCase()));
  const fillers = mockStore.products.filter((p) => !seen.has(p.title.trim().toLowerCase()));
  return [...real, ...fillers].slice(0, SAMPLE_TARGET);
}

// Best-effort currency guess from the domain's TLD when the store's real currency
// can't be read (non-Shopify / blocked sites). Falls through to the caller's default.
function currencyFromUrl(url: string): string | null {
  const host = url.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0].toLowerCase();
  const byTld: [RegExp, string][] = [
    [/\.in$/, "INR"],
    [/\.(co\.uk|uk)$/, "GBP"],
    [/\.(com\.au|au)$/, "AUD"],
    [/\.ca$/, "CAD"],
    [/\.(de|fr|it|es|nl|ie|eu|pt|at|be|fi)$/, "EUR"],
    [/\.(sg)$/, "SGD"],
    [/\.(ae)$/, "AED"],
    [/\.(jp)$/, "JPY"],
  ];
  for (const [re, cur] of byTld) if (re.test(host)) return cur;
  // Unknown / generic TLD (.com, .co, .shop …): don't assume USD — fall through so
  // the caller's India-first default (INR) applies. Real Shopify stores still get
  // their true currency from cart.js upstream, so this only affects unreadable sites.
  return null;
}

function deriveBrandName(url: string): string | null {
  try {
    const clean = url.replace(/^https?:\/\//, "").replace(/^www\./, "");
    const host = clean.split("/")[0];
    const base = host.split(".")[0];
    if (!base) return null;
    return base.charAt(0).toUpperCase() + base.slice(1);
  } catch {
    return null;
  }
}
