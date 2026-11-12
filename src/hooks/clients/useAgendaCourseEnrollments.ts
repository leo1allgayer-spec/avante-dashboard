import { useQuery } from '@tanstack/react-query';
import { supabaseClients as supabase } from '@/integrations/supabase/clientsClient';
export function useAgendaCourseEnrollments(enabled: boolean) {
 return useQuery({queryKey:['agenda-course-enrollments'],enabled,refetchInterval:60000,refetchOnWindowFocus:true,queryFn:async()=>{
  const {data,error}=await supabase.from('course_enrollments').select('id,student_name,course_type,date,time');
  if(error) throw error;
  return data || [];
 }});
}
