import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, Upload } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Pagination } from '../../components/ui/Pagination';
import { apiEventStreamRequest, apiRequest, downloadApiFile, type RequestProgress } from '../../lib/api';

type ImportIssue = {
  fila: number;
  codigo: string | null;
  motivo: string;
};

type ImportSummary = {
  archivo: string;
  periodoMes: number;
  periodoAnio: number;
  total: number;
  cargados: number;
  omitidos: number;
  conErrores: number;
  filasValidas: Array<{
    fila: number;
    codigo: string;
    colaborador: string;
    fecha: string;
    hora: string;
    tipo: 'entrada' | 'salida';
  }>;
  errores: ImportIssue[];
  duplicados: ImportIssue[];
  detallesTruncados: boolean;
};

type ImportRecord = {
  id: number;
  fechaHora: string;
  archivo: string;
  periodoMes: number;
  periodoAnio: number;
  total: number;
  cargados: number;
  omitidos: number;
  conErrores: number;
  estado: string;
};
type ImportPagination = { page: number; pageSize: number; total: number; totalPages: number };
type ImportUiProgress = RequestProgress | { phase: 'complete'; completed: 1; total: 1 };

type ImportAnalysis = {
  summary: ImportSummary;
  mode: 'preview' | 'processed';
};

const monthNames = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function currentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function formatPeriod(month: number, year: number) {
  return `${monthNames[month - 1]} ${year}`;
}

function periodFormData(file: File, period: string) {
  const [year, month] = period.split('-').map(Number);
  const data = new FormData();
  data.append('archivo', file);
  data.append('periodoMes', String(month));
  data.append('periodoAnio', String(year));
  return data;
}

function CountCard({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className={`rounded-lg px-4 py-3 ${tone}`}>
      <p className="text-sm">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value.toLocaleString('es')}</p>
    </div>
  );
}

export function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [period, setPeriod] = useState(currentPeriod);
  const [analysis, setAnalysis] = useState<ImportAnalysis | null>(null);
  const [imports, setImports] = useState<ImportRecord[]>([]);
  const [importsPage, setImportsPage] = useState(1);
  const [importsPagination, setImportsPagination] = useState<ImportPagination>({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0,
  });
  const [loadingImports, setLoadingImports] = useState(true);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<ImportUiProgress | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [fileInputVersion, setFileInputVersion] = useState(0);

  const loadImports = useCallback(async (page = importsPage) => {
    setLoadingImports(true);
    try {
      const response = await apiRequest<{ imports: ImportRecord[]; pagination: ImportPagination }>(
        `/imports?page=${page}&pageSize=10`,
      );
      setImports(response.imports);
      setImportsPagination(response.pagination);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudo cargar el historial de importaciones.');
    } finally {
      setLoadingImports(false);
    }
  }, [importsPage]);

  useEffect(() => {
    void loadImports();
  }, [loadImports]);

  const validateFile = async () => {
    if (!file) {
      setError('Selecciona un archivo XLS o XLSX.');
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    setAnalysis(null);
    try {
      const response = await apiRequest<{ preview: ImportSummary }>('/imports/validate', {
        method: 'POST',
        body: periodFormData(file, period),
      });
      setAnalysis({ summary: response.preview, mode: 'preview' });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudo validar el archivo.');
    } finally {
      setBusy(false);
    }
  };

  const confirmImport = async () => {
    if (!file || !analysis || analysis.mode !== 'preview') {
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const response = await apiEventStreamRequest<{ importacion: ImportRecord; resumen: ImportSummary }>('/imports', {
        method: 'POST',
        body: periodFormData(file, period),
      }, setProgress);
      setProgress({ phase: 'complete', completed: 1, total: 1 });
      setAnalysis({ summary: response.resumen, mode: 'processed' });
      setNotice(`Importación #${response.importacion.id} guardada correctamente.`);
      setFile(null);
      setFileInputVersion((version) => version + 1);
      setImportsPage(1);
      await loadImports(1);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudo completar la importación.');
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  const downloadTemplate = async () => {
    setError('');
    try {
      await downloadApiFile('/imports/template', 'plantilla_marcaciones_nettplus.xlsx');
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudo descargar la plantilla.');
    }
  };

  const summary = analysis?.summary;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.22em] text-nettplus-blue">Asistencia</p>
        <h2 className="mt-2 text-3xl font-semibold text-slate-900">Importar marcaciones</h2>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Carga archivos de asistencia XLS o XLSX, valida sus filas y confirma antes de guardarlas.
        </p>
      </div>

      {error ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
      {notice ? <p role="status" className="rounded-lg border border-lime-200 bg-lime-50 px-4 py-3 text-sm text-lime-900">{notice}</p> : null}

      <Card className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold text-slate-800">Archivo de marcaciones</h3>
            <p className="mt-1 text-sm text-slate-500">El archivo debe incluir código, fecha, hora y tipo de marcación.</p>
          </div>
          <Button type="button" variant="secondary" icon={<Download className="h-4 w-4" />} onClick={() => void downloadTemplate()}>
            Descargar plantilla
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
          <label className="space-y-2 text-sm font-medium text-slate-700">
            Archivo XLS o XLSX
            <input
              key={fileInputVersion}
              type="file"
              accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setAnalysis(null);
                setError('');
                setNotice('');
              }}
              className="block w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-nettplus-ice file:px-3 file:py-2 file:font-medium file:text-nettplus-blue"
            />
            <span className="block text-xs font-normal text-slate-500">Tamaño máximo: 10 MB. Los códigos deben coincidir con colaboradores registrados.</span>
          </label>
          <label className="space-y-2 text-sm font-medium text-slate-700">
            Período
            <input
              type="month"
              required
              value={period}
              onChange={(event) => {
                setPeriod(event.target.value);
                setAnalysis(null);
              }}
              className="block w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal"
            />
            <span className="block text-xs font-normal text-slate-500">Todas las fechas del archivo deben pertenecer a este mes.</span>
          </label>
        </div>

        {file ? (
          <p className="flex items-center gap-2 text-sm text-slate-600">
            <FileSpreadsheet className="h-4 w-4 text-nettplus-blue" />
            {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-4">
          <Button type="button" disabled={!file || busy} icon={<Upload className="h-4 w-4" />} onClick={() => void validateFile()}>
            {busy ? 'Procesando...' : 'Validar archivo'}
          </Button>
          {analysis?.mode === 'preview' ? (
            <Button type="button" variant="secondary" disabled={busy || analysis.summary.cargados === 0} onClick={() => void confirmImport()}>
              Confirmar importación
            </Button>
          ) : null}
        </div>
        {busy && progress ? (
          <div className="space-y-2" role="status" aria-live="polite">
            <div className="flex justify-between gap-3 text-sm text-slate-600">
              <span>
                {progress.phase === 'complete'
                  ? 'Importación completa'
                  : progress.phase === 'validating'
                  ? `Validando filas: ${progress.completed.toLocaleString('es')} de ${progress.total.toLocaleString('es')}`
                  : `Guardando marcaciones: ${progress.completed.toLocaleString('es')} de ${progress.total.toLocaleString('es')}`}
              </span>
              <span>
                {progress.phase === 'complete'
                  ? 100
                  : progress.phase === 'validating'
                  ? Math.round((progress.total > 0 ? progress.completed / progress.total : 0) * 60)
                  : 60 + Math.round((progress.total > 0 ? progress.completed / progress.total : 0) * 35)}%
              </span>
            </div>
            <progress
              className="h-2 w-full accent-nettplus-blue"
              max={100}
              value={progress.phase === 'complete'
                ? 100
                : progress.phase === 'validating'
                ? (progress.total > 0 ? progress.completed / progress.total : 0) * 60
                : 60 + (progress.total > 0 ? progress.completed / progress.total : 0) * 35}
            />
          </div>
        ) : null}
      </Card>

      {summary ? (
        <Card className="space-y-5">
          <div className="flex items-start gap-3">
            {analysis?.mode === 'preview'
              ? <AlertCircle className="mt-0.5 h-5 w-5 text-amber-600" />
              : <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-700" />}
            <div>
              <h3 className="font-semibold text-slate-800">{analysis?.mode === 'preview' ? 'Resultado de validación' : 'Resultado de importación'}</h3>
              <p className="mt-1 text-sm text-slate-500">{summary.archivo} · {formatPeriod(summary.periodoMes, summary.periodoAnio)}</p>
              {analysis?.mode === 'preview' && summary.cargados > 0 ? (
                <p className="mt-2 text-sm text-slate-600">Al confirmar se guardarán las filas válidas; duplicados y filas con errores se excluirán.</p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <CountCard label="Filas leídas" value={summary.total} tone="bg-slate-100 text-slate-800" />
            <CountCard label="Listas para cargar" value={summary.cargados} tone="bg-lime-100 text-lime-900" />
            <CountCard label="Duplicados omitidos" value={summary.omitidos} tone="bg-amber-100 text-amber-900" />
            <CountCard label="Filas con errores" value={summary.conErrores} tone="bg-red-100 text-red-900" />
          </div>

          {summary.filasValidas.length > 0 ? (
            <div>
              <h4 className="mb-2 text-sm font-semibold text-slate-700">Muestra de filas válidas</h4>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="min-w-full text-left text-sm text-slate-700">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr><th className="px-3 py-2">Fila</th><th className="px-3 py-2">Código</th><th className="px-3 py-2">Colaborador</th><th className="px-3 py-2">Fecha</th><th className="px-3 py-2">Hora</th><th className="px-3 py-2">Tipo</th></tr>
                  </thead>
                  <tbody>
                    {summary.filasValidas.map((row) => (
                      <tr key={`${row.fila}-${row.codigo}`} className="border-t border-slate-100">
                        <td className="px-3 py-2">{row.fila}</td><td className="px-3 py-2">{row.codigo}</td><td className="px-3 py-2">{row.colaborador}</td><td className="px-3 py-2">{row.fecha}</td><td className="px-3 py-2">{row.hora}</td><td className="px-3 py-2 capitalize">{row.tipo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {summary.errores.length > 0 || summary.duplicados.length > 0 ? (
            <div className="grid gap-5 lg:grid-cols-2">
              {summary.errores.length > 0 ? (
                <div>
                  <h4 className="mb-2 text-sm font-semibold text-red-800">Errores</h4>
                  <ul className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-red-100 bg-red-50/50 p-3 text-sm">
                    {summary.errores.map((issue, index) => <li key={`${issue.fila}-${index}`}><span className="font-medium">Fila {issue.fila}{issue.codigo ? ` · ${issue.codigo}` : ''}:</span> {issue.motivo}</li>)}
                  </ul>
                </div>
              ) : null}
              {summary.duplicados.length > 0 ? (
                <div>
                  <h4 className="mb-2 text-sm font-semibold text-amber-800">Duplicados omitidos</h4>
                  <ul className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-amber-100 bg-amber-50/50 p-3 text-sm">
                    {summary.duplicados.map((issue, index) => <li key={`${issue.fila}-${index}`}><span className="font-medium">Fila {issue.fila}{issue.codigo ? ` · ${issue.codigo}` : ''}:</span> {issue.motivo}</li>)}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
          {summary.detallesTruncados ? <p className="text-xs text-slate-500">Se muestran como máximo los primeros 100 detalles por categoría.</p> : null}
        </Card>
      ) : null}

      <Card className="p-0">
        <div className="border-b border-slate-200 px-5 py-4">
          <h3 className="font-semibold text-slate-800">Importaciones recientes</h3>
          <p className="mt-1 text-sm text-slate-500">Últimas 20 cargas registradas.</p>
        </div>
        {loadingImports ? <p className="px-5 py-8 text-center text-sm text-slate-500">Cargando historial...</p> : imports.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-500">Todavía no hay importaciones registradas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Archivo</th><th className="px-4 py-3">Período</th><th className="px-4 py-3">Cargados</th><th className="px-4 py-3">Omitidos</th><th className="px-4 py-3">Errores</th><th className="px-4 py-3">Estado</th></tr>
              </thead>
              <tbody>
                {imports.map((record) => (
                  <tr key={record.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">{new Date(record.fechaHora).toLocaleString('es')}</td>
                    <td className="px-4 py-3">{record.archivo}</td>
                    <td className="px-4 py-3">{formatPeriod(record.periodoMes, record.periodoAnio)}</td>
                    <td className="px-4 py-3">{record.cargados}</td>
                    <td className="px-4 py-3">{record.omitidos}</td>
                    <td className="px-4 py-3">{record.conErrores}</td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${record.conErrores ? 'bg-amber-100 text-amber-900' : 'bg-lime-100 text-lime-900'}`}>{record.estado.replace(/_/g, ' ')}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loadingImports ? (
          <Pagination
            page={importsPagination.page}
            pageSize={importsPagination.pageSize}
            total={importsPagination.total}
            totalPages={importsPagination.totalPages}
            onPageChange={setImportsPage}
          />
        ) : null}
      </Card>
    </div>
  );
}
