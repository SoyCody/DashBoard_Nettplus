import type { NextFunction, Request, Response } from 'express';
import { createSessionToken, getSessionInactivityMinutes, verifySessionToken, type AuthenticatedUser } from '../services/auth.service.js';
import env from '../config/env.js';

export type AuthenticatedRequest = Request & {
  user?: AuthenticatedUser;
};

function getTokenFromCookie(header?: string): string | null {
  if (!header) {
    return null;
  }

  const cookiePair = header
    .split(';')
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith('nettplus_token='));

  if (!cookiePair) {
    return null;
  }

  const separator = cookiePair.indexOf('=');
  const token = cookiePair.slice(separator + 1);
  try {
    return token ? decodeURIComponent(token) : null;
  } catch {
    return null;
  }
}

export async function authRequired(req: Request, res: Response, next: NextFunction) {
  try {
    const request = req as AuthenticatedRequest;
    const token = getTokenFromCookie(req.headers.cookie);

    if (!token) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    const user = await verifySessionToken(token);
    if (!user) {
      res.clearCookie('nettplus_token', { httpOnly: true, sameSite: 'strict', secure: env.nodeEnv === 'production' });
      return res.status(401).json({ message: 'Sesión expirada o inválida' });
    }

    request.user = user;
    const sessionMinutes = await getSessionInactivityMinutes();
    res.cookie('nettplus_token', await createSessionToken(user), {
      httpOnly: true,
      sameSite: 'strict',
      secure: env.nodeEnv === 'production',
      maxAge: sessionMinutes * 60 * 1000,
    });
    return next();
  } catch (error) {
    return next(error);
  }
}

export async function authOptional(req: Request, res: Response, next: NextFunction) {
  try {
    const request = req as AuthenticatedRequest;
    const token = getTokenFromCookie(req.headers.cookie);

    if (!token) {
      return next();
    }

    request.user = (await verifySessionToken(token)) ?? undefined;
    if (!request.user) {
      res.clearCookie('nettplus_token', { httpOnly: true, sameSite: 'strict', secure: env.nodeEnv === 'production' });
    }
    return next();
  } catch (error) {
    return next(error);
  }
}
