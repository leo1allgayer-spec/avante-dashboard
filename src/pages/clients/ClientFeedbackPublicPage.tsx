import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { FEEDBACK_AREAS, FeedbackArea, monthLabel, feedbackMonth } from '@/lib/clientFeedback';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export default function ClientFeedbackPublicPage() {
  const {token}=useParams();
  const [form,setForm]=useState<any>(null);
  const [error,setError]=useState('');
  const [nps,setNps]=useState<number|null>(null);
  const [ratings,setRatings]=useState<Partial<Record<FeedbackArea,number|null>>>({});
  const [reason,setReason]=useState(''),[suggestion,setSuggestion]=useState(''),[respondent,setRespondent]=useState('');
  const [saving,setSaving]=useState(false),[done,setDone]=useState(false);
  useEffect(()=>{let cancelled=false;
    if(token==='preview'){setForm({clientName:'Seu cliente',month:`${feedbackMonth()}-01`,answered:false,expired:false});return;}
    if(!token || !/^[0-9a-f-]{36}$/i.test(token)){setError('Link de pesquisa inválido.');return;}
    (supabase as any).rpc('get_client_feedback_form',{p_token:token}).then(({data,error}:any)=>{
      if(cancelled)return;
      if(error||data?.error)setError(data?.error||'Não foi possível carregar a pesquisa. Tente novamente.');else setForm(data);
    });return()=>{cancelled=true;};
  },[token]);
  async function submit(e:React.FormEvent){
    e.preventDefault();
    if(nps===null||FEEDBACK_AREAS.some(a=>ratings[a.key]===undefined)||reason.trim().length<3){toast.error('Responda às avaliações e conte o motivo da sua nota.');return;}
    if(token==='preview'){setDone(true);toast.success('Prévia concluída. Nenhuma resposta foi gravada.');return;}
    setSaving(true);
    try{const {data,error}=await (supabase as any).rpc('submit_client_feedback',{p_token:token,p_nps:nps,p_ratings:ratings,p_reason:reason,p_suggestion:suggestion,p_respondent:respondent});if(error||data?.error)throw error||new Error(data.error);setDone(true);}
    catch(e:any){toast.error(e.message||'Não foi possível enviar. Tente novamente.');}
    finally{setSaving(false);}
  }
  return <main className="min-h-screen bg-background text-foreground px-4 py-10"><div className="mx-auto max-w-2xl space-y-6">
    <header><p className="text-primary font-semibold mb-2">Avante Digital</p><h1 className="text-3xl font-bold">Como foi nosso trabalho neste mês?</h1><p className="text-muted-foreground mt-3">Sua opinião ajuda nossa equipe a melhorar. Leva cerca de 2 minutos.</p></header>
    {token==='preview'&&<p className="rounded-xl border border-amber-500/40 p-4 text-sm">Prévia do formulário. As respostas de teste desta página não são gravadas.</p>}
    {error ? <p role="alert" className="rounded-xl border p-6">{error}</p> : !form ? <p>Carregando pesquisa…</p> : done||form.answered ? <section className="rounded-xl border p-8"><h2 className="text-xl font-semibold">Obrigado pelo feedback!</h2><p className="mt-2">{token==='preview'?'Prévia concluída. Nenhuma resposta foi gravada.':'Sua resposta deste mês foi registrada e será analisada pela equipe.'}</p></section> : form.expired ? <p className="rounded-xl border p-6">Esta pesquisa expirou. Solicite um novo link à equipe.</p> : <form onSubmit={submit} className="space-y-6">
      <div className="rounded-xl border p-4"><p className="font-semibold">{form.clientName}</p><p className="text-muted-foreground capitalize">{monthLabel(form.month)}</p></div>
      <fieldset className="rounded-xl border p-5 space-y-3"><legend className="px-2 font-semibold">De 0 a 10, quanto você recomendaria a Avante Digital?</legend><div className="grid grid-cols-6 sm:grid-cols-11 gap-2">{Array.from({length:11},(_,score)=><Button key={score} type="button" aria-pressed={nps===score} variant={nps===score?'default':'outline'} onClick={()=>setNps(score)}>{score}</Button>)}</div><div className="flex justify-between text-xs text-muted-foreground"><span>0 · Não recomendaria</span><span>10 · Recomendaria com certeza</span></div></fieldset>
      {FEEDBACK_AREAS.map(area=><fieldset key={area.key} className="rounded-xl border p-5 space-y-3"><legend className="px-2 font-semibold">{area.question}</legend><div className="flex flex-wrap gap-2">{[1,2,3,4,5].map(score=><Button type="button" key={score} aria-label={`${area.label}: nota ${score}`} aria-pressed={ratings[area.key]===score} variant={ratings[area.key]===score?'default':'outline'} onClick={()=>setRatings(r=>({...r,[area.key]:score}))}>{score}</Button>)}<Button type="button" aria-pressed={ratings[area.key]===null} variant={ratings[area.key]===null?'default':'outline'} onClick={()=>setRatings(r=>({...r,[area.key]:null}))}>Não se aplica</Button></div><p className="text-xs text-muted-foreground">1 · Muito insatisfeito — 5 · Muito satisfeito</p></fieldset>)}
      <label className="block space-y-2"><span className="font-semibold">Qual é o principal motivo da sua avaliação? *</span><Textarea required minLength={3} maxLength={2000} value={reason} onChange={e=>setReason(e.target.value)} placeholder="O que funcionou bem e o que precisa melhorar?" /></label>
      <label className="block space-y-2"><span>O que podemos fazer melhor no próximo mês? (opcional)</span><Textarea maxLength={2000} value={suggestion} onChange={e=>setSuggestion(e.target.value)} /></label>
      <label className="block space-y-2"><span>Seu nome (opcional)</span><Input maxLength={120} value={respondent} onChange={e=>setRespondent(e.target.value)} autoComplete="name" /></label>
      <p className="text-xs text-muted-foreground">Sua resposta fica vinculada à empresa e ao mês indicados acima. Somente a equipe autorizada pode consultar o feedback.</p>
      <Button type="submit" className="w-full" disabled={saving}>{saving?'Enviando…':'Enviar meu feedback'}</Button>
    </form>}
  </div></main>;
}
