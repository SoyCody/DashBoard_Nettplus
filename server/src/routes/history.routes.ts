import { Router } from 'express';
import {
  listHistoryController,
  listHistoryOptionsController,
  listDailySummaryController,
  listReviewsController,
  reviewDailyRecordController,
} from '../controllers/history.controller.js';
import { authRequired } from '../middlewares/auth.middleware.js';
import { requirePermission, requireRole } from '../middlewares/role.middleware.js';

export const historyRouter = Router();

historyRouter.use(
  ['/attendance', '/attendance/*'],
  authRequired,
  requireRole('asistente_rrhh', 'jefe_rrhh', 'administrador'),
);
historyRouter.get('/attendance/options', requirePermission('historial', 'ver'), listHistoryOptionsController);
historyRouter.get('/attendance/history', requirePermission('historial', 'ver'), listHistoryController);
historyRouter.get('/attendance/daily', requirePermission('resumen_diario', 'ver'), listDailySummaryController);
historyRouter.get('/attendance/review', requirePermission('validacion', 'ver'), listReviewsController);
historyRouter.patch('/attendance/review/:collaboratorId/:fecha', requirePermission('validacion', 'editar'), reviewDailyRecordController);
