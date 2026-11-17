import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Pagination } from '../../components/ui/Pagination';
import { apiRequest } from '../../lib/api';

type Department = { id: number; nombre: string };
type DailyRecord = {
  fecha: string;
  departamentoId: number;
  departamento: string;
  colaboradores: number;
  presentes: number;
  puntuales: number;
  atrasos: number;
  tardanzas: number;
  ausencias: number;
  novedades: number;
  pendientesRevision: number;
  minutosAtraso: number;
};
type Overall = Omit<DailyRecord, 'fecha' | 'departamentoId' | 'departamento'>;
type PaginationInfo = { page: number; pageSize: number; total: number; totalPages: number };

function formatDate(value: string) {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString('es-EC', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'UTC',
  });
}

export function DailySummaryPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [overall, setOverall] = useState<Overall>({
    colaboradores: 0,
    presentes: 0,
    puntuales: 0,
    atrasos: 0,
    tardanzas: 0,
    ausencias: 0,
    novedades: 0,
    pendientesRevision: 0,
    minutosAtraso: 0,
  });
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadSummary = useCallback(async (nextPage = page) => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams({
      page: String(nextPage),
      pageSize: '20',
    });
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    if (departmentId) params.set('departmentId', departmentId);

    try {
      const response = await apiRequest<{
        records: DailyRecord[];
        overall: Overall;
        pagination: PaginationInfo;
      }>(`/attendance/daily?${params.toString()}`);
      setRecords(response.records);
      setOverall(response.overall);
      setPagination(response.pagination);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudo cargar el resumen diario.');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, departmentId, page]);

  useEffect(() => {
    void apiRequest<{ departments: Department[] }>('/attendance/options')
      .then((response) => setDepartments(response.departments))
      .catch((caughtError) => setError(caughtError instanceof Error ? caughtError.message : 'No se pudieron cargar los departamentos.'));
  }, []);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const submitFilters = (event: FormEvent) => {
    event.preventDefault();
    setPage(1);
    void loadSummary(1);
  };

  const clearFilters = () => {
    setDateFrom('');
    setDateTo('');
    setDepartmentId('');
    setPage(1);
  };

  const cards = [
    ['Colaboradores', overall.colaboradores],
    ['Presentes', overall.presentes],
    ['Puntuales', overall.puntuales],
    ['Atrasos', overall.atrasos],
    ['Ausencias', overall.ausencias],
    ['Minutos de atraso', overall.minutosAtraso],
  ];

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm uppercase tracking-[0.18em] text-nettplus-blue">Asistencia</p>
        <h2 className="mt-1 text-2xl font-semibold text-slate-900">Resumen diario</h2>
        <p className="mt-1 text-sm text-slate-500">Consolidado por fecha y departamento.</p>
      </div>

      <Card>
        <form onSubmit={submitFilters} className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_auto]">
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
          <div className="flex items-end gap-2">
            <Button type="submit">Aplicar</Button>
            <Button type="button" variant="secondary" onClick={clearFilters}>Limpiar</Button>
          </div>
        </form>
      </Card>

      {error ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {cards.map(([label, value]) => (
          <Card key={String(label)} className="p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-3">Fecha</th>
                <th className="px-5 py-3">Departamento</th>
                <th className="px-5 py-3">Colaboradores</th>
                <th className="px-5 py-3">Presentes</th>
                <th className="px-5 py-3">Puntuales</th>
                <th className="px-5 py-3">Atrasos</th>
                <th className="px-5 py-3">Ausencias</th>
                <th className="px-5 py-3">Novedades</th>
                <th className="px-5 py-3">Revisión</th>
              </tr>
            </thead>
            <tbody>
              {!loading && records.map((record) => (
                <tr key={`${record.fecha}-${record.departamentoId}`} className="border-t border-slate-100">
                  <td className="px-5 py-3">{formatDate(record.fecha)}</td>
                  <td className="px-5 py-3 font-medium">{record.departamento}</td>
                  <td className="px-5 py-3">{record.colaboradores}</td>
                  <td className="px-5 py-3">{record.presentes}</td>
                  <td className="px-5 py-3">{record.puntuales}</td>
                  <td className="px-5 py-3">{record.atrasos + record.tardanzas}</td>
                  <td className="px-5 py-3">{record.ausencias}</td>
                  <td className="px-5 py-3">{record.novedades}</td>
                  <td className="px-5 py-3">{record.pendientesRevision}</td>
                </tr>
              ))}
              {!loading && records.length === 0 ? (
                <tr><td colSpan={9} className="px-5 py-10 text-center text-slate-500">No hay datos para los filtros seleccionados.</td></tr>
              ) : null}
              {loading ? (
                <tr><td colSpan={9} className="px-5 py-10 text-center text-slate-500">Cargando resumen...</td></tr>
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
            void loadSummary(nextPage);
          }}
        />
      </Card>
    </div>
  );
}
