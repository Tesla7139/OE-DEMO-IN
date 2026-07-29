"use client";

import { CreditCard } from "lucide-react";
import type { Addr } from "./DemoMock";

// Official Indian state/UT codes (the ones used on GST registrations and courier
// manifests). Anything unmapped falls through to the full name.
const STATE_ABBR: Record<string, string> = {
  Delhi: "DL", Maharashtra: "MH", Karnataka: "KA", "Tamil Nadu": "TN",
  Telangana: "TG", Gujarat: "GJ", Rajasthan: "RJ", "West Bengal": "WB",
  "Uttar Pradesh": "UP", Haryana: "HR", Punjab: "PB", Kerala: "KL",
  "Madhya Pradesh": "MP", Bihar: "BR", Odisha: "OD", "Andhra Pradesh": "AP",
  Assam: "AS", Jharkhand: "JH", Chhattisgarh: "CG", Uttarakhand: "UK",
  "Himachal Pradesh": "HP", Goa: "GA", Chandigarh: "CH", Puducherry: "PY",
  "Jammu and Kashmir": "JK",
};
const region = (s: string) => STATE_ABBR[s] ?? s;

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[14px] font-bold text-neutral-900">{label}</div>
      <div className="mt-1.5 space-y-0.5 text-[13.5px] leading-relaxed text-neutral-600">{children}</div>
    </div>
  );
}

/** Shopify-style "Order details" summary (contact, payment, addresses, shipping method). */
export function OrderDetails({
  addr,
  email,
  phone,
  country,
  amount,
}: {
  addr: Addr;
  email: string;
  phone: string;
  country: string;
  amount: string;
}) {
  const lines = [
    `${addr.first} ${addr.last}`,
    addr.line1,
    `${addr.city} ${region(addr.state)} - ${addr.zip}`,
    country,
    phone,
  ];

  return (
    <div className="rounded-xl border border-border p-5">
      <h3 className="text-[17px] font-bold text-neutral-900">Order details</h3>
      <div className="mt-4 grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
        <Block label="Contact information">
          <div>{email}</div>
        </Block>
        <Block label="Payment method">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-9 shrink-0 items-center justify-center rounded border border-border bg-neutral-50">
              <CreditCard className="size-4 text-neutral-400" />
            </span>
            <span className="text-neutral-700">•••• 1 · {amount}</span>
          </div>
        </Block>
        <Block label="Shipping address">
          {lines.map((l, i) => <div key={i}>{l}</div>)}
        </Block>
        <Block label="Billing address">
          {lines.map((l, i) => <div key={i}>{l}</div>)}
        </Block>
        <Block label="Shipping method">
          <div>Standard</div>
        </Block>
      </div>
    </div>
  );
}
