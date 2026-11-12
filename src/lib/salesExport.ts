export type SalesExportGroup = {
 principal:{data:string;cliente:string};
 valorTotal:number;sinalBruto:number;coletadoPeriodo:number;aReceberPeriodo:number;
 comissaoPendente:number;taxasMaquininhaPeriodo:number;
};
export function salesWithPendingCommission<T extends { comissaoPendente: number }>(rows: T[]): T[] {
 return rows.filter(row => Number.isFinite(row.comissaoPendente) && Math.round(row.comissaoPendente * 100) > 0);
}
export function salesExportSummary(rows:SalesExportGroup[]) {
 return rows.reduce((sum,row)=>({
  sold:sum.sold+row.valorTotal,
  collected:sum.collected+row.coletadoPeriodo,
  receivable:sum.receivable+row.aReceberPeriodo,
  pendingCommission:sum.pendingCommission+row.comissaoPendente,
  fees:sum.fees+row.taxasMaquininhaPeriodo,
  grossPaid:sum.grossPaid+row.sinalBruto,
 }),{sold:0,collected:0,receivable:0,pendingCommission:0,fees:0,grossPaid:0});
}

export function salesExportOrigins(items:{origem?:string|null}[]) {
 const origins=new Map<string,string>();
 for(const item of items){
  const label=item.origem?.trim()||'Não informado';
  const key=label.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
  if(!origins.has(key))origins.set(key,label);
 }
 return [...origins.values()].join(' / ')||'Não informado';
}
