import { countryByIso, matchCountry } from "@/lib/country-codes";

export function internationalPhone(value: string): string | null {
  const compact = value.trim().replace(/[\s().-]/g, "");
  if (!/^\+[1-9]\d{7,14}$/.test(compact)) return null;
  return compact;
}

export function composePhone(countryIso: string, national: string): string | null {
  const dial = countryByIso(countryIso).dial;
  const digits = national.replace(/\D/g, "").replace(/^0+/, "");
  if (!digits) return null;
  return internationalPhone(`+${dial}${digits}`);
}

export function splitPhone(
  value: string,
  preferredIso?: string,
): { iso: string; national: string } {
  const compact = value.trim().replace(/[\s().-]/g, "");
  const normalized = compact.startsWith("00") ? `+${compact.slice(2)}` : compact;
  const digits = normalized.replace(/^\+/, "").replace(/\D/g, "");
  if (!digits) {
    return { iso: preferredIso || "CO", national: "" };
  }

  const country = matchCountry(digits, preferredIso);
  return {
    iso: country.iso,
    national: digits.slice(country.dial.length),
  };
}
