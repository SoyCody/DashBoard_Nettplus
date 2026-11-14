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

## Verificación

```powershell
npm run build
```

La API expone `GET /api/health`. Las sesiones se mantienen en una cookie `httpOnly` y el tiempo de inactividad se lee del parámetro `inactividad_sesion_minutos`.
