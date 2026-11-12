export type CaptureRecurrence = { intervalDays: 7 | 15; until: string; seriesId?: string };

export function captureDates(start: string, recurrence?: CaptureRecurrence): string[] {
  const parse = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Informe uma data válida.");
    const date = new Date(`${value}T12:00:00Z`);
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new Error("Informe uma data válida.");
    return date;
  };
  const cursor = parse(start);
  if (!recurrence) return [start];
  const end = parse(recurrence.until);
  if (![7, 15].includes(recurrence.intervalDays) || end < cursor) throw new Error("A data final deve ser igual ou posterior à primeira captação.");
  const dates: string[] = [];
  while (cursor <= end) {
    if (dates.length >= 104) throw new Error("Use um período de até 104 captações por agendamento.");
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + recurrence.intervalDays);
  }
  return dates;
}
