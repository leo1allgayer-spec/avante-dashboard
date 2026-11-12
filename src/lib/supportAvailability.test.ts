import {expect,it} from 'vitest';
import {supportCapacity,supportPeriod,supportTimeRange} from './supportAvailability';
it('generates a configurable inclusive range without rolling over into another day',()=>{
 expect(supportTimeRange('08:30','11:30',60)).toEqual(['08:30','09:30','10:30','11:30']);
 expect(supportTimeRange('13:00','16:30',90)).toEqual(['13:00','14:30','16:00']);
 expect(supportTimeRange('23:45','23:59',15)).toEqual(['23:45']);
 expect(supportTimeRange('10:00','10:00',60)).toEqual(['10:00']);
});
it('rejects invalid inputs before any batch is saved',()=>{
 for(const args of [['12:00','08:00',60],['24:00','24:00',60],['08:60','09:00',60],['08:00','09:00',0]] as const)expect(()=>supportTimeRange(args[0],args[1],args[2])).toThrow();
 for(const n of ['',0,1.5,51,'abc'])expect(()=>supportCapacity(n)).toThrow();
 expect(supportCapacity('3')).toBe(3);
});
it('groups starts by morning, afternoon and evening',()=>{
 expect(['11:59','12:00','18:00'].map(supportPeriod)).toEqual(['Manhã','Tarde','Noite']);
});
