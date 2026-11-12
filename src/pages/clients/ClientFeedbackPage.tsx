import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useClients } from '@/hooks/clients/useGestaoClients';
import { supabase } from '@/integrations/supabase/client';
import { groupClientContracts } from '@/lib/clientContractGroups';
import { FEEDBACK_AREAS, FeedbackInvite, feedbackClientKey, feedbackMonth, heatColor, monthLabel, npsSummary } from '@/lib/clientFeedback';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import type { Client } from '@/types/clients/client';

export default function ClientFeedbackPage(){
  const meta=useClients(),google=useClients('google_ads');
  const [month,setMonth]=useState(feedbackMonth),[search,setSearch]=useState(''),[status,setStatus]=useState('Todos');
  const [invites,setInvites]=useState<FeedbackInvite[]>([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState('');
  const [view,setView]=useState<'areas'|'history'>('areas');
  const [refresh,setRefresh]=useState(0);
  const months=useMemo(()=>Array.from({length:12},(_,index)=>{const d=new Date(`${month}-01T12:00:00`);d.setMonth(d.getMonth()-11+index);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`;}),[month]);
  useEffect(()=>{let cancelled=false;setLoading(true);
    (supabase as any).from('client_feedback_invites').select('*,client_feedback_responses(*)').gte('month',months[0]).lte('month',`${month}-01`).order('client_name').then(({data,error}:any)=>{
      if(cancelled)return;if(error)toast.error('Não foi possível carregar o feedback');else setInvites(data||[]);setLoading(false);
    });return()=>{cancelled=true;};
  },[month,months,refresh]);
  useEffect(()=>{const timer=setInterval(()=>setRefresh(r=>r+1),60000);return()=>clearInterval(timer);},[]);
  const clients=useMemo(()=>[...new Map(groupClientContracts(meta.clients,google.clients).map(g=>({...g.client,id:(g.meta?.status==='Ativo'?g.meta.id:g.google?.id)||g.client.id})).filter(c=>c.status==='Ativo'&&c.contractType==='MRR'&&c.contractLifecycle!=='encerrado').reverse().map(c=>[feedbackClientKey(c.name),c])).values()].sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')),[meta.clients,google.clients]);
  const current=invites.filter(i=>i.month===`${month}-01`);
  const responses=current.flatMap(i=>i.client_feedback_responses||[]);
  const summary=npsSummary(responses);
  const selectedInvite=(client:Client)=>current.find(i=>i.client_key===feedbackClientKey(client.name));
  const visible=clients.filter(c=>c.name.toLowerCase().includes(search.toLowerCase())&&(status==='Todos'||(status==='Respondidas')===Boolean(selectedInvite(c)?.client_feedback_responses?.length)));
  const canGenerate=month>=feedbackMonth();
  const link=(invite:Pick<FeedbackInvite,'token'>)=>`${window.location.origin}/feedback-cliente/${invite.token}`;
  async function generate(client:Client){
    const {data,error}=await (supabase as any).rpc('create_client_feedback_invite',{p_client:client.id,p_month:`${month}-01`});
    if(error)throw error;
    const result=(Array.isArray(data)?data[0]:data) as FeedbackInvite;
    if(!result?.token)throw new Error('A pesquisa não retornou um link válido');
    return {...result,client_feedback_responses:[]};
  }
  async function share(client:Client,whatsapp=false){
    setBusy(client.id);
    try{
      const invite=selectedInvite(client)||await generate(client);
      let phone=(client.phone||'').replace(/\D/g,'');if(phone.length===10||phone.length===11)phone='55'+phone;
      const message=`Olá! Queremos saber como foi nosso trabalho para ${client.name} em ${monthLabel(month)}. Pode responder esta pesquisa rápida? Leva cerca de 2 minutos e ajuda nossa equipe a melhorar.\n\n${link(invite)}`;
      if(whatsapp){if(phone&&!/^55[1-9][0-9]{9,10}$/.test(phone))throw new Error('Cadastre um WhatsApp válido no perfil do cliente');window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`,'_blank','noopener,noreferrer');}
      else{await navigator.clipboard.writeText(link(invite));toast.success('Link da pesquisa copiado');}
      setRefresh(r=>r+1);
    }catch(e:any){toast.error(e.message||'Não foi possível preparar o convite');}finally{setBusy('');}
  }
  async function generateMonth(){
    setBusy('all');let count=0;
    try{for(const client of clients){if(!selectedInvite(client)){await generate(client);count++;}}toast.success(`${count} link(s) gerado(s). Os convites estão prontos para compartilhar.`);}
    catch(e:any){toast.error(e.message||'Não foi possível gerar todos os links');}
    finally{setRefresh(r=>r+1);setBusy('');}
  }
  const heatRows=current.filter(i=>i.client_feedback_responses?.length&&i.client_name.toLowerCase().includes(search.toLowerCase()));
  const historicClients=[...new Map(invites.filter(i=>i.client_feedback_responses?.length).map(i=>[i.client_key,i])).values()].filter(i=>i.client_name.toLowerCase().includes(search.toLowerCase()));
  return <DashboardLayout title="NPS dos Clientes" subtitle="Pesquisa mensal dos clientes recorrentes e mapa de calor das avaliações." contentClassName="max-w-[1720px]">
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3"><label className="space-y-1 text-sm">Mês da pesquisa<Input type="month" value={month} onChange={e=>{if(/^\d{4}-\d{2}$/.test(e.target.value))setMonth(e.target.value);}} /></label><Input className="max-w-sm" placeholder="Buscar cliente…" value={search} onChange={e=>setSearch(e.target.value)} /><Button variant="outline" onClick={()=>setRefresh(r=>r+1)}>Atualizar respostas</Button><Button variant="outline" onClick={()=>window.open('/feedback-cliente/preview','_blank','noopener,noreferrer')}>Visualizar formulário</Button><Button onClick={generateMonth} disabled={Boolean(busy)||!canGenerate||meta.loading||google.loading}>{busy==='all'?'Gerando links…':'Gerar links do mês'}</Button></div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">{[
        ['NPS',summary.score===null?'—':String(summary.score)],
        ['Respostas',`${responses.length} / ${current.length} links gerados`],
        ['Promotores (9–10)',String(summary.promoters)],
        ['Pontos de atenção (0–6)',String(summary.detractors)],
      ].map(([label,value])=><div key={label} className="rounded-xl border bg-card p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="text-2xl font-semibold mt-2">{value}</p></div>)}</div>
      <p className="text-sm text-muted-foreground">NPS = % de promotores − % de detratores, de −100 a 100. Neutros (7–8): {summary.passives}. Adesão: {current.length ? Math.round(responses.length/current.length*100) : 0}% dos links gerados. Sem respostas, a nota fica em branco.</p>
      <section className="rounded-xl border p-5 space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold text-lg">Convites · {monthLabel(month)}</h2><select aria-label="Filtrar respostas" className="rounded-md border bg-background p-2" value={status} onChange={e=>setStatus(e.target.value)}>{['Todos','Pendentes','Respondidas'].map(s=><option key={s}>{s}</option>)}</select></div><p className="text-sm text-muted-foreground">Uma pesquisa por cliente e mês. Meta e Google são agrupados. “Preparar WhatsApp” abre o convite para vocês revisarem e enviarem.</p>
        {meta.loading||google.loading||loading ? <p>Carregando clientes e respostas…</p> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left border-b">{['Cliente','Gestor','Status da pesquisa','Ações'].map(h=><th key={h} className="p-3">{h}</th>)}</tr></thead><tbody>{visible.map(client=>{const invite=selectedInvite(client),answered=Boolean(invite?.client_feedback_responses?.length);return <tr key={client.id} className="border-b"><td className="p-3 font-medium">{client.name}</td><td className="p-3">{client.manager}</td><td className="p-3">{answered?<span className="text-emerald-400">Respondida</span>:invite?'Aguardando resposta':'Link ainda não gerado'}</td><td className="p-3"><div className="flex gap-2"><Button size="sm" variant="outline" disabled={Boolean(busy)||(!invite&&!canGenerate)} onClick={()=>share(client)}>Copiar link</Button><Button size="sm" variant="outline" disabled={Boolean(busy)||(!invite&&!canGenerate)||answered} onClick={()=>share(client,true)}>Preparar WhatsApp</Button></div></td></tr>;})}</tbody></table>{!visible.length&&<p className="p-4 text-muted-foreground">Nenhum cliente recorrente ativo neste filtro.</p>}</div>}
      </section>
      <section className="rounded-xl border p-5 space-y-4"><div className="flex flex-wrap gap-3 items-center"><h2 className="font-semibold text-lg mr-auto">Mapa de calor</h2><Button size="sm" variant={view==='areas'?'default':'outline'} onClick={()=>setView('areas')}>Áreas do serviço</Button><Button size="sm" variant={view==='history'?'default':'outline'} onClick={()=>setView('history')}>Evolução mensal</Button></div>
        <p className="text-sm text-muted-foreground">Verde: boa avaliação · Amarelo: atenção · Vermelho: prioridade de melhoria · Cinza: sem avaliação ou não se aplica.</p>
        <div className="overflow-x-auto">{view==='areas'?<table className="w-full text-sm"><thead><tr className="text-left"><th className="p-3">Cliente</th><th className="p-3 text-center">NPS (0–10)</th>{FEEDBACK_AREAS.map(a=><th className="p-3 text-center" key={a.key}>{a.label} (1–5)</th>)}</tr></thead><tbody>{heatRows.map(invite=>{const r=invite.client_feedback_responses[0];return <tr key={invite.id} className="border-t"><td className="p-3 font-medium">{invite.client_name}</td><td className="p-2"><div className={`rounded-lg p-3 text-center font-bold ${heatColor(r.nps,true)}`}>{r.nps}</div></td>{FEEDBACK_AREAS.map(a=><td key={a.key} className="p-2"><div className={`rounded-lg p-3 text-center font-bold ${heatColor(r[a.key])}`}>{r[a.key]??'—'}</div></td>)}</tr>;})}</tbody></table>:<table className="w-full text-sm"><thead><tr><th className="text-left p-3">Cliente · nota NPS</th>{months.map(m=><th key={m} className="p-2 whitespace-nowrap">{new Date(`${m}T12:00:00`).toLocaleDateString('pt-BR',{month:'short',year:'2-digit'})}</th>)}</tr></thead><tbody>{historicClients.map(c=><tr key={c.client_key} className="border-t"><td className="p-3 whitespace-nowrap font-medium">{c.client_name}</td>{months.map(m=>{const response=invites.find(i=>i.client_key===c.client_key&&i.month===m)?.client_feedback_responses[0];return <td key={m} className="p-1"><div className={`rounded p-3 text-center ${heatColor(response?.nps??null,true)}`}>{response?.nps??'—'}</div></td>;})}</tr>)}</tbody></table>}</div>
        {!(view==='areas'?heatRows:historicClients).length&&<p className="text-muted-foreground">As primeiras respostas preencherão o mapa de calor. Nenhuma nota foi presumida.</p>}
      </section>
      <section className="space-y-3"><h2 className="font-semibold text-lg">O que os clientes disseram</h2>{heatRows.map(invite=>{const r=invite.client_feedback_responses[0];return <article key={invite.id} className="rounded-xl border bg-card p-5"><div className="flex flex-wrap gap-3 justify-between"><h3 className="font-semibold">{invite.client_name}</h3><span className={`rounded px-3 py-1 text-sm ${heatColor(r.nps,true)}`}>NPS: {r.nps}</span></div><p className="mt-3 whitespace-pre-wrap break-words">{r.reason}</p>{r.suggestion&&<p className="mt-3 whitespace-pre-wrap break-words"><strong>Sugestão:</strong> {r.suggestion}</p>}<p className="mt-3 text-xs text-muted-foreground">{r.respondent||'Nome não informado'} · {new Date(r.created_at).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})}</p></article>;})}</section>
    </div>
  </DashboardLayout>;
}
