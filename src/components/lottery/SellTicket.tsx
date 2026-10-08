'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ticketApi } from '@/lib/api';
import { getActiveLotteries, validateTicketSale } from '@/lib/lottery-utils';
import { dispatchPrint, getPrintMethod } from '@/lib/escpos';
import { PrinterSelect } from '@/components/ui/printer-select';
import { Loader2, CreditCard, Ticket as TicketIcon } from 'lucide-react';

const PLAY_TYPES = ['quiniela', 'pale', 'tripleta'] as const;
type PlayType = (typeof PLAY_TYPES)[number];

const NUMBER_PATTERNS: Record<PlayType, RegExp> = {
  quiniela: /^\d{1,2}$/,
  pale: /^(\d{2}\s*-\s*\d{2}|\d{4})$/,
  tripleta: /^(\d{2}\s*-\s*\d{2}\s*-\s*\d{2}|\d{6})$/,
};

const NUMBER_HINTS: Record<PlayType, string> = {
  quiniela: 'Ej: 25',
  pale: 'Ej: 25-78',
  tripleta: 'Ej: 05-18-32',
};

/** Máscara: solo dígitos y guiones automáticos según el tipo (20-26, 20-25-26). */
function maskPlayNumbers(value: string, type: PlayType): string {
  const digits = value.replace(/\D/g, '');
  if (type === 'quiniela') return digits.slice(0, 2);
  if (type === 'pale') {
    const d = digits.slice(0, 4);
    return d.length > 2 ? `${d.slice(0, 2)}-${d.slice(2)}` : d;
  }
  const d = digits.slice(0, 6);
  if (d.length > 4) return `${d.slice(0, 2)}-${d.slice(2, 4)}-${d.slice(4)}`;
  if (d.length > 2) return `${d.slice(0, 2)}-${d.slice(2)}`;
  return d;
}

const sellSchema = z
  .object({
    lotteryId: z.string().min(1, 'Selecciona una lotería'),
    playType: z.enum(PLAY_TYPES, { required_error: 'Selecciona el tipo de jugada' }),
    playNumbers: z.string().min(1, 'Ingresa el número de jugada').max(20, 'Máximo 20 caracteres'),
    quantity: z.coerce.number().min(1, 'Mínimo 1 boleto').max(100, 'Máximo 100 boletos'),
    amount: z.coerce.number().min(1, 'Monto mínimo RD$1'),
  })
  .superRefine((data, ctx) => {
    const pattern = NUMBER_PATTERNS[data.playType as PlayType];
    if (pattern && !pattern.test(data.playNumbers.trim())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['playNumbers'],
        message: `Formato inválido. ${NUMBER_HINTS[data.playType as PlayType]}`,
      });
    }
  });

type SellForm = z.infer<typeof sellSchema>;

export function SellTicket() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [lotteries, setLotteries] = useState<Array<{ id: string; name: string; price: number; max_tickets: number; sold_tickets: number }>>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLottery, setSelectedLottery] = useState<{ id: string; name: string; price: number; max_tickets: number; sold_tickets: number } | null>(null);
  const [autoPrint, setAutoPrint] = useState(true);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<SellForm>({
    resolver: zodResolver(sellSchema),
    defaultValues: { quantity: 1, playType: 'quiniela', playNumbers: '' },
  });

  const quantity = watch('quantity');
  const amount = watch('amount');
  const playType = watch('playType');

  const loadLotteries = async () => {
    try {
      const data = await getActiveLotteries();
      setLotteries(Array.isArray(data) ? data : []);
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudieron cargar las loterías', variant: 'destructive' });
    }
  };

  useEffect(() => {
    loadLotteries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLotteryChange = async (lotteryId: string) => {
    const lottery = lotteries.find(l => l.id === lotteryId);
    setSelectedLottery(lottery || null);
    setValue('lotteryId', lotteryId);
  };

  const handlePlayTypeChange = (value: string) => {
    const pt = value as PlayType;
    setValue('playType', pt);
    const current = getValues('playNumbers');
    if (current) setValue('playNumbers', maskPlayNumbers(current, pt), { shouldValidate: true });
  };

  const { onChange: _numbersOnChange, ...numbersRest } = register('playNumbers');
  void _numbersOnChange;

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
      const base = Date.now();
      for (let i = 0; i < data.quantity; i++) {
        const ticket = await ticketApi.sell({
          lottery_id: data.lotteryId,
          ticket_number: `TKT-${base}-${i}`,
          seller_id: user.id,
          seller_name: user.user_metadata?.full_name || user.username,
          play_type: data.playType,
          numbers: data.playNumbers.trim(),
          amount: data.amount,
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
      setValue('playNumbers', '');
      loadLotteries();

      if (autoPrint) {
        const items = tickets.map((t: any) => ({
          ticketNumber: t.ticket_number,
          lotteryName: selectedLottery?.name || data.lotteryId,
          playType: data.playType,
          numbers: data.playNumbers.trim(),
          amount: data.amount,
          sellerName: user.user_metadata?.full_name || user.username,
          soldAt: t.sold_at || t.created_at,
          drawDate: t.draw_date,
          drawTime: t.draw_time,
        }));
        try {
          const msg = await dispatchPrint(items, getPrintMethod());
          if (msg) toast({ title: 'Impreso', description: msg, variant: 'success' });
        } catch (error) {
          toast({
            title: 'Error de impresión',
            description: error instanceof Error ? error.message : 'No se pudo imprimir',
            variant: 'destructive',
          });
        }
      }
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo vender el boleto', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const total = (Number(amount) || 0) * (Number(quantity) || 0);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TicketIcon className="h-5 w-5" />
          Vender Tickets
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form id="sell-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="lotteryId">Lotería *</Label>
            <Select onValueChange={handleLotteryChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una lotería" />
              </SelectTrigger>
              <SelectContent>
                {lotteries.map(lottery => (
                  <SelectItem key={lottery.id} value={lottery.id}>
                    {lottery.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.lotteryId && <p className="text-sm text-red-500">{errors.lotteryId.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="playType">Tipo de jugada *</Label>
            <Select defaultValue="quiniela" onValueChange={handlePlayTypeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona el tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="quiniela">Quiniela</SelectItem>
                <SelectItem value="pale">Palé</SelectItem>
                <SelectItem value="tripleta">Tripleta</SelectItem>
              </SelectContent>
            </Select>
            {errors.playType && <p className="text-sm text-red-500">{errors.playType.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="playNumbers">Número de jugada *</Label>
            <Input
              {...numbersRest}
              inputMode="numeric"
              placeholder={NUMBER_HINTS[playType] || 'Ej: 25'}
              onChange={(e) => {
                setValue('playNumbers', maskPlayNumbers(e.target.value, playType), {
                  shouldValidate: true,
                  shouldDirty: true,
                  shouldTouch: true,
                });
              }}
            />
            {errors.playNumbers && <p className="text-sm text-red-500">{errors.playNumbers.message}</p>}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="quantity">Cantidad *</Label>
              <Input type="number" min="1" max="100" {...register('quantity')} />
              {errors.quantity && <p className="text-sm text-red-500">{errors.quantity.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Monto RD$ *</Label>
              <Input type="number" min="1" {...register('amount')} placeholder="25" />
              {errors.amount && <p className="text-sm text-red-500">{errors.amount.message}</p>}
            </div>
          </div>

          {selectedLottery && (
            <div className="space-y-2 p-4 bg-muted rounded-lg">
              <div className="flex justify-between">
                <span>Lotería:</span>
                <span className="font-semibold">{selectedLottery.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Vendidos:</span>
                <span>{selectedLottery.sold_tickets}</span>
              </div>
            </div>
          )}

          <PrinterSelect />

          <div className="flex items-center gap-2 pt-1">
            <input
              id="autoPrint"
              type="checkbox"
              checked={autoPrint}
              onChange={(e) => setAutoPrint(e.target.checked)}
              className="h-4 w-4"
            />
            <Label htmlFor="autoPrint">Imprimir Automáticamente</Label>
          </div>

          <div className="flex justify-between text-lg font-semibold pt-4 border-t">
            <span>Total:</span>
            <span>RD${total.toFixed(2)}</span>
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button type="submit" form="sell-form" disabled={loading || !selectedLottery} className="w-full sm:w-auto">
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
