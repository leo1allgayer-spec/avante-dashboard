import {it,expect} from 'vitest';
import {crmMeetingAgenda,localMeetingAgenda} from './crmMeetingAgenda';
it('only explicit sales meetings of Webster belong in Closer',()=>{
 expect(crmMeetingAgenda(' Leonardo  Webster ','reuniao_vendas')).toBe('reunioes');
 for(const type of ['ligacao','alinhamento']) expect(crmMeetingAgenda('Leonardo Webster',type)).toBe('geral');
 for(const name of ['Emanoel Bull','Lucas','Leonardo Allgayer','',undefined]) expect(crmMeetingAgenda(name,'reuniao_vendas')).toBe('geral');
 expect(localMeetingAgenda('reunioes','Leonardo Webster','reuniao')).toBe('geral');
 expect(localMeetingAgenda('geral','Leonardo Webster','reuniao_vendas')).toBe('reunioes');
 expect(localMeetingAgenda('captacao','Leonardo Webster','reuniao')).toBe('captacao');
 expect(localMeetingAgenda('social_media','Nicolas','reuniao')).toBe('social_media');
});

it('recognizes generic CRM meetings as commercial while keeping dashboard meetings general',()=>{
 for(const type of ['reuniao','reuniao_cliente','reuniao_vendas',undefined]) expect(crmMeetingAgenda('Leonardo webster',type)).toBe('reunioes');
 expect(localMeetingAgenda('reunioes','Leonardo Webster','reuniao')).toBe('geral');
 expect(crmMeetingAgenda('Emanoel Bull','reuniao')).toBe('geral');
});
