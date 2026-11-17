import { Search } from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Pagination } from '../../components/ui/Pagination';
import { apiRequest } from '../../lib/api';

type Department = { id: number; nombre: string };
type Collaborator = {
  id: number;
  codigo: string;
  nombres: string;
  apellidos: string;
  departamentoId: number;
};
type HistoryRecord = {
  colaboradorId: number;
  codigo: string;
  nombres: string;
  apellidos: string;
  departamentoId: number;
  departamento: string;
  fecha: string;
  horaEntrada: string | null;
  horaSalida: string | null;
  minutosAtraso: number;
  estado: string;
  novedad: string | null;
  pendienteRevision: boolean;
};
type HistoryPagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

const statusLabels: Record<string, string> = {
  puntual: 'Puntual',
  atraso: 'Atraso',
  tardanza: 'Tardanza',
  ausencia: 'Ausencia',
  novedad: 'Novedad',
};

function formatDate(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return date.toLocaleDateString('es-EC', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'UTC',
  });
}

export function HistoryPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [pagination, setPagination] = useState<HistoryPagination>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [collaboratorId, setCollaboratorId] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadHistory = useCallback(async (nextPage = page) => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams({
      page: String(nextPage),
      pageSize: '20',
    });
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    if (departmentId) params.set('departmentId', departmentId);
    if (collaboratorId) params.set('collaboratorId', collaboratorId);
    if (status) params.set('status', status);
    if (search.trim()) params.set('search', search.trim());

    try {
      const response = await apiRequest<{ records: HistoryRecord[]; pagination: HistoryPagination }>(
        `/attendance/history?${params.toString()}`,
      );
      setRecords(response.records);
      setPagination(response.pagination);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudo cargar el historial.');
    } finally {
      setLoading(false);
    }
  }, [collaboratorId, dateFrom, dateTo, departmentId, page, search, status]);

  useEffect(() => {
    void apiRequest<{ departments: Department[]; collaborators: Collaborator[] }>('/attendance/options')
      .then((response) => {
        setDepartments(response.departments);
        setCollaborators(response.collaborators);
      })
      .catch((caughtError) => {
        setError(caughtError instanceof Error ? caughtError.message : 'No se pudieron cargar los filtros.');
      });
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const submitFilters = (event: FormEvent) => {
    event.preventDefault();
    setPage(1);
    void loadHistory(1);
  };

  const clearFilters = () => {
    setDateFrom('');
    setDateTo('');
    setDepartmentId('');
    setCollaboratorId('');
    setStatus('');
    setSearch('');
    setPage(1);
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm uppercase tracking-[0.18em] text-nettplus-blue">Asistencia</p>
        <h2 className="mt-1 text-2xl font-semibold text-slate-900">Historial de asistencia</h2>
        <p className="mt-1 text-sm text-slate-500">Consulta consolidada por colaborador y fecha.</p>
      </div>

      <Card>
        <form onSubmit={submitFilters} className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <label className="space-y-1 text-sm font-medium text-slate-700">
            Desde
            <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal" />
          </label>
          <label className="space-y-1 text-sm font-medium text-slate-700">
            Hasta
            <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal" />
          </label>
          <label className="space-y-1 text-sm font-medium text-slate-700">
            Departamento
            <select value={departmentId} onChange={(event) => setDepartmentId(event.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal">
              <option value="">Todos</option>
              {departments.map((department) => <option key={department.id} value={department.id}>{department.nombre}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-sm font-medium text-slate-700">
            Colaborador
            <select value={collaboratorId} onChange={(event) => setCollaboratorId(event.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal">
              <option value="">Todos</option>
              {collaborators
                .filter((collaborator) => !departmentId || collaborator.departamentoId === Number(departmentId))
                .map((collaborator) => (
                  <option key={collaborator.id} value={collaborator.id}>
                    {collaborator.codigo} - {collaborator.nombres} {collaborator.apellidos}
                  </option>
                ))}
            </select>
          </label>
          <label className="space-y-1 text-sm font-medium text-slate-700">
            Estado
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal">
              <option value="">Todos</option>
              <option value="puntual">Puntual</option>
              <option value="atraso">Atraso</option>
              <option value="tardanza">Tardanza</option>
              <option value="ausencia">Ausencia</option>
              <option value="novedad">Novedad</option>
            </select>
          </label>
          <label className="space-y-1 text-sm font-medium text-slate-700">
            Buscar
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
              <Search className="h-4 w-4 text-slate-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} className="min-w-0 flex-1 bg-transparent outline-none" placeholder="Código, nombre o novedad" />
            </div>
          </label>
          <div className="flex items-end gap-2 md:col-span-2 xl:col-span-6">
            <Button type="submit">Aplicar filtros</Button>
            <Button type="button" variant="secondary" onClick={clearFilters}>Limpiar</Button>
          </div>
        </form>
      </Card>

      {error ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-3">Fecha</th>
                <th className="px-5 py-3">Código</th>
                <th className="px-5 py-3">Colaborador</th>
                <th className="px-5 py-3">Departamento</th>
                <th className="px-5 py-3">Entrada</th>
                <th className="px-5 py-3">Salida</th>
                <th className="px-5 py-3">Atraso</th>
                <th className="px-5 py-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {!loading && records.map((record) => (
                <tr key={`${record.colaboradorId}-${record.fecha}`} className="border-t border-slate-100">
                  <td className="px-5 py-3">{formatDate(record.fecha)}</td>
                  <td className="px-5 py-3 font-medium">{record.codigo}</td>
                  <td className="px-5 py-3">{record.nombres} {record.apellidos}</td>
                  <td className="px-5 py-3">{record.departamento}</td>
                  <td className="px-5 py-3">{record.horaEntrada ?? '-'}</td>
                  <td className="px-5 py-3">{record.horaSalida ?? '-'}</td>
                  <td className="px-5 py-3">{record.minutosAtraso} min</td>
                  <td className="px-5 py-3">
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                      {statusLabels[record.estado] ?? record.estado}
                    </span>
                    {record.novedad ? <span className="block mt-1 text-xs text-slate-500">{record.novedad}</span> : null}
                    {record.pendienteRevision ? <span className="block mt-1 text-xs text-amber-700">Pendiente de revisión</span> : null}
                  </td>
                </tr>
              ))}
              {!loading && records.length === 0 ? (
                <tr><td colSpan={8} className="px-5 py-10 text-center text-slate-500">No hay registros que coincidan con los filtros.</td></tr>
              ) : null}
              {loading ? (
                <tr><td colSpan={8} className="px-5 py-10 text-center text-slate-500">Cargando historial...</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <Pagination
          page={pagination.page}
          pageSize={pagination.pageSize}
          total={pagination.total}
          totalPages={pagination.totalPages}
          onPageChange={(nextPage) => {
            setPage(nextPage);
            void loadHistory(nextPage);
          }}
        />
      </Card>
    </div>
  );
}
