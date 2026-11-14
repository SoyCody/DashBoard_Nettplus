import bcrypt from 'bcryptjs';
import { db } from '../config/db.js';
import { defaultPermissionsForRole } from '../services/user.service.js';
import {
  auditoria,
  asistenciaDiaria,
  colaboradores,
  departamentos,
  importaciones,
  marcaciones,
  parametros,
  permisosUsuario,
  respaldos,
  roles,
  turnos,
  usuarios,
} from './schema.js';

async function reset() {
  await db.delete(marcaciones);
  await db.delete(asistenciaDiaria);
  await db.delete(importaciones);
  await db.delete(auditoria);
  await db.delete(respaldos);
  await db.delete(colaboradores);
  await db.delete(permisosUsuario);
  await db.delete(usuarios);
  await db.delete(parametros);
  await db.delete(turnos);
  await db.delete(departamentos);
  await db.delete(roles);
}

async function main() {
  await reset();

  const roleRows = [
    { nombre: 'asistente_rrhh' },
    { nombre: 'jefe_rrhh' },
    { nombre: 'administrador' },
  ];

  await db.insert(roles).values(roleRows);

  const roleMap = await db.query.roles.findMany({});
  const assistantRole = roleMap.find((role) => role.nombre === 'asistente_rrhh');
  const leaderRole = roleMap.find((role) => role.nombre === 'jefe_rrhh');
  const adminRole = roleMap.find((role) => role.nombre === 'administrador');

  if (!assistantRole || !leaderRole || !adminRole) {
    throw new Error('No se pudieron cargar los roles base');
  }

  const passwordHash = async (raw: string) => bcrypt.hash(raw, 10);

  const users = [
    {
      nombres: 'Ana',
      apellidos: 'Torres',
      correo: 'asistente@nettplus.ec',
      usuario: 'asistente',
      passwordHash: await passwordHash('Asistente123!'),
      rolId: assistantRole.id,
      estado: 'activo',
    },
    {
      nombres: 'Carlos',
      apellidos: 'Vicuña',
      correo: 'jefe@nettplus.ec',
      usuario: 'jefe',
      passwordHash: await passwordHash('Jefe123!'),
      rolId: leaderRole.id,
      estado: 'activo',
    },
    {
      nombres: 'María',
      apellidos: 'Cedeño',
      correo: 'admin@nettplus.ec',
      usuario: 'admin',
      passwordHash: await passwordHash('Admin123!'),
      rolId: adminRole.id,
      estado: 'activo',
    },
  ];

  await db.insert(usuarios).values(users);
  const userMap = await db.query.usuarios.findMany({});

  const defaultUser = userMap.find((user) => user.usuario === 'admin');
  if (!defaultUser) {
    throw new Error('No se pudo crear el usuario administrador');
  }

  const departmentRows = [{ nombre: 'Operación' }, { nombre: 'Administración' }, { nombre: 'Soporte' }];
  await db.insert(departamentos).values(departmentRows);
  const departments = await db.query.departamentos.findMany({});

  const shiftRows = [
    { nombre: 'Turno Matutino', horaEntrada: '08:00', horaSalida: '17:00', diasLaborables: 'L,M,MJ,J,V' },
    { nombre: 'Turno Vespertino', horaEntrada: '09:00', horaSalida: '18:00', diasLaborables: 'L,M,MJ,J,V' },
  ];
  await db.insert(turnos).values(shiftRows);
  const shifts = await db.query.turnos.findMany({});

  await db.insert(parametros).values([
    { clave: 'tolerancia_atraso_minutos', valor: '10' },
    { clave: 'inactividad_sesion_minutos', valor: '30' },
  ]);

  const permissions = userMap.flatMap((user) => {
    const roleName = roleMap.find((role) => role.id === user.rolId)?.nombre;
    if (!roleName) {
      throw new Error(`No se pudo resolver el rol del usuario ${user.usuario}`);
    }
    return defaultPermissionsForRole(roleName).map((permission) => ({
      usuarioId: user.id,
      ...permission,
    }));
  });
  await db.insert(permisosUsuario).values(permissions);

  const collaboratorRows = [
    ['NET-1001', 'Carlos', 'Mendoza', 'Operación', 'Turno Matutino'],
    ['NET-1002', 'Lucía', 'Pérez', 'Operación', 'Turno Matutino'],
    ['NET-1003', 'Mateo', 'Villalba', 'Operación', 'Turno Matutino'],
    ['NET-1004', 'Fernanda', 'Sánchez', 'Operación', 'Turno Vespertino'],
    ['NET-1005', 'Javier', 'Rojas', 'Operación', 'Turno Matutino'],
    ['NET-1101', 'Paola', 'Guerrero', 'Administración', 'Turno Matutino'],
    ['NET-1102', 'Rafael', 'Jiménez', 'Administración', 'Turno Matutino'],
    ['NET-1103', 'Valeria', 'Cañizares', 'Administración', 'Turno Vespertino'],
    ['NET-1201', 'Daniel', 'Flores', 'Soporte', 'Turno Vespertino'],
    ['NET-1202', 'Estefanía', 'Paredes', 'Soporte', 'Turno Matutino'],
    ['NET-1203', 'Marcelo', 'Vargas', 'Soporte', 'Turno Matutino'],
    ['NET-1204', 'Sofía', 'Aguirre', 'Soporte', 'Turno Vespertino'],
    ['NET-1301', 'Andrés', 'Cárdenas', 'Operación', 'Turno Matutino'],
    ['NET-1302', 'Lesly', 'Roldán', 'Administración', 'Turno Vespertino'],
    ['NET-1303', 'Oscar', 'Salazar', 'Soporte', 'Turno Matutino'],
  ] as const;

  const collaboratorPayload = collaboratorRows.map(([codigo, nombres, apellidos, departamentoNombre, turnoNombre]) => {
    const department = departments.find((item) => item.nombre === departamentoNombre);
    const shift = shifts.find((item) => item.nombre === turnoNombre);

    if (!department || !shift) {
      throw new Error(`No se pudo resolver el departamento o turno para ${codigo}`);
    }

    return {
      codigo,
      nombres,
      apellidos,
      departamentoId: department.id,
      turnoId: shift.id,
      estadoLaboral: 'activo',
    };
  });

  await db.insert(colaboradores).values(collaboratorPayload);
  const collaboratorList = await db.query.colaboradores.findMany({});

  const importDate = new Date(2026, 6, 1, 9, 30, 0);
  await db.insert(importaciones).values({
    usuarioId: defaultUser.id,
    fechaHora: importDate,
    archivo: 'zbiotime_julio_2026.xlsx',
    periodoMes: 7,
    periodoAnio: 2026,
    total: collaboratorList.length,
    cargados: collaboratorList.length,
    omitidos: 0,
    conErrores: 0,
    estado: 'procesada',
  });

  const importRow = await db.query.importaciones.findFirst({
    orderBy: (table, { desc }) => [desc(table.id)],
  });

  if (!importRow) {
    throw new Error('No se pudo crear la importación de ejemplo');
  }

  const markers = [] as Array<{ importacionId: number; colaboradorId: number; fecha: Date; hora: string; tipo: string; estado: string; motivo?: string | null }>;

  collaboratorList.forEach((person, index) => {
    const baseDay = new Date(2026, 6, 1 + (index % 6));

    markers.push({
      importacionId: importRow.id,
      colaboradorId: person.id,
      fecha: new Date(baseDay.getTime() + 3 * 60 * 60 * 1000),
      hora: '08:02',
      tipo: 'entrada',
      estado: 'valido',
      motivo: null,
    });

    markers.push({
      importacionId: importRow.id,
      colaboradorId: person.id,
      fecha: new Date(baseDay.getTime() + 9 * 60 * 60 * 1000),
      hora: '17:00',
      tipo: 'salida',
      estado: 'valido',
      motivo: null,
    });
  });

  if (markers.length > 0) {
    await db.insert(marcaciones).values(markers);
  }

  const dailyCapture = collaboratorList.map((person) => ({
    colaboradorId: person.id,
    fecha: new Date(2026, 6, 1),
    horaEntrada: '08:02',
    horaSalida: '17:00',
    minutosAtraso: 2,
    estado: 'puntual',
    novedad: null,
    pendienteRevision: false,
  }));

  await db.insert(asistenciaDiaria).values(dailyCapture);

  await db.insert(auditoria).values({
    usuarioId: defaultUser.id,
    fechaHora: new Date(),
    accion: 'crear_seed',
    detalle: 'Se inicializó la base con roles, usuarios, colaboradores y datos de ejemplo.',
    valorAnterior: null,
    valorNuevo: { tipo: 'seed', usuarios: 3, colaboradores: collaboratorList.length },
  });

  await db.insert(respaldos).values({
    fechaHora: new Date(),
    tamano: '128 MB',
    estado: 'ok',
    ruta: '/backups/nettplus/backup_2026_07.sql',
  });

  console.log('Seed ejecutado con éxito.');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error durante el seed:', error);
    process.exit(1);
  });
