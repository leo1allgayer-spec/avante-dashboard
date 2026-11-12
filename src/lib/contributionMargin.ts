type DeliveredCourseCost = {data:string;comissao_extra:number};
export function contributionMargin(netRevenue:number,courses:DeliveredCourseCost[],start:string,end:string) {
 const courseCosts = courses.filter(course=>course.data>=start && course.data<=end).reduce((sum,course)=>sum+Number(course.comissao_extra || 0),0);
 const taxes = netRevenue * 0.09;
 const salesCommission = netRevenue * 0.15;
 const margin = netRevenue-taxes-salesCommission-courseCosts;
 return {courseCosts,taxes,salesCommission,margin,percentage:netRevenue>0?margin/netRevenue*100:null};
}
