import { escapeHtml, printHTMLDocument } from './ticket-print';

export interface ReportRow {
  lottery_id?: string;
  lottery_name?: string;
  seller_id?: string;
  seller_name?: string;
  tickets_sold: number;
  revenue: number;
}

export interface ReportSummary {
  total_sales: number;
  total_tickets: number;
  total_revenue: number;
  by_lottery: ReportRow[];
  by_seller: ReportRow[];
}

function money(value: number | null | undefined): string {
  return `RD$${Number(value || 0).toFixed(2)}`;
}

export function buildReportHTML(summary: ReportSummary): string {
  const now = new Date().toLocaleString('es-DO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const lotteryRows = (summary.by_lottery || [])
    .map(
      (r) => `<tr><td>${escapeHtml(r.lottery_name)}</td><td class="num">${r.tickets_sold}</td><td class="num">${money(r.revenue)}</td></tr>`
    )
    .join('');

  const sellerRows = (summary.by_seller || [])
    .map(
      (r) => `<tr><td>${escapeHtml(r.seller_name)}</td><td class="num">${r.tickets_sold}</td><td class="num">${money(r.revenue)}</td></tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #000; margin: 8mm; }
  h1 { text-align: center; font-size: 18px; margin: 0 0 2mm; }
  .meta { text-align: center; margin-bottom: 5mm; color: #333; }
  .totals { display: flex; gap: 4mm; margin-bottom: 5mm; }
  .total-box { flex: 1; border: 1px solid #000; padding: 3mm; text-align: center; }
  .total-box .label { font-size: 11px; color: #333; }
  .total-box .value { font-size: 17px; font-weight: bold; }
  h2 { font-size: 14px; margin: 5mm 0 2mm; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #000; padding: 2mm; text-align: left; }
  th { background: #eee; }
  td.num, th.num { text-align: right; }
</style>
</head>
<body>
  <h1>REPORTE DE VENTAS</h1>
  <div class="meta">Generado: ${escapeHtml(now)}</div>
  <div class="totals">
    <div class="total-box"><div class="label">Boletos vendidos</div><div class="value">${summary.total_tickets || 0}</div></div>
    <div class="total-box"><div class="label">Ingresos totales</div><div class="value">${money(summary.total_revenue)}</div></div>
  </div>
  <h2>Por loter&iacute;a</h2>
  <table>
    <thead><tr><th>Loter&iacute;a</th><th class="num">Boletos</th><th class="num">Ingresos</th></tr></thead>
    <tbody>${lotteryRows}</tbody>
  </table>
  <h2>Por vendedor</h2>
  <table>
    <thead><tr><th>Vendedor</th><th class="num">Boletos</th><th class="num">Ingresos</th></tr></thead>
    <tbody>${sellerRows}</tbody>
  </table>
</body>
</html>`;
}

export function printReport(summary: ReportSummary): void {
  printHTMLDocument(buildReportHTML(summary));
}
