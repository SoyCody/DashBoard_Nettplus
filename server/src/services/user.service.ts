import bcrypt from 'bcryptjs';
import { and, eq, ne } from 'drizzle-orm';
import { db } from '../config/db.js';
import { auditoria, permisosUsuario, roles, usuarios } from '../db/schema.js';

export const permissionModules = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'importar', label: 'Importar' },
  { key: 'validacion', label: 'Validación de marcaciones' },
  { key: 'historial', label: 'Historial' },
  { key: 'resumen_diario', label: 'Resumen diario' },
  { key: 'reportes_mensual', label: 'Reportes mensuales' },
  { key: 'usuarios', label: 'Usuarios' },
  { key: 'parametros', label: 'Parámetros' },
  { key: 'auditoria', label: 'Auditoría' },
  { key: 'respaldos', label: 'Respaldos' },
] as const;

export type PermissionModule = (typeof permissionModules)[number]['key'];
export type Permission = {
  modulo: PermissionModule;
  ver: boolean;
  crear: boolean;
  editar: boolean;
  exportar: boolean;
};

const readOnly = (modulo: PermissionModule): Permission => ({
  modulo,
  ver: true,
  crear: false,
  editar: false,
  exportar: true,
});

export function defaultPermissionsForRole(role: string): Permission[] {
  const visibleModules: Record<string, PermissionModule[]> = {
    asistente_rrhh: ['dashboard', 'importar', 'validacion', 'historial', 'resumen_diario', 'reportes_mensual'],
    jefe_rrhh: ['dashboard', 'historial', 'resumen_diario', 'reportes_mensual'],
    administrador: permissionModules.map(({ key }) => key),
  };
  const visible = new Set(visibleModules[role] ?? []);

  return permissionModules.map(({ key }) => {
    if (!visible.has(key)) {
      return { modulo: key, ver: false, crear: false, editar: false, exportar: false };
    }

    if (role === 'administrador') {
      return { modulo: key, ver: true, crear: true, editar: true, exportar: true };
    }

    if (role === 'asistente_rrhh' && key === 'importar') {
      return { modulo: key, ver: true, crear: true, editar: false, exportar: true };
    }

    return readOnly(key);
  });
}

export async function listRoles() {
  const roleRows = await db.select({ id: roles.id, nombre: roles.nombre }).from(roles).orderBy(roles.id);
  return roleRows.map((role) => ({
    ...role,
    permisosPredeterminados: defaultPermissionsForRole(role.nombre),
  }));
}

export async function listUsers() {
  const userRows = await db
    .select({
      id: usuarios.id,
      nombres: usuarios.nombres,
      apellidos: usuarios.apellidos,
      correo: usuarios.correo,
      usuario: usuarios.usuario,
      rolId: usuarios.rolId,
      role: roles.nombre,
      estado: usuarios.estado,
      cedula: usuarios.cedula,
      telefono: usuarios.telefono,
      ultimoAcceso: usuarios.ultimoAcceso,
      creadoEn: usuarios.creadoEn,
    })
    .from(usuarios)
    .innerJoin(roles, eq(roles.id, usuarios.rolId))
    .orderBy(usuarios.apellidos, usuarios.nombres);

  const permissionRows = await db.select().from(permisosUsuario);
  const permissionsByUser = new Map<number, Permission[]>();
  for (const permission of permissionRows) {
    const userPermissions = permissionsByUser.get(permission.usuarioId) ?? [];
    userPermissions.push({
      modulo: permission.modulo as PermissionModule,
      ver: permission.ver,
      crear: permission.crear,
      editar: permission.editar,
      exportar: permission.exportar,
    });
    permissionsByUser.set(permission.usuarioId, userPermissions);
  }

  return userRows.map((user) => {
    const assignedPermissions = new Map(
      (permissionsByUser.get(user.id) ?? []).map((permission) => [permission.modulo, permission]),
    );
    const permisos = defaultPermissionsForRole(user.role).map((permission) => ({
      ...permission,
      ...assignedPermissions.get(permission.modulo),
    }));
    return { ...user, permisos };
  });
}

export type UserInput = {
  nombres: string;
  apellidos: string;
  correo: string;
  usuario: string;
  password?: string;
  rolId: number;
  estado: 'activo' | 'inactivo';
  cedula?: string;
  telefono?: string;
  permisos?: Permission[];
};

function isUniqueViolation(error: unknown) {
  let current = error;
  while (typeof current === 'object' && current !== null) {
    if ('code' in current && current.code === '23505') {
      return true;
    }
    current = 'cause' in current ? current.cause : null;
  }
  return false;
}

export class UserServiceError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'UserServiceError';
  }
}

async function getRoleName(roleId: number) {
  const [role] = await db.select({ nombre: roles.nombre }).from(roles).where(eq(roles.id, roleId)).limit(1);
  if (!role) {
    throw new UserServiceError('El rol seleccionado no existe', 400);
  }
  return role.nombre;
}

function normalizePermissions(input: Permission[] | undefined, roleName: string) {
  const permissions = input ?? defaultPermissionsForRole(roleName);
  if (permissions.length !== permissionModules.length) {
    throw new UserServiceError('Debe especificar permisos para todos los módulos', 400);
  }
  const keys = new Set(permissions.map(({ modulo }) => modulo));
  if (keys.size !== permissionModules.length || permissionModules.some(({ key }) => !keys.has(key))) {
    throw new UserServiceError('La matriz de permisos contiene módulos duplicados o desconocidos', 400);
  }
  return permissions;
}

export async function createUser(input: UserInput, actorId: number) {
  const roleName = await getRoleName(input.rolId);
  const permissions = normalizePermissions(input.permisos, roleName);
  const passwordHash = await bcrypt.hash(input.password ?? '', 12);

  try {
    return await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(usuarios)
        .values({
          nombres: input.nombres,
          apellidos: input.apellidos,
          correo: input.correo,
          usuario: input.usuario,
          passwordHash,
          rolId: input.rolId,
          estado: input.estado,
          cedula: input.cedula || null,
          telefono: input.telefono || null,
        })
        .returning({
          id: usuarios.id,
          nombres: usuarios.nombres,
          apellidos: usuarios.apellidos,
          correo: usuarios.correo,
          usuario: usuarios.usuario,
          rolId: usuarios.rolId,
          estado: usuarios.estado,
        });

      await tx.insert(permisosUsuario).values(permissions.map((permission) => ({
        usuarioId: created.id,
        ...permission,
      })));
      await tx.insert(auditoria).values({
        usuarioId: actorId,
        accion: 'crear_usuario',
        detalle: `Creación del usuario ${created.usuario}`,
        valorAnterior: null,
        valorNuevo: { ...created, passwordActualizada: true, permisos: permissions },
      });

      return { ...created, role: roleName };
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new UserServiceError('El usuario o correo ya está registrado', 409);
    }
    throw error;
  }
}

export async function updateUser(userId: number, input: UserInput, actorId: number) {
  const [previous] = await db.select().from(usuarios).where(eq(usuarios.id, userId)).limit(1);
  if (!previous) {
    throw new UserServiceError('Usuario no encontrado', 404);
  }
  if (userId === actorId && input.estado === 'inactivo') {
    throw new UserServiceError('No puedes desactivar tu propio usuario', 400);
  }

  const roleName = await getRoleName(input.rolId);
  const permissions = normalizePermissions(input.permisos, roleName);

  try {
    return await db.transaction(async (tx) => {
      const changes = {
        nombres: input.nombres,
        apellidos: input.apellidos,
        correo: input.correo,
        usuario: input.usuario,
        rolId: input.rolId,
        estado: input.estado,
        cedula: input.cedula || null,
        telefono: input.telefono || null,
        ...(input.password ? { passwordHash: await bcrypt.hash(input.password, 12) } : {}),
      };
      const [updated] = await tx
        .update(usuarios)
        .set(changes)
        .where(eq(usuarios.id, userId))
        .returning({
          id: usuarios.id,
          nombres: usuarios.nombres,
          apellidos: usuarios.apellidos,
          correo: usuarios.correo,
          usuario: usuarios.usuario,
          rolId: usuarios.rolId,
          estado: usuarios.estado,
        });

      await tx.delete(permisosUsuario).where(eq(permisosUsuario.usuarioId, userId));
      await tx.insert(permisosUsuario).values(permissions.map((permission) => ({
        usuarioId: userId,
        ...permission,
      })));
      await tx.insert(auditoria).values({
        usuarioId: actorId,
        accion: 'editar_usuario',
        detalle: `Edición del usuario ${updated.usuario}`,
        valorAnterior: {
          nombres: previous.nombres,
          apellidos: previous.apellidos,
          correo: previous.correo,
          usuario: previous.usuario,
          rolId: previous.rolId,
          estado: previous.estado,
        },
        valorNuevo: { ...updated, passwordActualizada: Boolean(input.password), permisos: permissions },
      });

      return { ...updated, role: roleName };
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new UserServiceError('El usuario o correo ya está registrado', 409);
    }
    throw error;
  }
}

export async function setUserStatus(userId: number, estado: 'activo' | 'inactivo', actorId: number) {
  const [previous] = await db
    .select({ id: usuarios.id, usuario: usuarios.usuario, estado: usuarios.estado })
    .from(usuarios)
    .where(eq(usuarios.id, userId))
    .limit(1);
  if (!previous) {
    throw new UserServiceError('Usuario no encontrado', 404);
  }
  if (userId === actorId && estado === 'inactivo') {
    throw new UserServiceError('No puedes desactivar tu propio usuario', 400);
  }

  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(usuarios)
      .set({ estado })
      .where(and(eq(usuarios.id, userId), ne(usuarios.estado, estado)))
      .returning({ id: usuarios.id, usuario: usuarios.usuario, estado: usuarios.estado });

    if (updated) {
      await tx.insert(auditoria).values({
        usuarioId: actorId,
        accion: estado === 'activo' ? 'activar_usuario' : 'desactivar_usuario',
        detalle: `${estado === 'activo' ? 'Activación' : 'Desactivación'} del usuario ${previous.usuario}`,
        valorAnterior: { estado: previous.estado },
        valorNuevo: { estado: updated.estado },
      });
      return updated;
    }

    return previous;
  });
}
