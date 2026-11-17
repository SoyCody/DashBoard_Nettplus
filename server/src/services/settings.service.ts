import { and, count, eq, ilike, inArray, ne, or } from 'drizzle-orm';
import { db } from '../config/db.js';
import {
  auditoria,
  colaboradores,
  departamentos,
  parametros,
  turnos,
  usuarios,
} from '../db/schema.js';
import type { CollaboratorListQuery } from '../validators/pagination.schema.js';

export class SettingsServiceError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'SettingsServiceError';
  }
}

function isUniqueViolation(error: unknown) {
  let current = error;
  while (typeof current === 'object' && current !== null) {
    if ('code' in current && current.code === '23505') {
      return true;
    }
    current = 'cause' in current ? current.cause : null;
  }
  return false;
}

function isForeignKeyViolation(error: unknown) {
  let current = error;
  while (typeof current === 'object' && current !== null) {
    if ('code' in current && current.code === '23503') {
      return true;
    }
    current = 'cause' in current ? current.cause : null;
  }
  return false;
}

async function ensureActor(actorId: number) {
  const [actor] = await db.select({ id: usuarios.id }).from(usuarios).where(eq(usuarios.id, actorId)).limit(1);
  if (!actor) {
    throw new SettingsServiceError('No se pudo identificar al usuario que realiza el cambio', 401);
  }
}

async function ensureCollaboratorReferences(input: CollaboratorInput) {
  const [department] = await db.select({ id: departamentos.id }).from(departamentos).where(eq(departamentos.id, input.departamentoId)).limit(1);
  const [shift] = await db.select({ id: turnos.id }).from(turnos).where(eq(turnos.id, input.turnoId)).limit(1);
  if (!department || !shift) {
    throw new SettingsServiceError('El departamento o turno seleccionado no existe', 400);
  }
}

async function auditChange(
  actorId: number,
  accion: string,
  detalle: string,
  valorAnterior: unknown,
  valorNuevo: unknown,
) {
  await db.insert(auditoria).values({ usuarioId: actorId, accion, detalle, valorAnterior, valorNuevo });
}

export async function listDepartments() {
  return db.select({ id: departamentos.id, nombre: departamentos.nombre }).from(departamentos).orderBy(departamentos.nombre);
}

export async function listCollaborators({ page, pageSize, search }: CollaboratorListQuery) {
  const searchPattern = `%${search}%`;
  const searchFilter = search
    ? or(
      ilike(colaboradores.codigo, searchPattern),
      ilike(colaboradores.nombres, searchPattern),
      ilike(colaboradores.apellidos, searchPattern),
      ilike(departamentos.nombre, searchPattern),
      ilike(turnos.nombre, searchPattern),
    )
    : undefined;
  const [totalRecord] = await db
    .select({ total: count() })
    .from(colaboradores)
    .innerJoin(departamentos, eq(departamentos.id, colaboradores.departamentoId))
    .innerJoin(turnos, eq(turnos.id, colaboradores.turnoId))
    .where(searchFilter);
  const collaborators = await db
    .select({
      id: colaboradores.id,
      codigo: colaboradores.codigo,
      nombres: colaboradores.nombres,
      apellidos: colaboradores.apellidos,
      departamentoId: colaboradores.departamentoId,
      departamento: departamentos.nombre,
      turnoId: colaboradores.turnoId,
      turno: turnos.nombre,
      estadoLaboral: colaboradores.estadoLaboral,
    })
    .from(colaboradores)
    .innerJoin(departamentos, eq(departamentos.id, colaboradores.departamentoId))
    .innerJoin(turnos, eq(turnos.id, colaboradores.turnoId))
    .where(searchFilter)
    .orderBy(colaboradores.apellidos, colaboradores.nombres)
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const total = totalRecord?.total ?? 0;
  return {
    collaborators,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

export type CollaboratorInput = {
  codigo: string;
  nombres: string;
  apellidos: string;
  departamentoId: number;
  turnoId: number;
  estadoLaboral: 'activo' | 'inactivo';
};

export async function createCollaborator(input: CollaboratorInput, actorId: number) {
  await ensureActor(actorId);
  await ensureCollaboratorReferences(input);
  try {
    return await db.transaction(async (tx) => {
      const [created] = await tx.insert(colaboradores).values(input).returning();
      await tx.insert(auditoria).values({
        usuarioId: actorId,
        accion: 'crear_colaborador',
        detalle: `Creación del colaborador ${created.codigo}`,
        valorAnterior: null,
        valorNuevo: created,
      });
      return created;
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new SettingsServiceError('El código de colaborador ya existe', 409);
    }
    if (isForeignKeyViolation(error)) {
      throw new SettingsServiceError('El departamento o turno seleccionado no existe', 400);
    }
    throw error;
  }
}

export async function updateCollaborator(id: number, input: CollaboratorInput, actorId: number) {
  await ensureActor(actorId);
  await ensureCollaboratorReferences(input);
  const [previous] = await db.select().from(colaboradores).where(eq(colaboradores.id, id)).limit(1);
  if (!previous) {
    throw new SettingsServiceError('Colaborador no encontrado', 404);
  }

  try {
    return await db.transaction(async (tx) => {
      const [updated] = await tx.update(colaboradores).set(input).where(eq(colaboradores.id, id)).returning();
      await tx.insert(auditoria).values({
        usuarioId: actorId,
        accion: 'editar_colaborador',
        detalle: `Edición del colaborador ${updated.codigo}`,
        valorAnterior: previous,
        valorNuevo: updated,
      });
      return updated;
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new SettingsServiceError('El código de colaborador ya existe', 409);
    }
    if (isForeignKeyViolation(error)) {
      throw new SettingsServiceError('El departamento o turno seleccionado no existe', 400);
    }
    throw error;
  }
}

export async function setCollaboratorStatus(id: number, estadoLaboral: 'activo' | 'inactivo', actorId: number) {
  await ensureActor(actorId);
  const [previous] = await db
    .select({ id: colaboradores.id, codigo: colaboradores.codigo, estadoLaboral: colaboradores.estadoLaboral })
    .from(colaboradores)
    .where(eq(colaboradores.id, id))
    .limit(1);
  if (!previous) {
    throw new SettingsServiceError('Colaborador no encontrado', 404);
  }

  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(colaboradores)
      .set({ estadoLaboral })
      .where(and(eq(colaboradores.id, id), ne(colaboradores.estadoLaboral, estadoLaboral)))
      .returning({ id: colaboradores.id, codigo: colaboradores.codigo, estadoLaboral: colaboradores.estadoLaboral });
    if (!updated) {
      return previous;
    }

    await tx.insert(auditoria).values({
      usuarioId: actorId,
      accion: estadoLaboral === 'activo' ? 'activar_colaborador' : 'desactivar_colaborador',
      detalle: `${estadoLaboral === 'activo' ? 'Activación' : 'Desactivación'} del colaborador ${previous.codigo}`,
      valorAnterior: { estado_laboral: previous.estadoLaboral },
      valorNuevo: { estado_laboral: updated.estadoLaboral },
    });
    return updated;
  });
}

export async function listShifts() {
  return db.select().from(turnos).orderBy(turnos.nombre);
}

export type ShiftInput = {
  nombre: string;
  horaEntrada: string;
  horaSalida: string;
  diasLaborables: string;
};

export async function createShift(input: ShiftInput, actorId: number) {
  await ensureActor(actorId);
  try {
    return await db.transaction(async (tx) => {
      const [created] = await tx.insert(turnos).values(input).returning();
      await tx.insert(auditoria).values({
        usuarioId: actorId,
        accion: 'crear_turno',
        detalle: `Creación del turno ${created.nombre}`,
        valorAnterior: null,
        valorNuevo: created,
      });
      return created;
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new SettingsServiceError('Ya existe un turno con ese nombre', 409);
    }
    throw error;
  }
}

export async function updateShift(id: number, input: ShiftInput, actorId: number) {
  await ensureActor(actorId);
  const [previous] = await db.select().from(turnos).where(eq(turnos.id, id)).limit(1);
  if (!previous) {
    throw new SettingsServiceError('Turno no encontrado', 404);
  }
  try {
    return await db.transaction(async (tx) => {
      const [updated] = await tx.update(turnos).set(input).where(eq(turnos.id, id)).returning();
      await tx.insert(auditoria).values({
        usuarioId: actorId,
        accion: 'editar_turno',
        detalle: `Edición del turno ${updated.nombre}`,
        valorAnterior: previous,
        valorNuevo: updated,
      });
      return updated;
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new SettingsServiceError('Ya existe un turno con ese nombre', 409);
    }
    throw error;
  }
}

const editableParameters = ['tolerancia_atraso_minutos', 'inactividad_sesion_minutos'] as const;
export type EditableParameter = (typeof editableParameters)[number];

export async function getParameters() {
  const rows = await db.select().from(parametros);
  const values = new Map(rows.map((row) => [row.clave, row.valor]));
  return {
    tolerancia_atraso_minutos: values.get('tolerancia_atraso_minutos') ?? '',
    inactividad_sesion_minutos: values.get('inactividad_sesion_minutos') ?? '',
  };
}

export type ParametersInput = Record<EditableParameter, number>;

export async function updateParameters(input: ParametersInput, actorId: number) {
  await ensureActor(actorId);
  return db.transaction(async (tx) => {
    const currentRows = await tx
      .select({ clave: parametros.clave, valor: parametros.valor })
      .from(parametros)
      .where(inArray(parametros.clave, [...editableParameters]));
    const currentValues = new Map(currentRows.map((row) => [row.clave, row.valor]));
    const previous = {
      tolerancia_atraso_minutos: currentValues.get('tolerancia_atraso_minutos') ?? '',
      inactividad_sesion_minutos: currentValues.get('inactividad_sesion_minutos') ?? '',
    };
    const updated = {
      tolerancia_atraso_minutos: String(input.tolerancia_atraso_minutos),
      inactividad_sesion_minutos: String(input.inactividad_sesion_minutos),
    };

    for (const clave of editableParameters) {
      await tx
        .insert(parametros)
        .values({ clave, valor: updated[clave] })
        .onConflictDoUpdate({ target: parametros.clave, set: { valor: updated[clave] } });
    }

    if (previous.tolerancia_atraso_minutos !== updated.tolerancia_atraso_minutos
      || previous.inactividad_sesion_minutos !== updated.inactividad_sesion_minutos) {
      await tx.insert(auditoria).values({
        usuarioId: actorId,
        accion: 'actualizar_parametros_asistencia',
        detalle: 'Actualización de tolerancia de atraso o inactividad de sesión',
        valorAnterior: previous,
        valorNuevo: updated,
      });
    }

    return updated;
  });
}
