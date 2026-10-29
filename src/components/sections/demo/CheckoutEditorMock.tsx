"use client";

import { useState } from "react";
import {
  ArrowLeft, Check, ChevronDown, ChevronRight, CircleCheck, CircleDashed, ClipboardList, CreditCard, LayoutGrid, LayoutList, LogOut,
  MousePointerClick, MousePointerSquareDashed, MoreHorizontal, PanelTop, PlusCircle, ReceiptText, Redo2, Settings, ShoppingCart,
  Smartphone, SquareDashed, Undo2, Wallet,
} from "lucide-react";
import type { DemoStore } from "@/lib/site";
import { DEFAULT_ADDR, DEFAULT_COUNTRY, DEFAULT_EMAIL, DEFAULT_PHONE } from "@/lib/demo-customer";

// Shopify's checkout editor, opened from Settings → "Add App Block". Mirrors the
// real block tree for the Thank you / Order status pages; "Add block" under Main
// lets the presenter drop the app's block in and see it land on the page.

export type EditorPage = "thankyou" | "orderstatus";

type Icon = React.ComponentType<{ className?: string }>;
type Item = { label: string; icon: Icon; child?: boolean };
type Group = { title: string; chevron?: boolean; items: Item[]; addable?: boolean; main?: boolean };

const TREE: Record<EditorPage, Group[]> = {
  thankyou: [
    { title: "Announcement bar", items: [], addable: true },
    { title: "Header", chevron: true, items: [{ label: "Logo", icon: PanelTop }], addable: true },
    {
      title: "Main",
      main: true,
      addable: true,
      items: [
        { label: "Confirmation", icon: CircleCheck },
        { label: "Order status", icon: CircleDashed },
        { label: "Order details", icon: ClipboardList },
        { label: "Customer information", icon: SquareDashed, child: true },
        { label: "Action", icon: MousePointerClick },
      ],
    },
    {
      title: "Order summary",
      chevron: true,
      addable: true,
      items: [
        { label: "Cart", icon: ShoppingCart },
        { label: "Items in cart", icon: SquareDashed, child: true },
        { label: "Total", icon: ReceiptText },
      ],
    },
    { title: "Footer", chevron: true, items: [{ label: "Policies", icon: ClipboardList }], addable: true },
  ],
  orderstatus: [
    { title: "Announcement bar", items: [], addable: true },
    { title: "Header", chevron: true, items: [] },
    {
      title: "Main",
      chevron: true,
      main: true,
      addable: true,
      items: [
        { label: "Page header", icon: PanelTop },
        { label: "Order actions", icon: SquareDashed, child: true },
        { label: "Payment status", icon: Wallet },
        { label: "Payment details", icon: SquareDashed, child: true },
        { label: "Order status", icon: CircleDashed },
        { label: "Return status", icon: SquareDashed, child: true },
        { label: "Fulfillment status", icon: SquareDashed, child: true },
        { label: "Unfulfilled items", icon: SquareDashed, child: true },
        { label: "Order summary", icon: ReceiptText },
        { label: "Items", icon: SquareDashed, child: true },
        { label: "Total", icon: ReceiptText, child: true },
        { label: "Order details", icon: ClipboardList },
        { label: "Customer information", icon: SquareDashed, child: true },
      ],
    },
    { title: "Footer", items: [{ label: "Policies", icon: ClipboardList }], addable: true },
  ],
};

const PAGE_LABEL: Record<EditorPage, string> = { thankyou: "Thank you", orderstatus: "Order status" };
const BLOCK_NAME = "CP Order Editing";
const BLUE = "#005bd3";
const ICON_BTN = "flex size-8 items-center justify-center rounded-lg text-neutral-700 hover:bg-neutral-100";

function AppIcon({ className }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element -- local brand asset
  return <img src="/clickpost-app-logo.svg" alt="" className={`rounded ${className ?? ""}`} />;
}

/* --------------------------------- sidebar -------------------------------- */

function Sidebar({ page, added, onAdd }: { page: EditorPage; added: boolean; onAdd: () => void }) {
  const [picker, setPicker] = useState(false);
  return (
    <aside className="no-scrollbar w-[200px] shrink-0 overflow-y-auto border-r border-neutral-200 bg-white @max-xl:hidden">
      <div className="border-b border-neutral-200 px-3 py-2.5 text-[13px] font-semibold text-neutral-900">{PAGE_LABEL[page]}</div>
      {TREE[page].map((g) => (
        <div key={g.title} className="border-b border-neutral-200 px-2 py-2.5">
          <div className="flex items-center justify-between px-1 text-[12.5px] font-semibold text-neutral-900">
            {g.title}
            {g.chevron && <ChevronRight className="size-3.5 text-neutral-500" />}
          </div>
          <ul className="mt-1">
            {g.items.map((it) => (
              <li key={it.label} className={`flex items-center gap-2 rounded-md py-1 text-[12px] text-neutral-800 ${it.child ? "pl-5" : "pl-1"}`}>
                <it.icon className="size-3.5 shrink-0 text-neutral-600" />
                {it.label}
              </li>
            ))}
            {g.main && added && (
              <li className="flex items-center gap-2 rounded-md bg-[#eaf4ff] py-1 pl-1 text-[12px] font-medium text-neutral-900 ring-1 ring-[#005bd3]/40">
                <AppIcon className="size-3.5" />
                {BLOCK_NAME}
              </li>
            )}
          </ul>
          {g.addable && (
            <div className="relative">
              <button
                type="button"
                onClick={() => g.main && !added && setPicker((v) => !v)}
                className={`mt-1 flex w-full items-center gap-2 rounded-md py-1 pl-1 text-left text-[12px] font-medium hover:bg-neutral-100 ${g.main && !added ? "" : "cursor-default"}`}
                style={{ color: BLUE }}
              >
                <PlusCircle className="size-3.5" /> Add block
              </button>
              {g.main && picker && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setPicker(false)} />
                  <div className="absolute left-0 top-full z-20 mt-1 w-56 rounded-lg bg-white p-1.5 shadow-lg ring-1 ring-black/10">
                    <div className="px-2 py-1 text-[10.5px] font-semibold uppercase tracking-wide text-neutral-500">Apps</div>
                    <button
                      type="button"
                      onClick={() => { setPicker(false); onAdd(); }}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-neutral-100"
                    >
                      <AppIcon className="size-5" />
                      <span>
                        <span className="block text-[12px] font-medium text-neutral-900">{BLOCK_NAME}</span>
                        <span className="block text-[11px] text-neutral-500">CP: Order Editing &amp; Upsell</span>
                      </span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      ))}
    </aside>
  );
}

/* --------------------------------- preview -------------------------------- */

/** The app's widget as it lands on the page once the block is added. */
function WidgetBlock() {
  return (
    <div className="rounded-xl bg-white p-4 ring-2 ring-[#005bd3]">
      <div className="mb-1 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wide" style={{ color: BLUE }}>
        <AppIcon className="size-3.5" /> {BLOCK_NAME}
      </div>
      <div className="text-[15px] font-semibold text-neutral-900">Edit your order</div>
      <p className="mt-0.5 text-[12.5px] text-neutral-600">You have <b className="text-neutral-900">14m 59s</b> left to make changes to your order.</p>
      <ul className="mt-3 divide-y divide-neutral-200 rounded-lg ring-1 ring-neutral-200">
        {["Edit Shipping Address", "Change Contact Information", "Update your order", "Apply Discount Code", "Cancel Your Order"].map((l) => (
          <li key={l} className="flex items-center justify-between px-3 py-2 text-[12.5px] text-neutral-800">
            {l}
            <ChevronRight className="size-3.5 text-neutral-400" />
          </li>
        ))}
      </ul>
    </div>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-xl bg-white p-4 ring-1 ring-neutral-200 ${className ?? ""}`}>{children}</div>;
}

function AddressLines() {
  return (
    <div className="text-[12.5px] leading-relaxed text-neutral-800">
      {DEFAULT_ADDR.first} {DEFAULT_ADDR.last}<br />
      {DEFAULT_ADDR.line1}<br />
      {DEFAULT_ADDR.city} {DEFAULT_ADDR.state} {DEFAULT_ADDR.zip}<br />
      {DEFAULT_COUNTRY}<br />
      {DEFAULT_PHONE}
    </div>
  );
}

function Thumb({ src, qty }: { src?: string | null; qty: number }) {
  return (
    <div className="relative size-12 shrink-0">
      <div className="size-full overflow-hidden rounded-lg bg-neutral-100 ring-1 ring-neutral-200">
        {/* eslint-disable-next-line @next/next/no-img-element -- remote product image */}
        {src && <img src={src} alt="" className="size-full object-cover" onError={(e) => (e.currentTarget.style.visibility = "hidden")} />}
      </div>
      <span className="absolute -right-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full bg-neutral-900 text-[10px] font-semibold text-white">{qty}</span>
    </div>
  );
}

function Preview({ page, store, added }: { page: EditorPage; store: DemoStore; added: boolean }) {
  const currency = store.currency || "INR";
  const money = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency, minimumFractionDigits: 2 }).format(n);
  const items = store.products.filter((p) => (p.price ?? 0) > 0).slice(0, 2);
  const total = items.reduce((a, p) => a + p.price, 0);
  const brand = store.brandName || "Your store";

  if (page === "thankyou") {
    return (
      <div className="min-h-full bg-white">
        <div className="mx-auto max-w-xl px-5 pt-5 text-[17px] font-semibold text-neutral-900">{brand}</div>
        <div className="mt-4 bg-neutral-100">
          <div className="mx-auto flex max-w-xl items-center justify-between px-5 py-3">
            <span className="flex items-center gap-1 text-[13px]" style={{ color: BLUE }}>Order summary <ChevronDown className="size-3.5" /></span>
            <span className="text-[15px] font-semibold text-neutral-900">{money(total)}</span>
          </div>
        </div>
        <div className="mx-auto max-w-xl space-y-4 px-5 py-5">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full ring-2" style={{ color: BLUE, borderColor: BLUE }}>
              <Check className="size-5" strokeWidth={2.5} />
            </span>
            <div>
              <div className="text-[12px] text-neutral-500">Confirmation #JDTNH5Z6N</div>
              <div className="text-[18px] font-semibold text-neutral-900">Thank you, {DEFAULT_ADDR.first}!</div>
            </div>
          </div>
          <Card>
            <div className="text-[14.5px] font-semibold text-neutral-900">Your order is confirmed</div>
            <p className="mt-2 text-[12.5px] text-neutral-700">You’ll receive a confirmation email soon</p>
          </Card>
          {added && <WidgetBlock />}
          <Card>
            <div className="mb-3 text-[14.5px] font-semibold text-neutral-900">Order details</div>
            <div className="grid gap-4 @lg:grid-cols-2">
              <div className="space-y-3">
                <div>
                  <div className="mb-1 text-[12.5px] font-semibold text-neutral-900">Contact information</div>
                  <div className="text-[12.5px] text-neutral-800">{DEFAULT_EMAIL}</div>
                </div>
                <div>
                  <div className="mb-1 text-[12.5px] font-semibold text-neutral-900">Shipping address</div>
                  <AddressLines />
                </div>
                <div>
                  <div className="mb-1 text-[12.5px] font-semibold text-neutral-900">Shipping method</div>
                  <div className="text-[12.5px] text-neutral-800">Standard</div>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="mb-1 text-[12.5px] font-semibold text-neutral-900">Payment method</div>
                  <div className="flex items-center gap-2 text-[12.5px] text-neutral-800"><CreditCard className="size-4 text-neutral-500" /> UPI</div>
                </div>
                <div>
                  <div className="mb-1 text-[12.5px] font-semibold text-neutral-900">Billing address</div>
                  <AddressLines />
                </div>
              </div>
            </div>
          </Card>
          <div className="flex items-center justify-between gap-3 pt-1">
            <span className="text-[12.5px] text-neutral-800">Need help? <span className="underline" style={{ color: BLUE }}>Contact us</span></span>
            <span className="rounded-lg px-4 py-2.5 text-[13px] font-semibold text-white" style={{ background: BLUE }}>Continue shopping</span>
          </div>
          <div className="pt-4 text-[12px] underline" style={{ color: BLUE }}>Terms and policies</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-white px-5 py-5">
      <div className="flex items-center justify-between">
        <span className="text-[17px] font-semibold text-neutral-900">{brand}</span>
        <div className="flex items-center gap-2">
          <span className="rounded-full px-3 py-1 text-[12px] ring-1 ring-neutral-200">{money(total)}</span>
          <span className="flex size-7 items-center justify-center rounded-full text-[12px] ring-1 ring-neutral-200">{DEFAULT_ADDR.first[0]}</span>
        </div>
      </div>
      <div className="mt-6 grid gap-6 @2xl:grid-cols-[110px_1fr]">
        <div className="space-y-1 @max-2xl:hidden">
          <div className="text-[15px] font-semibold text-neutral-900">Orders</div>
          <div className="text-[15px] font-semibold text-neutral-400">Profile</div>
        </div>
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <ArrowLeft className="mt-1 size-4 text-neutral-800" />
              <div>
                <div className="text-[17px] font-semibold text-neutral-900">Order #1004</div>
                <div className="text-[12px] text-neutral-500">Confirmed Oct 28</div>
              </div>
            </div>
            <span className="rounded-lg px-3 py-1.5 text-[12.5px] font-medium ring-1 ring-neutral-200" style={{ color: BLUE }}>Buy again</span>
          </div>
          <Card>
            <div className="flex items-start gap-3">
              <Thumb src={items[0]?.image} qty={1} />
              <div>
                <div className="text-[15px] font-semibold text-neutral-900">Confirmed</div>
                <div className="text-[12.5px] text-neutral-600">We’re preparing these items for shipping.</div>
                <div className="text-[11.5px] text-neutral-500">Oct 28 at 5:34pm</div>
              </div>
            </div>
            <span className="mt-3 inline-block rounded-lg bg-[#5a31f4] px-4 py-2 text-[12.5px] font-medium text-white">Track order with <b>shop</b></span>
          </Card>
          {added && <WidgetBlock />}
          <Card>
            <ul className="space-y-3">
              {items.map((p) => (
                <li key={p.title} className="flex items-start gap-3">
                  <Thumb src={p.image} qty={1} />
                  <span className="flex-1 text-[12.5px] text-neutral-900">{p.title}</span>
                  <span className="text-[12.5px] text-neutral-900">{money(p.price)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 space-y-1.5 text-[12.5px] text-neutral-800">
              <div className="flex justify-between"><span>Subtotal · {items.length} items</span><span>{money(total)}</span></div>
              <div className="flex justify-between"><span>Shipping</span><span>Free</span></div>
              <div className="flex justify-between pt-1 text-[15px] font-semibold text-neutral-900"><span>Total</span><span>{money(total)}</span></div>
            </div>
          </Card>
          <Card>
            <dl className="grid grid-cols-[80px_1fr] gap-x-4 gap-y-4 text-[12.5px]">
              <dt className="text-neutral-500">Contact</dt><dd className="text-neutral-900">{DEFAULT_EMAIL}</dd>
              <dt className="text-neutral-500">Ship to</dt><dd><AddressLines /></dd>
              <dt className="text-neutral-500">Method</dt><dd className="text-neutral-900">Standard</dd>
              <dt className="text-neutral-500">Payment</dt><dd className="text-neutral-900">UPI · {money(total)}</dd>
            </dl>
          </Card>
          <div className="text-[11.5px] text-neutral-500">Orders sold by {brand}</div>
          <div className="flex gap-4 pt-2 text-[12px] underline" style={{ color: BLUE }}>
            <span>{DEFAULT_COUNTRY}</span><span>Privacy policy</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------- editor --------------------------------- */

export function CheckoutEditorMock({ store, page, onExit }: { store: DemoStore; page: EditorPage; onExit: () => void }) {
  const [added, setAdded] = useState(false);
  const [saved, setSaved] = useState(false);
  const slug = (store.brandName || "your-store").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const dirty = added && !saved;

  return (
    <div className="@container absolute inset-0 z-50 flex flex-col bg-[#f1f1f1]">
      {/* top bar */}
      <div className="flex shrink-0 items-center gap-2 border-b border-neutral-200 bg-white px-2 py-1.5">
        <button type="button" onClick={onExit} aria-label="Exit editor" className={ICON_BTN}>
          <LogOut className="size-4 -scale-x-100" />
        </button>
        <div className="mx-1 h-6 w-px bg-neutral-200" />
        <span className={`${ICON_BTN} bg-neutral-100`}><LayoutList className="size-4" /></span>
        <span className={ICON_BTN}><Settings className="size-4" /></span>
        <span className={ICON_BTN}><LayoutGrid className="size-4" /></span>
        <div className="flex flex-1 items-center justify-center gap-3 truncate text-[12.5px] text-neutral-800">
          <span className="truncate @max-2xl:hidden">{slug} configuration</span>
          <span className="rounded-md bg-[#cdfee1] px-1.5 py-0.5 text-[11px] font-medium text-[#0c5132] @max-2xl:hidden">Active</span>
          <span className="flex items-center gap-1.5 font-medium">
            {page === "thankyou" ? <CircleCheck className="size-4" /> : <CircleDashed className="size-4" />}
            {PAGE_LABEL[page]}
          </span>
        </div>
        <span className={`${ICON_BTN} bg-neutral-100 @max-xl:hidden`}><MousePointerSquareDashed className="size-4" style={{ color: BLUE }} /></span>
        <span className={`${ICON_BTN} @max-xl:hidden`}><Smartphone className="size-4" /></span>
        <span className={`${ICON_BTN} text-neutral-300 @max-xl:hidden`}><Undo2 className="size-4" /></span>
        <span className={`${ICON_BTN} text-neutral-300 @max-xl:hidden`}><Redo2 className="size-4" /></span>
        <span className={`${ICON_BTN} ring-1 ring-neutral-200`}><MoreHorizontal className="size-4" /></span>
        <button
          type="button"
          disabled={!dirty}
          onClick={() => setSaved(true)}
          className="rounded-lg bg-neutral-900 px-3 py-1.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-neutral-800 disabled:bg-neutral-200 disabled:text-white"
        >
          {saved ? "Saved" : "Save"}
        </button>
      </div>

      {/* body */}
      <div className="flex min-h-0 flex-1 gap-2 p-2">
        <Sidebar page={page} added={added} onAdd={() => { setAdded(true); setSaved(false); }} />
        <div className="@container no-scrollbar min-w-0 flex-1 overflow-y-auto rounded-xl ring-1 ring-neutral-200">
          <Preview page={page} store={store} added={added} />
        </div>
      </div>
    </div>
  );
}
