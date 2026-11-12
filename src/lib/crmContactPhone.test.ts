import { describe, expect, it } from 'vitest';
import { crmContactPhone } from '../../supabase/functions/_shared/crm-contact';
import { customerMeetingRecipient } from '../../supabase/functions/_shared/meeting-customer';
describe('CRM customer reminder contact', () => {
  it('uses the lead phone even when the meeting already has its name', () => {
    const phone = crmContactPhone({lead_name:'Fernanda'}, [{phone:'(51) 99999-0000'}]);
    expect(customerMeetingRecipient({client_name:'Fernanda',client_phone:phone},[])).toEqual({name:'Fernanda',phone:'5551999990000'});
  });
  it('prefers the explicit meeting contact and respects disabled notifications', () => {
    expect(crmContactPhone({client_phone:'5551999990000'},[{phone:'5551988880000'}])).toBe('5551999990000');
    expect(customerMeetingRecipient({client_name:'Fernanda',client_phone:'5551999990000',notify_client:false},[])).toBeNull();
  });
  it('does not use unrelated owner phone or invent a missing number', () => {
    expect(crmContactPhone({owner:{phone:'5551999990000'}})).toBe('');
    expect(customerMeetingRecipient({client_name:'Fernanda',client_phone:''},[])).toBeNull();
  });
});
