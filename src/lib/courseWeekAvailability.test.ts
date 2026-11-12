import { describe, expect, it } from 'vitest';
import { courseShiftDisabled, dateInMonth, monthWeeks } from './courseWeekAvailability';

describe('availability scoped to dates', () => {
  const rules = [{ course_name: 'Meta', day_of_week: 3, shift: null }];
  const overrides = [{ course_name: 'Meta', date: '2026-10-14', shift: '08:30', enabled: true }];
  it('opens only the selected date and shift, preserving other weeks and courses', () => {
    expect(courseShiftDisabled(rules, overrides, 'Meta', '2026-10-14', '08:30')).toBe(false);
    expect(courseShiftDisabled(rules, overrides, 'Meta', '2026-10-14', '14:00')).toBe(true);
    expect(courseShiftDisabled(rules, overrides, 'Meta', '2026-10-21', '08:30')).toBe(true);
    expect(courseShiftDisabled([], overrides, 'Google', '2026-10-14', '08:30')).toBe(false);
  });
  it('blocks a single occurrence without changing the recurring pattern', () => {
    const closed = [{ ...overrides[0], enabled: false }];
    expect(courseShiftDisabled([], closed, 'Meta', '2026-10-14', '08:30')).toBe(true);
    expect(courseShiftDisabled([], closed, 'Meta', '2026-10-21', '08:30')).toBe(false);
  });
  it('includes all month dates exactly once and excludes adjacent months from edits', () => {
    const weeks = monthWeeks('2026-10');
    expect(weeks).toHaveLength(5);
    expect(weeks.flat().filter(date => dateInMonth(date, '2026-10'))).toHaveLength(31);
    expect(dateInMonth(weeks[0][0], '2026-10')).toBe(false);
    expect(weeks.every(week => week[0].getDay() === 0 && week.length === 7)).toBe(true);
  });
});
