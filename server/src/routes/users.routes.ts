import { Router } from 'express';
import {
  createUserController,
  listRolesController,
  listUsersController,
  setUserStatusController,
  updateUserController,
} from '../controllers/users.controller.js';
import { authRequired } from '../middlewares/auth.middleware.js';
import { requirePermission, requireRole } from '../middlewares/role.middleware.js';

export const usersRouter = Router();

usersRouter.use(authRequired, requireRole('administrador'));
usersRouter.get('/users', requirePermission('usuarios', 'ver'), listUsersController);
usersRouter.get('/roles', requirePermission('usuarios', 'ver'), listRolesController);
usersRouter.post('/users', requirePermission('usuarios', 'crear'), createUserController);
usersRouter.put('/users/:id', requirePermission('usuarios', 'editar'), updateUserController);
usersRouter.patch('/users/:id/status', requirePermission('usuarios', 'editar'), setUserStatusController);
