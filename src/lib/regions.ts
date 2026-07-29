// Country + subdivision data for the demo address form, plus the Zippopotam
// country code used for free live postal-code validation (api.zippopotam.us/<zip>).
export type CountryData = {
  name: string;
  zip: string; // zippopotam country code
  regionLabel: string; // "State" / "Province" / "Region"
  zipLen: number; // digits/chars that make a "complete" postal code → trigger auto-detect
  regions: string[];
};

// India-only demo. All 28 states + 8 union territories, PIN codes are 6 digits,
// and Zippopotam's "in" dataset backs the live lookup.
export const COUNTRIES: CountryData[] = [
  {
    name: "India",
    zip: "in",
    regionLabel: "State",
    zipLen: 6,
    regions: [
      "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
      "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
      "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
      "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
      "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
      "Andaman and Nicobar Islands", "Chandigarh",
      "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir",
      "Ladakh", "Lakshadweep", "Puducherry",
    ],
  },
];

export const countryByName = (name: string): CountryData =>
  COUNTRIES.find((c) => c.name === name) ?? COUNTRIES[0];

/**
 * Free, key-less live postal-code validation via Zippopotam (pure fetch — no
 * child_process, so it runs anywhere incl. HubSpot). Returns the real city +
 * region for a postal code, or null if the code isn't found / the call fails.
 */
export async function lookupPostal(
  countryName: string,
  postal: string
): Promise<{ city: string; region: string } | null> {
  const c = countryByName(countryName);
  // Indian PINs are 6 digits, sometimes written "110 024" — strip spaces before lookup.
  const code = postal.trim().replace(/\s/g, "");
  if (!code) return null;
  try {
    const res = await fetch(`https://api.zippopotam.us/${c.zip}/${encodeURIComponent(code)}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { places?: Array<Record<string, string>> };
    const place = data.places?.[0];
    if (!place) return null;
    return { city: place["place name"] ?? "", region: place["state"] ?? "" };
  } catch {
    return null;
  }
}
