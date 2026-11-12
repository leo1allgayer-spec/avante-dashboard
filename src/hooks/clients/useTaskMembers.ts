import {useCallback,useEffect,useState} from 'react';
import {supabaseClients as supabase} from '@/integrations/supabase/clientsClient';
import {TeamMember} from '@/types/clients/task';
import {toast} from 'sonner';
export function useTaskMembers(){
 const [members,setMembers]=useState<TeamMember[]>([]);const [loading,setLoading]=useState(true);
 const refetch=useCallback(async()=>{const {data,error}=await (supabase as any).from('task_assignee_directory').select('member_id,display_name,phone').order('display_name');if(error)toast.error('Não foi possível carregar os responsáveis');else setMembers((data||[]).map((row:any)=>({id:row.member_id,name:row.display_name,phone:row.phone,dailyTaskGoal:0,weeklyTaskGoal:0,maxTaskMinutes:120})));setLoading(false);},[]);
 useEffect(()=>{void refetch();},[refetch]);return {members,loading,refetch};
}
