import {expect,it} from 'vitest';
import {collectionCalculator} from './collectionCalculator';
import type {Venda} from '@/hooks/useVendas';
import type {FechamentoDiario} from '@/hooks/useFechamentosDiarios';
const net=(payment:string,profile:'opcao1'|'opcao2',stored=1000)=>{
 const sale={id:'sale',pagamento:payment,parcelas:'1x',produto:'Curso Meta Ads',cliente:'Teste',vendedor:'Teste'} as Venda;
 const closing={id:'closing',venda_id:'sale',data:'2026-10-30',cliente:'Teste',vendedor:'Teste',produto_servico:'Curso Meta Ads',valor_sinal:1000,valor_sinal_liquido:stored,pagamento_sinal:payment} as FechamentoDiario;
 return collectionCalculator([sale],'2026-10-30','2026-10-30',profile).getCollectedNetInPeriod(closing);
};
it('switches the configured Infinity and Link profiles',()=>{
 expect(net('Infinity (Visa/Master)','opcao1')).toBe(971.10);
 expect(net('Infinity (Visa/Master)','opcao2')).toBe(972.10);
 expect(net('Link Infinity','opcao1')).toBe(1000);
 expect(net('Link Infinity','opcao2')).toBe(958);
});
it('keeps PIX and previously saved net receipts unchanged',()=>{
 expect(net('PIX','opcao1')).toBe(1000);expect(net('PIX','opcao2')).toBe(1000);
 expect(net('Infinity (Visa/Master)','opcao1',950)).toBe(950);
 expect(net('Infinity (Visa/Master)','opcao2',950)).toBe(950);
});
it('recalculates saved net receipts with the selected profile when requested',()=>{
 const sale={id:'sale',pagamento:'Infinity (Visa/Master)',parcelas:'1x',produto:'Curso Meta Ads',cliente:'Teste',vendedor:'Teste'} as Venda;
 const closing={venda_id:'sale',data:'2026-10-30',valor_sinal:1000,valor_sinal_liquido:950,pagamento_sinal:'Infinity (Visa/Master)'} as FechamentoDiario;
 expect(collectionCalculator([sale],'2026-10-30','2026-10-30','opcao1',true).getCollectedNetInPeriod(closing)).toBe(971.10);
 expect(collectionCalculator([sale],'2026-10-30','2026-10-30','opcao2',true).getCollectedNetInPeriod(closing)).toBe(972.10);
 expect(closing.valor_sinal_liquido).toBe(950);
});
it('recalculates history by each payment date and method instead of the stored net amount',()=>{
 const sale={id:'sale',pagamento:'PIX',parcelas:'1x'} as Venda;
 const closing={venda_id:'sale',data:'2026-10-16',valor_sinal:1000,valor_sinal_liquido:950,pagamento_sinal:'PIX',observacao:'[PAGAMENTO_VENDA]'+JSON.stringify({id:'new',date:'2026-10-30',amount:600,netAmount:550,method:'Link Infinity'})} as FechamentoDiario;
 const calc=collectionCalculator([sale],'2026-10-30','2026-10-30','opcao2',true);
 expect(calc.getCollectedNetInPeriod(closing)).toBe(574.80);
 expect(calc.getFechamentoCollectedNet(closing)).toBe(974.80);
 expect(collectionCalculator([sale],'2026-10-16','2026-10-16','opcao2',true).getCollectedNetInPeriod(closing)).toBe(400);
});
