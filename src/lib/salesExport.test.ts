import { describe, expect, it } from 'vitest';
import { salesExportSummary, salesExportOrigins, salesWithPendingCommission, type SalesExportGroup } from './salesExport';
const group=(patch:Partial<SalesExportGroup>={}):SalesExportGroup=>({principal:{data:'2026-10-14',cliente:'Cliente'},valorTotal:1800,sinalBruto:400,coletadoPeriodo:390,aReceberPeriodo:1400,comissaoPendente:58.5,taxasMaquininhaPeriodo:10,...patch});

it('exports only pending commissions and totals only included sales', () => {
 const rows = salesWithPendingCommission([group(), group({comissaoPendente:0}), group({comissaoPendente:-1}), group({comissaoPendente:0.001}), group({comissaoPendente:0.01})]);
 expect(rows).toHaveLength(2);
 expect(salesExportSummary(rows).sold).toBe(3600);
 expect(salesExportSummary(rows).pendingCommission).toBe(58.51);
 expect(salesWithPendingCommission([group({comissaoPendente:0})])).toEqual([]);
});
describe('export totals match visible sales groups',()=>{
 it('uses computed pending commission and separates net collections from cumulative gross payments',()=>{
  expect(salesExportSummary([group()])).toEqual({sold:1800,collected:390,receivable:1400,pendingCommission:58.5,fees:10,grossPaid:400});
 });
 it('includes carried-over sales visible in the table',()=>{
  const old=group({principal:{data:'2026-08-01',cliente:'Anterior'},comissaoPendente:20,coletadoPeriodo:100});
  expect(salesExportSummary([group(),old]).pendingCommission).toBe(78.5);
  expect(salesExportSummary([group(),old]).collected).toBe(490);
 });
 it('returns zero totals for an empty selection',()=>expect(salesExportSummary([]).sold).toBe(0));
});

it('includes every distinct origin from a grouped sale, including missing origins',()=>{
 expect(salesExportOrigins([{origem:'Indicacao'},{origem:' Indicação '},{origem:'Anuncio'},{origem:''}])).toBe('Indicacao / Anuncio / Não informado');
 expect(salesExportOrigins([])).toBe('Não informado');
});
