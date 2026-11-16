export const INFLUENCER_ORIGINS = [
  "Influencers — Jeni e Lucas",
  "Influencers — Nego Kau",
  "Influencers — Boiadeiros",
];

const normalizeOrigin = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

export function isDisparoOrigin(origin?: string | null) {
  return normalizeOrigin(origin || "") === "disparo";
}

export function getSaleCommissionRate(origin?: string | null) {
  const normalized = normalizeOrigin(origin || "");
  if (normalized === "disparo") return 0.075;
  return normalized === "social seller" ? 0.10 : 0.15;
}

// Keep the general filter useful for both named and older influencer sales.
export function matchesSaleOrigin(origin: string | null | undefined, filter: string) {
  const value = normalizeOrigin(origin || "");
  const selected = normalizeOrigin(filter);
  return value === selected || (selected === "influencers" && value.startsWith("influencers — "));
}
