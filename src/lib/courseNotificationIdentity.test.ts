import { expect, it } from 'vitest';
import { courseNotificationIdentity } from '../../supabase/functions/_shared/course-notification-identity';
it('allows updated course notices at the same time while deduplicating retries', () => {
 const online = courseNotificationIdentity('booking', '2026-11-11', '14:00', 'Curso Meta Ads Online');
 const presencial = courseNotificationIdentity('booking', '2026-11-11', '14:00', 'Curso Meta Ads');
 expect(online).not.toBe(presencial);
 expect(presencial).toBe(courseNotificationIdentity('booking', '2026-11-11', '14:00', 'Curso Meta Ads'));
 expect(presencial).not.toBe(courseNotificationIdentity('booking', '2026-11-12', '14:00', 'Curso Meta Ads'));
});
