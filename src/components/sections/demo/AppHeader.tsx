import { MoreHorizontal } from "lucide-react";

/** The app's title bar inside the Shopify admin, shared by the merchant-side mocks. */
export function AppHeader() {
  return (
    <div className="sticky top-0 z-20 flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-2.5">
      <div className="flex items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element -- local brand asset */}
        <img src="/clickpost-app-logo.svg" alt="" className="size-5 rounded" />
        <span className="text-[13px] font-medium text-neutral-900">CP: Order Editing &amp; Upsell</span>
      </div>
      <span className="flex size-7 items-center justify-center rounded-full ring-1 ring-neutral-200">
        <MoreHorizontal className="size-4 text-neutral-700" />
      </span>
    </div>
  );
}
