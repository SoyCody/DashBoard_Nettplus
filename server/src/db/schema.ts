import {
  boolean,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  serial,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';

export const roles = pgTable('roles', {
  id: serial('id').primaryKey(),
  nombre: varchar('nombre', { length: 50 }).notNull().unique(),
});

export const usuarios = pgTable('usuarios', {
  id: serial('id').primaryKey(),
  nombres: varchar('nombres', { length: 100 }).notNull(),
  apellidos: varchar('apellidos', { length: 100 }).notNull(),
  correo: varchar('correo', { length: 150 }).notNull().unique(),
  usuario: varchar('usuario', { length: 80 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  rolId: integer('rol_id')
    .notNull()
    .references(() => roles.id),
  estado: varchar('estado', { length: 20 }).notNull().default('activo'),
  cedula: varchar('cedula', { length: 30 }),
  telefono: varchar('telefono', { length: 30 }),
  ultimoAcceso: timestamp('ultimo_acceso', { withTimezone: true }),
  creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
});

export const permisosUsuario = pgTable(
  'permisos_usuario',
  {
    usuarioId: integer('usuario_id')
      .notNull()
      .references(() => usuarios.id),
    modulo: varchar('modulo', { length: 60 }).notNull(),
    ver: boolean('ver').notNull().default(false),
    crear: boolean('crear').notNull().default(false),
    editar: boolean('editar').notNull().default(false),
    exportar: boolean('exportar').notNull().default(false),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.usuarioId, table.modulo] }),
  }),
);

export const departamentos = pgTable('departamentos', {
  id: serial('id').primaryKey(),
  nombre: varchar('nombre', { length: 100 }).notNull().unique(),
});

export const turnos = pgTable('turnos', {
  id: serial('id').primaryKey(),
  nombre: varchar('nombre', { length: 80 }).notNull(),
  horaEntrada: varchar('hora_entrada', { length: 10 }).notNull(),
  horaSalida: varchar('hora_salida', { length: 10 }).notNull(),
  diasLaborables: varchar('dias_laborables', { length: 30 }).notNull(),
});

export const parametros = pgTable('parametros', {
  clave: varchar('clave', { length: 100 }).primaryKey(),
  valor: varchar('valor', { length: 120 }).notNull(),
});

export const colaboradores = pgTable('colaboradores', {
  id: serial('id').primaryKey(),
  codigo: varchar('codigo', { length: 30 }).notNull().unique(),
  nombres: varchar('nombres', { length: 100 }).notNull(),
  apellidos: varchar('apellidos', { length: 100 }).notNull(),
  departamentoId: integer('departamento_id')
    .notNull()
    .references(() => departamentos.id),
  turnoId: integer('turno_id')
    .notNull()
    .references(() => turnos.id),
  estadoLaboral: varchar('estado_laboral', { length: 20 }).notNull().default('activo'),
});

export const importaciones = pgTable('importaciones', {
  id: serial('id').primaryKey(),
  usuarioId: integer('usuario_id')
    .notNull()
    .references(() => usuarios.id),
  fechaHora: timestamp('fecha_hora', { withTimezone: true }).notNull().defaultNow(),
  archivo: varchar('archivo', { length: 255 }).notNull(),
  periodoMes: integer('periodo_mes').notNull(),
  periodoAnio: integer('periodo_anio').notNull(),
  total: integer('total').notNull().default(0),
  cargados: integer('cargados').notNull().default(0),
  omitidos: integer('omitidos').notNull().default(0),
  conErrores: integer('con_errores').notNull().default(0),
  estado: varchar('estado', { length: 30 }).notNull().default('pendiente'),
});

export const marcaciones = pgTable('marcaciones', {
  id: serial('id').primaryKey(),
  importacionId: integer('importacion_id').references(() => importaciones.id),
  colaboradorId: integer('colaborador_id')
    .notNull()
    .references(() => colaboradores.id),
  fecha: timestamp('fecha', { withTimezone: true }).notNull(),
  hora: varchar('hora', { length: 10 }).notNull(),
  tipo: varchar('tipo', { length: 20 }).notNull(),
  estado: varchar('estado', { length: 20 }).notNull().default('valido'),
  motivo: varchar('motivo', { length: 150 }),
});

export const asistenciaDiaria = pgTable('asistencia_diaria', {
  colaboradorId: integer('colaborador_id')
    .notNull()
    .references(() => colaboradores.id),
  fecha: timestamp('fecha', { withTimezone: true }).notNull(),
  horaEntrada: varchar('hora_entrada', { length: 10 }),
  horaSalida: varchar('hora_salida', { length: 10 }),
  minutosAtraso: integer('minutos_atraso').notNull().default(0),
  estado: varchar('estado', { length: 20 }).notNull(),
  novedad: varchar('novedad', { length: 180 }),
  pendienteRevision: boolean('pendiente_revision').notNull().default(false),
}, (table) => ({
  pk: primaryKey({ columns: [table.colaboradorId, table.fecha] }),
}));

export const auditoria = pgTable('auditoria', {
  id: serial('id').primaryKey(),
  usuarioId: integer('usuario_id').references(() => usuarios.id),
  fechaHora: timestamp('fecha_hora', { withTimezone: true }).notNull().defaultNow(),
  accion: varchar('accion', { length: 120 }).notNull(),
  detalle: varchar('detalle', { length: 250 }).notNull(),
  valorAnterior: jsonb('valor_anterior'),
  valorNuevo: jsonb('valor_nuevo'),
});

export const respaldos = pgTable('respaldos', {
  id: serial('id').primaryKey(),
  fechaHora: timestamp('fecha_hora', { withTimezone: true }).notNull().defaultNow(),
  tamano: varchar('tamano', { length: 40 }).notNull(),
  estado: varchar('estado', { length: 30 }).notNull().default('ok'),
  ruta: varchar('ruta', { length: 255 }).notNull(),
});
