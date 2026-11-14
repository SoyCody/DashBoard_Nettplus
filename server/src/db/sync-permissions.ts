import { db } from '../config/db.js';
import { eq } from 'drizzle-orm';
import { permisosUsuario, roles, usuarios } from './schema.js';
import { defaultPermissionsForRole } from '../services/user.service.js';

async function main() {
  const users = await db
    .select({ id: usuarios.id, role: roles.nombre })
    .from(usuarios)
    .innerJoin(roles, eq(roles.id, usuarios.rolId));

  for (const user of users) {
    const defaults = defaultPermissionsForRole(user.role).map((permission) => ({
      usuarioId: user.id,
      ...permission,
    }));
    await db.insert(permisosUsuario).values(defaults).onConflictDoNothing();
  }

  console.log(`Permisos predeterminados verificados para ${users.length} usuario(s).`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error al sincronizar permisos predeterminados:', error);
    process.exit(1);
  });
