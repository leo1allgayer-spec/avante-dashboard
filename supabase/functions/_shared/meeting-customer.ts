type CustomerMeeting = { client_name?: string; client_phone?: string; notify_client?: boolean; agenda_category?: string; meeting_type?: string; origin?: string };
type ClientContact = { id: string; name: string; notes?: Array<{ id: string; text: string }> };

export function customerMeetingRecipient(meeting: CustomerMeeting, clients: ClientContact[]) {
  if (meeting.notify_client === false || !meeting.client_name?.trim()
    || ((meeting.agenda_category || "reunioes") !== "reunioes" && !(meeting.agenda_category === 'geral' && meeting.origin === 'CRM'))) return null;
  const normalize = (name: string) => name.trim().toLowerCase().replace(/\s+/g, " ");
  let rawPhone = meeting.client_phone?.trim() || "";
  if (!rawPhone) {
    const matches = clients.filter(client => normalize(client.name) === normalize(meeting.client_name!));
    if (matches.length !== 1) return null;
    try {
      const note = matches[0].notes?.find(note => note.id === "__client_profile__");
      rawPhone = note ? String(JSON.parse(note.text).phone || "") : "";
    } catch { return null; }
  }
  let phone = rawPhone.replace(/\D/g, "");
  // Local Brazilian contacts omit the country code. CRM contacts can already
  // carry an international country code (for example Portugal's 351).
  const explicitInternational = rawPhone.startsWith('+') || rawPhone.startsWith('00');
  if (rawPhone.startsWith('00')) phone = phone.slice(2);
  if (!explicitInternational && (phone.length === 10 || phone.length === 11)) phone = "55" + phone;
  if (!/^[1-9][0-9]{7,14}$/.test(phone)) return null;
  return { name: meeting.client_name.trim(), phone };
}
