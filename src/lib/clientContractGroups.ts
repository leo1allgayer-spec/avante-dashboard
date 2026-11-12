import type { Client } from "@/types/clients/client";

const key = (name: string) => name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
export function groupClientContracts(meta: Client[], google: Client[]) {
  const used = new Set<string>();
  const groups = meta.map(client => {
    const match = google.find(g => !used.has(g.id) && key(g.name) !== "" && key(g.name) === key(client.name));
    if (!match) return { client, meta: client, google: undefined, services: "Meta Ads" };
    used.add(match.id);
    // Prefer the populated contract; never add together two records for one customer.
    const primary = client.contractValue > 0 || match.contractValue === 0 ? client : match;
    return { client: { ...primary, status: client.status === "Ativo" || match.status === "Ativo" ? "Ativo" as const : "Pausado" as const }, meta: client, google: match, services: "Meta + Google Ads" };
  });
  return [...groups, ...google.filter(g => !used.has(g.id)).map(client => ({client, meta: undefined, google: client, services: "Google Ads"}))];
}
