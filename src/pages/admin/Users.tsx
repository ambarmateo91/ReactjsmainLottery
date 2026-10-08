'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { userApi } from '@/lib/api';
import { Plus, Power, KeyRound, Pencil } from 'lucide-react';

interface UserRow {
  id: string;
  username: string;
  email?: string;
  full_name?: string;
  role: string;
  db_role?: string;
  phone?: string;
  is_active: boolean;
}

const ROLE_LABELS: Record<string, string> = { admin: 'Administrador', seller: 'Vendedor', viewer: 'Visor' };

export function AdminUsers() {
  const { toast } = useToast();
  const [items, setItems] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('seller');
  const [resetId, setResetId] = useState<string | null>(null);
  const [newPass, setNewPass] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('seller');

  const isProtected = (row: UserRow) => row.username === 'am202526';

  const load = async () => {
    setLoading(true);
    try {
      const data = await userApi.getAll();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      toast({ title: 'Error', description: 'No se pudieron cargar los usuarios', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      toast({ title: 'Error', description: 'Usuario y contraseña requeridos', variant: 'destructive' });
      return;
    }
    try {
      await userApi.create({ username: username.trim(), password, full_name: fullName.trim() || undefined, role });
      toast({ title: 'OK', description: 'Usuario creado', variant: 'success' });
      setUsername('');
      setPassword('');
      setFullName('');
      load();
    } catch {
      toast({ title: 'Error', description: 'No se pudo crear (¿usuario duplicado?)', variant: 'destructive' });
    }
  };

  const toggleActive = async (row: UserRow) => {
    if (isProtected(row) && row.is_active) {
      toast({ title: 'Protegido', description: 'No se puede desactivar al administrador principal', variant: 'destructive' });
      return;
    }
    try {
      await userApi.update(row.id, { is_active: !row.is_active });
      toast({ title: 'OK', description: 'Estado actualizado', variant: 'success' });
      load();
    } catch {
      toast({ title: 'Error', description: 'No se pudo actualizar', variant: 'destructive' });
    }
  };

  const startEdit = (row: UserRow) => {
    setEditingId(row.id);
    setEditUsername(row.username || '');
    setEditName(row.full_name || '');
    setEditRole(row.role || 'seller');
    setResetId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditUsername('');
    setEditName('');
  };

  const saveEdit = async (row: UserRow) => {
    if (!editUsername.trim()) {
      toast({ title: 'Error', description: 'El usuario es requerido', variant: 'destructive' });
      return;
    }
    try {
      await userApi.update(row.id, {
        username: editUsername.trim(),
        full_name: editName.trim() || undefined,
        role: isProtected(row) ? undefined : editRole,
      });
      toast({ title: 'OK', description: 'Usuario actualizado', variant: 'success' });
      cancelEdit();
      load();
    } catch {
      toast({ title: 'Error', description: 'No se pudo guardar (¿usuario duplicado?)', variant: 'destructive' });
    }
  };

  const resetPassword = async (row: UserRow) => {
    if (!newPass || newPass.length < 6) {
      toast({ title: 'Error', description: 'Mínimo 6 caracteres', variant: 'destructive' });
      return;
    }
    try {
      await userApi.update(row.id, { password: newPass });
      toast({ title: 'OK', description: 'Contraseña actualizada', variant: 'success' });
      setResetId(null);
      setNewPass('');
    } catch {
      toast({ title: 'Error', description: 'No se pudo actualizar', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Usuarios</h1>
        <p className="text-muted-foreground">Vendedores y administradores del sistema</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Nuevo usuario
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onCreate} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="u-user">Usuario *</Label>
              <Input id="u-user" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="vendedor1" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="u-pass">Contraseña *</Label>
              <Input id="u-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="u-name">Nombre completo</Label>
              <Input id="u-name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Juan Pérez" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="u-role">Rol</Label>
              <select
                id="u-role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="seller">Vendedor</option>
                <option value="admin">Administrador</option>
                <option value="viewer">Visor</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <Button type="submit">Crear usuario</Button>
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
                    <th className="p-2">Usuario</th>
                    <th className="p-2">Nombre</th>
                    <th className="p-2">Rol</th>
                    <th className="p-2">Estado</th>
                    <th className="p-2 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => (
                    <tr key={row.id} className="border-b">
                      <td className="p-2 font-medium">{row.username}</td>
                      <td className="p-2">{row.full_name || '—'}</td>
                      <td className="p-2">{ROLE_LABELS[row.role] || row.role}</td>
                      <td className="p-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            row.is_active ? 'bg-green-600 text-white' : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {row.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="p-2">
                        <div className="flex gap-2 justify-end">
                          <Button type="button" variant="outline" onClick={() => (editingId === row.id ? cancelEdit() : startEdit(row))} title="Editar usuario">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button type="button" variant="outline" onClick={() => setResetId(resetId === row.id ? null : row.id)} title="Cambiar contraseña">
                            <KeyRound className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => toggleActive(row)}
                            title={isProtected(row) ? 'Administrador principal protegido' : row.is_active ? 'Desactivar' : 'Activar'}
                            disabled={isProtected(row) && row.is_active}
                          >
                            <Power className="h-4 w-4" />
                          </Button>
                        </div>
                        {editingId === row.id && (
                          <div className="grid gap-2 mt-2 md:grid-cols-4">
                            <div className="space-y-1">
                              <Label>Usuario</Label>
                              <Input value={editUsername} onChange={(e) => setEditUsername(e.target.value)} placeholder="usuario" />
                            </div>
                            <div className="space-y-1">
                              <Label>Nombre</Label>
                              <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Nombre completo" />
                            </div>
                            <div className="space-y-1">
                              <Label>Rol</Label>
                              <select
                                value={editRole}
                                onChange={(e) => setEditRole(e.target.value)}
                                disabled={isProtected(row)}
                                title={isProtected(row) ? 'Rol de administrador principal protegido' : 'Rol'}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
                              >
                                <option value="seller">Vendedor</option>
                                <option value="admin">Administrador</option>
                                <option value="viewer">Visor</option>
                              </select>
                            </div>
                            <div className="flex gap-2 items-end">
                              <Button type="button" onClick={() => saveEdit(row)}>
                                Guardar
                              </Button>
                              <Button type="button" variant="outline" onClick={cancelEdit}>
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        )}
                        {resetId === row.id && (
                          <div className="flex gap-2 mt-2 justify-end">
                            <Input
                              type="password"
                              value={newPass}
                              onChange={(e) => setNewPass(e.target.value)}
                              placeholder="Nueva contraseña"
                              className="max-w-md"
                            />
                            <Button type="button" onClick={() => resetPassword(row)}>
                              Guardar
                            </Button>
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
