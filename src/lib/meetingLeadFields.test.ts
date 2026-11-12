import {expect,it} from 'vitest';
import {readMeetingLeadFields,writeMeetingLeadFields} from './meetingLeadFields';
import {meetingLeadSummary} from '../../supabase/functions/_shared/meeting-lead-summary';
it('round trips the four fields and observations without duplicates and sends the selected interest',()=>{
 const fields={partners:'Não',business:'Clínica',revenue:'R$ 30 mil',interest:'Curso e assessoria'};
 const notes=writeMeetingLeadFields('Trazer relatório',fields);
 expect(readMeetingLeadFields(notes)).toEqual({fields,notes:'Trazer relatório'});
 expect(writeMeetingLeadFields(notes,fields)).toBe(notes);
 const summary=meetingLeadSummary({has_partners:true,business_type:'Antigo',service_interest:'Curso'},notes);
 expect(summary).toContain('Sócios: Não');expect(summary).toContain('Tipo de negócio: Clínica');expect(summary).toContain('Interesse (curso/assessoria): Curso e assessoria');
});
it('preserves older observations, reads existing labels and leaves unknown answers empty',()=>{
 const parsed=readMeetingLeadFields('Observação livre\nSócios: Não informado\nTipo de negócio: Loja\nCurso ou assessoria: Curso');
 expect(parsed.fields.partners).toBe('');expect(parsed.fields.business).toBe('Loja');expect(parsed.fields.interest).toBe('Curso');expect(parsed.notes).toBe('Observação livre');
 expect(writeMeetingLeadFields('Observação livre',{partners:'',business:'',revenue:'',interest:''})).toBe('Observação livre');
});
