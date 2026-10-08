'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { resultsApi, lotteryApi } from '@/lib/api';
import { Plus, CheckCircle, Trophy, RefreshCw } from 'lucide-react';

interface ResultRow {
  id: string;
  lottery_id: string;
  lottery_name?: string;
  schedule_time?: string;
  draw_date: string;
  first_prize?: string;
  second_prize?: string;
  third_prize?: string;
  status?: string;
  notes?: string;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function AdminResults() {
  const { toast } = useToast();
  const [items, setItems] = useState<ResultRow[]>([]);
  const [lotteries, setLotteries] = useState<Array<{ id: string; name: string }>>([]);
  const [schedules, setSchedules] = useState<Array<{ id: string; draw_time: string; day_of_week: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [filterLottery, setFilterLottery] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [lotteryId, setLotteryId] = useState('');
  const [scheduleId, setScheduleId] = useState('');
  const [drawDate, setDrawDate] = useState(todayISO());
  const [first, setFirst] = useState('');
  const [second, setSecond] = useState('');
  const [third, setThird] = useState('');
  const [notes, setNotes] = useState('');
  const [winners, setWinners] = useState<{ resultId: string; list: Array<any> } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await resultsApi.getAll({ lottery_id: filterLottery || undefined, draw_date: filterDate || undefined });
      setItems(Array.isArray(data) ? data : []);
    } catch {
      toast({ title: 'Error', description: 'No se pudieron cargar los resultados', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    lotteryApi.getAll().then((data) => setLotteries(Array.isArray(data) ? data : [])).catch(() => undefined);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onLotteryChange = async (id: string) => {
    setLotteryId(id);
    setScheduleId('');
    if (!id) {
      setSchedules([]);
      return;
    }
    try {
      setSchedules(await lotteryApi.getSchedules(id));
    } catch {
      setSchedules([]);
    }
  };

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lotteryId || !drawDate || !first.trim()) {
      toast({ title: 'Error', description: 'Lotería, fecha y 1er premio requeridos', variant: 'destructive' });
      return;
    }
    try {
      await resultsApi.create({
        lottery_id: lotteryId,
        schedule_id: scheduleId || null,
        draw_date: drawDate,
        first_prize: first.trim(),
        second_prize: second.trim() || null,
        third_prize: third.trim() || null,
        notes: notes.trim() || null,
      });
      toast({ title: 'OK', description: 'Resultado registrado', variant: 'success' });
      setFirst('');
      setSecond('');
      setThird('');
      setNotes('');
      load();
    } catch {
      toast({ title: 'Error', description: 'No se pudo guardar (¿duplicado?)', variant: 'destructive' });
    }
  };

  const confirm = async (row: ResultRow) => {
    try {
      await resultsApi.update(row.id, { status: 'confirmed' });
      toast({ title: 'OK', description: 'Resultado confirmado', variant: 'success' });
      load();
    } catch {
      toast({ title: 'Error', description: 'No se pudo confirmar', variant: 'destructive' });
    }
  };

  const showWinners = async (row: ResultRow) => {
    try {
      const data = await resultsApi.getWinners(row.id);
      setWinners({ resultId: row.id, list: data.winners || [] });
    } catch {
      toast({ title: 'Error', description: 'No se pudieron cargar ganadores', variant: 'destructive' });
    }
  };

  const [syncing, setSyncing] = useState(false);

  const syncNow = async () => {
    setSyncing(true);
    try {
      const summary = await resultsApi.sync(filterDate || undefined);
      toast({
        title: 'Sincronización completa',
        description: `${summary.created || 0} nuevos · ${summary.winnersMarked || 0} ganadores marcados`,
        variant: 'success',
      });
      load();
    } catch {
      toast({ title: 'Error', description: 'No se pudo sincronizar (¿falta API key?)', variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Resultados</h1>
          <p className="text-muted-foreground">Registra y confirma los números ganadores</p>
        </div>
        <Button type="button" onClick={syncNow} disabled={syncing} title="Sincronizar resultados automáticamente desde la API">
          <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Sincronizando...' : 'Sincronizar'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Registrar resultado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onCreate} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="r-lot">Lotería *</Label>
              <select id="r-lot" value={lotteryId} onChange={(e) => onLotteryChange(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">Selecciona...</option>
                {lotteries.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="r-sch">Sorteo (horario)</Label>
              <select id="r-sch" value={scheduleId} onChange={(e) => setScheduleId(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">—</option>
                {schedules.map((s) => (
                  <option key={s.id} value={s.id}>{s.draw_time} ({s.day_of_week})</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="r-date">Fecha *</Label>
              <Input id="r-date" type="date" value={drawDate} onChange={(e) => setDrawDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="r-first">1er premio *</Label>
              <Input id="r-first" value={first} onChange={(e) => setFirst(e.target.value)} placeholder="25" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="r-second">2do premio</Label>
              <Input id="r-second" value={second} onChange={(e) => setSecond(e.target.value)} placeholder="78" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="r-third">3er premio</Label>
              <Input id="r-third" value={third} onChange={(e) => setThird(e.target.value)} placeholder="12" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="r-notes">Notas</Label>
              <Input id="r-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observaciones" />
            </div>
            <div className="md:col-span-2">
              <Button type="submit">Guardar resultado</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3 mb-4">
            <select value={filterLottery} onChange={(e) => setFilterLottery(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="">Todas las loterías</option>
              {lotteries.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
            <Input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
            <Button type="button" variant="outline" onClick={load}>
              Filtrar
            </Button>
          </div>
          {loading ? (
            <p className="text-muted-foreground">Cargando...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="p-2">Fecha</th>
                    <th className="p-2">Lotería</th>
                    <th className="p-2">1° / 2° / 3°</th>
                    <th className="p-2">Estado</th>
                    <th className="p-2 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => (
                    <tr key={row.id} className="border-b">
                      <td className="p-2">{String(row.draw_date).slice(0, 10)}</td>
                      <td className="p-2 font-medium">{row.lottery_name || row.lottery_id}</td>
                      <td className="p-2 font-mono">{[row.first_prize, row.second_prize, row.third_prize].filter(Boolean).join(' - ')}</td>
                      <td className="p-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            row.status === 'confirmed' ? 'bg-green-600 text-white' : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {row.status === 'confirmed' ? 'Confirmado' : row.status || 'Pendiente'}
                        </span>
                      </td>
                      <td className="p-2">
                        <div className="flex gap-2 justify-end">
                          {row.status !== 'confirmed' && (
                            <Button type="button" variant="outline" onClick={() => confirm(row)} title="Confirmar">
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          <Button type="button" variant="outline" onClick={() => showWinners(row)} title="Ver ganadores">
                            <Trophy className="h-4 w-4" />
                          </Button>
                        </div>
                        {winners?.resultId === row.id && (
                          <div className="mt-2 p-2 bg-muted rounded-lg text-xs">
                            {winners.list.length === 0 ? (
                              <span className="text-muted-foreground">Sin ganadores marcados</span>
                            ) : (
                              winners.list.map((w: any) => (
                                <div key={w.id} className="flex justify-between py-1 border-b last:border-0">
                                  <span className="font-mono">{w.ticket_number}</span>
                                  <span>{w.seller_name}</span>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
