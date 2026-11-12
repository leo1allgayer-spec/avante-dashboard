import { describe, expect, it } from 'vitest';
import { customerMeetingRecipient } from '../../supabase/functions/_shared/meeting-customer';
const meeting = {client_name:'Cliente',agenda_category:'reunioes',notify_client:true};
describe('meeting customer international contacts',()=>{
 it('keeps Portugal country code from CRM',()=>expect(customerMeetingRecipient({...meeting,client_phone:'351912345678'},[])?.phone).toBe('351912345678'));
 it('accepts explicitly international numbers and 00 prefix',()=>{
  expect(customerMeetingRecipient({...meeting,client_phone:'+351 912 345 678'},[])?.phone).toBe('351912345678');
  expect(customerMeetingRecipient({...meeting,client_phone:'00351 912 345 678'},[])?.phone).toBe('351912345678');
  expect(customerMeetingRecipient({...meeting,client_phone:'+1 202 555 0123'},[])?.phone).toBe('12025550123');
 });
 it('preserves Brazilian local and country-coded numbers',()=>{
  expect(customerMeetingRecipient({...meeting,client_phone:'51999990000'},[])?.phone).toBe('5551999990000');
  expect(customerMeetingRecipient({...meeting,client_phone:'5551999990000'},[])?.phone).toBe('5551999990000');
 });
 it('rejects invalid contacts and respects disabled notifications',()=>{
  expect(customerMeetingRecipient({...meeting,client_phone:'123'},[])).toBeNull();
  expect(customerMeetingRecipient({...meeting,client_phone:'+0123456789'},[])).toBeNull();
  expect(customerMeetingRecipient({...meeting,notify_client:false,client_phone:'351912345678'},[])).toBeNull();
 });
});
