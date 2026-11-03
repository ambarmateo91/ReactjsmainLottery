'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { lotteryApi, apiErrorMessage } from '@/lib/api';
import { Plus, Pencil, Power, Clock, Trash2 } from 'lucide-react';

interface LotteryRow {
  id: string;
  name: string;
  code?: string;
  type?: string;
  description?: string;
  status: string;
  sold_tickets: number;
  max_tickets: number;
  closing_time?: string | null;
  schedule_day?: string | number | null;
  is_closed?: boolean;
}

const DAY_LABELS: Record<string, string> = {
  daily: 'Diario',
  monday: 'Lunes',
  tuesday: 'Martes',
  wednesday: 'Miércoles',
  thursday: 'Jueves',
  friday: 'Viernes',
  saturday: 'Sábado',
  sunday: 'Domingo',
  '0': 'Domingo',
  '1': 'Lunes',
  '2': 'Martes',
  '3': 'Miércoles',
  '4': 'Jueves',
  '5': 'Viernes',
  '6': 'Sábado',
  '7': 'Diario',
};

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function dayLabel(day?: string | number | null) {
  if (day == null || day === '') return 'Diario';
  return DAY_LABELS[String(day).toLowerCase()] || String(day);
}

/** Convierte 0-6 a nombre de día para el selector. */
function toDayOption(day?: string | number | null) {
  if (day == null || day === '') return 'daily';
  const value = String(day).toLowerCase();
  if (/^\d+$/.test(value)) return DAY_NAMES[Number(value)] || 'daily';
  return value;
}

export function AdminLotteries() {
  const { toast } = useToast();
  const [items, setItems] = useState<LotteryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [closingTime, setClosingTime] = useState('18:00');
  const [scheduleDay, setScheduleDay] = useState('daily');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LotteryRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await lotteryApi.getAll();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      toast({ title: 'Error', description: 'No se pudieron cargar las loterías', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setName('');
    setCode('');
    setDescription('');
    setClosingTime('18:00');
    setScheduleDay('daily');
    setEditingId(null);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: 'Error', description: 'El nombre es requerido', variant: 'destructive' });
      return;
    }
    try {
      let lotteryId = editingId;
      if (editingId) {
        await lotteryApi.update(editingId, { name: name.trim(), code: code.trim() || null, description: description.trim() || null });
        toast({ title: 'OK', description: 'Lotería actualizada', variant: 'success' });
      } else {
        const created = await lotteryApi.create({ name: name.trim(), code: code.trim() || null, description: description.trim() || null });
        toast({ title: 'OK', description: 'Lotería creada', variant: 'success' });
        lotteryId = created.id;
      }
      // Crear o actualizar el horario de cierre (sin duplicar al editar)
      if (lotteryId) {
        try {
          await lotteryApi.upsertSchedule(lotteryId, {
            draw_time: closingTime,
            day_of_week: scheduleDay,
            is_active: true,
          });
        } catch (schedErr) {
          console.warn('No se pudo guardar el horario:', schedErr);
          toast({
            title: 'Aviso',
            description: 'La lotería se guardó, pero no se pudo guardar el horario de cierre',
            variant: 'destructive',
          });
        }
      }
      resetForm();
      load();
    } catch {
      toast({ title: 'Error', description: 'No se pudo guardar', variant: 'destructive' });
    }
  };

  const toggleActive = async (row: LotteryRow) => {
    try {
      await lotteryApi.update(row.id, { is_active: row.status !== 'active' });
      toast({ title: 'OK', description: 'Estado actualizado', variant: 'success' });
      load();
    } catch {
      toast({ title: 'Error', description: 'No se pudo actualizar', variant: 'destructive' });
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await lotteryApi.delete(deleteTarget.id);
      toast({
        title: 'OK',
        description: `Lotería "${deleteTarget.name}" eliminada`,
        variant: 'success',
      });
      if (editingId === deleteTarget.id) resetForm();
      setDeleteTarget(null);
      load();
    } catch (error) {
      toast({
        title: 'No se pudo eliminar',
        description: apiErrorMessage(error, 'No se pudo eliminar la lotería'),
        variant: 'destructive',
      });
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const startEdit = async (row: LotteryRow) => {
    setEditingId(row.id);
    setName(row.name || '');
    setCode(row.code || '');
    setDescription(row.description || '');
    // Cargar horario existente si hay
    setClosingTime(row.closing_time?.slice(0, 5) || '18:00');
    setScheduleDay(toDayOption(row.schedule_day));
    try {
      const schedules = await lotteryApi.getSchedules(row.id);
      if (schedules?.length) {
        const s = schedules[0];
        setClosingTime(s.draw_time?.slice(0, 5) || '18:00');
        setScheduleDay(toDayOption(s.day_of_week));
      }
    } catch {
      // Se mantienen los valores que ya trae la fila
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Loterías</h1>
        <p className="text-muted-foreground">Gestiona las loterías del sistema</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            {editingId ? 'Editar lotería' : 'Nueva lotería'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="lot-name">Nombre *</Label>
              <Input id="lot-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="La Primera" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lot-code">Código</Label>
              <Input id="lot-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="LP" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="lot-desc">Descripción</Label>
              <Input id="lot-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Sorteo ..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lot-close-time">Hora de cierre (sorteo) *</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="lot-close-time"
                  type="time"
                  value={closingTime}
                  onChange={(e) => setClosingTime(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="lot-schedule-day">Día del sorteo</Label>
              <Select value={scheduleDay} onValueChange={setScheduleDay}>
                <SelectTrigger id="lot-schedule-day" className="w-full">
                  <SelectValue placeholder="Seleccionar día" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Diario</SelectItem>
                  <SelectItem value="monday">Lunes</SelectItem>
                  <SelectItem value="tuesday">Martes</SelectItem>
                  <SelectItem value="wednesday">Miércoles</SelectItem>
                  <SelectItem value="thursday">Jueves</SelectItem>
                  <SelectItem value="friday">Viernes</SelectItem>
                  <SelectItem value="saturday">Sábado</SelectItem>
                  <SelectItem value="sunday">Domingo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 md:col-span-2">
              <Button type="submit">{editingId ? 'Guardar cambios' : 'Crear lotería'}</Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Listado ({items.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Cargando...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="p-2">Nombre</th>
                    <th className="p-2">Código</th>
                    <th className="p-2">Cierre</th>
                    <th className="p-2">Estado</th>
                    <th className="p-2 text-right">Vendidos</th>
                    <th className="p-2 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => (
                    <tr key={row.id} className="border-b">
                      <td className="p-2 font-medium">{row.name}</td>
                      <td className="p-2">{row.code || '—'}</td>
                      <td className="p-2">
                        {row.closing_time ? (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                            {row.closing_time}
                            <span className="text-muted-foreground">({dayLabel(row.schedule_day)})</span>
                            {row.is_closed && (
                              <span className="ml-1 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                                Cerrada
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="p-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            row.status === 'active' ? 'bg-green-600 text-white' : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {row.status === 'active' ? 'Activa' : 'Inactiva'}
                        </span>
                      </td>
                      <td className="p-2 text-right">{row.sold_tickets}</td>
                      <td className="p-2">
                        <div className="flex gap-2 justify-end">
                          <Button type="button" variant="outline" onClick={() => startEdit(row)} title="Editar">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button type="button" variant="outline" onClick={() => toggleActive(row)} title={row.status === 'active' ? 'Desactivar' : 'Activar'}>
                            <Power className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setDeleteTarget(row)}
                            title="Eliminar"
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar lotería</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Seguro que deseas eliminar <strong>{deleteTarget?.name}</strong>? Esta acción no se puede deshacer.
              Si la lotería tiene tickets vendidos, no se podrá eliminar; en ese caso desactívala.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                confirmDelete();
              }}
              disabled={deleting}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
