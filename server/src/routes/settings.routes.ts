import { Router } from 'express';
import {
  createCollaboratorController,
  createShiftController,
  getParametersController,
  listCollaboratorsController,
  listDepartmentsController,
  listShiftsController,
  setCollaboratorStatusController,
  updateCollaboratorController,
  updateParametersController,
  updateShiftController,
} from '../controllers/settings.controller.js';
import { authRequired } from '../middlewares/auth.middleware.js';
import { requirePermission, requireRole } from '../middlewares/role.middleware.js';

export const settingsRouter = Router();

settingsRouter.use(
  ['/departments', '/collaborators', '/shifts', '/parameters'],
  authRequired,
  requireRole('administrador'),
);
settingsRouter.get('/departments', requirePermission('parametros', 'ver'), listDepartmentsController);
settingsRouter.get('/collaborators', requirePermission('parametros', 'ver'), listCollaboratorsController);
settingsRouter.post('/collaborators', requirePermission('parametros', 'crear'), createCollaboratorController);
settingsRouter.put('/collaborators/:id', requirePermission('parametros', 'editar'), updateCollaboratorController);
settingsRouter.patch('/collaborators/:id/status', requirePermission('parametros', 'editar'), setCollaboratorStatusController);
settingsRouter.get('/shifts', requirePermission('parametros', 'ver'), listShiftsController);
settingsRouter.post('/shifts', requirePermission('parametros', 'crear'), createShiftController);
settingsRouter.put('/shifts/:id', requirePermission('parametros', 'editar'), updateShiftController);
settingsRouter.get('/parameters', requirePermission('parametros', 'ver'), getParametersController);
settingsRouter.put('/parameters', requirePermission('parametros', 'editar'), updateParametersController);
