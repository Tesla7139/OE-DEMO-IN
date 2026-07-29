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
 * The shopper's address as they typed it — a DLF Golf Course Road address in
 * Gurugram. In address-validation mode this is the FLAGGED state, carrying the
 * three mistakes that actually cause RTO in India:
 *   1. abbreviated street lines couriers mis-sort ("T-3", "Golf Course Rd")
 *   2. the old city name ("Gurgaon" was officially renamed Gurugram in 2016)
 *   3. a neighbouring PIN — 122002 serves Sector 42/43, not DLF Phase 5
 */
export const DEFAULT_ADDR: Addr = {
  first: "Mohit",
  last: "Jain",
  line1: "T-3 1402, Magnolias, Golf Course Rd",
  city: "Gurgaon",
  state: "Haryana",
  zip: "122002",
};

/** What validation resolves it to: expanded, renamed to Gurugram, PIN corrected. */
export const VERIFIED_ADDR: Addr = {
  first: "Mohit",
  last: "Jain",
  line1: "Tower 3, 1402, The Magnolias, DLF Golf Course Road",
  city: "Gurugram",
  state: "Haryana",
  zip: "122009",
};
