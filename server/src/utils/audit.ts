import { db } from '../config/db.js';
import { auditoria } from '../db/schema.js';

export async function writeAudit(
  usuarioId: number | null,
  accion: string,
  detalle: string,
  valorAnterior: unknown = null,
  valorNuevo: unknown = null,
) {
  await db.insert(auditoria).values({
    usuarioId,
    fechaHora: new Date(),
    accion,
    detalle,
    valorAnterior: valorAnterior === null ? null : valorAnterior,
    valorNuevo: valorNuevo === null ? null : valorNuevo,
  });
}
