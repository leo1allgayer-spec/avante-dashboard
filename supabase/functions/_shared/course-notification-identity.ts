export function courseNotificationIdentity(bookingId: string, date: string, time: string, course: string) {
  return JSON.stringify([bookingId, date, time, course.trim()]);
}
