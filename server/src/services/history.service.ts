import { and, count, eq, gte, ilike, lt, or } from 'drizzle-orm';
import { db } from '../config/db.js';
import { asistenciaDiaria, auditoria, colaboradores, departamentos } from '../db/schema.js';
import type { z } from 'zod';
import type { dailySummarySchema, historyListSchema, reviewListSchema, reviewUpdateSchema } from '../validators/history.schema.js';

export type HistoryListQuery = z.infer<typeof historyListSchema>;
export type DailySummaryQuery = z.infer<typeof dailySummarySchema>;
export type ReviewListQuery = z.infer<typeof reviewListSchema>;
export type ReviewUpdateInput = z.infer<typeof reviewUpdateSchema>;

function nextUtcDay(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + 1));
}

export async function listHistory(query: HistoryListQuery) {
  const filters = [];

  if (query.dateFrom) {
    const [year, month, day] = query.dateFrom.split('-').map(Number);
    filters.push(gte(asistenciaDiaria.fecha, new Date(Date.UTC(year, month - 1, day))));
  }
  if (query.dateTo) {
    filters.push(lt(asistenciaDiaria.fecha, nextUtcDay(query.dateTo)));
  }
  if (query.collaboratorId) {
    filters.push(eq(asistenciaDiaria.colaboradorId, query.collaboratorId));
  }
  if (query.departmentId) {
    filters.push(eq(colaboradores.departamentoId, query.departmentId));
  }
  if (query.status) {
    filters.push(eq(asistenciaDiaria.estado, query.status));
  }
  if (query.search) {
    const pattern = `%${query.search}%`;
    filters.push(or(
      ilike(colaboradores.codigo, pattern),
      ilike(colaboradores.nombres, pattern),
      ilike(colaboradores.apellidos, pattern),
      ilike(asistenciaDiaria.novedad, pattern),
    ));
  }

  const where = filters.length > 0 ? and(...filters) : undefined;
  const base = db
    .select({ total: count() })
    .from(asistenciaDiaria)
    .innerJoin(colaboradores, eq(colaboradores.id, asistenciaDiaria.colaboradorId))
    .innerJoin(departamentos, eq(departamentos.id, colaboradores.departamentoId));
  const [totalRecord] = await base.where(where);

  const records = await db
    .select({
      colaboradorId: colaboradores.id,
      codigo: colaboradores.codigo,
      nombres: colaboradores.nombres,
      apellidos: colaboradores.apellidos,
      departamentoId: departamentos.id,
      departamento: departamentos.nombre,
      fecha: asistenciaDiaria.fecha,
      horaEntrada: asistenciaDiaria.horaEntrada,
      horaSalida: asistenciaDiaria.horaSalida,
      minutosAtraso: asistenciaDiaria.minutosAtraso,
      estado: asistenciaDiaria.estado,
      novedad: asistenciaDiaria.novedad,
      pendienteRevision: asistenciaDiaria.pendienteRevision,
    })
    .from(asistenciaDiaria)
    .innerJoin(colaboradores, eq(colaboradores.id, asistenciaDiaria.colaboradorId))
    .innerJoin(departamentos, eq(departamentos.id, colaboradores.departamentoId))
    .where(where)
    .orderBy(asistenciaDiaria.fecha, colaboradores.apellidos, colaboradores.nombres)
    .limit(query.pageSize)
    .offset((query.page - 1) * query.pageSize);

  const total = totalRecord?.total ?? 0;
  return {
    records,
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    },
  };
}

export async function listHistoryOptions() {
  const [departments, collaborators] = await Promise.all([
    db.select({ id: departamentos.id, nombre: departamentos.nombre }).from(departamentos).orderBy(departamentos.nombre),
    db.select({
      id: colaboradores.id,
      codigo: colaboradores.codigo,
      nombres: colaboradores.nombres,
      apellidos: colaboradores.apellidos,
      departamentoId: colaboradores.departamentoId,
    }).from(colaboradores).orderBy(colaboradores.apellidos, colaboradores.nombres),
  ]);
  return { departments, collaborators };
}

type DailySummary = {
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

export async function listDailySummary(query: DailySummaryQuery) {
  const filters = [];
  if (query.date) {
    const [year, month, day] = query.date.split('-').map(Number);
    filters.push(gte(asistenciaDiaria.fecha, new Date(Date.UTC(year, month - 1, day))));
    filters.push(lt(asistenciaDiaria.fecha, new Date(Date.UTC(year, month - 1, day + 1))));
  } else {
    if (query.dateFrom) {
      const [year, month, day] = query.dateFrom.split('-').map(Number);
      filters.push(gte(asistenciaDiaria.fecha, new Date(Date.UTC(year, month - 1, day))));
    }
    if (query.dateTo) {
      const [year, month, day] = query.dateTo.split('-').map(Number);
      filters.push(lt(asistenciaDiaria.fecha, new Date(Date.UTC(year, month - 1, day + 1))));
    }
  }
  if (query.departmentId) {
    filters.push(eq(colaboradores.departamentoId, query.departmentId));
  }

  const where = filters.length > 0 ? and(...filters) : undefined;
  const rows = await db
    .select({
      colaboradorId: colaboradores.id,
      departamentoId: departamentos.id,
      departamento: departamentos.nombre,
      fecha: asistenciaDiaria.fecha,
      horaEntrada: asistenciaDiaria.horaEntrada,
      horaSalida: asistenciaDiaria.horaSalida,
      minutosAtraso: asistenciaDiaria.minutosAtraso,
      estado: asistenciaDiaria.estado,
      pendienteRevision: asistenciaDiaria.pendienteRevision,
      novedad: asistenciaDiaria.novedad,
    })
    .from(asistenciaDiaria)
    .innerJoin(colaboradores, eq(colaboradores.id, asistenciaDiaria.colaboradorId))
    .innerJoin(departamentos, eq(departamentos.id, colaboradores.departamentoId))
    .where(where)
    .orderBy(asistenciaDiaria.fecha, departamentos.nombre);

  const grouped = new Map<string, DailySummary>();
  for (const row of rows) {
    const date = row.fecha.toISOString().slice(0, 10);
    const key = `${date}|${row.departamentoId}`;
    const current = grouped.get(key) ?? {
      fecha: date,
      departamentoId: row.departamentoId,
      departamento: row.departamento,
      colaboradores: 0,
      presentes: 0,
      puntuales: 0,
      atrasos: 0,
      tardanzas: 0,
      ausencias: 0,
      novedades: 0,
      pendientesRevision: 0,
      minutosAtraso: 0,
    };
    current.colaboradores += 1;
    if (row.horaEntrada || row.horaSalida) current.presentes += 1;
    if (row.estado === 'puntual') current.puntuales += 1;
    if (row.estado === 'atraso') current.atrasos += 1;
    if (row.estado === 'tardanza') current.tardanzas += 1;
    if (row.estado === 'ausencia') current.ausencias += 1;
    if (row.estado === 'novedad' || row.novedad) current.novedades += 1;
    if (row.pendienteRevision) current.pendientesRevision += 1;
    current.minutosAtraso += row.minutosAtraso;
    grouped.set(key, current);
  }

  const summaries = [...grouped.values()].sort((left, right) =>
    right.fecha.localeCompare(left.fecha) || left.departamento.localeCompare(right.departamento),
  );
  const overall = summaries.reduce(
    (acc, record) => {
      acc.colaboradores += record.colaboradores;
      acc.presentes += record.presentes;
      acc.puntuales += record.puntuales;
      acc.atrasos += record.atrasos;
      acc.tardanzas += record.tardanzas;
      acc.ausencias += record.ausencias;
      acc.novedades += record.novedades;
      acc.pendientesRevision += record.pendientesRevision;
      acc.minutosAtraso += record.minutosAtraso;
      return acc;
    },
    { colaboradores: 0, presentes: 0, puntuales: 0, atrasos: 0, tardanzas: 0, ausencias: 0, novedades: 0, pendientesRevision: 0, minutosAtraso: 0 },
  );

  const total = summaries.length;
  const offset = (query.page - 1) * query.pageSize;
  const records = summaries.slice(offset, offset + query.pageSize);

  return {
    records,
    overall,
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    },
  };
}

export async function listReviews(query: ReviewListQuery) {
  const filters = [];
  if (query.pendingOnly) {
    filters.push(eq(asistenciaDiaria.pendienteRevision, true));
  }
  if (query.dateFrom) {
    const [year, month, day] = query.dateFrom.split('-').map(Number);
    filters.push(gte(asistenciaDiaria.fecha, new Date(Date.UTC(year, month - 1, day))));
  }
  if (query.dateTo) {
    filters.push(lt(asistenciaDiaria.fecha, nextUtcDay(query.dateTo)));
  }
  const where = filters.length > 0 ? and(...filters) : undefined;

  const [totalRecord] = await db
    .select({ total: count() })
    .from(asistenciaDiaria)
    .innerJoin(colaboradores, eq(colaboradores.id, asistenciaDiaria.colaboradorId))
    .innerJoin(departamentos, eq(departamentos.id, colaboradores.departamentoId))
    .where(where);

  const records = await db
    .select({
      colaboradorId: colaboradores.id,
      codigo: colaboradores.codigo,
      nombres: colaboradores.nombres,
      apellidos: colaboradores.apellidos,
      departamento: departamentos.nombre,
      fecha: asistenciaDiaria.fecha,
      horaEntrada: asistenciaDiaria.horaEntrada,
      horaSalida: asistenciaDiaria.horaSalida,
      minutosAtraso: asistenciaDiaria.minutosAtraso,
      estado: asistenciaDiaria.estado,
      novedad: asistenciaDiaria.novedad,
      pendienteRevision: asistenciaDiaria.pendienteRevision,
    })
    .from(asistenciaDiaria)
    .innerJoin(colaboradores, eq(colaboradores.id, asistenciaDiaria.colaboradorId))
    .innerJoin(departamentos, eq(departamentos.id, colaboradores.departamentoId))
    .where(where)
    .orderBy(asistenciaDiaria.fecha, colaboradores.apellidos, colaboradores.nombres)
    .limit(query.pageSize)
    .offset((query.page - 1) * query.pageSize);

  const total = totalRecord?.total ?? 0;
  return {
    records,
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    },
  };
}

export async function reviewDailyRecord(
  colaboradorId: number,
  fechaValue: string,
  input: ReviewUpdateInput,
  actorId: number,
) {
  const [year, month, day] = fechaValue.split('-').map(Number);
  const fecha = new Date(Date.UTC(year, month - 1, day));
  const [previous] = await db
    .select()
    .from(asistenciaDiaria)
    .where(and(
      eq(asistenciaDiaria.colaboradorId, colaboradorId),
      eq(asistenciaDiaria.fecha, fecha),
    ))
    .limit(1);

  if (!previous) {
    throw new HistoryServiceError('El registro diario no existe.', 404);
  }

  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(asistenciaDiaria)
      .set({
        estado: input.estado,
        minutosAtraso: input.minutosAtraso,
        novedad: input.novedad ?? null,
        pendienteRevision: input.pendienteRevision,
      })
      .where(and(
        eq(asistenciaDiaria.colaboradorId, colaboradorId),
        eq(asistenciaDiaria.fecha, fecha),
      ))
      .returning();

    await tx.insert(auditoria).values({
      usuarioId: actorId,
      accion: 'validar_marcacion',
      detalle: `Validación de asistencia del colaborador ${colaboradorId} en ${fechaValue}`,
      valorAnterior: previous,
      valorNuevo: updated,
    });
    return updated;
  });
}

export class HistoryServiceError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'HistoryServiceError';
  }
}
