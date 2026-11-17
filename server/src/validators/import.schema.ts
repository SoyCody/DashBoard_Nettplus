import { z } from 'zod';

export const importPeriodSchema = z.object({
  periodoMes: z.coerce.number().int().min(1).max(12),
  periodoAnio: z.coerce.number().int().min(2000).max(2100),
});

export type ImportPeriod = z.infer<typeof importPeriodSchema>;
