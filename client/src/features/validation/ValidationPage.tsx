import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Pagination } from '../../components/ui/Pagination';
import { apiRequest } from '../../lib/api';

type ReviewRecord = {
  colaboradorId: number;
  codigo: string;
  nombres: string;
  apellidos: string;
  departamento: string;
  fecha: string;
  horaEntrada: string | null;
  horaSalida: string | null;
  minutosAtraso: number;
  estado: string;
  novedad: string | null;
  pendienteRevision: boolean;
};
type PaginationInfo = { page: number; pageSize: number; total: number; totalPages: number };

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleDateString('es-EC', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'UTC' })
    : value;
}

function isoDate(value: string) {
  return new Date(value).toISOString().slice(0, 10);
}

export function ValidationPage() {
  const [records, setRecords] = useState<ReviewRecord[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [pendingOnly, setPendingOnly] = useState(true);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState('');
  const [editing, setEditing] = useState<ReviewRecord | null>(null);
  const [estado, setEstado] = useState('puntual');
  const [minutosAtraso, setMinutosAtraso] = useState(0);
  const [novedad, setNovedad] = useState('');
  const [cerrarRevision, setCerrarRevision] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadRecords = useCallback(async (nextPage = page) => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams({
      page: String(nextPage),
      pageSize: '20',
      pendingOnly: pendingOnly ? 'true' : 'false',
    });
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    try {
      const response = await apiRequest<{ records: ReviewRecord[]; pagination: PaginationInfo }>(
        `/attendance/review?${params.toString()}`,
      );
      setRecords(response.records);
      setPagination(response.pagination);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudo cargar la validación.');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, page, pendingOnly]);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  const submitFilters = (event: FormEvent) => {
    event.preventDefault();
    setPage(1);
    void loadRecords(1);
  };

  const openEdit = (record: ReviewRecord) => {
    setEditing(record);
    setEstado(record.estado);
    setMinutosAtraso(record.minutosAtraso);
    setNovedad(record.novedad ?? '');
    setCerrarRevision(true);
    setError('');
    setNotice('');
  };

  const saveReview = async (event: FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    setSavingId(`${editing.colaboradorId}-${editing.fecha}`);
    setError('');
    setNotice('');
    try {
      await apiRequest(`/attendance/review/${editing.colaboradorId}/${isoDate(editing.fecha)}`, {
        method: 'PATCH',
        body: JSON.stringify({
          estado,
          minutosAtraso,
          novedad,
          pendienteRevision: !cerrarRevision,
        }),
      });
      setNotice('Registro corregido y auditoría actualizada.');
      setEditing(null);
      await loadRecords(page);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudo guardar la validación.');
    } finally {
      setSavingId('');
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm uppercase tracking-[0.18em] text-nettplus-blue">Asistencia</p>
        <h2 className="mt-1 text-2xl font-semibold text-slate-900">Validación de marcaciones</h2>
        <p className="mt-1 text-sm text-slate-500">Revisa y corrige registros diarios pendientes.</p>
      </div>

      <Card>
        <form onSubmit={submitFilters} className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_auto_auto]">
          <label className="space-y-1 text-sm font-medium text-slate-700">
            Desde
            <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal" />
          </label>
          <label className="space-y-1 text-sm font-medium text-slate-700">
            Hasta
            <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal" />
          </label>
          <label className="flex items-end gap-2 pb-2 text-sm font-medium text-slate-700">
            <input type="checkbox" checked={pendingOnly} onChange={(event) => setPendingOnly(event.target.checked)} />
            Solo pendientes
          </label>
          <div className="flex items-end">
            <Button type="submit">Aplicar</Button>
          </div>
        </form>
      </Card>

      {error ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      {notice ? <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p> : null}

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-3">Fecha</th>
                <th className="px-5 py-3">Colaborador</th>
                <th className="px-5 py-3">Departamento</th>
                <th className="px-5 py-3">Entrada</th>
                <th className="px-5 py-3">Salida</th>
                <th className="px-5 py-3">Estado</th>
                <th className="px-5 py-3">Acción</th>
              </tr>
            </thead>
            <tbody>
              {!loading && records.map((record) => (
                <tr key={`${record.colaboradorId}-${record.fecha}`} className="border-t border-slate-100">
                  <td className="px-5 py-3">{formatDate(record.fecha)}</td>
                  <td className="px-5 py-3 font-medium">{record.codigo}<span className="block text-xs text-slate-500">{record.nombres} {record.apellidos}</span></td>
                  <td className="px-5 py-3">{record.departamento}</td>
                  <td className="px-5 py-3">{record.horaEntrada ?? '-'}</td>
                  <td className="px-5 py-3">{record.horaSalida ?? '-'}</td>
                  <td className="px-5 py-3">{record.estado}{record.novedad ? <span className="block text-xs text-slate-500">{record.novedad}</span> : null}</td>
                  <td className="px-5 py-3">
                    <Button type="button" variant="secondary" onClick={() => openEdit(record)}>Revisar</Button>
                  </td>
                </tr>
              ))}
              {!loading && records.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-500">No hay registros pendientes de revisión.</td></tr>
              ) : null}
              {loading ? (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-500">Cargando validaciones...</td></tr>
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
            void loadRecords(nextPage);
          }}
        />
      </Card>

      {editing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <Card className="w-full max-w-lg">
            <form onSubmit={saveReview} className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">Revisar registro</h3>
                <p className="text-sm text-slate-500">{editing.codigo} · {editing.nombres} {editing.apellidos} · {formatDate(editing.fecha)}</p>
              </div>
              <label className="block space-y-1 text-sm font-medium">
                Estado
                <select value={estado} onChange={(event) => setEstado(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5">
                  <option value="puntual">Puntual</option>
                  <option value="atraso">Atraso</option>
                  <option value="tardanza">Tardanza</option>
                  <option value="ausencia">Ausencia</option>
                  <option value="novedad">Novedad</option>
                </select>
              </label>
              <label className="block space-y-1 text-sm font-medium">
                Minutos de atraso
                <input type="number" min={0} max={1440} value={minutosAtraso} onChange={(event) => setMinutosAtraso(Number(event.target.value))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5" />
              </label>
              <label className="block space-y-1 text-sm font-medium">
                Novedad
                <textarea maxLength={180} value={novedad} onChange={(event) => setNovedad(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5" />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={cerrarRevision} onChange={(event) => setCerrarRevision(event.target.checked)} />
                Cerrar revisión
              </label>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => setEditing(null)}>Cancelar</Button>
                <Button type="submit" disabled={savingId !== ''}>Guardar revisión</Button>
              </div>
            </form>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
