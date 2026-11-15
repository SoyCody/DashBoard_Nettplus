import { basename, extname } from 'node:path';
import { and, count, desc, gte, inArray, lt } from 'drizzle-orm';
import * as XLSX from '@e965/xlsx';
import { db } from '../config/db.js';
import {
  auditoria,
  colaboradores,
  importaciones,
  marcaciones,
} from '../db/schema.js';
import type { ImportPeriod } from '../validators/import.schema.js';
import type { Pagination } from '../validators/pagination.schema.js';

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_ROWS = 20_000;
const MAX_ISSUES_TO_RETURN = 100;
const XLSX_SIGNATURE = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
const XLS_SIGNATURE = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);

export class ImportServiceError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ImportServiceError';
  }
}

export type ImportIssue = {
  fila: number;
  codigo: string | null;
  motivo: string;
};

export type ImportSummary = {
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

type AttendanceType = 'entrada' | 'salida';
type RawAttendanceRow = {
  fila: number;
  codigo: string;
  fecha: Date;
  hora: string;
  tipo: AttendanceType;
};
type PlannedMark = RawAttendanceRow & {
  colaboradorId: number;
  colaborador: string;
};
type ParsedWorkbook = {
  filas: RawAttendanceRow[];
  errores: ImportIssue[];
  total: number;
};
type ImportAnalysis = {
  resumen: ImportSummary;
  marcaciones: PlannedMark[];
};
export type ImportProgress = {
  phase: 'validating' | 'saving';
  completed: number;
  total: number;
};
type ProgressReporter = (progress: ImportProgress) => void | Promise<void>;

type HeaderColumns = {
  headerRow: number;
  codigo: number;
  tipo: number;
  fecha?: number;
  hora?: number;
  fechaHora?: number;
};

const headerAliases = {
  codigo: [
    'codigo',
    'codigocolaborador',
    'codigodecolaborador',
    'codigoempleado',
    'codigodeempleado',
    'idempleado',
    'employeeid',
    'employeecode',
    'userid',
    'pin',
    'no',
    'numero',
    'nro',
    'id',
  ],
  fecha: ['fecha', 'date', 'fechamarcacion', 'checkdate'],
  hora: ['hora', 'time', 'horamarcacion', 'checktime'],
  fechaHora: ['fechahora', 'fechayhora', 'datetime', 'timestamp', 'timestampdate'],
  tipo: ['tipo', 'tipomarcacion', 'marcacion', 'estado', 'state', 'status', 'event', 'eventtype'],
} satisfies Record<string, string[]>;

function normalizeHeader(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function columnIndex(row: unknown[], startColumn: number, aliases: string[]) {
  const normalizedAliases = new Set(aliases);
  const relativeIndex = row.findIndex((value) => normalizedAliases.has(normalizeHeader(value)));
  return relativeIndex < 0 ? undefined : startColumn + relativeIndex;
}

function findHeaderColumns(sheet: XLSX.WorkSheet, range: XLSX.Range): HeaderColumns {
  const lastHeaderRow = Math.min(range.s.r + 9, range.e.r);
  for (let rowIndex = range.s.r; rowIndex <= lastHeaderRow; rowIndex += 1) {
    const values: unknown[] = [];
    for (let columnIndex = range.s.c; columnIndex <= range.e.c; columnIndex += 1) {
      const address = XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex });
      values.push(sheet[address]?.v);
    }

    const codigo = columnIndex(values, range.s.c, headerAliases.codigo);
    const tipo = columnIndex(values, range.s.c, headerAliases.tipo);
    const fecha = columnIndex(values, range.s.c, headerAliases.fecha);
    const hora = columnIndex(values, range.s.c, headerAliases.hora);
    const fechaHora = columnIndex(values, range.s.c, headerAliases.fechaHora)
      ?? (!fecha ? hora : undefined);

    if (codigo !== undefined && tipo !== undefined
      && ((fecha !== undefined && hora !== undefined) || fechaHora !== undefined)) {
      return { headerRow: rowIndex, codigo, tipo, fecha, hora, fechaHora };
    }
  }

  throw new ImportServiceError(
    'No encontré las columnas requeridas: código, fecha, hora y tipo de marcación.',
    400,
  );
}

function excelCell(sheet: XLSX.WorkSheet, row: number, column: number) {
  const address = XLSX.utils.encode_cell({ r: row, c: column });
  return sheet[address] as XLSX.CellObject | undefined;
}

function validDate(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }
  return date;
}

function parseDate(value: unknown, date1904: boolean): Date | null {
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return validDate(value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate());
  }

  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    const epoch = date1904 ? Date.UTC(1904, 0, 1) : Date.UTC(1899, 11, 30);
    const date = new Date(epoch + Math.floor(value) * 86_400_000);
    return validDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
  }

  if (typeof value !== 'string') {
    return null;
  }

  const input = value.trim();
  const yearFirst = input.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (yearFirst) {
    return validDate(Number(yearFirst[1]), Number(yearFirst[2]), Number(yearFirst[3]));
  }

  const dayFirst = input.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (dayFirst) {
    return validDate(Number(dayFirst[3]), Number(dayFirst[2]), Number(dayFirst[1]));
  }

  return null;
}

function formatTime(totalSeconds: number) {
  const secondsInDay = 86_400;
  const normalizedSeconds = totalSeconds % secondsInDay;
  const hours = Math.floor(normalizedSeconds / 3_600);
  const minutes = Math.floor((normalizedSeconds % 3_600) / 60);
  const seconds = normalizedSeconds % 60;
  return seconds === 0
    ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
    : `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function parseTime(value: unknown): string | null {
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return formatTime(
      value.getUTCHours() * 3_600 + value.getUTCMinutes() * 60 + value.getUTCSeconds(),
    );
  }

  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    const seconds = value < 1
      ? Math.round(value * 86_400)
      : value < 24
        ? Math.round(value * 3_600)
        : Math.round((value - Math.floor(value)) * 86_400);
    return formatTime(seconds);
  }

  if (typeof value !== 'string') {
    return null;
  }

  const match = value.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!match) {
    return null;
  }

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3] ?? 0);
  const meridiem = match[4]?.toLowerCase();

  if (minutes > 59 || seconds > 59) {
    return null;
  }
  if (meridiem) {
    if (hours < 1 || hours > 12) {
      return null;
    }
    hours = (hours % 12) + (meridiem === 'pm' ? 12 : 0);
  } else if (hours > 23) {
    return null;
  }

  return formatTime(hours * 3_600 + minutes * 60 + seconds);
}

function parseDateTime(value: unknown, date1904: boolean) {
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    const fecha = parseDate(value, date1904);
    const hora = parseTime(value);
    return fecha && hora ? { fecha, hora } : null;
  }

  if (typeof value === 'number' && Number.isFinite(value) && value >= 1) {
    const fecha = parseDate(value, date1904);
    const hora = parseTime(value);
    return fecha && hora ? { fecha, hora } : null;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const match = value.trim().match(/^(.+?)[T\s]+(\d{1,2}:\d{2}(?::\d{2})?\s*(?:am|pm)?)$/i);
  if (!match) {
    return null;
  }

  const fecha = parseDate(match[1], date1904);
  const hora = parseTime(match[2]);
  return fecha && hora ? { fecha, hora } : null;
}

function parseAttendanceType(value: unknown): AttendanceType | null {
  const normalized = normalizeHeader(value);
  if (['entrada', 'ingreso', 'in', 'checkin', 'clockin', 'arrival', '0'].includes(normalized)) {
    return 'entrada';
  }
  if (['salida', 'egreso', 'out', 'checkout', 'clockout', 'departure', '1'].includes(normalized)) {
    return 'salida';
  }
  return null;
}

function normalizeCode(value: unknown) {
  if (typeof value === 'number' && Number.isSafeInteger(value)) {
    return String(value);
  }
  if (typeof value === 'string') {
    const code = value.trim();
    return code.length > 0 && code.length <= 30 ? code : null;
  }
  return null;
}

function pushIssue(issues: ImportIssue[], issue: ImportIssue) {
  if (issues.length < MAX_ISSUES_TO_RETURN) {
    issues.push(issue);
  }
}

async function parseWorkbook(
  buffer: Buffer,
  fileName: string,
  reportProgress?: ProgressReporter,
): Promise<ParsedWorkbook> {
  if (buffer.length === 0) {
    throw new ImportServiceError('El archivo está vacío.', 400);
  }
  if (buffer.length > MAX_FILE_BYTES) {
    throw new ImportServiceError('El archivo supera el límite de 10 MB.', 413);
  }

  const extension = extname(fileName).toLowerCase();
  const isXlsx = extension === '.xlsx' && buffer.subarray(0, 4).equals(XLSX_SIGNATURE);
  const isXls = extension === '.xls' && buffer.subarray(0, 8).equals(XLS_SIGNATURE);
  if (!isXlsx && !isXls) {
    throw new ImportServiceError('El archivo debe ser un XLS o XLSX válido.', 400);
  }

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false, UTC: true });
  } catch {
    throw new ImportServiceError('No se pudo leer el libro de Excel. Revisa el archivo e inténtalo de nuevo.', 400);
  }

  const firstSheetName = workbook.SheetNames[0];
  const sheet = firstSheetName ? workbook.Sheets[firstSheetName] : undefined;
  const reference = sheet?.['!ref'];
  if (!sheet || typeof reference !== 'string') {
    throw new ImportServiceError('El archivo no contiene una hoja con datos.', 400);
  }

  const range = XLSX.utils.decode_range(reference);
  const headers = findHeaderColumns(sheet, range);
  const rowsToRead = range.e.r - headers.headerRow;
  if (rowsToRead > MAX_ROWS) {
    throw new ImportServiceError(`El archivo supera el máximo de ${MAX_ROWS.toLocaleString('es')} filas.`, 400);
  }

  const date1904 = Boolean(workbook.Workbook?.WBProps?.date1904);
  const filas: RawAttendanceRow[] = [];
  const errores: ImportIssue[] = [];
  let total = 0;

  await reportProgress?.({ phase: 'validating', completed: 0, total: rowsToRead });
  for (let rowIndex = headers.headerRow + 1; rowIndex <= range.e.r; rowIndex += 1) {
    try {
    const codeCell = excelCell(sheet, rowIndex, headers.codigo);
    const typeCell = excelCell(sheet, rowIndex, headers.tipo);
    const dateCell = headers.fecha !== undefined ? excelCell(sheet, rowIndex, headers.fecha) : undefined;
    const timeCell = headers.hora !== undefined ? excelCell(sheet, rowIndex, headers.hora) : undefined;
    const dateTimeCell = headers.fechaHora !== undefined ? excelCell(sheet, rowIndex, headers.fechaHora) : undefined;
    const cells = [codeCell, typeCell, dateCell, timeCell, dateTimeCell];
    const values = cells.map((cell) => cell?.v);
    const hasFormulaOrError = cells.some((cell) => cell?.f || cell?.t === 'e');

    if (!hasFormulaOrError
      && values.every((value) => value === undefined || value === null || String(value).trim() === '')) {
      continue;
    }

    total += 1;
    const fila = rowIndex + 1;
    const codigo = normalizeCode(codeCell?.v);
    if (!codigo) {
      pushIssue(errores, { fila, codigo: null, motivo: 'El código de colaborador es obligatorio y debe tener hasta 30 caracteres.' });
      continue;
    }

    if (hasFormulaOrError) {
      pushIssue(errores, { fila, codigo, motivo: 'No se admiten fórmulas ni celdas con error en los datos importados.' });
      continue;
    }

    const parsedDateTime = headers.fecha !== undefined && headers.hora !== undefined
      ? (() => {
        const fecha = parseDate(dateCell?.v, date1904);
        const hora = parseTime(timeCell?.v);
        return fecha && hora ? { fecha, hora } : null;
      })()
      : parseDateTime(dateTimeCell?.v, date1904);
    const tipo = parseAttendanceType(typeCell?.v);

    if (!parsedDateTime) {
      pushIssue(errores, { fila, codigo, motivo: 'La fecha o la hora no tiene un formato válido.' });
      continue;
    }
    if (!tipo) {
      pushIssue(errores, { fila, codigo, motivo: 'El tipo debe ser entrada o salida.' });
      continue;
    }

    filas.push({ fila, codigo, fecha: parsedDateTime.fecha, hora: parsedDateTime.hora, tipo });
    } finally {
      const completed = rowIndex - headers.headerRow;
      if (reportProgress && (completed % 100 === 0 || completed === rowsToRead)) {
        await reportProgress({ phase: 'validating', completed, total: rowsToRead });
      }
    }
  }

  if (rowsToRead === 0) {
    await reportProgress?.({ phase: 'validating', completed: 0, total: 0 });
  }

  if (total === 0) {
    throw new ImportServiceError('La hoja no contiene filas de marcaciones para validar.', 400);
  }

  return { filas, errores, total };
}

function markKey(
  colaboradorId: number,
  fecha: Date,
  hora: string,
  tipo: AttendanceType,
) {
  return `${colaboradorId}|${fecha.toISOString().slice(0, 10)}|${hora}|${tipo}`;
}

function safeFileName(fileName: string) {
  const name = basename(fileName).replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_').trim();
  return (name || 'marcaciones.xlsx').slice(0, 255);
}

async function analyzeImport(
  buffer: Buffer,
  fileName: string,
  period: ImportPeriod,
  reportProgress?: ProgressReporter,
): Promise<ImportAnalysis> {
  const parsed = await parseWorkbook(buffer, fileName, reportProgress);
  const errores = [...parsed.errores];
  const duplicados: ImportIssue[] = [];
  let conErrores = parsed.total - parsed.filas.length;
  let omitidos = 0;
  const validForPeriod: RawAttendanceRow[] = [];

  for (const row of parsed.filas) {
    if (row.fecha.getUTCFullYear() !== period.periodoAnio
      || row.fecha.getUTCMonth() + 1 !== period.periodoMes) {
      conErrores += 1;
      pushIssue(errores, {
        fila: row.fila,
        codigo: row.codigo,
        motivo: 'La fecha no pertenece al período seleccionado.',
      });
      continue;
    }
    validForPeriod.push(row);
  }

  const collaborators = await db
    .select({ id: colaboradores.id, codigo: colaboradores.codigo, nombres: colaboradores.nombres, apellidos: colaboradores.apellidos })
    .from(colaboradores);
  const collaboratorByCode = new Map<string, (typeof collaborators)[number]>();
  const ambiguousCodes = new Set<string>();

  for (const collaborator of collaborators) {
    const key = normalizeHeader(collaborator.codigo);
    if (collaboratorByCode.has(key)) {
      ambiguousCodes.add(key);
    } else {
      collaboratorByCode.set(key, collaborator);
    }
  }

  const mappedRows: PlannedMark[] = [];
  for (const row of validForPeriod) {
    const key = normalizeHeader(row.codigo);
    const collaborator = collaboratorByCode.get(key);
    if (!collaborator || ambiguousCodes.has(key)) {
      conErrores += 1;
      pushIssue(errores, {
        fila: row.fila,
        codigo: row.codigo,
        motivo: collaborator ? 'El código coincide con más de un colaborador.' : 'No existe un colaborador con ese código.',
      });
      continue;
    }
    mappedRows.push({
      ...row,
      colaboradorId: collaborator.id,
      colaborador: `${collaborator.nombres} ${collaborator.apellidos}`,
    });
  }

  const periodStart = new Date(Date.UTC(period.periodoAnio, period.periodoMes - 1, 1));
  const periodEnd = new Date(Date.UTC(period.periodoAnio, period.periodoMes, 1));
  const collaboratorIds = [...new Set(mappedRows.map((row) => row.colaboradorId))];
  const existingMarks = collaboratorIds.length > 0
    ? await db
      .select({
        colaboradorId: marcaciones.colaboradorId,
        fecha: marcaciones.fecha,
        hora: marcaciones.hora,
        tipo: marcaciones.tipo,
      })
      .from(marcaciones)
      .where(and(
        gte(marcaciones.fecha, periodStart),
        lt(marcaciones.fecha, periodEnd),
        inArray(marcaciones.colaboradorId, collaboratorIds),
      ))
    : [];
  const seenMarks = new Set(
    existingMarks.map((mark) => markKey(mark.colaboradorId, mark.fecha, mark.hora, mark.tipo as AttendanceType)),
  );
  const accepted: PlannedMark[] = [];

  for (const row of mappedRows) {
    const key = markKey(row.colaboradorId, row.fecha, row.hora, row.tipo);
    if (seenMarks.has(key)) {
      omitidos += 1;
      pushIssue(duplicados, {
        fila: row.fila,
        codigo: row.codigo,
        motivo: 'La marcación ya existe en este archivo o fue importada anteriormente.',
      });
      continue;
    }
    seenMarks.add(key);
    accepted.push(row);
  }

  await reportProgress?.({ phase: 'validating', completed: 1, total: 1 });
  const summary: ImportSummary = {
    archivo: safeFileName(fileName),
    periodoMes: period.periodoMes,
    periodoAnio: period.periodoAnio,
    total: parsed.total,
    cargados: accepted.length,
    omitidos,
    conErrores,
    filasValidas: accepted.slice(0, 10).map((row) => ({
      fila: row.fila,
      codigo: row.codigo,
      colaborador: row.colaborador,
      fecha: row.fecha.toISOString().slice(0, 10),
      hora: row.hora,
      tipo: row.tipo,
    })),
    errores,
    duplicados,
    detallesTruncados: conErrores > errores.length || omitidos > duplicados.length,
  };

  return { resumen: summary, marcaciones: accepted };
}

export async function previewImport(
  buffer: Buffer,
  fileName: string,
  period: ImportPeriod,
) {
  const analysis = await analyzeImport(buffer, fileName, period);
  return analysis.resumen;
}

export async function processImport(
  buffer: Buffer,
  fileName: string,
  period: ImportPeriod,
  actorId: number,
  reportProgress?: ProgressReporter,
) {
  const analysis = await analyzeImport(buffer, fileName, period, reportProgress);
  const { resumen } = analysis;
  const estado = resumen.conErrores > 0 ? 'procesada_con_errores' : 'procesada';
  const marksToSave = analysis.marcaciones.length;
  await reportProgress?.({ phase: 'saving', completed: 0, total: marksToSave });

  const importacion = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(importaciones)
      .values({
        usuarioId: actorId,
        archivo: resumen.archivo,
        periodoMes: resumen.periodoMes,
        periodoAnio: resumen.periodoAnio,
        total: resumen.total,
        cargados: resumen.cargados,
        omitidos: resumen.omitidos,
        conErrores: resumen.conErrores,
        estado,
      })
      .returning();

    for (let offset = 0; offset < analysis.marcaciones.length; offset += 500) {
      const batch = analysis.marcaciones.slice(offset, offset + 500);
      await tx.insert(marcaciones).values(batch.map((row) => ({
        importacionId: created.id,
        colaboradorId: row.colaboradorId,
        fecha: row.fecha,
        hora: row.hora,
        tipo: row.tipo,
        estado: 'valido',
        motivo: null,
      })));
      await reportProgress?.({
        phase: 'saving',
        completed: offset + batch.length,
        total: marksToSave,
      });
    }

    await tx.insert(auditoria).values({
      usuarioId: actorId,
      accion: 'importar_marcaciones',
      detalle: `Importación ${resumen.archivo}: ${resumen.cargados} marcaciones cargadas`,
      valorAnterior: null,
      valorNuevo: {
        importacionId: created.id,
        periodoMes: resumen.periodoMes,
        periodoAnio: resumen.periodoAnio,
        total: resumen.total,
        cargados: resumen.cargados,
        omitidos: resumen.omitidos,
        conErrores: resumen.conErrores,
      },
    });

    return created;
  });

  return { importacion, resumen };
}

export async function listImports({ page, pageSize }: Pagination) {
  const [totalRecord] = await db.select({ total: count() }).from(importaciones);
  const imports = await db
    .select({
      id: importaciones.id,
      fechaHora: importaciones.fechaHora,
      archivo: importaciones.archivo,
      periodoMes: importaciones.periodoMes,
      periodoAnio: importaciones.periodoAnio,
      total: importaciones.total,
      cargados: importaciones.cargados,
      omitidos: importaciones.omitidos,
      conErrores: importaciones.conErrores,
      estado: importaciones.estado,
    })
    .from(importaciones)
    .orderBy(desc(importaciones.fechaHora))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const total = totalRecord?.total ?? 0;
  return {
    imports,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}
