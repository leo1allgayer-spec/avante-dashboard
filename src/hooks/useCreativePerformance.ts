import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { creativePerformance, type CreativeInsight } from "@/lib/creativePerformance";
export function creativePerformanceQuery(range:{start:string;end:string}, enabled=true) {
 return {queryKey:["creative-performance",range.start,range.end],enabled,staleTime:120000,retry:1,queryFn:async()=>{
  const {data,error}=await supabase.functions.invoke("meta-ads",{body:{action:"creative_performance",datePreset:"custom",since:range.start,until:range.end}});
  if(error||data?.error)throw Error("Não foi possível consultar os criativos");
  return (data.rows as CreativeInsight[]).map(creativePerformance);
 }};
}
export function useCreativePerformance(range?:{start:string;end:string}) {
 return useQuery(creativePerformanceQuery(range || {start:'',end:''},Boolean(range)));
}
