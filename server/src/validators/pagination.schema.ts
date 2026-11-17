import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const collaboratorListSchema = paginationSchema.extend({
  search: z.string().trim().max(100).default(''),
});

export const positiveIdSchema = z.coerce.number().int().positive().safe();

export type Pagination = z.infer<typeof paginationSchema>;
export type CollaboratorListQuery = z.infer<typeof collaboratorListSchema>;
