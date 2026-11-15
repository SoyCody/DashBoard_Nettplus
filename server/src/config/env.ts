import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

dotenv.config({ path: fileURLToPath(new URL('../../../.env', import.meta.url)) });

const nodeEnv = process.env.NODE_ENV ?? 'development';
const envSchema = z.object({
  nodeEnv: z.enum(['development', 'test', 'production']),
  port: z.coerce.number().int().min(1).max(65535),
  jwtSecret: z.string().min(1),
  databaseUrl: z.string().url(),
  sessionInactivityMinutes: z.coerce.number().int().min(1).max(1440),
  corsOrigins: z.string()
    .default('http://localhost:5173')
    .transform((value) => value.split(',').map((origin) => origin.trim()).filter(Boolean))
    .pipe(z.array(z.string().url().refine((origin) => new URL(origin).origin === origin)).min(1)),
});

const parsed = envSchema.safeParse({
  nodeEnv,
  port: process.env.PORT ?? 4000,
  jwtSecret: process.env.JWT_SECRET ?? (nodeEnv === 'production' ? '' : 'nettplus-local-development-secret'),
  databaseUrl: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/nettplus',
  sessionInactivityMinutes: process.env.SESSION_INACTIVITY_MINUTES ?? 30,
  corsOrigins: process.env.CORS_ORIGINS,
});

if (!parsed.success) {
  throw new Error(`Configuración de entorno inválida: ${parsed.error.issues.map((issue) => issue.path.join('.')).join(', ')}`);
}

if (parsed.data.nodeEnv === 'production' && parsed.data.jwtSecret.length < 32) {
  throw new Error('JWT_SECRET debe tener al menos 32 caracteres en producción.');
}

const env = parsed.data;

export default env;
