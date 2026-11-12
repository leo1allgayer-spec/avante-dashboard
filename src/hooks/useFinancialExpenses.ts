import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { MonthlyExpense } from '@/lib/financialExpenses';
export function useFinancialExpenses(month: string) {
  return useQuery({queryKey:['financial-expenses',month], refetchOnWindowFocus:false, queryFn:async()=>{
    const {data,error}=await (supabase as any).from('financial_monthly_expenses').select('*').eq('month',month+'-01');
    if(error)throw error;
    return (data||[]) as MonthlyExpense[];
  }});
}
export function useSaveFinancialExpenses() {
 const qc=useQueryClient();
 return useMutation({mutationFn:async(rows:MonthlyExpense[])=>{
   const {data:sessionData}=await supabase.auth.getUser();
   if(!sessionData.user)throw new Error('Entre novamente para salvar.');
   const {error}=await (supabase as any).from('financial_monthly_expenses').upsert(rows.map(r=>({...r,updated_by:sessionData.user!.id,updated_at:new Date().toISOString()})),{onConflict:'month,category'});
   if(error)throw error;
 },onSuccess:()=>qc.invalidateQueries({queryKey:['financial-expenses']})});
}

export function useFinancialExpensesRange(since: string, until: string) {
 return useQuery({queryKey:['financial-expenses','range',since,until],refetchOnWindowFocus:false,queryFn:async()=>{
  const {data,error}=await (supabase as any).from('financial_monthly_expenses').select('*').gte('month',since.slice(0,7)+'-01').lte('month',until.slice(0,7)+'-01');
  if(error)throw error;
  return (data||[]) as MonthlyExpense[];
 }});
}
