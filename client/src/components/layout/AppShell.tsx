import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import type { AppRole, AuthUser } from '../../features/auth/AuthContext';

const roleLabels: Record<AppRole, string> = {
    asistente_rrhh: 'Asistente de RR.HH.',
    jefe_rrhh: 'Jefe de RR.HH.',
    administrador: 'Administrador',
};

export function AppShell({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
  return (
    <div className="app-shell flex min-h-screen bg-slate-100">
      <Sidebar role={user.role} />
      <div className="flex-1">
        <Topbar role={roleLabels[user.role]} userName={`${user.nombres} ${user.apellidos}`} onLogout={onLogout} />
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
