export interface TicketPrintData {
  lotteryName: string;
  ticketNumber: string;
  customerName?: string;
  customerPhone?: string;
  sellerName: string;
  price: number;
  drawDate: string;
  drawTime: string;
  issuedAt: string;
  prizes: Array<{ name: string; value: number; condition: string }>;
}

export function formatTicketForPrint(data: TicketPrintData): string {
  return `═══════════════════════════════
  BOLETO DE LOTERÍA
═══════════════════════════════
Lotería:    ${data.lotteryName}
Número:     ${data.ticketNumber}
Vendedor:   ${data.sellerName}
Cliente:    ${data.customerName || 'N/A'}
Teléfono:   ${data.customerPhone || 'N/A'}
Precio:     ${new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(data.price)}
Sorteo:     ${data.drawDate} ${data.drawTime}
Emitido:    ${data.issuedAt}
═══════════════════════════════
Gracias por su compra!
═══════════════════════════════`;
}

export function generateTicketHTML(data: TicketPrintData): string {
  return `<html><body style="font-family:monospace;padding:20px"><pre>${formatTicketForPrint(data)}</pre></body></html>`;
}
