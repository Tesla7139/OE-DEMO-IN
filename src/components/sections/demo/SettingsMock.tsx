"use client";

import { useState } from "react";
import { AlertTriangle, ArrowLeft, Check, ChevronDown, ChevronsUpDown, Info, Lock, Pencil, Plus, Settings, Trash2, X } from "lucide-react";
import type { DemoStore } from "@/lib/site";
import { AppHeader } from "./AppHeader";
import { CheckoutEditorMock, type EditorPage } from "./CheckoutEditorMock";

// Mirrors the live app's Settings screen, tab for tab; every control works but
// nothing is saved anywhere.

const CARD = "rounded-xl bg-white shadow-[0_1px_0_rgba(0,0,0,0.08),0_0_0_1px_rgba(0,0,0,0.07)]";

const TABS = ["Order editing", "Editing restrictions", "Order Cancellation", "Refund settings", "Notifications", "Additional", "Integrations"] as const;
type SettingsTab = (typeof TABS)[number];

const LANGUAGES = [
  "Automatic (Based on customer's locale)", "English", "Spanish (Español)", "French (Français)", "Italian (Italiano)", "Dutch (Nederlands)",
  "German (Deutsch)", "Chinese (简体中文)", "Croatian (Hrvatski)", "Slovenian (Slovenščina)", "Hungarian (Magyar)", "Romanian (Română)",
  "Bulgarian (Български)", "Greek (Ελληνικά)", "Polish (Polski)", "Danish (Dansk)", "Finnish (Suomi)", "Slovak (Slovenčina)",
  "Estonian (Eesti)", "Lithuanian (Lietuvių)", "Swedish (Svenska)",
];

const HELPER_SECTIONS = ["Change Contact Information", "Edit Shipping Address", "Change Shipping Method", "Update your order", "Replace Item", "Apply Discount Code", "Cancel Your Order", "Add More Items"];

const CANCEL_REASONS = ["Changed my mind", "Selected wrong address", "Placed by mistake", "Found better product/price", "Not happy with the delivery timeline", "Other reason"];

const TIME_LIMITS = ["15 Minute", "30 Minute", "1 Hour", "2 Hour", "4 Hour", "6 Hour", "12 Hour", "1 day", "Until Fulfilled", "Custom"];

/* ------------------------------- primitives ------------------------------- */

/** Left: what the setting group is for. Right: its controls. Stacks on narrow windows. */
function Section({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 border-b border-neutral-200/80 py-6 first:pt-0 @2xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.6fr)] @2xl:gap-8">
      <div>
        <h4 className="text-[14px] font-bold text-neutral-900">{title}</h4>
        <p className="mt-1.5 text-[13px] leading-relaxed text-neutral-600">{desc}</p>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Box({ title, children, nested }: { title?: string; children: React.ReactNode; nested?: boolean }) {
  return (
    <div className={nested ? "rounded-xl p-4 ring-1 ring-neutral-200" : `${CARD} p-4`}>
      {title && <div className="mb-4 text-[14px] font-bold text-neutral-900">{title}</div>}
      <div className="space-y-4">{children}</div>
    </div>
  );
}

/** Polaris checkbox; `children` (nested options) only show while it's ticked. */
function Checkbox({ label, desc, checked, onChange, children }: { label: string; desc?: string; checked: boolean; onChange: () => void; children?: React.ReactNode }) {
  return (
    <div>
      <label className="flex cursor-pointer items-start gap-2.5">
        <button
          type="button"
          role="checkbox"
          aria-checked={checked}
          onClick={onChange}
          className={`mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-[5px] transition-colors ${checked ? "bg-neutral-900" : "bg-white ring-1 ring-inset ring-neutral-400"}`}
        >
          {checked && <Check className="size-3 text-white" strokeWidth={3.5} />}
        </button>
        <span>
          <span className="block text-[13.5px] text-neutral-900">{label}</span>
          {desc && <span className="mt-1 block text-[12.5px] leading-relaxed text-neutral-600">{desc}</span>}
        </span>
      </label>
      {checked && children && <div className="mt-3">{children}</div>}
    </div>
  );
}

/** A greyed-out, unclickable option with a yellow "Coming soon" pill. */
function ComingSoon({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2.5" aria-disabled>
      <span className="size-[18px] shrink-0 rounded-[5px] bg-neutral-200/80" />
      <span className="text-[13.5px] text-neutral-400">{label}</span>
      <span className="rounded-full bg-[#ffeb78] px-2 py-0.5 text-[11.5px] font-medium text-[#4f4700]">Coming soon</span>
    </div>
  );
}

function Radio({ label, desc, checked, onChange }: { label: string; desc?: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5">
      <button
        type="button"
        role="radio"
        aria-checked={checked}
        onClick={onChange}
        className={`mt-0.5 size-[18px] shrink-0 rounded-full transition-all ${checked ? "border-[5px] border-neutral-900 bg-white" : "border border-neutral-400 bg-white"}`}
      />
      <span>
        <span className="block text-[13.5px] text-neutral-900">{label}</span>
        {desc && <span className="mt-1 block text-[12.5px] leading-relaxed text-neutral-600">{desc}</span>}
      </span>
    </label>
  );
}

function Note({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5 rounded-lg bg-[#eaf4ff] px-3.5 py-3 text-[12.5px] leading-relaxed text-[#00527c]">
      <Info className="mt-0.5 size-4 shrink-0" />
      <p>{title && <span className="font-bold">{title}: </span>}{children}</p>
    </div>
  );
}

const INPUT = "w-full rounded-lg bg-white px-3 py-2 text-[13px] text-neutral-900 ring-1 ring-inset ring-neutral-400 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#005bd3]";
const SECONDARY_BTN = "rounded-lg bg-white px-3 py-2 text-[12.5px] font-semibold text-neutral-900 shadow-[0_1px_0_rgba(0,0,0,0.08)] ring-1 ring-neutral-300 hover:bg-neutral-50";

/** Type a tag, press Enter (or Add) to drop it in as a removable chip.
 *  `inline` puts the chips inside the field, above the text cursor. */
function TagInput({ label, placeholder, help, button = "Add", initial = [], showLabel, inline }: { label: string; placeholder: string; help?: string; button?: string; initial?: string[]; showLabel?: boolean; inline?: boolean }) {
  const [tags, setTags] = useState(initial);
  const [draft, setDraft] = useState("");
  const add = () => {
    const t = draft.trim();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setDraft("");
  };
  const chips = tags.map((t) => (
    <span key={t} className="inline-flex items-center gap-1 rounded-md bg-neutral-200/80 py-0.5 pl-2 pr-1 text-[12px] text-neutral-800">
      {t}
      <button type="button" onClick={() => setTags(tags.filter((x) => x !== t))} aria-label={`Remove ${t}`} className="rounded p-0.5 hover:bg-neutral-300">
        <X className="size-3" />
      </button>
    </span>
  ));
  if (inline) {
    return (
      <div>
        <div className="mb-1.5 text-[13px] text-neutral-900">{label}</div>
        <div className="flex items-center gap-2">
          <div className="flex-1 rounded-lg bg-white px-2.5 py-2 ring-1 ring-inset ring-neutral-400 focus-within:ring-2 focus-within:ring-[#005bd3]">
            {tags.length > 0 && <div className="mb-1.5 flex flex-wrap gap-1.5">{chips}</div>}
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
              placeholder={placeholder}
              className="w-full bg-transparent px-0.5 text-[13px] text-neutral-900 placeholder:text-neutral-500 focus:outline-none"
            />
          </div>
          <button type="button" onClick={add} className={`${SECONDARY_BTN} shrink-0`}>{button}</button>
        </div>
      </div>
    );
  }
  return (
    <div>
      <div className="mb-1.5 text-[13px] text-neutral-900">{label}</div>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder={placeholder}
          className={INPUT}
        />
        <button type="button" onClick={add} className={`${SECONDARY_BTN} shrink-0`}>{button}</button>
      </div>
      {help && <p className="mt-1.5 text-[12.5px] text-neutral-600">{help}</p>}
      {(tags.length > 0 || showLabel) && (
        <div className="mt-3">
          {showLabel && <div className="mb-1.5 text-[13px] text-neutral-900">Tags:</div>}
          <div className="flex flex-wrap gap-1.5">{chips}</div>
        </div>
      )}
    </div>
  );
}

/** Bulleted reasons, each editable in place (pencil) or removable (bin), plus an add row. */
function ReasonList({ initial }: { initial: string[] }) {
  const [reasons, setReasons] = useState(initial);
  const [editing, setEditing] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [draft, setDraft] = useState("");
  const commitEdit = () => {
    const t = editDraft.trim();
    if (editing !== null && t) setReasons(reasons.map((r, n) => (n === editing ? t : r)));
    setEditing(null);
  };
  const add = () => {
    const t = draft.trim();
    if (t) setReasons([...reasons, t]);
    setDraft("");
  };
  const iconBtn = "flex size-8 shrink-0 items-center justify-center rounded-lg bg-white shadow-[0_1px_0_rgba(0,0,0,0.08)] ring-1 ring-neutral-300 hover:bg-neutral-50";

  return (
    <div className="space-y-4">
      <ul className="space-y-2">
        {reasons.map((r, n) => (
          <li key={`${n}-${r}`} className="flex items-center gap-2">
            <span className="size-1.5 shrink-0 rounded-full bg-neutral-800" />
            {editing === n ? (
              <input
                autoFocus
                value={editDraft}
                onChange={(e) => setEditDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditing(null); }}
                onBlur={commitEdit}
                className={`${INPUT} py-1`}
              />
            ) : (
              <span className="flex-1 text-[13.5px] text-neutral-900">{r}</span>
            )}
            <button type="button" aria-label={`Edit ${r}`} onClick={() => { setEditing(n); setEditDraft(r); }} className={iconBtn}>
              <Pencil className="size-3.5" />
            </button>
            <button type="button" aria-label={`Delete ${r}`} onClick={() => setReasons(reasons.filter((_, k) => k !== n))} className={iconBtn}>
              <Trash2 className="size-3.5" />
            </button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder="Add new reason"
          className={`${INPUT} max-w-[240px]`}
        />
        <button type="button" onClick={add} className={SECONDARY_BTN}>Add</button>
      </div>
    </div>
  );
}

function Field({ label, help, children }: { label: string; help?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-[13px] text-neutral-900">{label}</div>
      {children}
      {help && <p className="mt-1.5 text-[12.5px] text-neutral-600">{help}</p>}
    </div>
  );
}

function Select({ options, defaultValue, value, onChange, placeholder }: { options: string[]; defaultValue?: string; value?: string; onChange?: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative">
      <select
        defaultValue={value === undefined ? defaultValue : undefined}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className={`${INPUT} appearance-none pr-8`}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
      <ChevronsUpDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-neutral-500" />
    </div>
  );
}

const MAX_TEXT = 280;

/** Textarea with a live x/280 counter in the corner. */
function CountedText({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, MAX_TEXT))}
        placeholder={placeholder}
        rows={3}
        className={`${INPUT} resize-none pb-6`}
      />
      <span className="pointer-events-none absolute bottom-2 right-3 text-[11.5px] text-neutral-500">{value.length}/{MAX_TEXT}</span>
    </div>
  );
}

/** Dark primary button that flashes "Saved" when clicked. */
function SaveButton({ label = "Save" }: { label?: string }) {
  const [saved, setSaved] = useState(false);
  return (
    <button
      type="button"
      onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 1600); }}
      className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3.5 py-1.5 text-[12.5px] font-semibold text-white hover:bg-neutral-800"
    >
      {saved ? <><Check className="size-3.5" strokeWidth={3} /> Saved</> : label}
    </button>
  );
}

function BannerText() {
  const [text, setText] = useState("");
  return (
    <>
      <CountedText value={text} onChange={setText} placeholder="e.g. You have {{time}} left to make changes to your order." />
      <div className="flex items-center gap-2 text-[12.5px] text-neutral-600">
        Insert placeholder:
        <button type="button" onClick={() => setText((t) => `${t}{{time}}`.slice(0, MAX_TEXT))} className={`${SECONDARY_BTN} px-2 py-0.5 text-[12px]`}>
          {"{{time}}"}
        </button>
      </div>
      <div className="flex justify-end"><SaveButton label="Save & Translate" /></div>
    </>
  );
}

/** Pick a widget section, write its helper text, add it to the list below. */
function HelperTexts() {
  const [section, setSection] = useState("");
  const [text, setText] = useState("");
  const [items, setItems] = useState<{ section: string; text: string }[]>([]);
  const add = () => {
    if (!section || !text.trim()) return;
    setItems([...items.filter((i) => i.section !== section), { section, text: text.trim() }]);
    setSection("");
    setText("");
  };
  return (
    <>
      <Select options={HELPER_SECTIONS} placeholder="Select an option" value={section} onChange={setSection} />
      <CountedText value={text} onChange={setText} placeholder="Write the helper text customers will see under this option" />
      <div className="flex justify-end">
        <button
          type="button"
          onClick={add}
          disabled={!section || !text.trim()}
          className="inline-flex items-center gap-1 rounded-lg bg-neutral-900 px-3.5 py-1.5 text-[12.5px] font-semibold text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus className="size-3.5" /> Add
        </button>
      </div>
      <div className="border-t border-neutral-200 pt-3">
        {items.length ? (
          <ul className="space-y-2">
            {items.map((i) => (
              <li key={i.section} className="flex items-start justify-between gap-3 rounded-lg bg-neutral-50 px-3 py-2">
                <div>
                  <div className="text-[12.5px] font-semibold text-neutral-900">{i.section}</div>
                  <div className="mt-0.5 text-[12.5px] text-neutral-600">{i.text}</div>
                </div>
                <button type="button" aria-label={`Remove helper text for ${i.section}`} onClick={() => setItems(items.filter((x) => x !== i))} className="rounded p-1 text-neutral-500 hover:bg-neutral-200">
                  <Trash2 className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[12.5px] text-neutral-600">No helper texts configured yet. Pick a section above to add one.</p>
        )}
      </div>
      <div className="flex gap-2.5 rounded-lg bg-[#eaf4ff] px-3.5 py-3 text-[12.5px] leading-relaxed text-[#00527c]">
        <Info className="mt-0.5 size-4 shrink-0" />
        <p>Helper text is auto-translated to all extension-supported languages on save, and the customer sees the version matching the configured Extension Language.</p>
      </div>
    </>
  );
}

/* ------------------------------- the screen ------------------------------- */

const DEFAULTS = {
  editingFlow: true,
  holdTags: true,
  fulfillmentHold: false,
  timeWindow: true,
  dailyLimit: false,
  mobile: true,
  phoneBadge: false,
  email: true,
  customerProfile: true,
  shipping: true,
  addressValidation: true,
  skipShippingRecalc: false,
  itemEditing: true,
  itemReplace: false,
  addItems: false,
  removeItems: true,
  discounts: true,
  discountAfterCreated: false,
  discountUsageLimit: false,
  shippingMethod: false,
  pickupRestrict: false,
  hideOutOfStock: false,
  cancellation: true,
  codOnlyCancel: false,
  autoRefund: true,
  notifications: true,
  evtOrderCreated: false,
  evtWindowClosing: false,
  evtAddressChange: false,
  evtPhoneIncentive: false,
  phoneIncentive: false,
  codToPrepaid: false,
  upsellNewOrder: false,
  birthdayWidget: false,
  shipstation: false,
  shipstation2: false,
  recharge: false,
  shopflo: false,
  gokwik: false,
};
type Toggle = keyof typeof DEFAULTS;

export function SettingsMock({ store, maxHeight = 560 }: { store: DemoStore; maxHeight?: number }) {
  const [tab, setTab] = useState<SettingsTab>("Order editing");
  const [on, setOn] = useState(DEFAULTS);
  const [timeLimit, setTimeLimit] = useState("Custom");
  const [customValue, setCustomValue] = useState("15");
  const [customUnit, setCustomUnit] = useState("Hours");
  const [variants, setVariants] = useState("all");
  const [taggedProduct, setTaggedProduct] = useState("order");
  const [refundMethod, setRefundMethod] = useState("original");
  const [saved, setSaved] = useState(false);

  const cb = (key: Toggle) => ({ checked: on[key], onChange: () => setOn((p) => ({ ...p, [key]: !p[key] })) });
  const currencySymbol =
    new Intl.NumberFormat("en-IN", { style: "currency", currency: store.currency || "INR" }).formatToParts(0).find((p) => p.type === "currency")?.value ?? "₹";

  const [codModal, setCodModal] = useState(false);
  const [blockMenu, setBlockMenu] = useState(false);
  const [editor, setEditor] = useState<EditorPage | null>(null); // checkout editor opened via Add App Block

  function save() {
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  }

  return (
    // outer wrapper holds the COD modal over the window; the inner div is what scrolls
    <div className="relative">
    <div className="@container no-scrollbar overflow-y-auto bg-[#f1f1f1]" style={{ maxHeight }}>
      <AppHeader />
      <div className="p-5">
        {/* title row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ArrowLeft className="size-4 text-neutral-800" />
            <h3 className="text-[20px] font-bold tracking-tight text-neutral-900">Settings</h3>
          </div>
          <div className="flex gap-2">
            <span className="rounded-lg bg-neutral-200/80 px-3 py-1.5 text-[12.5px] font-semibold text-neutral-800">Need Help?</span>
            <div className="relative">
              <button type="button" onClick={() => setBlockMenu((v) => !v)} aria-expanded={blockMenu} className={`${SECONDARY_BTN} inline-flex items-center gap-1 py-1.5`}>
                <Plus className="size-3.5" /> Add App Block <ChevronDown className={`size-3.5 transition-transform ${blockMenu ? "rotate-180" : ""}`} />
              </button>
              {blockMenu && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setBlockMenu(false)} />
                  <div className={`${CARD} absolute right-0 top-full z-30 mt-1.5 w-44 p-1.5 shadow-lg`}>
                    {([["thankyou", "Thank You Page"], ["orderstatus", "Order Status Page"]] as const).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => { setBlockMenu(false); setEditor(key); }}
                        className="block w-full rounded-md px-2.5 py-1.5 text-left text-[12.5px] text-neutral-800 hover:bg-neutral-100"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* tabs */}
        <div className={`${CARD} no-scrollbar mt-4 flex gap-1 overflow-x-auto p-1.5`}>
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-[13px] transition-colors ${
                tab === t ? "bg-[#ebebeb] font-medium text-neutral-900" : "text-neutral-800 hover:bg-neutral-50"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {tab === "Order editing" && (
            <>
              <Section title="Order editing" desc="Enable this option to empower customers to edit their orders">
                <Box>
                  <Checkbox label="Enable Order Editing Flow" desc="When enabled, customers can edit their orders and order editing features will be available." {...cb("editingFlow")} />
                </Box>
              </Section>

              <Section title="Order Hold Mechanism" desc="Choose how you want to update your team and third-parties about the on-hold.">
                <Box title="Enable order holds">
                  <Checkbox
                    label="Add Order Tags"
                    desc="Once enabled, new orders will be tagged using your custom hold tags (default ON_HOLD_ORDER_CP) when the editing window is active, and your confirmed tags (default CONFIRMED_ORDER_CP) when the editing window closes"
                    {...cb("holdTags")}
                  />
                  <Checkbox label="Put Fulfillment status on HOLD" desc="Put order on hold when order is created, and release the hold when the editing window ends" {...cb("fulfillmentHold")} />
                  <Note title="Note">Fulfillment hold feature will not release the fulfillment hold if you set the order editing window to &quot;Until fulfilled&quot;.</Note>
                </Box>
              </Section>

              <Section title="Edit timeframe settings" desc="Set a universal timeframe for all order edits.">
                <Box title="Select the time limit for customers to edit their orders">
                  <Checkbox label="Enable Time-based Editing Window" desc="Set a specific time window for order editing" {...cb("timeWindow")}>
                    <div className="space-y-4 pl-7">
                      <div className="flex flex-wrap gap-2">
                        {TIME_LIMITS.map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setTimeLimit(t)}
                            className={`rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
                              timeLimit === t ? "bg-neutral-300 text-neutral-900 ring-1 ring-inset ring-neutral-400" : "bg-white text-neutral-900 shadow-[0_1px_0_rgba(0,0,0,0.08)] ring-1 ring-neutral-300 hover:bg-neutral-50"
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                        <span className={`${SECONDARY_BTN} inline-flex items-center gap-1.5 py-1.5 font-medium`}>
                          <Settings className="size-3.5" /> Custom weekly time
                        </span>
                      </div>
                      {timeLimit === "Custom" && (
                        <div>
                          <div className="mb-1.5 text-[13px] text-neutral-900">Custom time value</div>
                          <div className="flex gap-2">
                            <input value={customValue} onChange={(e) => setCustomValue(e.target.value.replace(/\D/g, ""))} inputMode="numeric" className={`${INPUT} max-w-[200px]`} />
                            <select value={customUnit} onChange={(e) => setCustomUnit(e.target.value)} className="rounded-lg bg-white px-2 text-[13px] ring-1 ring-inset ring-neutral-400 focus:outline-none">
                              <option>Minutes</option>
                              <option>Hours</option>
                              <option>Days</option>
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  </Checkbox>
                  <Checkbox label="Use Daily Time Limit instead" desc="Set a specific time of day as the cutoff instead of a duration" {...cb("dailyLimit")} />
                </Box>
              </Section>

              <Section title="Order editing settings" desc="Select the order details your customers can change.">
                <Box>
                  <div className="text-[14px] font-bold text-neutral-900">Contact Information</div>
                  <Checkbox label="Mobile Number" {...cb("mobile")}>
                    <Box nested>
                      <Checkbox label="Enable missing phone number badge" desc="Show a warning badge when a customer has not added a phone number to their shipping address." {...cb("phoneBadge")} />
                    </Box>
                  </Checkbox>
                  <Checkbox label="Email Address" {...cb("email")} />
                  <Checkbox
                    label="Update Customer Profile"
                    desc="When enabled, customers can choose to sync their contact changes back to their Shopify customer profile. Disable to restrict edits to the order only."
                    {...cb("customerProfile")}
                  />

                  <div className="pt-1 text-[14px] font-bold text-neutral-900">Shipping address</div>
                  <Checkbox label="Shipping Address" {...cb("shipping")} />
                  <Checkbox label="Address Validation & Recommendations" desc="Show address validation suggestions and recommendations to customers when they edit their shipping address" {...cb("addressValidation")} />
                  <Checkbox label="Skip Shipping Rate Recalculation" desc="When enabled, address updates will keep the existing shipping cost without recalculating shipping rates" {...cb("skipShippingRecalc")} />

                  <div className="pt-1 text-[14px] font-bold text-neutral-900">Item/products</div>
                  <Checkbox label="Item/Product Editing" desc="Allow customers to edit product variants, quantities, and remove items from their order" {...cb("itemEditing")}>
                    <Box nested>
                      <div>
                        <div className="text-[13.5px] font-bold text-neutral-900">Which variants can customers change to?</div>
                        <p className="mt-1 text-[12.5px] text-neutral-600">Choose which variant options customers see when changing an item on their order</p>
                      </div>
                      <div className="space-y-3">
                        <Radio label="All variants" desc="Customers can switch to any variant of the same product" checked={variants === "all"} onChange={() => setVariants("all")} />
                        <Radio label="Same and higher value variants" desc="Customers can only switch to variants of the same or higher price" checked={variants === "higher"} onChange={() => setVariants("higher")} />
                        <Radio label="Same value variants" desc="Customers can only switch to variants at the same price" checked={variants === "same"} onChange={() => setVariants("same")} />
                      </div>
                    </Box>
                  </Checkbox>
                  <Checkbox label="Item/Product Replace" desc="Allow customers to replace a product from their order" {...cb("itemReplace")} />
                  <Checkbox label="Add more items to the order" desc="Allow customers to add more items to the order during the editing window" {...cb("addItems")} />
                  <Checkbox label="Remove items from the order" desc="Allow customers to remove items from the order during the editing window" {...cb("removeItems")} />

                  <div className="pt-1 text-[14px] font-bold text-neutral-900">Additional</div>
                  <Checkbox label="Discount Codes" desc="Allow customers to apply discount codes during the editing window" {...cb("discounts")}>
                    <Box nested>
                      <Checkbox label="Only allow on orders placed after the code was created" desc="Discount codes created after an order was placed can't be applied to that order" {...cb("discountAfterCreated")} />
                      <Checkbox
                        label="Reduce the discount code usage limit (or deactivate it) when applied"
                        desc="Each time a code is applied to an order edit, its remaining usage limit is reduced by one, and the code is deactivated once the limit is reached"
                        {...cb("discountUsageLimit")}
                      />
                    </Box>
                  </Checkbox>
                  <Checkbox label="Change Shipping Method" desc="Allow customers to change their shipping method during the editing window" {...cb("shippingMethod")} />

                  <div>
                    <span className={`${SECONDARY_BTN} block text-center`}>Customize Order Edit Widget</span>
                    <p className="mt-2 text-[12.5px] text-neutral-600">Change the sequence in which order edit options appear on the widget and rename section headings</p>
                  </div>
                  <Note title="Tip">Allowing customers to edit these fields can help reduce customer service inquiries and improve satisfaction.</Note>
                </Box>
              </Section>

              <Section title="On Hold Tags" desc="Tags applied while the editing window is open. Default tag: ON_HOLD_ORDER_CP.">
                <Box>
                  <TagInput label="Add custom tags during the editing window" placeholder="Type tag and press Enter" button="Add Tag" initial={["ON_HOLD_ORDER_CP"]} showLabel />
                  <Note title="Note">Tags apply while the editing window is open. Default tag: ON_HOLD_ORDER_CP. If you remove all tags and save, no hold tags are applied.</Note>
                </Box>
              </Section>

              <Section title="Confirmed Order Tag" desc="Applied once the editing window is closed. Default tag: CONFIRMED_ORDER_CP.">
                <Box>
                  <TagInput label="Tags applied when the editing window closes" placeholder="Type tag and press Enter" button="Add Tag" initial={["CONFIRMED_ORDER_CP"]} showLabel />
                  <Note title="Note">Applied once the editing window is closed. Default tag: CONFIRMED_ORDER_CP.</Note>
                </Box>
              </Section>

              <Section title="Edited Order Tag" desc="Applied once the order is edited. Default tag: ORDER_EDITED_CP.">
                <Box>
                  <TagInput label="Tags applied after the order is edited" placeholder="Type tag and press Enter" button="Add Tag" initial={["ORDER_EDITED_CP"]} showLabel />
                  <Note title="Note">Applied once the order is edited. Default tag: ORDER_EDITED_CP.</Note>
                </Box>
              </Section>
            </>
          )}

          {tab === "Editing restrictions" && (
            <>
              <Section title="Tag-Based Restrictions" desc="Control which orders, products, or customers are allowed to edit their orders using Shopify tags.">
                <Box>
                  <TagInput label="Order Tags" placeholder="Enter order tag and press Enter" help="Orders with these tags will not be eligible for editing" />
                  <TagInput label="Customer Tags" placeholder="Enter customer tag and press Enter" help="Customers with these tags will not be eligible for editing" />
                  <TagInput
                    label="Product Tags"
                    placeholder="Enter product tag (e.g., no-edit, size-locked, non-returnable)"
                    help="Orders containing products with these tags will be restricted based on the option selected below."
                  />
                  <div>
                    <div className="mb-3 text-[13px] text-neutral-900">When a tagged product is found in an order:</div>
                    <div className="space-y-3">
                      <Radio label="Disable complete order editing" desc="The order edit widget will be completely hidden from customers for the entire order." checked={taggedProduct === "order"} onChange={() => setTaggedProduct("order")} />
                      <Radio label="Disable editing for tagged items only" desc="Customers can still edit the order, but tagged items cannot be changed, added, or removed." checked={taggedProduct === "items"} onChange={() => setTaggedProduct("items")} />
                    </div>
                  </div>
                  <Checkbox
                    label="Restrict editing for in-store pickup orders"
                    desc="When enabled, customers won't see the order edit block if the order uses Shopify's native in-store pickup. Fulfillment holds are also skipped for those orders."
                    {...cb("pickupRestrict")}
                  />
                </Box>
              </Section>

              <Section title="Item Based Restriction" desc="Enable these options to control the items which customers can replace at price and availability level">
                <Box>
                  <div>
                    <div className="text-[13.5px] font-bold text-neutral-900">Restricted Products</div>
                    <p className="mt-1.5 text-[12.5px] text-neutral-600">Products selected here will not appear as options in the replace item modal, add more items modal, or upsell widget.</p>
                  </div>
                  <span className={`${SECONDARY_BTN} block text-center`}>Select Products</span>
                </Box>
                <Box>
                  <Checkbox label="Hide out of stock products from variant selection" desc="When enabled, out of stock product variants will not be shown in the 'Change option' modal" {...cb("hideOutOfStock")} />
                  <Note title="Note">This setting applies globally to all products. Out of stock variants will be completely hidden from customers when they try to change product options.</Note>
                </Box>
                <Box>
                  <div>
                    <div className="mb-1.5 text-[13px] text-neutral-900">Minimum item price for editing</div>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-neutral-600">{currencySymbol}</span>
                      <input inputMode="numeric" placeholder="Enter minimum price (e.g., 500)" className={`${INPUT} pl-7`} />
                    </div>
                    <p className="mt-1.5 text-[12.5px] text-neutral-600">Items below this price will not be editable. Leave empty to allow editing of all items regardless of price.</p>
                  </div>
                  <Note title="Price Threshold">When set, only items with a price equal to or above this threshold will be editable. This setting works alongside tag-based restrictions.</Note>
                </Box>
              </Section>
            </>
          )}

          {tab === "Order Cancellation" && (
            <>
              <Section title="Order Cancellation" desc="Enable this option to empower customers to cancel their orders">
                <Box>
                  <Checkbox label="Enable Order Cancellation" desc="When enabled, customers can cancel their orders within the specified time window" {...cb("cancellation")} />
                  {on.cancellation && (
                    <>
                      <Checkbox
                        label={`Restrict cancellation to "Cash on Delivery" orders only`}
                        desc="When enabled, only Cash on Delivery (COD) orders can be cancelled by customers. Prepaid orders will not have the cancellation option."
                        {...cb("codOnlyCancel")}
                      />
                      <Note title="Note">This option is commonly used in markets like India where Cash on Delivery is a popular payment method. If your store doesn’t offer COD, you can leave this unchecked.</Note>
                    </>
                  )}
                </Box>
              </Section>
              {on.cancellation && (
                <Section title="Cancellation reasons" desc="Add the reasons you'd like to offer customers for cancelling their orders.">
                  <Box title="Order Cancellation Reasons">
                    <ReasonList initial={CANCEL_REASONS} />
                  </Box>
                </Section>
              )}
            </>
          )}

          {tab === "Refund settings" && (
            <>
              <Section title="Automatic Refund Processing" desc="Define what happens when customers cancel their orders or edit their orders">
                <Box>
                  <Checkbox
                    label="Enable automatic refunds for order edits and order cancellation"
                    desc="When enabled, customers will automatically receive refunds when they edit orders to reduce the total amount or cancel the order."
                    {...cb("autoRefund")}
                  />
                </Box>
              </Section>
              {on.autoRefund && (
                <Section title="Cancel & refund options" desc="Choose how refunds should be processed when the order total is reduced.">
                  <Box title="Refund Method">
                    <p className="-mt-2 text-[12.5px] text-neutral-600">Choose how refunds should be processed when the order total is reduced.</p>
                    <div className="space-y-3">
                      <Radio label="Refund to original payment method" desc="Refund the difference amount back to the customer's original payment method (credit card, PayPal, etc.)" checked={refundMethod === "original"} onChange={() => setRefundMethod("original")} />
                      <Radio label="Issue gift card" desc="Create a gift card for the refund amount and send it to the customer" checked={refundMethod === "giftcard"} onChange={() => setRefundMethod("giftcard")} />
                      <Radio label="Store credit" desc="Refund the difference amount to store credit" checked={refundMethod === "credit"} onChange={() => setRefundMethod("credit")} />
                    </div>
                  </Box>
                </Section>
              )}
            </>
          )}

          {tab === "Notifications" && (
            <>
              <Section title="Notification Settings" desc="Enable and configure automated notifications for specific customer events.">
                <Box>
                  <Checkbox label="Enable Notifications" desc="When enabled, customers will receive notifications based on the configured events below." {...cb("notifications")} />
                </Box>
              </Section>
              {on.notifications && (
                <>
                  <Section title="Notification Integration" desc="Select your preferred integration provider and provide the necessary credentials to send notifications.">
                    <Box>
                      <Field label="Integration Provider">
                        <Select options={["Klaviyo"]} />
                      </Field>
                      <Field label="Klaviyo API Key">
                        <input type="password" autoComplete="off" className={INPUT} />
                      </Field>
                    </Box>
                  </Section>
                  <Section title="Event Notifications" desc="Select which events will trigger customer notifications.">
                    <Box>
                      <Checkbox label="Order Created" {...cb("evtOrderCreated")} />
                      <Checkbox label="Edit Window Closing" {...cb("evtWindowClosing")} />
                      <Checkbox label="Address Change Required" {...cb("evtAddressChange")} />
                      <Checkbox label="Phone Number Incentive" {...cb("evtPhoneIncentive")} />
                    </Box>
                  </Section>
                </>
              )}
            </>
          )}

          {tab === "Additional" && (
            <>
              <Section title="Extension Language" desc="Select the language for the order edit extension displayed to customers on the thank you and order status pages.">
                <Box>
                  <Field label="Display Language" help="Choose the language in which the order edit extension will be displayed to your customers.">
                    <Select options={LANGUAGES} defaultValue="English" />
                  </Field>
                  <Note title="Note">
                    The extension will display in the selected language on the thank you and order status pages. When set to &quot;Automatic&quot;, the extension will detect the customer&apos;s browser/checkout language and display content in that language if available (English, Spanish, French, Italian, Dutch, German, Chinese, Croatian, Slovenian, Hungarian, Romanian, Bulgarian, Greek, Polish, Danish, Finnish, Slovak, Estonian, Lithuanian, or Swedish), otherwise it will default to English.
                  </Note>
                </Box>
              </Section>

              <Section
                title="Order Edit Banner Text"
                desc="Customize the message shown in the timer banner on thank you and order status pages. Use {{time}} as a placeholder for the countdown — it will be replaced at runtime. For 'until fulfilled' timer type, {{time}} is omitted automatically."
              >
                <Box title="Set banner text">
                  <BannerText />
                  <div className="flex gap-2.5 rounded-lg bg-[#eaf4ff] px-3.5 py-3 text-[12.5px] leading-relaxed text-[#00527c]">
                    <Info className="mt-0.5 size-4 shrink-0" />
                    <p>The banner text is auto-translated to all extension-supported languages when saved. Use <b>{"{{time}}"}</b> to insert the countdown timer. For orders using the &quot;until fulfilled&quot; timer, <b>{"{{time}}"}</b> is automatically omitted.</p>
                  </div>
                </Box>
              </Section>

              <Section title="Helper Texts" desc="Add a short helper text under any option in the order edit widget.">
                <Box title="Add a helper text">
                  <HelperTexts />
                </Box>
              </Section>

              <Section title="Phone Number Add Incentive" desc="Enable this config to ask customer to add phone number in order if not added already.">
                <Box>
                  <Checkbox label="Enable Phone Number Incentive Flow" desc="When enabled, customers will be able to see the message to add phone number on thank you and order status page." {...cb("phoneIncentive")} />
                </Box>
              </Section>

              <Section title="COD To Prepaid Widget" desc="Customers will see the conversion widget on Thank You & Order Status pages.">
                <Box>
                  <Checkbox label="Enable COD to Prepaid Flow" desc="When enabled, customers with COD orders can switch to prepaid on Thank You and Order Status pages." {...cb("codToPrepaid")}>
                    <div className="pl-7">
                      <button type="button" onClick={() => setCodModal(true)} className={`${SECONDARY_BTN} inline-flex items-center gap-1.5`}>
                        <Settings className="size-3.5" /> Configure
                      </button>
                    </div>
                  </Checkbox>
                </Box>
              </Section>

              <Section title="New Order & Upsell Behaviour" desc="Control how new items and upsells are added to the customer's order.">
                <Box>
                  <Checkbox label="Create a new order for upsell items" desc="When enabled, adding upsell items creates a brand-new order. When disabled, the items are added to the existing order." {...cb("upsellNewOrder")}>
                    <TagInput label="Tags to apply when a new order is created" placeholder="Type tag and press Enter" />
                  </Checkbox>
                  <div className="flex justify-end"><SaveButton /></div>
                </Box>
              </Section>

              <Section title="Birthday Collection Widget" desc="Display a birthday input widget on the Thank You and Order Status pages. Collected data is saved to the customer's profile.">
                <Box>
                  <Checkbox label="Enable birthday widget" desc="When enabled, the widget will appear on Thank You and Order Status pages where the app block is installed." {...cb("birthdayWidget")}>
                    <div className="space-y-4">
                      <Field label="Widget Title">
                        <input defaultValue="When's your birthday?" className={INPUT} />
                      </Field>
                      <Field label="Widget Description">
                        <textarea rows={2} defaultValue="Share it once and we'll surprise you with a gift or exclusive offer when it rolls around." className={`${INPUT} resize-none`} />
                      </Field>
                      <Field label="Description Text Color">
                        <Select options={["Black", "Red", "Green"]} defaultValue="Black" />
                      </Field>
                      <Field label="Field Key" help="Unique identifier for this field (e.g. birthday, company_name)">
                        <input defaultValue="birthday" className={INPUT} />
                      </Field>
                    </div>
                  </Checkbox>
                  <div className="flex justify-end"><SaveButton /></div>
                  {on.birthdayWidget && <Note>Changes are saved per store. The widget will only render on Thank You and Order Status pages where the app block is installed.</Note>}
                </Box>
              </Section>
            </>
          )}

          {tab === "Integrations" && (
            <>
              <Section title="Plugins & Integrations" desc="Connect your favorite shipping and order management tools">
                <Box>
                  <Checkbox label="Enable ShipStation Integration" desc="Connect to ShipStation to create shipments with updated order details" {...cb("shipstation")}>
                    <div className="space-y-4">
                      <Field label="API Key"><input type="password" autoComplete="off" placeholder="Enter your ShipStation API key" className={INPUT} /></Field>
                      <Field label="Secret Key"><input type="password" autoComplete="off" placeholder="Enter your ShipStation secret key" className={INPUT} /></Field>
                    </div>
                  </Checkbox>
                  <Checkbox label="Enable ShipStation 2 Integration" desc="Connect to a second ShipStation account to create shipments with updated order details" {...cb("shipstation2")}>
                    <div className="space-y-4">
                      <Field label="API Key"><input type="password" autoComplete="off" placeholder="Enter your ShipStation 2 API key" className={INPUT} /></Field>
                      <Field label="Secret Key"><input type="password" autoComplete="off" placeholder="Enter your ShipStation 2 secret key" className={INPUT} /></Field>
                    </div>
                  </Checkbox>
                  <Checkbox label="Enable recharge Integration" desc="Connect to Recharge to create shipments with updated order details" {...cb("recharge")}>
                    <Field label="API Key"><input type="password" autoComplete="off" placeholder="Enter your Recharge API key" className={INPUT} /></Field>
                  </Checkbox>
                  <ComingSoon label="Enable ShipHero Integration" />
                  <ComingSoon label="Enable OrderDesk Integration" />
                </Box>
              </Section>

              <Section title="Shopflo Integration" desc="Configure your Shopflo integration settings">
                <Box>
                  <Checkbox label="Enable Shopflo Integration" desc="Connect to Shopflo to create shipments with updated order details" {...cb("shopflo")}>
                    <Field label="API Key"><input type="password" autoComplete="off" placeholder="Enter your Shopflo API key" className={INPUT} /></Field>
                  </Checkbox>
                </Box>
              </Section>

              <Section title="Gokwik" desc="Cancel COD orders on Gokwik when customers cancel from your storefront.">
                <Box>
                  <Checkbox label="Enable Gokwik integration" desc="To cancel orders on Gokwik, enter your API key below. When enabled, cancellation calls Gokwik before Shopify." {...cb("gokwik")}>
                    <Field label="Gokwik API key" help="Used as authKey when notifying Gokwik to cancel the COD order.">
                      <input type="password" autoComplete="off" placeholder="Enter your Gokwik API key" className={INPUT} />
                    </Field>
                  </Checkbox>
                </Box>
              </Section>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={save}
          className="mt-6 inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-4 py-2 text-[13px] font-semibold text-white shadow-[inset_0_-1px_0_rgba(255,255,255,0.15)] transition-colors hover:bg-neutral-800"
        >
          {saved ? <><Check className="size-3.5" strokeWidth={3} /> Saved</> : "Save Settings"}
        </button>
      </div>
    </div>
    {codModal && <CodPrepaidModal currency={store.currency || "INR"} onClose={() => setCodModal(false)} />}
    {editor && <CheckoutEditorMock key={editor} store={store} page={editor} onExit={() => setEditor(null)} />}
    </div>
  );
}

/* ---------------------------- COD to Prepaid modal ---------------------------- */

function Badge({ tone, children }: { tone: "blue" | "green"; children: React.ReactNode }) {
  return (
    <span className={`rounded-md px-2 py-0.5 text-[11.5px] font-medium ${tone === "blue" ? "bg-[#e0f0ff] text-[#00527c]" : "bg-[#cdfee1] text-[#0c5132]"}`}>{children}</span>
  );
}

/** A radio rendered as a selectable card; extra fields (children) show while it's chosen. */
function OptionCard({ label, desc, badge, checked, onChange, children }: { label: string; desc: string; badge?: React.ReactNode; checked: boolean; onChange: () => void; children?: React.ReactNode }) {
  return (
    <div className={`rounded-xl p-4 transition-colors ${checked ? "bg-[#f1f8f5] ring-1 ring-[#29845a]" : "bg-white ring-1 ring-neutral-200"}`}>
      <label className="flex cursor-pointer items-center gap-2.5">
        <button
          type="button"
          role="radio"
          aria-checked={checked}
          onClick={onChange}
          className={`size-[18px] shrink-0 rounded-full transition-all ${checked ? "border-[5px] border-neutral-900 bg-white" : "border border-neutral-400 bg-white"}`}
        />
        <span className="text-[13.5px] text-neutral-900">{label}</span>
        {badge}
      </label>
      <p className="mt-2 text-[12.5px] text-neutral-600">{desc}</p>
      {checked && children && <div className="mt-3">{children}</div>}
    </div>
  );
}

function ModalSection({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-neutral-200 pb-5 last:border-0 last:pb-0">
      <h5 className="text-[14px] font-bold text-neutral-900">{title}</h5>
      {desc && <p className="mt-0.5 text-[12.5px] text-neutral-600">{desc}</p>}
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

const PREVIEW_TOTAL = 1200;

function CodPrepaidModal({ currency, onClose }: { currency: string; onClose: () => void }) {
  const [method, setMethod] = useState("new");
  const [incentive, setIncentive] = useState("discount");
  const [pct, setPct] = useState("5");
  const [code, setCode] = useState("PREPAID5");
  const [headline, setHeadline] = useState("Pay now & save extra!");
  const [cta, setCta] = useState("Pay Now & Get 5% Off");
  const [sub, setSub] = useState("Switch to prepaid and enjoy an exclusive discount on your order.");
  const [success, setSuccess] = useState("🥳 Your order is now prepaid! Order #1234 confirmed");
  const [badge, setBadge] = useState("EXTRA 5% OFF on prepaid");

  const money = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency, minimumFractionDigits: 2 }).format(n);
  const discount = incentive === "discount" ? Math.round(PREVIEW_TOTAL * Math.min(Number(pct) || 0, 100)) / 100 : 0;

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/45 p-4" onClick={onClose}>
      <div role="dialog" aria-label="Configure COD to Prepaid" className="flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-neutral-200 bg-[#f3f3f3] px-5 py-3.5">
          <h4 className="text-[15px] font-bold text-neutral-900">Configure COD to Prepaid</h4>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-md p-1 text-neutral-600 hover:bg-neutral-200">
            <X className="size-4" />
          </button>
        </div>

        <div className="no-scrollbar flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <p className="text-[13px] text-neutral-600">Set up conversion method, incentive, widget copy &amp; targeting.</p>

          <ModalSection title="Conversion Method" desc="Choose how COD orders are converted to prepaid.">
            <OptionCard label="Create New Prepaid Order" badge={<Badge tone="blue">Recommended</Badge>} desc="Cancels original COD order, creates new prepaid order with incentive applied." checked={method === "new"} onChange={() => setMethod("new")} />
            <OptionCard label="Same Order" badge={<Badge tone="green">No New Order</Badge>} desc="Same order will be changed from COD payment mode to Prepaid." checked={method === "same"} onChange={() => setMethod("same")} />
          </ModalSection>

          <ModalSection title="Incentive Settings" desc="Reward customers who switch to prepaid.">
            <OptionCard label="None" desc="No incentive will be offered." checked={incentive === "none"} onChange={() => setIncentive("none")} />
            <OptionCard label="Product Discount (%)" badge={<Badge tone="blue">Recommended</Badge>} desc="Offer a percentage discount when customers switch to prepaid." checked={incentive === "discount"} onChange={() => setIncentive("discount")}>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Discount %">
                  <input value={pct} onChange={(e) => setPct(e.target.value.replace(/[^\d.]/g, ""))} inputMode="decimal" className={INPUT} />
                </Field>
                <Field label="Discount Code Label">
                  <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className={INPUT} />
                </Field>
              </div>
            </OptionCard>
            <OptionCard label="Free Shipping" desc="Waive shipping fee on prepaid conversion." checked={incentive === "shipping"} onChange={() => setIncentive("shipping")} />
          </ModalSection>

          <ModalSection title="Widget Appearance" desc="Customize text and colors.">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Widget Headline"><input value={headline} onChange={(e) => setHeadline(e.target.value)} className={INPUT} /></Field>
              <Field label="CTA Button Text"><input value={cta} onChange={(e) => setCta(e.target.value)} className={INPUT} /></Field>
            </div>
            <Field label="Sub-headline"><textarea rows={2} value={sub} onChange={(e) => setSub(e.target.value)} className={`${INPUT} resize-none`} /></Field>
            <Field label="Success Message"><input value={success} onChange={(e) => setSuccess(e.target.value)} className={INPUT} /></Field>
            <Field label="Incentive Badge Text"><input value={badge} onChange={(e) => setBadge(e.target.value)} className={INPUT} /></Field>
          </ModalSection>

          <ModalSection title="Live Preview">
            <div className="rounded-xl bg-[#f6f6f6] p-4 sm:p-6">
              <div className="mx-auto max-w-sm space-y-3 rounded-xl bg-white p-4 ring-1 ring-neutral-200">
                <div className="flex items-center gap-2 rounded-lg bg-[#fff1e3] px-3 py-2 text-[12.5px] text-[#5e4200]">
                  <AlertTriangle className="size-3.5 shrink-0" />
                  <span>Offer expires in <b className="text-[#8e1f0b]">14 hours and 59 mins</b></span>
                </div>
                <div className="text-[14px] font-bold text-neutral-900">{headline}</div>
                <p className="text-[12.5px] text-neutral-600">{sub}</p>
                {incentive !== "none" && badge && (
                  <div className="flex items-center gap-2 rounded-lg bg-[#cdfee1] px-3 py-2 text-[12.5px] font-semibold text-[#0c5132]">
                    <Check className="size-3.5" strokeWidth={3} /> {badge}
                  </div>
                )}
                <div className="flex items-center justify-between text-[13px]">
                  <span>
                    {discount > 0 && <s className="mr-2 text-neutral-500">{money(PREVIEW_TOTAL)}</s>}
                    <b className="text-neutral-900">{money(PREVIEW_TOTAL - discount)}</b>
                  </span>
                  {discount > 0 && <b className="text-[#0c5132]">You save {money(discount)}</b>}
                </div>
                <div className="rounded-lg bg-neutral-800 py-2 text-center text-[12.5px] font-semibold text-white shadow-[inset_0_-1px_0_rgba(255,255,255,0.15)]">{cta}</div>
                <div className="flex items-center justify-center gap-1.5 text-[11.5px] text-neutral-500">
                  <Lock className="size-3" /> Secure payment via Shopify Checkout
                </div>
              </div>
            </div>
          </ModalSection>

          <TagInput label="Add tags to be applied after the order is converted from COD to Prepaid" placeholder="Type tag and press Enter" initial={["COD_TO_PREPAID_CONVERTED_CP"]} inline />
        </div>

        <div className="flex justify-end gap-2 border-t border-neutral-200 px-5 py-3">
          <button type="button" onClick={onClose} className={SECONDARY_BTN}>Cancel</button>
          <button type="button" onClick={onClose} className="rounded-lg bg-neutral-900 px-3.5 py-2 text-[12.5px] font-semibold text-white hover:bg-neutral-800">Save configuration</button>
        </div>
      </div>
    </div>
  );
}
