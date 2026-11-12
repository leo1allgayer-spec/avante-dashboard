import type { Venda } from '@/hooks/useVendas';
import type { CriativoVenda } from '@/hooks/useCriativos';

const normalized = (value: string) => value.trim().toLocaleLowerCase('pt-BR').replace(/\s+/g, ' ');
const cancelled = (value: string) => ['cancelada', 'cancelado', 'recusada', 'recusado'].includes(normalized(value));
export function creativeSalesRoas(ads: {ad_id:string;ad_name:string;spend:number}[], sales: Venda[], links: CriativoVenda[], since:string, until:string) {
  const result = new Map(ads.map(ad => [ad.ad_id, {count:0,revenue:0,roas:null as number|null}]));
  const used = new Set<string>();
  let unattributedCount = 0, unattributedRevenue = 0;
  for (const sale of sales) {
    if (sale.data < since || sale.data > until || cancelled(sale.status)) continue;
    const candidates = links.filter(link => !used.has(link.id) && link.data === sale.data && normalized(link.nome_aluno) === normalized(sale.cliente) && Number(link.valor_curso) === Number(sale.valor) && !cancelled(link.status));
    // Ambiguous legacy records must not assign revenue to an arbitrary creative.
    const identities = new Set(candidates.map(link => link.codigo || normalized(link.criativo)));
    const link = identities.size === 1 ? candidates[0] : undefined;
    if (link) used.add(link.id);
    const matches = link ? ads.filter(ad => link.codigo ? ad.ad_id === link.codigo : normalized(ad.ad_name) === normalized(link.criativo)) : [];
    if (matches.length !== 1) {
      unattributedCount++;
      unattributedRevenue += Number(sale.valor || 0);
      continue;
    }
    const item = result.get(matches[0].ad_id)!;
    item.count++;
    item.revenue += Number(sale.valor || 0);
  }
  ads.forEach(ad => { const item = result.get(ad.ad_id)!; item.roas = ad.spend > 0 ? item.revenue / ad.spend : null; });
  return {byAd:result,unattributedCount,unattributedRevenue};
}
