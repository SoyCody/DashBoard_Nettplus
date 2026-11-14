import type { NextFunction, Request, Response } from 'express';
import { loginSchema } from '../validators/auth.schema.js';
import { getSessionInactivityMinutes, loginUser } from '../services/auth.service.js';
import env from '../config/env.js';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { writeAudit } from '../utils/audit.js';

export async function loginController(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: parsed.error.issues[0]?.message ?? 'Datos de autenticación inválidos',
      });
    }

    const result = await loginUser(parsed.data);
    if (!result.ok) {
      return res.status(401).json({ message: result.message });
    }

    res.cookie('nettplus_token', result.token, {
      httpOnly: true,
      sameSite: 'strict',
      secure: env.nodeEnv === 'production',
      maxAge: (await getSessionInactivityMinutes()) * 60 * 1000,
    });

    return res.status(200).json({
      message: 'Inicio de sesión correcto',
      user: result.user,
      sessionInactivityMinutes: await getSessionInactivityMinutes(),
    });
  } catch (error) {
    next(error);
  }
}

export async function logoutController(req: Request, res: Response, next: NextFunction) {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (user) {
      await writeAudit(user.id, 'logout', `Cierre de sesión para ${user.usuario}`);
    }

    res.clearCookie('nettplus_token', { httpOnly: true, sameSite: 'strict', secure: env.nodeEnv === 'production' });
    return res.status(200).json({ message: 'Sesión cerrada correctamente' });
  } catch (error) {
    return next(error);
  }
}

export async function meController(req: Request, res: Response, next: NextFunction) {
  try {
    const user = (req as AuthenticatedRequest).user;
    return res.status(200).json({ user: user ?? null, sessionInactivityMinutes: await getSessionInactivityMinutes() });
  } catch (error) {
    return next(error);
  }
}
