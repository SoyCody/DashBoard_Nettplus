import type { NextFunction, Request, Response } from 'express';
import { createUserSchema, updateUserSchema, userStatusSchema } from '../validators/user.schema.js';
import { createUser, listRoles, listUsers, setUserStatus, updateUser, UserServiceError } from '../services/user.service.js';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { positiveIdSchema } from '../validators/pagination.schema.js';

function actorId(req: Request) {
  const id = (req as AuthenticatedRequest).user?.id;
  if (!id) {
    throw new UserServiceError('No autenticado', 401);
  }
  return id;
}

function respondError(error: unknown, next: NextFunction, res: Response) {
  if (error instanceof UserServiceError) {
    return res.status(error.status).json({ message: error.message });
  }
  return next(error);
}

export async function listUsersController(_req: Request, res: Response, next: NextFunction) {
  try {
    return res.status(200).json({ users: await listUsers() });
  } catch (error) {
    return respondError(error, next, res);
  }
}

export async function listRolesController(_req: Request, res: Response, next: NextFunction) {
  try {
    return res.status(200).json({ roles: await listRoles() });
  } catch (error) {
    return respondError(error, next, res);
  }
}

export async function createUserController(req: Request, res: Response, next: NextFunction) {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0]?.message ?? 'Datos de usuario inválidos' });
  }

  try {
    const user = await createUser(parsed.data, actorId(req));
    return res.status(201).json({ user });
  } catch (error) {
    return respondError(error, next, res);
  }
}

export async function updateUserController(req: Request, res: Response, next: NextFunction) {
  const parsedId = positiveIdSchema.safeParse(req.params.id);
  if (!parsedId.success) {
    return res.status(400).json({ message: 'Identificador de usuario inválido' });
  }
  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0]?.message ?? 'Datos de usuario inválidos' });
  }

  try {
    const user = await updateUser(parsedId.data, parsed.data, actorId(req));
    return res.status(200).json({ user });
  } catch (error) {
    return respondError(error, next, res);
  }
}

export async function setUserStatusController(req: Request, res: Response, next: NextFunction) {
  const parsedId = positiveIdSchema.safeParse(req.params.id);
  if (!parsedId.success) {
    return res.status(400).json({ message: 'Identificador de usuario inválido' });
  }
  const parsed = userStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0]?.message ?? 'Estado inválido' });
  }

  try {
    const user = await setUserStatus(parsedId.data, parsed.data.estado, actorId(req));
    return res.status(200).json({ user });
  } catch (error) {
    return respondError(error, next, res);
  }
}
