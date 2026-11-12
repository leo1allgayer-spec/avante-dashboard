import { expect, it } from 'vitest';
import { eligibleBookingConfirmation } from '../../supabase/functions/_shared/meeting-confirmation';
const start='2026-10-14T14:40:00Z';
const meeting={status:'pending',date:'2026-10-15',agenda_category:'reunioes',title:'Cliente',created_at:'2026-10-14T14:41:00Z'};
it('confirms new local and CRM bookings but does not announce historical imports',()=>{
  expect(eligibleBookingConfirmation(meeting,null,start,'2026-10-14')).toBe(true);
  expect(eligibleBookingConfirmation({...meeting,external_id:'crm'},{createdAt:'2026-10-14T14:41:00Z'},start,'2026-10-14')).toBe(true);
  expect(eligibleBookingConfirmation({...meeting,external_id:'crm'},{createdAt:'2026-10-01T12:00:00Z'},start,'2026-10-14')).toBe(false);
  expect(eligibleBookingConfirmation({...meeting,external_id:'crm'},null,start,'2026-10-14')).toBe(false);
});
it('does not confirm cancelled, past or internal meetings',()=>{
  for(const patch of [{status:'cancelled'},{date:'2026-10-13'},{title:'Reunião interna'},{agenda_category:'captacao'}]) expect(eligibleBookingConfirmation({...meeting,...patch},null,start,'2026-10-14')).toBe(false);
});
