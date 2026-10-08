'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { ticketApi } from '@/lib/api';
import { buildReceiptHTML, capitalize, longDate, formatDrawTime, formatEmision } from '@/lib/ticket-print';
import { dispatchPrint, getPrintMethod } from '@/lib/escpos';
import { PrinterSelect } from '@/components/ui/printer-select';
import { Printer, Download, Ticket as TicketIcon, Search, Loader2 } from 'lucide-react';

const searchSchema = z.object({ ticketNumber: z.string().min(1, 'Ingresa el número de ticket') });
type SearchForm = z.infer<typeof searchSchema>;

interface FoundTicket {
  id: string;
  ticket_number: string;
  lottery_id: string;
  lottery_name?: string;
  play_type?: string;
  prize_type?: string;
  numbers?: string[] | string | null;
  amount?: number;
  seller_name?: string;
  status?: string;
  sold_at?: string;
  created_at?: string;
  draw_date?: string;
  draw_time?: string;
}

function formatNumbers(value: FoundTicket['numbers']): string {
  if (!value) return '—';
  if (Array.isArray(value)) return value.join(' - ');
  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed)) return (parsed as Array<string | number>).join(' - ');
    return String(parsed);
  } catch {
    return value;
  }
}

export function TicketPrint() {
  const { toast } = useToast();
  const [ticket, setTicket] = useState<FoundTicket | null>(null);
  const [searching, setSearching] = useState(false);
  const { register, handleSubmit } = useForm<SearchForm>({ resolver: zodResolver(searchSchema) });

  const onSearch = async (data: SearchForm) => {
    setSearching(true);
    try {
      const result = (await ticketApi.verify(data.ticketNumber)) as FoundTicket;
      if (!result) {
        toast({ title: 'No encontrado', description: 'El ticket no existe', variant: 'destructive' });
        return;
      }
      setTicket(result);
    } catch {
      toast({ title: 'Error', description: 'No se pudo buscar el ticket', variant: 'destructive' });
    } finally {
      setSearching(false);
    }
  };

  const toReceipt = (t: FoundTicket) => ({
    ticketNumber: t.ticket_number,
    lotteryName: t.lottery_name || 'Lotería',
    playType: t.play_type || t.prize_type || '',
    numbers: formatNumbers(t.numbers),
    amount: Number(t.amount || 0),
    sellerName: t.seller_name || '',
    soldAt: t.sold_at || t.created_at,
    drawDate: t.draw_date,
    drawTime: t.draw_time,
  });

  const handlePrint = async () => {
    if (!ticket) return;
    try {
      const msg = await dispatchPrint([toReceipt(ticket)], getPrintMethod());
      toast({ title: 'Imprimiendo', description: msg || 'Ticket enviado a la impresora', variant: 'default' });
    } catch (error) {
      toast({
        title: 'Error de impresión',
        description: error instanceof Error ? error.message : 'No se pudo imprimir',
        variant: 'destructive',
      });
    }
  };

  const handleDownload = () => {
    if (!ticket) return;
    const html = buildReceiptHTML([toReceipt(ticket)]);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ticket-${ticket.ticket_number}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Imprimir Ticket</h1>
        <p className="text-muted-foreground">Busca un ticket y reimprímelo</p>
      </div>

      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Buscar ticket
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSearch)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ticketNumber">Número de Ticket *</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="ticketNumber"
                  {...register('ticketNumber')}
                  placeholder="TKT-..."
                  className="pl-10"
                  disabled={searching}
                />
              </div>
            </div>
            <Button type="submit" disabled={searching} className="w-full">
              {searching ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Buscando...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Buscar
                </>
              )}
            </Button>
            <PrinterSelect />
          </form>
        </CardContent>
      </Card>

      {ticket && (
        <Card className="w-full max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TicketIcon className="h-5 w-5" />
              Vista previa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mx-auto max-w-[300px] border-2 border-black p-3 text-center font-mono text-sm space-y-1">
              <p className="font-bold text-base tracking-widest">LOTERIA - {ticket.lottery_name || 'Lotería'}</p>
              <div className="border-t border-dashed border-black my-2" />
              <div className="flex justify-between text-left">
                <span>Ticket:</span>
                <span>{ticket.ticket_number}</span>
              </div>
              <div className="flex justify-between text-left">
                <span>Lotería:</span>
                <span>{ticket.lottery_name}</span>
              </div>
              <div className="flex justify-between text-left">
                <span>Tipo:</span>
                <span>{capitalize(ticket.play_type || ticket.prize_type || '')}</span>
              </div>
              <div className="border-t border-dashed border-black my-2" />
              <p className="text-left">Números:</p>
              <p>
                <span className="inline-block bg-black text-white text-2xl font-bold px-5 py-1 tracking-widest">
                  {formatNumbers(ticket.numbers)}
                </span>
              </p>
              <div className="border-t border-dashed border-black my-2" />
              <div className="flex justify-between text-left font-bold">
                <span>Monto:</span>
                <span>RD${Number(ticket.amount || 0).toFixed(2)}</span>
              </div>
              <div className="border-t-2 border-black my-2" />
              <p className="font-bold">Válido para:</p>
              <p>{longDate(ticket.draw_date)}</p>
              <p className="font-bold">
                {ticket.lottery_name}
                {formatDrawTime(ticket.draw_time) ? ` - ${formatDrawTime(ticket.draw_time)}` : ''}
              </p>
              <div className="border-t border-dashed border-black my-2" />
              <p>Fecha emisión:</p>
              <p>{formatEmision(ticket.sold_at || ticket.created_at)}</p>
              <div className="border-t-2 border-black my-2" />
              <p className="font-bold">
                Revise su Ticket
                <br />
                ¡BUENA SUERTE!
              </p>
            </div>
            <p className="text-center tracking-widest mt-2 text-sm font-mono">*** TICKET VÁLIDO ***</p>
          </CardContent>
          <CardFooter className="flex gap-2">
            <Button variant="outline" onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" />
              Descargar HTML
            </Button>
            <Button onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              Imprimir
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
