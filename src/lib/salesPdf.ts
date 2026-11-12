import { jsPDF } from 'jspdf';
import { salesExportOrigins, salesExportSummary, type SalesExportGroup } from './salesExport';

type PdfSale = SalesExportGroup & { itens: { origem?: string | null }[] };
const date = (value: string) => value.split('-').reverse().join('/');
const money = (value: number) => value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Uses the same visible groups and financial totals as the spreadsheet export. */
export function createSalesPdf(rows: PdfSale[], start: string, end: string, rate: string) {
  const doc = new jsPDF({ orientation: 'landscape', format: 'a4' });
  const widths = [20, 45, 31, 29, 31, 30, 30, 29, 28];
  const headers = ['Data da venda', 'Cliente', 'Origem da venda', 'Vendido', 'Coletado líquido no período', 'A receber no período', 'Comissão pendente', 'Taxas no período', 'Pago bruto acumulado'];
  let y = 0;
  const drawRow = (cells: string[], kind: 'head' | 'body' | 'total') => {
    doc.setFont('helvetica', kind === 'body' ? 'normal' : 'bold');
    doc.setFontSize(8);
    const lines = cells.map((cell, i) => doc.splitTextToSize(cell, widths[i] - 4) as string[]);
    const height = Math.max(10, ...lines.map(line => line.length * 3.5 + 5));
    if (y + height > 191 && kind !== 'head') newPage();
    doc.setFont('helvetica', kind === 'body' ? 'normal' : 'bold');
    let x = 12;
    cells.forEach((_, i) => {
      doc.setFillColor(...(kind === 'head' ? [30, 41, 59] : kind === 'total' ? [226, 232, 240] : [248, 250, 252]) as [number, number, number]);
      doc.setDrawColor(215, 220, 228);
      doc.rect(x, y, widths[i], height, 'FD');
      doc.setTextColor(kind === 'head' ? 255 : 25);
      const right = i >= 3;
      doc.text(lines[i], right ? x + widths[i] - 2 : x + 2, y + 4.5, { align: right ? 'right' : 'left' });
      x += widths[i];
    });
    y += height;
  };
  const newPage = () => {
    if (y) doc.addPage();
    doc.setTextColor(25); doc.setFont('helvetica', 'bold'); doc.setFontSize(16);
    doc.text('Avante Digital | Relatório de vendas', 12, 15);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    doc.text(`${date(start)} a ${date(end)} | ${rows.length} registros | Tabela de taxas: ${rate}`, 12, 22);
    doc.setFontSize(8);
    doc.text('Valores em R$. Apenas vendas com comissão pendente, respeitando os filtros da tabela.', 12, 28);
    y = 33; drawRow(headers, 'head');
  };
  newPage();
  rows.forEach(row => drawRow([date(row.principal.data), row.principal.cliente, salesExportOrigins(row.itens), ...[row.valorTotal, row.coletadoPeriodo, row.aReceberPeriodo, row.comissaoPendente, row.taxasMaquininhaPeriodo, row.sinalBruto].map(money)], 'body'));
  const total = salesExportSummary(rows);
  drawRow(['', 'TOTAL', '', ...[total.sold, total.collected, total.receivable, total.pendingCommission, total.fees, total.grossPaid].map(money)], 'total');
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page); doc.setTextColor(90); doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    doc.text('Coletado líquido: recebimentos do período. Pago bruto: acumulado da venda. Comissão pendente: sobre valores recebidos.', 12, 198);
    doc.text(`Página ${page} de ${pages}`, 285, 204, { align: 'right' });
  }
  return doc;
}
