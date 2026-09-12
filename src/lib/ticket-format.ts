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
  prizes: Array<{
    name: string;
    value: number;
    condition: string;
  }>;
}

export function formatTicketForPrint(data: TicketPrintData): string {
  const lines: string[] = [];
  const width = 42;

  const center = (text: string) => text.padStart((width + text.length) / 2).padEnd(width);
  const leftRight = (left: string, right: string) => left + ' '.repeat(width - left.length - right.length) + right;

  lines.push('='.repeat(width));
  lines.push(center('SISTEMA DE LOTERÍA'));
  lines.push('='.repeat(width));
  lines.push('');
  lines.push(center(data.lotteryName.toUpperCase()));
  lines.push('');
  lines.push('-'.repeat(width));
  lines.push(leftRight(`Ticket: ${data.ticketNumber}`, `Precio: ${new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(data.price)}`));
  lines.push(leftRight(`Vendedor: ${data.sellerName}`, `Fecha: ${new Date(data.issuedAt).toLocaleDateString('es-ES')}`));
  if (data.customerName) lines.push(leftRight(`Cliente: ${data.customerName}`, `Tel: ${data.customerPhone || 'N/A'}`));
  lines.push('-'.repeat(width));
  lines.push(leftRight(`Sorteo: ${new Date(data.drawDate).toLocaleDateString('es-ES')}`, `Hora: ${data.drawTime}`));
  lines.push('-'.repeat(width));
  lines.push(center('PREMIOS'));
  lines.push('-'.repeat(width));
  
  data.prizes.forEach((prize) => {
    lines.push(leftRight(`${prize.name}: ${prize.condition}`, new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(prize.value)));
  });
  
  lines.push('-'.repeat(width));
  lines.push(center('¡BUENA SUERTE!'));
  lines.push('='.repeat(width));
  
  return lines.join('\n');
}

export function generateTicketHTML(data: TicketPrintData): string {
  return `
    <div style="width: 300px; font-family: monospace; font-size: 12px; padding: 20px; border: 1px solid #000;">
      <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 10px;">
        <h2 style="margin: 0;">SISTEMA DE LOTERÍA</h2>
        <h3 style="margin: 5px 0;">${data.lotteryName}</h3>
      </div>
      <div style="display: flex; justify-content: space-between; margin: 5px 0;">
        <span>Ticket: ${data.ticketNumber}</span>
        <span>${new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(data.price)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin: 5px 0;">
        <span>Vendedor: ${data.sellerName}</span>
        <span>${new Date(data.issuedAt).toLocaleDateString('es-ES')}</span>
      </div>
      ${data.customerName ? `
      <div style="display: flex; justify-content: space-between; margin: 5px 0;">
        <span>Cliente: ${data.customerName}</span>
        <span>Tel: ${data.customerPhone || 'N/A'}</span>
      </div>` : ''}
      <hr style="margin: 10px 0;">
      <div style="display: flex; justify-content: space-between; margin: 5px 0;">
        <span>Sorteo: ${new Date(data.drawDate).toLocaleDateString('es-ES')}</span>
        <span>Hora: ${data.drawTime}</span>
      </div>
      <hr style="margin: 10px 0;">
      <div style="text-align: center; margin: 10px 0;">
        <strong>PREMIOS</strong>
      </div>
      ${data.prizes.map(prize => `
      <div style="display: flex; justify-content: space-between; margin: 3px 0;">
        <span>${prize.name}: ${prize.condition}</span>
        <span>${new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(prize.value)}</span>
      </div>`).join('')}
      <hr style="margin: 10px 0;">
      <div style="text-align: center; font-weight: bold;">
        ¡BUENA SUERTE!
      </div>
    </div>
  `;
}