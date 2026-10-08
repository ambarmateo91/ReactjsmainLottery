export interface ReceiptTicket {
  ticketNumber: string;
  lotteryName: string;
  playType: string;
  numbers: string;
  amount: number;
  sellerName: string;
  soldAt?: string;
  drawDate?: string;
  drawTime?: string;
}

export function escapeHtml(value: string | number | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function capitalize(value: string): string {
  const v = value.trim().toLowerCase();
  return v.charAt(0).toUpperCase() + v.slice(1);
}

export function longDate(iso?: string): string {
  try {
    return new Date(iso || Date.now()).toLocaleDateString('es-DO', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

export function formatDrawTime(value?: string | null): string {
  if (!value) return '';
  const parts = String(value).split(':');
  if (parts.length < 2) return String(value);
  let h = Number(parts[0]);
  const m = parts[1];
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ap}`;
}

export function formatEmision(iso?: string): string {
  try {
    return new Date(iso || Date.now()).toLocaleString('es-DO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  } catch {
    return '';
  }
}

export function buildReceiptHTML(items: ReceiptTicket[]): string {
  const tickets = items
    .map((t) => {
      const playLabel = t.playType ? capitalize(t.playType) : '';
      const drawTime = formatDrawTime(t.drawTime);
      return `
      <div class="ticket">
        <div class="box">
          <div class="title">LOTERIA - ${escapeHtml(t.lotteryName)}</div>
          <div class="dash"></div>
          <div class="row"><span>Ticket:</span><span>${escapeHtml(t.ticketNumber)}</span></div>
          <div class="row"><span>Loter&iacute;a:</span><span>${escapeHtml(t.lotteryName)}</span></div>
          <div class="row"><span>Tipo:</span><span>${escapeHtml(playLabel)}</span></div>
          <div class="dash"></div>
          <div class="row"><span>N&uacute;meros:</span><span></span></div>
          <div class="numbers"><span>${escapeHtml(t.numbers)}</span></div>
          <div class="dash"></div>
          <div class="row amount"><span>Monto:</span><span>RD$${Number(t.amount || 0).toFixed(2)}</span></div>
          <div class="solid"></div>
          <div class="valid">V&aacute;lido para:</div>
          <div class="valid-date">${escapeHtml(longDate(t.drawDate))}</div>
          <div class="valid-line">${escapeHtml(t.lotteryName)}${drawTime ? ` - ${escapeHtml(drawTime)}` : ''}</div>
          <div class="dash"></div>
          <div class="emision-label">Fecha emisi&oacute;n:</div>
          <div class="emision">${escapeHtml(formatEmision(t.soldAt))}</div>
          <div class="solid"></div>
          <div class="luck">Revise su Ticket<br />&iexcl;BUENA SUERTE!</div>
        </div>
        <div class="foot">*** TICKET V&Aacute;LIDO ***</div>
      </div>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<style>
  @page { size: 80mm auto; margin: 0; }
  * { box-sizing: border-box; }
  body { width: 76mm; margin: 0 auto; padding: 3mm 2mm; font-family: 'Courier New', monospace; font-size: 12px; color: #000; background: #fff; }
  .ticket { page-break-after: always; padding-bottom: 5mm; }
  .ticket:last-child { page-break-after: auto; }
  .box { border: 2px solid #000; padding: 3mm; }
  .title { text-align: center; font-size: 16px; font-weight: bold; letter-spacing: 2px; margin-bottom: 2mm; }
  .dash { border-top: 1px dashed #000; margin: 2mm 0; }
  .solid { border-top: 2px solid #000; margin: 2mm 0; }
  .row { display: flex; justify-content: space-between; margin: 1mm 0; }
  .row.amount { font-size: 14px; font-weight: bold; justify-content: space-between; }
  .row.amount span:last-child { text-align: right; }
  .numbers { text-align: center; margin: 2mm 0; }
  .numbers span { display: inline-block; background: #000; color: #fff; font-size: 24px; font-weight: bold; padding: 2mm 6mm; letter-spacing: 2px; }
  .valid { text-align: center; font-weight: bold; font-size: 14px; }
  .valid-date, .valid-line { text-align: center; margin: 1mm 0; }
  .valid-line { font-weight: bold; font-size: 13px; }
  .emision-label, .emision { text-align: center; }
  .emision { margin-bottom: 1mm; }
  .luck { text-align: center; font-weight: bold; font-size: 13px; line-height: 1.6; }
  .foot { text-align: center; letter-spacing: 2px; margin-top: 2mm; font-size: 12px; }
</style>
</head>
<body>${tickets}</body>
</html>`;
}

export function printHTMLDocument(html: string): void {
  if (!html) return;
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) {
    iframe.remove();
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();

  window.setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch {
      // ignore
    }
    window.setTimeout(() => iframe.remove(), 2000);
  }, 300);
}

export function autoPrintTickets(items: ReceiptTicket[]): void {
  if (items.length === 0) return;
  printHTMLDocument(buildReceiptHTML(items));
}
