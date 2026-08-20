/**
 * Fire-and-forget demo-open ping.
 *
 * Deliberately client-side: link-preview bots fetch the page without running JS,
 * so a server-side ping would fire when a link is *pasted* into Slack rather than
 * when a human actually opened it.
 */

/** How the demo was opened — worth telling apart in the alert. */
export type OpenSource = "link" | "typed";

/**
 * One alert per store per browser session, whichever way it opened. That keeps
 * reloads quiet, and means someone who types a store and then refreshes (which
 * rewrites the URL to /product-demo/<store>) is not reported twice.
 */
function alreadyPinged(store: string): boolean {
  try {
    const key = `demo-open-ping:${store.toLowerCase()}`;
    if (sessionStorage.getItem(key)) return true;
    sessionStorage.setItem(key, "1");
    return false;
  } catch {
    // Private mode / storage disabled: ping rather than go silent.
    return false;
  }
}

export function pingDemoOpened(store: string, source: OpenSource) {
  if (typeof window === "undefined" || !store) return;

  // ?noping lets us open our own links without alerting ourselves.
  if (new URLSearchParams(window.location.search).has("noping")) return;
  if (alreadyPinged(store)) return;

  const body = JSON.stringify({ store, source, referrer: document.referrer || "" });

  // keepalive so the request survives the user navigating straight on.
  void fetch("/api/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {
    // Nothing to do and nothing to show — this must never affect the demo.
  });
}
