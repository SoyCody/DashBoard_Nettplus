import { Pencil, Plus, Search, Settings2, X } from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Pagination } from '../../components/ui/Pagination';
import { apiRequest } from '../../lib/api';

type Department = { id: number; nombre: string };
type Shift = { id: number; nombre: string; horaEntrada: string; horaSalida: string; diasLaborables: string };
type Collaborator = {
  id: number;
  codigo: string;
  nombres: string;
  apellidos: string;
  departamentoId: number;
  departamento: string;
  turnoId: number;
  turno: string;
  estadoLaboral: 'activo' | 'inactivo';
};
type CollaboratorForm = {
  codigo: string;
  nombres: string;
  apellidos: string;
  departamentoId: number;
  turnoId: number;
  estadoLaboral: 'activo' | 'inactivo';
};
type ShiftForm = Omit<Shift, 'id'>;
type ParametersForm = {
  tolerancia_atraso_minutos: string;
  inactividad_sesion_minutos: string;
};
type Tab = 'colaboradores' | 'turnos' | 'tolerancias';
type CollaboratorPagination = { page: number; pageSize: number; total: number; totalPages: number };

const emptyCollaborator: CollaboratorForm = {
  codigo: '',
  nombres: '',
  apellidos: '',
  departamentoId: 0,
  turnoId: 0,
  estadoLaboral: 'activo',
};
const emptyShift: ShiftForm = {
  nombre: '',
  horaEntrada: '08:00',
  horaSalida: '17:00',
  diasLaborables: 'L,M,Mi,J,V',
};

export function SettingsPage() {
  const [tab, setTab] = useState<Tab>('colaboradores');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [collaboratorPage, setCollaboratorPage] = useState(1);
  const [collaboratorPagination, setCollaboratorPagination] = useState<CollaboratorPagination>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [parameters, setParameters] = useState<ParametersForm>({
    tolerancia_atraso_minutos: '',
    inactividad_sesion_minutos: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const [collaboratorModal, setCollaboratorModal] = useState(false);
  const [shiftModal, setShiftModal] = useState(false);
  const [editingCollaborator, setEditingCollaborator] = useState<Collaborator | null>(null);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [collaboratorForm, setCollaboratorForm] = useState<CollaboratorForm>(emptyCollaborator);
  const [shiftForm, setShiftForm] = useState<ShiftForm>(emptyShift);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [departmentResponse, collaboratorResponse, shiftResponse, parameterResponse] = await Promise.all([
        apiRequest<{ departments: Department[] }>('/departments'),
        apiRequest<{ collaborators: Collaborator[]; pagination: CollaboratorPagination }>(
          `/collaborators?page=${collaboratorPage}&pageSize=20&search=${encodeURIComponent(query)}`,
        ),
        apiRequest<{ shifts: Shift[] }>('/shifts'),
        apiRequest<{ parameters: ParametersForm }>('/parameters'),
      ]);
      setDepartments(departmentResponse.departments);
      setCollaborators(collaboratorResponse.collaborators);
      setCollaboratorPagination(collaboratorResponse.pagination);
      setShifts(shiftResponse.shifts);
      setParameters(parameterResponse.parameters);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudo cargar la configuración.');
    } finally {
      setLoading(false);
    }
  }, [collaboratorPage, query]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const openNewCollaborator = () => {
    setEditingCollaborator(null);
    setCollaboratorForm({
      ...emptyCollaborator,
      departamentoId: departments[0]?.id ?? 0,
      turnoId: shifts[0]?.id ?? 0,
    });
    setCollaboratorModal(true);
  };

  const openEditCollaborator = (person: Collaborator) => {
    setEditingCollaborator(person);
    setCollaboratorForm({
      codigo: person.codigo,
      nombres: person.nombres,
      apellidos: person.apellidos,
      departamentoId: person.departamentoId,
      turnoId: person.turnoId,
      estadoLaboral: person.estadoLaboral,
    });
    setCollaboratorModal(true);
  };

  const openNewShift = () => {
    setEditingShift(null);
    setShiftForm(emptyShift);
    setShiftModal(true);
  };

  const openEditShift = (shift: Shift) => {
    setEditingShift(shift);
    setShiftForm({
      nombre: shift.nombre,
      horaEntrada: shift.horaEntrada,
      horaSalida: shift.horaSalida,
      diasLaborables: shift.diasLaborables,
    });
    setShiftModal(true);
  };

  const saveCollaborator = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await apiRequest(editingCollaborator ? `/collaborators/${editingCollaborator.id}` : '/collaborators', {
        method: editingCollaborator ? 'PUT' : 'POST',
        body: JSON.stringify(collaboratorForm),
      });
      setCollaboratorModal(false);
      setNotice(editingCollaborator ? 'Colaborador actualizado.' : 'Colaborador creado.');
      await loadData();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudo guardar el colaborador.');
    } finally {
      setSaving(false);
    }
  };

  const toggleCollaboratorStatus = async (person: Collaborator) => {
    setError('');
    setNotice('');
    try {
      const nextState = person.estadoLaboral === 'activo' ? 'inactivo' : 'activo';
      await apiRequest(`/collaborators/${person.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ estadoLaboral: nextState }),
      });
      setNotice(`Colaborador ${nextState === 'activo' ? 'activado' : 'desactivado'}.`);
      await loadData();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudo actualizar el estado.');
    }
  };

  const saveShift = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await apiRequest(editingShift ? `/shifts/${editingShift.id}` : '/shifts', {
        method: editingShift ? 'PUT' : 'POST',
        body: JSON.stringify(shiftForm),
      });
      setShiftModal(false);
      setNotice(editingShift ? 'Turno actualizado.' : 'Turno creado.');
      await loadData();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudo guardar el turno.');
    } finally {
      setSaving(false);
    }
  };

  const saveParameters = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const payload = {
        tolerancia_atraso_minutos: Number(parameters.tolerancia_atraso_minutos),
        inactividad_sesion_minutos: Number(parameters.inactividad_sesion_minutos),
      };
      await apiRequest('/parameters', { method: 'PUT', body: JSON.stringify(payload) });
      setNotice('Parámetros guardados correctamente.');
      await loadData();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudieron guardar los parámetros.');
    } finally {
      setSaving(false);
    }
  };

  const tabs: Array<{ key: Tab; label: string }> = [
    { key: 'colaboradores', label: 'Colaboradores' },
    { key: 'turnos', label: 'Horarios y turnos' },
    { key: 'tolerancias', label: 'Tolerancias de atraso' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.22em] text-nettplus-blue">Administración</p>
        <h2 className="mt-2 text-3xl font-semibold text-slate-900">Parámetros y colaboradores</h2>
      </div>

      <div className="flex gap-2 border-b border-slate-200">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`border-b-2 px-4 py-3 text-sm font-medium transition ${
              tab === key ? 'border-nettplus-blue text-nettplus-blue' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
      {notice ? <p role="status" className="rounded-lg border border-lime-200 bg-lime-50 px-4 py-3 text-sm text-lime-900">{notice}</p> : null}

      {tab === 'colaboradores' ? (
        <Card className="p-0">
          <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
            <div>
              <h3 className="font-semibold text-slate-800">Colaboradores</h3>
              <p className="mt-1 text-sm text-slate-500">Gestiona colaboradores, departamento, turno y estado laboral.</p>
            </div>
            <Button onClick={openNewCollaborator} disabled={!departments.length || !shifts.length} icon={<Plus className="h-4 w-4" />}>
              Nuevo colaborador
            </Button>
          </div>
          <div className="border-b border-slate-200 px-5 py-3">
            <label className="flex max-w-sm items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
              <Search className="h-4 w-4" />
              <input value={query} onChange={(event) => { setCollaboratorPage(1); setQuery(event.target.value); }} className="w-full bg-transparent text-slate-800 outline-none" placeholder="Buscar colaborador" aria-label="Buscar colaborador" />
            </label>
          </div>
          {loading ? <p className="px-5 py-8 text-center text-sm text-slate-500">Cargando colaboradores...</p> : collaborators.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-500">No se encontraron colaboradores.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Código</th><th className="px-5 py-3">Colaborador</th><th className="px-5 py-3">Departamento</th><th className="px-5 py-3">Turno</th><th className="px-5 py-3">Estado</th><th className="px-5 py-3">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {collaborators.map((person) => (
                    <tr key={person.id} className="border-t border-slate-200 even:bg-nettplus-ice/40">
                      <td className="px-5 py-3 font-medium text-slate-900">{person.codigo}</td>
                      <td className="px-5 py-3">{person.nombres} {person.apellidos}</td>
                      <td className="px-5 py-3">{person.departamento}</td>
                      <td className="px-5 py-3">{person.turno}</td>
                      <td className="px-5 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${person.estadoLaboral === 'activo' ? 'bg-lime-100 text-lime-900' : 'bg-slate-100 text-slate-600'}`}>{person.estadoLaboral === 'activo' ? 'Activo' : 'Inactivo'}</span></td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => openEditCollaborator(person)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-nettplus-blue hover:bg-nettplus-ice" aria-label={`Editar ${person.codigo}`}><Pencil className="h-4 w-4" /> Editar</button>
                          <button onClick={() => void toggleCollaboratorStatus(person)} className="rounded-md px-2 py-1 text-slate-600 hover:bg-slate-100">{person.estadoLaboral === 'activo' ? 'Desactivar' : 'Activar'}</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!loading ? (
            <Pagination
              page={collaboratorPagination.page}
              pageSize={collaboratorPagination.pageSize}
              total={collaboratorPagination.total}
              totalPages={collaboratorPagination.totalPages}
              onPageChange={setCollaboratorPage}
            />
          ) : null}
        </Card>
      ) : null}

      {tab === 'turnos' ? (
        <Card className="p-0">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div><h3 className="font-semibold text-slate-800">Horarios y turnos</h3><p className="mt-1 text-sm text-slate-500">Configura entradas, salidas y días laborables.</p></div>
            <Button onClick={openNewShift} icon={<Plus className="h-4 w-4" />}>Nuevo turno</Button>
          </div>
          {loading ? <p className="px-5 py-8 text-center text-sm text-slate-500">Cargando turnos...</p> : shifts.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-500">No hay turnos configurados.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Turno</th><th className="px-5 py-3">Hora de entrada</th><th className="px-5 py-3">Hora de salida</th><th className="px-5 py-3">Días laborables</th><th className="px-5 py-3">Acciones</th></tr></thead>
                <tbody>{shifts.map((shift) => <tr key={shift.id} className="border-t border-slate-200 even:bg-nettplus-ice/40"><td className="px-5 py-3 font-medium text-slate-900">{shift.nombre}</td><td className="px-5 py-3">{shift.horaEntrada}</td><td className="px-5 py-3">{shift.horaSalida}</td><td className="px-5 py-3">{shift.diasLaborables}</td><td className="px-5 py-3"><button onClick={() => openEditShift(shift)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-nettplus-blue hover:bg-nettplus-ice"><Pencil className="h-4 w-4" /> Editar</button></td></tr>)}</tbody>
              </table>
            </div>
          )}
        </Card>
      ) : null}

      {tab === 'tolerancias' ? (
        <Card className="max-w-3xl">
          <div className="mb-6 flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-nettplus-ice text-nettplus-blue"><Settings2 className="h-5 w-5" /></div>
            <div><h3 className="font-semibold text-slate-800">Tolerancias y sesión</h3><p className="mt-1 text-sm text-slate-500">Estos valores se guardan en la base de datos y se aplican al iniciar o renovar una sesión.</p></div>
          </div>
          {loading ? <p className="py-6 text-sm text-slate-500">Cargando parámetros...</p> : (
            <form onSubmit={saveParameters} className="space-y-5">
              <label className="block max-w-md space-y-1.5 text-sm font-medium text-slate-700">
                Tolerancia de atraso (minutos)
                <input type="number" min={0} max={240} step={1} required value={parameters.tolerancia_atraso_minutos} onChange={(event) => setParameters((current) => ({ ...current, tolerancia_atraso_minutos: event.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-nettplus-blue focus:ring-2 focus:ring-nettplus-blue/20" />
                <span className="block text-xs font-normal text-slate-500">Rango permitido: 0 a 240 minutos.</span>
              </label>
              <label className="block max-w-md space-y-1.5 text-sm font-medium text-slate-700">
                Inactividad de sesión (minutos)
                <input type="number" min={1} max={1440} step={1} required value={parameters.inactividad_sesion_minutos} onChange={(event) => setParameters((current) => ({ ...current, inactividad_sesion_minutos: event.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-nettplus-blue focus:ring-2 focus:ring-nettplus-blue/20" />
                <span className="block text-xs font-normal text-slate-500">Rango permitido: 1 a 1440 minutos.</span>
              </label>
              <Button type="submit" disabled={saving}>{saving ? 'Guardando...' : 'Guardar parámetros'}</Button>
            </form>
          )}
        </Card>
      ) : null}

      {collaboratorModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <section role="dialog" aria-modal="true" aria-labelledby="collaborator-title" className="w-full max-w-2xl rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4"><h3 id="collaborator-title" className="text-xl font-semibold text-slate-900">{editingCollaborator ? 'Editar colaborador' : 'Nuevo colaborador'}</h3><button onClick={() => setCollaboratorModal(false)} aria-label="Cerrar formulario" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
            <form onSubmit={saveCollaborator} className="space-y-5 p-6">
              <div className="grid grid-cols-2 gap-4">
                {(['codigo', 'nombres', 'apellidos'] as const).map((field) => <label key={field} className="space-y-1.5 text-sm font-medium capitalize text-slate-700">{field}<input required maxLength={field === 'codigo' ? 30 : 100} value={collaboratorForm[field]} onChange={(event) => setCollaboratorForm((current) => ({ ...current, [field]: event.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-nettplus-blue focus:ring-2 focus:ring-nettplus-blue/20" /></label>)}
                <label className="space-y-1.5 text-sm font-medium text-slate-700">Departamento<select required value={collaboratorForm.departamentoId} onChange={(event) => setCollaboratorForm((current) => ({ ...current, departamentoId: Number(event.target.value) }))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 font-normal"><option value={0} disabled>Seleccione departamento</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.nombre}</option>)}</select></label>
                <label className="space-y-1.5 text-sm font-medium text-slate-700">Turno<select required value={collaboratorForm.turnoId} onChange={(event) => setCollaboratorForm((current) => ({ ...current, turnoId: Number(event.target.value) }))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 font-normal"><option value={0} disabled>Seleccione turno</option>{shifts.map((shift) => <option key={shift.id} value={shift.id}>{shift.nombre}</option>)}</select></label>
                <label className="space-y-1.5 text-sm font-medium text-slate-700">Estado laboral<select value={collaboratorForm.estadoLaboral} onChange={(event) => setCollaboratorForm((current) => ({ ...current, estadoLaboral: event.target.value as CollaboratorForm['estadoLaboral'] }))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 font-normal"><option value="activo">Activo</option><option value="inactivo">Inactivo</option></select></label>
              </div>
              {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
              <div className="flex justify-end gap-3 border-t border-slate-200 pt-4"><Button type="button" variant="secondary" onClick={() => setCollaboratorModal(false)}>Cancelar</Button><Button type="submit" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button></div>
            </form>
          </section>
        </div>
      ) : null}

      {shiftModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <section role="dialog" aria-modal="true" aria-labelledby="shift-title" className="w-full max-w-xl rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4"><h3 id="shift-title" className="text-xl font-semibold text-slate-900">{editingShift ? 'Editar turno' : 'Nuevo turno'}</h3><button onClick={() => setShiftModal(false)} aria-label="Cerrar formulario" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
            <form onSubmit={saveShift} className="space-y-5 p-6">
              <label className="block space-y-1.5 text-sm font-medium text-slate-700">Nombre del turno<input required maxLength={80} value={shiftForm.nombre} onChange={(event) => setShiftForm((current) => ({ ...current, nombre: event.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-nettplus-blue focus:ring-2 focus:ring-nettplus-blue/20" /></label>
              <div className="grid grid-cols-2 gap-4">
                <label className="space-y-1.5 text-sm font-medium text-slate-700">Hora de entrada<input type="time" required value={shiftForm.horaEntrada} onChange={(event) => setShiftForm((current) => ({ ...current, horaEntrada: event.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal" /></label>
                <label className="space-y-1.5 text-sm font-medium text-slate-700">Hora de salida<input type="time" required value={shiftForm.horaSalida} onChange={(event) => setShiftForm((current) => ({ ...current, horaSalida: event.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal" /></label>
              </div>
              <label className="block space-y-1.5 text-sm font-medium text-slate-700">Días laborables<input required maxLength={30} value={shiftForm.diasLaborables} onChange={(event) => setShiftForm((current) => ({ ...current, diasLaborables: event.target.value }))} placeholder="L,M,Mi,J,V" className="w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-nettplus-blue focus:ring-2 focus:ring-nettplus-blue/20" /><span className="block text-xs font-normal text-slate-500">Separados por coma; conserva el formato de los turnos existentes.</span></label>
              {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
              <div className="flex justify-end gap-3 border-t border-slate-200 pt-4"><Button type="button" variant="secondary" onClick={() => setShiftModal(false)}>Cancelar</Button><Button type="submit" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button></div>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}
