import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { authRouter } from './routes/auth.routes.js';
import { healthRouter } from './routes/health.routes.js';
import { usersRouter } from './routes/users.routes.js';
import { settingsRouter } from './routes/settings.routes.js';
import { importRouter } from './routes/import.routes.js';
import env from './config/env.js';

export const app = express();

app.use(helmet());
app.use((req, res, next) => {
  const origin = req.header('Origin');
  if (!origin || env.corsOrigins.includes(origin)) {
    return next();
  }
  return res.status(403).json({ message: 'Origen no permitido' });
});
app.use(cors({ origin: env.corsOrigins, credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb', parameterLimit: 100 }));
app.use(morgan('dev'));

app.use('/api', healthRouter);
app.use('/api', authRouter);
app.use('/api', usersRouter);
app.use('/api', settingsRouter);
app.use('/api', importRouter);

app.use((error: Error & { status?: number; statusCode?: number; type?: string }, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (res.headersSent) {
    return next(error);
  }
  const status = error.status ?? error.statusCode
    ?? (error.type === 'entity.parse.failed' ? 400 : error.type === 'entity.too.large' ? 413 : 500);
  if (env.nodeEnv !== 'production') {
    console.error(error.stack);
  } else if (status >= 500) {
    console.error('Error interno procesando una solicitud API.');
  }
  res.status(status).json({
    message: status === 400
      ? 'La solicitud contiene JSON inválido'
      : status === 413
        ? 'La solicitud supera el tamaño permitido'
        : status >= 500
          ? 'Error interno del servidor'
          : error.message,
  });
});
