import {addDays,eachDayOfInterval,endOfMonth,format,startOfMonth} from 'date-fns';
export type TVPeriod = 'day' | 'week' | 'fortnight' | 'month';
export const TV_PERIODS: {value: TVPeriod; label: string}[] = [{value:'day',label:'Dia'},{value:'week',label:'Semana'},{value:'fortnight',label:'Quinzena'},{value:'month',label:'Mês'}];
export function tvPeriodRange(period:TVPeriod, today:Date) {
 const start=period==='month'?startOfMonth(today):addDays(today,period==='week'?-6:period==='fortnight'?-14:0);
 const end=period==='month'?endOfMonth(today):today;
 return {start:format(start,'yyyy-MM-dd'),end:format(end,'yyyy-MM-dd'),chartStart:format(period==='month'?addDays(today,-6):start,'yyyy-MM-dd'),label:TV_PERIODS.find(p=>p.value===period)!.label};
}
export function tvRangeDays(start:string,end:string) {return eachDayOfInterval({start:new Date(start+'T12:00:00'),end:new Date(end+'T12:00:00')});}
