import { expect, it } from "vitest";
import { analyticsRange, localTimestampDate } from "./analyticsPeriods";
import { annualForecast } from "./annualForecast";
import { creativePerformance } from "./creativePerformance";
import { clientChurn } from "./clientChurn";
import { businessCrossMetrics } from "./businessCrossMetrics";
import type { Client } from "@/types/clients/client";
import type { Venda } from "@/hooks/useVendas";
it("filtra semana segunda-domingo, ano bissexto e horário de Brasília",()=>{
 expect(analyticsRange("week","2026-01-04")).toEqual({start:"2025-12-29",end:"2026-01-04"});
 expect(analyticsRange("month","2024-02-15")?.end).toBe("2024-02-29");
 expect(analyticsRange("year","2026-09-30")).toEqual({start:"2026-01-01",end:"2026-12-31"});
 expect(localTimestampDate("2026-09-01T01:00:00Z")).toBe("2026-08-31");
 expect(analyticsRange("all","2026-09-30")).toBeNull();
});
it("projeta usando meses completos e não o mês parcial",()=>{
 const r=annualForecast([100,200,300,900,0,0,0,0,0,0,0,0],2026,new Date(2026,3,10));
 expect(r.monthlyRunRate).toBe(200); expect(r.forecast).toBe(2400);
 expect(annualForecast([100],2026,new Date(2026,1,1)).forecast).toBeNull();
 expect(annualForecast(Array(12).fill(100),2025,new Date(2026,1,1)).forecast).toBe(1200);
});
it("calcula métricas de vídeo sem tratar campos ausentes como zero",()=>{
 const row={ad_id:"1",ad_name:"Ad",campaign_id:"1",campaign_name:"Camp",impressions:"1000",clicks:"50",spend:"100",actions:[{action_type:"video_view",value:"300"}],video_thruplay_watched_actions:[{action_type:"video_view",value:"150"}],video_p25_watched_actions:[{action_type:"video_view",value:"200"}],video_p50_watched_actions:[{action_type:"video_view",value:"100"}]};
 expect(creativePerformance(row)).toMatchObject({ctr:5,hook:30,hold:50,body:50,cpc:2,completion:null});
 expect(creativePerformance({...row,actions:undefined}).hook).toBeNull();
 expect(creativePerformance({...row,impressions:"0"}).ctr).toBeNull();
});
it("churn usa somente perdas da carteira de abertura e não pausas ou intenção",()=>{
 const base={startDate:"2026-01-01",contractLifecycle:"vigente",status:"Pausado",contractRenewal:"nao"} as Client;
 const range={start:"2026-09-01",end:"2026-09-30"};
 const rows=[base,{...base,contractLifecycle:"encerrado",contractEndDate:"2026-09-10"},{...base,startDate:"2026-09-05",contractLifecycle:"encerrado",contractEndDate:"2026-09-12"}] as Client[];
 expect(clientChurn(rows,range)).toMatchObject({rate:50,opening:2,closed:2});
 expect(clientChurn([...rows,{...base,contractLifecycle:"nao_informado"}],range).rate).toBeNull();
});
it("recompra cruza compras anteriores excluindo vendas canceladas",()=>{
 const sale={id:"1",data:"2026-08-01",cliente:"Ana",vendedor:"Leo",status:"pago",valor:100,produto:"Curso de Meta Ads",servico:""} as Venda;
 const result=businessCrossMetrics([sale,{...sale,id:"2",data:"2026-09-05"},{...sale,id:"3",cliente:"João",data:"2026-09-05"},{...sale,id:"4",cliente:"João",status:"cancelada"}],[],{start:"2026-09-01",end:"2026-09-30"});
 expect(result).toMatchObject({repeat:1,firstObserved:1,repeatRate:50,top5Share:null});
});
