import { describe, expect, it } from 'vitest';
import type { Meeting } from '@/types/clients/task';
import { reconcileCrmMeetings } from './reconcileCrmMeetings';
const meeting = (fields: Partial<Meeting> = {}): Meeting => ({ id:'local', externalId:'crm-id', title:'Fernanda', date:'2026-10-14', time:'09:30', status:'pending', participants:[], description:'', outcome:null, origin:'CRM', service:'', modality:'presencial', hasClosed:false, ...fields });
const merge = (local: Meeting[], remote: Meeting[], complete = true, deleted = new Set<string>()) => reconcileCrmMeetings(local, remote, deleted, '2026-10-01', '2026-10-31', complete);
describe('CRM meeting reconciliation', () => {
  it('preserves confirmed closing and objection when CRM omits those fields',()=>{
    expect(merge([meeting({hasClosed:true,closingStatus:'closed'})],[meeting({hasClosed:false,closingStatus:'pending'})])[0]).toMatchObject({hasClosed:true,closingStatus:'closed'});
    expect(merge([meeting({hasClosed:false,closingStatus:'not_closed',objection:'Preço'})],[meeting({closingStatus:'pending'})])[0]).toMatchObject({closingStatus:'not_closed',objection:'Preço'});
  });
  it('updates explicit modality and preserves a local choice when CRM omits it', () => {
    expect(merge([meeting()],[meeting({modality:'online'})])[0].modality).toBe('online');
    expect(merge([meeting({modality:'online'})],[meeting({modality:'nao_informado'})])[0].modality).toBe('online');
  });
  it('moves a removed pending meeting out of the calendar after a complete query', () => expect(merge([meeting()],[])[0].status).toBe('cancelled'));
  it('does not cancel missing meetings on incomplete queries, outside the range, or local-only records', () => {
    expect(merge([meeting()],[],false)[0].status).toBe('pending');
    expect(merge([meeting({date:'2026-09-30'})],[])[0].status).toBe('pending');
    expect(merge([meeting({externalId:undefined})],[])[0].status).toBe('pending');
  });
  it('uses CRM time and cancellation even when a local reminder copy exists', () => {
    const result = merge([meeting()],[meeting({id:'crm:crm-id',time:'15:40',status:'cancelled'})]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({id:'local',time:'15:40',status:'cancelled'});
  });
  it('hides both local and remote copies after dashboard deletion', () => expect(merge([meeting()],[meeting({id:'crm:crm-id'})],true,new Set(['crm-id']))).toEqual([]));
  it('preserves completed history and unrelated meetings', () => expect(merge([meeting({status:'completed'})],[])[0].status).toBe('completed'));
});
