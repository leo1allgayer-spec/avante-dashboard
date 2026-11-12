import { describe, expect, it } from 'vitest';
import { crmModality } from '../../supabase/functions/_shared/crm-modality';
describe('CRM modality', () => {
  it('does not infer presencial from a generic meeting kind or missing field', () => {
    expect(crmModality({kind:'meeting'})).toBe('nao_informado');
    expect(crmModality({})).toBe('nao_informado');
  });
  it('recognizes explicit remote and in person meetings', () => {
    expect(crmModality({modality:'online',kind:'meeting'})).toBe('online');
    expect(crmModality({location_type:'Videoconferência'})).toBe('online');
    expect(crmModality({modality:'presencial'})).toBe('presencial');
  });
  it('recognizes CRM video call labels and explicit Portuguese modality fields',()=>{
    expect(crmModality({modality:'Videochamada',kind:'meeting'})).toBe('online');
    expect(crmModality({modalidade:'Vídeo chamada'})).toBe('online');
    expect(crmModality({meeting_modality:'video-call'})).toBe('online');
    expect(crmModality({modality:'Reunião comercial'})).toBe('nao_informado');
  });
});
