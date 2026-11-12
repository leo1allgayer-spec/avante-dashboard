import {describe,it,expect} from "vitest";
import {rollMonthlyArrears} from "./clientMonthlyArrears";
const base = {billingMonth:"2026-10",monthlyContractValue:1500,paymentStatus:"a receber" as const,status:"Ativo" as const};
describe("monthly arrears",()=>{
  it("preserves partial unpaid previous months once across year rollover",()=>{
    const rolled=rollMonthlyArrears({...base,receivedMonth:"2026-10",monthlyReceived:500},"2027-01");
    expect(rolled.overduePayments).toEqual([{month:"2026-10",amount:1000},{month:"2026-11",amount:1500},{month:"2026-12",amount:1500}]);
    expect(rollMonthlyArrears({...base,...rolled},"2027-01")).toEqual(rolled);
  });
  it("does not charge paid, paused, settled or barter months",()=>{
    expect(rollMonthlyArrears({...base,paidMonth:"2026-10"},"2026-11").overduePayments).toEqual([]);
    expect(rollMonthlyArrears({...base,status:"Pausado"},"2026-11").overduePayments).toEqual([]);
    expect(rollMonthlyArrears({...base,contractSettled:true},"2026-11").overduePayments).toEqual([]);
    expect(rollMonthlyArrears({...base,paymentStatus:"permuta"},"2026-11").overduePayments).toEqual([]);
  });
  it("starts now for legacy records and keeps old debts when current month is paid",()=>{
    expect(rollMonthlyArrears({...base,billingMonth:undefined},"2026-11").overduePayments).toEqual([]);
    expect(rollMonthlyArrears({...base,billingMonth:"2026-11",paidMonth:"2026-11",overduePayments:[{month:"2026-10",amount:1500}]},"2026-11").overduePayments).toHaveLength(1);
  });
});
