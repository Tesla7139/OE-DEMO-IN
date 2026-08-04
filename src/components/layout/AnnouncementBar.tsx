import { APP_STORE_URL as SHOPIFY_LISTING } from "@/lib/site";

export function AnnouncementBar() {
  return (
    <div className="w-full text-white" style={{ background: "linear-gradient(90deg, #001644 0%, #001B61 22%, #155FFF 62%, #0EE2E2 100%)" }}>
      <div className="mx-auto flex max-w-[1240px] items-center justify-center gap-2.5 px-4 py-2.5 text-center text-[0.85rem] sm:px-6">
        <span className="font-semibold tracking-tight">
          Comply with the EU directives with Clickpost Order Editing
        </span>
        <a
          href={SHOPIFY_LISTING}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden whitespace-nowrap font-medium text-white/90 underline-offset-4 transition-colors hover:text-white hover:underline sm:inline"
        >
          See Shopify app listing
        </a>
      </div>
    </div>
  );
}
