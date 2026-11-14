import { Pencil, Plus, Search, UserRound, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { apiRequest } from '../../lib/api';
import type { AppRole } from '../auth/AuthContext';

type Permission = {
  modulo: string;
  ver: boolean;
  crear: boolean;
  editar: boolean;
  exportar: boolean;
};

type RoleOption = {
  id: number;
  nombre: AppRole;
  permisosPredeterminados: Permission[];
};

type UserRecord = {
  id: number;
  nombres: string;
  apellidos: string;
  correo: string;
  usuario: string;
  rolId: number;
  role: AppRole;
  estado: 'activo' | 'inactivo';
  cedula: string | null;
  telefono: string | null;
  permisos: Permission[];
};

type UserForm = {
  nombres: string;
  apellidos: string;
  correo: string;
  usuario: string;
  password: string;
  rolId: number;
  estado: 'activo' | 'inactivo';
  cedula: string;
  telefono: string;
  permisos: Permission[];
};

const permissionLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  importar: 'Importar',
  historial: 'Historial',
  resumen_diario: 'Resumen diario',
  reportes_mensual: 'Reportes mensuales',
  usuarios: 'Usuarios',
  parametros: 'Parámetros',
  auditoria: 'Auditoría',
  respaldos: 'Respaldos',
};

const blankForm: UserForm = {
  nombres: '',
  apellidos: '',
  correo: '',
  usuario: '',
  password: '',
  rolId: 0,
  estado: 'activo',
  cedula: '',
  telefono: '',
  permisos: [],
};

function roleLabel(role: AppRole) {
  const labels: Record<AppRole, string> = {
    asistente_rrhh: 'Asistente de RR.HH.',
    jefe_rrhh: 'Jefe de RR.HH.',
    administrador: 'Administrador',
  };
  return labels[role];
}

export function UsersPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [form, setForm] = useState<UserForm>(blankForm);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [usersResponse, rolesResponse] = await Promise.all([
        apiRequest<{ users: UserRecord[] }>('/users'),
        apiRequest<{ roles: RoleOption[] }>('/roles'),
      ]);
      setUsers(usersResponse.users);
      setRoles(rolesResponse.roles);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudieron cargar los usuarios.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    setPage(1);
  }, [query]);

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('es');
    if (!normalizedQuery) {
      return users;
    }
    return users.filter((user) =>
      `${user.usuario} ${user.nombres} ${user.apellidos} ${user.correo}`
        .toLocaleLowerCase('es')
        .includes(normalizedQuery),
    );
  }, [query, users]);
  const pageSize = 8;
  const pageCount = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const pageUsers = filteredUsers.slice((page - 1) * pageSize, page * pageSize);

  const openNewUser = () => {
    const defaultRole = roles.find((role) => role.nombre === 'asistente_rrhh') ?? roles[0];
    setEditingUser(null);
    setForm({
      ...blankForm,
      rolId: defaultRole?.id ?? 0,
      permisos: defaultRole?.permisosPredeterminados ?? [],
    });
    setModalOpen(true);
  };

  const openEditUser = (user: UserRecord) => {
    setEditingUser(user);
    setForm({
      nombres: user.nombres,
      apellidos: user.apellidos,
      correo: user.correo,
      usuario: user.usuario,
      password: '',
      rolId: user.rolId,
      estado: user.estado,
      cedula: user.cedula ?? '',
      telefono: user.telefono ?? '',
      permisos: user.permisos,
    });
    setModalOpen(true);
  };

  const setField = <K extends keyof UserForm>(key: K, value: UserForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleRoleChange = (roleId: number) => {
    const role = roles.find((option) => option.id === roleId);
    setForm((current) => ({
      ...current,
      rolId: roleId,
      permisos: role?.permisosPredeterminados ?? current.permisos,
    }));
  };

  const togglePermission = (module: string, action: keyof Omit<Permission, 'modulo'>, checked: boolean) => {
    setForm((current) => ({
      ...current,
      permisos: current.permisos.map((permission) =>
        permission.modulo === module ? { ...permission, [action]: checked } : permission,
      ),
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        cedula: form.cedula || undefined,
        telefono: form.telefono || undefined,
        password: form.password || undefined,
      };
      if (editingUser) {
        await apiRequest(`/users/${editingUser.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest('/users', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      setModalOpen(false);
      await loadData();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudo guardar el usuario.');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (user: UserRecord) => {
    const estado = user.estado === 'activo' ? 'inactivo' : 'activo';
    setError('');
    try {
      await apiRequest(`/users/${user.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ estado }),
      });
      await loadData();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudo actualizar el estado.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.22em] text-nettplus-blue">Administración</p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-900">Gestión de usuarios</h2>
        </div>
        <Button onClick={openNewUser} icon={<Plus className="h-4 w-4" />}>Nuevo usuario</Button>
      </div>

      {error ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      <Card className="p-0">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <h3 className="font-semibold text-slate-800">Usuarios registrados</h3>
          <label className="flex w-72 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
            <Search className="h-4 w-4" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full bg-transparent text-slate-800 outline-none"
              placeholder="Buscar usuario"
              aria-label="Buscar usuario"
            />
          </label>
        </div>
        {loading ? (
          <p className="px-5 py-8 text-center text-sm text-slate-500">Cargando usuarios...</p>
        ) : filteredUsers.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-500">No hay usuarios que coincidan con la búsqueda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th className="px-5 py-3">Usuario</th>
                  <th className="px-5 py-3">Nombres</th>
                  <th className="px-5 py-3">Correo</th>
                  <th className="px-5 py-3">Rol</th>
                  <th className="px-5 py-3">Estado</th>
                  <th className="px-5 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pageUsers.map((user) => (
                  <tr key={user.id} className="border-t border-slate-200 even:bg-nettplus-ice/40">
                    <td className="px-5 py-3 font-medium text-slate-900">{user.usuario}</td>
                    <td className="px-5 py-3">{user.nombres} {user.apellidos}</td>
                    <td className="px-5 py-3">{user.correo}</td>
                    <td className="px-5 py-3">{roleLabel(user.role)}</td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${user.estado === 'activo' ? 'bg-lime-100 text-lime-900' : 'bg-slate-100 text-slate-600'}`}>
                        {user.estado === 'activo' ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEditUser(user)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-nettplus-blue hover:bg-nettplus-ice" aria-label={`Editar ${user.usuario}`}>
                          <Pencil className="h-4 w-4" /> Editar
                        </button>
                        <button onClick={() => void toggleStatus(user)} className="rounded-md px-2 py-1 text-slate-600 hover:bg-slate-100">
                          {user.estado === 'activo' ? 'Desactivar' : 'Activar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && filteredUsers.length > 0 ? (
          <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3 text-sm text-slate-500">
            <span>{filteredUsers.length} usuario(s)</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="rounded-md border border-slate-200 px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Anterior
              </button>
              <span>Página {Math.min(page, pageCount)} de {pageCount}</span>
              <button
                type="button"
                disabled={page >= pageCount}
                onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
                className="rounded-md border border-slate-200 px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          </div>
        ) : null}
      </Card>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="presentation">
          <section role="dialog" aria-modal="true" aria-labelledby="user-form-title" className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-nettplus-ice text-nettplus-blue"><UserRound className="h-5 w-5" /></div>
                <h3 id="user-form-title" className="text-xl font-semibold text-slate-900">{editingUser ? 'Editar usuario' : 'Nuevo usuario'}</h3>
              </div>
              <button onClick={() => setModalOpen(false)} aria-label="Cerrar formulario" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 p-6">
              <div className="grid grid-cols-2 gap-4">
                {([
                  ['nombres', 'Nombres', 'text'],
                  ['apellidos', 'Apellidos', 'text'],
                  ['correo', 'Correo', 'email'],
                  ['usuario', 'Usuario', 'text'],
                  ['cedula', 'Cédula (opcional)', 'text'],
                  ['telefono', 'Teléfono (opcional)', 'tel'],
                ] as const).map(([field, label, type]) => (
                  <label key={field} className="space-y-1.5 text-sm font-medium text-slate-700">
                    {label}
                    <input
                      type={type}
                      required={!['cedula', 'telefono'].includes(field)}
                      maxLength={field === 'correo' ? 150 : 100}
                      value={form[field]}
                      onChange={(event) => setField(field, event.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 font-normal outline-none focus:border-nettplus-blue focus:ring-2 focus:ring-nettplus-blue/20"
                    />
                  </label>
                ))}
                <label className="space-y-1.5 text-sm font-medium text-slate-700">
                  Contraseña {editingUser ? '(dejar en blanco para mantenerla)' : ''}
                  <input
                    type="password"
                    required={!editingUser}
                    minLength={8}
                    maxLength={128}
                    autoComplete="new-password"
                    value={form.password}
                    onChange={(event) => setField('password', event.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 font-normal outline-none focus:border-nettplus-blue focus:ring-2 focus:ring-nettplus-blue/20"
                  />
                </label>
                <label className="space-y-1.5 text-sm font-medium text-slate-700">
                  Rol
                  <select
                    required
                    value={form.rolId}
                    onChange={(event) => handleRoleChange(Number(event.target.value))}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 font-normal outline-none focus:border-nettplus-blue focus:ring-2 focus:ring-nettplus-blue/20"
                  >
                    {roles.map((role) => <option key={role.id} value={role.id}>{roleLabel(role.nombre)}</option>)}
                  </select>
                </label>
                <label className="space-y-1.5 text-sm font-medium text-slate-700">
                  Estado
                  <select
                    value={form.estado}
                    onChange={(event) => setField('estado', event.target.value as UserForm['estado'])}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 font-normal outline-none focus:border-nettplus-blue focus:ring-2 focus:ring-nettplus-blue/20"
                  >
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                  </select>
                </label>
              </div>

              <div>
                <h4 className="mb-3 text-sm font-semibold text-slate-800">Permisos por módulo</h4>
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-2.5 text-left">Módulo</th>
                        <th className="px-3 py-2.5">Ver</th>
                        <th className="px-3 py-2.5">Crear</th>
                        <th className="px-3 py-2.5">Editar</th>
                        <th className="px-3 py-2.5">Exportar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.permisos.map((permission) => (
                        <tr key={permission.modulo} className="border-t border-slate-100">
                          <td className="px-4 py-2.5 font-medium text-slate-700">{permissionLabels[permission.modulo] ?? permission.modulo}</td>
                          {(['ver', 'crear', 'editar', 'exportar'] as const).map((action) => (
                            <td key={action} className="px-3 py-2.5 text-center">
                              <input
                                type="checkbox"
                                checked={permission[action]}
                                onChange={(event) => togglePermission(permission.modulo, action, event.target.checked)}
                                aria-label={`${permissionLabels[permission.modulo]}: ${action}`}
                                className="h-4 w-4 accent-nettplus-blue"
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
              <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
                <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}
