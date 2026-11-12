export function crmContactPhone(row: Record<string, unknown>, related: Record<string, unknown>[] = []): string {
  for (const contact of [row, ...related]) {
    for (const key of ['client_phone', 'lead_phone', 'contact_phone', 'customer_phone', 'phone', 'phone_number', 'mobile', 'whatsapp', 'telefone']) {
      const value = contact[key];
      if (typeof value === 'string' && value.trim()) return value.trim();
    }
  }
  return '';
}
