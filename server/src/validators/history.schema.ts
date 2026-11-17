import { z } from 'zod';
import { paginationSchema } from './pagination.schema.js';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}, 'La fecha no es válida.');

export const historyListSchema = paginationSchema.extend({
  dateFrom: isoDate.optional(),
  dateTo: isoDate.optional(),
  collaboratorId: z.coerce.number().int().positive().optional(),
  departmentId: z.coerce.number().int().positive().optional(),
  status: z.enum(['puntual', 'atraso', 'ausencia', 'tardanza', 'novedad']).optional(),
  search: z.string().trim().max(100).default(''),
}).superRefine((value, ctx) => {
  if (value.dateFrom && value.dateTo && value.dateFrom > value.dateTo) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['dateTo'],
      message: 'La fecha final no puede ser anterior a la fecha inicial.',
    });
  }
});

export const dailySummarySchema = paginationSchema.extend({
  date: isoDate.optional(),
  dateFrom: isoDate.optional(),
  dateTo: isoDate.optional(),
  departmentId: z.coerce.number().int().positive().optional(),
}).superRefine((value, ctx) => {
  if (value.dateFrom && value.dateTo && value.dateFrom > value.dateTo) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['dateTo'],
      message: 'La fecha final no puede ser anterior a la fecha inicial.',
    });
  }
});

export const reviewListSchema = paginationSchema.extend({
  dateFrom: isoDate.optional(),
  dateTo: isoDate.optional(),
  pendingOnly: z.enum(['true', 'false']).default('true').transform((value) => value === 'true'),
}).superRefine((value, ctx) => {
  if (value.dateFrom && value.dateTo && value.dateFrom > value.dateTo) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['dateTo'],
      message: 'La fecha final no puede ser anterior a la fecha inicial.',
    });
  }
});

export const reviewUpdateSchema = z.object({
  estado: z.enum(['puntual', 'atraso', 'tardanza', 'ausencia', 'novedad']),
  minutosAtraso: z.coerce.number().int().min(0).max(1440).default(0),
  novedad: z.string().trim().max(180).transform((value) => value || null).nullable().optional(),
  pendienteRevision: z.boolean().default(false),
});
