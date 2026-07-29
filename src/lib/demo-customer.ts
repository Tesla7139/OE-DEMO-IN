/**
 * The demo shopper — single source of truth for every mock surface (order-editing
 * window, thank-you page, one-tap upsell, order-status page, hero phone).
 *
 * Lives in its own module rather than in DemoMock so leaf components can read the
 * name without importing DemoMock back (DemoMock renders them — that would be a
 * circular import).
 *
 * India-only demo: a Delhi address, +91 mobile, and a 6-digit PIN.
 */
export type Addr = {
  first: string;
  last: string;
  line1: string;
  city: string;
  state: string;
  zip: string;
};

export const DEFAULT_EMAIL = "mohit.jain@gmail.com";
export const DEFAULT_PHONE = "+91 98110 26538";
export const DEFAULT_COUNTRY = "India";

/**
 * The shopper's address as they typed it. In address-validation mode this is the
 * FLAGGED state: the mistake is the classic Indian RTO cause — a neighbouring PIN
 * (110025 serves Lajpat Nagar IV / Jangpura, not Lajpat Nagar II) plus abbreviated
 * street lines couriers mis-sort.
 */
export const DEFAULT_ADDR: Addr = {
  first: "Mohit",
  last: "Jain",
  line1: "H-14, 2nd Flr, Lajpat Ngr II",
  city: "New Delhi",
  state: "Delhi",
  zip: "110025",
};

/** What validation resolves it to: abbreviations expanded, PIN corrected. */
export const VERIFIED_ADDR: Addr = {
  first: "Mohit",
  last: "Jain",
  line1: "H-14, Second Floor, Lajpat Nagar II",
  city: "New Delhi",
  state: "Delhi",
  zip: "110024",
};
