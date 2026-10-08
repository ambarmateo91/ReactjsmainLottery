'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { lotteryApi } from '@/lib/api';
import { Plus, Pencil, Power } from 'lucide-react';

interface LotteryRow {
  id: string;
  name: string;
  code?: string;
  type?: string;
  description?: string;
  status: string;
  sold_tickets: number;
  max_tickets: number;
}

export function AdminLotteries() {
  const { toast } = useToast();
  const [items, setItems] = useState<LotteryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

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
    setEditingId(null);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: 'Error', description: 'El nombre es requerido', variant: 'destructive' });
      return;
    }
    try {
      if (editingId) {
        await lotteryApi.update(editingId, { name: name.trim(), code: code.trim() || null, description: description.trim() || null });
        toast({ title: 'OK', description: 'Lotería actualizada', variant: 'success' });
      } else {
        await lotteryApi.create({ name: name.trim(), code: code.trim() || null, description: description.trim() || null });
        toast({ title: 'OK', description: 'Lotería creada', variant: 'success' });
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

  const startEdit = (row: LotteryRow) => {
    setEditingId(row.id);
    setName(row.name || '');
    setCode(row.code || '');
    setDescription(row.description || '');
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
    </div>
  );
}
