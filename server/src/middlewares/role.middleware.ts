import type { NextFunction, Request, Response } from 'express';
import { and, eq } from 'drizzle-orm';
import { db } from '../config/db.js';
import { permisosUsuario } from '../db/schema.js';
import type { AuthenticatedRequest } from './auth.middleware.js';

export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const request = req as AuthenticatedRequest;
    const userRole = request.user?.role;

    if (!userRole || !allowedRoles.includes(userRole)) {
      return res.status(403).json({ message: 'No tiene permisos para realizar esta acción' });
    }

    return next();
  };
}

export function requirePermission(modulo: string, accion: 'ver' | 'crear' | 'editar' | 'exportar') {
  return async (req: Request, res: Response, next: NextFunction) => {
    const request = req as AuthenticatedRequest;
    const userId = request.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    try {
      const [permission] = await db
        .select({ allowed: permisosUsuario[accion] })
        .from(permisosUsuario)
        .where(and(eq(permisosUsuario.usuarioId, userId), eq(permisosUsuario.modulo, modulo)))
        .limit(1);

      if (!permission?.allowed) {
        return res.status(403).json({ message: 'No tiene el permiso necesario para este módulo' });
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
}
