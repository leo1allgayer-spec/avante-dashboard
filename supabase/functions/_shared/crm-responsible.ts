export function crmResponsibleName(row: Record<string, unknown>): string {
  const named = (value: unknown) => typeof value === 'string' && value.trim() && !/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(value.trim()) ? value.trim() : '';
  for (const key of ['responsible_name','responsible_user_name','assigned_to_name','assignee_name','assigned_user_name','user_name','owner_name','professional_name']) {
    const name = named(row[key]);
    if (name) return name;
  }
  for (const key of ['responsible','assignee','assigned_to','assigned_user','user','owner','professional','agent','attendant']) {
    const value = row[key];
    if (value && typeof value === 'object') {
      const record = value as Record<string, unknown>;
      const name = named(record.full_name) || named(record.name);
      if (name) return name;
    }
    const direct = named(value);
    if (direct) return direct;
  }
  return '';
}
