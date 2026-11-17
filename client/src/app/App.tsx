import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { AppShell } from '../components/layout/AppShell';
import { AuthProvider, useAuth, type AppRole } from '../features/auth/AuthContext';
import { LoginPage } from '../features/auth/LoginPage';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { UsersPage } from '../features/users/UsersPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { ImportPage } from '../features/import/ImportPage';

function PlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8">
      <p className="text-sm uppercase tracking-[0.22em] text-nettplus-blue">Módulo</p>
      <h2 className="mt-3 text-2xl font-semibold text-slate-900">{title}</h2>
      <p className="mt-2 max-w-2xl text-slate-600">{description}</p>
    </div>
  );
}

function ProtectedShell() {
  const { user, logout } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <AppShell user={user} onLogout={() => { void logout(); }} />;
}

function RequireAuth() {
  const { user, loading, error } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="p-8 text-center text-slate-600">Verificando sesión...</div>;
  }
  if (error && !user) {
    return <div role="alert" className="m-8 rounded-lg bg-red-50 p-4 text-red-700">{error}</div>;
  }
  return user ? <Outlet /> : <Navigate to="/login" replace state={{ from: location.pathname }} />;
}

function RequireRole({ allowed, children }: { allowed: AppRole[]; children: ReactNode }) {
  const { user } = useAuth();
  return user && allowed.includes(user.role)
    ? <>{children}</>
    : <Navigate to="/dashboard" replace />;
}

function LoginRoute() {
  const { user, loading } = useAuth();
  if (loading) {
    return <div className="p-8 text-center text-slate-600">Verificando sesión...</div>;
  }
  return user ? <Navigate to="/dashboard" replace /> : <LoginPage />;
}

function AppRoutes() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginRoute />} />

        <Route element={<RequireAuth />}>
          <Route element={<ProtectedShell />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/importar" element={<RequireRole allowed={['asistente_rrhh', 'administrador']}><ImportPage /></RequireRole>}/>
            <Route path="/validacion" element={<RequireRole allowed={['asistente_rrhh', 'administrador']}><PlaceholderPage title="Validación de marcaciones" /></RequireRole>} />
            <Route path="/historial"  element={<RequireRole allowed={['asistente_rrhh', 'jefe_rrhh', 'administrador']}><PlaceholderPage title="Historial" /></RequireRole>} />
            <Route path="/resumen-diario" element={<RequireRole allowed={['asistente_rrhh', 'jefe_rrhh', 'administrador']}><PlaceholderPage title="Resumen diario" description="Vista consolidada por fecha y departamento. Se desarrollará en la Fase 9." /></RequireRole>} />
            <Route path="/reportes/mensual" element={<RequireRole allowed={['asistente_rrhh', 'jefe_rrhh', 'administrador']}><PlaceholderPage title="Reportes mensuales" description="Reporte consolidado con exportación Excel/PDF. Se implementará en la Fase 11." /></RequireRole>} />
            <Route path="/usuarios" element={<RequireRole allowed={['administrador']}><UsersPage /></RequireRole>} />
            <Route path="/parametros" element={<RequireRole allowed={['administrador']}><SettingsPage /></RequireRole>} />
            <Route path="/auditoria" element={<RequireRole allowed={['administrador']}><PlaceholderPage title="Auditoría" description="Registro de accesos y cambios seguros. Fase 12." /></RequireRole>} />
            <Route path="/respaldos" element={<RequireRole allowed={['administrador']}><PlaceholderPage title="Respaldos" description="Copia automática diaria y catálogo de respaldos. Fase 12." /></RequireRole>} />
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
