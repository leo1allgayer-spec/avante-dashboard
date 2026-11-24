import { useEffect, useState } from 'react';
import { supabaseClients as supabase } from '@/integrations/supabase/clientsClient';
import { courseShiftDisabled, type CourseDayOverride, type CourseWeekdayRule } from '@/lib/courseWeekAvailability';
import { toast } from 'sonner';
import { endOfMonth, format } from 'date-fns';

export function useCourseWeekAvailability(month: string, instructor: string = "Nicolas") {
  const [rules, setRules] = useState<CourseWeekdayRule[]>([]);
  const [overrides, setOverrides] = useState<CourseDayOverride[]>([]);
  const [instructorDates,setInstructorDates]=useState<any[]>([]);
  const [meetingConflicts,setMeetingConflicts]=useState<Array<{booking_date:string;booking_shift:string}>>([]);
  const isInstructorScheduled=(course:string)=>["Curso Meta Ads","Curso Meta Ads Avançado","Curso Meta Ads Online","Curso em Turma"].includes(course);
  const [loading, setLoading] = useState(true);
  const [loadedMonth, setLoadedMonth] = useState('');
  const [loadedInstructor,setLoadedInstructor]=useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const endDate = format(endOfMonth(new Date(`${month}-01T12:00:00`)), 'yyyy-MM-dd');
    const fetchAll = async () => {
    setLoading(true);
    const [base, dates, teachers, conflicts] = await Promise.all([
      supabase.from('course_disabled_days').select('*'),
      (supabase as any).from('course_day_overrides').select('*').gte('date', `${month}-01`).lte('date', endDate),
      (supabase as any).from("course_instructor_availability").select("*").eq("instructor",instructor).gte("date",`${month}-01`).lte("date",endDate),
      (supabase as any).rpc("get_course_instructor_meeting_conflicts",{p_instructor:instructor,p_start:`${month}-01`,p_end:endDate}),
    ]);
    if (cancelled) return;
    if (base.error || dates.error || teachers.error || conflicts.error) toast.error('Erro ao carregar disponibilidade');
    else { setInstructorDates(teachers.data||[]); setRules(base.data || []); setOverrides(dates.data || []); setMeetingConflicts(conflicts.data||[]); setLoadedMonth(month); setLoadedInstructor(instructor); }
    setLoading(false);
    };
    fetchAll();
    const channel = supabase.channel(`course-availability-meetings-${instructor}-${month}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meetings' }, () => {
        void (supabase as any).rpc("get_course_instructor_meeting_conflicts", {
          p_instructor: instructor,
          p_start: `${month}-01`,
          p_end: endDate,
        }).then(({ data, error }: any) => {
          if (cancelled) return;
          if (error) toast.error('Erro ao atualizar bloqueios de reuniões');
          else setMeetingConflicts(data || []);
        });
      }).subscribe();
    return () => { cancelled = true; void supabase.removeChannel(channel); };
  }, [month,instructor]);
  const isMeetingConflict = (course: string, date: string, shift?: string | null) => {
    if (!isInstructorScheduled(course) || (course === 'Curso em Turma' && instructor !== 'Nicolas')) return false;
    const shifts = shift ? [shift] : ['08:30', '14:00'];
    // An explicitly enabled cohort date/turn is an administrator exception and
    // must take precedence over a meeting conflict for this specific slot.
    if (course === 'Curso em Turma' && shifts.every(time =>
      instructorDates.some(row => row.course_name === course && row.date === date && row.shift === time && row.enabled),
    )) return false;
    return shifts.some(time => meetingConflicts.some(conflict => conflict.booking_date === date && conflict.booking_shift === time));
  };
  const isShiftDisabled = (course: string, date: string, shift: string) => {
    if(isInstructorScheduled(course)) {
      if (isMeetingConflict(course, date, shift)) return true;
      const override=instructorDates.find(o=>o.course_name===course&&o.date===date&&o.shift===shift);
      if(override)return !override.enabled;
      if(instructor==='Henrique'||course==='Curso em Turma')return true;
    }
    return courseShiftDisabled(rules,overrides,course,date,shift);
  };
  const isDayDisabled = (course: string, date: string) => ['08:30', '14:00'].every(shift => isShiftDisabled(course, date, shift));
  const toggleDay = async (course: string, date: string, shift: string | null) => {
    if (saving) return;
    const enabled = shift ? isShiftDisabled(course, date, shift) : isDayDisabled(course, date);
    const rows = (shift ? [shift] : ['08:30', '14:00']).map(time => ({ course_name: course, date, shift: time, enabled }));
    if (enabled && rows.some(row => isMeetingConflict(course, date, row.shift))) {
      toast.error('Esse turno está bloqueado por uma reunião futura do professor.');
      return;
    }
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
  return { loading: loading || loadedMonth !== month || loadedInstructor !== instructor, saving, toggleDay, isDayDisabled, isShiftDisabled, isMeetingConflict };
}
