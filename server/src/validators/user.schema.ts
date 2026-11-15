import { z } from 'zod';
import { permissionModules } from '../services/user.service.js';

const permissionSchema = z.object({
  modulo: z.enum([
    'dashboard',
    'importar',
    'historial',
    'resumen_diario',
    'reportes_mensual',
    'usuarios',
    'parametros',
    'auditoria',
    'respaldos',
  ]),
  ver: z.boolean(),
  crear: z.boolean(),
  editar: z.boolean(),
  exportar: z.boolean(),
});

const passwordSchema = z.string()
  .min(8)
  .max(128)
  .refine((password) => Buffer.byteLength(password, 'utf8') <= 72, 'La contraseña no puede superar 72 bytes.');

const userFields = {
  nombres: z.string().trim().min(1).max(100),
  apellidos: z.string().trim().min(1).max(100),
  correo: z.string().trim().email().max(150),
  usuario: z.string().trim().min(3).max(80),
  rolId: z.number().int().positive(),
  estado: z.enum(['activo', 'inactivo']),
  cedula: z.string().trim().max(30).optional(),
  telefono: z.string().trim().max(30).optional(),
  permisos: z.array(permissionSchema).length(permissionModules.length).optional(),
};

export const createUserSchema = z.object({
  ...userFields,
  password: passwordSchema,
});

export const updateUserSchema = z.object({
  ...userFields,
  password: z.union([z.literal(''), passwordSchema]).optional(),
});

export const userStatusSchema = z.object({
  estado: z.enum(['activo', 'inactivo']),
});
