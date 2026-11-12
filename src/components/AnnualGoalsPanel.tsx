import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useVendas } from "@/hooks/useVendas";
import { useFechamentosDiarios } from "@/hooks/useFechamentosDiarios";
import { revenueSummary, monthRanges, ratio } from "@/lib/evolutionMetrics";
import { annualForecast } from "@/lib/annualForecast";
import { Metric, Section, money, percent } from "@/components/evolution/EvolutionPrimitives";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
export default function AnnualGoalsPanel() {
 const [year,setYear]=useState(new Date().getFullYear()),[editing,setEditing]=useState(false),[draft,setDraft]=useState("");
 const {session}=useAuth(),qc=useQueryClient();
 const sales=useVendas(),closings=useFechamentosDiarios();
 const goals=useQuery({queryKey:["annual-revenue-goal",year],queryFn:async()=>{const {data,error}=await supabase.from("annual_revenue_goals" as never).select("amount").eq("year",year).maybeSingle();if(error)throw error;return data as {amount:number}|null;}});
 const monthlyGoals=useQuery({queryKey:["daily-metrics","annual-goals",year],queryFn:async()=>{const {data,error}=await supabase.from("daily_metrics").select("date,meta_mensal_prevista").gte("date",`${year}-01-01`).lte("date",`${year}-12-31`);if(error)throw error;return data;}});
 const save=useMutation({mutationFn:async()=>{if(!session?.user.id)throw Error("Sessão expirada");const amount=Number(draft);if(!draft||!Number.isFinite(amount)||amount<0)throw Error("Informe uma meta válida");const {error}=await supabase.from("annual_revenue_goals" as never).upsert({year,amount,updated_by:session.user.id,updated_at:new Date().toISOString()} as never,{onConflict:"year"});if(error)throw error;},onSuccess:()=>{qc.invalidateQueries({queryKey:["annual-revenue-goal",year]});setEditing(false);toast.success("Meta anual salva");},onError:()=>toast.error("Não foi possível salvar a meta anual")});
 const rows=useMemo(()=>sales.data&&closings.data?monthRanges({start:`${year}-01-01`,end:`${year}-12-31`}).map((range,i)=>({name:new Date(year,i,1).toLocaleDateString("pt-BR",{month:"short"}),revenue:revenueSummary(sales.data!,closings.data!,range).total,target:Math.max(0,...(monthlyGoals.data||[]).filter(m=>m.date.startsWith(range.start.slice(0,7))).map(m=>Number(m.meta_mensal_prevista)))})):[],[year,sales.data,closings.data,monthlyGoals.data]);
 const forecast=rows.length?annualForecast(rows.map(r=>r.revenue),year):null;
 const target=goals.data?Number(goals.data.amount):null;
 const progress=ratio(forecast?.actual??null,target),missing=target!=null&&forecast?Math.max(0,target-forecast.actual):null;
 const currentYear=new Date().getFullYear();
 const remaining=year<currentYear?0:year>currentYear?12:12-new Date().getMonth();
 return <Section title="Metas anuais e previsibilidade" description="Faturamento pelo recebimento líquido. A meta anual é compartilhada pela equipe e independente da soma das metas mensais. A projeção repete a média dos últimos três meses completos; não é receita garantida." action={<select aria-label="Ano das metas" className="h-10 rounded-lg border bg-background px-3" value={year} onChange={e=>{setYear(Number(e.target.value));setEditing(false);}}>{Array.from({length:8},(_,i)=>currentYear-4+i).map(y=><option key={y}>{y}</option>)}</select>}>
 <div className="mb-4 flex flex-wrap items-center gap-3"><Button variant="outline" onClick={()=>{setDraft(String(target??""));setEditing(true);}}>Editar meta anual</Button>{editing&&<><Input aria-label="Valor da meta anual" type="number" min="0" step="0.01" className="w-48" value={draft} onChange={e=>setDraft(e.target.value)}/><Button disabled={save.isPending||!draft||Number(draft)<0} onClick={()=>save.mutate()}>Salvar meta anual</Button><Button variant="ghost" onClick={()=>setEditing(false)}>Cancelar</Button></>}</div>
 {(goals.isError||monthlyGoals.isError||sales.isError||closings.isError)&&<p role="alert" className="mb-3 text-sm text-destructive">Falha ao consultar parte dos dados anuais. Atualize a página para tentar novamente.</p>}
 <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric title="Meta anual" value={money(target)}/><Metric title="Coletado no ano" value={money(forecast?.actual??null)}/><Metric title="Meta anual atingida" value={percent(progress==null?null:progress*100)}/><Metric title="Falta para a meta" value={money(missing)}/><Metric title="Projeção de fechamento do ano" value={money(forecast?.forecast??null)} detail={year<currentYear?"Ano encerrado: resultado efetivo.":"Exige três meses completos; meses sem recebimento entram como zero. Não considera sazonalidade."}/><Metric title="Média mensal recente" value={money(forecast?.monthlyRunRate??null)} detail="Últimos três meses completos do ano selecionado."/><Metric title="Necessário por mês restante" value={money(ratio(missing,remaining))} detail={`${remaining} mês(es), incluindo o atual quando aplicável.`}/><Metric title="Cobertura da meta projetada" value={percent(ratio(forecast?.forecast??null,target)==null?null:ratio(forecast?.forecast??null,target)!*100)}/></div>
 <div className="mt-5 h-72"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={rows}><CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3"/><XAxis dataKey="name" tick={{fontSize:11}}/><YAxis tick={{fontSize:11}} width={65} tickFormatter={v=>new Intl.NumberFormat("pt-BR",{notation:"compact"}).format(v)}/><Tooltip contentStyle={{background:"hsl(var(--popover))"}} formatter={(v:number)=>money(v)}/><Legend/><Bar dataKey="revenue" name="Coletado" fill="#3b82f6"/><Line dataKey="target" name="Meta mensal cadastrada" stroke="#8b5cf6" strokeWidth={2}/></ComposedChart></ResponsiveContainer></div>
 <p className="mt-3 text-xs text-muted-foreground">Metas mensais cadastradas: {money(monthlyGoals.data?rows.reduce((s,r)=>s+r.target,0):null)}. Meses sem meta não são preenchidos automaticamente pela meta anual.</p>
 </Section>;
}
