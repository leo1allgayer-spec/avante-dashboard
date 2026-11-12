import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
export type CrmCallSeller = {id:string;name:string;calls:number;answered:number|null;notAnswered:number|null;people:number|null;attemptsPerPerson:number|null};
export type CrmCalls = { today: {sellers:CrmCallSeller[]}; month: {sellers:CrmCallSeller[]} };
export function useCrmCalls(date: string) {
  return useQuery<CrmCalls>({
    queryKey:['crm-calls',date],
    queryFn: async () => {
      const {data,error} = await supabase.functions.invoke('crm-agenda',{body:{action:'calls'}});
      if(error || data?.error) throw new Error(data?.error || error?.message || 'CRM indisponível');
      return data;
    },
    staleTime:5*60_000,refetchInterval:5*60_000,retry:1,
  });
}
