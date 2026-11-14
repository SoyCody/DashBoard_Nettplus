import { Router } from 'express';
import { loginController, logoutController, meController } from '../controllers/auth.controller.js';
import { authOptional, authRequired } from '../middlewares/auth.middleware.js';

export const authRouter = Router();

authRouter.post('/auth/login', loginController);
authRouter.post('/auth/logout', authOptional, logoutController);
authRouter.get('/auth/me', authOptional, meController);
authRouter.post('/auth/refresh', authRequired, (_req, res) => {
  res.status(200).json({ ok: true });
});
