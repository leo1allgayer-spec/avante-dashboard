export function supportNotificationExpired(
  type: string, scheduledFor: string, bookingDate: string, startTime: string, now = Date.now(),
) {
  const starts = Date.parse(`${bookingDate}T${startTime.slice(0, 8)}-03:00`);
  const scheduled = Date.parse(scheduledFor);
  const window = type.includes('reminder') ? 15 * 60_000 : 24 * 60 * 60_000;
  return !Number.isFinite(starts) || !Number.isFinite(scheduled)
    || now >= starts || now - scheduled > window;
}

// A network timeout or server failure after POST may mean the provider accepted
// the message. Only a definitive client rejection permits a manual retry.
export function definitiveSendRejection(status: number) {
  return [400, 401, 403, 404, 422, 429].includes(status);
}

export async function dispatchKey(phone: string, type: string, identity: string, text: string) {
  const bytes = new TextEncoder().encode(JSON.stringify([phone, type, identity, text]));
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
}
