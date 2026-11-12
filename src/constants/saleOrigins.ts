export const INFLUENCER_ORIGINS = [
  "Influencers — Jeni e Lucas",
  "Influencers — Nego Kau",
  "Influencers — Boiadeiros",
];

// Keep the general filter useful for both named and older influencer sales.
export function matchesSaleOrigin(origin: string | null | undefined, filter: string) {
  const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
  const value = normalize(origin || "");
  const selected = normalize(filter);
  return value === selected || (selected === "influencers" && value.startsWith("influencers — "));
}
