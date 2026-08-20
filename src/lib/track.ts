/**
 * Fire-and-forget "someone opened your shared link" ping.
 *
 * Deliberately client-side: link-preview bots fetch the page without running JS,
 * so a server-side ping would fire when the link is *pasted* into Slack rather
 * than when a human actually opens it.
 */

/** One alert per store per browser session — reloads and re-opens stay quiet. */
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

export function pingLinkOpened(store: string) {
  if (typeof window === "undefined" || !store) return;

  // ?noping lets us open our own links without alerting ourselves.
  if (new URLSearchParams(window.location.search).has("noping")) return;
  if (alreadyPinged(store)) return;

  const body = JSON.stringify({ store, referrer: document.referrer || "" });

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
