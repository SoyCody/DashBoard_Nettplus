import { z } from 'zod';

export const loginSchema = z.object({
  usuario: z.string().trim().min(3, 'El usuario es obligatorio').max(80),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').max(255),
});

export type LoginInput = z.infer<typeof loginSchema>;
