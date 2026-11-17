import { z } from 'zod';

const collaboratorFields = {
  codigo: z.string().trim().min(1).max(30),
  nombres: z.string().trim().min(1).max(100),
  apellidos: z.string().trim().min(1).max(100),
  departamentoId: z.number().int().positive(),
  turnoId: z.number().int().positive(),
  estadoLaboral: z.enum(['activo', 'inactivo']),
};

const timeSchema = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, 'La hora debe tener formato HH:mm');

export const collaboratorSchema = z.object(collaboratorFields);
export const collaboratorStatusSchema = z.object({
  estadoLaboral: z.enum(['activo', 'inactivo']),
});

export const shiftSchema = z.object({
  nombre: z.string().trim().min(1).max(80),
  horaEntrada: timeSchema,
  horaSalida: timeSchema,
  diasLaborables: z.string().trim().min(1).max(30).regex(/^[\p{L}\d, -]+$/u, 'Use códigos o nombres de días separados por coma'),
});

export const parametersSchema = z.object({
  tolerancia_atraso_minutos: z.number().int().min(0).max(240),
  inactividad_sesion_minutos: z.number().int().min(1).max(1440),
});
