import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { authRouter } from './routes/auth.routes.js';
import { healthRouter } from './routes/health.routes.js';
import { usersRouter } from './routes/users.routes.js';

export const app = express();

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

app.use('/api', healthRouter);
app.use('/api', authRouter);
app.use('/api', usersRouter);

app.use((err: Error & { status?: number; type?: string }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  const status = err.status ?? (err.type === 'entity.parse.failed' ? 400 : 500);
  res.status(status).json({
    message: status === 400 ? 'La solicitud contiene JSON inválido' : 'Error interno del servidor',
  });
});
