import { describe, expect, it } from "vitest";
import { change, clientSnapshot, evolutionRange, monthRanges, previousRange, ratio, revenueSummary, salesSummary } from "./evolutionMetrics";
import type { Venda } from "@/hooks/useVendas";
import type { FechamentoDiario } from "@/hooks/useFechamentosDiarios";

describe("períodos executivos", () => {
  it("compara blocos completos de meses, incluindo fevereiro e virada de ano", () => {
    const r = evolutionRange("3", new Date(2026, 1, 25));
    expect(r).toEqual({start:"2025-12-01",end:"2026-02-28"});
    expect(previousRange(r)).toEqual({start:"2025-09-01",end:"2025-11-30"});
    expect(previousRange({start:"2024-03-01",end:"2024-03-31"})).toEqual({start:"2024-02-01",end:"2024-02-29"});
  });
  it("compara intervalos parciais pelo mesmo número de dias, sem sobreposição", () => {
    expect(previousRange({start:"2026-09-10",end:"2026-09-24"})).toEqual({start:"2026-08-26",end:"2026-09-09"});
    expect(monthRanges({start:"2026-08-15",end:"2026-09-10"})).toEqual([{start:"2026-08-15",end:"2026-08-31"},{start:"2026-09-01",end:"2026-09-10"}]);
  });
  it("não inventa percentuais sem denominador ou histórico", () => {
    expect(change(100,0)).toBeNull(); expect(change(0,100)).toBe(-100);
    expect(ratio(null,5)).toBeNull(); expect(ratio(100,0)).toBeNull(); expect(ratio(0,5)).toBe(0);
  });
});
it("agrupa itens da mesma compra e exclui cancelamentos", () => {
  const sale = {data:"2026-09-10",cliente:"Ana",vendedor:"Leo",valor:100,status:"pago"} as Venda;
  expect(salesSummary([sale,{...sale,valor:200},{...sale,status:"cancelada"}],{start:"2026-09-01",end:"2026-09-30"})).toMatchObject({count:1,value:300,ticket:300});
});
it("concilia categorias e total com pagamentos de vendas de outro mês", () => {
  const payment = {id:"payment-1",date:"2026-09-10",amount:800,netAmount:750,method:"PIX"};
  const line = `[PAGAMENTO_VENDA]${JSON.stringify(payment)}`;
  const closing = {data:"2026-08-01",valor_sinal:1000,valor_sinal_liquido:950,status:"pago",categoria:"Curso de Meta Ads",observacao:`${line}\n${line}`} as FechamentoDiario;
  const result = revenueSummary([], [closing, {...closing,status:"cancelado"}], {start:"2026-09-01",end:"2026-09-30"});
  expect(result.total).toBe(750); expect(result.courses).toBe(750); expect(Object.values(result.categories).reduce((a,b)=>a+b,0)).toBe(result.total);
});
it("MRR exclui TCV, permutas e pausados; início ausente não vira zero entradas", () => {
  const client = {id:"1",status:"Ativo",start_date:"2026-09-01",contract_value:1500,payment_status:"pago",notes:[]};
  const snapshot = clientSnapshot([client,{...client,id:"2",notes:[{id:"__contract_config__",text:'{"type":"TCV"}'}]},{...client,id:"3",payment_status:"permuta"},{...client,id:"4",status:"Pausado",start_date:null}], {start:"2026-09-01",end:"2026-09-30"});
  expect(snapshot.mrr).toBe(1500); expect(snapshot.active).toBe(3); expect(snapshot.joined).toBeNull(); expect(snapshot.recordedJoined).toBe(3);
  expect(clientSnapshot([{...client,contract_value:0}],{start:"2026-09-01",end:"2026-09-30"}).mrr).toBeNull();
});
