'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '../../hooks/use-toast';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ticketApi, lotteryApi, validateTicketSale } from '../../lib/supabase';
import { getActiveLotteries } from '../../lib/lottery-utils';
import { formatCurrency } from '../../lib/utils';
import { Loader2, CreditCard, User, Ticket as TicketIcon } from 'lucide-react';

const sellSchema = z.object({
  lotteryId: z.string().min(1, 'Selecciona una lotería'),
  quantity: z.coerce.number().min(1, 'Mínimo 1 boleto').max(100, 'Máximo 100 boletos'),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
});

type SellForm = z.infer<typeof sellSchema>;

export function SellTicket() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [lotteries, setLotteries] = useState<Array<{ id: string; name: string; price: number; max_tickets: number; sold_tickets: number }>>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLottery, setSelectedLottery] = useState<{ id: string; name: string; price: number; max_tickets: number; sold_tickets: number } | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SellForm>({
    resolver: zodResolver(sellSchema),
    defaultValues: { quantity: 1 },
  });

  const quantity = watch('quantity');

  const loadLotteries = async () => {
    try {
      const data = await getActiveLotteries();
      setLotteries(data);
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudieron cargar las loterías', variant: 'destructive' });
    }
  };

  const handleLotteryChange = async (lotteryId: string) => {
    const lottery = lotteries.find(l => l.id === lotteryId);
    setSelectedLottery(lottery || null);
    setValue('lotteryId', lotteryId);
  };

  const onSubmit = async (data: SellForm) => {
    if (!user) {
      toast({ title: 'Error', description: 'Debes iniciar sesión', variant: 'destructive' });
      return;
    }

    const validation = await validateTicketSale(data.lotteryId, data.quantity);
    if (!validation.valid) {
      toast({ title: 'Error', description: validation.error, variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const tickets = [];
      for (let i = 0; i < data.quantity; i++) {
        const ticket = await ticketApi.sell({
          lottery_id: data.lotteryId,
          ticket_number: `TKT-${Date.now()}-${i}`,
          customer_name: data.customerName,
          customer_phone: data.customerPhone,
          seller_id: user.id,
          seller_name: user.user_metadata?.full_name || user.email,
          status: 'sold',
        });
        tickets.push(ticket);
      }

      toast({
        title: 'Éxito',
        description: `${tickets.length} boleto(s) vendido(s) correctamente`,
        variant: 'success',
      });

      setValue('quantity', 1);
      setValue('customerName', '');
      setValue('customerPhone', '');
      loadLotteries();
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo vender el boleto', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const total = selectedLottery ? quantity * selectedLottery.price : 0;

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TicketIcon className="h-5 w-5" />
          Vender Boletos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="lotteryId">Lotería *</Label>
            <Select onValueChange={handleLotteryChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una lotería" />
              </SelectTrigger>
              <SelectContent>
                {lotteries.map(lottery => (
                  <SelectItem key={lottery.id} value={lottery.id}>
                    {lottery.name} - {formatCurrency(lottery.price)} (Disponibles: {lottery.max_tickets - lottery.sold_tickets})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.lotteryId && <p className="text-sm text-red-500">{errors.lotteryId.message}</p>}
          </div>

          {selectedLottery && (
            <div className="space-y-2 p-4 bg-muted rounded-lg">
              <div className="flex justify-between">
                <span>Precio unitario:</span>
                <span className="font-semibold">{formatCurrency(selectedLottery.price)}</span>
              </div>
              <div className="flex justify-between">
                <span>Disponibles:</span>
                <span>{selectedLottery.max_tickets - selectedLottery.sold_tickets}</span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="quantity">Cantidad *</Label>
            <Input
              type="number"
              min="1"
              max={selectedLottery ? selectedLottery.max_tickets - selectedLottery.sold_tickets : 100}
              {...register('quantity')}
              className="w-24"
            />
            {errors.quantity && <p className="text-sm text-red-500">{errors.quantity.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="customerName">Nombre del cliente (opcional)</Label>
            <Input {...register('customerName')} placeholder="Juan Pérez" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="customerPhone">Teléfono (opcional)</Label>
            <Input type="tel" {...register('customerPhone')} placeholder="+34 600 000 000" />
          </div>

          {selectedLottery && (
            <div className="flex justify-between text-lg font-semibold pt-4 border-t">
              <span>Total:</span>
              <span>{formatCurrency(total)}</span>
            </div>
          )}
        </form>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button type="submit" disabled={loading || !selectedLottery} className="w-full sm:w-auto">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Procesando...
            </>
          ) : (
            <>
              <CreditCard className="mr-2 h-4 w-4" />
              Vender
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}