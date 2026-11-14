import { BarChart3, DatabaseBackup, FileText, LayoutDashboard, Settings, ShieldCheck, Upload, Users } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import type { AppRole } from '../../features/auth/AuthContext';

const roleMenus: Record<AppRole, Array<{ label: string; to: string; icon: typeof LayoutDashboard }>> = {
  asistente_rrhh: [
    { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    { label: 'Importar', to: '/importar', icon: Upload },
    { label: 'Historial', to: '/historial', icon: FileText },
    { label: 'Resumen diario', to: '/resumen-diario', icon: BarChart3 },
    { label: 'Reportes', to: '/reportes/mensual', icon: ShieldCheck },
  ],
  jefe_rrhh: [
    { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    { label: 'Historial', to: '/historial', icon: FileText },
    { label: 'Resumen diario', to: '/resumen-diario', icon: BarChart3 },
    { label: 'Reportes', to: '/reportes/mensual', icon: ShieldCheck },
  ],
  administrador: [
    { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    { label: 'Importar', to: '/importar', icon: Upload },
    { label: 'Historial', to: '/historial', icon: FileText },
    { label: 'Resumen diario', to: '/resumen-diario', icon: BarChart3 },
    { label: 'Reportes', to: '/reportes/mensual', icon: ShieldCheck },
    { label: 'Usuarios', to: '/usuarios', icon: Users },
    { label: 'Parámetros', to: '/parametros', icon: Settings },
    { label: 'Auditoría', to: '/auditoria', icon: DatabaseBackup },
    { label: 'Respaldos', to: '/respaldos', icon: DatabaseBackup },
  ],
};

export function Sidebar({ role }: { role: AppRole }) {
  const items = roleMenus[role];

  return (
    <aside className="flex w-72 flex-col bg-nettplus-navy text-white shadow-soft">
      <div className="flex items-center gap-3 border-b border-white/10 px-6 py-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-nettplus-lime text-lg font-bold text-nettplus-navy">N</div>
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-white/70">NETTPLUS</p>
          <h1 className="text-lg font-semibold">Nómina</h1>
        </div>
      </div>

      <nav className="flex-1 space-y-2 px-4 py-6">
        {items.map(({ label, to, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                isActive ? 'bg-nettplus-lime text-nettplus-navy' : 'text-white/80 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

    </aside>
  );
}
