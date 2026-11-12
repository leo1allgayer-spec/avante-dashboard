import { expect, it } from 'vitest';
import { selectedCallTotals } from '../../supabase/functions/_shared/crm-calls';
const lucas='826c0859-b246-43b7-9268-02b5cc38e777',allgayer='810891e4-e8cd-4987-8222-6280fbdeb155';
it('selects only Lucas and Allgayer by identity and preserves zero',()=>{
  expect(selectedCallTotals({data:[{user_id:lucas,name:'Novo nome',calls:14},{user_id:allgayer,calls:0},{user_id:'other',calls:500}]}).map(s=>s.calls)).toEqual([14,0]);
});
it('does not misrepresent missing or invalid CRM data as zero',()=>{
  expect(()=>selectedCallTotals({data:[]})).toThrow();
  expect(()=>selectedCallTotals({data:[{user_id:lucas,calls:-1},{user_id:allgayer,calls:0}]})).toThrow();
});
it('keeps answered, unanswered and unique people separate from attempts',()=>{
  const rows=selectedCallTotals({data:[{user_id:lucas,attempts:10,calls:10,answered:4,not_answered:6,unique_leads:5},{user_id:allgayer,calls:0,answered:0,not_answered:0,unique_leads:0}]});
  expect(rows[0]).toMatchObject({calls:10,answered:4,notAnswered:6,people:5,attemptsPerPerson:2});
  expect(rows[1]).toMatchObject({answered:0,people:0,attemptsPerPerson:0});
  expect(selectedCallTotals({data:[{user_id:lucas,calls:1},{user_id:allgayer,calls:0}]} )[0].people).toBeNull();
});

it('reads the official unique_people and decimal attempts_per_person fields',()=>{
 const rows=selectedCallTotals({data:[{user_id:lucas,attempts:10,unique_people:3,attempts_per_person:3.33},{user_id:allgayer,attempts:0,unique_people:0,attempts_per_person:0}]});
 expect(rows[0]).toMatchObject({people:3,attemptsPerPerson:3.33});
 expect(rows[1]).toMatchObject({people:0,attemptsPerPerson:0});
});
