import { addDays, endOfMonth, format, startOfMonth, startOfWeek } from 'date-fns';

export type CourseDayOverride = { course_name: string; date: string; shift: string; enabled: boolean };
export type CourseWeekdayRule = { course_name?: string; day_of_week: number; shift: string | null };

export function courseShiftDisabled(rules: CourseWeekdayRule[], overrides: CourseDayOverride[], course: string, date: string, shift: string) {
  const override = overrides.find(o => o.course_name === course && o.date === date && o.shift === shift);
  if (override) return !override.enabled;
  const weekday = new Date(`${date}T12:00:00`).getDay();
  const name = shift === '08:30' ? 'Manhã' : 'Tarde';
  return rules.some(r => (!r.course_name || r.course_name === course) && r.day_of_week === weekday && (r.shift === null || r.shift === shift || r.shift === name));
}

export function monthWeeks(month: string) {
  const first = startOfMonth(new Date(`${month}-01T12:00:00`));
  const last = endOfMonth(first);
  const weeks: Date[][] = [];
  for (let start = startOfWeek(first); start <= last; start = addDays(start, 7)) {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(start, i)));
  }
  return weeks;
}

export const dateInMonth = (date: Date, month: string) => format(date, 'yyyy-MM') === month;
