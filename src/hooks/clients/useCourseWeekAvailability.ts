import { useEffect, useState } from 'react';
import { supabaseClients as supabase } from '@/integrations/supabase/clientsClient';
import { courseShiftDisabled, type CourseDayOverride, type CourseWeekdayRule } from '@/lib/courseWeekAvailability';
import { toast } from 'sonner';
import { endOfMonth, format } from 'date-fns';

export function useCourseWeekAvailability(month: string, instructor: string = "Nicolas") {
  const [rules, setRules] = useState<CourseWeekdayRule[]>([]);
  const [overrides, setOverrides] = useState<CourseDayOverride[]>([]);
  const [instructorDates,setInstructorDates]=useState<any[]>([]);
  const isInstructorScheduled=(course:string)=>["Curso Meta Ads","Curso Meta Ads Avançado","Curso Meta Ads Online","Curso em Turma"].includes(course);
  const [loading, setLoading] = useState(true);
  const [loadedMonth, setLoadedMonth] = useState('');
  const [loadedInstructor,setLoadedInstructor]=useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const fetchAll = async () => {
    setLoading(true);
    const [base, dates, teachers] = await Promise.all([
      supabase.from('course_disabled_days').select('*'),
      (supabase as any).from('course_day_overrides').select('*').gte('date', `${month}-01`).lte('date', format(endOfMonth(new Date(`${month}-01T12:00:00`)), 'yyyy-MM-dd')),
      (supabase as any).from("course_instructor_availability").select("*").eq("instructor",instructor).gte("date",`${month}-01`).lte("date",format(endOfMonth(new Date(`${month}-01T12:00:00`)),"yyyy-MM-dd")),
    ]);
    if (cancelled) return;
    if (base.error || dates.error || teachers.error) toast.error('Erro ao carregar disponibilidade');
    else { setInstructorDates(teachers.data||[]); setRules(base.data || []); setOverrides(dates.data || []); setLoadedMonth(month); setLoadedInstructor(instructor); }
    setLoading(false);
    };
    fetchAll();
    return () => { cancelled = true; };
  }, [month,instructor]);
  const isShiftDisabled = (course: string, date: string, shift: string) => {
    if(isInstructorScheduled(course)) {const override=instructorDates.find(o=>o.course_name===course&&o.date===date&&o.shift===shift); if(override)return !override.enabled;if(instructor==='Henrique'||course==='Curso em Turma')return true;}
    return courseShiftDisabled(rules,overrides,course,date,shift);
  };
  const isDayDisabled = (course: string, date: string) => ['08:30', '14:00'].every(shift => isShiftDisabled(course, date, shift));
  const toggleDay = async (course: string, date: string, shift: string | null) => {
    if (saving) return;
    const enabled = shift ? isShiftDisabled(course, date, shift) : isDayDisabled(course, date);
    const rows = (shift ? [shift] : ['08:30', '14:00']).map(time => ({ course_name: course, date, shift: time, enabled }));
    setSaving(true);
    try {
      const instructorScheduled=isInstructorScheduled(course);
      const { error } = await (supabase as any).from(instructorScheduled?'course_instructor_availability':'course_day_overrides').upsert(instructorScheduled?rows.map(row=>({...row,instructor})):rows, { onConflict: instructorScheduled?'instructor,course_name,date,shift':'course_name,date,shift' });
      if (error) throw error;
      if(instructorScheduled) setInstructorDates(previous=>[...previous.filter(o=>!rows.some(r=>r.course_name===o.course_name&&r.date===o.date&&r.shift===o.shift)),...rows.map(row=>({...row,instructor}))]);
      else setOverrides(previous => [...previous.filter(o => !rows.some(r => r.course_name === o.course_name && r.date === o.date && r.shift === o.shift)), ...rows]);
    } catch { toast.error('Não foi possível salvar a disponibilidade'); }
    finally { setSaving(false); }
  };
  return { loading: loading || loadedMonth !== month || loadedInstructor !== instructor, saving, toggleDay, isDayDisabled, isShiftDisabled };
}
