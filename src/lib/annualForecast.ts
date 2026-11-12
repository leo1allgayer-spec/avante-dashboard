export function annualForecast(revenueByMonth:number[],year:number,today=new Date()) {
 const completed=year<today.getFullYear()?12:year>today.getFullYear()?0:today.getMonth();
 const actual=revenueByMonth.reduce((s,n)=>s+n,0);
 const completedTotal=revenueByMonth.slice(0,completed).reduce((s,n)=>s+n,0);
 const recent=revenueByMonth.slice(Math.max(0,completed-3),completed);
 // Require at least three closed months and activity in that window, not a partial month extrapolation.
 const monthlyRunRate=completed>=3 && recent.some(n=>n>0)?recent.reduce((s,n)=>s+n,0)/recent.length:null;
 const forecast=year<today.getFullYear()?actual:year>today.getFullYear()||monthlyRunRate==null?null:Math.max(actual,completedTotal+monthlyRunRate*(12-completed));
 return {completed,actual,completedTotal,monthlyRunRate,forecast};
}
