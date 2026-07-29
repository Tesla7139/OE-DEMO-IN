"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, TriangleAlert, MapPin, ChevronDown } from "lucide-react";
import type { DemoStore } from "@/lib/site";

const GOOGLE_BLUE = "#1a73e8";
const CTA_BLUE = "#155FFF";

type Fields = {
  firstName: string; lastName: string; address1: string; address2: string;
  city: string; state: string; zip: string; country: string;
};
// What the shopper typed vs. what Google resolves it to: the abbreviated street
// line is expanded and the neighbouring PIN (110025 is Lajpat Nagar IV) is fixed
// to the one that actually serves Lajpat Nagar II.
const ENTERED: Fields = {
  firstName: "Mohit", lastName: "Jain", address1: "H-14, 2nd Flr, Lajpat Ngr II", address2: "",
  city: "New Delhi", state: "Delhi", zip: "110025", country: "India",
};
const CORRECTED: Fields = {
  firstName: "Mohit", lastName: "Jain", address1: "H-14, Second Floor, Lajpat Nagar II", address2: "",
  city: "New Delhi", state: "Delhi", zip: "110024", country: "India",
};

/** The four-colour Google "G". */
function GoogleG({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden xmlns="http://www.w3.org/2000/svg">
      <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z" />
      <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z" />
      <path fill="#FBBC05" d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z" />
      <path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z" />
    </svg>
  );
}

/** Input-style field box with a small label on top and the value below. */
function Field({
  label, value, invalid, valid, error, chevron,
}: { label: string; value?: string; invalid?: boolean; valid?: boolean; error?: string; chevron?: boolean }) {
  const border = invalid ? "#ef4444" : valid ? "#6ee7b7" : "#e5e7eb";
  return (
    <div>
      <div
        className="flex items-center justify-between rounded-xl border-2 bg-white px-3.5 py-2 transition-colors"
        style={{ borderColor: border }}
      >
        <div className="min-w-0">
          <div className="text-[11px] font-medium text-neutral-400">{label}</div>
          <div className={`truncate text-[14px] ${value ? "font-medium text-neutral-900" : "text-neutral-300"}`}>
            {value || "—"}
          </div>
        </div>
        {chevron && <ChevronDown className="size-4 shrink-0 text-neutral-400" />}
      </div>
      {error && (
        <div className="mt-1 flex items-start gap-1 text-[12px] font-medium text-red-500">
          {error}
        </div>
      )}
    </div>
  );
}

type AddrTourRefs = {
  flaggedAddr?: React.RefObject<HTMLDivElement | null>;
  recommended?: React.RefObject<HTMLButtonElement | null>;
  confirmBtn?: React.RefObject<HTMLButtonElement | null>;
  saveBtn?: React.RefObject<HTMLButtonElement | null>;
};

/** Address validation: a flagged address by default → review the fix → verified. */
export function AddressValidationMock({ store, tourRefs, onValidated, onConfirmed }: { store: DemoStore; tourRefs?: AddrTourRefs; onValidated?: () => void; onConfirmed?: () => void }) {
  const [step, setStep] = useState<"edit" | "review" | "done">("edit");
  const flagged = step !== "done";
  const verified = step === "done";
  const f = verified ? CORRECTED : ENTERED;
  const name = store.brandName || "Checkout";

  return (
    <div className="w-full bg-white">
      <div className="lg:h-[560px] lg:overflow-y-auto lg:no-scrollbar">
        {/* header */}
        <div className="border-b border-border px-6 py-4">
          <div className="text-[13px] font-semibold text-neutral-800">{name} · Delivery</div>
          <div className="mt-2.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[15px] font-bold text-neutral-900">
              <MapPin className="size-4 text-neutral-500" />
              Edit Shipping Address
            </div>
            {verified ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-3 py-1 text-[12px] font-semibold text-white">
                <Check className="size-3.5" strokeWidth={3} />
                Address verified
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-800 px-3 py-1 text-[12px] font-semibold text-white">
                <TriangleAlert className="size-3.5" />
                Address check required
              </span>
            )}
          </div>
        </div>

        <div className="space-y-3 p-6">
          {/* the address — flagged red by default, turns green once verified */}
          <motion.div
            ref={tourRefs?.flaggedAddr}
            className="space-y-3"
            animate={step === "review" ? { x: [0, -8, 8, -6, 6, -3, 3, 0] } : { x: 0 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          >
            <Field label="Country" value={f.country} chevron />
            <div className="grid grid-cols-2 gap-3">
              <Field label="First Name" value={f.firstName} />
              <Field label="Last Name" value={f.lastName} />
            </div>
            <Field
              label="Address 1"
              value={f.address1}
              invalid={flagged}
              valid={verified}
              error={flagged ? "Street address could not be fully validated. Please review." : undefined}
            />
            <Field label="Address 2" value={f.address2} />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              <Field label="City" value={f.city} />
              <Field label="State" value={f.state} chevron />
              <Field
                label="PIN Code"
                value={f.zip}
                invalid={flagged}
                valid={verified}
                error={flagged ? "PIN code could not be validated." : undefined}
              />
            </div>
          </motion.div>

          {/* recommended, verified suggestion — shown after the check */}
          <AnimatePresence>
            {step === "review" && (
              <motion.div
                key="rec"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="rounded-2xl border-2 p-4"
                style={{ borderColor: GOOGLE_BLUE }}
              >
                <div className="flex items-center gap-2">
                  <GoogleG className="size-4" />
                  <span className="text-[13px] font-bold text-neutral-900">Recommended address</span>
                </div>
                <p className="mt-0.5 text-[12px] text-neutral-500">Use the corrected, deliverable address we found.</p>
                <button
                  ref={tourRefs?.recommended}
                  className="mt-3 flex w-full items-start gap-3 rounded-xl border-2 bg-white p-3 text-left"
                  style={{ borderColor: GOOGLE_BLUE }}
                >
                  <span className="mt-1 flex size-4 shrink-0 items-center justify-center rounded-full border-2" style={{ borderColor: GOOGLE_BLUE }}>
                    <span className="size-2 rounded-full" style={{ background: GOOGLE_BLUE }} />
                  </span>
                  <span className="min-w-0 text-[13px] leading-relaxed text-neutral-700">
                    <span className="block font-semibold text-neutral-900">{CORRECTED.firstName} {CORRECTED.lastName}</span>
                    <span className="block">{CORRECTED.address1}</span>
                    <span className="block">{CORRECTED.city}, {CORRECTED.state} - {CORRECTED.zip}</span>
                    <span className="block">{CORRECTED.country}</span>
                  </span>
                </button>
                <button
                  ref={tourRefs?.confirmBtn}
                  onClick={() => { setStep("done"); onConfirmed?.(); }}
                  className="mt-3 w-full rounded-full py-2.5 text-[13px] font-semibold text-white transition-all hover:brightness-110"
                  style={{ background: GOOGLE_BLUE }}
                >
                  Use this address
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* verified banner */}
          {verified && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-[13px] font-semibold text-emerald-700">
              <span className="flex size-5 items-center justify-center rounded-full bg-emerald-500 text-white"><Check className="size-3" strokeWidth={3} /></span>
              Address verified &amp; deliverable
            </div>
          )}

          {/* primary action — only before the check */}
          {step === "edit" && (
            <button
              ref={tourRefs?.saveBtn}
              onClick={() => { setStep("review"); onValidated?.(); }}
              className="w-full rounded-xl py-3.5 text-[14px] font-semibold text-white shadow-md transition-all hover:brightness-110 active:scale-[0.99]"
              style={{ background: CTA_BLUE }}
            >
              Update Shipping Address
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
