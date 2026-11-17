# Dashboard de Nómina NETTPLUS

Aplicación interna de Recursos Humanos para consultar asistencia. El cálculo y pago de nómina y la conexión directa con Z-BioTime están fuera del alcance.

## Requisitos

- Node.js 20 o posterior y npm
- PostgreSQL instalado y ejecutándose
- Base de datos local llamada `nettplus`

## Configuración local

1. Instala dependencias desde la raíz:

   ```powershell
   npm install
   ```

2. Copia `.env.example` como `.env` en la raíz y configura `DATABASE_URL` con la contraseña real de PostgreSQL. Mantén `PORT=4000` para la API; PostgreSQL normalmente escucha en `5432`.

3. Crea la base `nettplus` si aún no existe y aplica el esquema:

   ```powershell
   npm --workspace server run db:migrate
   ```

4. Inicializa los permisos predeterminados de usuarios existentes sin reemplazar permisos ya configurados:

   ```powershell
   npm --workspace server run db:permissions
   ```

5. Para cargar datos de demostración por primera vez:

   ```powershell
   npm --workspace server run db:seed
   ```

   **Advertencia:** el seed reinicia los datos de las tablas de la aplicación. No lo ejecutes sobre una base con información que quieras conservar.

6. Inicia el servidor y la interfaz:

   ```powershell
   npm run dev
   ```

   Frontend: `http://localhost:5173`  
   API: `http://localhost:4000/api`

## Usuarios de demostración

El seed crea estas cuentas para uso local:

| Rol | Usuario | Contraseña |
|---|---|---|
| Administrador | `admin` | `Admin123!` |
| Asistente de RR.HH. | `asistente` | `Asistente123!` |
| Jefe de RR.HH. | `jefe` | `Jefe123!` |

Cambie o elimine estas credenciales antes de cualquier despliegue. No reutilice las contraseñas de demostración en producción.

## Seguridad y despliegue

- En local, ejecuta con `NODE_ENV=development` y usa HTTP en `localhost`. `CORS_ORIGINS` es una lista separada por comas de orígenes completos (esquema, host y puerto, sin rutas); en local, `http://localhost:5173`.
- En producción, publica la interfaz y la API detrás de un proxy inverso con TLS (por ejemplo, Caddy o Nginx) y redirige HTTP a HTTPS. Sirve la carpeta `client/dist` en el origen HTTPS y reenvía `/api` a Express en la red privada, conservando el prefijo `/api`.
- Configura `NODE_ENV=production`, `CORS_ORIGINS=https://tu-dominio`, `DATABASE_URL` y un `JWT_SECRET` aleatorio de al menos 32 caracteres. En producción, la cookie de sesión se marca `Secure`; configura HTTPS en el proxy y no expongas directamente el puerto de Express. Define `VITE_API_URL=/api` al compilar la interfaz para usar el mismo origen.
- Genera un secreto sin guardarlo en el repositorio, por ejemplo en PowerShell: `$secret = [Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 }))`. Colócalo en el gestor de secretos del despliegue.
- No ejecutes `db:seed` en producción: es solo para demostración y reinicia datos. Aplica las migraciones con `npm --workspace server run db:migrate`.

Las contraseñas de usuario se guardan con hash bcrypt; el backend aplica autenticación, roles y permisos en cada ruta protegida. Las sesiones usan cookies `httpOnly`, `SameSite=Strict`, vencimiento por inactividad y `Secure` en producción. Helmet y validación Zod se aplican en el servidor. La aplicación solo agrega entradas de auditoría y no ofrece rutas para modificarlas o eliminarlas.

## Configuración administrativa

La pantalla `/parametros` está disponible para Administradores e incluye:

- Alta, edición, activación y desactivación de colaboradores.
- Administración de turnos, horarios y días laborables.
- Configuración de tolerancia de atraso e inactividad de sesión.

Los cambios se validan en la API y se registran en auditoría. Los departamentos existentes se ofrecen como opciones al asignar colaboradores.

## Importación de marcaciones

La pantalla `/importar` permite a Asistentes de RR.HH. y Administradores cargar archivos `.xls` o `.xlsx` de hasta 10 MB. La API valida tanto la extensión como la firma binaria y el contenido del libro; no confía en el nombre ni en el MIME enviado por el navegador. Antes de confirmar, valida las columnas `codigo`, `fecha`, `hora` y `tipo`, el período seleccionado, los colaboradores y las marcaciones duplicadas. La importación informa el avance de validación y guardado. El historial y la consulta de colaboradores usan paginación; las marcaciones tienen índices por colaborador/fecha y fecha. La plantilla incluye ejemplos: reemplaza `NET-1001` por el código de un colaborador registrado y usa `entrada` o `salida` como tipo. Las filas válidas se guardan; las duplicadas y las filas con errores se resumen y no se importan.

## Historial de asistencia

La pantalla `/historial` permite consultar asistencia consolidada por colaborador y fecha. Los roles Asistente de RR.HH., Jefe de RR.HH. y Administrador pueden usar filtros por rango de fechas, departamento, colaborador, estado y búsqueda. Los resultados usan paginación de servidor y muestran entrada, salida, minutos de atraso, estado y novedades pendientes.

## Resumen diario

La pantalla `/resumen-diario` consolida asistencia por fecha y departamento. Permite filtrar por rango de fechas y departamento, muestra totales de colaboradores, presentes, puntuales, atrasos, ausencias y minutos de atraso, y presenta resultados paginados por combinaciones de fecha y departamento.

## Validación de marcaciones

La pantalla `/validacion` permite a Asistentes de RR.HH. y Administradores revisar registros diarios marcados para revisión. Puede corregir estado, minutos de atraso y novedad, cerrar o mantener pendiente la revisión y guardar el cambio con auditoría antes/después.

## Verificación

```powershell
npm run build
```

La API expone `GET /api/health`. Las sesiones se mantienen en una cookie `httpOnly` y el tiempo de inactividad se lee del parámetro `inactividad_sesion_minutos`.
