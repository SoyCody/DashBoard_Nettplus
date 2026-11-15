import type { NextFunction, Request, Response } from 'express';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import {
  createCollaborator,
  createShift,
  getParameters,
  listCollaborators,
  listDepartments,
  listShifts,
  SettingsServiceError,
  setCollaboratorStatus,
  updateCollaborator,
  updateParameters,
  updateShift,
} from '../services/settings.service.js';
import { collaboratorSchema, collaboratorStatusSchema, parametersSchema, shiftSchema } from '../validators/settings.schema.js';
import { collaboratorListSchema, positiveIdSchema } from '../validators/pagination.schema.js';

function actorId(req: Request) {
  const id = (req as AuthenticatedRequest).user?.id;
  if (!id) {
    throw new SettingsServiceError('No autenticado', 401);
  }
  return id;
}

function parseId(value: string) {
  const parsed = positiveIdSchema.safeParse(value);
  if (!parsed.success) {
    throw new SettingsServiceError('Identificador inválido', 400);
  }
  return parsed.data;
}

function respondError(error: unknown, next: NextFunction, res: Response) {
  if (error instanceof SettingsServiceError) {
    return res.status(error.status).json({ message: error.message });
  }
  return next(error);
}

export async function listDepartmentsController(_req: Request, res: Response, next: NextFunction) {
  try {
    return res.status(200).json({ departments: await listDepartments() });
  } catch (error) {
    return respondError(error, next, res);
  }
}

export async function listCollaboratorsController(req: Request, res: Response, next: NextFunction) {
  const parsed = collaboratorListSchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0]?.message ?? 'Consulta de colaboradores inválida' });
  }
  try {
    return res.status(200).json(await listCollaborators(parsed.data));
  } catch (error) {
    return respondError(error, next, res);
  }
}

export async function createCollaboratorController(req: Request, res: Response, next: NextFunction) {
  const parsed = collaboratorSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0]?.message ?? 'Datos de colaborador inválidos' });
  }
  try {
    return res.status(201).json({ collaborator: await createCollaborator(parsed.data, actorId(req)) });
  } catch (error) {
    return respondError(error, next, res);
  }
}

export async function updateCollaboratorController(req: Request, res: Response, next: NextFunction) {
  const parsed = collaboratorSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0]?.message ?? 'Datos de colaborador inválidos' });
  }
  try {
    return res.status(200).json({ collaborator: await updateCollaborator(parseId(req.params.id), parsed.data, actorId(req)) });
  } catch (error) {
    return respondError(error, next, res);
  }
}

export async function setCollaboratorStatusController(req: Request, res: Response, next: NextFunction) {
  const parsed = collaboratorStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0]?.message ?? 'Estado inválido' });
  }
  try {
    return res.status(200).json({
      collaborator: await setCollaboratorStatus(parseId(req.params.id), parsed.data.estadoLaboral, actorId(req)),
    });
  } catch (error) {
    return respondError(error, next, res);
  }
}

export async function listShiftsController(_req: Request, res: Response, next: NextFunction) {
  try {
    return res.status(200).json({ shifts: await listShifts() });
  } catch (error) {
    return respondError(error, next, res);
  }
}

export async function createShiftController(req: Request, res: Response, next: NextFunction) {
  const parsed = shiftSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0]?.message ?? 'Datos de turno inválidos' });
  }
  try {
    return res.status(201).json({ shift: await createShift(parsed.data, actorId(req)) });
  } catch (error) {
    return respondError(error, next, res);
  }
}

export async function updateShiftController(req: Request, res: Response, next: NextFunction) {
  const parsed = shiftSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0]?.message ?? 'Datos de turno inválidos' });
  }
  try {
    return res.status(200).json({ shift: await updateShift(parseId(req.params.id), parsed.data, actorId(req)) });
  } catch (error) {
    return respondError(error, next, res);
  }
}

export async function getParametersController(_req: Request, res: Response, next: NextFunction) {
  try {
    return res.status(200).json({ parameters: await getParameters() });
  } catch (error) {
    return respondError(error, next, res);
  }
}

export async function updateParametersController(req: Request, res: Response, next: NextFunction) {
  const parsed = parametersSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0]?.message ?? 'Parámetros inválidos' });
  }
  try {
    return res.status(200).json({ parameters: await updateParameters(parsed.data, actorId(req)) });
  } catch (error) {
    return respondError(error, next, res);
  }
}
