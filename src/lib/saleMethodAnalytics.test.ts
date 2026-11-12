import { it, expect } from "vitest";
import type { Venda } from "@/hooks/useVendas";
import { saleMethodAnalytics } from "./saleMethodAnalytics";
const sale = (overrides: Partial<Venda> = {}) => ({id:"1",data:"2026-10-12",cliente:"Ana",vendedor:"Leo",status:"pendente",valor:100,forma_venda:"reuniao_na_hora",updated_at:"2026-10-12T12:00:00Z",...overrides}) as Venda;
it("groups items in the same sale, ignores cancellations and uses the selected sale period",()=>{
  const result = saleMethodAnalytics([sale(),sale({id:"2",valor:200}),sale({id:"3",cliente:"João",forma_venda:"reuniao_depois"}),sale({id:"4",cliente:"Lucas",forma_venda:"conversa"}),sale({id:"5",cliente:"Cancelada",status:"cancelada"}),sale({id:"6",data:"2026-09-12"})],"2026-10-01","2026-10-31");
  expect(result.total).toBe(3);
  expect(result.closedMeetings).toBe(2);
  expect(result.atMeeting).toBe(1);
  expect(result.afterMeeting).toBe(1);
  expect(result.meetingRevenue).toBe(400);
});
it("keeps missing and undefined meeting outcomes visible without inventing a meeting closing",()=>{
  const result = saleMethodAnalytics([sale({forma_venda:null}),sale({cliente:"João",forma_venda:"reuniao"})],"2026-10-12","2026-10-12");
  expect(result.total).toBe(2);
  expect(result.closedMeetings).toBe(0);
  expect(result.buckets.find(b=>b.key==="nao_informado")?.count).toBe(1);
});
