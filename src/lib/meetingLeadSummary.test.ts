import { expect, it, vi } from 'vitest';
import { meetingLeadSummary, loadMeetingLeadSummary } from '../../supabase/functions/_shared/meeting-lead-summary';
it('keeps explicit no and zero answers and includes only available CRM qualification values',()=>{
 const result=meetingLeadSummary({has_partners:false,business_type:'Clínica veterinária',monthly_revenue:0,service_interest:'Assessoria'});
 expect(result).toContain('Sócios: Não');expect(result).toContain('Tipo de negócio: Clínica veterinária');expect(result).toContain('Faturamento: 0');expect(result).toContain('Interesse (curso/assessoria): Assessoria');
 expect(result).not.toContain('Não informado');
});
it('understands labeled custom fields and explicitly missing values',()=>{
 const result=meetingLeadSummary({custom_fields:[{label:'Tem sócio?',value:'Sim'},{field_name:'Tipo de negócio',value:'Loja'}]},'Faturamento: R$ 50 mil\nCurso ou assessoria: Curso');
 expect(result).toContain('Sócios: Sim');expect(result).toContain('Tipo de negócio: Loja');expect(result).toContain('Faturamento: R$ 50 mil');expect(result).toContain('Interesse (curso/assessoria): Curso');
 expect(meetingLeadSummary({})).toContain('Sócios: Não informado');
});
it('fetches only the linked lead and fails without blocking the booking notification',async()=>{
 const request=vi.fn().mockResolvedValue({ok:true,json:async()=>({data:{has_partners:true}})});
 expect(await loadMeetingLeadSummary('linked-id','test-key',request)).toEqual({has_partners:true});
 expect(request.mock.calls[0][0]).toBe('https://crm.solairew.com.br/api/v1/leads/linked-id');
 request.mockRejectedValue(new Error('timeout'));
 expect(await loadMeetingLeadSummary('linked-id','test-key',request)).toEqual({});
 expect(await loadMeetingLeadSummary('',undefined,request)).toEqual({});
});
