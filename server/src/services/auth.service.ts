import bcrypt from 'bcryptjs';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import env from '../config/env.js';
import { db } from '../config/db.js';
import { parametros, roles, usuarios } from '../db/schema.js';
import { writeAudit } from '../utils/audit.js';

export type AuthenticatedUser = {
  id: number;
  nombres: string;
  apellidos: string;
  correo: string;
  usuario: string;
  rolId: number;
  estado: string;
  role: string;
};

export async function getSessionInactivityMinutes() {
  const [parameter] = await db
    .select({ valor: parametros.valor })
    .from(parametros)
    .where(eq(parametros.clave, 'inactividad_sesion_minutos'))
    .limit(1);
  const configuredMinutes = Number(parameter?.valor ?? env.sessionInactivityMinutes);
  return Number.isFinite(configuredMinutes) && configuredMinutes > 0 ? configuredMinutes : 30;
}

export async function createSessionToken(user: AuthenticatedUser) {
  const sessionMinutes = await getSessionInactivityMinutes();
  return jwt.sign(
    {
      sub: user.id,
      usuario: user.usuario,
      role: user.role,
      rolId: user.rolId,
    },
    env.jwtSecret,
    { expiresIn: `${sessionMinutes}m` },
  );
}

export async function getUserById(userId: number): Promise<AuthenticatedUser | null> {
  const rows = await db
    .select({
      user: usuarios,
      roleName: roles.nombre,
    })
    .from(usuarios)
    .leftJoin(roles, eq(roles.id, usuarios.rolId))
    .where(eq(usuarios.id, userId))
    .limit(1);

  const record = rows[0];
  if (!record) {
    return null;
  }

  return {
    id: record.user.id,
    nombres: record.user.nombres,
    apellidos: record.user.apellidos,
    correo: record.user.correo,
    usuario: record.user.usuario,
    rolId: record.user.rolId,
    estado: record.user.estado,
    role: record.roleName ?? 'sin_rol',
  };
}

export async function loginUser(input: { usuario: string; password: string }) {
  const usuario = input.usuario.trim();
  const rows = await db
    .select({
      user: usuarios,
      roleName: roles.nombre,
    })
    .from(usuarios)
    .leftJoin(roles, eq(roles.id, usuarios.rolId))
    .where(eq(usuarios.usuario, usuario))
    .limit(1);

  const record = rows[0];
  if (!record) {
    await writeAudit(
      null,
      'login_fallido',
      `Intento de acceso con usuario no registrado: ${usuario}`,
      null,
      { usuario, resultado: 'usuario_inexistente' },
    );
    return { ok: false, message: 'Usuario o contraseña incorrectos' };
  }

  const user = record.user;
  const roleName = record.roleName ?? 'sin_rol';

  const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);
  if (!isPasswordValid) {
    await writeAudit(
      user.id,
      'login_fallido',
      `Credenciales incorrectas para el usuario ${user.usuario}`,
      null,
      { usuario: user.usuario, resultado: 'password_incorrecto' },
    );
    return { ok: false, message: 'Usuario o contraseña incorrectos' };
  }

  if (user.estado !== 'activo') {
    await writeAudit(
      user.id,
      'login_fallido',
      `Intento de acceso con usuario inactivo: ${user.usuario}`,
      null,
      { usuario: user.usuario, resultado: 'usuario_inactivo' },
    );
    return { ok: false, message: 'Usuario inactivo' };
  }

  const authenticatedUser: AuthenticatedUser = {
    id: user.id,
    nombres: user.nombres,
    apellidos: user.apellidos,
    correo: user.correo,
    usuario: user.usuario,
    rolId: user.rolId,
    estado: user.estado,
    role: roleName,
  };
  const token = await createSessionToken(authenticatedUser);
  const sessionMinutes = await getSessionInactivityMinutes();

  await db.update(usuarios).set({ ultimoAcceso: new Date() }).where(eq(usuarios.id, user.id));

  await writeAudit(
    user.id,
    'login_exitoso',
    `Acceso correcto para ${user.usuario}`,
    null,
    { usuario: user.usuario, rol: roleName, sesion_minutos: sessionMinutes },
  );

  return {
    ok: true,
    token,
    user: authenticatedUser,
  };
}

export async function verifySessionToken(token: string): Promise<AuthenticatedUser | null> {
  let payload: JwtPayload;
  try {
    payload = jwt.verify(token, env.jwtSecret) as JwtPayload;
  } catch {
    return null;
  }

  const userId = Number(payload.sub ?? payload.userId ?? 0);
  if (!userId) {
    return null;
  }

  const user = await getUserById(userId);
  if (!user || user.estado !== 'activo') {
    return null;
  }

  return user;
}
