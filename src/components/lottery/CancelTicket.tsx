'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { ticketApi, lotteryApi } from '@/lib/api';
import { Search, XCircle, Loader2, Ticket as TicketIcon, AlertTriangle } from 'lucide-react';

const cancelSchema = z.object({
  ticketNumber: z.string().min(1, 'Ingresa el número de boleto'),
  reason: z.string().min(5, 'La razón debe tener al menos 5 caracteres'),
});

type CancelForm = z.infer<typeof cancelSchema>;

interface TicketToCancel {
  id: string;
  ticket_number: string;
  lottery_id: string;
  lottery_name?: string;
  customer_name?: string;
  seller_name: string;
  status: string;
  sold_at: string;
}

export function CancelTicket() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [ticket, setTicket] = useState<TicketToCancel | null>(null);
  const [searching, setSearching] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const { register, handleSubmit, reset, formState: { errors }, setValue } = useForm<CancelForm>({
    resolver: zodResolver(cancelSchema),
  });

  const searchTicket = async (data: { ticketNumber: string }) => {
    setSearching(true);
    try {
      const result = await ticketApi.verify(data.ticketNumber);
      if (!result) {
        toast({ title: 'No encontrado', description: 'El boleto no existe', variant: 'destructive' });
        return;
      }

      if (result.status !== 'sold') {
        toast({ title: 'No cancelable', description: `El boleto está ${result.status}`, variant: 'destructive' });
        return;
      }

      if (result.seller_id !== user?.id && user?.user_metadata?.role !== 'admin') {
        toast({ title: 'No autorizado', description: 'Solo puedes cancelar tus propios boletos', variant: 'destructive' });
        return;
      }

      let lotteryName = '';
      try {
        const lottery = await lotteryApi.getById(result.lottery_id);
        lotteryName = lottery?.name || '';
      } catch { /* lottery name optional */ }

      setTicket({
        ...result,
        lottery_name: lotteryName,
      } as TicketToCancel);
      toast({ title: 'Boleto encontrado', variant: 'default' });
    } catch (error) {
      toast({ title: 'Error', description: 'Error al buscar el boleto', variant: 'destructive' });
    } finally {
      setSearching(false);
    }
  };

  const cancelTicket = async () => {
    if (!ticket) return;
    setCancelling(true);
    try {
      await ticketApi.cancel(ticket.id);
      toast({ title: 'Cancelado', description: 'El boleto ha sido cancelado', variant: 'success' });
      setTicket(null);
      reset();
      setValue('ticketNumber', '');
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo cancelar el boleto', variant: 'destructive' });
    } finally {
      setCancelling(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sold': return <Badge variant="success">Vendido</Badge>;
      case 'cancelled': return <Badge variant="destructive">Cancelado</Badge>;
      case 'claimed': return <Badge variant="default">Premio Reclamado</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          Cancelar Ticket
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!ticket ? (
          <form onSubmit={handleSubmit(searchTicket)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ticketNumber">Número de Ticket *</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="ticketNumber"
                  {...register('ticketNumber')}
                  placeholder="TKT-123456789-0"
                  className="pl-10"
                  disabled={searching}
                />
              </div>
              {errors.ticketNumber && <p className="text-sm text-red-500">{errors.ticketNumber.message}</p>}
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
          </form>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <TicketIcon className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-semibold">{ticket.ticket_number}</p>
                  <p className="text-sm text-muted-foreground">{ticket.lottery_name || ticket.lottery_id}</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span>Estado:</span>
                {getStatusBadge(ticket.status)}
              </div>
              <div className="flex items-center justify-between">
                <span>Vendedor:</span>
                <span>{ticket.seller_name}</span>
              </div>
              {ticket.customer_name && (
                <div className="flex items-center justify-between">
                  <span>Cliente:</span>
                  <span>{ticket.customer_name}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span>Fecha venta:</span>
                <span>{new Date(ticket.sold_at).toLocaleDateString('es-ES')}</span>
              </div>
            </div>

            <Separator />

            <form onSubmit={handleSubmit(() => {})} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reason">Razón de cancelación *</Label>
                <Textarea
                  id="reason"
                  {...register('reason')}
                  placeholder="Motivo de la cancelación..."
                  rows={3}
                />
                {errors.reason && <p className="text-sm text-red-500">{errors.reason.message}</p>}
              </div>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={cancelling} className="w-full">
                    {cancelling ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Cancelando...
                      </>
                    ) : (
                      <>
                        <XCircle className="mr-2 h-4 w-4" />
                        Confirmar Cancelación
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Cancelar boleto?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta acción no se puede deshacer. El boleto {ticket.ticket_number} será marcado como cancelado.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="flex gap-2 justify-end">
                    <AlertDialogCancel>
                      <Button variant="outline">Cancelar</Button>
                    </AlertDialogCancel>
                    <AlertDialogAction onClick={cancelTicket} disabled={cancelling}>
                      {cancelling ? 'Procesando...' : 'Sí, cancelar'}
                    </AlertDialogAction>
                  </div>
                </AlertDialogContent>
              </AlertDialog>
            </form>
          </div>
        )}
      </CardContent>
    </Card>
  );
}