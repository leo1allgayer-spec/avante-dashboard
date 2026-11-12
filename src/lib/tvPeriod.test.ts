import {expect,it} from 'vitest';
import {tvPeriodRange,tvRangeDays} from './tvPeriod';
it('includes today and exactly seven or fifteen dates across month and year boundaries',()=>{
 const today=new Date(2026,0,3,10);
 expect(tvPeriodRange('day',today)).toMatchObject({start:'2026-01-03',end:'2026-01-03'});
 expect(tvPeriodRange('week',today)).toMatchObject({start:'2025-12-28',end:'2026-01-03'});
 expect(tvPeriodRange('fortnight',today)).toMatchObject({start:'2025-12-20',end:'2026-01-03'});
 for(const [period,count] of [['day',1],['week',7],['fortnight',15]] as const){const r=tvPeriodRange(period,today);expect(tvRangeDays(r.start,r.end)).toHaveLength(count);}
});
it('preserves the full calendar month and seven-day chart in monthly view',()=>{
 expect(tvPeriodRange('month',new Date(2028,1,5))).toMatchObject({start:'2028-02-01',end:'2028-02-29',chartStart:'2028-01-30'});
});
