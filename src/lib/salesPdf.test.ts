import { describe, expect, it } from 'vitest';
import { createSalesPdf } from './salesPdf';

describe('sales PDF', () => {
  it('paginates a full table and repeats its headings without dropping clients or totals', () => {
    const rows = Array.from({ length: 90 }, (_, index) => ({
      principal: { data: '2026-10-30', cliente: `Cliente ${index} com nome completo para conferir a quebra de linhas` },
      itens: [{ origem: 'Indicação' }, { origem: 'Anuncio' }], valorTotal: 1000,
      coletadoPeriodo: 490, aReceberPeriodo: 500, comissaoPendente: 73.5,
      taxasMaquininhaPeriodo: 10, sinalBruto: 500,
    }));
    const doc = createSalesPdf(rows, '2026-10-01', '2026-10-31', '40/80');
    expect(doc.getNumberOfPages()).toBeGreaterThan(2);
    const pdf = doc.output();
    expect(pdf).toContain('Cliente 89');
    expect(pdf).toContain('90.000,00');
    expect(pdf.match(/Avante Digital/g)?.length).toBe(doc.getNumberOfPages());
    expect(pdf).toContain('40/80');
  });
});
