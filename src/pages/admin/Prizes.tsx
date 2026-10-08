'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { lotteryApi, prizesApi } from '@/lib/api';
import { Plus, Power, DollarSign } from 'lucide-react';

const PLAY_TYPES = ['quiniela', 'pale', 'tripleta'];

export function AdminPrizes() {
  const { toast } = useToast();
  const [lotteries, setLotteries] = useState<Array<{ id: string; name: string }>>([]);
  const [lotteryId, setLotteryId] = useState('');
  const [configs, setConfigs] = useState<Array<any>>([]);
  const [playType, setPlayType] = useState('quiniela');
  const [prizeType, setPrizeType] = useState('cash');
  const [estimated, setEstimated] = useState('');
  const [payments, setPayments] = useState<Array<any>>([]);
  const [payFilter, setPayFilter] = useState('pending');

  const loadConfigs = async (id: string) => {
    if (!id) {
      setConfigs([]);
      return;
    }
    try {
      const { prizeApi } = await import('@/lib/api');
      const data = await prizeApi.getByLottery(id);
      setConfigs(Array.isArray(data) ? data : []);
    } catch {
      toast({ title: 'Error', description: 'No se pudo cargar la configuración', variant: 'destructive' });
    }
  };

  const loadPayments = async () => {
    try {
      const data = await prizesApi.getAll(payFilter || undefined);
      setPayments(Array.isArray(data) ? data : []);
    } catch {
      toast({ title: 'Error', description: 'No se pudieron cargar los pagos', variant: 'destructive' });
    }
  };

  useEffect(() => {
    lotteryApi.getAll().then((data) => setLotteries(Array.isArray(data) ? data : [])).catch(() => undefined);
    loadPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onLotteryChange = (id: string) => {
    setLotteryId(id);
    loadConfigs(id);
  };

  const onCreateConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lotteryId) {
      toast({ title: 'Error', description: 'Selecciona una lotería', variant: 'destructive' });
      return;
    }
    try {
      await lotteryApi.createPrizeConfig(lotteryId, {
        play_type: playType,
        prize_type: prizeType,
        estimated_prize: Number(estimated) || 0,
      });
      toast({ title: 'OK', description: 'Configuración creada', variant: 'success' });
      setEstimated('');
      loadConfigs(lotteryId);
    } catch {
      toast({ title: 'Error', description: 'No se pudo guardar', variant: 'destructive' });
    }
  };

  const toggleConfig = async (row: any) => {
    try {
      await lotteryApi.updatePrizeConfig(row.id, { is_active: !row.is_active });
      toast({ title: 'OK', description: 'Estado actualizado', variant: 'success' });
      loadConfigs(lotteryId);
    } catch {
      toast({ title: 'Error', description: 'No se pudo actualizar', variant: 'destructive' });
    }
  };

  const markPaid = async (row: any) => {
    try {
      await prizesApi.markPaid(row.id);
      toast({ title: 'OK', description: 'Premio marcado como pagado', variant: 'success' });
      loadPayments();
    } catch {
      toast({ title: 'Error', description: 'No se pudo actualizar', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Premios</h1>
        <p className="text-muted-foreground">Configuración de premios y pagos a ganadores</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Configuración por lotería
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pz-lot">Lotería</Label>
              <select id="pz-lot" value={lotteryId} onChange={(e) => onLotteryChange(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">Selecciona...</option>
                {lotteries.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
          </div>

          {lotteryId && (
            <>
              <form onSubmit={onCreateConfig} className="grid gap-4 md:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="pz-play">Tipo de jugada</Label>
                  <select id="pz-play" value={playType} onChange={(e) => setPlayType(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    {PLAY_TYPES.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pz-type">Tipo de premio</Label>
                  <Input id="pz-type" value={prizeType} onChange={(e) => setPrizeType(e.target.value)} placeholder="cash" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pz-est">Premio estimado RD$</Label>
                  <Input id="pz-est" type="number" min="0" value={estimated} onChange={(e) => setEstimated(e.target.value)} placeholder="5000" />
                </div>
                <div className="flex items-end">
                  <Button type="submit">Agregar</Button>
                </div>
              </form>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="p-2">Jugada</th>
                      <th className="p-2">Tipo</th>
                      <th className="p-2 text-right">Estimado</th>
                      <th className="p-2">Estado</th>
                      <th className="p-2 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {configs.map((row: any) => (
                      <tr key={row.id} className="border-b">
                        <td className="p-2 font-medium">{row.play_type}</td>
                        <td className="p-2">{row.prize_type}</td>
                        <td className="p-2 text-right">RD${Number(row.estimated_prize || 0).toFixed(2)}</td>
                        <td className="p-2">{row.is_active ? 'Activa' : 'Inactiva'}</td>
                        <td className="p-2 text-right">
                          <Button type="button" variant="outline" onClick={() => toggleConfig(row)} title="Activar/Desactivar">
                            <Power className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Pagos a ganadores
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <select value={payFilter} onChange={(e) => setPayFilter(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="pending">Pendientes</option>
              <option value="paid">Pagados</option>
              <option value="">Todos</option>
            </select>
            <Button type="button" variant="outline" onClick={loadPayments}>
              Actualizar
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="p-2">Boleto</th>
                  <th className="p-2">Lotería</th>
                  <th className="p-2">Ganador</th>
                  <th className="p-2 text-right">Monto</th>
                  <th className="p-2">Estado</th>
                  <th className="p-2 text-right">Acción</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((row: any) => (
                  <tr key={row.id} className="border-b">
                    <td className="p-2 font-mono">{row.ticket_number || row.ticket_id}</td>
                    <td className="p-2">{row.lottery_name || '—'}</td>
                    <td className="p-2">{row.user_name || '—'}</td>
                    <td className="p-2 text-right">RD${Number(row.amount || 0).toFixed(2)}</td>
                    <td className="p-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          row.status === 'paid' ? 'bg-green-600 text-white' : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {row.status === 'paid' ? 'Pagado' : row.status || 'Pendiente'}
                      </span>
                    </td>
                    <td className="p-2 text-right">
                      {row.status !== 'paid' && (
                        <Button type="button" variant="outline" onClick={() => markPaid(row)} title="Marcar pagado">
                          <DollarSign className="h-4 w-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
