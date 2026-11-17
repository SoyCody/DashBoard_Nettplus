import type { NextFunction, Request, Response } from 'express';
import { dailySummarySchema, historyListSchema, reviewListSchema, reviewUpdateSchema } from '../validators/history.schema.js';
import { positiveIdSchema } from '../validators/pagination.schema.js';
import { listHistory, listHistoryOptions, listDailySummary, listReviews, reviewDailyRecord, HistoryServiceError } from '../services/history.service.js';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware.js';

export async function listHistoryController(req: Request, res: Response, next: NextFunction) {
  const parsed = historyListSchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      message: parsed.error.issues[0]?.message ?? 'Consulta de historial inválida.',
    });
  }
  try {
    return res.status(200).json(await listHistory(parsed.data));
  } catch (error) {
    return next(error);
  }
}

export async function listHistoryOptionsController(_req: Request, res: Response, next: NextFunction) {
  try {
    return res.status(200).json(await listHistoryOptions());
  } catch (error) {
    return next(error);
  }
}

export async function listDailySummaryController(req: Request, res: Response, next: NextFunction) {
  const parsed = dailySummarySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      message: parsed.error.issues[0]?.message ?? 'Consulta de resumen diario inválida.',
    });
  }
  try {
    return res.status(200).json(await listDailySummary(parsed.data));
  } catch (error) {
    return next(error);
  }
}

export async function listReviewsController(req: Request, res: Response, next: NextFunction) {
  const parsed = reviewListSchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      message: parsed.error.issues[0]?.message ?? 'Consulta de validación inválida.',
    });
  }
  try {
    return res.status(200).json(await listReviews(parsed.data));
  } catch (error) {
    return next(error);
  }
}

export async function reviewDailyRecordController(req: Request, res: Response, next: NextFunction) {
  const collaboratorId = positiveIdSchema.safeParse(req.params.collaboratorId);
  const fecha = typeof req.params.fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.params.fecha)
    ? { success: true as const, data: req.params.fecha }
    : { success: false as const };
  const body = reviewUpdateSchema.safeParse(req.body);
  const actorId = (req as AuthenticatedRequest).user?.id;
  if (!collaboratorId.success || !fecha.success) {
    return res.status(400).json({ message: 'Identificador o fecha inválida.' });
  }
  if (!body.success) {
    return res.status(400).json({
      message: body.error.issues[0]?.message ?? 'Datos de validación inválidos.',
    });
  }
  if (!actorId) {
    return res.status(401).json({ message: 'No autenticado.' });
  }
  try {
    return res.status(200).json({
      record: await reviewDailyRecord(collaboratorId.data, fecha.data, body.data, actorId),
    });
  } catch (error) {
    if (error instanceof HistoryServiceError) {
      return res.status(error.status).json({ message: error.message });
    }
    return next(error);
  }
}
