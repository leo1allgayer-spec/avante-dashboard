import { buildLabRows } from "@/lib/creative-lab/rows";
export { buildLabRows } from "@/lib/creative-lab/rows";
import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { creativeSalesRoas } from '@/lib/creativeSalesRoas';
import type { Venda } from '@/hooks/useVendas';
import type { CriativoVenda } from '@/hooks/useCriativos';
import { defaultTarget, diagnose, metrics, type Account, type LabData, type LabRow, type RawInsight, type ResultKind, type Target } from '@/lib/creative-lab/analytics';
export async function creativeLabRequest(body:Record<string,unknown>){
 const {data,error}=await supabase.functions.invoke('creative-lab',{body});
 if(error||data?.error)throw new Error(data?.error||'Não foi possível consultar a Central de Criativos. Verifique a conexão e suas permissões.');
 return data;
}
export function useLabAccounts(){
 const {session}=useAuth();
 return useQuery<{accounts:Account[]}>({queryKey:['creative-lab-accounts',session?.user.id],queryFn:()=>creativeLabRequest({action:'accounts'}),enabled:!!session,staleTime:300000,retry:1});
}
export function labDataQuery(accountId:string,since:string,until:string,enabled=true,includePrevious=true){
 return {queryKey:['creative-lab-data',accountId,since,until,includePrevious],queryFn:()=>creativeLabRequest({action:'data',accountId,since,until,includePrevious}) as Promise<LabData>,enabled:enabled&&!!accountId,staleTime:300000,retry:1};
}
export function useLabTarget(accountId:string,kind:ResultKind){
 const qc=useQueryClient();
 const key=['creative-lab-target',accountId,kind];
 const query=useQuery({queryKey:key,enabled:!!accountId,staleTime:300000,retry:1,queryFn:async()=>{
  const {target:t}=await creativeLabRequest({action:'target',accountId,resultType:kind});
  return t?{cpr:t.cpr==null?null:Number(t.cpr),minImpressions:Number(t.min_impressions),minResults:Number(t.min_results),minSpend:Number(t.min_spend),ctrFloor:t.ctr_floor==null?null:Number(t.ctr_floor),frequencyCeiling:t.frequency_ceiling==null?null:Number(t.frequency_ceiling),changeThreshold:Number(t.change_threshold)} as Target:defaultTarget;
 }});
 const save=useMutation({mutationFn:(target:Target)=>creativeLabRequest({action:'save_target',accountId,resultType:kind,target}),onSuccess:()=>qc.invalidateQueries({queryKey:key})});
 return {query,save,target:query.data||defaultTarget};
}
export function useLabRows(data:LabData|undefined,kind:ResultKind,target:Target,sales:Venda[],links:CriativoVenda[],ready:boolean){
 return useMemo(()=>buildLabRows(data,kind,target,sales,links,ready),[data,kind,target,sales,links,ready]);
}
