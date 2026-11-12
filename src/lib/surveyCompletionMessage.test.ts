import { beforeEach, expect, it, vi } from 'vitest';
const { send } = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock('../../supabase/functions/_shared/whatsapp-dispatch.ts', () => ({ sendWhatsAppOnce: send }));
import { courseCompletionMessage, processSurveyCompletionMessages } from '../../supabase/functions/_shared/survey-completion-message';
beforeEach(() => send.mockReset());
it('personalizes the requested message and keeps three months of support',()=>{
 expect(courseCompletionMessage(' Ana ')).toBe('🎓 Parabéns pela conclusão do curso, Ana! 🚀\n\nA *Avante Digital* agradece pela confiança. Lembre-se de que você ainda conta com *3 meses de suporte* para tirar suas dúvidas.\n\nDesejamos muito sucesso na sua jornada! 💜');
});
const fakeDb=(claimed:boolean)=>({from:vi.fn((table:string)=>{
 if(table==='survey_responses') return {select:()=>({eq:()=>({single:async()=>({data:{nome:'Ana',whatsapp:'51999990000',curso_realizado:'Curso Meta Ads'}})})})};
 if(table==='whatsapp_message_logs') return {insert:vi.fn().mockResolvedValue({})};
 const mutation:any={eq:()=>mutation,select:()=>mutation,maybeSingle:async()=>({data:claimed?{survey_id:'survey-id'}:null}),then:(resolve:any)=>Promise.resolve({}).then(resolve)};
 return {select:()=>({eq:()=>({order:()=>({limit:async()=>({data:[{survey_id:'survey-id'}]})})})}),update:()=>mutation};
})});
it('sends once for the claimed survey through the customer channel',async()=>{
 send.mockResolvedValue({accepted:true,deduplicated:false});
 expect(await processSurveyCompletionMessages(fakeDb(true))).toBe(1);
 expect(send).toHaveBeenCalledWith(expect.anything(),'5551999990000',courseCompletionMessage('Ana'),'customer','course_completion','survey-id');
});
it('does not send when another worker already claimed the survey',async()=>{
 expect(await processSurveyCompletionMessages(fakeDb(false))).toBe(0);
 expect(send).not.toHaveBeenCalled();
});
