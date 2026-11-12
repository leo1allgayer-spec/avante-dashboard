import {expect,it} from 'vitest';
import {isMeetingClosingOnlyUpdate} from './meetingClosingUpdate';
import type {Meeting} from '@/types/clients/task';
const meeting={id:'one',title:'Cliente',date:'2026-10-16',time:'13:31',status:'completed',hasClosed:false,closingStatus:'pending',objection:''} as Meeting;
it('isolates closing changes from attendance and scheduling changes',()=>{
 expect(isMeetingClosingOnlyUpdate(meeting,{...meeting,hasClosed:true,closingStatus:'closed'})).toBe(true);
 expect(isMeetingClosingOnlyUpdate(meeting,{...meeting,closingStatus:'not_closed',objection:'Preço'})).toBe(true);
 expect(isMeetingClosingOnlyUpdate(meeting,{...meeting,time:'14:00',hasClosed:true})).toBe(false);
 expect(isMeetingClosingOnlyUpdate(meeting,{...meeting,status:'pending'})).toBe(false);
 expect(isMeetingClosingOnlyUpdate(undefined,meeting)).toBe(false);
});
