CREATE TABLE "asistencia_diaria" (
	"colaborador_id" integer NOT NULL,
	"fecha" timestamp with time zone NOT NULL,
	"hora_entrada" varchar(10),
	"hora_salida" varchar(10),
	"minutos_atraso" integer DEFAULT 0 NOT NULL,
	"estado" varchar(20) NOT NULL,
	"novedad" varchar(180),
	"pendiente_revision" boolean DEFAULT false NOT NULL,
	CONSTRAINT "asistencia_diaria_colaborador_id_fecha_pk" PRIMARY KEY("colaborador_id","fecha")
);
--> statement-breakpoint
CREATE TABLE "auditoria" (
	"id" serial PRIMARY KEY NOT NULL,
	"usuario_id" integer,
	"fecha_hora" timestamp with time zone DEFAULT now() NOT NULL,
	"accion" varchar(120) NOT NULL,
	"detalle" varchar(250) NOT NULL,
	"valor_anterior" jsonb,
	"valor_nuevo" jsonb
);
--> statement-breakpoint
CREATE TABLE "colaboradores" (
	"id" serial PRIMARY KEY NOT NULL,
	"codigo" varchar(30) NOT NULL,
	"nombres" varchar(100) NOT NULL,
	"apellidos" varchar(100) NOT NULL,
	"departamento_id" integer NOT NULL,
	"turno_id" integer NOT NULL,
	"estado_laboral" varchar(20) DEFAULT 'activo' NOT NULL,
	CONSTRAINT "colaboradores_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
CREATE TABLE "departamentos" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" varchar(100) NOT NULL,
	CONSTRAINT "departamentos_nombre_unique" UNIQUE("nombre")
);
--> statement-breakpoint
CREATE TABLE "importaciones" (
	"id" serial PRIMARY KEY NOT NULL,
	"usuario_id" integer NOT NULL,
	"fecha_hora" timestamp with time zone DEFAULT now() NOT NULL,
	"archivo" varchar(255) NOT NULL,
	"periodo_mes" integer NOT NULL,
	"periodo_anio" integer NOT NULL,
	"total" integer DEFAULT 0 NOT NULL,
	"cargados" integer DEFAULT 0 NOT NULL,
	"omitidos" integer DEFAULT 0 NOT NULL,
	"con_errores" integer DEFAULT 0 NOT NULL,
	"estado" varchar(30) DEFAULT 'pendiente' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marcaciones" (
	"id" serial PRIMARY KEY NOT NULL,
	"importacion_id" integer,
	"colaborador_id" integer NOT NULL,
	"fecha" timestamp with time zone NOT NULL,
	"hora" varchar(10) NOT NULL,
	"tipo" varchar(20) NOT NULL,
	"estado" varchar(20) DEFAULT 'valido' NOT NULL,
	"motivo" varchar(150)
);
--> statement-breakpoint
CREATE TABLE "parametros" (
	"clave" varchar(100) PRIMARY KEY NOT NULL,
	"valor" varchar(120) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "permisos_usuario" (
	"usuario_id" integer NOT NULL,
	"modulo" varchar(60) NOT NULL,
	"ver" boolean DEFAULT false NOT NULL,
	"crear" boolean DEFAULT false NOT NULL,
	"editar" boolean DEFAULT false NOT NULL,
	"exportar" boolean DEFAULT false NOT NULL,
	CONSTRAINT "permisos_usuario_usuario_id_modulo_pk" PRIMARY KEY("usuario_id","modulo")
);
--> statement-breakpoint
CREATE TABLE "respaldos" (
	"id" serial PRIMARY KEY NOT NULL,
	"fecha_hora" timestamp with time zone DEFAULT now() NOT NULL,
	"tamano" varchar(40) NOT NULL,
	"estado" varchar(30) DEFAULT 'ok' NOT NULL,
	"ruta" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" varchar(50) NOT NULL,
	CONSTRAINT "roles_nombre_unique" UNIQUE("nombre")
);
--> statement-breakpoint
CREATE TABLE "turnos" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" varchar(80) NOT NULL,
	"hora_entrada" varchar(10) NOT NULL,
	"hora_salida" varchar(10) NOT NULL,
	"dias_laborables" varchar(30) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombres" varchar(100) NOT NULL,
	"apellidos" varchar(100) NOT NULL,
	"correo" varchar(150) NOT NULL,
	"usuario" varchar(80) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"rol_id" integer NOT NULL,
	"estado" varchar(20) DEFAULT 'activo' NOT NULL,
	"cedula" varchar(30),
	"telefono" varchar(30),
	"ultimo_acceso" timestamp with time zone,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usuarios_correo_unique" UNIQUE("correo"),
	CONSTRAINT "usuarios_usuario_unique" UNIQUE("usuario")
);
--> statement-breakpoint
ALTER TABLE "asistencia_diaria" ADD CONSTRAINT "asistencia_diaria_colaborador_id_colaboradores_id_fk" FOREIGN KEY ("colaborador_id") REFERENCES "public"."colaboradores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "colaboradores" ADD CONSTRAINT "colaboradores_departamento_id_departamentos_id_fk" FOREIGN KEY ("departamento_id") REFERENCES "public"."departamentos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "colaboradores" ADD CONSTRAINT "colaboradores_turno_id_turnos_id_fk" FOREIGN KEY ("turno_id") REFERENCES "public"."turnos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "importaciones" ADD CONSTRAINT "importaciones_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marcaciones" ADD CONSTRAINT "marcaciones_importacion_id_importaciones_id_fk" FOREIGN KEY ("importacion_id") REFERENCES "public"."importaciones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marcaciones" ADD CONSTRAINT "marcaciones_colaborador_id_colaboradores_id_fk" FOREIGN KEY ("colaborador_id") REFERENCES "public"."colaboradores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permisos_usuario" ADD CONSTRAINT "permisos_usuario_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_rol_id_roles_id_fk" FOREIGN KEY ("rol_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;