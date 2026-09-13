'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ticketApi, prizeApi } from '@/lib/supabase';
import { formatTicketForPrint, generateTicketHTML, type TicketPrintData } from '@/lib/ticket-format';
import { Print, Download, Ticket as TicketIcon, Loader2 } from 'lucide-react';

interface PrintableTicket {
  id: string;
  ticket_number: string;
  lottery_id: string;
  lottery_name?: string;
  customer_name?: string;
  customer_phone?: string;
  seller_name: string;
  price?: number;
  draw_date?: string;
  draw_time?: string;
  sold_at: string;
}

export function TicketPrint({ ticket: initialTicket }: { ticket?: PrintableTicket }) {
  const [ticket, setTicket] = useState<PrintableTicket | null>(initialTicket || null);
  const [prizes, setPrizes] = useState<Array<{ name: string; value: number; condition: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [printing, setPrinting] = useState(false);

  const loadTicketDetails = async (ticketId: string) => {
    try {
      const ticketData = await ticketApi.getById(ticketId);
      if (ticketData) {
        const lotteryPrizes = await prizeApi.getByLottery(ticketData.lottery_id);
        setPrizes(lotteryPrizes.map(p => ({
          name: p.prize_name,
          value: p.prize_value,
          condition: p.winning_condition,
        })));
        setTicket({
          ...ticketData,
          lottery_name: '', // Would need to fetch separately
        } as PrintableTicket);
      }
    } catch (error) {
      console.error('Error loading ticket:', error);
    }
  };

  const handlePrint = () => {
    if (!ticket) return;
    setPrinting(true);
    const printData: TicketPrintData = {
      lotteryName: ticket.lottery_name || 'Lotería',
      ticketNumber: ticket.ticket_number,
      customerName: ticket.customer_name,
      customerPhone: ticket.customer_phone,
      sellerName: ticket.seller_name,
      price: ticket.price || 0,
      drawDate: ticket.draw_date || new Date().toISOString(),
      drawTime: ticket.draw_time || '20:00',
      issuedAt: ticket.sold_at,
      prizes,
    };
    const printContent = formatTicketForPrint(printData);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Ticket ${ticket.ticket_number}</title>
            <style>
              body { font-family: monospace; padding: 20px; margin: 0; }
              pre { margin: 0; white-space: pre-wrap; }
              @media print { body { padding: 0; } }
            </style>
          </head>
          <body><pre>${printContent}</pre></body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        setPrinting(false);
      }, 500);
    } else {
      setPrinting(false);
    }
  };

  const handleDownload = () => {
    if (!ticket) return;
    const printData: TicketPrintData = {
      lotteryName: ticket.lottery_name || 'Lotería',
      ticketNumber: ticket.ticket_number,
      customerName: ticket.customer_name,
      customerPhone: ticket.customer_phone,
      sellerName: ticket.seller_name,
      price: ticket.price || 0,
      drawDate: ticket.draw_date || new Date().toISOString(),
      drawTime: ticket.draw_time || '20:00',
      issuedAt: ticket.sold_at,
      prizes,
    };
    const html = generateTicketHTML(printData);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ticket-${ticket.ticket_number}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!ticket) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TicketIcon className="h-5 w-5" />
            Imprimir Ticket
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Selecciona un boleto para imprimir
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TicketIcon className="h-5 w-5" />
          Ticket: {ticket.ticket_number}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-muted rounded-lg">
          <div className="flex justify-between">
            <span>Lotería:</span>
            <span className="font-semibold">{ticket.lottery_name || ticket.lottery_id}</span>
          </div>
          <div className="flex justify-between">
            <span>Número:</span>
            <span className="font-mono">{ticket.ticket_number}</span>
          </div>
          <div className="flex justify-between">
            <span>Vendedor:</span>
            <span>{ticket.seller_name}</span>
          </div>
          {ticket.customer_name && (
            <div className="flex justify-between">
              <span>Cliente:</span>
              <span>{ticket.customer_name}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between">
            <span>Fecha venta:</span>
            <span>{new Date(ticket.sold_at).toLocaleDateString('es-ES')}</span>
          </div>
          <div className="flex justify-between">
            <span>Sorteo:</span>
            <span>{ticket.draw_date ? new Date(ticket.draw_date).toLocaleDateString('es-ES') : 'Pendiente'}</span>
          </div>
          {ticket.price && (
            <div className="flex justify-between text-lg font-semibold">
              <span>Precio:</span>
              <span>{new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(ticket.price)}</span>
            </div>
          )}
        </div>

        {prizes.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold">Premios disponibles:</h4>
            {prizes.map((prize, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span>{prize.name} ({prize.condition})</span>
                <span className="font-semibold">{new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(prize.value)}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button variant="outline" onClick={handleDownload} disabled={printing}>
          <Download className="mr-2 h-4 w-4" />
          Descargar HTML
        </Button>
        <Button onClick={handlePrint} disabled={printing}>
          {printing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Preparando...
            </>
          ) : (
            <>
              <Print className="mr-2 h-4 w-4" />
              Imprimir
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}