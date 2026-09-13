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
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ticketApi, resultApi, prizeApi } from '@/lib/supabase';
import { Search, CheckCircle, XCircle, Loader2, Award, Ticket as TicketIcon } from 'lucide-react';

const verifySchema = z.object({
  ticketNumber: z.string().min(1, 'Ingresa el número de boleto'),
});

type VerifyForm = z.infer<typeof verifySchema>;

interface VerifiedTicket {
  id: string;
  ticket_number: string;
  lottery_id: string;
  lottery_name?: string;
  customer_name?: string;
  seller_name: string;
  status: string;
  sold_at: string;
  prize_won?: number;
  prize_type?: string;
  draw_date?: string;
  winning_numbers?: string[];
}

export function VerifyPrize() {
  const { toast } = useToast();
  const [ticket, setTicket] = useState<VerifiedTicket | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<VerifyForm>({
    resolver: zodResolver(verifySchema),
  });

  const onSubmit = async (data: VerifyForm) => {
    setChecking(true);
    setTicket(null);
    try {
      const result = await ticketApi.verify(data.ticketNumber);
      if (!result) {
        toast({ title: 'No encontrado', description: 'El boleto no existe', variant: 'destructive' });
        return;
      }

      let lotteryName = '';
      try {
        const { data: lottery } = await supabase
          .from('lotteries')
          .select('name')
          .eq('id', result.lottery_id)
          .single();
        lotteryName = lottery?.name || '';
      } catch {}

      const verifiedTicket: VerifiedTicket = {
        ...result,
        lottery_name: lotteryName,
      };

      setTicket(verifiedTicket);
      toast({ title: 'Boleto encontrado', description: `Estado: ${result.status}`, variant: 'default' });
    } catch (error) {
      toast({ title: 'Error', description: 'Error al verificar el boleto', variant: 'destructive' });
    } finally {
      setChecking(false);
    }
  };

  const claimPrize = async () => {
    if (!ticket || ticket.status !== 'sold' || !ticket.prize_won) return;
    
    setLoading(true);
    try {
      await ticketApi.update(ticket.id, { status: 'claimed' });
      setTicket({ ...ticket, status: 'claimed' });
      toast({ title: 'Premio reclamado', description: `Se ha entregado el premio`, variant: 'success' });
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo reclamar el premio', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sold':
        return <Badge variant="success">Vendido</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelado</Badge>;
      case 'claimed':
        return <Badge variant="default">Premio Reclamado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Verificar Premio
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ticketNumber">Número de Boleto *</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="ticketNumber"
                {...register('ticketNumber')}
                placeholder="TKT-123456789-0"
                className="pl-10"
                disabled={checking}
              />
            </div>
            {errors.ticketNumber && <p className="text-sm text-red-500">{errors.ticketNumber.message}</p>}
          </div>

          <Button type="submit" disabled={checking} className="w-full">
            {checking ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verificando...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Verificar
              </>
            )}
          </Button>
        </form>

        {ticket && (
          <div className="mt-6 space-y-4">
            <Separator />
            <div className="space-y-3 p-4 bg-muted rounded-lg">
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
              {ticket.prize_won && (
                <div className="flex items-center justify-between text-lg font-semibold text-green-600">
                  <span className="flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    Premio:
                  </span>
                  <span>{ticket.prize_type || 'Ganador'}: {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(ticket.prize_won)}</span>
                </div>
              )}
              {ticket.status === 'sold' && ticket.prize_won && (
                <Button onClick={claimPrize} disabled={loading} className="w-full">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Reclamando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Reclamar Premio
                    </>
                  )}
                </Button>
              )}
              {ticket.status === 'claimed' && (
                <Badge variant="default" className="w-full">Premio ya reclamado</Badge>
              )}
              {ticket.prize_won && ticket.status !== 'claimed' && ticket.status !== 'sold' && (
                <Badge variant="destructive" className="w-full">No aplica premio</Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Need to import supabase for the lottery name lookup
import { supabase } from '../../config/auth-config';