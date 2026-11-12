import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useVendas } from '@/hooks/useVendas';
import { useCriativosVendas } from '@/hooks/useCriativos';
import { labDataQuery, useLabAccounts } from './data';
import { defaultTarget, metaResult } from '@/lib/creative-lab/analytics';
import { buildLabRows } from '@/lib/creative-lab/rows';
import { creativeSalesRoas } from '@/lib/creativeSalesRoas';

const money = (n: number | null) => n == null ? '—' : n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const today = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(new Date());
export default function CreativeSalesOverview() {
 const [accountId, setAccount] = useState('');
 const [since, setSince] = useState(() => today().slice(0, 7) + '-01');
 const [until, setUntil] = useState(today);
 const [search, setSearch] = useState('');
 const [kind, setKind] = useState<'messages' | 'leads'>('messages');
 const [sort, setSort] = useState('sales');
 const accounts = useLabAccounts(), sales = useVendas(), links = useCriativosVendas();
 const choices = accounts.data?.accounts || [];
 const account = choices.find(a => a.id === accountId) || choices.find(a => a.internal) || choices[0];
 const valid = !!since && !!until && since <= until && until <= today() && Date.parse(until) - Date.parse(since) <= 366 * 86400000;
 const query = useQuery(labDataQuery(account?.id || '', since, until, valid, false));
 const ready = sales.isSuccess && links.isSuccess;
 const rows = useMemo(() => buildLabRows(query.data, 'sales', defaultTarget, sales.data || [], links.data || [], ready), [query.data, sales.data, links.data, ready]);
 const raw = new Map(query.data?.current.map(r => [r.ad_id, r]) || []);
 const measured = rows.filter(r => raw.has(r.id) || (r.current.results || 0) > 0).map(r => ({ ...r, contacts: raw.has(r.id) ? metaResult(raw.get(r.id)!, kind) : null }));
 const visible = measured.filter(r => (r.name + ' ' + r.campaign).toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')));
 visible.sort((a, b) => sort === 'roas' ? (b.roas ?? -1) - (a.roas ?? -1) : sort === 'contacts' ? (b.contacts ?? -1) - (a.contacts ?? -1) : sort === 'revenue' ? (b.revenue ?? -1) - (a.revenue ?? -1) : (b.current.results ?? -1) - (a.current.results ?? -1) || (b.revenue ?? 0) - (a.revenue ?? 0));
 const sum = (values: (number | null)[]) => values.length && values.every(v => v != null) ? values.reduce<number>((s, v) => s + (v || 0), 0) : null;
 const spend = sum(visible.map(r => r.current.spend)), contacts = sum(visible.map(r => r.contacts)), count = sum(visible.map(r => r.current.results)), revenue = sum(visible.map(r => r.revenue));
 const attribution = query.data?.account.internal && ready ? creativeSalesRoas(rows.map(r => ({ ad_id: r.id, ad_name: r.name, spend: r.current.spend || 0 })), sales.data || [], links.data || [], since, until) : null;
 const error = accounts.error || query.error || (account?.internal && (sales.error || links.error));
 const label = kind === 'messages' ? 'Conversas iniciadas' : 'Leads';
 const selectClass = 'h-10 rounded-md border border-input bg-background px-3 text-sm min-w-0';
 return <section className="space-y-5">
  <div className="rounded-xl border bg-card p-5 space-y-4">
   <div><h2 className="text-xl font-semibold">Quais anúncios estão trazendo vendas?</h2><p className="text-sm text-muted-foreground mt-1">Investimento e contatos da Meta ao lado das vendas lançadas no dashboard.</p></div>
   <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
    <label className="text-sm space-y-1">Conta de anúncios<select aria-label="Conta de anúncios" className={selectClass + ' w-full'} value={account?.id || ''} onChange={e => setAccount(e.target.value)}>{choices.map(a => <option key={a.id} value={a.id}>{a.clientName} · {a.name}</option>)}</select></label>
    <label className="text-sm space-y-1">De<Input type="date" value={since} max={until} onChange={e => setSince(e.target.value)} /></label>
    <label className="text-sm space-y-1">Até<Input type="date" value={until} min={since} max={today()} onChange={e => setUntil(e.target.value)} /></label>
    <label className="text-sm space-y-1">Contatos na Meta<select className={selectClass + ' w-full'} value={kind} onChange={e => setKind(e.target.value as typeof kind)}><option value="messages">Conversas iniciadas</option><option value="leads">Leads</option></select></label>
    <Button className="self-end" disabled={query.isFetching || !valid || !account} onClick={() => { void query.refetch(); void sales.refetch(); void links.refetch(); }}> {query.isFetching ? 'Atualizando…' : 'Atualizar dados'}</Button>
   </div>
   <div className="flex flex-wrap gap-2">{[7, 14, 30].map(days => <Button key={days} variant="outline" size="sm" onClick={() => { const d = today(); setUntil(d); setSince(new Date(Date.parse(d + 'T12:00:00Z') - (days - 1) * 86400000).toISOString().slice(0, 10)); }}>Últimos {days} dias</Button>)}<Button variant="outline" size="sm" onClick={() => { setSince(today().slice(0, 7) + '-01'); setUntil(today()); }}>Este mês</Button></div>
   <p className="text-xs text-muted-foreground">{label} são resultados informados pela Meta, não uma contagem de pessoas únicas. Vendas e valor vendido seguem a data da venda; o retorno compara esses valores com o investimento do mesmo período.</p>
  </div>
  {!valid && <p role="alert">Escolha um período válido de até 12 meses, sem datas futuras.</p>}
  {error && <p role="alert" className="text-destructive">Não foi possível carregar todos os dados. Atualize para tentar novamente; valores indisponíveis aparecem como —.</p>}
  {!account?.internal && account && <p className="text-sm text-muted-foreground">As vendas do dashboard pertencem à Avante. Para esta conta, mostramos apenas os resultados da Meta.</p>}
  {valid && query.data && <>
   <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[['Investido na Meta', money(spend)], [label + ' na Meta', contacts?.toLocaleString('pt-BR') ?? '—'], ['Itens vendidos vinculados', count?.toLocaleString('pt-BR') ?? '—'], ['Valor vendido vinculado', money(revenue)]].map(([title, value]) => <div key={title} className="rounded-xl border bg-card p-5"><p className="text-sm text-muted-foreground">{title}</p><p className="mt-2 text-2xl font-bold">{value}</p></div>)}</div>
   {attribution && attribution.unattributedCount > 0 && <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 text-sm"><strong>{attribution.unattributedCount} itens vendidos sem anúncio identificado · {money(attribution.unattributedRevenue)}</strong><p className="mt-1">Esses valores ficam fora do ranking. Confira o campo “Criativo de vendas” em <Link className="text-primary underline" to="/vendas">Vendas</Link>. O vínculo usa o ID do anúncio; nomes repetidos ou vínculos ambíguos não recebem atribuição automática.</p></div>}
   {(query.data.warnings || []).map(w => <p key={w} className="text-sm text-amber-500">{w}</p>)}
   <div className="rounded-xl border bg-card overflow-hidden">
    <div className="p-4 flex flex-wrap items-center gap-3"><h3 className="font-semibold mr-auto">Resultado por anúncio</h3><Input aria-label="Buscar anúncio" placeholder="Buscar anúncio ou campanha…" className="sm:w-64" value={search} onChange={e => setSearch(e.target.value)} /><select aria-label="Ordenar anúncios" className={selectClass} value={sort} onChange={e => setSort(e.target.value)}><option value="sales">Mais itens vendidos</option><option value="revenue">Maior valor vendido</option><option value="roas">Maior retorno (ROAS)</option><option value="contacts">Mais contatos</option></select></div>
    <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-muted/40 text-muted-foreground"><tr>{['Anúncio', 'Investido', label, 'Custo por contato', 'Itens vendidos', 'Valor vendido', 'Custo por item vendido', 'Retorno (ROAS)'].map(t => <th key={t} className="p-4 text-left whitespace-nowrap">{t}</th>)}</tr></thead><tbody>{visible.map(r => <tr key={r.id} className="border-t"><td className="p-4 min-w-64 max-w-96"><div className="flex gap-3">{r.thumbnail && <img src={r.thumbnail} alt="" loading="lazy" className="w-12 h-12 rounded object-cover shrink-0" />}<div><strong className="break-words">{r.name}</strong><p className="text-xs text-muted-foreground mt-1 break-words">{r.campaign}</p><p className="text-xs text-muted-foreground">ID: {r.id}</p></div></div></td>{[money(r.current.spend), r.contacts?.toLocaleString('pt-BR') ?? '—', money(r.contacts && r.current.spend != null ? r.current.spend / r.contacts : null), r.current.results?.toLocaleString('pt-BR') ?? '—', money(r.revenue), money(r.current.cpr), r.roas == null ? '—' : r.roas.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + 'x'].map((value, i) => <td key={i} className="p-4 whitespace-nowrap tabular-nums">{value}</td>)}</tr>)}{!visible.length && <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Nenhum anúncio com dados da Meta neste período e busca.</td></tr>}</tbody></table></div>
    <p className="p-4 text-xs text-muted-foreground border-t">Um fechamento com vários produtos pode contar como vários itens vendidos. ROAS = valor vendido ÷ investimento; não é lucro nem valor recebido. A comparação é por anúncio, mesmo quando dois anúncios usam a mesma imagem ou vídeo. Os contatos da Meta e as vendas não comprovam conversão da mesma pessoa.</p>
   </div>
  </>}
  {(accounts.isPending || query.isFetching || (account?.internal && !ready && !error)) && <p className="text-sm text-muted-foreground">Carregando dados dos anúncios e vendas…</p>}
 </section>;
}

