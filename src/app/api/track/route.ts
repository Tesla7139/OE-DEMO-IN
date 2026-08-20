import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Open-notification for shared demo links: when someone actually opens a
 * /product-demo/<store> link, ping a Slack or Discord webhook so we know the
 * prospect looked at it.
 *
 * The browser calls this, not the server, on purpose — link-preview bots
 * (Slack/WhatsApp/LinkedIn unfurlers) fetch the page but never run its JS, so
 * server-side firing would alert on every paste rather than every read.
 */
const WEBHOOK = process.env.ALERT_WEBHOOK_URL;

/** Slack reads `text`, Discord reads `content` — sending both makes one URL work for either. */
function payloadFor(message: string) {
  return JSON.stringify({ text: message, content: message });
}

/** Vercel resolves the visitor's location into request headers at the edge. */
function locationOf(h: Headers): string {
  const city = h.get("x-vercel-ip-city");
  const region = h.get("x-vercel-ip-country-region");
  const country = h.get("x-vercel-ip-country");
  const parts = [city && decodeURIComponent(city), region, country].filter(Boolean);
  return parts.length ? parts.join(", ") : "unknown location";
}

/** IST — the audience for this demo is Indian merchants, so report their clock. */
function nowInIndia(): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());
}

export async function POST(req: Request) {
  // Not configured is a normal state, not an error — stay silent so the client
  // never sees a failure for something it cannot fix.
  if (!WEBHOOK) return new NextResponse(null, { status: 204 });

  let store = "";
  let referrer = "";
  try {
    const body = (await req.json()) as { store?: unknown; referrer?: unknown };
    if (typeof body.store === "string") store = body.store.trim().slice(0, 120);
    if (typeof body.referrer === "string") referrer = body.referrer.trim().slice(0, 200);
  } catch {
    // fall through — a ping with no store is still worth reporting
  }

  const message = [
    `:eyes: *Demo link opened* — ${store || "unknown store"}`,
    `• Location: ${locationOf(req.headers)}`,
    `• Time: ${nowInIndia()} IST`,
    `• Referrer: ${referrer || "direct / none"}`,
  ].join("\n");

  try {
    await fetch(WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payloadFor(message),
    });
  } catch {
    // A webhook that is down must not turn into a client-visible error.
  }

  return new NextResponse(null, { status: 204 });
}
